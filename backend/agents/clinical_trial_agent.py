"""
Agent responsible for finding relevant clinical trials.
"""

import json
import os
import sqlite3
import pprint
import logging
import re # <-- Import re
import asyncio # <-- Import asyncio
from typing import Any, Dict, Optional, List, Tuple # <-- Add Tuple
from pathlib import Path # Import Path

import chromadb
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from google.generativeai.types import GenerationConfig # Added for JSON output
from dotenv import load_dotenv

# Import the base class
from backend.core.agent_interface import AgentInterface

# --- NEW Import --- 
from backend.agents.action_suggester import get_action_suggestions_for_trial

# --- Configuration ---
# Explicitly load .env from the backend directory
# Assumes this script is in backend/agents/
dotenv_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=dotenv_path)
print(f"Attempting to load .env from: {dotenv_path}") # Add print statement

SQLITE_DB_PATH = "backend/db/trials.db"
CHROMA_DB_PATH = "./chroma_db"
CHROMA_COLLECTION_NAME = "clinical_trials_eligibility"
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
N_CHROMA_RESULTS = 10 # Number of results to fetch from ChromaDB
# LLM Configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
LLM_MODEL_NAME = "gemini-1.5-flash"
DEFAULT_LLM_GENERATION_CONFIG = GenerationConfig(
    temperature=0.2, 
    max_output_tokens=8192 # Keep token limit
)

# --- RE-ADD MISSING CONSTANT --- 
SAFETY_SETTINGS = { # Adjust safety settings as needed
    "HARM_CATEGORY_HARASSMENT": "BLOCK_MEDIUM_AND_ABOVE",
    "HARM_CATEGORY_HATE_SPEECH": "BLOCK_MEDIUM_AND_ABOVE",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_MEDIUM_AND_ABOVE",
    "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_MEDIUM_AND_ABOVE",
}
# --- END RE-ADD --- 

# --- Structured Text Prompt --- 
ELIGIBILITY_AND_NARRATIVE_SUMMARY_PROMPT_TEMPLATE = """
Analyze the patient's eligibility for the following clinical trial based ONLY on the provided information. Provide a concise patient-specific summary, an overall eligibility status, and a breakdown of met, unmet, and unclear criteria.

**Patient Profile:**
{patient_profile_json}

**Clinical Trial Criteria:**
Trial Title: {trial_title}
Trial Status: {trial_status}
Trial Phase: {trial_phase}
Inclusion Criteria:
{inclusion_criteria}
Exclusion Criteria:
{exclusion_criteria}

**Instructions & Output Format (Plain Text ONLY):**
1.  Carefully compare the patient profile against *each* inclusion and exclusion criterion.
2.  Generate a concise patient-specific narrative summary (2-3 sentences).
3.  Determine an overall eligibility status string ('Likely Eligible', 'Likely Ineligible', 'Eligibility Unclear due to missing info').
4.  List the criteria under the appropriate headers below.
5.  **Respond ONLY with plain text** following this structure precisely. Use the exact markers (e.g., `== SUMMARY ==`) and bullet points (`* `).
6.  Do NOT include any JSON or markdown formatting like ```.

== SUMMARY ==
[Your 2-3 sentence narrative summary here]

== ELIGIBILITY ==
[Your overall eligibility assessment string here]

== MET CRITERIA ==
* [Met Criterion 1 Text]
* [Met Criterion 2 Text]
... (Use "None" on a single line if no criteria met)

== UNMET CRITERIA ==
* [Unmet Criterion 1 Text] - Reasoning: [Reasoning for unmet criterion 1]
* [Unmet Criterion 2 Text] - Reasoning: [Reasoning for unmet criterion 2]
... (Use "None" on a single line if no criteria unmet)

== UNCLEAR CRITERIA ==
* [Unclear Criterion 1 Text] - Reasoning: [Reasoning for unclear criterion 1, e.g., missing info]
* [Unclear Criterion 2 Text] - Reasoning: [Reasoning for unclear criterion 2]
... (Use "None" on a single line if no criteria unclear)

**Important:**
*   Ensure reasoning is provided after ` - Reasoning: ` for UNMET and UNCLEAR criteria.
*   If a category has no criteria, write exactly `None` on the line below the header.
*   Focus solely on the provided text. Do not infer information not present.
*   Be concise and specific in your reasoning.
"""
# --- End Structured Text Prompt --- 

# --- MockTrialDatabase Class (Commented out as it's being replaced) ---
# class MockTrialDatabase:
#     \"\"\" Simulates querying a clinical trial database. \"\"\"
#     def search_trials(self, condition: str, status: Optional[str] = None, phase: Optional[int] = None) -> list:
#         \"\"\" Simulates searching for trials based on condition. \"\"\"
#         print(f\"[MockTrialDatabase] Searching trials for condition: \'{condition}\', Status: {status}, Phase: {phase}\")
#         # ... (rest of mock logic) ...
#         return mock_results

class ClinicalTrialAgent(AgentInterface):
    """ Finds clinical trials relevant to a patient's condition using local DBs and LLM assessment. """

    def __init__(self):
        """
        Initialize the agent, including embedding model, vector DB client, and LLM client.
        """
        self.model = None
        self.chroma_client = None
        self.chroma_collection = None
        self.llm_client = None

        # --- Initialize Embedding Model ---
        try:
            logging.info(f"Loading embedding model: {EMBEDDING_MODEL}...")
            self.model = SentenceTransformer(EMBEDDING_MODEL)
            logging.info("Embedding model loaded.")
        except Exception as e:
            logging.error(f"Failed to load SentenceTransformer model \'{EMBEDDING_MODEL}\': {e}", exc_info=True)

        # --- Initialize ChromaDB ---
        try:
            logging.info(f"Initializing ChromaDB client at: {CHROMA_DB_PATH}")
            self.chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
            collections = self.chroma_client.list_collections()
            col_names = [col.name for col in collections]
            if CHROMA_COLLECTION_NAME in col_names:
                 logging.info(f"Getting ChromaDB collection: {CHROMA_COLLECTION_NAME}")
                 self.chroma_collection = self.chroma_client.get_collection(name=CHROMA_COLLECTION_NAME)
                 logging.info(f"ChromaDB Collection \'{CHROMA_COLLECTION_NAME}\' ready. Count: {self.chroma_collection.count()}")
            else:
                 logging.warning(f"ChromaDB collection \'{CHROMA_COLLECTION_NAME}\' not found at path \'{CHROMA_DB_PATH}\'. Loading script might need to be run.")
                 self.chroma_collection = None
        except Exception as e:
            logging.error(f"Failed to initialize ChromaDB client or get collection: {e}", exc_info=True)
            self.chroma_client = None
            self.chroma_collection = None

        # --- Initialize Google Generative AI Client ---
        if not GOOGLE_API_KEY:
            logging.error("GOOGLE_API_KEY not found in environment variables. LLM features will be disabled.")
            self.llm_client = None # Ensure llm_client is None if key missing
        else:
            try:
                logging.info("Configuring Google Generative AI...")
                genai.configure(api_key=GOOGLE_API_KEY)
                logging.info(f"Initializing Google Generative Model: {LLM_MODEL_NAME}")
                # Apply JSON config during initialization if possible, or during generate_content call
                self.llm_client = genai.GenerativeModel(
                    LLM_MODEL_NAME,
                    generation_config=DEFAULT_LLM_GENERATION_CONFIG # Apply config here
                )
                logging.info("Google Generative AI client initialized successfully.")
            except Exception as e:
                logging.error(f"Failed to initialize Google Generative AI client: {e}", exc_info=True)
                self.llm_client = None

        logging.info("ClinicalTrialAgent Initialized.")

    @property
    def name(self) -> str:
        return "clinical_trial_finder"

    @property
    def description(self) -> str:
        return "Searches for relevant clinical trials based on patient diagnosis, eligibility context, stage, biomarkers, etc. using local vector and relational databases."

    def _get_db_connection(self):
        """ Establishes a connection to the SQLite database. """
        try:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            conn.row_factory = sqlite3.Row # Return rows as dictionary-like objects
            logging.info(f"Connected to SQLite DB: {SQLITE_DB_PATH}")
            return conn
        except sqlite3.Error as e:
            logging.error(f"Failed to connect to SQLite DB at {SQLITE_DB_PATH}: {e}")
            return None

    def _build_query_text(self, context: Dict[str, Any], entities: Dict[str, Any], prompt: str) -> str:
        """ Constructs the text to be embedded for searching based on available info. """
        patient_data = context.get("patient_data", {})
        primary_diagnosis = patient_data.get("diagnosis", {}).get("primary")
        stage = patient_data.get("diagnosis", {}).get("stage")
        biomarkers = patient_data.get("biomarkers", []) # Assuming biomarkers is a list
        prior_treatments = patient_data.get("prior_treatments", []) # Assuming treatments is a list

        # Use specific entities if available
        condition = entities.get("condition", entities.get("specific_condition"))
        phase = entities.get("trial_phase")
        status = entities.get("recruitment_status")

        # Construct query string - prioritize explicit query terms
        parts = []
        if condition:
            parts.append(f"Condition: {condition}")
        elif primary_diagnosis:
             parts.append(f"Condition: {primary_diagnosis}")

        if stage: parts.append(f"Stage: {stage}")
        if phase: parts.append(f"Phase: {phase}")
        if status: parts.append(f"Status: {status}")
        if biomarkers: parts.append(f"Biomarkers: {', '.join(biomarkers)}")
        if prior_treatments: parts.append(f"Prior Treatments: {', '.join(pt.get('name', '') for pt in prior_treatments if pt.get('name'))}")

        # If specific parts identified, use them primarily
        if parts:
             query_text = ". ".join(parts)
             logging.info(f"Using constructed query text: {query_text}")
             return query_text
        # Fallback to using the original prompt if no structured data found
        elif prompt:
             logging.info(f"Using original prompt for query text: {prompt}")
             return prompt
        # Final fallback if prompt is also empty
        else:
             logging.warning("No suitable query text could be constructed.")
             return ""

    # --- Refined LLM Helper - Calls NEW Text Parser --- 
    async def _get_llm_assessment_for_trial(self, patient_context: Dict[str, Any], trial_detail: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generates prompt, calls LLM for STRUCTURED TEXT, parses text response for a single trial."""
        nct_id = trial_detail.get("nct_id", "UNKNOWN_ID")
        logging.info(f"Starting LLM assessment (structured text) for trial {nct_id}...")
        
        inclusion_criteria = trial_detail.get('inclusion_criteria_text', None) 
        exclusion_criteria = trial_detail.get('exclusion_criteria_text', None) 

        if not inclusion_criteria and not exclusion_criteria:
            logging.warning(f"No criteria text found for trial {nct_id}, skipping LLM assessment.")
            # Return structure indicating skip
            return {
                "llm_eligibility_analysis": None,
                "overall_assessment": "Not Assessed (No Criteria Text)", 
                "narrative_summary": "Eligibility criteria text was missing or could not be retrieved for this trial."
            }
            
        if not self.llm_client:
            logging.error("LLM client not initialized. Cannot perform assessment.")
            return { 
                "llm_eligibility_analysis": None,
                "overall_assessment": "Assessment Failed (Setup Issue)",
                "narrative_summary": "The AI assessment client is not configured."
            }

        try:
            prompt = self._create_eligibility_prompt(
                patient_context, 
                trial_detail.get('brief_title','N/A'), 
                trial_detail.get('overall_status','N/A'), 
                trial_detail.get('phase','N/A'), 
                inclusion_criteria, 
                exclusion_criteria
            ) 
            
            # Use the default config (expects plain text now)
            response = await asyncio.to_thread(
                self.llm_client.generate_content,
                prompt,
                generation_config=DEFAULT_LLM_GENERATION_CONFIG, 
                safety_settings=SAFETY_SETTINGS
            )
            
            # --- Get raw response text --- 
            raw_response_text = ""
            try: 
                if response.parts:
                    raw_response_text = response.parts[0].text
                else:
                    raw_response_text = response.text
            except Exception as e:
                 # ... (keep robust text retrieval error handling) ...
                 logging.warning(f"Could not access response parts/text directly for {nct_id}: {e}")
                 try:
                      raw_response_text = response.text 
                 except AttributeError:
                       logging.error(f"Response object for {nct_id} has no 'text' or 'parts' attribute.", exc_info=True)
                       raw_response_text = "Error: Response object structure invalid."
                 except Exception as e2:
                      logging.error(f"Failed even getting response.text for {nct_id}: {e2}")
                      raw_response_text = "Error retrieving response text."
            # --- End response text extraction ---
            
            logging.debug(f"Raw LLM TEXT response for {nct_id}:\n{raw_response_text}")

            # --- Call NEW Structured Text Parser --- 
            parsed_assessment_dict = self._parse_structured_text_response(raw_response_text)

            if parsed_assessment_dict:
                logging.info(f"Successfully parsed structured text assessment for trial {nct_id}.")
                # The parser should return the dict in the expected nested format
                return {"llm_eligibility_analysis": parsed_assessment_dict} 
            else:
                logging.warning(f"Failed to parse structured text assessment for trial {nct_id}. Raw text logged.")
                return { # Return specific structure for parsing failure
                    "llm_eligibility_analysis": None,
                    "overall_assessment": "Assessment Failed (Text Parsing Error)",
                    "narrative_summary": f"The AI assessment could not be processed from text. Raw response logged."
                }

        except Exception as e:
            logging.error(f"Error during LLM API call for trial {nct_id}: {e}", exc_info=True)
            return { # Return specific structure for API call failure
                "llm_eligibility_analysis": None,
                "overall_assessment": "Assessment Failed (API Error)",
                "narrative_summary": f"An error occurred communicating with the AI: {e}"
            }
    # --- End Refined LLM Helper --- 

    def _fetch_trial_details(self, conn: sqlite3.Connection, nct_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetches full trial details from SQLite for given NCT IDs."""
        if not nct_ids:
            return []
        try:
            conn.row_factory = sqlite3.Row # Return rows as dict-like objects
            cursor = conn.cursor()
            placeholders = ','.join('?' * len(nct_ids))
            # Select all columns needed by the frontend/LLM
            query = f"SELECT * FROM clinical_trials WHERE nct_id IN ({placeholders})"
            cursor.execute(query, nct_ids)
            rows = cursor.fetchall()
            # Convert rows to dictionaries
            results = [dict(row) for row in rows]
            
            # Reorder results to match the input nct_ids order if needed (or handle later)
            # For simplicity now, return as fetched
            return results
        except sqlite3.Error as e:
            logging.error(f"SQLite error fetching trial details: {e}", exc_info=True)
            return []
        except Exception as e:
            logging.error(f"Unexpected error fetching trial details: {e}", exc_info=True)
            return []

    # --- NEW: Prompt Generation Method --- 
    def _create_eligibility_prompt(self, patient_context: Dict[str, Any], trial_title: str, trial_status: str, trial_phase: str, inclusion_criteria: Optional[str], exclusion_criteria: Optional[str]) -> str:
        """Creates the prompt for the LLM to assess eligibility and summarize using structured text, handling potentially missing criteria text."""
        # Basic formatting for patient context
        # --- FIX: Use json.dumps for reliable formatting --- 
        try:
            patient_profile_json = json.dumps(patient_context, indent=2)
        except TypeError as e:
            logging.error(f"Patient context is not JSON serializable: {e}. Using basic string representation.")
            patient_profile_json = str(patient_context)
        # --- END FIX --- 
            
        # --- FIX: Format with all arguments for the structured text prompt --- 
        prompt = ELIGIBILITY_AND_NARRATIVE_SUMMARY_PROMPT_TEMPLATE.format(
             patient_profile_json=patient_profile_json,
             trial_title=trial_title,             # Use argument
             trial_status=trial_status,           # Use argument
             trial_phase=trial_phase,             # Use argument
             inclusion_criteria=inclusion_criteria or "(Not provided or not found in source document)",
             exclusion_criteria=exclusion_criteria or "(Not provided or not found in source document)"
         )
        # --- END FIX ---
        return prompt
    # --- END NEW: Prompt Generation Method ---

    # --- NEW: Manual Structured Text Parser --- 
    def _parse_structured_text_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Parses the structured plain text response from the LLM."""
        if not response_text:
            logging.warning("LLM structured text response is empty.")
            return None

        try:
            summary = ""
            eligibility_summary = ""
            met_criteria = []
            unmet_criteria = []
            unclear_criteria = []

            # Define markers
            markers = {
                "SUMMARY": "== SUMMARY ==",
                "ELIGIBILITY": "== ELIGIBILITY ==",
                "MET": "== MET CRITERIA ==",
                "UNMET": "== UNMET CRITERIA ==",
                "UNCLEAR": "== UNCLEAR CRITERIA =="
            }
            
            # --- Helper to extract text between markers --- 
            def extract_section(text, start_marker, all_markers):
                start_idx = text.find(start_marker)
                if start_idx == -1:
                    return "" # Marker not found
                
                start_idx += len(start_marker) # Move past the marker itself
                
                # Find the start of the *next* marker
                end_idx = len(text) # Default to end of text
                for marker_value in all_markers.values():
                    next_marker_idx = text.find(marker_value, start_idx)
                    if next_marker_idx != -1:
                         end_idx = min(end_idx, next_marker_idx)
                         
                return text[start_idx:end_idx].strip()
            # --- End Helper --- 

            # Extract sections
            summary_text = extract_section(response_text, markers["SUMMARY"], markers)
            eligibility_text = extract_section(response_text, markers["ELIGIBILITY"], markers)
            met_text = extract_section(response_text, markers["MET"], markers)
            unmet_text = extract_section(response_text, markers["UNMET"], markers)
            unclear_text = extract_section(response_text, markers["UNCLEAR"], markers)
            
            # Assign simple text sections
            summary = summary_text
            eligibility_summary = eligibility_text
            
            # --- Helper to parse bulleted list section --- 
            def parse_criteria_list(section_text, has_reasoning=False):
                items = []
                if not section_text or section_text.lower().strip() == 'none':
                     return items # Return empty list if section is empty or explicitly None
                 
                lines = section_text.split('\n')
                for line in lines:
                    line = line.strip()
                    if line.startswith('* '):
                         content = line[2:].strip() # Remove bullet point
                         item = {"criterion": content, "reasoning": None} # Default structure
                         if has_reasoning:
                              # Try to split by " - Reasoning: "
                              parts = re.split(r'\s+-\s+Reasoning:\s+', content, maxsplit=1)
                              if len(parts) == 2:
                                   item["criterion"] = parts[0].strip()
                                   item["reasoning"] = parts[1].strip()
                              else:
                                   # If split fails, keep full content as criterion, reasoning as None
                                   item["criterion"] = content
                                   logging.warning(f"Could not parse reasoning from line: {line}")
                         else:
                              # If no reasoning expected, just use the content as criterion
                              item["criterion"] = content
                         items.append(item)
                return items
            # --- End Helper --- 

            # Parse criteria lists
            met_criteria = parse_criteria_list(met_text, has_reasoning=False)
            unmet_criteria = parse_criteria_list(unmet_text, has_reasoning=True)
            unclear_criteria = parse_criteria_list(unclear_text, has_reasoning=True)
            
            # --- Construct the final dictionary in the expected nested format --- 
            result_dict = {
                "patient_specific_summary": summary,
                "eligibility_assessment": {
                    "eligibility_summary": eligibility_summary,
                    "met_criteria": met_criteria,
                    "unmet_criteria": unmet_criteria,
                    "unclear_criteria": unclear_criteria
                }
            }
            
            # Basic validation: Check if essential parts were extracted
            if not summary or not eligibility_summary:
                 logging.warning("Manual text parsing failed to extract summary or eligibility status.")
                 # Optionally return None or the partial dict depending on desired strictness
                 # return None 
                 
            # --- Log the final constructed dictionary --- 
            logging.debug(f"Constructed dict from text parser: {json.dumps(result_dict, indent=2)}")
            # --- End Log --- 
            return result_dict

        except Exception as e:
            logging.error(f"Error parsing structured text response: {e}", exc_info=True)
            logging.error(f"Problematic text snippet: {response_text[:500]}...")
            return None
    # --- End Manual Structured Text Parser --- 

    # --- Refined Run Method (Ensure it uses the result correctly) ---
    async def run(self, context: Dict[str, Any] = None, **kwargs) -> Dict[str, Any]:
        """ Executes the agent's logic: search trials, assess eligibility using TEXT LLM output. """
        query = kwargs.get("prompt", "")
        patient_context = context.get("patient_data", {})
        if not isinstance(patient_context, dict): 
             logging.warning(f"Received non-dict patient_context: {type(patient_context)}. Using empty dict.")
             patient_context = {}
        logging.info(f"ClinicalTrialAgent running. Query: '{query}'. Patient context provided: {bool(patient_context)}")

        if not self.model:
            return {"status": "failure", "output": None, "summary": "Embedding model not loaded."}
        if not self.chroma_collection:
             return {"status": "failure", "output": None, "summary": "ChromaDB collection not available."}

        conn = None
        try:
            # --- 1. Embed Query --- 
            logging.info(f"Generating embedding for query: {query[:50]}...")
            query_embedding = self.model.encode([query])[0].tolist()
            
            # --- 2. Search Vector DB --- 
            logging.info(f"Querying ChromaDB collection '{CHROMA_COLLECTION_NAME}'...")
            results = self.chroma_collection.query(
                query_embeddings=[query_embedding],
                n_results=N_CHROMA_RESULTS, # Use constant
                include=['metadatas']
            )
            
            if not results or not results.get('ids') or not results['ids'][0]:
                logging.info("No relevant trials found in vector search.")
                return {"status": "success", "output": { "found_trials": [] }, "summary": "No relevant trials found in vector search."}
            
            # Extract NCT IDs correctly from metadata
            found_nct_ids = []
            if results.get('metadatas') and results['metadatas'][0]:
                 found_nct_ids = [meta.get('nct_id') for meta in results['metadatas'][0] if meta.get('nct_id')]
            
            if not found_nct_ids:
                 logging.warning("Vector search returned results but no valid NCT IDs found in metadata.")
                 return {"status": "success", "output": { "found_trials": [] }, "summary": "Vector search returned results but no valid NCT IDs found in metadata."}
            
            logging.info(f"Found potential trial IDs from vector search: {found_nct_ids}")

            # --- 3. Fetch Details from SQLite --- 
            conn = self._get_db_connection()
            if not conn:
                 return {"status": "failure", "output": None, "summary": "Database connection failed."}
            
            found_trials_details = self._fetch_trial_details(conn, found_nct_ids)
            logging.info(f"Fetched details for {len(found_trials_details)} trials from SQLite.")
            
            if not found_trials_details: # Handle case where IDs were found in Chroma but not SQLite
                logging.warning(f"NCT IDs {found_nct_ids} found in ChromaDB but no details found in SQLite.")
                return {"status": "success", "output": { "found_trials": [] }, "summary": "Trial details not found in database for vector search results."}

            # --- 4. Perform LLM Eligibility Assessment (Concurrent) --- 
            llm_assessment_tasks = []
            if self.llm_client and patient_context: 
                logging.info(f"Starting concurrent LLM assessments for {len(found_trials_details)} trials...")
                for trial_detail_row in found_trials_details: # Iterate through rows
                    plain_trial_detail = dict(trial_detail_row) # Convert row to dict
                    task = asyncio.create_task(
                        self._get_llm_assessment_for_trial(patient_context, plain_trial_detail) # Pass dict
                    )
                    llm_assessment_tasks.append(task)
            else:
                logging.warning("LLM client not initialized or no patient context provided. Skipping LLM assessment.")

            # --- 5. Gather LLM Results and Update Trial Details --- 
            llm_results = []
            if llm_assessment_tasks:
                llm_results = await asyncio.gather(*llm_assessment_tasks)
                logging.info(f"Completed LLM assessments processing for {len(llm_results)} tasks.")
            
            # Process results and add to trial details
            final_trials_output = [] # Build a new list of plain dicts
            for i, trial_detail_row in enumerate(found_trials_details):
                trial_detail = dict(trial_detail_row) # Convert row to dict for processing

                if 'interpreted_result' not in trial_detail:
                    trial_detail['interpreted_result'] = {}
                
                llm_result_dict = llm_results[i] if i < len(llm_results) and llm_results[i] else None
                
                # --- Process based on the structure from the TEXT parser ---
                # The text parser returns the nested dict under 'llm_eligibility_analysis' key
                if llm_result_dict and llm_result_dict.get("llm_eligibility_analysis"):
                    # Case 1: Successful parsing
                    parsed_analysis = llm_result_dict["llm_eligibility_analysis"] # This is the dict built by the text parser
                    eligibility_assessment_nested = parsed_analysis.get("eligibility_assessment", {}) # Get nested assessment

                    trial_detail['interpreted_result']['llm_eligibility_analysis'] = parsed_analysis # Store the manually parsed dict
                    # Extract summary from the correct nested location
                    trial_detail['interpreted_result']['eligibility_assessment'] = eligibility_assessment_nested.get("eligibility_summary", "Assessment Incomplete") 
                    # Extract patient summary from the correct top-level location
                    trial_detail['interpreted_result']['narrative_summary'] = parsed_analysis.get("patient_specific_summary", "Summary not generated.") 

                    # Extract unclear criteria from the correct nested location (built by parser)
                    unclear_criteria_list = []
                    unclear_items = eligibility_assessment_nested.get("unclear_criteria", [])
                    if isinstance(unclear_items, list):
                        for criterion in unclear_items:
                             # The text parser puts dicts like {"criterion": "...", "reasoning": "..."} here
                             if isinstance(criterion, dict) and "criterion" in criterion:
                                 unclear_criteria_list.append(criterion["criterion"])
                             elif isinstance(criterion, str): # Fallback if structure is unexpected
                                 unclear_criteria_list.append(criterion)
                    trial_detail['interpreted_result']['unclear_criteria'] = unclear_criteria_list # This is for UI display
                    
                    # --- Call suggester with the parsed nested assessment --- 
                    try:
                         logging.debug(f"Passing TEXT-PARSED eligibility assessment to suggester for {trial_detail.get('nct_id')}: {json.dumps(eligibility_assessment_nested, indent=2)}")
                         suggestions = get_action_suggestions_for_trial(
                             eligibility_assessment=eligibility_assessment_nested, # Pass the nested dict built by text parser
                             patient_context=patient_context
                         )
                         logging.debug(f"Received suggestions from suggester for {trial_detail.get('nct_id')}: {suggestions}")
                         trial_detail['interpreted_result']['action_suggestions'] = suggestions
                    except Exception as suggester_err:
                         logging.error(f"Error generating action suggestions for trial {trial_detail.get('nct_id', 'UNKNOWN')}: {suggester_err}", exc_info=True)
                         trial_detail['interpreted_result']['action_suggestions'] = [] 
                    
                else: 
                     # Case 2: Assessment skipped, failed, or text parsing error
                     # Use the overall_assessment/narrative_summary from the error structure returned by _get_llm_assessment_for_trial
                     trial_detail['interpreted_result']['llm_eligibility_analysis'] = None
                     trial_detail['interpreted_result']['eligibility_assessment'] = llm_result_dict.get("overall_assessment", "Assessment Status Unknown") if llm_result_dict else "Not Assessed (No LLM Task)"
                     trial_detail['interpreted_result']['narrative_summary'] = llm_result_dict.get("narrative_summary", "Assessment not performed or failed.") if llm_result_dict else "Assessment not performed."
                     # Provide generic unclear criteria/suggestions on failure
                     if "failed" in trial_detail['interpreted_result']['eligibility_assessment'].lower():
                          trial_detail['interpreted_result']['unclear_criteria'] = ["Assessment failed, review criteria manually."]
                     else: 
                          trial_detail['interpreted_result']['unclear_criteria'] = ["Review criteria manually."]
                     trial_detail['interpreted_result']['action_suggestions'] = []

                final_trials_output.append(trial_detail) # Add the processed dict

            # --- 6. Return Results --- 
            logging.info(f"Agent run completed successfully. Returning {len(final_trials_output)} trials.")
            return {
                "status": "success", 
                "output": { "found_trials": final_trials_output } 
            }
            
        except Exception as e:
            logging.error(f"Error in ClinicalTrialAgent run: {e}", exc_info=True)
            # Ensure a consistent error structure is returned
            return {"status": "error", "summary": f"An internal error occurred in the agent: {str(e)}", "output": {}}
        finally:
            if conn:
                try:
                    conn.close()
                    logging.info("SQLite connection closed in agent run.")
                except Exception as db_close_err:
                     logging.error(f"Error closing SQLite connection: {db_close_err}")
    # --- End Run Method --- 

# Example Usage (for testing) - Keep commented out unless needed for direct testing
# if __name__ == '__main__':
#     import asyncio
#     import json
#
#     async def main():
#         agent = ClinicalTrialAgent()
#
#         # Ensure model and DB are loaded
#         if not agent.model or not agent.chroma_collection:
#              print("Agent initialization failed. Exiting.")
#              return
#
#         # Example 1: Using patient context (requires relevant data in DB)
#         ctx1 = {"patient_data": {
#                    "diagnosis": {"primary": "Advanced Follicular Lymphoma", "stage": "IV"},
#                    "biomarkers": ["High Tumor Burden", "FLIPI 4"],
#                    "prior_treatments": []
#                 }}
#         kw1 = {"prompt": "Find trials for this follicular lymphoma patient"}
#         print("\\n--- Running Test 1: Patient Context ---")
#         res1 = await agent.run(ctx1, **kw1)
#         print("Result 1:")
#         pprint.pprint(res1)
#         
#         # Example 2: Specifying criteria in prompt/entities
#         ctx2 = {"patient_data": {}}
#         kw2 = {
#             "prompt": "Find phase 1 AKT mutation trials",
#             "entities": {"condition": "solid tumors with AKT mutation", "trial_phase": "1"}
#         }
#         print("\\n--- Running Test 2: Entities/Prompt ---")
#         res2 = await agent.run(ctx2, **kw2)
#         print("Result 2:")
#         pprint.pprint(res2)
#         
#     asyncio.run(main()) 
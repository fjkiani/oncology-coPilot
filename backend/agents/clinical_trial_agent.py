"""
Agent responsible for finding relevant clinical trials.
"""

import json
import os
import sqlite3
import pprint
import logging
import re # <-- Import re
from typing import Any, Dict, Optional, List
from pathlib import Path # Import Path

import chromadb
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from google.generativeai.types import GenerationConfig # Added for JSON output
from dotenv import load_dotenv

# Import the base class
from backend.core.agent_interface import AgentInterface

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
LLM_MODEL_NAME = "gemini-1.5-flash" # Or your preferred Gemini model
DEFAULT_LLM_GENERATION_CONFIG = GenerationConfig(
    response_mime_type="application/json", # Request JSON output
    temperature=0.2 # Lower temperature for more deterministic analysis
)

# --- Eligibility Prompt Template ---
ELIGIBILITY_ASSESSMENT_PROMPT_TEMPLATE = """
Analyze the patient's eligibility for the following clinical trial based ONLY on the provided information.

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

**Instructions:**
Carefully compare the patient profile against *each* inclusion and exclusion criterion.
Respond ONLY with a valid JSON object adhering strictly to the following structure. Do not include any text before or after the JSON object.
{{
  "eligibility_summary": "A brief overall assessment (e.g., 'Likely Eligible', 'Likely Ineligible', 'Potentially Eligible - More Info Needed').",
  "met_criteria": [
    {{"criterion": "Description of the met inclusion criterion.", "evidence": "Specific patient data supporting this."}}
  ],
  "unmet_criteria": [
    {{"criterion": "Description of the unmet inclusion OR met exclusion criterion.", "reasoning": "Why the patient does not meet it or meets an exclusion rule."}}
  ],
  "unclear_criteria": [
     {{"criterion": "Description of the criterion where eligibility cannot be determined from the provided info.", "missing_info": "What specific patient information is needed?"}}
  ]
}}

Focus solely on the provided text. Do not infer information not present.
If criteria text is missing or very short, state that eligibility cannot be assessed for those parts.
Ensure all strings within the JSON are correctly escaped according to JSON standards (e.g., use \\ for backslashes, \" for quotes).
Be concise and specific in your reasoning.
"""

# --- NEW: Trial Summary Prompt Template ---
TRIAL_SUMMARY_PROMPT_TEMPLATE = """
Summarize the key aspects of the following clinical trial based ONLY on the provided Description and Objectives.
Focus on: 
1. The primary condition being studied.
2. The main intervention(s) being tested.
3. The key target patient population (briefly).

Respond with a concise summary (2-4 sentences maximum). Do not include information not present in the text below.

**Trial Description:**
{description}

**Trial Objectives:**
{objectives}

**Summary:**
"""

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

    async def run(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Searches for clinical trials using local ChromaDB (vector search) and SQLite (details).
        Optionally performs detailed LLM-based eligibility assessment if LLM client and patient data are available.

        Args:
            context: Dictionary containing patient_data.
            **kwargs: Expected to contain 'entities' and 'prompt'.

        Returns:
            A dictionary with status and the list of found trials, potentially enriched with LLM eligibility assessment.
        """
        logging.info(f"ClinicalTrialAgent running with local DB backend.")
        entities = kwargs.get("entities", {})
        original_prompt = kwargs.get("prompt", "")
        patient_data = context.get("patient_data") # Get patient data from context

        # --- Pre-computation Checks ---
        if not self.model:
            return {"status": "failure", "output": None, "summary": "Embedding model not loaded.", "error_message": "SentenceTransformer model failed to initialize."}
        if not self.chroma_collection:
             return {"status": "failure", "output": None, "summary": "ChromaDB collection not available.", "error_message": f"ChromaDB collection '{CHROMA_COLLECTION_NAME}' not found or failed to initialize."}

        # --- Construct Query Text ---
        query_text = self._build_query_text(context, entities, original_prompt)
        if not query_text:
             return {"status": "clarification_needed", "output": None, "summary": "Missing search criteria.", "error_message": "Could not determine search criteria from patient data, entities, or prompt."}

        sql_conn = None # Initialize connection variable
        try:
            # --- Generate Query Embedding ---
            logging.info(f"Generating embedding for query: \'{query_text[:100]}...\'")
            query_embedding = self.model.encode([query_text])[0].tolist()

            # --- Query ChromaDB (Semantic Search) ---
            logging.info(f"Querying ChromaDB collection \'{CHROMA_COLLECTION_NAME}\'...")
            chroma_results = self.chroma_collection.query(
                query_embeddings=[query_embedding],
                n_results=N_CHROMA_RESULTS,
                include=['metadatas', 'documents', 'distances'] # Include distances for relevance info
            )

            trial_ids = chroma_results.get('ids', [[]])[0] # IDs are returned as list of lists
            distances = chroma_results.get('distances', [[]])[0]

            if not trial_ids:
                logging.info("No relevant trials found in ChromaDB.")
                return {"status": "success", "output": {"found_trials": []}, "summary": "No matching clinical trials found based on the criteria."}

            logging.info(f"Found {len(trial_ids)} candidate trials from ChromaDB.")

            # --- Query SQLite (Get Full Details) ---
            logging.info("Fetching full trial details from SQLite...")
            sql_conn = self._get_db_connection()
            if not sql_conn:
                 return {"status": "failure", "output": None, "summary": "Database connection failed.", "error_message": "Could not connect to the local SQLite trial database."}

            placeholders = ','.join('?' * len(trial_ids))
            # Ensure we select the needed criteria text AND the precomputed summary
            sql_query = f"SELECT *, inclusion_criteria_text, exclusion_criteria_text, ai_summary FROM clinical_trials WHERE source_url IN ({placeholders})"

            sql_cursor = sql_conn.cursor()
            sql_cursor.execute(sql_query, trial_ids)
            rows = sql_cursor.fetchall()

            # --- Format Results ---
            found_trials_raw = [dict(row) for row in rows]
            id_to_trial = {trial['source_url']: trial for trial in found_trials_raw}
            ordered_trials = []

            for idx, trial_id in enumerate(trial_ids):
                if trial_id in id_to_trial:
                     trial_detail = id_to_trial[trial_id]
                     trial_detail['search_distance'] = distances[idx]
                     trial_detail['eligibility_assessment'] = None # Initialize
                     # Assign precomputed summary directly from DB result
                     trial_detail['ai_summary'] = trial_detail.get('ai_summary', 'Summary not found in database.') 

                     # --- LLM Eligibility Assessment (If possible) ---
                     if self.llm_client and patient_data:
                         logging.info(f"Performing LLM eligibility check for trial: {trial_id}")
                         try:
                             # Prepare data for the prompt
                             patient_profile_str = json.dumps(patient_data, indent=2)
                             incl_crit = trial_detail.get('inclusion_criteria_text', 'N/A')
                             excl_crit = trial_detail.get('exclusion_criteria_text', 'N/A')
                             title = trial_detail.get('title', 'N/A')
                             status = trial_detail.get('status', 'N/A')
                             phase = trial_detail.get('phase', 'N/A')

                             # Format the prompt
                             prompt_text = ELIGIBILITY_ASSESSMENT_PROMPT_TEMPLATE.format(
                                 patient_profile_json=patient_profile_str,
                                 trial_title=title,
                                 trial_status=status,
                                 trial_phase=phase,
                                 inclusion_criteria=incl_crit,
                                 exclusion_criteria=excl_crit
                             )

                             # Call the LLM
                             # Note: Use generate_content_async for async context if needed, but run is sync
                             # Forcing JSON output via generation_config in __init__
                             response = self.llm_client.generate_content(prompt_text)

                             # Parse the JSON response
                             try:
                                 # --- Multi-Step Cleaning --- 
                                 # 1. Replace invalid escapes like \\[ and \\] (just in case)
                                 text_step1 = response.text.replace('\\\\\[', '[').replace('\\\\\]', ']')
                                 
                                 # 2. Remove any backslash NOT followed by a valid JSON escape char using regex
                                 # Valid escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
                                 # Regex: \(?!["\\/bfnrtu])  => Match \ NOT followed by one of the valid chars
                                 cleaned_text = re.sub(r'\\(?!["\\/bfnrtu])', '', text_step1)
                                 
                                 # Log the final cleaned text for comparison if needed
                                 # logging.debug(f"Cleaned LLM text for {trial_id}: {cleaned_text}") 
                                 
                                 assessment_json = json.loads(cleaned_text) # Parse the final cleaned text
                                 trial_detail['eligibility_assessment'] = assessment_json
                                 logging.info(f"LLM assessment successful for {trial_id}")
                                 
                             except json.JSONDecodeError as json_err:
                                 logging.error(f"Failed to parse LLM JSON response for {trial_id}: {json_err}")
                                 logging.error(f"LLM Raw Response Text: {response.text}") 
                                 logging.error(f"Attempted Cleaned Text (final): {cleaned_text}") # Log final cleaned text on error
                                 trial_detail['eligibility_assessment'] = {"error": "Failed to parse LLM response", "raw_text": response.text}
                             except Exception as parse_err:
                                 logging.error(f"Unexpected error parsing LLM response for {trial_id}: {parse_err}")
                                 trial_detail['eligibility_assessment'] = {"error": "Unexpected error parsing LLM response", "raw_text": response.text if hasattr(response, 'text') else 'N/A'}

                         except Exception as llm_err:
                             logging.error(f"LLM eligibility check failed for trial {trial_id}: {llm_err}", exc_info=True)
                             trial_detail['eligibility_assessment'] = {"error": f"LLM call failed: {llm_err}"}
                     elif not self.llm_client:
                         logging.warning(f"LLM client not available, skipping detailed eligibility check for {trial_id}.")
                         trial_detail['eligibility_assessment'] = {"status": "skipped", "reason": "LLM client not initialized."}
                     elif not patient_data:
                         logging.warning(f"Patient data not provided in context, skipping detailed eligibility check for {trial_id}.")
                         trial_detail['eligibility_assessment'] = {"status": "skipped", "reason": "Patient data missing."}

                     ordered_trials.append(trial_detail)

            logging.info(f"Retrieved and processed details for {len(ordered_trials)} trials from SQLite.")
            
            # Update summary message slightly
            summary_msg = f"Found {len(ordered_trials)} potentially relevant clinical trials."
            if patient_data: 
                 summary_msg += " AI eligibility assessment attempted."
            else:
                 summary_msg += " Pre-computed summaries included."
                 
            return {
                "status": "success",
                "output": {
                    "search_query_text": query_text, 
                    "found_trials": ordered_trials
                },
                "summary": summary_msg
            }

        except Exception as e:
            logging.error(f"Error during clinical trial search: {e}", exc_info=True)
            return {"status": "failure", "output": None, "summary": f"Failed to search for trials: {e}", "error_message": str(e)}
        finally:
            # Ensure SQLite connection is closed
            if sql_conn:
                sql_conn.close()
                logging.info("SQLite connection closed.")


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
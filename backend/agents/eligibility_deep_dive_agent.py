import logging
from typing import List, Dict, Any, Optional, Tuple
import re
import json
import google.generativeai as genai
import os
import asyncio

# Attempt to import the interface, handle if not found for now
try:
    from ..core.agent_interface import AgentInterface
except ImportError:
    logging.warning("AgentInterface not found. Using dummy class.")
    class AgentInterface:
        def __init__(self, name: str, description: str):
            self.name = name
            self.description = description
        async def run(self, **kwargs) -> Dict[str, Any]:
            raise NotImplementedError

# Mock knowledge base (can be expanded)
KNOWN_PGP_INHIBITORS = ['nelfinavir', 'indinavir', 'saquinavir', 'ritonavir', 'ketoconazole', 'itraconazole']
KNOWN_AZOLE_ANTIFUNGALS = ['itraconazole', 'ketaconazole', 'voriconazole', 'fluconazole', 'posaconazole']

# --- Constants (Should match ClinicalTrialAgent or be centralized) ---
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "gemini-1.5-flash-latest")
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
# Add safety settings and default generation config if needed, mirroring ClinicalTrialAgent
SAFETY_SETTINGS = [{ "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" }, { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" }, { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" }, { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }]
DEFAULT_LLM_GENERATION_CONFIG = {
    "temperature": 0.2, 
    "top_p": 0.95, 
    "top_k": 40,
    "max_output_tokens": 4096, 
    # "response_mime_type": "text/plain", # Already default 
}
# --- End Constants ---

class EligibilityDeepDiveAgent(AgentInterface):
    """
    Agent performs a deeper analysis of unmet/unclear eligibility criteria
    by leveraging an LLM to check against available patient data.
    """
    # --- Define Name and Description as Properties to satisfy ABC --- 
    @property
    def name(self) -> str:
        return "EligibilityDeepDiveAgent"

    @property
    def description(self) -> str:
        return "Performs a detailed review of specific eligibility criteria against patient data using an LLM."
    # --- End Properties --- 
    
    def __init__(self):
        # Call super().__init__() - No need to set name/desc here now
        super().__init__() 
        
        # Initialize only the LLM client here
        self.llm_client = None
        if GOOGLE_API_KEY:
            try:
                genai.configure(api_key=GOOGLE_API_KEY)
                self.llm_client = genai.GenerativeModel(
                    LLM_MODEL_NAME,
                    # system_instruction="You are an expert clinical research assistant..." # Add if needed
                )
                # Use self.name (the property) in logging
                logging.info(f"[{self.name}] Google GenAI client initialized successfully with model {LLM_MODEL_NAME}.") 
            except Exception as e:
                 # Use self.name (the property) in logging
                logging.error(f"[{self.name}] Failed to initialize Google GenAI client: {e}", exc_info=True)
        else:
             # Use self.name (the property) in logging
            logging.error(f"[{self.name}] GOOGLE_API_KEY environment variable not set. LLM features will be disabled.")

    async def _analyze_single_criterion_async(self, criterion: str, patient_data: Dict[str, Any], trial_id: str) -> Dict[str, Any]:
        """Analyzes a single criterion asynchronously."""
        result = {
            "criterion": criterion,
            "status": "UNCLEAR",
            "evidence": "",
            "analysis_source": "Standard LLM"
        }

        # --- Refined Genomic Criterion Detection ---
        is_genomic_criterion = False
        # Keywords indicating a request for genomic status/test results
        genomic_status_keywords = [
            "mutation", "mutations", "variant", "variants", "alteration", "alterations",
            "status", "expression", "amplification", "deletion", "fusion", 
            "positive", "negative", "wild-type", "wild type", "wt", 
            "detected", "profile", "profiling", "sequencing", "assay", "test"
        ]
        # Gene/Biomarker names
        gene_keywords = [
            "gene", "genes", "genomic", "genetic", "dna", "rna", "biomarker",
            "pik3ca", "kras", "tp53", "brca", "akt", "egfr", "braf", "her2"
            # Add more specific gene names if needed
        ]
        
        criterion_lower = criterion.lower()
        contains_gene_keyword = any(gkw.lower() in criterion_lower for gkw in gene_keywords)
        contains_status_keyword = any(skw.lower() in criterion_lower for skw in genomic_status_keywords)

        # Require BOTH a gene-related term AND a status/test-related term
        if contains_gene_keyword and contains_status_keyword:
            # Basic check to avoid matching simple mentions like "prior AKT inhibitor"
            # If it contains "prior" or "inhibitor" near the gene name, maybe don't class as genomic analysis needed?
            # This heuristic might need refinement. For now, we rely on requiring a status keyword.
            is_genomic_criterion = True
            result["analysis_source"] = "GenomicAnalystAgent (Attempt)" # Tentatively set source
            logging.info(f"[EligibilityDeepDiveAgent:{trial_id}] Detected potential genomic criterion (refined): {criterion}")
        # --- End Refined Detection ---

        # If it's a genomic criterion and we have genomic data, delegate to GenomicAnalystAgent
        if is_genomic_criterion:
            if patient_data.get('genomics'):
                logging.debug(f"[EligibilityDeepDiveAgent:{trial_id}] Delegating to GenomicAnalystAgent...")
                try:
                    # Check if GenomicAnalystAgent is available (import might have failed)
                    try:
                        from .genomic_analyst_agent import GenomicAnalystAgent 
                    except ImportError:
                         logging.error(f"[EligibilityDeepDiveAgent:{trial_id}] GenomicAnalystAgent class not found. Cannot perform genomic analysis.")
                         result.update({
                             "status": "ERROR", 
                             "evidence": "Genomic analysis required, but the GenomicAnalystAgent is not available.",
                             "analysis_source": "System Error"
                         })
                         return result

                    genomic_agent = GenomicAnalystAgent()
                    genomic_result = await genomic_agent.run(
                        genomic_query=criterion,
                        patient_genomic_data=patient_data['genomics']
                    )
                    
                    result.update({
                        "status": genomic_result.get("status", "UNCLEAR"),
                        "evidence": genomic_result.get("evidence", "No evidence provided"),
                        "analysis_source": "GenomicAnalystAgent (Mock)" # Update source on success
                    })
                    logging.info(f"[EligibilityDeepDiveAgent:{trial_id}] Mock genomic analysis complete.")
                    return result # Return result from GenomicAnalystAgent
                except Exception as e:
                    logging.error(f"[EligibilityDeepDiveAgent:{trial_id}] Error during GenomicAnalystAgent execution: {str(e)}", exc_info=True)
                    result.update({
                        "status": "ERROR",
                        "evidence": f"Error during genomic analysis delegation: {str(e)}",
                        "analysis_source": "System Error"
                    })
                    return result
            else:
                # Genomic criterion detected, but no genomic data provided for the patient
                logging.warning(f"[EligibilityDeepDiveAgent:{trial_id}] Genomic criterion detected, but no patient genomic data found.")
                result.update({
                    "status": "UNCLEAR",
                    "evidence": "Genomic analysis required by criterion, but no genomic data was provided for this patient.",
                    "analysis_source": "Missing Data"
                })
                return result

        # --- If NOT a genomic criterion (or delegation failed above), use standard LLM ---
        # This block now only runs for non-genomic criteria
        logging.debug(f"[EligibilityDeepDiveAgent:{trial_id}] Performing standard LLM text analysis for criterion: {criterion[:80]}...")
        result["analysis_source"] = "Standard LLM" # Ensure source is correct
        try:
            # Prepare the prompt for the LLM
            prompt = f"""
            Analyze this clinical trial eligibility criterion based ONLY on the provided patient data:
            
            Criterion: {criterion}
            
            Patient Data Snippet (JSON):
            ```json
            {json.dumps(patient_data, indent=2, default=str)} 
            ```
            
            Task: Determine if the patient meets this single criterion based *only* on the data provided.
            
            Respond with ONLY the following structure:
            STATUS: [MET | NOT_MET | UNCLEAR]
            REASONING: [Your brief 1-2 sentence reasoning, referencing the patient data or lack thereof.]
            
            Example 1:
            STATUS: MET
            REASONING: Patient's recent labs show platelet count of 250 K/uL, which meets the >= 150 K/uL requirement.
            
            Example 2:
            STATUS: UNCLEAR
            REASONING: The criterion requires ECOG performance status, but this information is not present in the provided patient data snippet.
            
            Example 3:
            STATUS: NOT_MET
            REASONING: Patient is documented as having an allergy to Penicillin, which is listed as a contraindication in the criterion.
            """

            # --- FIX: Use generate_content_async ---
            if not self.llm_client:
                 raise ValueError("LLM Client not initialized")
                 
            response = await self.llm_client.generate_content_async(
                prompt,
                generation_config=DEFAULT_LLM_GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS
            )
            # --- End FIX ---
            
            # --- Extract Text Safely (reuse logic from previous versions if needed) --- 
            response_text = ""
            try:
                # Standard way to get text from Gemini response
                if response.parts:
                    response_text = response.parts[0].text
                elif hasattr(response, 'text'):
                     response_text = response.text # Fallback for simpler text responses
                else:
                    logging.warning(f"[EligibilityDeepDiveAgent:{trial_id}] LLM Response structure unexpected or no text content found for criterion: {criterion[:80]}. Blocked? Resp: {response}")
                    response_text = "Error: LLM response structure invalid or missing text."
            except AttributeError:
                 logging.warning(f"[EligibilityDeepDiveAgent:{trial_id}] LLM Response object missing .text/.parts attribute for criterion: {criterion[:80]}. Blocked? Resp: {response}")
                 response_text = "Error: LLM response blocked or attribute missing."
            except Exception as text_ex:
                 logging.error(f"[EligibilityDeepDiveAgent:{trial_id}] Error extracting text from LLM response: {text_ex}", exc_info=True)
                 response_text = f"Error extracting text: {text_ex}"
            # --- End Text Extraction ---

            logging.debug(f"[{self.name}:{trial_id}] Raw LLM response for standard criterion: {response_text[:150]}...")

            # --- Parse the STATUS/REASONING response ---
            status_match = re.search(r"STATUS:\\s*(MET|NOT_MET|UNCLEAR)", response_text, re.IGNORECASE)
            reasoning_match = re.search(r"REASONING:\\s*(.*)", response_text, re.IGNORECASE | re.DOTALL)
            
            if status_match and reasoning_match:
                result["status"] = status_match.group(1).upper()
                result["evidence"] = reasoning_match.group(1).strip()
                logging.debug(f"[{self.name}:{trial_id}] Parsed LLM Analysis: Status={result['status']}, Evidence={result['evidence'][:100]}...")
            else:
                logging.warning(f"[{self.name}:{trial_id}] Could not parse STATUS/REASONING from LLM response for criterion: {criterion[:80]}. Raw Resp: {response_text}")
                result["status"] = "ERROR_PARSING_FAILED"
                result["evidence"] = f"Could not parse response. Raw: {response_text}"
                
            return result # Return result from standard LLM analysis

        except Exception as e:
            logging.error(f"[EligibilityDeepDiveAgent:{trial_id}] Error during standard LLM analysis for criterion '{criterion[:80]}...': {str(e)}", exc_info=True)
            result["status"] = "ERROR_ANALYSIS_FAILED"
            result["evidence"] = f"Error during standard LLM analysis: {str(e)}"
            result["analysis_source"] = "System Error"
            return result
        
        # This part should ideally not be reached if logic above is correct
        # logging.error(f"[EligibilityDeepDiveAgent:{trial_id}] Reached unexpected end of _analyze_single_criterion_async for: {criterion}")
        # result["status"] = "ERROR_UNEXPECTED_FLOW"
        # result["evidence"] = "Analysis flow reached an unexpected state."
        # return result

    async def run(self, **kwargs) -> Dict[str, Any]:
        """
        Runs the deep dive analysis on unmet/unclear criteria using concurrent LLM calls.
        """
        unmet_criteria = kwargs.get('unmet_criteria', [])
        unclear_criteria = kwargs.get('unclear_criteria', [])
        patient_data = kwargs.get('patient_data', {})
        trial_data = kwargs.get('trial_data', {}) # Includes 'official_title', 'nct_id', etc.
        trial_id = trial_data.get('nct_id', 'N/A')

        logging.info(f"[{self.name}:{trial_id}] Starting deep dive analysis for trial '{trial_data.get('official_title', trial_id)}'.")
        logging.info(f"[{self.name}:{trial_id}] Criteria: {len(unmet_criteria)} unmet, {len(unclear_criteria)} unclear.")

        if not self.llm_client:
            logging.error(f"[{self.name}:{trial_id}] LLM client not initialized. Cannot perform deep dive.")
            return {
                "summary": "Deep dive skipped: LLM client not available.",
                "clarified_items": [],
                "remaining_gaps": unmet_criteria + unclear_criteria, # Return all as gaps
                "refined_next_steps": ["Initialize LLM client correctly."]
            }

        # Prepare patient data string once
        # Select relevant patient data fields to include in the prompt
        relevant_patient_data = {
            "profile": patient_data.get("profile"),
            "conditions": patient_data.get("conditions"),
            "medications": patient_data.get("medications"),
            "allergies": patient_data.get("allergies"),
            "recent_labs": patient_data.get("recent_labs"), # Assuming labs are available
            # Add other potentially relevant sections like 'procedures', 'social_history' if needed
        }
        try:
            patient_data_str = json.dumps(relevant_patient_data, indent=2)
        except TypeError as e:
            logging.error(f"[{self.name}:{trial_id}] Could not serialize patient data to JSON: {e}")
            patient_data_str = '{"error": "Could not serialize patient data"}'

        # --- Prepare analysis tasks ---
        tasks = []
        all_criteria_to_analyze = [
            (crit, 'unmet') for crit in unmet_criteria
        ] + [
            (crit, 'unclear') for crit in unclear_criteria
        ]

        if not all_criteria_to_analyze:
             logging.info(f"[{self.name}:{trial_id}] No unmet or unclear criteria to analyze.")
             return {
                "summary": "No unmet or unclear criteria provided for deep dive.",
                "clarified_items": [],
                "remaining_gaps": [],
                "refined_next_steps": []
            }

        for criterion_data, crit_type in all_criteria_to_analyze:
            # Create an awaitable task for each criterion analysis
            # --- FIX: Extract the criterion text string --- 
            criterion_text = criterion_data.get('criterion', 'Missing criterion text') 
            if not isinstance(criterion_text, str):
                logging.warning(f"[{self.name}:{trial_id}] Invalid criterion format found: {criterion_data}. Skipping.")
                continue # Skip this invalid criterion
                
            tasks.append(
                self._analyze_single_criterion_async(
                    criterion=criterion_text, # Pass the extracted text string
                    patient_data=patient_data,
                    trial_id=trial_id
                )
            )

        # --- Run analysis tasks concurrently ---
        logging.info(f"[{self.name}:{trial_id}] Running analysis for {len(tasks)} criteria concurrently...")
        analysis_results = await asyncio.gather(*tasks, return_exceptions=True)
        logging.info(f"[{self.name}:{trial_id}] Concurrent analysis finished.")

        # --- Process results ---
        clarified_items = []
        remaining_gaps = []

        for result in analysis_results:
            if isinstance(result, Exception):
                logging.error(f"[{self.name}:{trial_id}] An analysis task failed: {result}", exc_info=result)
                # Add to remaining gaps with error status
                remaining_gaps.append({
                    "criterion": "Analysis Task Failed",
                    "original_reasoning": "N/A", # No original reasoning for a failed task
                    "deep_dive_status": "ERROR_TASK_FAILED",
                    "deep_dive_evidence": f"Error during concurrent execution: {result}",
                    "original_type": "error",
                    "analysis_source": "System Error" # Source is system error
                })
                continue

            # Extract data from the result dictionary returned by _analyze_single_criterion_async
            criterion_text = result.get('criterion', 'Unknown Criterion')
            status = result.get('status', 'ERROR_PROCESSING_FAILED')
            evidence = result.get('evidence', 'No evidence processed.')
            analysis_source = result.get('analysis_source', 'Unknown Source') # <-- Get the analysis source
            
            # Find the original criterion object to get its original reasoning and type
            original_criterion_data = None
            original_type = 'unknown'
            for crit_data, crit_type in all_criteria_to_analyze:
                 if crit_data.get('criterion') == criterion_text: # Match based on criterion text
                      original_criterion_data = crit_data
                      original_type = crit_type
                      break 
            
            original_reasoning = original_criterion_data.get('reasoning', 'N/A') if original_criterion_data else 'Original criterion not found'

            # Construct the final item for the report
            item = {
                "criterion": criterion_text,
                "original_reasoning": original_reasoning,
                "deep_dive_status": status,
                "deep_dive_evidence": evidence,
                "original_type": original_type,
                "analysis_source": analysis_source # <-- Include analysis_source here
            }

            # Append to the correct list based on the deep dive status
            if status in ["MET", "NOT_MET", "CONFLICT_FOUND"]:
                clarified_items.append(item)
                logging.debug(f"[{self.name}:{trial_id}] Clarified (Source: {analysis_source}): '{criterion_text[:50]}...' -> {status}")
            else: # UNCLEAR or any ERROR status from the deep dive call
                remaining_gaps.append(item)
                logging.debug(f"[{self.name}:{trial_id}] Remains Gap/Unclear (Source: {analysis_source}): '{criterion_text[:50]}...' -> {status}")
        

        # --- Generate Summary (Keep as is) ---
        summary = (
            f"Deep dive analysis complete for {len(all_criteria_to_analyze)} criteria. "
            f"{len(clarified_items)} items clarified, {len(remaining_gaps)} gaps remain."
        )
        logging.info(f"[{self.name}:{trial_id}] {summary}")

        # --- NEW: Perform Internal Data Search for Remaining Gaps ---
        internal_search_findings = []
        if remaining_gaps and patient_data.get('notes'):
            logging.info(f"[{self.name}:{trial_id}] Performing internal search within patient notes for {len(remaining_gaps)} remaining gaps...")
            notes_content = patient_data.get('notes', [])
            
            gaps_to_search = list(remaining_gaps) # Create a copy to iterate over
            
            for gap in gaps_to_search:
                criterion_text_lower = gap.get('criterion', '').lower()
                search_performed = False
                findings_for_criterion = []

                # Example: Search for ECOG / Performance Status
                if "ecog" in criterion_text_lower or "performance status" in criterion_text_lower:
                    search_performed = True
                    keywords = ['ecog', 'performance status', 'ambulatory', 'bedridden', ' KPS ', ' Karnofsky'] # Added KPS
                    # Simple case-insensitive keyword search in notes
                    for note in notes_content:
                        note_text = note.get('text', '')
                        note_text_lower = note_text.lower()
                        note_date = note.get('date', 'Unknown Date')
                        provider = note.get('provider', 'Unknown Provider')
                        
                        # Find sentences containing keywords
                        sentences = re.split(r'[.!?]\s+', note_text) # Split into sentences
                        for sentence in sentences:
                            sentence_lower = sentence.lower()
                            for keyword in keywords:
                                if keyword in sentence_lower:
                                    findings_for_criterion.append({
                                        "source": f"Note ({note_date} by {provider})",
                                        "match": keyword,
                                        "context": sentence.strip()
                                    })
                                    break # Move to next sentence once a keyword is found in this one
                                    
                # NEW: Search for common Lab mentions
                elif any(lab_keyword in criterion_text_lower for lab_keyword in 
                         ["platelet", "hemoglobin", "bilirubin", "creatinine", 
                          "neutrophil", "ast", "sgot", "alt", "sgpt"]):
                    search_performed = True
                    # Define keywords for different labs
                    lab_keywords = {
                        "platelet": ["platelet", "plt", "thrombocytopenia", "thrombocytosis"],
                        "hemoglobin": ["hemoglobin", "hgb", "anemia"],
                        "bilirubin": ["bilirubin", "bili", "jaundice"],
                        "creatinine": ["creatinine", "crcl", "creat", "renal function"],
                        "neutrophil": ["neutrophil", "anc", "neutropenia"],
                        "ast_alt": ["ast", "sgot", "alt", "sgpt", "liver enzymes", "lft", "hepatic function"]
                    }
                    
                    # Determine which lab group this criterion likely relates to
                    relevant_lab_group = None
                    if any(kw in criterion_text_lower for kw in lab_keywords["platelet"]): relevant_lab_group = "platelet"
                    elif any(kw in criterion_text_lower for kw in lab_keywords["hemoglobin"]): relevant_lab_group = "hemoglobin"
                    elif any(kw in criterion_text_lower for kw in lab_keywords["bilirubin"]): relevant_lab_group = "bilirubin"
                    elif any(kw in criterion_text_lower for kw in lab_keywords["creatinine"]): relevant_lab_group = "creatinine"
                    elif any(kw in criterion_text_lower for kw in lab_keywords["neutrophil"]): relevant_lab_group = "neutrophil"
                    elif any(kw in criterion_text_lower for kw in lab_keywords["ast_alt"]): relevant_lab_group = "ast_alt"
                    
                    if relevant_lab_group:
                        keywords_to_search = lab_keywords[relevant_lab_group]
                        for note in notes_content:
                            note_text = note.get('text', '')
                            note_text_lower = note_text.lower()
                            note_date = note.get('date', 'Unknown Date')
                            provider = note.get('provider', 'Unknown Provider')
                            
                            sentences = re.split(r'[.!?]\s+', note_text) 
                            for sentence in sentences:
                                sentence_lower = sentence.lower()
                                for keyword in keywords_to_search:
                                    if keyword in sentence_lower:
                                        # Look for potential numeric values near the keyword
                                        numeric_context = re.findall(r"[-+]?\d*\.?\d+", sentence) 
                                        findings_for_criterion.append({
                                            "source": f"Note ({note_date} by {provider})",
                                            "match": keyword,
                                            "context": sentence.strip(),
                                            "numeric_values_in_sentence": numeric_context # Add potential values
                                        })
                                        break # Move to next sentence
                    else:
                         logging.warning(f"[{self.name}:{trial_id}] Lab criterion matched but couldn't assign to specific group: {criterion_text_lower}")

                # TODO: Add more search logic for other common gaps (e.g., specific medications, conditions)

                if search_performed and findings_for_criterion:
                     internal_search_findings.append({
                         "criterion": gap.get('criterion'),
                         "findings": findings_for_criterion
                     })
                     logging.debug(f"[{self.name}:{trial_id}] Internal search found potential context for criterion: '{gap.get('criterion')[:50]}...'")
                elif search_performed:
                     # Optionally log that search was done but nothing found
                     logging.debug(f"[{self.name}:{trial_id}] Internal search performed but found no context for criterion: '{gap.get('criterion')[:50]}...'")
                     internal_search_findings.append({
                         "criterion": gap.get('criterion'),
                         "findings": "No relevant mentions found in notes."
                     })

        # --- End Internal Data Search ---

        # --- Generate Refined Next Steps using LLM --- 
        refined_next_steps = [] # Default empty list
        if remaining_gaps and self.llm_client:
            # --- Modify Prompt Context for Next Steps --- 
            # Add internal search results to the context for the next steps LLM call (Task 5.1.3)
            logging.info(f"[{self.name}:{trial_id}] Generating refined next steps based on {len(remaining_gaps)} remaining gaps (considering internal search results)...")
            try:
                gaps_context = []
                for gap in remaining_gaps:
                    # Find corresponding internal search findings, if any
                    search_outcome = "Internal search not applicable or not performed."
                    for finding in internal_search_findings:
                        if finding['criterion'] == gap.get('criterion'):
                            search_outcome = finding['findings']
                            break
                            
                    gaps_context.append({
                        "criterion": gap.get('criterion'),
                        "reason_unresolved": gap.get('deep_dive_evidence', 'Reason unclear'),
                        "original_type": gap.get('original_type'),
                        "internal_search_outcome": search_outcome # Pass search results
                    })
                
                next_steps_prompt = f"""
                Context: You are assisting a clinical research coordinator responsible for screening patients for clinical trials. A deep dive analysis using patient data was performed for specific eligibility criteria that were initially marked as unmet or unclear. An internal search within patient notes was also attempted for some criteria. The following criteria remain unresolved gaps, along with the reasons and any relevant findings from the internal note search:

                Remaining Gaps & Internal Search Outcomes:
                ```json
                {json.dumps(gaps_context, indent=2)}
                ```

                Task: Based *only* on the unresolved gaps listed above and the outcomes of the internal search, suggest a list of concrete, actionable next steps for the coordinator to take to gather the necessary information or resolve the ambiguity. Focus on specific actions.
                **Prioritize actions based on the `internal_search_outcome`:**
                - If `internal_search_outcome` contains specific findings (a list of objects), the primary suggestion should usually be `REVIEW_CHART_SECTION` pointing to the specific source mentioned in the findings.
                - If `internal_search_outcome` indicates a search was performed but found nothing ('No relevant mentions found...'), suggest the most direct external action (e.g., `ORDER_LABS`, `SCHEDULE_ASSESSMENT`).
                - If `internal_search_outcome` indicates the search wasn't applicable or performed, suggest standard actions.
                - Combine actions where sensible (e.g., one `ORDER_LABS` action for multiple missing labs).

                Desired Output Format:
                Provide the output as a JSON list of objects. Each object should represent a single action and have the following keys:
                - "action_type": (String) A category like "ORDER_LABS", "REVIEW_CHART_SECTION", "CLARIFY_WITH_PATIENT", "SCHEDULE_ASSESSMENT", "CONSULT_SPECIALIST", "VERIFY_MEDICATION", "OTHER".
                - "description": (String) A concise description of the recommended action (e.g., "Review note from 2024-07-28 for ECOG context").
                - "rationale": (String) Briefly explain why this action addresses one or more specific gaps, considering the internal search results (e.g., "Addresses missing ECOG status. Internal search found potential mention in note XYZ.").
                - "details": (Optional[String]) Provide specific details if applicable (e.g., specific lab names, note date/provider, specific question for patient).

                Example Action Object:
                {{
                    "action_type": "ORDER_LABS",
                    "description": "Order Complete Blood Count (CBC) and Comprehensive Metabolic Panel (CMP)",
                    "rationale": "Required to address missing Absolute Neutrophil Count, Hemoglobin, Platelets, Bilirubin, AST/ALT, and Creatinine.",
                    "details": "CBC, CMP"
                }}
                
                Example Action Object 2:
                {{
                    "action_type": "SCHEDULE_ASSESSMENT",
                    "description": "Schedule formal ECOG Performance Status assessment",
                    "rationale": "Required to address missing Performance Status criterion.",
                    "details": null
                }}

                Generate the JSON list of action objects now based on the provided Remaining Gaps & Internal Search Outcomes:
                ```json
                [
                    // Generate JSON objects here
                ]
                ```
                """
                
                # Make the LLM call for next steps
                next_steps_response = await asyncio.to_thread(
                    self.llm_client.generate_content,
                    next_steps_prompt,
                    generation_config=DEFAULT_LLM_GENERATION_CONFIG, # Consider adjusting temp/config if needed
                    safety_settings=SAFETY_SETTINGS
                )
                
                # Extract and parse the JSON response for next steps
                raw_next_steps_text = ""
                # Use similar safe text extraction logic as before
                try:
                    if next_steps_response.parts:
                        raw_next_steps_text = next_steps_response.parts[0].text
                    elif hasattr(next_steps_response, 'text'):
                        raw_next_steps_text = next_steps_response.text
                    else: 
                        raw_next_steps_text = "Error: LLM response structure invalid or missing text."
                        logging.warning(f"[{self.name}:{trial_id}] Next steps LLM response structure unexpected: {next_steps_response}")
                except Exception as text_ex:
                    logging.error(f"[{self.name}:{trial_id}] Error extracting text from next steps LLM response: {text_ex}", exc_info=True)
                    raw_next_steps_text = f"Error extracting text: {text_ex}"

                logging.debug(f"[{self.name}:{trial_id}] Raw next steps response: {raw_next_steps_text}")
                
                # Attempt to parse the JSON list from the response
                try:
                    # Find the JSON list within the response (handling potential markdown backticks)
                    json_match = re.search(r"```json\s*(\[.*?\])\s*```", raw_next_steps_text, re.DOTALL)
                    if json_match:
                        json_string = json_match.group(1)
                        refined_next_steps = json.loads(json_string)
                        logging.info(f"[{self.name}:{trial_id}] Successfully parsed {len(refined_next_steps)} refined next steps from LLM JSON block.")
                    else:
                        # Fallback: Try parsing the whole text if no markdown found (less reliable)
                        logging.warning(f"[{self.name}:{trial_id}] No JSON block found in next steps response. Attempting to parse entire response.")
                        try:
                            # Pre-process: Remove potential leading/trailing non-JSON content before parsing
                            potential_json_start = raw_next_steps_text.find('[')
                            potential_json_end = raw_next_steps_text.rfind(']')
                            if potential_json_start != -1 and potential_json_end != -1 and potential_json_start < potential_json_end:
                                json_string_fallback = raw_next_steps_text[potential_json_start:potential_json_end+1]
                                refined_next_steps = json.loads(json_string_fallback)
                                if not isinstance(refined_next_steps, list):
                                    raise ValueError("Fallback parsed result is not a list")
                                logging.info(f"[{self.name}:{trial_id}] Successfully parsed {len(refined_next_steps)} refined next steps from raw LLM text (fallback).")
                            else:
                                raise json.JSONDecodeError("Could not reliably find JSON list boundaries", raw_next_steps_text, 0)
                        except json.JSONDecodeError as fallback_err:
                           logging.warning(f"[{self.name}:{trial_id}] Fallback JSON parsing failed for refined next steps. Error: {fallback_err}. Raw text: {raw_next_steps_text}")
                           refined_next_steps = [{"action_type": "ERROR", "description": "Failed to parse strategic actions from LLM.", "rationale": raw_next_steps_text, "details": None}]

                except json.JSONDecodeError as json_err:
                    logging.error(f"[{self.name}:{trial_id}] Failed to parse JSON for refined next steps: {json_err}. Raw text: {raw_next_steps_text}", exc_info=True)
                    refined_next_steps = [{"action_type": "ERROR", "description": "Failed to parse strategic actions from LLM.", "rationale": raw_next_steps_text, "details": None}]
                
            except Exception as next_step_ex:
                logging.error(f"[{self.name}:{trial_id}] Error generating refined next steps: {next_step_ex}", exc_info=True)
                refined_next_steps = [{"action_type": "ERROR", "description": "Failed to generate strategic actions.", "rationale": str(next_step_ex), "details": None}]
                
        elif not remaining_gaps:
            logging.info(f"[{self.name}:{trial_id}] No remaining gaps, setting default 'all clear' next step.")
            refined_next_steps = [{"action_type": "INFO", "description": "All initially unmet/unclear criteria were clarified by the deep dive.", "rationale": "No further action needed based on deep dive.", "details": None}]
        else: # LLM client not available
             logging.warning(f"[{self.name}:{trial_id}] LLM client not available, cannot generate refined next steps.")
             refined_next_steps = [{"action_type": "ERROR", "description": "LLM client needed to generate strategic actions.", "rationale": "LLM client was not initialized.", "details": None}]
        # --- End Refined Next Steps Generation --- 

        # --- Construct Final Report ---
        report = {
            "summary": summary,
            "clarified_items": clarified_items,
            "internal_search_findings": internal_search_findings,
            "remaining_gaps": remaining_gaps,
            "refined_next_steps": refined_next_steps
        }

        logging.debug(f"[{self.name}:{trial_id}] Deep dive report generated: {json.dumps(report, indent=2)}")
        return report 
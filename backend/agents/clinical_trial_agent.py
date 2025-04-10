"""
Agent responsible for finding relevant clinical trials.
"""

import json
import os
from typing import Any, Dict, Optional

# Import the base class
from core.agent_interface import AgentInterface

# Placeholder for a mock clinical trial database/API
class MockTrialDatabase:
    """ Simulates querying a clinical trial database. """
    def search_trials(self, condition: str, status: Optional[str] = None, phase: Optional[int] = None) -> list:
        """ Simulates searching for trials based on condition. """
        print(f"[MockTrialDatabase] Searching trials for condition: '{condition}', Status: {status}, Phase: {phase}")
        
        # Simple mock data - return different trials based on condition keyword
        condition_lower = condition.lower()
        mock_results = []
        if "breast cancer" in condition_lower or "ductal carcinoma" in condition_lower:
            mock_results = [
                {"nct_id": "NCT01234567", "title": "Trial for Advanced Breast Cancer Therapy X", "phase": 3, "status": "Recruiting", "summary": "Comparing Therapy X to standard care.", "eligibility_criteria": "Stage III/IV HER2+ Breast Cancer..."},
                {"nct_id": "NCT09876543", "title": "Neoadjuvant Immunotherapy for Early-Stage Breast Cancer", "phase": 2, "status": "Recruiting", "summary": "Evaluating Pembrolizumab before surgery.", "eligibility_criteria": "Stage II/III Triple-Negative Breast Cancer..."}
            ]
        elif "lung cancer" in condition_lower:
             mock_results = [
                {"nct_id": "NCT05551111", "title": "Targeted Therapy for EGFR-Mutated NSCLC", "phase": 3, "status": "Active, not recruiting", "summary": "Osimertinib vs Chemotherapy.", "eligibility_criteria": "Stage IV NSCLC with confirmed EGFR mutation..."}
            ]
        else: # Generic fallback
             mock_results = [
                  {"nct_id": "NCT01122334", "title": f"Observational Study for {condition}", "phase": 4, "status": "Recruiting", "summary": "Collecting data on treatment patterns.", "eligibility_criteria": f"Diagnosis of {condition}..."}
             ]
             
        print(f"[MockTrialDatabase] Found {len(mock_results)} mock trials.")
        # Simulate filtering if phase/status were provided (basic)
        if phase:
            mock_results = [t for t in mock_results if t['phase'] == phase]
        if status:
             mock_results = [t for t in mock_results if status.lower() in t['status'].lower()]
             
        return mock_results

class ClinicalTrialAgent(AgentInterface):
    """ Finds clinical trials relevant to a patient's condition. """

    def __init__(self):
        """ Initialize the agent and mock trial database. """
        self.trial_db = MockTrialDatabase()
        # Placeholder: Could initialize LLM for interpreting criteria or refining search
        print("ClinicalTrialAgent Initialized with MockTrialDatabase.")

    @property
    def name(self) -> str:
        return "clinical_trial_finder"

    @property
    def description(self) -> str:
        return "Searches for relevant clinical trials based on patient diagnosis, stage, biomarkers, etc."

    async def run(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Searches for clinical trials.

        Args:
            context: Dictionary containing patient_data.
            **kwargs: Expected to contain 'entities' from the orchestrator,
                      potentially including 'condition', 'disease_stage', 'biomarkers',
                      'trial_phase', 'recruitment_status'.

        Returns:
            A dictionary with status and the list of found trials.
        """
        print(f"ClinicalTrialAgent running.")
        entities = kwargs.get("entities", {})
        original_prompt = kwargs.get("prompt", "")
        patient_data = context.get("patient_data", {})
        
        # --- Extract Search Criteria --- 
        # Use patient's primary diagnosis as default condition if not specified
        primary_diagnosis = patient_data.get("diagnosis", {}).get("primary", None)
        condition = entities.get("condition", entities.get("specific_condition", primary_diagnosis))
        
        if not condition:
             return {"status": "clarification_needed", "output": None, "summary": "Missing condition/diagnosis.", "error_message": "Please specify the condition or diagnosis to search trials for."}
             
        # Extract other potential criteria from entities
        phase = entities.get("trial_phase")
        status = entities.get("recruitment_status")
        # TODO: Add extraction for stage, biomarkers etc. and pass to search tool

        print(f"[ClinicalTrialAgent] Searching based on Condition: '{condition}', Phase: {phase}, Status: {status}")

        try:
            # --- Call Mock Trial Database Search --- 
            found_trials = self.trial_db.search_trials(
                condition=condition, 
                phase=int(phase) if phase and str(phase).isdigit() else None,
                status=status
            )

            # Simulate async work
            import asyncio
            await asyncio.sleep(0.1)

            return {
                "status": "success", 
                "output": {
                    "search_criteria": {"condition": condition, "phase": phase, "status": status}, # Echo criteria used
                    "found_trials": found_trials # List of trial dictionaries
                },
                "summary": f"Found {len(found_trials)} mock clinical trials matching the criteria."
            }
            
        except Exception as e:
            print(f"Error during clinical trial search: {e}")
            return {"status": "failure", "output": None, "summary": f"Failed to search for trials: {e}", "error_message": str(e)}

# Example Usage (for testing)
# if __name__ == '__main__':
#     async def main():
#         agent = ClinicalTrialAgent()
#         # Example 1: Using patient context
#         ctx1 = {"patient_data": {"diagnosis": {"primary": "Stage III Invasive Ductal Carcinoma (Breast)"}}}
#         kw1 = {"prompt": "Find clinical trials for this patient"}
#         res1 = await agent.run(ctx1, **kw1)
#         print("Result 1:", json.dumps(res1, indent=2))
#         
#         # Example 2: Specifying criteria in prompt (mocked entities)
#         ctx2 = {"patient_data": {}}
#         kw2 = {
#             "prompt": "Find phase 2 recruiting trials for lung cancer",
#             "entities": {"condition": "lung cancer", "trial_phase": "2", "recruitment_status": "Recruiting"}
#         }
#         res2 = await agent.run(ctx2, **kw2)
#         print("Result 2:", json.dumps(res2, indent=2))
#         
#     import asyncio
#     asyncio.run(main()) 
"""
Agent responsible for identifying and suggesting management for side effects.
"""

import json
import os
from typing import Any, Dict, Optional

# Import the base class
from backend.core.agent_interface import AgentInterface

# Placeholder: Could use LLM or structured database later
# import google.generativeai as genai 

# Mock data for common side effects (simplified)
MOCK_SIDE_EFFECT_DB = {
    "letrozole": ["Hot flashes", "Joint pain", "Fatigue"],
    "metformin": ["Diarrhea", "Nausea", "Gas"],
    "lisinopril": ["Dry cough", "Dizziness"],
    "chemotherapy": ["Nausea", "Fatigue", "Hair loss", "Low blood counts"], # Generic category
    "immunotherapy": ["Fatigue", "Rash", "Diarrhea", "Colitis"] # Generic category
}
MOCK_MANAGEMENT_TIPS = {
    "nausea": "Consider anti-nausea medication (e.g., Zofran). Stay hydrated. Eat small, frequent meals.",
    "fatigue": "Prioritize rest. Gentle exercise as tolerated. Ensure adequate nutrition and hydration.",
    "diarrhea": "Stay hydrated (water, broth, electrolytes). Avoid high-fiber, greasy foods. Consider loperamide if severe.",
    "joint pain": "Over-the-counter pain relievers (consult physician first). Gentle stretching.",
    "rash": "Keep skin moisturized. Avoid harsh soaps. Antihistamines or topical steroids may help (consult physician).",
    "dry cough": "Stay hydrated. Lozenges. Discuss with physician if persistent."
}

class SideEffectAgent(AgentInterface):
    """ Identifies potential side effects and suggests management strategies. """

    def __init__(self):
        """ Initialize the side effect agent. """
        # Placeholder: Could initialize LLM or database connection
        print("SideEffectAgent Initialized.")

    @property
    def name(self) -> str:
        return "side_effect_manager"

    @property
    def description(self) -> str:
        return "Identifies potential medication/treatment side effects and suggests management tips."

    async def run(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Identifies potential side effects or provides management tips.

        Args:
            context: Dictionary containing patient_data.
            **kwargs: Expected to contain 'entities' from the orchestrator,
                      potentially including 'medication_name', 'symptom', 'treatment_type'.

        Returns:
            A dictionary with status and relevant side effect information.
        """
        print(f"SideEffectAgent running.")
        entities = kwargs.get("entities", {})
        patient_data = context.get("patient_data", {})
        
        # --- Identify potential topic --- 
        target_med = entities.get("medication_name")
        target_symptom = entities.get("symptom", entities.get("specific_condition"))
        target_treatment = entities.get("treatment_type") 
        
        potential_side_effects = []
        management_tips = []

        # --- Logic based on request --- 
        # Scenario 1: User asks about side effects of a specific med
        if target_med:
            med_lower = target_med.lower()
            print(f"Checking side effects for medication: {target_med}")
            potential_side_effects = MOCK_SIDE_EFFECT_DB.get(med_lower, [])
            # Check generic categories too
            if "chemo" in med_lower:
                 potential_side_effects.extend(MOCK_SIDE_EFFECT_DB.get("chemotherapy", []))
            if "immuno" in med_lower:
                 potential_side_effects.extend(MOCK_SIDE_EFFECT_DB.get("immunotherapy", []))
            potential_side_effects = list(set(potential_side_effects)) # Unique list
            
            summary = f"Potential side effects for {target_med}: {', '.join(potential_side_effects) if potential_side_effects else 'None listed in mock DB.'}"

        # Scenario 2: User asks for management of a specific symptom
        elif target_symptom:
            symptom_lower = target_symptom.lower()
            print(f"Checking management tips for symptom: {target_symptom}")
            tip = MOCK_MANAGEMENT_TIPS.get(symptom_lower)
            if tip:
                management_tips.append({ "symptom": target_symptom, "tip": tip })
            summary = f"Management tips for {target_symptom}: {tip if tip else 'No specific tips in mock DB.'}"
            
        # Scenario 3: User asks generally about side effects for the patient
        else:
            print("Checking potential side effects based on patient's current medications.")
            meds = patient_data.get("currentMedications", [])
            for med_entry in meds:
                med_name = med_entry.get("name", "").lower()
                if med_name:
                     effects = MOCK_SIDE_EFFECT_DB.get(med_name, [])
                     if effects:
                         potential_side_effects.extend(effects)
            # Add generic chemo/immuno if relevant (needs better context)
            # if patient_is_on_chemo: potential_side_effects.extend(MOCK_SIDE_EFFECT_DB.get("chemotherapy", [])) 
            potential_side_effects = list(set(potential_side_effects)) # Unique list
            summary = f"Potential side effects based on current meds: {', '.join(potential_side_effects) if potential_side_effects else 'None identified from mock DB.'}"

        # Simulate async work
        import asyncio
        await asyncio.sleep(0.1)

        # --- Return Result --- 
        return {
            "status": "success", 
            "output": {
                "target_medication": target_med,
                "target_symptom": target_symptom,
                "potential_side_effects": potential_side_effects, # List of strings
                "management_tips": management_tips # List of {symptom, tip} dicts
            },
            "summary": summary
        }

# Example Usage (for testing)
# if __name__ == '__main__':
#     async def main():
#         agent = SideEffectAgent()
#         ctx = {"patient_data": {"currentMedications": [{"name": "Letrozole"}, {"name": "Metformin"}]}}
#         
#         # Test 1: General check
#         kw1 = {"prompt": "Any side effects to watch for?"}
#         res1 = await agent.run(ctx, **kw1)
#         print("Result 1 (General):", json.dumps(res1, indent=2))
#         
#         # Test 2: Specific med
#         kw2 = {"prompt": "What are side effects of Letrozole?", "entities": {"medication_name": "Letrozole"}}
#         res2 = await agent.run(ctx, **kw2)
#         print("Result 2 (Specific Med):", json.dumps(res2, indent=2))
#         
#         # Test 3: Specific symptom
#         kw3 = {"prompt": "How to manage nausea?", "entities": {"symptom": "nausea"}}
#         res3 = await agent.run(ctx, **kw3)
#         print("Result 3 (Specific Symptom):", json.dumps(res3, indent=2))
#         
#     import asyncio
#     asyncio.run(main()) 
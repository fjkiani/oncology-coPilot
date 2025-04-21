"""
Agent responsible for drafting and sending notifications.
"""

import json
import os
from typing import Any, Dict, Optional
import google.generativeai as genai

# Import the base class
from backend.core.agent_interface import AgentInterface
from backend.core.llm_clients import GeminiClient

# Placeholder for potential future integrations (e.g., secure messaging API client)

class NotificationAgent(AgentInterface):
    """ Drafts notifications using Gemini and simulates sending them. """

    def __init__(self):
        """ Initialize the notification agent and Gemini model. """
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            # This assumes the key is mandatory for this agent to function
            raise ValueError("NotificationAgent requires GOOGLE_API_KEY environment variable.")
        
        # Configure Gemini client (assuming genai.configure was called globally or handle errors)
        try:
            # Using flash for potentially faster drafting tasks
            self.model = genai.GenerativeModel('gemini-1.5-flash') 
            print("NotificationAgent Initialized with Gemini Client.")
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Gemini client for NotificationAgent: {e}")
        
        print("NotificationAgent Initialization complete.")

    @property
    def name(self) -> str:
        return "notifier"

    @property
    def description(self) -> str:
        return "Handles drafting professional notifications or alerts to specified recipients using an LLM."

    async def run(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Drafts a notification using an LLM and simulates sending it.
        """
        print(f"NotificationAgent running.")
        entities = kwargs.get("entities", {})
        original_prompt = kwargs.get("prompt", "")
        patient_data = context.get("patient_data", {})
        patient_name = patient_data.get("demographics", {}).get("name", "this patient")

        # Extract key info (add more specific extraction logic as needed)
        recipient = entities.get("recipient", "Concerned Clinician") # Default if not specified
        condition = entities.get("specific_condition", "a clinical update")
        urgency = entities.get("urgency", "normal")
        # Use the original prompt to provide context for the LLM drafter
        context_for_drafting = original_prompt 
        # Or, potentially build more context from patient_data / entities
        # context_for_drafting = f"Original request: {original_prompt}. Key finding: {condition}. Patient: {patient_name}."

        try:
            # --- Draft notification using LLM --- 
            drafted_content_raw = await self._call_llm_for_drafting(
                recipient=recipient,
                patient_name=patient_name,
                context_info=context_for_drafting, # Pass the core info/request
                condition=condition, 
                urgency=urgency
            )
            
            # --- Robust JSON Extraction and Parsing --- 
            subject = f"Update regarding {patient_name}" # Default subject
            body = "Could not extract notification body from LLM response." # Default body
            extracted_json = None
            
            json_start = drafted_content_raw.find('{')
            json_end = drafted_content_raw.rfind('}')

            if json_start != -1 and json_end != -1 and json_end > json_start:
                json_str = drafted_content_raw[json_start:json_end+1]
                print(f"[NotificationAgent] Extracted JSON String: {json_str}")
                try:
                    extracted_json = json.loads(json_str)
                except json.JSONDecodeError as e:
                    print(f"[NotificationAgent] Failed to parse extracted JSON block: {e}")
                    body = drafted_content_raw # Use raw content as fallback body if parsing fails
            else:
                print("[NotificationAgent] Could not find JSON block in LLM response. Using raw text as body.")
                body = drafted_content_raw # Use raw content as fallback body

            # If JSON was parsed successfully, extract subject and body
            if extracted_json:
                 subject = extracted_json.get("subject", subject) # Use default if key missing
                 body = extracted_json.get("body", body) # Use default if key missing
            # --------------------------------------------

            # --- Simulate Sending Notification --- 
            print("--- SIMULATING NOTIFICATION SEND --- ")
            print(f"To: {recipient}")
            print(f"Subject: {subject}")
            print(f"Body:\n{body}")
            print("------------------------------------")
            await asyncio.sleep(0.1)

            return {
                "status": "success", # Or 'requires_review' if we want clinician to approve draft
                "output": {
                    "recipient": recipient,
                    "subject": subject, # Use the extracted or default subject
                    "body": body,       # Use the extracted or default/raw body
                    "simulated_send": True
                },
                "summary": f"Successfully drafted notification to {recipient} using LLM."
            }

        except Exception as e:
            print(f"Error during notification agent execution: {e}")
            return {
                "status": "failure", "output": None,
                "summary": f"Failed to draft/simulate notification: {e}", "error_message": str(e)
            }
            
    def _generate_drafting_prompt(self, recipient: str, patient_name: str, context_info: str, condition: str, urgency: str) -> str:
        """ Creates the prompt for the LLM to draft the notification. """
        prompt = f"""
You are a helpful clinical assistant AI. Your task is to draft a professional and clear notification message.

**Context:**
The user wants to send a notification based on the following information/request about patient {patient_name}:
`{context_info}`

**Key Information/Condition:** {condition}
**Recipient:** {recipient}
**Urgency:** {urgency}

**Instructions:**
1. Draft a concise and professional notification message suitable for the specified recipient.
2. If the recipient seems to be a clinician (e.g., "Dr.", "PCP"), use appropriate medical terminology. If it seems to be the patient, use clear, simple language.
3. Include the key information/condition mentioned above.
4. Generate a relevant subject line.
5. Respond ONLY with a JSON object containing two keys:
   - "subject": The drafted subject line (string).
   - "body": The drafted notification body (string).

Example JSON Response:
{{
  "subject": "Urgent: Elevated Glucose for Jane Doe",
  "body": "Dear Dr. Baker,\n\nPlease note that recent labs for Jane Doe show an elevated glucose level of [Value if available]. Please review at your earliest convenience.\n\nThank you,\nAI CoPilot System"
}}

JSON Response:
"""
        return prompt

    async def _call_llm_for_drafting(self, recipient: str, patient_name: str, context_info: str, condition: str, urgency: str) -> str:
        """ Calls the Gemini API to draft the notification. """
        if not self.model:
            raise RuntimeError("NotificationAgent: Gemini model not initialized.")

        prompt = self._generate_drafting_prompt(recipient, patient_name, context_info, condition, urgency)

        print("Sending notification drafting prompt to Gemini...")
        try:
            response = await self.model.generate_content_async(prompt)
            drafted_text = response.text.strip().replace("`json", "").replace("```", "")
            print(f"Received raw drafted content from Gemini: {drafted_text}")
            return drafted_text
        except Exception as e:
            print(f"Error during Gemini API call for notification drafting: {e}")
            raise e # Re-raise to be caught by run method

# Example Usage (for testing)
# if __name__ == '__main__':
#     async def main():
#         agent = NotificationAgent()
#         mock_context = {"patient_data": {"demographics": {"name": "Jane Doe"}}}
#         mock_kwargs = {
#             "prompt": "Notify Dr. Baker about high glucose",
#             "entities": {"recipient": "Dr. Baker", "specific_condition": "high glucose"}
#         }
#         result = await agent.run(mock_context, **mock_kwargs)
#         print("Notification Result:", result)
#     import asyncio
#     asyncio.run(main()) 
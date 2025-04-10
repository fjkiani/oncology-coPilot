"""
Agent responsible for analyzing patient data, generating summaries, and extracting insights.
"""

import google.generativeai as genai
import os
import json
from datetime import datetime
from typing import Any, Dict

# Import the base class
from core.agent_interface import AgentInterface

# Placeholder for Gemini/LangChain integration
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain_core.prompts import ChatPromptTemplate
# from langchain_core.output_parsers import StrOutputParser


class DataAnalysisAgent(AgentInterface):
    """ Analyzes clinical data and generates summaries or insights using Gemini. """

    def __init__(self):
        """ Initialize the agent and configure the Gemini client. """
        self.api_key = os.getenv("GOOGLE_API_KEY")
        
        # Robust check for API Key after dotenv load
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set. "
                             "Ensure it is defined in the .env file in the 'backend' directory.")

        # Configure the Gemini client
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            print(f"DataAnalysisAgent Initialized with Gemini Client (Model: {self.model.model_name}).")
        except Exception as e:
             print(f"Error configuring Gemini client: {e}")
             # Optionally re-raise or handle more gracefully depending on requirements
             raise RuntimeError(f"Failed to initialize Gemini client: {e}")
        
        # Placeholder for the LLM setup (Implementation in step 2b)
        # self.llm = ChatGoogleGenerativeAI(model="gemini-pro", google_api_key=self.api_key)
        
        # Placeholder for prompt templates
        # self.summary_prompt_template = self._create_summary_prompt()
        
        print("DataAnalysisAgent Initialization complete.") # Updated log message

    @property
    def name(self) -> str:
        return "data_analyzer"

    @property
    def description(self) -> str:
        return "Analyzes patient data using Gemini to generate clinical summaries, identify key findings, or answer specific questions about the data."

    async def run(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Runs the data analysis based on the context and specific task.

        Args:
            context: Dictionary containing patient_data.
            **kwargs: Must contain 'task' (e.g., 'summarize') and potentially 'prompt' for specific questions.
                      Example: task='summarize'
                      Example: task='answer_question', prompt='What was the result of the last CT scan?'

        Returns:
            A dictionary with status and the generated output (summary or answer).
        """
        print(f"DataAnalysisAgent running with task: {kwargs.get('task')}")
        patient_data = context.get("patient_data")
        if not patient_data:
             return {
                "status": "failure",
                "output": None,
                "summary": "Failed: Patient data missing in context.",
                "error_message": "Patient data missing."
            }
            
        task = kwargs.get("task", "summarize")

        if task == "summarize":
            if not self.model:
                # Fallback to placeholder if API key/model is missing
                print("Gemini model not available, using placeholder summary.")
                placeholder_summary = self._generate_placeholder_summary(patient_data)
                return {
                    "status": "success",
                    "output": {"summary_text": placeholder_summary},
                    "summary": "Generated placeholder summary (Gemini unavailable)."
                }
            try:
                # Call the actual LLM for summarization
                summary_text = await self._call_llm_for_summary(patient_data)
                return {
                    "status": "success",
                    "output": {"summary_text": summary_text},
                    "summary": "Successfully generated summary using Gemini."
                }
            except Exception as e:
                 print(f"Error calling Gemini for summary: {e}")
                 return {
                    "status": "failure",
                    "output": None,
                    "summary": f"Failed to generate summary via Gemini: {e}",
                    "error_message": str(e)
                }
        elif task == "answer_question":
            user_prompt = kwargs.get("prompt", None)
            if not user_prompt:
                 return {
                    "status": "failure", "output": None,
                    "summary": "Failed: No question prompt provided for answer_question task.", "error_message": "Missing prompt for question."
                }
            
            if not self.model:
                # Fallback to placeholder if API key/model is missing
                print("Gemini model not available, using placeholder answer.")
                return {
                    "status": "requires_review",
                    "output": {"answer_text": f"[Placeholder Answer for: \"{user_prompt}\"] (Gemini unavailable)"},
                    "summary": "Generated placeholder answer (Gemini unavailable)."
                }
            try:
                # Call the actual LLM for question answering
                answer_text = await self._call_llm_for_question(patient_data, user_prompt)
                return {
                    "status": "success", # Or potentially 'requires_review' depending on confidence?
                    "output": {"answer_text": answer_text},
                    "summary": "Successfully generated answer using Gemini."
                }
            except Exception as e:
                 print(f"Error calling Gemini for question answering: {e}")
                 return {
                    "status": "failure", "output": None,
                    "summary": f"Failed to answer question via Gemini: {e}", "error_message": str(e)
                }
        else:
            return {
                "status": "failure",
                "output": None,
                "summary": f"Unsupported task: {task}",
                "error_message": f"DataAnalysisAgent does not support task: {task}"
            }
            
    def _generate_summary_prompt(self, patient_data: dict) -> str:
        """ Constructs the detailed prompt for clinical summarization. """
        try:
            dob = datetime.strptime(patient_data.get("demographics", {}).get("dob", ""), "%Y-%m-%d")
            today = datetime.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            age_str = f"{age} years old"
        except ValueError:
            age_str = "Age N/A"

        prompt = f"""
Act as a medical professional reviewing a patient's electronic health record.
Based *only* on the following structured patient data, generate a concise clinical summary suitable for a quick overview during a clinical encounter.

Patient Data:
{json.dumps(patient_data, indent=2)}

Instructions for the summary:
1. Start with a brief statement including patient name, age ({age_str}), and primary diagnosis with status.
2. Briefly mention relevant active comorbidities from medical history.
3. Summarize key findings from the most recent progress notes.
4. Highlight any critical or significantly abnormal recent lab results (mention specific values and flags).
5. Summarize key findings and recommendations from recent imaging reports.
6. Note any significant events or concerning trends reported in patient-generated health data, if available.
7. Conclude with the patient's overall current status or immediate next steps if clearly stated in the notes (e.g., awaiting biopsy, scheduled for cycle 2).
8. Keep the summary concise, objective, and focused on clinically relevant information.
9. Do not infer information not present in the provided data.

Clinical Summary:
"""
        return prompt

    async def _call_llm_for_summary(self, patient_data: dict) -> str:
        """ Calls the Gemini API to generate the summary. """
        if not self.model:
            raise RuntimeError("Gemini model not initialized. Check API key.")
            
        prompt = self._generate_summary_prompt(patient_data)
        
        print("Sending summarization prompt to Gemini...")
        try:
            # Use generate_content_async for async FastAPI
            response = await self.model.generate_content_async(prompt)
            summary = response.text
            print("Received summary from Gemini.")
            return summary
        except Exception as e:
            print(f"Error during Gemini API call: {e}")
            # Re-raise the exception to be caught by the run method
            raise e

    def _generate_placeholder_summary(self, patient_data: dict) -> str:
        """ Creates a simple placeholder summary string. """
        name = patient_data.get("demographics", {}).get("name", "N/A")
        diagnosis = patient_data.get("diagnosis", {}).get("primary", "N/A")
        return f"Placeholder Summary for {name}. Diagnosis: {diagnosis}. Analysis complete (simulation)."

    def _generate_question_prompt(self, patient_data: dict, question: str) -> str:
        """ Constructs the prompt for answering specific questions based on patient data. """
        prompt = f"""
Act as a clinical data assistant. Based *only* on the provided Patient Data JSON object, answer the user's question accurately and concisely.
If the answer cannot be found directly within the provided data, state that the information is not available in the record.
Do not infer information or make assumptions beyond what is present in the data.

Patient Data:
{json.dumps(patient_data, indent=2)}

User Question: {question}

Answer:
"""
        return prompt

    async def _call_llm_for_question(self, patient_data: dict, question: str) -> str:
        """ Calls the Gemini API to answer a specific question based on patient data. """
        if not self.model:
            raise RuntimeError("Gemini model not initialized. Check API key.")
            
        prompt = self._generate_question_prompt(patient_data, question)
        
        print("Sending question prompt to Gemini...")
        try:
            response = await self.model.generate_content_async(prompt)
            answer = response.text
            print(f"Received answer from Gemini for question '{question}'.")
            return answer
        except Exception as e:
            print(f"Error during Gemini API call for question answering: {e}")
            raise e

    # --- Future methods for LLM interaction ---
    # def _create_summary_prompt(self):
    #     # Define the LangChain prompt template here
    #     pass
    
    # async def _call_llm_for_summary(self, patient_data_str: str):
    #     # chain = self.summary_prompt_template | self.llm | StrOutputParser()
    #     # result = await chain.ainvoke({"patient_data": patient_data_str})
    #     # return result
    #     pass

# Example Usage (for testing)
# if __name__ == '__main__':
#     async def main():
#         agent = DataAnalysisAgent()
#         # Load mock data here
#         mock_context = {"patient_data": { ... } }
#         summary_result = await agent.run(mock_context, task='summarize')
#         print("Summary Result:", summary_result)
#         question_result = await agent.run(mock_context, task='answer_question', prompt='Test question?')
#         print("Question Result:", question_result)
#     import asyncio
#     # asyncio.run(main()) 
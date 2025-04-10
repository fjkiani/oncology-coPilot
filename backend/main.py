from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Import BaseModel
import json
import os
from dotenv import load_dotenv # Import load_dotenv
# Placeholder for future Python-based AI utils
# from . import ai_utils 

# Load environment variables from .env file
load_dotenv()

# Import the orchestrator and blockchain utility
from core.orchestrator import AgentOrchestrator
from core.blockchain_utils import record_contribution # <-- Import the new function

app = FastAPI()

# Instantiate the orchestrator
orchestrator = AgentOrchestrator()

# Configure CORS
origins = [
    "http://localhost:5173",  # Assuming default Vite dev server port
    "http://localhost:3000",  # Common React dev server port
    # Add any other origins if necessary (e.g., deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load mock data from a JSON file (or define it directly)
MOCK_DATA_PATH = 'mock_patient_data.json'

# Define the mock data directly in the script first
# In a real app, load from file or database
mock_patient_data_dict = {
  "PAT12345": {
    "patientId": "PAT12345",
    "demographics": {
      "name": "Jane Doe",
      "dob": "1965-03-15",
      "sex": "Female",
      "contact": "555-123-4567",
      "address": "123 Main St, Anytown, USA"
    },
    "diagnosis": {
      "primary": "Stage III Invasive Ductal Carcinoma (Breast)",
      "diagnosedDate": "2023-01-20",
      "status": "Active Treatment"
    },
    "medicalHistory": [
      "Hypertension (controlled)",
      "Type 2 Diabetes (well-managed)",
      "Appendectomy (1995)"
    ],
    "currentMedications": [
      { "name": "Lisinopril", "dosage": "10mg", "frequency": "Daily" },
      { "name": "Metformin", "dosage": "500mg", "frequency": "Twice Daily" },
      { "name": "Letrozole", "dosage": "2.5mg", "frequency": "Daily" }
    ],
    "allergies": [
      "Penicillin (Rash)",
      "Shellfish (Anaphylaxis)"
    ],
    "recentLabs": [
      {
        "panelName": "Complete Blood Count (CBC)",
        "orderDate": "2024-07-25",
        "resultDate": "2024-07-25",
        "status": "Final",
        "components": [
          { "test": "WBC", "value": 6.5, "unit": "K/uL", "refRange": "4.0-11.0", "flag": "Normal" },
          { "test": "RBC", "value": 4.2, "unit": "M/uL", "refRange": "4.0-5.5", "flag": "Normal" },
          { "test": "Hgb", "value": 12.1, "unit": "g/dL", "refRange": "12.0-16.0", "flag": "Normal" },
          { "test": "Plt", "value": 250, "unit": "K/uL", "refRange": "150-400", "flag": "Normal" }
        ],
        "interpretation": "Within normal limits."
      },
      {
        "panelName": "Comprehensive Metabolic Panel (CMP)",
        "orderDate": "2024-07-25",
        "resultDate": "2024-07-25",
        "status": "Final",
        "components": [
          { "test": "Glucose", "value": 110, "unit": "mg/dL", "refRange": "70-100", "flag": "High" },
          { "test": "Creatinine", "value": 0.9, "unit": "mg/dL", "refRange": "0.6-1.2", "flag": "Normal" },
          { "test": "ALT", "value": 25, "unit": "U/L", "refRange": "10-40", "flag": "Normal" }
        ],
        "interpretation": "Glucose elevated, consistent with history of T2DM. Monitor."
      },
      {
        "panelName": "Tumor Marker CA 27-29",
        "orderDate": "2024-07-15",
        "resultDate": "2024-07-16",
        "status": "Final",
        "components": [
          { "test": "CA 27-29", "value": 35, "unit": "U/mL", "refRange": "< 38", "flag": "Normal" }
        ],
        "interpretation": "Baseline within normal range."
      }
    ],
    "imagingStudies": [
       {
         "studyId": "IMG78901",
         "type": "Mammogram",
         "modality": "MG",
         "date": "2024-07-10",
         "status": "Final Report",
         "reportText": "Findings: Suspicious clustered microcalcifications in the right breast upper outer quadrant, approximately 1.5 cm lesion. Impression: Highly suspicious for malignancy (BI-RADS 5). Recommendation: Ultrasound-guided core biopsy.",
         "imageAccess": {
           "pacsSystem": "MainPACS",
           "accessionNumber": "A12345678",
           "studyInstanceUID": "1.2.840.113619.2.55.3.28311..."
         }
       },
       {
         "studyId": "IMG78902",
         "type": "CT Chest/Abdomen/Pelvis w/ Contrast",
         "modality": "CT",
         "date": "2024-07-20",
         "status": "Final Report",
         "reportText": "Findings: No evidence of thoracic, abdominal, or pelvic metastatic disease. Stable postsurgical changes from prior appendectomy. Impression: No definite metastatic disease.",
         "imageAccess": {
           "pacsSystem": "MainPACS",
           "accessionNumber": "A12345679",
           "studyInstanceUID": "1.2.840.113619.2.55.3.28312..."
         }
       }
    ],
    "patientGeneratedHealthData": {
        "source": "Apple HealthKit / Fitbit API",
        "lastSync": "2024-07-30T08:00:00Z",
        "summary": {
          "averageStepsLast7Days": 4500,
          "averageRestingHeartRateLast7Days": 68,
          "averageSleepHoursLast7Days": 6.5,
          "significantEvents": [
            { "date": "2024-07-29", "type": "ActivityAlert", "detail": "Steps significantly below baseline (2000 vs 5000 avg)" },
            { "date": "2024-07-28", "type": "SleepAlert", "detail": "Reported poor sleep quality via linked app" }
          ]
        }
    },
    "notes": [
      { "noteId": "NOTE001", "date": "2024-07-28", "provider": "Dr. Adams (Oncology)", "type": "Progress Note", "text": "Patient reviewed treatment plan (AC-T chemotherapy). Tolerating initial cycle well with minor nausea managed by Zofran. Discussed importance of hydration and monitoring for fever. Reviewed recent labs and imaging - CT negative for mets, awaiting biopsy results from mammogram finding. Patient reports stable energy levels, step count slightly down per wearable data (discussed potential fatigue). Scheduled follow-up post-cycle 2." },
      { "noteId": "NOTE002", "date": "2024-07-20", "provider": "Dr. Baker (PCP)", "type": "Follow-up Note", "text": "Routine follow-up. BP and A1c stable. Reviewed oncology plan. Reinforced supportive care measures." }
    ]
  }
}


# Define the endpoint to get patient data
@app.get("/api/patients/{patient_id}")
async def get_patient_data(patient_id: str):
    # In a real app, you'd query a database based on patient_id
    # For MVP, just return the mock data if the ID matches
    patient_data = mock_patient_data_dict.get(patient_id)
    if patient_data:
        return patient_data
    else:
        # Use HTTPException for proper error response
        raise HTTPException(status_code=404, detail="Patient not found")

# --- New Prompt Endpoint using Orchestrator --- 
class PromptRequest(BaseModel):
    prompt: str

@app.post("/api/prompt/{patient_id}")
async def handle_prompt_request(patient_id: str, request: PromptRequest):
    """ Receives a user prompt and routes it through the orchestrator. """
    # 1. Get patient data
    patient_data = mock_patient_data_dict.get(patient_id)
    if not patient_data:
        raise HTTPException(status_code=404, detail="Patient not found for prompt processing")

    # 2. Call the orchestrator's handle_prompt method
    try:
        result = await orchestrator.handle_prompt(
            prompt=request.prompt,
            patient_id=patient_id,
            patient_data=patient_data
        )
        return result
    except Exception as e:
        print(f"Error during prompt handling: {e}")
        # Consider more specific error handling based on orchestrator responses later
        raise HTTPException(status_code=500, detail=f"Failed to process prompt: {e}")

# --- Feedback Endpoint with Blockchain Logging --- 
class FeedbackRequest(BaseModel):
    feedback_text: str
    ai_output_context: str # e.g., ID of the summary, or the summary text itself for context

@app.post("/api/feedback/{patient_id}")
async def handle_feedback(patient_id: str, request: FeedbackRequest):
    """ 
    Receives feedback on AI output, stores it (conceptually), 
    and logs metadata to the blockchain.
    """
    print(f"Received feedback for patient {patient_id}: {request.feedback_text[:100]}...")
    
    # --- 1. (Conceptual) Store Full Feedback Off-Chain --- 
    # In a real app, you would save request.feedback_text, request.ai_output_context,
    # patient_id, timestamp, user_id etc., into a secure database.
    # For POC, we just construct the data string to be hashed.
    data_to_log = f"PATIENT_ID={patient_id};CONTEXT={request.ai_output_context};FEEDBACK={request.feedback_text}"
    print("Conceptual: Storing feedback off-chain.")
    
    # --- 2. Log Metadata to Blockchain --- 
    try:
        success, tx_hash_or_error = await record_contribution(
            contribution_type="AI_Feedback",
            data_to_log=data_to_log
        )
        
        if success:
            print(f"Blockchain transaction successful: {tx_hash_or_error}")
            return {
                "status": "success", 
                "message": "Feedback received and metadata logged to blockchain.",
                "blockchain_tx_hash": tx_hash_or_error
            }
        else:
            # Log the error but return a user-friendly message
            print(f"Blockchain transaction failed: {tx_hash_or_error}")
            # Don't expose detailed blockchain errors to the frontend
            raise HTTPException(status_code=500, detail="Failed to log feedback metadata to blockchain.")

    except Exception as e:
        # Catch unexpected errors during the process
        print(f"Error handling feedback: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred while processing feedback: {e}")

# Root endpoint (optional)
@app.get("/")
async def read_root():
    return {"message": "AI Cancer Care CoPilot Backend"}

if __name__ == "__main__":
    # For development, run using: uvicorn main:app --reload --port 8000
    # (Assuming you are in the 'backend' directory)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
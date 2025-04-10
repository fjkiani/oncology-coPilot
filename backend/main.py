from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Import BaseModel
import json
import os
from dotenv import load_dotenv # Import load_dotenv
import asyncio # Import asyncio if not already present
from typing import Optional # <-- Import Optional for type hinting
# Placeholder for future Python-based AI utils
# from . import ai_utils 

# Load environment variables from .env file
load_dotenv()

# Import the orchestrator, blockchain utility, and connection manager
from core.orchestrator import AgentOrchestrator
from core.blockchain_utils import record_contribution # <-- Import the new function
from core.connection_manager import manager # <-- Import the connection manager

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

# --- Placeholder Authentication --- 
# In a real app, this would involve JWT decoding, session checking, etc.
async def authenticate_websocket_token(token: str) -> Optional[str]:
    """Placeholder function to validate a token from WebSocket."""
    print(f"Attempting to authenticate token: {token[:10]}...")
    # Dummy validation: Check if token is not empty and maybe has a prefix
    if token and token.startswith("valid_token_"):
        user_id = token.split("_")[-1] # Extract dummy user ID
        print(f"Token validated successfully for user: {user_id}")
        return user_id
    print("Token validation failed.")
    return None
# --- End Placeholder --- 

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

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    authenticated = False
    user_id = None
    current_room = None # Store the patient_id the user joined

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                message_type = message.get("type")

                if message_type == "auth":
                    token = message.get("token")
                    user_id = await authenticate_websocket_token(token)
                    if user_id:
                        authenticated = True
                        await manager.send_personal_message(json.dumps({"type": "auth_ok", "user_id": user_id}), websocket)
                        print(f"WebSocket client authenticated: {user_id}")
                    else:
                        await manager.send_personal_message(json.dumps({"type": "auth_fail", "error": "Invalid token"}), websocket)
                        print("WebSocket client failed authentication.")
                        # Optionally break or close connection here
                        # break 
                
                elif message_type == "join":
                    if not authenticated:
                        await manager.send_personal_message(json.dumps({"type": "join_fail", "error": "Not authenticated"}), websocket)
                        continue
                    
                    room = message.get("room")
                    if room:
                        current_room = room # Set the current room (patient_id)
                        # Conceptually add user to room manager if needed for broadcasting later
                        # await manager.add_user_to_room(user_id, room, websocket) 
                        await manager.send_personal_message(json.dumps({"type": "join_ok", "room": room}), websocket)
                        print(f"WebSocket client {user_id} joined room: {room}")
                    else:
                         await manager.send_personal_message(json.dumps({"type": "join_fail", "error": "Room not specified"}), websocket)

                elif authenticated and current_room: 
                    # Assume other messages are prompts if authenticated and in a room
                    prompt_text = message.get("prompt") # Assuming prompt comes in a 'prompt' field
                    if not prompt_text:
                         # Handle cases where the message isn't a prompt structure
                         await manager.send_personal_message(json.dumps({"type": "error", "message": "Invalid message format or missing 'prompt' field."}), websocket)
                         continue

                    print(f"Received prompt via WebSocket from {user_id} for room {current_room}: {prompt_text[:50]}...")
                    
                    # Process the prompt using the orchestrator
                    patient_data = mock_patient_data_dict.get(current_room)
                    if not patient_data:
                        await manager.send_personal_message(json.dumps({"type": "error", "message": f"Patient data not found for room {current_room}"}), websocket)
                        continue

                    try:
                        # Send status update: Processing
                        await manager.send_personal_message(json.dumps({"type": "status", "message": "Processing prompt..."}), websocket)

                        result = await orchestrator.handle_prompt(
                            prompt=prompt_text,
                            patient_id=current_room,
                            patient_data=patient_data
                        )
                        # Send the result back
                        await manager.send_personal_message(json.dumps({"type": "prompt_result", "result": result}), websocket)
                        print(f"Sent prompt result to {user_id} for room {current_room}")

                    except Exception as e:
                        print(f"Error processing prompt via WebSocket for {user_id} room {current_room}: {e}")
                        await manager.send_personal_message(json.dumps({"type": "error", "message": f"Failed to process prompt: {e}"}), websocket)

                else:
                     # Not authenticated or not joined a room
                    await manager.send_personal_message(json.dumps({"type": "error", "message": "Please authenticate and join a room first."}), websocket)


            except json.JSONDecodeError:
                print("Received non-JSON WebSocket message.")
                await manager.send_personal_message(json.dumps({"type": "error", "message": "Invalid JSON format"}), websocket)
            except Exception as e:
                 # Catch broader exceptions during message handling
                 print(f"Error handling WebSocket message: {e}")
                 await manager.send_personal_message(json.dumps({"type": "error", "message": f"Internal server error: {e}"}), websocket)


    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"WebSocket client disconnected: {user_id if user_id else 'Unknown'}")
    except Exception as e:
        # Catch errors during the main accept/receive loop
        print(f"WebSocket connection error: {e}")
        manager.disconnect(websocket) # Ensure disconnect on error


# --- Health Check/Root Endpoint ---
@app.get("/")
async def read_root():
    return {"message": "AI Cancer Care CoPilot Backend is running."}

# Optional: Add logic to run the server if the script is executed directly
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000) 
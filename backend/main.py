from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Import BaseModel
import json
import os
from dotenv import load_dotenv # Import load_dotenv
import asyncio # Import asyncio if not already present
from typing import Optional, List, Dict, Any # <-- Import Optional, List, Dict, Any for type hinting
# Placeholder for future Python-based AI utils
# from . import ai_utils 

# Load environment variables from .env file
load_dotenv()

# Import the orchestrator, blockchain utility, and connection manager
from core.orchestrator import AgentOrchestrator
from core.blockchain_utils import record_contribution # <-- Import the new function
from core.connection_manager import manager # <-- Import the connection manager
# Assume a utility exists or can be created to call LLM directly
# We might need to create this file/function based on existing agent logic
from core.llm_utils import get_llm_text_response 

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
    print(f"Attempting to authenticate token: {token[:20]}...") # Log more of the token
    # Dummy validation: Check if token is not empty and has the correct prefix
    prefix = "valid_token_"
    if token and token.startswith(prefix):
        user_id = token[len(prefix):] # Extract the part AFTER the prefix
        if user_id: # Ensure we extracted something
             print(f"Token validated successfully for user: {user_id}")
             return user_id
    print(f"Token validation failed for token: {token[:20]}...")
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

# --- Helper Functions for Consultation Initiation (Revised) ---

async def _gather_included_data(patient_id: str, include_options: Dict[str, bool]) -> Dict[str, Any]:
    """
    Gathers specified sections of patient data based on the include_options dict.
    """
    print(f"[Data Gathering] Starting for {patient_id} with options: {include_options}")
    related_info = {}
    patient_data = mock_patient_data_dict.get(patient_id)
    if not patient_data:
        print(f"[Data Gathering] Patient {patient_id} not found.")
        return related_info

    # Map include_options keys to mock_patient_data keys and desired format
    data_map = {
        "includeLabs": ("recentLabs", "Recent Labs"),
        "includeMeds": ("currentMedications", "Current Medications"),
        "includeHistory": ("medicalHistory", "Medical History"),
        "includeNotes": ("notes", "Recent Notes"), # Maybe limit notes? e.g., [:2]
        "includeDiagnosis": ("diagnosis", "Diagnosis"),
        # Add more mappings as needed (e.g., imaging)
    }

    for option_key, (data_key, display_key) in data_map.items():
        if include_options.get(option_key, False): # Check if the option is True
            data_section = patient_data.get(data_key)
            if data_section:
                # Simple implementation: Add the whole section. 
                # Could refine later (e.g., only recent notes/labs)
                if data_key == "notes":
                     related_info[display_key] = data_section[:2] # Limit notes
                else:
                    related_info[display_key] = data_section
                print(f"[Data Gathering] Included '{display_key}'")
            else:
                 print(f"[Data Gathering] Section '{display_key}' requested but not found/empty.")

    print(f"[Data Gathering] Completed. Included sections: {related_info.keys()}")
    return related_info

async def _generate_consult_focus(patient_id: str, topic: str, related_info: Dict[str, Any], initiator_note: Optional[str]) -> str:
    """Generates the AI focus statement using LLM based on topic, included data, and note."""
    print(f"[Focus Generation] Starting for {patient_id} based on topic: '{topic[:50]}...'")
    patient_name = mock_patient_data_dict.get(patient_id, {}).get('demographics', {}).get('name', 'the patient')
    
    prompt = f"Patient: {patient_name} ({patient_id})\n"
    prompt += f"Consultation Topic/Reason: {topic}\n"
    
    if initiator_note:
        prompt += f"Initiator Note: {initiator_note}\n"
    
    prompt += "\nSelected Patient Context Provided:\n"
    if not related_info:
        prompt += "- None provided beyond the topic.\n"
    else:
        # Format included data concisely for the prompt
        for key, value in related_info.items():
            # Basic summarization/truncation for prompt clarity
            if isinstance(value, list) and len(value) > 3:
                 prompt += f"- {key}: (Showing first 3 of {len(value)}) {json.dumps(value[:3], indent=1)}\n"
            elif isinstance(value, list) and not value:
                 prompt += f"- {key}: None\n"
            else:
                prompt += f"- {key}: {json.dumps(value, indent=1)}\n" 
            
    prompt += "\nPlease synthesize the above into a concise 'Consult Focus' statement (1-2 sentences). "
    prompt += "This statement should guide the consulting physician on the likely key question or area needing discussion, considering the topic, the provided context sections, and any initiator notes."
    
    print(f"[Focus Generation] Prompting LLM:\n{prompt[:500]}...")
    
    try:
        focus_statement = await get_llm_text_response(prompt)
        print(f"[Focus Generation] LLM Response received: {focus_statement[:100]}...")
        return focus_statement if focus_statement else "AI could not generate a focus statement."
    except Exception as e:
        print(f"[Focus Generation] Error calling LLM: {e}")
        return f"Error generating AI focus statement: {e}"

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_host = websocket.client.host
    client_port = websocket.client.port
    print(f"WebSocket connection attempt from: {client_host}:{client_port}")
    await manager.connect(websocket)
    authenticated_user_id = None
    current_room = None # Track the room this socket has joined

    try:
        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            message_type = data.get("type")
            print(f"Received WS message type: {message_type} from {authenticated_user_id or f'{client_host}:{client_port}'}")

            if message_type == "auth":
                token = data.get("token")
                user_id = await authenticate_websocket_token(token)
                if user_id:
                    authenticated_user_id = user_id
                    await manager.associate_user(user_id, websocket)
                    await manager.send_personal_message({"type": "auth_success", "message": f"Authenticated as {user_id}"}, websocket)
                    print(f"User {user_id} authenticated for WebSocket connection from {client_host}:{client_port}")
                    # Optionally auto-join a default room if needed, e.g., patient room
                    patient_id_from_token = data.get("patientId") # Assuming client sends patientId with auth
                    if patient_id_from_token:
                        await manager.join_room(patient_id_from_token, websocket)
                        current_room = patient_id_from_token # Track joined room
                        print(f"User {user_id} auto-joined room: {patient_id_from_token}")
                else:
                    await manager.send_personal_message({"type": "auth_fail", "message": "Invalid token"}, websocket)
                    # Keep connection open but unauthenticated, or disconnect?
                    # For now, let's disconnect if auth fails
                    print(f"Authentication failed for WebSocket from {client_host}:{client_port}. Disconnecting.")
                    await websocket.close(code=1008) # Policy Violation
                    manager.disconnect(websocket) # Ensure manager knows
                    break # Exit the loop after closing

            # --- All subsequent actions require authentication ---
            elif not authenticated_user_id:
                print(f"WS message ignored from unauthenticated connection {client_host}:{client_port}")
                await manager.send_personal_message({"type": "error", "message": "Authentication required"}, websocket)
                continue # Ignore message, wait for auth

            elif message_type == "join":
                room_id = data.get("roomId")
                if room_id:
                    await manager.join_room(room_id, websocket)
                    current_room = room_id
                    await manager.send_personal_message({"type": "status", "message": f"Joined room {room_id}"}, websocket)
                    print(f"User {authenticated_user_id} explicitly joined room: {room_id}")
                else:
                     await manager.send_personal_message({"type": "error", "message": "Room ID missing for join request"}, websocket)

            elif message_type == "prompt":
                if not current_room:
                    await manager.send_personal_message({"type": "error", "message": "Cannot process prompt: Not in a room."}, websocket)
                    continue
                    
                prompt_text = data.get("prompt")
                # Assuming room ID often corresponds to patient ID for general prompts
                patient_id_for_prompt = current_room 
                patient_data = mock_patient_data_dict.get(patient_id_for_prompt)

                if not patient_data:
                     await manager.send_personal_message({"type": "error", "message": f"Patient data not found for ID: {patient_id_for_prompt}"}, websocket)
                     continue
                if not prompt_text:
                     await manager.send_personal_message({"type": "error", "message": "Prompt cannot be empty."}, websocket)
                     continue

                try:
                    print(f"Processing prompt '{prompt_text[:50]}...' for patient {patient_id_for_prompt} in room {current_room}")
                    result = await orchestrator.handle_prompt(
                        prompt=prompt_text,
                        patient_id=patient_id_for_prompt,
                        patient_data=patient_data
                    )
                    await manager.send_personal_message({"type": "prompt_result", "result": result}, websocket)
                except Exception as e:
                    print(f"Error processing prompt via WebSocket: {e}")
                    await manager.send_personal_message({"type": "error", "message": f"Error processing prompt: {e}"}, websocket)

            elif message_type == "initiate_consult":
                # --- Updated Initiate Consult Logic --- 
                target_user_id = data.get("targetUserId")
                patient_id = data.get("patientId")
                initiator_info = data.get("initiator")
                room_id = data.get("roomId")
                context_data = data.get("context")

                if not all([target_user_id, patient_id, initiator_info, room_id, context_data]):
                    print("Initiate consult failed: Missing parameters")
                    await manager.send_personal_message({"type": "initiate_fail", "roomId": room_id, "error": "Missing required parameters"}, websocket)
                    continue
                
                # Extract data based on the revised payload structure
                initial_trigger = context_data.get("initialTrigger") # Contains { description: "..." }
                include_options = context_data.get("includeOptions", {}) # Dict of bools
                use_ai = context_data.get("useAI", False) 
                initiator_note = context_data.get("initiatorNote")
                topic_description = initial_trigger.get("description", "General Consultation")

                print(f"Initiating consult from {initiator_info['id']} to {target_user_id} for patient {patient_id} in room {room_id}.")
                print(f"Topic: '{topic_description[:50]}...', Include Options: {include_options}, AI Assist: {use_ai}")
                if initiator_note: print(f"Initiator Note: {initiator_note[:50]}...")

                # --- Prepare context to send to target user --- 
                related_info = None
                focus_statement = None
                
                try:
                    # 1. Gather included data based on checkboxes (always happens)
                    related_info = await _gather_included_data(patient_id, include_options)
                except Exception as gather_ex:
                     print(f"Error during data gathering: {gather_ex}")
                     related_info = {"error": f"Could not gather context data: {gather_ex}"}

                if use_ai:
                    try:
                        # 2. Generate focus statement using LLM (only if useAI is true)
                        focus_statement = await _generate_consult_focus(patient_id, topic_description, related_info or {}, initiator_note)
                    except Exception as focus_ex:
                        print(f"Error during AI focus generation: {focus_ex}")
                        focus_statement = f"AI Error: Could not generate focus ({focus_ex})"

                # Construct the final context payload for the recipient
                context_to_send = {
                    "initialTrigger": initial_trigger, # Keep the original trigger/topic info
                    "initiatorNote": initiator_note,
                    "useAI": use_ai, # Let recipient know if AI was involved
                    "relatedInfo": related_info, # The data gathered based on checkboxes
                    "consultFocusStatement": focus_statement if use_ai else None # Only include if AI was used
                }

                # --- Find target user socket(s) and send --- 
                target_sockets = await manager.get_user_sockets(target_user_id)
                if target_sockets:
                    message_to_target = {
                        "type": "consult_request",
                        "roomId": room_id,
                        "patientId": patient_id,
                        "initiator": initiator_info,
                        "context": context_to_send # Send the processed context
                    }
                    sent_count = 0
                    for target_socket in target_sockets:
                        try:
                            # Use manager's method which now handles serialization
                            await manager.send_personal_message(message_to_target, target_socket)
                            sent_count += 1
                        except Exception as e:
                             print(f"Error sending consult_request to a socket for {target_user_id}: {e}")
                             
                    if sent_count > 0:
                        print(f"Successfully sent consult request for room {room_id} to {sent_count} socket(s) for user {target_user_id}")
                        await manager.send_personal_message({"type": "initiate_ok", "roomId": room_id}, websocket)
                    else:
                         print(f"Failed sending consult_request to any socket for {target_user_id}")
                         await manager.send_personal_message({"type": "initiate_fail", "roomId": room_id, "error": "Failed to send message to colleague's active sessions"}, websocket)
                else:
                    print(f"Target user {target_user_id} not found or not connected.")
                    await manager.send_personal_message({"type": "initiate_fail", "roomId": room_id, "error": "Colleague is not currently connected"}, websocket)

            elif message_type == "chat_message":
                room_id = data.get("roomId")
                message_content = data.get("content")
                sender_info = data.get("sender") # {id: ..., name: ...}
                if room_id and message_content and sender_info:
                    # Add timestamp on the server
                    timestamp = asyncio.get_event_loop().time() 
                    chat_payload = {
                        "type": "chat_message",
                        "roomId": room_id,
                        "content": message_content,
                        "sender": sender_info,
                        "timestamp": timestamp
                    }
                    print(f"Broadcasting chat message in room {room_id} from {sender_info['id']}")
                    await manager.broadcast_to_room(room_id, chat_payload, exclude_sender=websocket)
                    # Also send back to sender for confirmation/display
                    await manager.send_personal_message(chat_payload, websocket)
                else:
                    await manager.send_personal_message({"type": "error", "message": "Missing fields for chat message"}, websocket)

            elif message_type == "agent_command":
                room_id = data.get("roomId")
                command = data.get("command")
                command_context = data.get("context", {}) # Optional extra context
                sender_info = data.get("sender")
                patient_id_for_command = data.get("patientId") # Expect patientId for context

                if not all([room_id, command, sender_info, patient_id_for_command]):
                    await manager.send_personal_message({"type": "error", "message": "Missing fields for agent command"}, websocket)
                    continue
                    
                print(f"Processing agent command '{command}' in room {room_id} from {sender_info['id']} for patient {patient_id_for_command}")
                
                # Send an acknowledgement back to the sender that the command is being processed
                await manager.send_personal_message({
                    "type": "system_message",
                    "roomId": room_id,
                    "content": f"Processing command: {command}..."
                }, websocket)
                
                agent_result = None
                error_message = None
                
                try:
                    patient_data = mock_patient_data_dict.get(patient_id_for_command)
                    if not patient_data:
                        raise ValueError(f"Patient data not found for ID: {patient_id_for_command}")

                    # --- Route command to appropriate AI logic --- 
                    if command == "summarize":
                        # Use orchestrator for summarization intent
                        result = await orchestrator.handle_prompt(
                            prompt="Generate a clinical summary", # Standardized prompt
                            patient_id=patient_id_for_command,
                            patient_data=patient_data
                        )
                        # Extract relevant part of the result
                        agent_result = result.get('output', {}).get('summary_text')
                        if not agent_result: agent_result = result.get('summary', 'Summary could not be generated.')
                        
                    elif command == "check_interactions":
                        # Construct a direct LLM prompt
                        med_list = "\n".join([f"- {med['name']} {med['dosage']}" for med in patient_data.get('currentMedications', [])])
                        allergy_list = "\n".join([f"- {allergy['substance']}" for allergy in patient_data.get('allergies', [])])
                        prompt = (
                            f"Patient: {patient_data['demographics']['name']}\n"
                            f"Current Medications:\n{med_list or '- None'}\n"
                            f"Known Allergies:\n{allergy_list or '- None'}\n\n"
                            f"Please check for potential drug-drug interactions, drug-allergy interactions, "
                            f"and any significant contraindications based ONLY on the provided medication and allergy lists. "
                            f"Focus on clinically significant interactions. Format as a concise list."
                        )
                        agent_result = await get_llm_text_response(prompt)
                    
                    # Add elif for other commands (e.g., side_effects) here...
                    elif command == "review_side_effects":
                         # Use orchestrator for side effects intent
                        result = await orchestrator.handle_prompt(
                            prompt="What are the potential side effects and management tips?", # Example prompt
                            patient_id=patient_id_for_command,
                            patient_data=patient_data
                        )
                        # Format the result more nicely
                        output = result.get('output', {})
                        side_effects = "\n".join([f"- {se}" for se in output.get('potential_side_effects', [])])
                        management = "\n".join([f"- {tip['symptom']}: {tip['tip']}" for tip in output.get('management_tips', [])])
                        agent_result = f"Potential Side Effects:\n{side_effects or '- None identified'}\n\nManagement Tips:\n{management or '- None provided'}"
                        if not agent_result: agent_result = result.get('summary', 'Could not retrieve side effect info.')

                    else:
                        error_message = f"Unknown agent command: {command}"
                        
                except Exception as e:
                    print(f"Error processing agent command '{command}': {e}")
                    error_message = f"Error during '{command}': {e}"
                    
                # --- Broadcast result or error to the room --- 
                if error_message:
                    response_payload = {
                        "type": "system_message",
                        "roomId": room_id,
                        "content": error_message,
                        "isError": True
                    }
                else:
                    response_payload = {
                        "type": "agent_result",
                        "roomId": room_id,
                        "command": command,
                        "result": agent_result or "No result generated.", # Ensure result is not None
                        "senderIsAgent": True # Flag for UI styling
                    }
                    
                print(f"Broadcasting agent result/error for command '{command}' in room {room_id}")
                await manager.broadcast_to_room(room_id, response_payload)

            else:
                print(f"Unknown message type received: {message_type}")
                # Optionally send an error back
                await manager.send_personal_message({"type": "error", "message": f"Unsupported message type: {message_type}"}, websocket)

    except WebSocketDisconnect as e:
        print(f"WebSocket disconnected from {authenticated_user_id or f'{client_host}:{client_port}'} with code: {e.code}")
        # Optionally log disconnect reason if needed (e.g., e.reason)
    except Exception as e:
        # Catch potential errors during receive/processing
        print(f"Error in WebSocket connection handler for {authenticated_user_id or f'{client_host}:{client_port}'}: {e}")
        # Try to close gracefully if possible
        try:
            await websocket.close(code=1011) # Internal Error
        except RuntimeError:
            pass # Already closed or unable to close
    finally:
        # Ensure the connection is removed from the manager on disconnect/error
        print(f"Cleaning up WebSocket connection for {authenticated_user_id or f'{client_host}:{client_port}'}")
        manager.disconnect(websocket)
        if authenticated_user_id and current_room:
            # Optional: Broadcast a leave message if desired
            leave_message = {"type": "system_message", "roomId": current_room, "content": f"{authenticated_user_id} left."}
            # Don't await this, just fire and forget if it fails
            asyncio.create_task(manager.broadcast_to_room(current_room, leave_message, exclude_sender=websocket))
            

# Simple root endpoint
@app.get("/")
async def read_root():
    return {"message": "Beat Cancer AI Backend is running"}

# Add logic to run the app if this script is executed directly
# (e.g., for development/testing)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
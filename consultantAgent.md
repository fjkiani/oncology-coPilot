## Feature Focus: Advanced Consultation Agents

Building upon the real-time consultation feature, this work focuses on implementing more sophisticated AI agents that can be invoked directly within the chat flow to assist clinicians during discussions or case reviews.

### Goal

Enhance the utility of the Doctor-to-Doctor consultation feature by providing on-demand, context-aware information synthesis and drafting capabilities through specialized AI agents.

### Agents Being Developed:

1.  **`ComparativeTherapyAgent`**
    *   **Purpose:** Provides clinicians with a structured comparison of specified treatment regimens based on requested criteria (e.g., efficacy, side effects).
    *   **Trigger:** Invoked via a chat command (e.g., `/compare-therapy current:[RegimenA] vs alternative:[RegimenB] focus:criteria`).
    *   **Workflow:** Retrieves relevant patient context, queries knowledge sources (LLM, potentially integrated databases), synthesizes findings based on focus criteria.
    *   **Output:** Posts a structured comparison summary directly into the consultation chat.
    *   **Disclaimer:** Output is AI-generated for informational purposes and requires clinical verification. Does not constitute a treatment recommendation.

2.  **`PatientEducationDraftAgent`**
    *   **Purpose:** Assists clinicians by drafting patient-friendly explanations of medical topics discussed during the consultation.
    *   **Trigger:** Invoked via a chat command (e.g., `/draft-patient-info topic:"Explanation of Treatment X"`), potentially using chat context.
    *   **Workflow:** Uses an LLM with tailored prompts to generate clear, simple text explaining the specified topic at an appropriate reading level.
    *   **Output:** Posts text clearly marked as a **DRAFT** into the consultation chat, intended solely for clinician review and editing *before* any potential use with a patient.
    *   **Safety:** Clinician review and editing of the draft are mandatory before sharing any information derived from it with patients.

### Integration

Both agents will receive triggers from the consultation chat interface, be processed by the backend orchestrator, and post their results back into the same chat session for immediate visibility to the participants.


# LLM-Powered Agents in Consultation Panel

This document describes the implementation and usage of integrated Large Language Model (LLM) powered agents within the Doctor-to-Doctor Consultation Panel of the Beat Cancer application.

## Overview

To enhance clinical collaboration and efficiency, we have integrated specialized AI agents that can be invoked directly from the consultation chat interface using slash commands. These agents leverage the power of Google's Gemini LLM to perform specific tasks, automate information retrieval and generation, and provide decision support *as assistants* to clinicians.

## Implemented Agents

As of this version, the following agents are available:

### 1. Patient Education Draft Agent (`/draft-patient-info`)

*   **Purpose:** Quickly generates a patient-friendly draft explanation of a specified medical topic. This helps clinicians save time when preparing educational materials for patients, ensuring clarity and appropriate tone.
*   **Command:** `/draft-patient-info topic="<Your topic here>"`
*   **Example:** `/draft-patient-info topic="Managing nausea from chemotherapy"`
*   **Output:** Provides a structured text draft, clearly marked as requiring clinical review, explaining the topic in simple terms suitable for patients.

### 2. Comparative Therapy Agent (`/compare-therapy`)

*   **Purpose:** Provides a structured comparison between two specified therapy regimens based on user-defined criteria (e.g., side effects, efficacy). This assists clinicians in quickly recalling or summarizing key differences during consultations.
*   **Command:** `/compare-therapy current="<Therapy A>" vs="<Therapy B>" focus="<criteria1,criteria2,...>"`
*   **Example:** `/compare-therapy current="Paclitaxel/Carboplatin" vs="Pemetrexed/Cisplatin" focus="common side effects,efficacy"`
*   **Output:** Generates a comparison (often formatted as a table or structured text) highlighting the requested criteria for both therapies, including necessary disclaimers about AI generation.

## How It Works: Technical Implementation

The integration follows a specific workflow:

1.  **Frontend Trigger:** A clinician types a slash command (e.g., `/draft-patient-info ...`) into the Consultation Panel chat input (`frontend/src/components/collaboration/ConsultationPanel.jsx`).
2.  **WebSocket Command:** The frontend recognizes the slash command format and sends a WebSocket message to the backend (`backend/main.py`) with the specific type `agent_command_text`, containing the raw command string, room ID, sender info, and patient ID.
3.  **Backend Parsing:** The main WebSocket endpoint (`@app.websocket("/ws")` in `main.py`) receives the `agent_command_text` message. It uses **Regular Expressions (Regex)** to parse the command string and extract the necessary arguments (e.g., `topic`, `current`, `vs`, `focus`). *(Self-Correction: We moved away from `argparse` for these specific commands due to parsing complexities with the quoted string format).*
4.  **Agent Instantiation & Execution:** Based on the command name (`/draft-patient-info` or `/compare-therapy`), the backend instantiates the corresponding agent class (`PatientEducationDraftAgent` or `ComparativeTherapyAgent` from `backend/agents/`).
5.  **LLM Interaction:** The agent class constructs a detailed prompt based on the parsed arguments and context (like `patient_id`). It then calls the configured LLM client (`backend/core/llm_clients/GeminiClient`) to generate the required text (explanation or comparison).
6.  **Response Formatting:** The agent class may perform minor formatting on the LLM's response before returning it to the main WebSocket handler.
7.  **WebSocket Response (Convention-Based):**
    *   On **success**, the backend constructs a response message using the generic type `agent_output`. The generated text is placed in the `content` field, and the agent's class name is included in the `agentName` field.
    *   On **error** (during parsing, LLM call, or agent execution), the backend sends a message with `type: "error"` and the error details in the `message` field.
8.  **Frontend Display:** The `ConsultationPanel.jsx` component receives the WebSocket message. Its message handling logic:
    *   Recognizes the generic `agent_output` type.
    *   Extracts the text from the `content` field.
    *   Uses the `agentName` to display which agent generated the response (e.g., "Patient Education Draft", "Comparative Therapy").
    *   Renders the content in the chat window, styled as an agent message.
    *   Handles `error` type messages appropriately.

## Uniqueness & Benefits

Integrating these agents directly into the consultation workflow offers several advantages:

*   **Seamless Workflow Integration:** Clinicians don't need to switch to separate tools. AI assistance is available directly within their existing communication channel.
*   **Time Savings:** Automates drafting and information comparison tasks that can be time-consuming.
*   **Consistency:** Provides structured and consistently formatted outputs for common tasks like patient education or therapy comparisons.
*   **Leveraged Knowledge:** Utilizes the broad knowledge base of the LLM for comparisons (always requiring clinical validation).
*   **Scalable Architecture:** By refactoring to use a generic `agent_output` message type convention, adding new agents in the future requires primarily backend implementation. The frontend message handling logic remains simple and does not need modification for each new agent that produces text output.

## Future Vision & Potential

This initial implementation lays the groundwork for a more comprehensive suite of AI-powered tools. Future agents could include:

*   Clinical Trial Matching
*   Side Effect Analysis based on patient history
*   Drug Interaction Checking
*   Summarization of lengthy clinical notes or patient histories
*   Assistance with research tasks (as discussed in brainstorming)
*   And many more specialized clinical or research support functions.

The convention-based approach ensures that we can readily expand these capabilities.

## Usage

To use an agent:

1.  Navigate to the **Consultation Panel** chat interface for a specific patient.
2.  Type the desired slash command followed by its arguments in quotes, as shown in the examples above.
3.  Press Enter or click Send.
4.  The agent's response will appear in the chat window shortly after.

## Important Considerations

*   **Assistive Tool Only:** These agents are designed as **assistants** for qualified healthcare professionals. They do **not** provide medical advice or replace clinical judgment.
*   **Verification Required:** All outputs, especially drafts for patients or therapy comparisons, **must be reviewed, edited, and verified** by a clinician before use.
*   **Accuracy Limitations:** LLMs can make mistakes ("hallucinate") or provide outdated information. Information should be cross-referenced with reliable sources.
*   **Data Privacy:** The current implementation uses minimal context (like `patient_id`). Future enhancements involving more sensitive data must adhere strictly to privacy regulations (HIPAA, GDPR, etc.).

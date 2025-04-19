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

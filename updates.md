# Project Updates

## [Current Date/Time] - Feature: AI Research Portal - Actionable Follow-ups for Unclear Criteria

**Context:** Following the implementation of AI-driven eligibility assessment for clinical trials, it was noted that the list of "Unclear Criteria" (where the LLM lacked sufficient patient data for assessment) needed to be more actionable for clinicians.

**Changes Implemented:**

1.  **Backend - Action Suggester (`backend/agents/action_suggester.py`):**
    *   Created a new utility module to analyze unclear criteria based on keywords (e.g., labs, measurements, history).
    *   Implemented logic to categorize the missing information (e.g., `LAB_ORDER_SUGGESTION`, `TASK`, `PATIENT_MESSAGE_SUGGESTION`, `CHART_REVIEW_SUGGESTION`).
    *   Developed functionality to draft specific action text based on the category and the criterion details (e.g., "Review chart for Her-2 status...", "Draft message to patient asking about BMI...").

2.  **Backend - Agent Integration (`backend/agents/clinical_trial_agent.py`):**
    *   **Tackling Trial Complexity:** Addressed the core challenge of matching patients to trials, a process often hindered by the sheer volume and complexity of eligibility criteria, which are typically lengthy, unstructured, and difficult for clinicians to rapidly parse and compare against individual patient data.
    *   **Streamlined Matching via Multi-Stage AI:** Implemented an intelligent, multi-stage matching pipeline:
        *   **Initial Filtering (Semantic Search & Vector Embeddings):** Leveraged powerful vector embeddings to represent the semantic meaning of both patient profiles (diagnosis, history) and high-level trial information (summaries, conditions). This allows for efficient semantic searching across potentially thousands of trials, drastically narrowing the field to a smaller, contextually relevant candidate pool, moving beyond simple keyword limitations.
        *   **Fine-Grained Criteria Analysis (k-NN on Embeddings):** For the candidate trials, employed a more detailed analysis by comparing vector embeddings of specific, granular eligibility criteria against the patient's detailed data points. Using k-Nearest Neighbors (k-NN) or similar vector algorithms allows the system to rank trials based on how closely their nuanced requirements align with the patient's specific clinical features, providing a much more accurate match than manual review allows in a timely manner.
    *   Integrated the `action_suggester` into the `ClinicalTrialAgent`.
    *   After the LLM returns the eligibility assessment, the agent now calls the suggester to generate potential follow-up actions for any `unclear_criteria`.
    *   These `action_suggestions` (including category, draft text, and brief suggestion) are added to the trial data returned by the `/api/search-trials` endpoint.

3.  **Frontend - Action Display & Interaction (`src/components/research/ResultsDisplay.jsx`):**
    *   Modified the existing `ChecklistModal` (triggered by a button next to "Unclear Criteria", now labeled "Actions") to display the `action_suggestions` received from the backend.
    *   For each suggestion, the modal shows the original criterion, the missing info, the brief suggested action, and context-aware buttons:
        *   "Copy Draft": Appears for patient message suggestions, copies the drafted message text to the clipboard.
        *   "Create Task": Appears for tasks/chart reviews/lab suggestions, currently logs the drafted task text to the console (placeholder for internal task list or future EMR integration).

**Value Delivered:**

*   **Enhanced Actionability:** Transforms the passive list of unclear items into concrete, categorized suggestions for clinician follow-up.
*   **Reduced Cognitive Load:** The AI performs the initial step of identifying *what* needs to be done (check chart, ask patient, order lab) and drafts the corresponding action text.
*   **Workflow Bridge (MVP):** Provides immediate assistance (copying drafts) and lays the foundation for more integrated agentic workflows (task creation, order drafting) by providing the trigger points and drafted content.
*   **Improved Efficiency:** Saves clinicians time by automating the analysis of unclear criteria and the drafting of initial follow-up steps.

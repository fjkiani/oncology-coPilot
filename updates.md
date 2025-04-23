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
        *   **Fine-Grained Criteria Analysis (LLM Assessment & Robust Parsing):** For the candidate trials, employed an LLM (`gemini-1.5-flash`) to perform detailed analysis comparing specific eligibility criteria against the patient's data points.
            *   **Parsing Challenge:** Initial attempts involved instructing the LLM to return results in a complex, nested JSON format. However, this proved unreliable, frequently leading to parsing errors (`json.loads` failures) due to the LLM generating syntactically invalid JSON (e.g., incorrect escape sequences `\` or `\"` within strings), especially given the length and complexity of clinical trial criteria.
            *   **Solution - Structured Text & Manual Parsing:** To overcome JSON unreliability, the approach was shifted. The LLM is now prompted to return the analysis as **structured plain text**, using specific headers (e.g., `== SUMMARY ==`, `== MET CRITERIA ==`) and bullet points. A dedicated Python function (`_parse_structured_text_response`) was implemented using string manipulation and regular expressions to manually parse this structured text, extracting the summary, eligibility status, and detailed criteria lists (Met, Unmet, Unclear, including reasoning). This manual text parsing proved significantly more robust for this task than relying on strict JSON parsing.
            *   The structured dictionary created by the manual parser provides the necessary data (including the extracted `unclear_criteria` list) for subsequent steps.
    *   Integrated the `action_suggester` into the `ClinicalTrialAgent`.
    *   After the LLM response is successfully parsed (using the manual text parser), the agent now calls the `get_action_suggestions_for_trial` function, passing the parsed `eligibility_assessment` details (specifically the `unclear_criteria` list) to generate potential follow-up actions.
    *   These `action_suggestions` (including category, draft text, and brief suggestion) are added to the trial data returned by the `/api/find-trials` endpoint (previously `/api/search-trials`).

3.  **Frontend - Action Display & Interaction (`src/components/research/ResultsDisplay.jsx`):**
    *   The button triggering follow-up actions (next to "Unclear Criteria") is now labeled "Plan Follow-ups".
    *   Clicking this button triggers the `handlePlanFollowups` function in `Research.jsx` (passing the `action_suggestions`).
    *   `handlePlanFollowups` makes a POST request to the (currently stubbed) `/api/plan-followups` backend endpoint.
    *   (Previous `ChecklistModal` implementation removed in favor of direct planning flow).
    *   The frontend `InterpretedTrialResult` component was updated to correctly display the detailed criteria breakdown based on the nested dictionary structure produced by the backend's manual text parser.

**Value Delivered:**

*   **Enhanced Actionability:** Transforms the passive list of unclear items into concrete, categorized suggestions for clinician follow-up.
*   **Reduced Cognitive Load:** The AI performs the initial step of identifying *what* needs to be done (check chart, ask patient, order lab) and drafts the corresponding action text.
*   **Workflow Bridge (MVP):** Provides immediate assistance (copying drafts) and lays the foundation for more integrated agentic workflows (task creation, order drafting) by providing the trigger points and drafted content.
*   **Improved Efficiency:** Saves clinicians time by automating the analysis of unclear criteria and the drafting of initial follow-up steps.

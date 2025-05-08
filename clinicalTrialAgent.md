# Clinical Trial Agent: Design and Value Proposition

**Date:** [Current Date/Time]

## 1. Overview & Purpose

The Clinical Trial Agent is a core component of the AI Cancer Care CoPilot platform, specifically designed to bridge the critical gap between ongoing clinical research (particularly clinical trials) and active patient care. Its primary purpose is to assist clinicians and researchers in efficiently identifying potentially relevant clinical trials for specific patients and understanding the nuances of eligibility in the context of the patient's unique medical record.

## 2. Problem Addressed

As detailed in `clinicalTrials.md`, manually matching complex patient histories against dense, technical clinical trial eligibility criteria is a major bottleneck in clinical practice. This process is:

*   **Time-Consuming:** Clinicians lack the bandwidth to perform exhaustive searches and comparisons for every patient.
*   **Error-Prone:** Manual review can easily miss subtle inclusion/exclusion details.
*   **Information Overload:** Trial protocols contain vast amounts of text beyond just eligibility (objectives, design, etc.) that are difficult to digest quickly.
*   **Action Delay:** Identifying a potential match often requires further manual steps to gather contact info and initiate outreach.

The Clinical Trial Agent aims to directly mitigate these challenges through intelligent automation and analysis.

## 3. Core Functionality & Workflow

The agent operates via the `/api/search-trials` backend endpoint and follows this workflow:

1.  **Input:** Receives a search query (from user input or generated from patient context) and an optional structured `patient_context` object containing detailed patient data (demographics, diagnosis, labs, meds, history, notes, etc.). **Crucially, this context is now enriched (via Task 5.1.0) to include a `"mutations"` key listing all known mutations for the patient from the merged cBioPortal data.**
2.  **Query Embedding:** The user's text query is converted into a numerical vector embedding using a sentence transformer model (`all-MiniLM-L6-v2`).
3.  **Semantic Candidate Retrieval:** The query embedding is used to search a local ChromaDB vector store. This store contains pre-computed embeddings of the *eligibility criteria text* for trials loaded from `documents.json`. The search returns the `source_url` (acting as trial ID) of the top N most semantically similar trials based on cosine similarity.
4.  **Detailed Data Fetching:** The agent retrieves the full structured details (metadata, parsed text sections like criteria, description, objectives) for the candidate trials from a local SQLite database (`trials.db`) using the retrieved `source_url` identifiers.
5.  **Parallel AI Assessment (if Patient Context Provided):**
    *   If `patient_context` is available, the agent initiates concurrent processing for all candidate trials using `asyncio.gather`.
    *   For each trial, a **single combined prompt** is formatted, including the full `patient_context` (as JSON, including the `mutations` list) and the trial's detailed inclusion/exclusion criteria.
    *   This prompt instructs the LLM (Google Gemini `gemini-1.5-flash`) to perform **two tasks**: 
        1.  A detailed eligibility assessment comparing the patient profile to *each* criterion.
        2.  Generation of a concise (2-3 sentence) **patient-specific narrative summary** explaining the key reasons for the overall eligibility finding.
    *   The LLM is instructed to return **both** outputs within a single, structured JSON object.
    *   The agent receives the LLM response, performs robust cleaning (including regex removal of invalid escape characters), and parses the JSON.
    *   The structured eligibility breakdown (`met_criteria`, `unmet_criteria`, `unclear_criteria`) and the `patient_specific_summary` are extracted.
6.  **Response Aggregation:** The agent combines the trial details fetched from SQLite with the results of the AI assessment (or indicates if skipped/failed) for each trial.
7.  **Output:** Returns a JSON response to the frontend containing the list of processed trials, including their metadata, structured eligibility assessment, and patient-specific narrative summary.

## 4. Current Capabilities

As implemented, the Clinical Trial Agent provides:

*   **Context-Aware Search:** Ability to search based on free-text query or automatically generate a query from the loaded patient's primary diagnosis.
*   **Semantic Matching:** Identifies trials with eligibility criteria semantically similar to the search query.
*   **Detailed AI Eligibility Breakdown:** When patient context is provided, delivers a structured analysis showing which criteria are met, unmet, or unclear, along with reasoning/evidence from the LLM. **With the inclusion of the `mutations` list, this assessment is more accurate for basic genomic criteria (e.g., presence/absence of mutation in a specific gene).**
*   **Patient-Specific Narrative Summary:** Generates a concise summary explaining the *outcome* of the eligibility check *for that specific patient*.
*   **Optimized LLM Interaction:** Utilizes a single, combined LLM call per trial and parallel processing (`asyncio.gather`) to improve response time.
*   **Robust Parsing:** Includes text cleaning steps to handle potential formatting inconsistencies in LLM responses.

## 5. Value Proposition

The Clinical Trial Agent delivers significant value across multiple dimensions:

**A. Patient Value:**

*   **Improved Potential Access:** Increases the likelihood of identifying relevant trials that might otherwise be overlooked, potentially opening doors to novel therapies.
*   **Personalized Information:** Moves beyond generic trial descriptions to provide an initial assessment specifically tailored to the patient's situation.
*   **Faster Consideration:** By speeding up the initial screening process for clinicians, it can reduce the time until relevant research options are discussed.

**B. Clinician/Doctor Value:**

*   **Reduced Review Burden:** Drastically cuts down the time spent manually sifting through complex eligibility criteria.
*   **Enhanced Decision Support:** Provides a structured, AI-driven first pass of eligibility, highlighting key alignment points and discrepancies to inform clinical judgment.
*   **Streamlined Workflow:** Integrates trial searching directly into the patient context view within the platform.
*   **Focus on Actionable Insights:** Delivers not just search results, but interpreted assessments (eligibility breakdown, patient-specific summary).

**C. Researcher Value:**

*   **Potential for Accelerated Recruitment:** By making it easier for clinicians to identify potentially eligible patients across their panels, the tool can serve as a foundation for streamlining the recruitment pipeline.
*   **Cohort Identification Aid:** Can assist researchers (with appropriate access/permissions) in identifying patient cohorts matching complex criteria within the platform's dataset.

**D. Business/Organizational Value:**

*   **Increased Efficiency:** Reduces clinician time spent on non-reimbursable research screening tasks.
*   **Supports Research Goals:** Provides infrastructure to facilitate clinical trial participation, potentially enhancing the organization's research profile.
*   **Innovation Showcase:** Demonstrates the application of advanced AI to solve real-world clinical workflow challenges.
*   **Foundation for Value-Based Care:** Contributes to providing comprehensive care options, including potentially life-saving trial participation.

## 6. Next Steps & Future Enhancements

Based on the roadmap (`cursorRules.md`), planned improvements include:

*   **Frontend Actionability (MVP):** Adding a "Create Follow-up Checklist" feature for unclear eligibility criteria.
*   **Agentic Workflow (Drafting):** Developing agents to draft lab orders, patient messages, or tasks based on unclear/unmet criteria (requiring clinician review).
*   **Implement "Draft Inquiry":** Creating an agent/endpoint to help draft messages to trial contacts.
*   **Accuracy & Refinement:** Continuously evaluating LLM performance and refining prompts.
*   **Data Source Expansion:** Moving beyond local JSON to integrate live APIs (e.g., NCI API, potentially others) and potentially structured EHR data via FHIR.
*   **Advanced Embedding/Chunking:** Exploring more sophisticated strategies for embedding eligibility criteria for potentially more precise matching.

## 7. Technical Stack (Key Components)

*   **Backend:** Python, FastAPI
*   **AI:** Google Gemini API (`gemini-1.5-flash`)
*   **Embedding:** `sentence-transformers` (`all-MiniLM-L6-v2`)
*   **Databases:** SQLite (structured data), ChromaDB (vector store)
*   **Concurrency:** `asyncio`
*   **Frontend:** React, TailwindCSS

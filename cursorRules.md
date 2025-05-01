instructions
During you interaction with the user, if you find anything reusable in this project (e.g. version of a library, model name), especially about a fix to a mistake you made or a correction you received, you should take note in the Lessons section in the .cursorrules file so you will not make the same mistake again.

You should also use the .cursorrules file as a scratchpad to organize your thoughts. Especially when you receive a new task, you should first review the content of the scratchpad, clear old different task if necessary, first explain the task, and plan the steps you need to take to complete the task. You can use todo markers to indicate the progress, e.g. [X] Task 1 [ ] Task 2

Also update the progress of the task in the Scratchpad when you finish a subtask. Especially when you finished a milestone, it will help to improve your depth of task accomplishment to use the scratchpad to reflect and plan. The goal is to help you maintain a big picture as well as the progress of the task. Always refer to the Scratchpad when you plan the next step.

Tools
Note all the tools are in python. So in the case you need to do batch processing, you can always consult the python files and write your own script.

Screenshot Verification
The screenshot verification workflow allows you to capture screenshots of web pages and verify their appearance using LLMs. The following tools are available:

Screenshot Capture:
venv/bin/python tools/screenshot_utils.py URL [--output OUTPUT] [--width WIDTH] [--height HEIGHT]
LLM Verification with Images:
venv/bin/python tools/llm_api.py --prompt "Your verification question" --provider {openai|anthropic} --image path/to/screenshot.png
Example workflow:

from screenshot_utils import take_screenshot_sync
from llm_api import query_llm

# Take a screenshot
screenshot_path = take_screenshot_sync('https://example.com', 'screenshot.png')

# Verify with LLM
response = query_llm(
    "What is the background color and title of this webpage?",
    provider="openai",  # or "anthropic"
    image_path=screenshot_path
)
print(response)
LLM
You always have an LLM at your side to help you with the task. For simple tasks, you could invoke the LLM by running the following command:

venv/bin/python ./tools/llm_api.py --prompt "What is the capital of France?" --provider "anthropic"
The LLM API supports multiple providers:

OpenAI (default, model: gpt-4o)
Azure OpenAI (model: configured via AZURE_OPENAI_MODEL_DEPLOYMENT in .env file, defaults to gpt-4o-ms)
DeepSeek (model: deepseek-chat)
Anthropic (model: claude-3-sonnet-20240229)
Gemini (model: gemini-pro)
Local LLM (model: Qwen/Qwen2.5-32B-Instruct-AWQ)
But usually it's a better idea to check the content of the file and use the APIs in the tools/llm_api.py file to invoke the LLM if needed.

Web browser
You could use the tools/web_scraper.py file to scrape the web.

venv/bin/python ./tools/web_scraper.py --max-concurrent 3 URL1 URL2 URL3
This will output the content of the web pages.

Search engine
You could use the tools/search_engine.py file to search the web.

venv/bin/python ./tools/search_engine.py "your search keywords"
This will output the search results in the following format:

URL: https://example.com
Title: This is the title of the search result
Snippet: This is a snippet of the search result
If needed, you can further use the web_scraper.py file to scrape the web page content.

Cursor learned
*   For search results, ensure proper handling of different character encodings (UTF-8) for international queries
*   Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
*   When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
*   Use 'gpt-4o' as the model name for OpenAI's GPT-4 with vision capabilities
*   When using f-strings with JSON templates, double the curly braces {{ and }} to escape them properly and avoid format specifier errors
*   When working with experimental models like gemini-2.0-flash-thinking-exp-01-21, always implement fallback mechanisms to standard models in case the experimental model is unavailable
*   For options data, use RapidAPI directly instead of the YahooFinanceConnector class to avoid compatibility issues with the OptionChainQuote initialization
*   When processing options data from RapidAPI, create a mapping of strikes to straddles for easier lookup and processing of call and put data
*   When implementing the display_analysis function in Streamlit, ensure it combines all necessary display components (market overview, ticker analysis, technical insights, learning points) to avoid NameError exceptions
*   Python 3.9 requires `typing.Union` and `typing.Tuple` for type hints instead of the `|` operator and `tuple[]` syntax (e.g., use `Tuple[bool, Union[str, None]]`).
*   When sending transactions with `web3.py`, the signed transaction object (`signed_tx`) returned by `w3.eth.account.sign_transaction` exposes the raw bytes via the `raw_transaction` attribute (e.g., `w3.eth.send_raw_transaction(signed_tx.raw_transaction)`).
*   **Agent Analysis Depth:** When designing multi-stage analysis agents (e.g., initial screen -> deep dive), ensure the later stages explicitly incorporate the reasoning/context from earlier stages into their prompts to perform validation/refinement, not just redundant analysis.
*   **Abstract Properties Implementation:** When inheriting from an Abstract Base Class (ABC) in Python that defines abstract properties, the subclass must implement these using the `@property` decorator. Simply setting instance attributes with the same name in `__init__` is insufficient and can lead to `TypeError` (can\'t instantiate abstract class) or `AttributeError` (can\'t set attribute if properties lack setters).
*   **Frontend API Calls (Dev):** When fetching from a frontend dev server (e.g., localhost:5173) to a backend API running on a different port (e.g., localhost:8000), use the absolute URL (`http://localhost:8000/api/...`) in the `fetch` call, not a relative path (`/api/...`), to avoid 404 errors.
*   **Strategic Action Generation:** For agents intended to suggest next steps based on analysis gaps, consider using a dedicated prompt/LLM call focused on generating actionable, strategic recommendations (e.g., specific tasks, queries) rather than just summarizing the identified gaps.
*   **EMR Integration Complexity (Genomics):** Integrating specialized data like structured genomics from real EMRs is highly complex, involving potential challenges in API availability, data standardization, parsing diverse formats (FHIR, HL7, VCF, PDF reports), and requires significant upstream data engineering distinct from agent logic.
*   **Realistic Mock Data:** When developing features dependent on complex data (like genomics), create mock data structures that accurately reflect the *type* and *format* of clinically relevant, processed information (e.g., summarized mutations, biomarkers), not just raw outputs, to enable realistic agent development.
*   **NLP for Criterion Detection:** Identifying specific types of criteria (e.g., genomic) within free-text eligibility rules requires robust NLP techniques beyond simple keyword matching, potentially involving regex, named entity recognition, or classifiers for reliable detection.
*   **Model Output Interpretation:** Integrating specialized AI models (like Evo 2) requires an interpretation layer to translate raw model outputs (scores, likelihoods) into clinically meaningful statuses (MET/NOT_MET/UNCLEAR) and evidence statements suitable for the application context.

Scratchpad
Current Task: Develop an AI Cancer Care CoPilot for Oncologists

Overview:
Create a smart, HIPAA-compliant AI application integrated with EHR/EMR systems, acting as a true CoPilot for oncologists. It will leverage an **AI agent-based architecture** using specialized models (Gemini, ChemGPT, etc.) to analyze patient records, **initiate role-specific workflows** (for clinicians, nurses, admin, etc.) via prompts or analysis results, and facilitate real-time collaboration. Clinician oversight and approval remain paramount for critical actions. Blockchain will be explored for tracking contributions, ensuring provenance, and incentivizing participation in improving AI models via federated learning, without storing PHI on-chain. The goal is to significantly reduce administrative burden and help overcome obstacles in cancer care through intelligent automation, analysis, and transparent collaboration, acting as a **Care Coordination Hub**.

High-Level Feature Plan:
Phase 1: Core Infrastructure & AI Foundation (MVP Focus - Mock Integration/Architecture Demo) - COMPLETE [Date]
  [X] Define HIPAA Compliance Strategy & Architecture (BAAs, data encryption, access controls, off-chain PHI, secure API design)
  [X] Design Secure EHR/EMR Integration Strategy & Mock Implementation (e.g., FHIR APIs demonstration)
  [X] Design Secure Data Ingestion & De-identification Pipeline Concept
  [X] Implement Basic Patient Record Viewer (with Mock Data)
  [X] Integrate Initial AI Model (e.g., Gemini via Vertex AI) for Record Summarization & Q&A (HIPAA-compliant setup, using mock/de-identified data)
  [X] Develop Initial Prompt Interface for AI Interaction (focus on analysis queries)
  [X] **Design Conceptual AI Agent Architecture** (Orchestrator, Specialized Agents like Scheduling, Notification, etc.)
  [X] **Design Action Triggering Mechanisms** & UI Placeholders (e.g., disabled "Schedule Follow-up" button)
  [X] Design Blockchain Architecture for Provenance/Incentives (Conceptual - metadata, hashes, off-chain links)

  **MVP Implementation Steps (Phase 1):** - COMPLETE
  [X] 1. Define Conceptual Architecture (Text/Diagram Below - Refined)
  [X] 2. Verify Frontend Project Structure (`src/components`, `src/pages`, `src/utils`)
  [X] 3. Implement `PatientRecordViewer.jsx` Component (Display Mock Data)
  [X] 4. Create Mock Data Backend Endpoint (e.g., Python/FastAPI serving JSON)
  [X] 5. Integrate AI Summarization:
      [X] a. Add `summarizePatientRecord` to `utils/geminiAI.js` (Frontend Util - Current Impl.)
      [X] b. Add UI element (button/input) to trigger summarization
      [X] c. Create Backend Endpoint to handle summarization request (calls placeholder AI func, returns summary)
      [X] d. Connect Frontend to Backend for summarization
  [X] 6. **Update Conceptual Architecture Diagram** to include Agent concept
  [X] 7. **Refine UI Design** to include placeholder action buttons/elements

  **Conceptual MVP Architecture (Updated Concept - Refined):**

  ```text
  +-----------------+     +---------------------+      +------------------------+
  |   React         |<--->|   Backend API       |<---->| Mock Patient Data      |
  |   Frontend      |     |   (Python/FastAPI)  |      | (JSON File / In-Memory)|
  | - PatientViewer |     |                     |      +------------------------+
  | - Prompt UI     |     |  + Orchestrator +   |
  | - Role-Hinted   |     |  | Logic to Route  |   |  (Identifies Needs & Routes
  |   Action Btns   |     |  | to Role/Agent   |   |   to appropriate Role's
   |   (Placeholders)|     |  +--------------+   |
                          |         v           |
                          | +-------+---------+ |
                          | | AI Analysis     | |  (e.g., Gemini via Vertex AI
                          | | (Summarize,     | |   or Backend Placeholder)
                          | |  Identify Needs)| | 
                          | +-------+---------+ |
                          |         |           |
                          |         v (Trigger Workflow Initiation)
                          | +-----------------+ |
                          | | Specialized     | |   (Workflow Initiators)
                          | | AI Agents       | |<-----> Secure APIs ----> External Systems
                          | | - Scheduling    | |       (Scheduling, EHR Actions,
                          | |   (Admin)       | |        Messaging, etc.)
                          | | - Notification  | |
                          | |   (Nurse/PCP)   | |
                          | | - Referral Draft| |
                          | |   (Admin)       | |
                          | | - Side Effect   | |
                          | |   (Pharmacist/Clinician)
                          | | - Clin. Trial   | |
                          | |   (Research)    | |
                          | | - ...           | |
                          | +-----------------+ |
                          +---------------------+
  ```

  **Description:** This architecture depicts the CoPilot functioning as a Care Coordination Hub. The Frontend interacts with a Backend API featuring an Orchestrator. The Orchestrator analyzes prompts or data changes, identifies clinical or administrative needs, and routes tasks to the appropriate **Specialized AI Agent**. These agents act as **workflow initiators**, targeting specific roles (Admin, Nurse, Clinician, Pharmacist, Research Coordinator) by drafting messages, scheduling requests, preparing referrals, or flagging relevant information (e.g., side effects, trial eligibility) for review and action, potentially interacting with external systems via secure APIs in future phases. Clinician review remains central before actions are finalized.

  **Refined Data Flow Example (Conceptual Future Action - MVP Illustrates Trigger):**
  1. User (e.g., Oncologist) prompts: "Summarize latest labs for Jane Doe and draft a notification to her PCP about the high glucose."
  2. Frontend sends prompt to Backend Orchestrator API (`/prompt` or similar).
  3. Orchestrator parses intent: Summarize labs + Draft notification. It identifies the target **role** for the notification (PCP).
  4. Orchestrator retrieves Patient Data (Mock/Real).
  5. Orchestrator calls `AI Analysis` (Gemini/etc.) to analyze labs & generate summary text based on prompt.
  6. Orchestrator identifies the need for notification based on analysis result or explicit prompt instruction, confirming the target role (PCP).
  7. Orchestrator triggers the appropriate agent, `NotificationAgent`, providing relevant context (patient, PCP info, message content from analysis/prompt) and indicating the target role (PCP).
  8. `NotificationAgent` (Future) drafts the notification, potentially tailoring it for a PCP.
  9. Backend API returns the Lab Summary AND the Draft Notification (clearly marked for PCP review) to the Frontend for **Clinician Review & Approval**.
  10. (Future: Upon approval, Frontend sends confirmation to Backend; Orchestrator confirms action with `NotificationAgent` which uses Secure API to send message to the designated PCP channel/system).
  11. (Future/Blockchain): Backend API logs the approved action (notification sent) or feedback on the blockchain (metadata/hash).

Phase 2: Advanced AI Capabilities, Agent Implementation & Workflow Integration
  Implement Core AI Agent Framework:
    [X] a. Research/Choose Agent Framework (Decision: LangChain Agents - though direct implementation so far)
    [X] b. Design Backend Orchestrator module/class (orchestrator.py)
    [X] c. Implement Basic Backend Orchestrator logic (Integrated into main.py, new /api/prompt endpoint, uses Gemini for intent parsing)
    [X] d. Define Agent interface/base class (agent_interface.py)
  Implement DataAnalysisAgent:
    [X] a. Create agents/data_analysis_agent.py module
    [X] b. Add Python logic to call Gemini API (Implemented for both 'summarize' and 'answer\question' tasks)
    [X] c. Securely handle API Key on backend (.env loading, error checks)
    [X] d. Replace placeholder function in `backend/main.py` with call to this agent (Done via Orchestrator routing)
  Implement NotificationAgent:
    [X] a. Create agents/notification_agent.py module
    [X] b. Add placeholder logic (Drafts simple message, simulates send via console log)
    [X] c. Register in orchestrator & update routing (Orchestrator now routes 'notify' intent here)
    [X] d. Replace placeholder function in `backend/main.py` with call to this agent (Done via Orchestrator routing)
    [X] Enhance NotificationAgent (use LLM for drafting).
  [X] Implement `SchedulingAgent` & Integrate with Mock/Test Scheduling API/Tool.
  [X] Implement `ReferralAgent` & Integrate with Mock/Test Referral System/Tool.
  [X] Implement `SideEffectAgent` (Mock data identification & management tips).
  [X] Implement `ClinicalTrialAgent` (Mock data search based on condition).
  [X] Implement WebSocket Communication (Backend Endpoint & Frontend Integration)
  [X] Research & Integrate/Fine-tune Specialized Cancer Analysis Models (Beyond Summarization)
  [X] Refine Prompt Interface for complex, multi-step agent tasks
  [X] Enhance UI/UX for agent interaction and task management (status, approvals)
  [X] Develop Smart Contracts for Contribution Tracking (Proof-of-Concept)
      * Initial POC completed: Feedback logging metadata via local Hardhat network.

Phase 3: Collaboration, Research Platform, Decentralization & Expanded Integrations
  [ ] Design Secure Real-time Collaboration Architecture
  [X] Implement Doctor-to-Doctor Consultation Features
      *   Goal: Build a graph-aware consultation system, not just chat.
      *   Design with **conceptual graph model** for lineage (Patient, Consult, Doctor, Message, Context, Agent Actions).
      *   Enable **contextual initiation** (link consult to specific data points). - **Done (AI Focus Statement)**
      *   Support **in-consult agent invocation** (e.g., `/summarize`, `/check-interactions`). - **Done (Agent Buttons & Suggested Questions)**
      *   Lay groundwork for future **GraphRAG** capabilities (complex queries over consultation history/patient graph).
      *   **Implement Explicit Lineage Tracking** (via `replyingToTimestamp`) - **Done!**
      *   (See `REALTIME_COLLABORATION.md` for detailed design).
  [ ] **(Next)** Develop Advanced Agents for Consultation (Beyond Simple Q&A):
      *   **Goal:** Move beyond single-turn Q&A to agents that can perform multi-step tasks or analysis triggered within the consultation, providing richer insights for collaborators.
      *   **Brainstorming Ideas (Dr. B Example Continued - Hyperglycemia):**
          *   **`GlucoseDeepDiveAgent`**: 
              *   Trigger: User asks "Investigate glucose trend further" or clicks a related button.
              *   Steps: 
                  1.  Fetch extended glucose history (simulated).
                  2.  Fetch relevant medication history (start dates, dose changes for Metformin, Letrozole).
                  3.  Fetch recent notes mentioning glucose/diabetes management.
                  4.  Synthesize findings: "Glucose trend shows X. Note that Letrozole started on [Date], glucose increased slightly afterwards. Recent PCP note mentions Y about diet."
                  5.  Present synthesized findings & potentially suggest specific follow-up questions for the other doctor.
          *   **`ComparativeTherapyAgent`**: 
              *   Trigger: User asks "Are there alternative cancer treatments with less glucose impact?"
              *   Steps:
                  1.  Identify current relevant treatment (Letrozole).
                  2.  Query knowledge base (simulated/LLM) for alternatives for Stage III IDC.
                  3.  Filter/Rank alternatives based on known metabolic side effect profiles.
                  4.  Present findings: "Alternative considerations include [Drug A] (similar profile), [Drug B] (potentially lower risk but different MOA/efficacy concerns). Discuss risks/benefits with Oncology."
          *   **`PatientEducationDraftAgent`**: 
              *   Trigger: User asks "Draft patient message explaining glucose monitoring importance."
              *   Steps:
                  1.  Use LLM to draft a patient-friendly explanation based on the current context (mild elevation, T2DM, cancer treatment).
                  2.  Present draft in chat for clinician review/editing before sending.
      *   **Technical Considerations:**
          *   May require more state management than simple Q&A.
          *   Could potentially leverage agent frameworks like LangChain or Autogen for multi-step logic if needed, or implement directly in Python.
          *   Needs clear UI triggers (buttons or specific commands like `/deepdive-glucose`).
  [ ] Develop Secure, Anonymized/Aggregated Data Sharing for Research (leveraging FL principles)
  [ ] **Integrate with Production APIs** (Scheduling, Messaging, EHR Orders, etc. - Requires Partnerships/Access)
  [ ] Build Research Collaboration Workspace/Tools
  [ ] Implement Federated Learning Infrastructure (Coordination Layer)
  [ ] Integrate Blockchain for Auditing FL Rounds & Rewarding Contributors (Pilot)
  [ ] Develop Decentralized Governance Model Concept (e.g., DAO principles)

**Current Focus: Advanced Consultation Agents (Phase 3 Enhancement)** - COMPLETE
Implement `ComparativeTherapyAgent` and `PatientEducationDraftAgent` integrated into the real-time consultation feature.

*   **ComparativeTherapyAgent - Backend:** [X]
*   **PatientEducationDraftAgent - Backend:** [X]
*   **Frontend Integration:** [X]
*   **Testing & Refinement:** [X]

--- 

**Next Major Feature: AI Research Portal for Cancer Cure Discovery**

**Vision:**
Develop a dedicated portal within the application to empower cancer researchers AND clinicians by leveraging specialized LLM agents. The goal is to significantly accelerate the research lifecycle AND bridge the gap between complex research findings (especially clinical trials) and actionable clinical insights. Focus on augmenting human capabilities by providing AI-driven interpretation, summarization, and action facilitation.

**Approach Note:** Use a **Hybrid Data Acquisition Strategy**. 
1.  **(DONE - Local Load)** NCI API: Use the official API (`https://clinicaltrialsapi.cancer.gov/v1/...`) primarily for *discovering trial IDs* based on search criteria and fetching reliable *structured metadata* (status, phase, title, identifiers). Requires understanding API authentication and query parameters via documentation. - Switched to local JSON + SQLite/ChromaDB for MVP.
2.  **(DONE - Local Load)** Web Page Scraping/Extraction: Use `firecrawl` (or local parsing) with a defined schema to extract the *detailed text sections* (eligibility, description, objectives, contacts) directly from NCI web pages. - Used regex parsing on local markdown.
3.  **(DONE - Local Load)** Combined Storage: Merge metadata and extracted text into a **Metadata + Vector Store** (SQLite + ChromaDB for MVP) for efficient agent retrieval.

**Concrete Problem Focus:** Address the information overload presented by complex clinical trial descriptions (eligibility criteria, objectives, etc.). The AI CoPilot should act as an intelligent filter and interpretation layer, making this information actionable for clinicians in the context of specific patients.

**MVP Strategy:** Focus on the core pipeline: Load Data -> Store Metadata/Text -> Chunk/Embed Eligibility -> Store Vectors -> Agent Retrieval (using Vector Search for eligibility) -> Display.

**Roadmap (Local Data, MVP Focus):**

*   **Phase 1: Data Foundation & Preparation (Local Data Focus)**
    *   [X] **1.1 Load Local Trial Data:** Parse `documents.json`.
    *   [X] **1.2 Define Extraction Logic:** Use regex to extract metadata and text sections (title, status, phase, eligibility, etc.) from markdown.
    *   [X] **1.3 Design Database Schemas (Local SQLite/ChromaDB):**
        *   SQLite `clinical_trials` table: `nct_id`, `title`, `status`, `phase`, `inclusion_criteria_text`, `exclusion_criteria_text`, etc.
        *   ChromaDB collection `clinical_trials_eligibility`: `source_url` (ID), `eligibility_vector`.
    *   [X] **1.4 Choose DB & Embedding Model:** SQLite, ChromaDB. `all-MiniLM-L6-v2`.
    *   [X] **1.5 Basic Frontend Shell:** `Research.jsx`, `ResultsDisplay.jsx`.

*   **Phase 2: Pre-processing Pipeline & Local DB Loading**
    *   **[X] 2.1 Build Pre-processing Pipeline Script (`load_trials_local.py`):**
        *   Input: `documents.json`.
        *   Parse markdown using regex.
        *   Connect to SQLite & ChromaDB.
        *   `CREATE TABLE IF NOT EXISTS` / `CREATE COLLECTION`.
        *   `INSERT/UPDATE` structured data into SQLite.
        *   Chunk eligibility text (Currently embedding whole text for MVP).
        *   Generate embedding for eligibility text.
        *   `UPSERT` vector into ChromaDB collection.
    *   [X] **2.2 Run Script & Verify Data:** Executed script, verified data in SQLite and embeddings in ChromaDB.

*   **Phase 3: Agent Integration & Basic Search**
    *   [X] **3.1 Adapt Backend Agents (`ClinicalTrialAgent`):**
        *   Initialize SQLite/ChromaDB connections.
        *   Embed user query.
        *   Query ChromaDB for top N trial IDs based on eligibility vector similarity.
        *   Fetch full details for top N trials from SQLite.
    *   [X] **3.2 Test End-to-End:** Tested search via frontend, fixed display issues.

*   **Phase 4: Detailed AI Eligibility Assessment (Current Focus)** - Mostly Complete
    *   [X] **4.1 Define Structured Patient Profile Schema:** (Conceptual definition: Diagnosis, Stage, ECOG, Labs, Biomarkers, Comorbidities, Prior Tx).
    *   [X] **4.2 Implement Patient Data Acquisition:** (Current: Assume passed in `context`).
    *   [X] **4.3 Integrate LLM Client:** Initialize `google.generativeai` in `ClinicalTrialAgent`.
    *   [X] **4.4 Design Eligibility Assessment Prompt:** 
        *   Initial prompts requested JSON, but proved unreliable due to LLM errors (invalid escapes).
        *   **Final approach:** Prompt instructs LLM to generate **structured plain text** using headers (`== SUMMARY ==`, etc.) and bullet points.
    *   [X] **4.5 Modify `ClinicalTrialAgent.run`:**
        *   [X] Retrieve patient profile from `context`.
        *   [X] For each top trial from SQLite:
            *   [X] Get full inclusion/exclusion text.
            *   [X] Format structured text prompt.
            *   [X] Call LLM API (`self.llm_client.generate_content`) expecting plain text.
            *   [X] **Parse LLM response:** Implement manual text parser (`_parse_structured_text_response`) using string splitting and regex to handle the structured text format robustly. Build nested dictionary result.
            *   [X] Add parsed assessment to trial results dictionary.
            *   [X] Handle LLM/parsing errors gracefully.
            *   [X] Call Action Suggester using parsed data.
    *   [X] **4.6 Update API Endpoint:** `/api/find-trials` handles patient context input & returns enriched trial data.
    *   [X] **4.7 Enhance Frontend (`ResultsDisplay.jsx`):** Display detailed LLM assessment (from text parser output), ensuring correct handling of nested structure.
    *   **[ ] (NEW TASK) 4.8 Codebase Understanding & Catch-up:** Review the current implementation and interaction between key components (Frontend: Research.jsx, ResultsDisplay.jsx, KanbanBoard.jsx, TaskCard.jsx, PatientTrialMatchView.jsx; Backend: main.py, ClinicalTrialAgent, ActionSuggester, plan_followups_logic) to ensure a comprehensive understanding of the existing Research Portal workflow (Search -> Display -> Plan Followups -> Kanban -> 360 View). Await user-provided code/context for deeper analysis.

*   **Phase 5: True Deep Analysis & Agentic Resolution (Current Focus)**
    *   [ ] **5.1 Refactor Deep Dive Agent (`EligibilityDeepDiveAgent`) for True Depth & Internal Resolution:**
        *   [X] **5.1.1 Incorporate Initial Reasoning:** Modify `_analyze_single_criterion_async` prompt to include `original_reasoning` from the first analysis pass and instruct the LLM to validate/refute/clarify based on it and the provided patient data snippet. **(DONE - Ready for Test)**
        *   [ ] **5.1.2 Implement Internal Data Search Logic:** Add logic within the agent's `run` method (after initial LLM analysis loop) to perform targeted searches within the provided `patient_data` (especially `notes`) for keywords related to common gaps (e.g., ECOG, specific labs) before generating external suggestions. **(NEXT STEP)**
        *   [ ] **5.1.3 Enhance Strategic Next Steps Generation:** Modify the prompt for the 'next steps' LLM call to *only* operate on gaps remaining *after* internal search attempts. Include the outcome of internal searches in the prompt context. Ensure output format supports future action integration.
        *   [ ] **5.1.4 Refine Agent Report Structure:** Update the structure returned by the agent's `run` method to clearly separate: validated/refuted criteria, internal search findings, remaining gaps, and strategic next steps.
        *   [ ] **5.1.5 Integrate Foundational Genomic Model (e.g., Evo 2) for Genomic Criteria Analysis:**
            *   **Implementation Plan (Phased & Realistic):**
                *   [ ] **1. Define Mock Genomic Data Structure:** Add representative `genomics` section (mutations, biomarkers based on clinical reports) to `mock_patient_data_dict` in `main.py`.
                *   [ ] **2. Create `GenomicAnalystAgent` (Placeholder):** 
                    *   Create `backend/agents/genomic_analyst_agent.py`.
                    *   Define class (`AgentInterface`), properties (`name`, `description`).
                    *   Add `__init__` (placeholder for API client).
                    *   Define `async run(self, genomic_query: Dict, patient_genomic_data: Dict) -> Dict:`.
                    *   Implement `run` to log inputs and return a *hardcoded mock analysis* (e.g., `{'predicted_status': 'UNCLEAR', 'evidence': 'Mock genomic analysis placeholder.', 'confidence': 0.5}`).
                *   [ ] **3. Implement Genomic Criterion Detection (`EligibilityDeepDiveAgent`):** In `_analyze_single_criterion_async`, implement keyword/regex logic to identify genomic criteria (set `is_genomic_criterion` flag).
                *   [ ] **4. Implement Basic Delegation Logic (`EligibilityDeepDiveAgent`):** In `_analyze_single_criterion_async`, if `is_genomic_criterion`: check if `patient_data['genomics']` exists; if yes, instantiate `GenomicAnalystAgent`, call its `run` (with mock data), use mock result, and skip standard LLM call; if no, mark UNCLEAR due to missing patient genomic data.
                *   [ ] **5. Initial Testing & Report Structure Refinement:** Test flow, verify delegation to mock agent works, ensure mock results integrate clearly into the deep dive report structure.
                *   [ ] **6. Integrate Evo 2 API (NVIDIA NIM/BioNeMo):** In `GenomicAnalystAgent`, implement API client init and modify `run` to make actual API calls, format inputs, handle API errors.
                *   [ ] **7. Implement Interpretation Layer (`GenomicAnalystAgent`):** In `GenomicAnalystAgent.run`, add logic *after* API call to translate raw Evo 2 output (scores, etc.) into the application's required structured format (status, evidence, confidence).
                *   [ ] **8. (Task 5.2) Enhance Frontend Display:** Update UI to show Evo 2 derived insights distinctly.
    *   [ ] **5.2 Enhance Frontend Display:** Modify `ResultsDisplay.jsx` to clearly present the richer information from the updated deep dive report (validation status, internal search findings, genomic analysis results, refined actions).
    *   [ ] **5.3 Integrate Actions with Workflow (Future):**
        *   [ ] Convert structured `strategic_next_steps` into actionable items (e.g., create tasks in Kanban board automatically or via user confirmation).
        *   [ ] Explore triggering other agents based on specific `action_type` outputs.

*   **Phase 6+: Enhancements (Post-MVP)**
    *   [ ] Refine eligibility chunking/embedding strategy.
    *   [ ] Implement other agents (`LiteratureReview`).
    *   [ ] Add User Roles, Saved Findings.
    *   [ ] **Trial Matching Enhancements (Inspired by TrialGPT):**
        *   [ ] **Integrate Live NCI API:** Prioritize using the NCI Clinical Trials Search API for real-time trial data retrieval (search and details) instead of solely relying on the local snapshot.
        *   [ ] **Enhance Retrieval:** Implement LLM-based keyword generation from patient context and explore hybrid search (e.g., BM25 + Vector Search) for improved initial trial filtering.
        *   [ ] **Refine Matching Granularity:** Evaluate making the initial eligibility assessment more systematically criterion-by-criterion (similar to TrialGPT-Matching) potentially parallelized.
        *   [ ] **Implement Explicit Ranking:** Add a dedicated scoring mechanism (rule-based or LLM-based aggregation) to rank trials based on the final eligibility assessment (TrialGPT-Ranking concept).
        *   [ ] **Benchmarking:** Plan for future evaluation using public datasets (e.g., SIGIR, TREC CT) to benchmark matching performance.
    *   [ ] **Integrate Open Cancer Databases (e.g., TCIA, GDC, CPTAC):**
        *   [ ] **`ImagingReferenceAgent`:** Allow users to query TCIA API for *reference* images (de-identified) based on disease, modality, features, etc., for comparison/education.
        *   [ ] **`ResearchContextAgent`:** Link patient context (diagnosis, biomarkers) to relevant TCIA/GDC/CPTAC cohorts, summarizing available associated data (clinical, omics) for population context.
        *   [ ] **`MultiOmicsComparisonAgent`:** Query GDC/CPTAC (or pre-processed data) based on patient's specific genomic/proteomic alterations to find prevalence, associations, pathways.
        *   [ ] **Foundation for Multimodal:** Leverage TCIA datasets (images + linked data) for future training/validation of potential multimodal `ImagingAnalysisAgent` capabilities.
        *   [ ] **`ImagingReferenceAgent`:** Allow users to query TCIA API for *reference* images (de-identified) based on disease, modality, features, etc., for comparison/education.
        *   [ ] **`ResearchContextAgent`:** Link patient context (diagnosis, biomarkers) to relevant TCIA/GDC/CPTAC cohorts, summarizing available associated data (clinical, omics) for population context.
        *   [ ] **`MultiOmicsComparisonAgent`:** Query GDC/CPTAC (or pre-processed data) based on patient's specific genomic/proteomic alterations to find prevalence, associations, pathways.
        *   [ ] **Foundation for Multimodal:** Leverage TCIA datasets (images + linked data) for future training/validation of potential multimodal `ImagingAnalysisAgent` capabilities.
        *   [ ] **`ImagingReferenceAgent`:** Allow users to query TCIA API for *reference* images (de-identified) based on disease, modality, features, etc., for comparison/education.
        *   [ ] **`ResearchContextAgent`:** Link patient context (diagnosis, biomarkers) to relevant TCIA/GDC/CPTAC cohorts, summarizing available associated data (clinical, omics) for population context.
        *   [ ] **`MultiOmicsComparisonAgent`:** Query GDC/CPTAC (or pre-processed data) based on patient's specific genomic/proteomic alterations to find prevalence, associations, pathways.
        *   [ ] **Foundation for Multimodal:** Leverage TCIA datasets (images + linked data) for future training/validation of potential multimodal `ImagingAnalysisAgent` capabilities.
    *   [ ] ... (Knowledge Expansion, Collaboration).

**Key Challenges & Considerations:** (Maintain restored list)
*   **Data Privacy & Security:** Essential for any data, especially potentially sensitive research summaries. Compliance needs constant focus.
*   **LLM Accuracy & Validation:** Scientific accuracy is paramount. Need RAG, validation, human oversight, clear confidence scoring.
*   **Domain Specificity:** Requires LLMs deeply trained/fine-tuned on biomedical corpora.
*   **Data Integration:** Harmonizing diverse scientific databases is complex.
*   **Ethical Use:** Transparency, bias mitigation, responsible AI principles.
*   **Scalability & Cost:** Infrastructure for data storage and LLM usage.
*   **Intellectual Property:** Considerations if researchers use it for novel discoveries.
*   **User Experience:** Designing an intuitive interface for complex scientific tasks.

Technology Stack Considerations:
*   Frontend: React, TailwindCSS
*   Backend: Python (Flask/FastAPI for AI/Data), Node.js (optional for real-time/API layers)
*   AI/LLMs: Google Gemini (via Vertex AI for HIPAA), explore ChemGPT access, Hugging Face models (fine-tuned & securely hosted). Frameworks: LangChain (Agents), LlamaIndex, **Microsoft Autogen (Consider for Agent Orchestration)**.
*   Data: Secure PostgreSQL (HIPAA-compliant DB for off-chain PHI), Vector DB.
*   Integration: HL7 FHIR, Mirth Connect (or similar), Cloud Healthcare API (GCP/AWS/Azure).
*   Real-time: WebSockets, Kafka/PubSub.
*   Blockchain: Private/Consortium Chain (e.g., Hyperledger Fabric, Enterprise Ethereum), Smart Contracts (Solidity/Vyper if applicable). Focus on off-chain data storage.
*   Compliance: Cloud provider HIPAA services, robust auditing (on & off-chain).

Key Challenges:
*   Strict HIPAA Compliance (Technical & Legal, esp. with Blockchain integration).
*   EHR/EMR Integration (Complexity, Vendor Lock-in, Data Standards).
*   Acquiring/Creating Specialized, Validated AI Models.
*   Ensuring AI Reliability & Explainability.
*   Secure & Ethical Data Sharing (FL & Blockchain governance).
*   Designing a truly seamless, prompt-driven workflow.
*   Blockchain Scalability, Cost, and Complexity integration.
*   Legal framework for tokenization/incentives in healthcare.
*   **Agent Reliability & Safety:** Ensuring agents perform tasks correctly and safely.
*   **Complex Workflow Orchestration:** Managing multi-step tasks across different agents and APIs.
*   **Securing API Integrations:** Accessing and securing connections to diverse external systems (scheduling, messaging, etc.).
*   **Human-in-the-Loop Design:** Creating effective and non-intrusive clinician review/approval steps.

Lessons & Design Principles:
*   **Verify File Existence:** Verify the existence of relevant files/hooks (e.g., `useWebSocket.js`) across the project structure before concluding they are missing, even if not immediately visible in the primary component being edited.
*   **API-First Development:** For features relying on external data (like the Research Portal), explore and analyze target APIs (PubMed, ClinicalTrials.gov, etc.) *before* designing agent logic or UI components. Understand payloads, query capabilities, and limitations first to inform realistic design.
*   Use Gemini via Vertex AI for foundational HIPAA-compliant LLM tasks.
*   Employ a multi-model AI strategy (General + Specialized).
*   Prioritize HIPAA compliance in all architectural decisions.
*   Blockchain Role: Use for metadata, provenance, contribution tracking, and incentive layer for Federated Learning. **DO NOT store PHI on-chain.** Sensitive data remains secured off-chain in compliant databases. Focus on private/consortium chains.
*   MVP Focus: Mock integration points for complex systems (EHR, Blockchain) while building core AI features and UI. Demonstrate the architecture.
*   MVP Scope Clarification: Focus on demonstrating Phase 1 concepts (secure integration, data pipelines) using mock data/architecture illustrations within the app. Defer real-world integration complexities.
*   LLM Strategy: Multi-model approach is necessary.
    *   Foundational (HIPAA-Compliant): Gemini (via Vertex AI) or GPT-4 (via Azure OpenAI) for summarization, Q&A, drafting.
    *   Biomedical Specialization: Consider PubMedBERT/BioBERT/ClinicalBERT (for extraction/understanding), GatorTron (clinical NLP), or future fine-tuned models on oncology data.
    *   Chemical/Drug Focus: Explore ChemGPT/MolBERT for drug interactions/properties.
    *   Potential Workflow: Specialized models for structuring -> Generative models for Q&A/summaries -> Specific models for analysis (trials, drugs).
*   LLM Key Considerations:
    *   HIPAA: Use compliant platforms (Vertex AI, Azure OpenAI) or secure self-hosting.
    *   Data Privacy: Robust de-identification required for training/analysis outside BAAs.
    *   Validation: Clinician review/override essential for AI outputs (CoPilot model).
    *   Explainability: Important for clinical trust.
    *   Cost & Latency: Factor into architecture.
*   **Agent-Based Architecture:** Design around an orchestrator and specialized agents for task automation.
*   **Clinician Oversight:** Mandate human review and approval for critical actions initiated by AI agents.
*   **Gradual Integration:** Implement agents and external API connections iteratively with thorough testing and security reviews.
*   **API-First / Scrape & Pre-process:** For external data, prefer APIs. If scraping is needed, or for complex API data (like trials), pre-process into efficient stores (Metadata DB + Vector DB) to optimize agent retrieval and analysis.
*   **Analyze API Response First:** Before designing database schemas or loading scripts for API data, always fetch and analyze a sample response to understand the *exact* structure, field names, and data types provided by the API.

// --- Future Phases / Specialization (Beyond Initial Roadmap) --- 

Overview: Leverage the AI-native, agent-based architecture to reimagine traditional EHR module functions, focusing on automation, proactive insights, and seamless cross-functional workflows.

Potential Specialization Areas:

1.  **Deepen Core Oncology Intelligence (Beacon++):**
    *   [ ] `GenomicAnalysisAgent`: Integrate genomic data, interpret reports, identify targetable mutations, match trials.
    *   [ ] `PredictiveOncologyAgent`: Predict treatment response/toxicity, disease progression using integrated data.
    *   [ ] Enhance `ClinicalTrialAgent`: Automated pre-screening, summary generation, enrollment assistance.

2.  **AI-Enhanced Ancillary Integration (Radiant++, Beaker++, Willow++):**
    *   [ ] `RadiologyInsightAgent`: Longitudinal image/report analysis, subtle change detection, quantitative tracking, draft reporting sections (requires multimodal models).
    *   [ ] `LabIntelligenceAgent`: Automated longitudinal trend analysis, correlation with treatments, predictive alerts (e.g., neutropenia), draft interpretations.
    *   [ ] `PharmacyInteractionAgent`: Advanced interaction checks (drug-drug/gene/food), dosage suggestions (renal/hepatic function), draft prior auth requests.

3.  **Intelligent Cross-Specialty Coordination (Ambulatory++, OpTime++, Phoenix++):**
    *   [ ] Enhance `ReferralAgent`: Intelligent data summarization tailored to receiving specialty, potential scheduling integration.
    *   [ ] `PerioperativeCoPilotAgent`: Optimize surgical scheduling, pre-op checks, intra-op tracking (if possible), generate integrated discharge summaries.
    *   [ ] `TransplantCoordinationAgent`: (For Heme Malignancies, etc.) Track evaluation, manage waitlists, alert for matches, coordinate team communication.

4.  **Next-Generation Patient Engagement (MyChart++):**
    *   [ ] `ProactiveMonitoringAgent`: Analyze PGHD (wearables, symptoms) for early detection of issues, generate alerts for care team.
    *   [ ] `PersonalizedEducationAgent`: Deliver tailored educational content, answer patient questions within safe boundaries.

5.  **AI-Driven Population Health (Healthy Planet++):**
    *   [ ] `AutomatedCareGapAgent`: Identify patients needing screenings/follow-ups, trigger notification/scheduling workflows.

Development Strategy for Specialization:
*   **Foundation First:** Ensure core agent framework (Phase 2) is robust & extensible.
*   **Prioritize:** Select areas based on clinical impact, AI feasibility, and data/API availability.
*   **Iterate:** Implement specialized agents and capabilities incrementally.
*   **Integrate:** Focus on leveraging data and insights across agents via the orchestrator.
*   **Specialized Models:** Continuously evaluate and integrate validated, domain-specific AI models (NLP, imaging, genomics, etc.).
*   **Integrate Foundational Genomic Models (e.g., Evo 2):**
    *   [ ] **Prerequisite:** Ensure patient genomic data (VCFs, mutations lists) can be securely accessed/ingested.
    *   [ ] **`GenomicAnalystAgent` (Initial):** Implement agent using Evo 2 (via NVIDIA BioNeMo/NIM API) to analyze mutations, predict functional impact, and distinguish potential driver mutations.
    *   [ ] **`TreatmentPredictionAgent` (Advanced):** Develop agent to infer potential treatment sensitivity/resistance by combining `GenomicAnalystAgent` output with drug target information. Explore feasibility of fine-tuning.
    *   [ ] **`DrugDiscoveryAgent` (Research Focus):** Explore using Evo 2's generative capabilities for target ID or therapeutic sequence design within a research context.

// ... (Technology Stack Considerations - Maybe update later as needed)
// ... (Key Challenges - Maybe update later as needed)
// ... (Lessons & Design Principles) ...

# Next Steps for Evo 2 Integration

1.  **Mock Genomic Data:**
    *   Define a clear Python data structure (e.g., Pydantic model) representing patient genomic variants (gene, type, HGVS notation, coordinates if available).
    *   Create realistic mock patient genomic data matching this structure to be included in the `patient_data` context object for testing.

2.  **Evo 2 API & Reference Setup:**
    *   Secure access credentials for the Evo 2 API (e.g., NVIDIA NIM/BioNeMo).
    *   Establish a reliable method to access the human reference genome sequence (e.g., GRCh38), potentially using a local copy or a library like `pyfaidx`.

3.  **Implement `GenomicAnalystAgent` Core:**
    *   Create the agent file: `backend/agents/genomic_analyst_agent.py`.
    *   Implement core VEP logic within the agent:
        *   Function to fetch reference sequence context around a variant.
        *   Function to construct reference and variant sequences for API input.
        *   Function to call the Evo 2 API and retrieve likelihood scores.
        *   Function to calculate the delta likelihood score.

4.  **Interpretation & Validation:**
    *   Research and define initial thresholds/rules for mapping delta likelihood scores to predicted functional impact (e.g., `PATHOGENIC_EFFECT`, `BENIGN/UNCLEAR_EFFECT`).
    *   *Optional but Recommended:* Plan for validation against known databases (e.g., ClinVar) or expert review later.

5.  **Agent Interface & Integration:**
    *   Define the precise input and output structure for `GenomicAnalystAgent` (using Pydantic models).
    *   Modify `EligibilityDeepDiveAgent` (or potentially `ClinicalTrialAgent` if the deep dive isn't separate yet):
        *   Add logic to identify genomic criteria requiring VEP.
        *   Add logic to extract necessary variant details from `patient_data`.
        *   Implement the call to `GenomicAnalystAgent` with the required inputs.
        *   Integrate the `GenomicAnalystAgent`'s structured output into the eligibility assessment results for the relevant criteria.

6.  **Testing & Refinement:**
    *   Develop test cases using the mock genomic data and sample trial criteria.
    *   Test the end-to-end flow: Trial Search -> Eligibility Analysis -> Genomic Criterion Detection -> `GenomicAnalystAgent` Call -> VEP Result Integration.
    *   Refine interpretation logic based on test results.

7.  **UI/Explainability (Placeholder):**
    *   Consider how the VEP results (prediction, score, evidence) will eventually be displayed to the user in the frontend. This doesn't need full implementation now but should be kept in mind.
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
*   **API Client Troubleshooting:** When API client libraries (e.g., `bravado`, `cbio-py`) fail unexpectedly (import errors, `None` results despite successful spec fetch), verify the correct target endpoint path (`/api/.../mutations` vs `/api/.../mutations/fetch`), the required HTTP method (GET vs. POST), and expected payload format (query params vs. JSON body) using simpler tools (`requests`, `curl`) before extensive library debugging. Document the final working approach.
*   **Python Package Imports:** Verify Python package installation (`pip list | grep <package>`) and ensure the correct module name is used for imports, as it may differ from the installable package name (e.g., `pip install cbio-py` requires `from cbioportalapi import ...`).
*   **Data Processing Script Robustness:** For scripts processing external files (like TSV/CSV):
    *   Use `os.path.join`, `os.path.dirname(os.path.abspath(__file__))` for reliable path handling relative to the script's location.
    *   Explicitly check for input file existence (`os.path.exists`).
    *   Validate expected column headers against actual file headers early and provide informative error messages.
    *   Handle potential data type issues during conversion (e.g., pandas `NaN` must become `None` before `json.dump`).
*   **File Path Management:** When scripts or data files are moved, meticulously update all relative path references within the scripts. Use `os.path` tools for robustness. Use `list_dir` to confirm file locations if unsure.
*   **Integrating Specialized AI Models (e.g., Evo 2 for VEP):**
    *   Clearly define the new agent's purpose and how it addresses specific limitations of existing agents (e.g., moving from mutation presence check to functional impact prediction).
    *   Specify input requirements (e.g., structured variant data, reference genome access, API keys).
    *   Define the expected output format (e.g., predicted status, score, evidence).
    *   Outline the interpretation logic needed (e.g., raw score thresholds -> clinical significance).
    *   Plan the integration mechanism (e.g., how an existing agent like `EligibilityDeepDiveAgent` detects the need and delegates to the specialized agent).
*   **Data Value vs. Interpretation:** Distinguish between having raw data (e.g., a list of mutations from `merged_mutation_clinical.json`) and having interpreted insights (e.g., the functional impact of those mutations via Evo 2). Plan how agents will use *both* levels of information appropriately.
*   **Agent Design - Snippet vs. Full Data:** When an agent uses a data snippet for an initial LLM pass (for efficiency) and then uses full data for internal programmatic searches, ensure the snippet includes fields crucial for common high-level checks (e.g., `allergies`, `demographics.dob`) to avoid unnecessary `UNCLEAR` statuses from the LLM pass that then require internal search or next steps to resolve.
*   **Search Target Order & Specificity:** When an agent uses a list of search targets and breaks after the first match, ensure that more specific `criterion_patterns` (e.g., for "weight loss") are ordered before potentially broader or conflicting patterns (e.g., in general lab targets) to ensure correct target matching for a given criterion. If mysterious mismatches occur, log the exact criterion text and the target ID it matched to for debugging.
*   **LLM Output Parsing (JSON):** When expecting JSON from an LLM, especially within markdown blocks:
    *   Strip whitespace from the raw LLM response and the extracted JSON string.
    *   Prioritize extracting content from ` ```json ... ``` ` blocks.
    *   Use robust slicing (if start/end markers are clear) or a DOTALL regex for extraction.
    *   Have fallbacks if markdown is missing (e.g., try parsing the whole string).
    *   Log the exact string being passed to `json.loads()` for debugging persistent parsing errors.
    *   Ensure the final parsed object matches the expected type (e.g., a list of objects).

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

*   **Phase 1: Data Foundation & Preparation (Local Data Focus)** - COMPLETE
    *   [X] 1.1 Load Local Trial Data: Parse `documents.json`.
    *   [X] 1.2 Define Extraction Logic: Use regex to extract metadata and text sections from markdown.
    *   [X] 1.3 Design Database Schemas (Local SQLite/ChromaDB).
    *   [X] 1.4 Choose DB & Embedding Model: SQLite, ChromaDB. `all-MiniLM-L6-v2`.
    *   [X] 1.5 Basic Frontend Shell.

*   **Phase 2: Pre-processing Pipeline & Local DB Loading** - COMPLETE
    *   [X] 2.1 Build Pre-processing Pipeline Script (`load_trials_local.py`).
    *   [X] 2.2 Run Script & Verify Data.

*   **Phase 3: Agent Integration & Basic Search** - COMPLETE
    *   [X] 3.1 Adapt Backend Agents (`ClinicalTrialAgent`).
    *   [X] 3.2 Test End-to-End.

*   **Phase 3.5: Foundational Patient Data Integration** - COMPLETE
    *   [X] 3.5.1 Fetch & Store BRCA Mutations (cBioPortal API -> `brca_tcga_mutations.json`)
    *   [X] 3.5.2 Process & Store Clinical Data (TSV -> `brca_tcga_clinical_data.json`)
    *   [X] 3.5.3 Merge Mutation & Clinical Data (`merged_mutation_clinical.json`)

*   **Phase 4: Detailed AI Eligibility Assessment** - MOSTLY COMPLETE
    *   [X] 4.1 Define Structured Patient Profile Schema.
    *   [X] 4.2 Implement Patient Data Acquisition (Use merged data + context).
    *   [X] 4.3 Integrate LLM Client.
    *   [X] 4.4 Design & Refine Eligibility Assessment Prompt (structured text output).
    *   [X] 4.5 Modify `ClinicalTrialAgent.run` (LLM call, parsing, action suggestion).
    *   [X] 4.6 Update API Endpoint.
    *   [X] 4.7 Enhance Frontend (`ResultsDisplay.jsx`).
    *   [ ] 4.8 Codebase Understanding & Catch-up.

*   **Phase 5: True Deep Analysis & Agentic Resolution (Current/Next Focus)**
        *   [X] **5.1.0 Implement Patient Context Enrichment using Database:** (Prerequisite for subsequent 5.1 tasks)
            *   [X] 5.1.0a Define Mutation DB Schema (SQLite in `backend/data/patient_data.db`, index `patientId`, secure storage required for HIPAA).
            *   [X] 5.1.0b Create DB Loading Script (`load_mutations_to_db.py`) to parse `merged_mutation_clinical.json` and insert into DB table.
            *   [X] 5.1.0c Run DB Loading Script (One-time).
            *   [X] 5.1.0d Modify Context Assembly Point (`main.py:/api/patients/{patient_id}`) to query DB for mutations by `patient_id`.
            *   [X] 5.1.0e Add Error Handling (DB connection/query errors).
            *   [X] 5.1.0f Testing (Verify endpoint returns base data + DB mutations).
        *   [X] **5.1 Refactor Deep Dive Agent (`EligibilityDeepDiveAgent`) for True Depth & Internal Resolution:**
            *   **Detailed Plan for 5.1 Completion:**
                *   [X] **Task 1 (Fix/Complete 5.1.1): Correct & Verify Incorporating Initial Reasoning:** 
                *   [X] **Task 2 (Implement 5.1.2): Implement Internal Data Search Logic:**
                *   [X] **Task 3 (Refine 5.1.4 - Part 1): Refine Agent Report Structure:** (Add `internal_search_results` - Completed during 5.1.2)
                *   [X] **Task 4 (Implement 5.1.3): Enhance Strategic Next Steps Generation:**
                    *   Goal: Make `refined_next_steps` aware of internal search outcomes.
                    *   Action: Modify next steps generation logic/prompt to use `internal_search_findings` for context; Generate steps referencing search outcomes.
                    *   Status: **COMPLETED**
        *   [ ] **5.1.5 Integrate Foundational Genomic Model (e.g., Evo 2) for Genomic Criteria Analysis:**
            *   **Status: UNBLOCKED & NEXT STEP** (5.1 Tasks 1-4 Complete)
            *   **Original Implementation Plan (Phased & Realistic) - Master Plan:**
                *   [X] **1. Define Mock Genomic Data Structure:** Add representative `genomics` section... (Status: COMPLETED)
                *   [X] **2. Create `GenomicAnalystAgent` (Placeholder):** Create file, class structure, placeholder `run`... (Status: COMPLETED)
                *   [X] **3. Implement Genomic Criterion Detection (`EligibilityDeepDiveAgent`):** Add keyword/regex detection logic... (Status: COMPLETED)
                *   [X] **4. Implement Basic Delegation Logic (`EligibilityDeepDiveAgent`):** Add `if is_genomic_criterion` block, call placeholder agent... (Status: COMPLETED)
                *   [X] **5. Initial Testing & Report Structure Refinement:** Test mock flow, verify delegation and report integration... (Status: COMPLETED)
                *   
            c
                *   [ ] **Step 6 (Integrate API):** Implement API client, reference genome access, API calls to get *real* scores from Evo 2 API.
                *   [ ] **Step 7 (Real Interpretation):** Replace simulated delta scores/interpretation in `GenomicAnalystAgent` with logic based on *real* delta scores from API (incorporates logic developed in 5.1.5a).
                *   [ ] **Step 8 (Enhance Frontend):** Update UI for specific genomic results.
                *   **Status (Overall 5.1.5): IN PROGRESS** (Steps 1-5 Complete, Focus on 5.1.5a)
                
            *   **Prerequisites & Challenges for Real Evo 2 Integration:** (Expanded)
                *   **Real Patient Genomic Data Acquisition (Major Challenge - Future Work):** 
                    *   **Current Status:** The system currently relies on manually defined *mock* genomic data within the `patient_data` object (`mock_patient_data_dict`).
                    *   **Real-World Problem:** Genomic data in EMRs is often stored non-discretely (e.g., scanned PDFs, text blobs in notes/results). Structured data (discrete fields, FHIR Genomics resources) is inconsistent across systems.
                    *   **Required Solution (Future Development):** A robust **Upstream EMR Integration Layer** is needed *before* data reaches the agents. This layer must:
                        *   Connect securely to EMR/LIS systems.
                        *   Identify and retrieve relevant genomic reports/data.
                        *   **Parse & Extract:** Use advanced techniques (OCR, NLP for PDFs/text; HL7/FHIR parsers for structured feeds) to extract variant details, interpretations, biomarkers.
                        *   **Standardize:** Convert data to consistent formats (e.g., HGVS nomenclature).
                        *   **Structure:** Assemble the data into the JSON format expected by `patient_data['genomics']`.
                    *   **Implication:** This is a significant, separate data engineering effort requiring specific EMR knowledge and NLP expertise, distinct from the current agent logic development.
                *   **Need for Clinical Data Context (Future Work):** 
                    *   **Context:** While the `GenomicAnalystAgent` focuses on VEP using mutation data (like that fetchable from cBioPortal via the provided `test.py` script example), making genomic findings clinically actionable requires correlating them with patient outcomes, treatments, demographics, disease stage, etc.
                    *   **Requirement:** A parallel effort is needed to acquire structured **Clinical Data** (similar to TCGA clinical datasets) alongside genomic data. This is also likely dependent on the future EMR Integration Layer or direct access to clinical data APIs.
                    *   **Impact:** Rich clinical data significantly enhances the input for the `EligibilityDeepDiveAgent` (for analyzing non-genomic criteria) and provides essential context for interpreting the significance of genomic findings derived from the `GenomicAnalystAgent`.
                *   **Reference Genome Access:** The VEP process requires reliable access to a standard human reference genome sequence (e.g., GRCh38) for context extraction.
                *   **API Access & Management:** Requires setting up and managing access to the chosen Evo 2 API (e.g., NVIDIA NIM/BioNeMo).
                *   **Interpretation & Validation:** Translating raw Evo 2 delta scores into clinically meaningful statuses requires careful threshold definition and validation (e.g., against ClinVar, expert review).
                
            *   **Roadmap Integration & Use Case Context (e.g., Doxorubicin Scenario):** (Restored Notes)
                *   **Current Focus:** The 8 steps above prioritize building the core `GenomicAnalystAgent` and its foundational Variant Effect Prediction (VEP) capability using Evo 2.
                *   **Broader Use Case Requirements:** Realizing the full clinical benefits (e.g., for managing doxorubicin toxicity and response) requires integrating the VEP results with additional capabilities:
                    *   Enhanced patient data model (e.g., cumulative dose, LVEF history).
                    *   Intelligent monitoring agents (analyzing trends in labs/vitals).
                    *   Context-aware clinical trial matching (using VEP results, dose, LVEF etc.).
                    *   Care coordination features (e.g., automated alerts/drafts for specialists).
                *   **Proposed Strategy:** 
                    1.  Complete the current 8-step roadmap for Task 5.1.5 first (including the simulation sub-task 5.1.5a) to deliver the core VEP engine.
                    2.  Subsequently, define *new roadmap tasks* to build the other necessary components (monitoring agents, data model enhancements, etc.) that leverage the `GenomicAnalystAgent`'s output to address complex clinical scenarios like the doxorubicin example.
                    
    *   [ ] **5.2 Enhance Frontend Display:** Modify `ResultsDisplay.jsx` to clearly present the richer information from the updated deep dive report (validation status, internal search findings, genomic analysis results, refined actions). (Partially addressed by recent UI updates)
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

Phase 3.5: Data Foundation & Eligibility Agent - COMPLETE (as of this review)
  [X] Define cBioPortal Data Needs (Mutations, Clinical for TCGA-BRCA)
  [X] Implement Python Script to Fetch Mutation Data (Requests, save to JSON)
  [X] Implement Python Script to Process Clinical TSV to JSON (Pandas, specific columns)
  [X] Implement Python Script to Merge Mutation & Clinical JSON (based on Patient ID)
  [X] Design SQLite Schema for Patient Mutations (`patient_data.db`, `mutations` table)
  [X] Implement Robust Loading Script for Merged JSON to SQLite DB
  [X] Modify `/api/patients/{patient_id}` to Query DB & Add Mutations to Patient Context
  [X] Enhance `EligibilityDeepDiveAgent`:
      [X] Task 5.1.1: Handle Original Reasoning (Ensure `original_reasoning` is passed and used in LLM prompt) - VERIFIED
      [X] Task 5.1.2: Internal Data Search (Implement `SEARCH_TARGETS`, helper functions, search full `patient_data` for `UNCLEAR` items, store `internal_search_findings`) - IMPLEMENTED & TESTED
      [X] Task 5.1.3: Refine Report Structure (Ensure findings are part of the output) - VERIFIED
      [X] Task 5.1.4: Strategic Next Steps (Refined LLM prompt including internal search context, robust JSON parsing) - IMPLEMENTED & TESTED (Parsing fixed!)
      [X] Task 5.1.5a: Simulate `GenomicAnalystAgent` (Mock VEP logic based on gene rules, intent, return structured status/evidence) - IMPLEMENTED & TESTED

Phase 4: Agent Refinement & Advanced Capabilities (NEW)

Overall Goal: Mature the `EligibilityDeepDiveAgent` and begin work on a more sophisticated `GenomicAnalystAgent` leveraging real VEP capabilities.

Sub-Task Group 1: `EligibilityDeepDiveAgent` Refinements
  Description: Address remaining issues and enhance the search capabilities of the existing deep dive agent.
  Tasks:
    [ ] 1.1: **Fix Weight Loss Criterion Mis-Match:** Investigate why the "weight loss" criterion incorrectly matches an unrelated target (e.g., `liver_enzymes` resulting in an "alt" keyword match) even after reordering search targets. Add targeted logging for `criterion_text` and `target_id` upon match within the internal search loop if the issue persists to understand the incorrect association. // DE-PRIORITIZED FOR NOW
    [ ] 1.2: **Improve ECOG Performance Status Detection:** Review and enhance the regex patterns within the `ecog_ps` target's `keywords` to more reliably detect *actual ECOG scores* (e.g., "ECOG 1", "KPS 90") in notes, not just general mentions of "performance status." Ensure context capture is sufficient.
    [ ] 1.3: **Add More Common Search Targets:** Identify and implement 2-3 additional common eligibility criteria categories as new search targets (e.g., specific prior therapy types, history of specific procedures like radiation, common comorbidities like cardiovascular disease).

Sub-Task Group 2: Advanced Status Determination (EligibilityDeepDiveAgent)
  Description: Enable the agent to more intelligently update criterion status based on its findings.
  Tasks:
    [ ] 2.1: **Internal Findings → Status Update Logic:** Design and implement logic where a high-confidence, definitive internal search finding can directly change a criterion's status (e.g., from `UNCLEAR` to `MET` if a lab value is clearly within range or a specific mutation is found/absent as required).
    [ ] 2.2: **Confidence Scoring for Internal Findings:** Develop a preliminary confidence scoring mechanism for internal search findings (e.g., direct lab match = high, keyword in note = medium) to gate the status update logic.

Sub-Task Group 3: `GenomicAnalystAgent` V1 (Simulated VEP)
  Description: Develop a V1 `GenomicAnalystAgent` that can interpret common types of genomic eligibility criteria using a sophisticated local simulation of Variant Effect Prediction (VEP). This simulation will be based on the **conceptual approach of Delta Likelihood Scoring** described in `evo2.md` and specific logic adapted from the "Evo2 BRCA1 VEP notebook" (details needed). This V1 will not call external APIs.
  Overall Goal for V1:
    - Accurately parse genomic criteria to identify gene(s), specific variants, and required status (e.g., mutated, wild-type, activating, loss-of-function).
    - Use the patient's `mutations` list (from `patient_data.db`).
    - Apply a rule-based/simulated VEP logic **inspired by Delta Likelihood concepts** (and derived from Evo2 notebook details TBD) to assess the significance of relevant patient mutations.
    - Determine if the criterion is MET, NOT_MET, or UNCLEAR based on the simulated functional impact.
    - Provide clear evidence and details about the "simulated VEP" findings.

  Tasks:
    [ ] 3.1: **Define `GenomicAnalystAgent` V1 Specification (Detailed):**
        *   [X] 3.1.1: Finalize Input Data Structure: (Patient Mutations list, Criterion Text) - Done
        *   [ ] 3.1.2: Define Criterion Parsing & Intent Extraction Logic: (Identify genes, variants, intent - e.g., activating, pathogenic, wild-type, resistance).
        *   [ ] 3.1.3: Design **Rule-Based** Simulated VEP Logic:
                *   Define rules using `variant_type`: Map types like 'Frame_Shift_Del', 'Nonsense_Mutation' to 'PREDICTED_PATHOGENIC/LOF'. Map 'Missense_Mutation' to 'PREDICTED_VUS' initially unless specific variant rules apply.
                *   Define handling for specific known variants: Create data structure (e.g., dict) mapping Gene -> ProteinChange -> Classification (e.g., `{'BRAF': {'V600E': 'PREDICTED_ACTIVATING'}, 'EGFR': {'T790M': 'PREDICTED_RESISTANCE'}}`).
                *   Define logic for 'WILD_TYPE' status determination (e.g., no relevant classified mutations found for the gene).
                *   Classification output will be strings (e.g., 'PREDICTED_PATHOGENIC'), **not** a numeric score for V1.
        *   [ ] 3.1.4: Finalize Output Data Structure (Pydantic model):
                *   `status`: Literal["MET", "NOT_MET", "UNCLEAR"]
                *   `evidence`: str
                *   `simulated_vep_details`: Optional[List[Dict[str, Any]]]
                    *   `gene_symbol`: str
                    *   `variant_identified`: str
                    *   `simulated_classification`: str
                    *   `classification_reasoning`: str (e.g., "Rule: Frame_Shift variant", "Rule: Known activating mutation").

    [ ] 3.2: **Implement Genomic Criterion Parser (`GenomicAnalystAgent`):**
        *   [ ] 3.2.1: Implement gene name extraction.
        *   [ ] 3.2.2: Implement specific variant extraction.
        *   [ ] 3.2.3: Implement intent determination.

    [ ] 3.3: **Implement Rule-Based Simulated VEP Logic (`GenomicAnalystAgent`):**
        *   [ ] 3.3.1: Implement `classify_variant(variant_data, gene_context, criterion_intent)` function based on rules defined in 3.1.3.
        *   [ ] 3.3.2: Implement lookup for known activating/resistance mutations.

    [ ] 3.4: **Implement Core `run` Method of `GenomicAnalystAgent` V1:**
        *   (Sub-tasks remain largely the same - orchestrate parser, iterate mutations, apply `classify_variant`, determine overall status, construct output).

    [ ] 3.5: **Unit Testing for `
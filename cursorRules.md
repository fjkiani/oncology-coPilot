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

Lessons
User Specified Lessons
You have a python venv in ./venv. Use it.
Include info useful for debugging in the program output.
Read the file before you try to edit it.
Due to Cursor's limit, when you use git and gh and need to submit a multiline commit message, first write the message in a file, and then use git commit -F <filename> or similar command to commit. And then remove the file. Include "[Cursor] " in the commit message and PR title.
Cursor learned
For search results, ensure proper handling of different character encodings (UTF-8) for international queries
Add debug information to stderr while keeping the main output clean in stdout for better pipeline integration
When using seaborn styles in matplotlib, use 'seaborn-v0_8' instead of 'seaborn' as the style name due to recent seaborn version changes
Use 'gpt-4o' as the model name for OpenAI's GPT-4 with vision capabilities
When using f-strings with JSON templates, double the curly braces {{ and }} to escape them properly and avoid format specifier errors
When working with experimental models like gemini-2.0-flash-thinking-exp-01-21, always implement fallback mechanisms to standard models in case the experimental model is unavailable
For options data, use RapidAPI directly instead of the YahooFinanceConnector class to avoid compatibility issues with the OptionChainQuote initialization
When processing options data from RapidAPI, create a mapping of strikes to straddles for easier lookup and processing of call and put data
When implementing the display_analysis function in Streamlit, ensure it combines all necessary display components (market overview, ticker analysis, technical insights, learning points) to avoid NameError exceptions
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
  [ ] Research & Integrate/Fine-tune Specialized Cancer Analysis Models (Beyond Summarization)
  [ ] Refine Prompt Interface for complex, multi-step agent tasks
  [ ] Enhance UI/UX for agent interaction and task management (status, approvals)
  [X] Develop Smart Contracts for Contribution Tracking (Proof-of-Concept)
      * Initial POC completed: Feedback logging metadata via local Hardhat network.

Phase 3: Collaboration, Research Platform, Decentralization & Expanded Integrations
  [ ] Design Secure Real-time Collaboration Architecture
  [ ] Implement Doctor-to-Doctor Consultation Features
      *   Goal: Build a graph-aware consultation system, not just chat.
      *   Design with **conceptual graph model** for lineage (Patient, Consult, Doctor, Message, Context, Agent Actions).
      *   Enable **contextual initiation** (link consult to specific data points).
      *   Support **in-consult agent invocation** (e.g., `/summarize`, `/check-interactions`).
      *   Lay groundwork for future **GraphRAG** capabilities (complex queries over consultation history/patient graph).
      *   (See `REALTIME_COLLABORATION.md` for detailed design).
  [ ] Develop Secure, Anonymized/Aggregated Data Sharing for Research (leveraging FL principles)
  [ ] **Implement additional Agents** (e.g., `OrderAgent`, `PharmacyAgent`)
  [ ] **Integrate with Production APIs** (Scheduling, Messaging, EHR Orders, etc. - Requires Partnerships/Access)
  [ ] Build Research Collaboration Workspace/Tools
  [ ] Implement Federated Learning Infrastructure (Coordination Layer)
  [ ] Integrate Blockchain for Auditing FL Rounds & Rewarding Contributors (Pilot)
  [ ] Develop Decentralized Governance Model Concept (e.g., DAO principles)

Phase 4: Deployment & Refinement
  [ ] Pilot Testing with Oncologists & Researchers
  [ ] Monitoring, Auditing (including on-chain activities), and Continuous Improvement
  [ ] Scalability and Maintenance Planning (for both AI and Blockchain components)

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

// ... (Technology Stack Considerations - Maybe update later as needed)
// ... (Key Challenges - Maybe update later as needed)
// ... (Lessons & Design Principles) ...
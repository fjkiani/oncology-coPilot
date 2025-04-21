 ## Research Page Implementation Plan

 **Main Takeaway:** Build a research page (`Research.jsx`) that displays relevant medical research (initially and via search) using dedicated `SearchBar` and `ResultsDisplay` components, backed by specific API endpoints or a dedicated Research Agent.

 ---

 **1. Overall Frontend Structure**

 *   **`Research.jsx` (Page Container):**
     *   **Role:** Manages overall state (search query, results, initial content, loading, errors).
     *   **Contains:** `SearchBar` and `ResultsDisplay` components.
     *   **Functionality:** Handles data fetching (initial content and search results).
 *   **`SearchBar.jsx` (Component):**
     *   **Role:** Provides the user interface for entering search terms.
     *   **Functionality:** Triggers a search via a callback prop (`onSearch`) passed from `Research.jsx`.
 *   **`ResultsDisplay.jsx` (Component):**
     *   **Role:** Renders the fetched research data (papers, trials, summaries).
     *   **Functionality:** Displays results, loading indicators, or error messages based on props received from `Research.jsx`.

 *   **Summary:** A standard container/component pattern where the page manages state and data fetching, delegating UI concerns to child components.

 ---

 **2. Initial Content Strategy (Displaying Data Before Search)**

 *   **Goal:** Provide immediate value upon page load by displaying relevant research without requiring user input.
 *   **Ideas:**
     *   a) **Latest High-Impact Oncology Research:** Fetch recent/highly cited general oncology papers/trials (e.g., from PubMed).
     *   b) **Contextual (Patient-Specific) Research:** If navigating from a patient record (`/medical-records/:patientId/research`), use `patientId` (via `useParams`) to fetch research relevant to the patient's specifics (diagnosis, treatment). Requires dedicated backend logic.
     *   c) **Trending Topics/Keywords:** Display currently trending research areas in oncology.
     *   d) **Combination:** Mix general latest research with patient-specific results if applicable.

 *   **Summary:** The page should proactively display useful information. Patient-specific context is ideal when available, otherwise general high-impact or trending research can be shown.

 ---

 **3. Search Functionality Flow**

 *   **Trigger:** User enters a query in `SearchBar` and submits.
 *   **Process:**
     1.  `SearchBar` calls the `onSearch` prop function in `Research.jsx`.
     2.  `Research.jsx` updates its state (sets loading `true`, clears old results).
     3.  `Research.jsx` makes an API call to the backend with the search query.
     4.  Backend queries relevant databases (PubMed, ClinicalTrials.gov, etc.).
     5.  Backend returns results to `Research.jsx`.
     6.  `Research.jsx` updates state with new results and sets loading `false`.
     7.  `ResultsDisplay` re-renders to show the new results.

 *   **Summary:** A standard asynchronous search pattern: user input triggers an API call, state updates manage loading/results, and the UI reflects the changes.

 ---

 **4. Backend Data Source Requirements**

 *   **Need:** Backend support is crucial for fetching both initial content and search results.
 *   **Options:**
     *   **Dedicated API Endpoints:**
         *   `/api/research/latest`: For general initial content.
         *   `/api/research/patient/:patientId`: For patient-specific initial content.
         *   `/api/research/search?query=...`: For handling user searches.
     *   **Research Agent:** Leverage an existing agent pattern or create a new `ResearchAgent` on the backend to handle these different data fetching modes (latest, patient-specific, search).

 *   **Summary:** The backend needs to provide structured ways to access different types of research data, either through distinct REST endpoints or a more flexible agent-based approach.

 ---

 **5. Proposed Next Steps**

 1.  **Integrate Components:** Import and render `SearchBar` and `ResultsDisplay` within `src/pages/Research.jsx` (using placeholder props initially).
 2.  **Implement Initial Content (Static):** Choose an initial content strategy (e.g., latest papers). Fetch and display static/hardcoded example data in `Research.jsx` using `useState` and `useEffect` to validate the structure.
 3.  **Develop Backend:** Define and implement the necessary backend API endpoint(s) or agent logic for fetching real initial content and handling searches.
 4.  **Connect Frontend to Backend:** Update `Research.jsx` to make live API calls to the implemented backend endpoints for both initial content loading and search result fetching.

 *   **Summary:** Start by building the basic frontend structure with static data, then implement the backend logic, and finally connect the two.

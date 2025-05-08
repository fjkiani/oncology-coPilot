# EligibilityDeepDiveAgent Enhancements

## Task 5.1.2: Internal Data Search Logic

**Goal:** To improve the accuracy and utility of the `EligibilityDeepDiveAgent` by attempting to resolve criteria marked as `UNCLEAR` after the initial LLM analysis.

**Problem:** The initial LLM analysis in `_analyze_single_criterion_async` operates on a *snippet* of the patient data (`patient_data_snippet`) for efficiency. This means the LLM might mark a criterion as `UNCLEAR` because the specific required information (e.g., a recent lab value, a specific mutation status) wasn't included in that snippet, even if it exists in the full `patient_data` object.

**Solution: Internal Programmatic Search**

After the initial LLM analysis pass completes for all criteria, the `EligibilityDeepDiveAgent.run` method will implement the following logic:

1.  **Identify `UNCLEAR` Gaps:** Iterate through the analysis results and identify any criteria whose `status` is still `UNCLEAR`.
2.  **Define Search Targets:** Use predefined patterns and keywords associated with common eligibility criteria types (e.g., lab values like platelets/ANC, performance status like ECOG, specific genomic alterations like KRAS/EGFR status, medication history like P-gp inhibitors).
3.  **Match Criterion to Target:** For each `UNCLEAR` criterion, determine the relevant search target(s) based on its text.
4.  **Execute Programmatic Search:** Based on the matched target, perform a *direct search within the complete `patient_data` object* (which now includes the comprehensive `mutations` list thanks to Task 5.1.0). This is **not** an LLM call, but Python code accessing specific keys and filtering data:
    *   *Example (Lab):* If criterion mentions "platelet count", search `patient_data['recentLabs']` for relevant components.
    *   *Example (Mutation):* If criterion mentions "KRAS mutation", search `patient_data['mutations']` list for entries where `hugo_gene_symbol` is "KRAS".
    *   *Example (Medication):* If criterion mentions "P-gp inhibitor", check `patient_data['currentMedications']` against a known list.
    *   *Example (History/Notes):* Perform keyword searches within `patient_data['medicalHistory']` or `patient_data['notes']`.
5.  **Store Findings:** If the internal search finds relevant information, store it alongside the criterion's analysis result (e.g., in a new `internal_search_findings` field). This finding should include the source (e.g., "Recent Labs", "Mutations List", "Progress Note [Date]") and the specific context found.

**Benefit & Workflow Integration:**

*   **Leverages Prepared Data:** Directly utilizes the comprehensive `mutations` list (derived from `merged_mutation_clinical.json` via `patient_data.db`) loaded into the `patient_data` context.
*   **Reduces False `UNCLEAR`s:** Can potentially resolve ambiguities automatically if the required data exists within the full patient record.
*   **Actionable Output:** Instead of just `UNCLEAR`, the agent can provide output like: "Status: UNCLEAR. Internal Search Found: Platelet count of 180 K/uL on 2024-07-25." or "Status: UNCLEAR. Internal Search Found: KRAS G12D mutation detected."
*   **Informs Next Steps:** The presence (or absence) of internal findings for `UNCLEAR` criteria provides valuable input for generating more specific and relevant strategic next steps (Task 5.1.4).

This internal search adds a crucial layer of data validation and clarification, making the deep dive more robust before potentially needing to delegate complex genomic interpretation (Task 5.1.5) or suggesting external actions.

## Business & Patient Value Perspective

The `EligibilityDeepDiveAgent` fundamentally transforms the clinical trial eligibility screening workflow in these key ways:

### For Clinical Research Coordinators & Sites:
1. **Reduced Manual Chart Review:** Coordinators no longer need to manually search through lengthy EMR records to validate every unclear criterion. The agent pinpoints exactly where to look or confirms the absence of data.
2. **Prioritized Actionable Workflow:** The `strategic_next_steps` output creates an immediate task list by priority, replacing ad hoc approaches with a structured, efficient workflow.
3. **Transparent Decision Support:** Every eligibility decision is supported by concrete evidence and clear reasoning, improving documentation and reducing eligibility errors.
4. **Increased Screening Capacity:** Faster, more accurate eligibility assessments allow coordinators to screen more patients, potentially increasing enrollment rates.

### For Patients:
1. **Faster Match Confirmation:** Reduces the time between initial screening and confirmed eligibility, accelerating access to potentially beneficial trials.
2. **Reduced Protocol Violations:** Improved eligibility screening accuracy means fewer patients will be enrolled only to be later removed due to eligibility errors.
3. **Comprehensive Assessment:** By searching all available patient data, the agent may identify trial opportunities that might otherwise be missed with simpler screening approaches.

### For Frontend UI Integration:
1. **Enhanced Criterion Display:** Each criterion can show its status, evidence, and any internal findings, providing immediate context for the user.
2. **Task Generation:** The `strategic_next_steps` can be directly transformed into tasks in a coordinator's workflow queue.
3. **Interactive Exploration:** Users can click on internal findings to see the exact patient data context that was flagged.
4. **Justification Tracking:** Clear evidence for why criteria are met or not met provides audit trails and documentation for regulatory purposes.

## Next Steps & Roadmap

Following our successful implementation and testing of the `EligibilityDeepDiveAgent`, our next priorities are:

1. **Search Target Refinements (Current):**
   - **Fix Weight Loss Criterion Issue:** Resolve the persistent issue where the weight loss criterion incorrectly matches ALT lab values. We've moved this target higher in the search order, but may need further investigation.
   - **Improve ECOG Performance Status Detection:** Enhance regex patterns to more reliably detect actual ECOG scores in notes, not just mentions of "performance status."
   - **Add Search Targets for Common Criteria:** Develop additional search targets for frequently encountered eligibility criteria, such as specific therapy history, procedure history, and comorbidities.

2. **Enhanced Status Determination (Planned):**
   - **Internal Findings → Status Update:** Develop logic to potentially update a criterion's `status` based on definitive internal search findings (e.g., if a clear ALT value is found within range, automatically change from `UNCLEAR` to `MET`).
   - **Confidence Scoring:** Add confidence metrics to internal findings to determine when they're definitive enough to influence status.

3. **User Experience Improvements (Planned):**
   - **Highlight Evidence in Context:** When presenting internal findings to the user, highlight the specific text/values that matched rather than just showing the entire context.
   - **Link to Source Data:** Allow frontend users to click through from findings directly to the source data in the patient record.
   - **One-Click Task Creation:** Convert `strategic_next_steps` to actual tasks in the workflow management system with a single click.

4. **Integration with Other Agents (Future):**
   - **Genomic Analysis Handoff:** Fully implement and test the handoff to `GenomicAnalystAgent` for complex genomic criteria.
   - **EHR Integration Agent:** Develop an agent to help fulfill `CHECK_EXTERNAL_RECORD` actions by interfacing with external EHR systems.
   - **Multi-Agent Coordination:** Create a coordination layer to orchestrate multiple agents working together on different aspects of eligibility assessment.

These next steps build upon our successful implementation while addressing identified limitations and expanding the agent's capabilities to deliver even more value to clinical research workflows.

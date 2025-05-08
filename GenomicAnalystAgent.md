# GenomicAnalystAgent Documentation

## 1. Overview

The `GenomicAnalystAgent` is a specialized component within the AI CoPilot system designed to analyze and interpret genomic eligibility criteria from clinical trials. It parses the criterion text to identify relevant genes, specific genetic variants, and the intended genomic status required by the trial (e.g., presence of an activating mutation, absence of a resistance mutation, or wild-type status). It then compares this against the patient's known mutation list (sourced from their enriched `patient_data` object) and applies a **rule-based simulated Variant Effect Prediction (VEP)** logic to determine if the patient meets the genomic criterion.

This agent serves as a V1 implementation, providing a sophisticated local simulation of VEP to enhance eligibility assessment for genomic criteria without relying on external API calls for VEP in this version.

## 2. Key Functionality

### 2.1. Criterion Parsing

The agent employs several parsing steps to understand the genomic requirements of an eligibility criterion:

*   **Gene Extraction (`_extract_genes`):**
    *   Identifies mentions of known gene symbols (e.g., `PIK3CA`, `EGFR`, `BRCA1`) within the criterion text.
    *   Uses a predefined list of common cancer-related genes (`self.known_genes`) and case-insensitive regex matching with word boundaries.
*   **Specific Variant Extraction (`_extract_specific_variants`):**
    *   Detects common notations for specific genetic variants using regular expressions. This includes:
        *   Protein changes: e.g., `p.V600E`, `V600E`, `R248Q`.
        *   Exon-level changes: e.g., `exon 19 deletion`, `Exon20ins`.
    *   The list of extracted specific variants helps in applying more precise rules during simulation.
*   **Intent Determination (`_determine_criterion_intent`):**
    *   Infers the clinical intent or required genomic state from the criterion text.
    *   Uses a dictionary of patterns (`self.intent_patterns`) that map keywords and phrases to specific internal intent codes. Examples:
        *   `required_status`: Can be `ACTIVATING`, `PATHOGENIC/LOF`, `RESISTANCE`, `WILD_TYPE`, or `ANY_MUTATION`.
        *   `presence_required`: Boolean, indicating if the `required_status` must be present (True) or absent (False).
    *   Handles negation (e.g., "absence of mutation," "no known resistance mutation").

### 2.2. Patient Data Usage

*   The agent utilizes the patient's mutation list, which is expected to be present in the `patient_data` object passed to its `run` method.
*   This mutation data is originally sourced from `merged_mutation_clinical.json` and loaded into the `patient_data.db` SQLite database, then retrieved and added to the patient's context for an API session.
*   Each mutation record in the list is a dictionary typically containing `hugo_gene_symbol`, `variant_type`, `protein_change`, etc.

### 2.3. Rule-Based Simulated VEP Logic (`_classify_variant_simulated`)

This is the core of the V1 agent, providing a local simulation of how a variant's effect might be classified. It applies a hierarchy of rules:

1.  **Known Specific Variants:**
    *   A predefined dictionary (`self.known_variant_classifications`) maps specific gene-variant pairs to classifications (e.g., `{'BRAF': {'V600E': 'PREDICTED_ACTIVATING'}, 'EGFR': {'T790M': 'PREDICTED_RESISTANCE'}}`). This takes highest precedence.
2.  **Variant Type Rules:**
    *   General rules based on `variant_type` (from the patient's mutation data):
        *   `Frame_Shift_Del`, `Frame_Shift_Ins`, `Nonsense_Mutation`, `Splice_Site` are typically classified as `PREDICTED_PATHOGENIC/LOF`.
        *   `In_Frame_Del`, `In_Frame_Ins` might be `PREDICTED_VUS` or potentially pathogenic depending on the gene/context (currently likely `PREDICTED_VUS` by default).
    *   `Missense_Mutation` is often initially classified as `PREDICTED_VUS` (Variant of Uncertain Significance) unless overridden by a specific known variant rule.
3.  **Default Classifications:**
    *   If no specific rules apply, a variant might remain `PREDICTED_VUS` or `PREDICTED_BENIGN/UNCLEAR`.
4.  **Wild-Type Determination:**
    *   If a gene is analyzed and no relevant (i.e., classified as non-benign by the rules) mutations are found for that gene in the patient's data, it's considered `WILD_TYPE` for that gene.

The output classifications are strings like:
*   `PREDICTED_PATHOGENIC/LOF`
*   `PREDICTED_ACTIVATING`
*   `PREDICTED_RESISTANCE`
*   `PREDICTED_VUS`
*   `WILD_TYPE` (assigned if no non-benign mutations are found for a queried gene)
*   `PREDICTED_BENIGN/UNCLEAR`

### 2.4. Output Structure

The `run` method returns a dictionary with the following main keys:

*   `status`: Overall assessment of whether the criterion is `MET`, `NOT_MET`, or `UNCLEAR`.
*   `evidence`: A string summarizing the analysis, including the parsed query, determined intent, and a summary of findings.
*   `simulated_vep_details`: A list of dictionaries, where each dictionary provides details for each gene-variant pair that was analyzed, including:
    *   `gene_symbol`
    *   `variant_identified` (e.g., protein change, or "None" if wild-type for that gene)
    *   `simulated_classification` (e.g., `PREDICTED_PATHOGENIC/LOF`)
    *   `classification_reasoning` (e.g., "Rule: Frame_Shift variant", "Rule: Known activating mutation")

## 3. How Data is Generated and Used

*   **Input Criterion Text:** Originates from the free-text eligibility criteria sections of clinical trial protocols.
*   **Patient Mutation Data:**
    *   Sourced from the `brca_tcga_mutations.json` (cBioPortal fetch) and `brca_tcga_clinical_data.tsv` files.
    *   These are merged into `merged_mutation_clinical.json`.
    *   This merged data is then loaded into a local SQLite database (`backend/data/patient_data.db`) in the `mutations` table.
    *   When a patient's data is requested via the API (e.g., `/api/patients/{patient_id}`), their mutations are queried from this database and included in the `patient_data` context object.
*   **Simulated VEP Classifications:** These are **generated internally** by the `GenomicAnalystAgent` itself using the predefined rules and logic described in section 2.3. They are not fetched from an external VEP service in this V1 implementation.

## 4. Business Value & Non-Technical Explanation

From a clinician's or research coordinator's perspective, understanding if a patient's specific genetic makeup aligns with a clinical trial's requirements can be a complex and time-consuming task. Genomic eligibility criteria are often dense and require careful interpretation of both the trial's language and the patient's genetic test results.

The `GenomicAnalystAgent` aims to simplify and accelerate this process by acting as an intelligent assistant:

*   **Saves Time and Reduces Manual Effort:** Instead of manually cross-referencing a patient's mutations against a trial's genomic criteria, the agent automates the initial assessment. It quickly flags whether a patient's known mutations (like a `BRAF V600E` mutation) are likely to be considered activating, pathogenic, or if a gene is wild-type, as required by the trial.
*   **Clarifies Complex Genomic Language:** Clinical trials might specify "loss-of-function mutation in TP53" or "activating KRAS alteration." The agent helps translate these requirements by checking if the patient's specific `TP53` or `KRAS` variants fit these descriptions based on established rules (e.g., frameshift mutations are often loss-of-function).
*   **Improves Accuracy in Initial Screening:** By systematically applying a defined set of rules, it reduces the chance of overlooking relevant mutations or misinterpreting the criteria during the initial screening phase, leading to more accurate identification of potentially eligible patients.
*   **Facilitates Quicker Identification of Trial Opportunities:** By rapidly assessing genomic compatibility, the agent helps clinicians and researchers identify suitable clinical trials for their patients more efficiently, potentially opening up new treatment avenues sooner.
*   **Supports Informed Decision-Making:** While not a diagnostic tool, the agent provides a structured summary and a preliminary assessment of genomic alignment. This information, along with the detailed evidence, empowers clinicians to make more informed decisions about pursuing a specific trial for a patient.
*   **Reduces Cognitive Load:** Oncologists and researchers are often inundated with information. This agent helps by pre-processing and interpreting a critical piece of the eligibility puzzle, allowing them to focus their expertise on more nuanced aspects of patient care and trial selection.

In essence, the `GenomicAnalystAgent` makes the complex task of matching a patient's genomic profile to a trial's requirements faster, more systematic, and easier to understand, ultimately aiding in the effort to find the right trial for the right patient.

## 5. Technical Utility and Usefulness

The `GenomicAnalystAgent` provides several benefits:

*   **Enhanced Accuracy for Genomic Criteria:** Moves beyond simple keyword matching for genes by attempting to understand the *type* of genomic alteration required (activating, pathogenic, wild-type, etc.) and its presence or absence.
*   **Contextual Patient Data Integration:** Directly uses the patient's known mutations to assess relevance.
*   **Structured Output for Downstream Use:** Provides a clear, structured JSON output that the calling agent (e.g., `EligibilityDeepDiveAgent`) can use to make a final MET/NOT_MET/UNCLEAR decision for the genomic criterion.
*   **Improved Evidence:** The detailed `evidence` string and `simulated_vep_details` offer transparency into how the conclusion was reached.
*   **Foundation for Future VEP Integration:** The parsing logic and the overall agent structure (input, output, integration with `EligibilityDeepDiveAgent`) establish a solid foundation for later replacing the V1 simulation rules with calls to a real VEP predictor (like an Evo 2 model via API).
*   **Clinical Relevance:** Helps determine if a patient's specific mutations (e.g., a `BRAF V600E` activating mutation) align with trial requirements that might specify "presence of activating BRAF mutation" or, conversely, if a patient is "EGFR wild-type" when a trial requires it.

## 6. Future Enhancements

*   **Integration of Real VEP Model (V2):** The primary future enhancement will be to replace the rule-based simulation with calls to an actual Variant Effect Predictor (e.g., an Evo-based model accessible via NVIDIA NIM or other APIs). This would provide more accurate and nuanced pathogenicity/functional impact scores.
*   **Expanded Rule Set & Known Variants:** Even before full VEP API integration, the internal rule set and list of known variant classifications can be expanded based on more comprehensive oncological knowledge bases.
*   **More Sophisticated Variant Parsing:** Enhance regex to cover a wider range of variant notations (e.g., complex structural variants, fusions, copy number variations if relevant data becomes available).
*   **Confidence Scoring:** Introduce confidence scores for the simulated classifications.

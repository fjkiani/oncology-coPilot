from typing import Dict, Any, List, Tuple, Optional, Set
import logging
import re # Import regex
from pydantic import BaseModel, Field

# Use Optional for < Python 3.10 compatibility in mock_evo2_api imports
from backend.api_mocks.mock_evo2_api import get_variant_effect_mock 
# Removed KNOWN_VARIANT_CLASSIFICATIONS and call_mock_evo2_variant_analyzer as they are not directly used by this agent after V1.5 refactor for get_variant_effect_mock

# Attempt to import the interface, handle if not found for now
try:
    from ..core.agent_interface import AgentInterface
except ImportError:
    logging.warning("AgentInterface not found. Using dummy class.")
    class AgentInterface: # type: ignore
        pass

# Define Pydantic models for structured output

class SimulatedTools(BaseModel):
    sift: Optional[str] = None
    polyphen: Optional[str] = None

class MockKnowledgebases(BaseModel):
    clinvar_significance: Optional[str] = None
    oncokb_level: Optional[str] = None

class SimulatedVEPDetail(BaseModel):
    input_variant_query: str = Field(..., description="The original variant query string used for the VEP lookup.")
    gene_symbol: str
    protein_change: Optional[str] = Field(None, description="Normalized protein change, e.g., V600E.")
    canonical_variant_id: Optional[str] = Field(None, description="A canonical representation of the variant, e.g., GENE:p.Change.")
    simulated_classification: str = Field(..., description="The classification assigned by the mock VEP.")
    classification_reasoning: str = Field(..., description="The reasoning behind the mock VEP classification.")
    predicted_consequence: Optional[str] = Field(None, description="The predicted molecular consequence (e.g., missense_variant).")
    simulated_tools: Optional[SimulatedTools] = Field(None, description="Mock scores from bioinformatics tools like SIFT, PolyPhen.")
    mock_knowledgebases: Optional[MockKnowledgebases] = Field(None, description="Mock interpretations from knowledgebases like ClinVar, OncoKB.")
    variant_type_from_input: Optional[str] = Field(None, description="The variant type provided as input to the VEP lookup (e.g., from MAF).")
    data_source: Optional[str] = Field(None, description="Identifier for the data source and version of the mock VEP.")


class GeneSummaryStatus(BaseModel):
    status: str = Field(..., description="The summary status for the gene regarding the criterion (e.g., MET, NOT_MET, ACTIVATING_FOUND, PATHOGENIC_FOUND, WILD_TYPE, VUS_PRESENT, RESISTANCE_FOUND, UNCLEAR).")
    details: str = Field(default="", description="Additional details or reasoning for the gene summary status.")
    # We could add a list of relevant VEP details here if needed per gene summary,
    # but for now, all VEP details are aggregated in the main result.

class GenomicAnalysisResult(BaseModel):
    criterion_id: str
    criterion_query: str
    status: str # MET, NOT_MET, UNCLEAR, ERROR
    evidence: str # This will be a string summary for now.
    gene_summary_statuses: Dict[str, GeneSummaryStatus] = Field(default_factory=dict, description="Detailed summary status for each gene involved in the criterion.")
    simulated_vep_details: List[SimulatedVEPDetail] = Field(default_factory=list, description="Detailed results from the (mock) Variant Effect Predictor for each relevant variant.")
    clinical_significance_context: Optional[str] = Field(None, description="Contextual information about the clinical significance of findings.")
    errors: List[str] = Field(default_factory=list)


class GenomicAnalystAgent(AgentInterface):
    """Agent specializing in analyzing genomic criteria using simulated VEP logic."""

    @property
    def name(self) -> str:
        return "GenomicAnalystAgent"

    @property
    def description(self) -> str:
        return "Analyzes genomic criteria by simulating variant effect prediction based on mock patient data and clinical interpretations."

    def __init__(self):
        logging.info(f"[{self.name}] Initialized (V1.5 - Enhanced Mock Evo2 Simulation).")
        
        self.known_genes = ["PIK3CA", "KRAS", "TP53", "BRCA1", "BRCA2", "AKT", "AKT1", "AKT2", "AKT3", "EGFR", "BRAF", "ERBB2", "FGFR1", "FGFR2", "FGFR3", "IDH1", "IDH2", "MET", "ALK", "ROS1", "RET", "NTRK1", "NTRK2", "NTRK3"]
        # ERBB2 is HER2
        
        self.intent_patterns = {
            'ACTIVATING_PRESENCE': [r'activating', r'oncogenic', r'gain[- ]of[- ]function', r'gof'],
            'PATHOGENIC_PRESENCE': [r'pathogenic', r'deleterious', r'loss[- ]of[- ]function', r'lof'],
            'RESISTANCE_PRESENCE': [r'resistance mutation'],
            'WILD_TYPE': [r'wild[- ]?type', r'wt', r'absence of mutation', r'no mutation', r'negative for mutation', r'unmutated', r'negative'],
            'MUTATION_PRESENCE': [r'mutation', r'variant', r'alteration', r'mutated', r'change'], # General mutation presence
            # It's tricky to have RESISTANCE_ABSENCE here as _determine_criterion_intent handles general negation.
            # We rely on the combination of a RESISTANCE keyword and overall negation.
        }
        
        self.three_letter_aa_map = {
            'CYS': 'C', 'ASP': 'D', 'SER': 'S', 'GLN': 'Q', 'LYS': 'K',
            'ILE': 'I', 'PRO': 'P', 'THR': 'T', 'PHE': 'F', 'ASN': 'N', 
            'GLY': 'G', 'HIS': 'H', 'LEU': 'L', 'ARG': 'R', 'TRP': 'W', 
            'ALA': 'A', 'VAL':'V', 'GLU': 'E', 'TYR': 'Y', 'MET': 'M', 'TER': '*'
        }

        self.clinical_context_map: Dict[str, Dict[str, str]] = {
            "DEFAULT": {
                "MET": "The genomic criterion was met based on the patient's mutation profile and simulated analysis.",
                "NOT_MET": "The patient's mutation profile did not meet the specific genomic criterion based on simulated analysis.",
                "UNCLEAR": "The analysis for this genomic criterion was unclear, potentially due to ambiguous query, missing data, or variants of unknown significance.",
                "ERROR": "An error occurred during the genomic analysis."
            },
            "EGFR": {
                "WILD_TYPE_TRUE": "EGFR wild-type status confirmed. This is relevant for therapies where EGFR mutations are contraindications or predict lack of response (e.g., some anti-EGFR antibodies in CRC if KRAS is also WT).",
                "ACTIVATING_MUTATION_TRUE": "Presence of an activating EGFR mutation (e.g., L858R, Exon 19 del) makes the patient potentially eligible for EGFR-targeted therapies (e.g., Osimertinib, Gefitinib) in NSCLC.",
                "RESISTANCE_MUTATION_TRUE": "Detection of an EGFR resistance mutation (like T790M) indicates likely resistance to earlier-generation EGFR inhibitors, influencing subsequent treatment choices (e.g., consider Osimertinib).",
                "PATHOGENIC_MUTATION_TRUE": "A pathogenic EGFR mutation was identified. Depending on its specific nature (activating, resistance, other), this could influence trial eligibility or therapeutic options.",
                "DEFAULT_CONTEXT": "EGFR is a key oncogene in several cancers, notably NSCLC. Its mutational status (wild-type, specific activating mutations, or resistance mutations) dictates eligibility for various targeted therapies."
            },
            "BRAF": {
                "ACTIVATING_MUTATION_TRUE": "Activating BRAF mutations (esp. V600E/K) are key biomarkers in melanoma, thyroid, NSCLC, and other cancers, indicating eligibility for BRAF/MEK inhibitor therapies.",
                "WILD_TYPE_TRUE": "BRAF wild-type status confirmed. BRAF-targeted therapies are typically not indicated based on this gene alone.",
                "DEFAULT_CONTEXT": "BRAF is a proto-oncogene; specific mutations like V600E make it a therapeutic target."
            },
            "KRAS": {
                "ACTIVATING_MUTATION_TRUE": "Specific activating KRAS mutations (e.g., G12C, G12D) are common oncogenic drivers. KRAS G12C is now targetable in some cancers (e.g., NSCLC, CRC), opening new treatment avenues and trial options.",
                "WILD_TYPE_TRUE": "KRAS wild-type status is often required for therapies targeting the EGFR pathway (like cetuximab/panitumumab) in colorectal cancer, as KRAS mutations predict resistance.",
                "DEFAULT_CONTEXT": "KRAS is one of the most frequently mutated oncogenes. Its status is critical for treatment decisions in CRC and NSCLC, among others."
            },
            "TP53": {
                "PATHOGENIC_MUTATION_TRUE": "Pathogenic TP53 mutations are very common across cancer types and are generally associated with poorer prognosis and altered response to some therapies. Their presence is a frequent factor in clinical trial design and interpretation, though rarely a direct target itself.",
                "WILD_TYPE_TRUE": "TP53 wild-type status is generally associated with better prognosis and response to certain DNA-damaging therapies compared to mutated TP53.",
                "DEFAULT_CONTEXT": "TP53 is a critical tumor suppressor gene. Mutations are common and have broad implications for cancer development and treatment response."
            },
            "ERBB2": { # HER2
                "ACTIVATING_MUTATION_TRUE": "Activating ERBB2 (HER2) mutations (distinct from amplification) can occur in lung, breast, and other cancers, making patients eligible for HER2-targeted therapies like trastuzumab deruxtecan.",
                "AMPLIFICATION_TRUE": "ERBB2 (HER2) amplification (not typically found in MAF files directly as a \'mutation\', but this context is for general ERBB2 status) is a key biomarker in breast and gastric cancers for anti-HER2 therapies (trastuzumab, pertuzumab).", # Note: Agent currently doesn't detect 'amplification' from text query
                "WILD_TYPE_TRUE": "ERBB2 (HER2) wild-type status (no activating mutation or amplification) generally means HER2-targeted therapies are not indicated.",
                "DEFAULT_CONTEXT": "ERBB2 (HER2) is an important oncogene. Its status (amplification or specific mutations) is critical for targeted therapy in breast, gastric, lung, and other cancers."
            }
            # Add more genes (BRCA1/2, PIK3CA, ALK, ROS1 etc.) as needed
        }
        self.clinical_significance_context: Optional[str] = None # Instance variable to store context


    def _extract_genes(self, query_text: str) -> List[str]:
        found_genes = set()
        query_upper = query_text.upper()
        # Sort known_genes by length descending to match longer names first (e.g., "NTRK1" before "TRK")
        # Though in current list, this is not an issue. Good practice if aliases were less distinct.
        sorted_known_genes = sorted(self.known_genes, key=len, reverse=True)

        for gene in sorted_known_genes:
            # Regex to match whole gene names, not as substrings of other words.
            # Allows gene to be followed by non-alphanumeric or end of string.
            # Allows gene to be preceded by non-alphanumeric or start of string.
            pattern = r'(?<![A-Z0-9])' + re.escape(gene) + r'(?![A-Z0-9])'
            if re.search(pattern, query_upper):
                # Special handling for HER2 -> ERBB2
                if gene == "HER2":
                    found_genes.add("ERBB2")
                else:
                    found_genes.add(gene)
        return sorted(list(found_genes))

    def _normalize_variant_name(self, variant_name: str) -> str:
        """Normalizes variant name, primarily for protein changes."""
        # Standard p. notation: p.Val600Glu -> V600E
        match_p_dot = re.match(r"^[pP]\.(?:([A-Z][a-z]{2}))?([A-Z*])(\d+)(?:([A-Z][a-z]{2}))?([A-Z*]|fs\*?\d*)$", variant_name)
        if match_p_dot:
            aa1_3l, aa1_1l_direct, pos, aa2_3l, aa2_ext = match_p_dot.groups()
            
            aa1_final = ""
            if aa1_1l_direct: # e.g. p.V600E
                aa1_final = aa1_1l_direct
            elif aa1_3l: # e.g. p.Val600Glu
                aa1_final = self.three_letter_aa_map.get(aa1_3l.upper(), "?")
            
            aa2_final = ""
            if len(aa2_ext) == 1 and aa2_ext.isalpha(): # Single letter like E in V600E
                 aa2_final = aa2_ext.upper()
            elif aa2_3l : # e.g. p.Val600Glu
                aa2_final = self.three_letter_aa_map.get(aa2_3l.upper(), "?")
            else: # fs, del, ins, *, etc.
                aa2_final = aa2_ext

            if aa1_final and pos and aa2_final:
                return f"{aa1_final}{pos}{aa2_final}"

        # Simpler V600E, EXON19DEL (already somewhat normalized by _extract_specific_variants)
        # This function is more for ensuring a consistent format if input is messy.
        # For now, return uppercase if no specific p.dot match
        return variant_name.upper()


    def _extract_specific_variants(self, query_text: str) -> List[str]:
        variants_found = set()
        
        # Pattern for p. notation: p. (optional 3-letter AA1) (1-letter AA1) (Position) (optional 3-letter AA2) (1-letter AA2 or * or fs)
        # Captures parts for normalization.
        protein_pattern_p_dot = r'[pP]\.(?:([A-Z][a-z]{2}))?([A-Z])(\d+)(?:([A-Z][a-z]{2}))?([A-Z*]|fs\*?\d*|\*|[Dd][Ee][Ll]|[Ii][Nn][Ss]|[Dd][Uu][Pp])'
        
        # Pattern for simple V600E notation (no p.)
        short_protein_pattern = r'(?<![a-zA-Z\d])([A-Z])(\d+)([A-Z*]|fs\*?\d*|[Dd][Ee][Ll]|[Ii][Nn][Ss]|[Dd][Uu][Pp])(?![a-zA-Z\d])'
        
        exon_pattern = r'(?:exon|ex)\s*(\d+)\s*(?:deletion|del|insertion|ins|mutation|variant|alteration|mut|var|alt)\b'
        
        slash_pattern = r'(?<![a-zA-Z\d])([A-Z])(\d+)([A-Z*])\/([A-Z*])(?![a-zA-Z\d])'

        # General "mutation" type that could be a variant type query like "Nonsense_Mutation"
        # or "Missense", "Frameshift" etc. from GENERAL_VARIANT_TYPE_EFFECTS_MOCK in mock API
        # Ensure it captures "Nonsense_Mutation", "Missense Mutation", etc.
        general_type_pattern = r'\b([A-Za-z]+(?:[-_][A-Za-z]+)*)\s*(?:mutation|variant|alteration)\b'


        for match in re.finditer(protein_pattern_p_dot, query_text):
            aa1_3l, aa1_1l_direct, pos, aa2_3l, aa2_ext = match.groups()
            aa1 = aa1_1l_direct if aa1_1l_direct else self.three_letter_aa_map.get(aa1_3l.upper(), "") if aa1_3l else ""
            
            aa2_norm = aa2_ext # Default
            if aa2_3l: # If full 3-letter like "Glu"
                aa2_norm = self.three_letter_aa_map.get(aa2_3l.upper(), aa2_ext)
            elif aa2_ext.isalpha() and len(aa2_ext) == 1: # V600E -> E
                aa2_norm = aa2_ext.upper()
            # For "del", "ins", "fs", "*" keep as is (already upper by regex or doesn't matter)
            
            if aa1 and pos and aa2_norm:
                variants_found.add(f"{aa1}{pos}{aa2_norm}")
            elif pos and aa2_norm : # For cases like p.T790M where first aa is implied or not stated.
                 variants_found.add(f"{pos}{aa2_norm}")


        for match in re.finditer(short_protein_pattern, query_text):
            variant_str = f"{match.group(1).upper()}{match.group(2)}{match.group(3).upper()}"
            variants_found.add(variant_str)
            
        for match in re.finditer(exon_pattern, query_text, re.IGNORECASE):
            exon_num = match.group(1)
            change_type = ""
            if "del" in match.group(0).lower(): change_type = "DEL"
            elif "ins" in match.group(0).lower(): change_type = "INS"
            else: change_type = "MUT" # generic mutation/variant in exon
            variants_found.add(f"EXON{exon_num}{change_type}")

        for match in re.finditer(slash_pattern, query_text, re.IGNORECASE):
            aa1, pos, aa2_1, aa2_2 = match.groups()
            variants_found.add(f"{aa1.upper()}{pos}{aa2_1.upper()}")
            variants_found.add(f"{aa1.upper()}{pos}{aa2_2.upper()}")

        for match in re.finditer(general_type_pattern, query_text, re.IGNORECASE):
            # This might capture things like "Missense_Mutation" or "Nonsense mutation"
            # We should check if this matches keys in GENERAL_VARIANT_TYPE_EFFECTS_MOCK from the mock API later
            # For now, just add it. It will be passed as variant_query to mock API.
            type_name = match.group(1).replace(" ", "_") # e.g. "Missense Mutation" -> "Missense_Mutation"
            variants_found.add(type_name)


        # Fallback for 3-letter codes not perfectly caught by p.dot if they exist standalone
        three_letter_standalone_pattern = r'(?<![a-zA-Z\d])([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2})(?!\d?[a-zA-Z])'
        for match in re.finditer(three_letter_standalone_pattern, query_text):
            aa1_3l, pos, aa2_3l = match.groups()
            aa1_1l = self.three_letter_aa_map.get(aa1_3l.upper())
            aa2_1l = self.three_letter_aa_map.get(aa2_3l.upper())
            if aa1_1l and aa2_1l:
                 variants_found.add(f"{aa1_1l}{pos}{aa2_1l}")
        
        # Filter out generic terms that are too broad unless they are specific types like "Nonsense_Mutation"
        # This is a bit heuristic.
        generic_filter_terms = {"MUTATION", "VARIANT", "ALTERATION"}
        final_variants = {v for v in variants_found if v.upper() not in generic_filter_terms or "_" in v}


        return sorted(list(final_variants))


    def _determine_criterion_intent(self, query_text: str) -> Dict[str, Any]:
        """
        Determines the intent of the genomic criterion.
        Output: Dict with 'primary_intent' (e.g., 'CHECK_PRESENCE', 'CHECK_ABSENCE', 'GET_EFFECT')
                     'status_keyword' (e.g., 'ACTIVATING', 'PATHOGENIC/LOF', 'RESISTANCE', 'WILD_TYPE', 'ANY_MUTATION')
                     'is_negated' (boolean for overall query negation)
        """
        query_lower = query_text.lower()
        
        intent_details = {
            "primary_intent": "GET_EFFECT", # Default if no other strong signals
            "status_keyword": "ANY_MUTATION", # Default status to look for if not specified
            "is_negated": False
        }

        # 1. Detect overall negation (Absence of X, No X, Not X)
        # More comprehensive negation/absence detection
        absence_keywords = [
            r'\babsenc(?:e|y)\s+of\b', r'\bno\s+(?:known\s+)?', r'\bwithout\b', 
            r'\bnegative\s+for\b', r'\bnot\s+have\b', r'\bnon-mutated\b',
            r'\bshould\s+not\s+have\b', r'\bmust\s+not\s+be\b', r'\bexcludes?\s+if\b',
            r'^(?!.*presence of.*)' # Heuristic: if "presence of" is not in query, lean towards absence if other keywords match
        ]
        # Check for explicit presence keywords that might override an "absence" vibe
        presence_keywords = [r'\bpresence\s+of\b', r'\bhas\b', r'\bwith\b', r'\bpositive\s+for\b']

        # If "effect of" or "impact of" is present, it's likely a GET_EFFECT query, not presence/absence.
        if re.search(r'\b(?:effect|impact)\s+of\b', query_lower):
            intent_details["primary_intent"] = "GET_EFFECT"
        else: # Check for presence/absence signals
            is_explicitly_present = any(re.search(pk, query_lower) for pk in presence_keywords)
            is_explicitly_absent = any(re.search(ak, query_lower) for ak in absence_keywords)

            if is_explicitly_absent and not is_explicitly_present:
                intent_details["is_negated"] = True
                intent_details["primary_intent"] = "CHECK_ABSENCE"
            elif is_explicitly_present:
                intent_details["primary_intent"] = "CHECK_PRESENCE"
            # If neither, it might be an implicit presence check or effect query.
            # For now, if not "effect of" and not clearly "absence", assume "CHECK_PRESENCE" if status keywords are found.
            elif not re.search(r'\b(?:effect|impact)\s+of\b', query_lower):
                 intent_details["primary_intent"] = "CHECK_PRESENCE"


        # 2. Detect most specific status keyword
        # Priority: Activating/Pathogenic/Resistance > Wild-Type > General Mutation
        status_priority_map = {
            'ACTIVATING': self.intent_patterns['ACTIVATING_PRESENCE'],
            'PATHOGENIC/LOF': self.intent_patterns['PATHOGENIC_PRESENCE'],
            'RESISTANCE': self.intent_patterns['RESISTANCE_PRESENCE'],
            'WILD_TYPE': self.intent_patterns['WILD_TYPE'],
            'ANY_MUTATION': self.intent_patterns['MUTATION_PRESENCE'] 
        }

        for status_key, patterns in status_priority_map.items():
            if any(re.search(r'\b' + pattern + r'\b', query_lower) for pattern in patterns):
                intent_details["status_keyword"] = status_key
                # If we find a specific status, and primary_intent was default GET_EFFECT,
                # it's more likely a CHECK_PRESENCE/CHECK_ABSENCE of this status.
                if intent_details["primary_intent"] == "GET_EFFECT" and status_key != "ANY_MUTATION":
                    intent_details["primary_intent"] = "CHECK_ABSENCE" if intent_details["is_negated"] else "CHECK_PRESENCE"
                break # Found highest priority status

        # Refine primary_intent based on status_keyword if still ambiguous
        if intent_details["primary_intent"] == "GET_EFFECT" and intent_details["status_keyword"] != "ANY_MUTATION":
             # "Pathogenic BRAF V600E" is more a check for presence of pathogenic status than just "effect"
            intent_details["primary_intent"] = "CHECK_ABSENCE" if intent_details["is_negated"] else "CHECK_PRESENCE"
        
        # If query is "HER2-negative", it's WILD_TYPE and CHECK_PRESENCE (of wild-type)
        if "her2-negative" in query_lower.replace(" ", ""):
            intent_details["status_keyword"] = "WILD_TYPE"
            intent_details["primary_intent"] = "CHECK_PRESENCE" # Presence of WT
            intent_details["is_negated"] = False # Not negated overall, it's a positive statement about negativity


        logging.info(f"Determined Intent for '{query_text[:70]}...': {intent_details}")
        return intent_details


    def _classify_variant_simulated(
        self, 
        gene_symbol: str, 
        patient_variants_for_gene: List[Dict[str, Any]], 
        specific_variants_from_query: List[str], # Variants explicitly mentioned in the query text
        intent_details: Dict[str, Any]
    ) -> Tuple[List[SimulatedVEPDetail], List[str], Set[str]]:
        """
        Simulates variant classification using the mock Evo2 API.
        Processes variants based on query intent and patient data.
        Returns a list of SimulatedVEPDetail objects, errors, and found patient variants that matched query specifics.
        """
        processed_vep_details: List[SimulatedVEPDetail] = []
        errors: List[str] = []
        # Tracks specific protein changes from patient data that match a variant mentioned in the query
        matched_patient_variants_to_query_specifics: Set[str] = set()

        # Normalize variants from query for matching purposes
        normalized_query_variants = {self._normalize_variant_name(v) for v in specific_variants_from_query}
        
        query_intent_for_mock_api = intent_details.get("status_keyword")
        # If status is ANY_MUTATION, pass None or a generic intent to mock API unless it's specifically for "effect of"
        if query_intent_for_mock_api == "ANY_MUTATION" and intent_details["primary_intent"] != "GET_EFFECT":
            query_intent_for_mock_api = None # Let mock API decide based on variant type if no specific status desired
        elif intent_details["primary_intent"] == "GET_EFFECT":
            query_intent_for_mock_api = None # For "effect of", we want the raw interpretation

        # Scenario 1: Query explicitly mentions specific variants (e.g., "BRAF V600E", "effect of TP53 R248Q")
        if specific_variants_from_query:
            for query_variant_norm in normalized_query_variants:
                # This query_variant_norm is what we ask the mock API about.
                # We also check if this variant exists in the patient's data for this gene.
                patient_variant_match_data = None
                for pv_data in patient_variants_for_gene:
                    pv_protein_change = pv_data.get("protein_change")
                    if pv_protein_change and self._normalize_variant_name(pv_protein_change) == query_variant_norm:
                        patient_variant_match_data = pv_data
                        matched_patient_variants_to_query_specifics.add(query_variant_norm)
                        break
                
                variant_type_for_api = patient_variant_match_data.get("variant_type") if patient_variant_match_data else None
                
                # Call mock API for each specific variant from the query
                try:
                    mock_response = get_variant_effect_mock(
                        gene_symbol=gene_symbol,
                        variant_query=query_variant_norm, # Use the (normalized) variant from the query
                        variant_type=variant_type_for_api,
                        query_intent=query_intent_for_mock_api
                    )
                    vep_detail = SimulatedVEPDetail(**mock_response)
                    processed_vep_details.append(vep_detail)
                except Exception as e:
                    logging.error(f"Mock API error for query variant {gene_symbol} {query_variant_norm}: {e}")
                    errors.append(f"Mock API Error (query variant {query_variant_norm}): {str(e)}")
                    processed_vep_details.append(SimulatedVEPDetail(
                        input_variant_query=query_variant_norm, gene_symbol=gene_symbol,
                        simulated_classification="ERROR_MOCK_API", classification_reasoning=str(e)
                    ))

        # Scenario 2: Query is general about a gene/status (e.g., "pathogenic KRAS mutation", "any mutation in BRCA1")
        # In this case, we iterate through all of the patient's variants for that gene.
        # This also covers "effect of GENE" (no specific variant) -> interpret all patient variants in GENE.
        elif not specific_variants_from_query and patient_variants_for_gene:
            for pv_data in patient_variants_for_gene:
                pv_protein_change = pv_data.get("protein_change")
                pv_variant_type = pv_data.get("variant_type")

                # If protein_change is missing, but variant_type is informative (e.g. "Nonsense_Mutation") use that for query
                # Otherwise, if protein_change is present, it's the primary identifier for the query.
                variant_query_for_api = pv_protein_change if pv_protein_change else pv_variant_type
                if not variant_query_for_api:
                    errors.append(f"Skipping patient variant in {gene_symbol} due to missing protein_change and variant_type: {pv_data}")
                    continue

                try:
                    mock_response = get_variant_effect_mock(
                        gene_symbol=gene_symbol,
                        variant_query=variant_query_for_api,
                        variant_type=pv_variant_type, # Always pass patient's variant_type
                        query_intent=query_intent_for_mock_api 
                    )
                    vep_detail = SimulatedVEPDetail(**mock_response)
                    processed_vep_details.append(vep_detail)
                    if pv_protein_change: # If we processed based on a specific patient protein change
                         matched_patient_variants_to_query_specifics.add(self._normalize_variant_name(pv_protein_change))
                except Exception as e:
                    logging.error(f"Mock API error for patient variant {gene_symbol} {variant_query_for_api}: {e}")
                    errors.append(f"Mock API Error (patient variant {variant_query_for_api}): {str(e)}")
                    processed_vep_details.append(SimulatedVEPDetail(
                        input_variant_query=variant_query_for_api, gene_symbol=gene_symbol, protein_change=pv_protein_change,
                        simulated_classification="ERROR_MOCK_API", classification_reasoning=str(e),
                        variant_type_from_input=pv_variant_type
                    ))
        
        # Scenario 3: No specific variants in query, and patient has no variants for this gene.
        # This is relevant for "absence of mutation in GENE" or "GENE wild-type".
        # The mock API might still be called with the gene name and intent (e.g. "WILD_TYPE")
        # to get a "canonical" wild-type representation if desired.
        elif not specific_variants_from_query and not patient_variants_for_gene:
             if intent_details["primary_intent"] == "CHECK_PRESENCE" and intent_details["status_keyword"] == "WILD_TYPE":
                try: # Get a canonical "wild-type" entry for the gene
                    mock_response = get_variant_effect_mock(
                        gene_symbol=gene_symbol, variant_query="Wild_Type", # Special query
                        query_intent="benign" # Assuming WT implies benign for mock API's default
                    )
                    # Modify response to clearly state it's a WT record
                    mock_response["simulated_classification"] = "WILD_TYPE_CONFIRMED"
                    mock_response["classification_reasoning"] = f"Patient has no mutations in {gene_symbol}. Confirmed Wild-Type status."
                    mock_response["protein_change"] = None
                    mock_response["canonical_variant_id"] = f"{gene_symbol}:Wild_Type"
                    vep_detail = SimulatedVEPDetail(**mock_response)
                    processed_vep_details.append(vep_detail)
                except Exception as e:
                    errors.append(f"Mock API Error (gene wild-type call for {gene_symbol}): {str(e)}")
                    # Add placeholder if error
                    processed_vep_details.append(SimulatedVEPDetail(
                        input_variant_query="Wild_Type", gene_symbol=gene_symbol,
                        simulated_classification="ERROR_MOCK_API", classification_reasoning=str(e)
                    ))


        return processed_vep_details, errors, matched_patient_variants_to_query_specifics
        
    def _get_gene_summary_status(self, gene_symbol: str, gene_vep_details: List[SimulatedVEPDetail], intent_details: Dict) -> GeneSummaryStatus:
        """
        Determines the summary status for a single gene based on its VEP details and query intent.
        Example statuses: MET, NOT_MET, ACTIVATING_FOUND, PATHOGENIC_FOUND, WILD_TYPE, VUS_PRESENT, RESISTANCE_FOUND, etc.
        """
        
        # Priority of statuses found in patient's variants for this gene
        # (irrespective of query intent for now, just what's in the patient)
        highest_priority_classification_found = "WILD_TYPE" # Default if no variants or only benign
        classification_priorities = [
            "RESISTANCE_BY_RULE", "PREDICTED_RESISTANCE_BY_MOCK_EVO2",
            "PATHOGENIC_BY_RULE", "PREDICTED_PATHOGENIC_BY_MOCK_EVO2", "LIKELY_PATHOGENIC_BY_MOCK_EVO2",
            "ACTIVATING_BY_RULE", "PREDICTED_ACTIVATING_BY_MOCK_EVO2", # Note: Activating might be a subset of Pathogenic for some tools
            "UNCLEAR_BY_RULE", "UNCLEAR_BY_MOCK_EVO2", "PREDICTED_VUS", # VUS/Unclear
            "LIKELY_BENIGN_BY_MOCK_EVO2", "PREDICTED_BENIGN_BY_MOCK_EVO2",
            "WILD_TYPE_CONFIRMED" # Explicit WT confirmation
        ]
        
        if not gene_vep_details: # No variants processed for this gene (e.g. patient has no mutations in it)
            highest_priority_classification_found = "WILD_TYPE_CONFIRMED"
        else:
            for classification_level in classification_priorities:
                if any(detail.simulated_classification.upper().startswith(classification_level) for detail in gene_vep_details):
                    highest_priority_classification_found = classification_level
                    break
        
        # Map this highest patient variant status to a gene summary term
        gene_actual_status_term = "UNCLEAR" # Default
        if "RESISTANCE" in highest_priority_classification_found: gene_actual_status_term = "RESISTANCE_MUTATION_DETECTED"
        elif "PATHOGENIC" in highest_priority_classification_found: gene_actual_status_term = "PATHOGENIC_MUTATION_DETECTED"
        elif "ACTIVATING" in highest_priority_classification_found: gene_actual_status_term = "ACTIVATING_MUTATION_DETECTED"
        elif "UNCLEAR" in highest_priority_classification_found or "VUS" in highest_priority_classification_found: gene_actual_status_term = "VUS_DETECTED"
        elif "BENIGN" in highest_priority_classification_found: gene_actual_status_term = "BENIGN_VARIANT_DETECTED"
        elif "WILD_TYPE" in highest_priority_classification_found: gene_actual_status_term = "WILD_TYPE_CONFIRMED"

        # Now, evaluate against the query intent
        query_status_keyword = intent_details["status_keyword"] # e.g. "ACTIVATING", "PATHOGENIC/LOF", "WILD_TYPE"
        primary_intent = intent_details["primary_intent"]       # e.g. "CHECK_PRESENCE", "CHECK_ABSENCE", "GET_EFFECT"

        met_status = "UNCLEAR"
        summary_details = f"Gene {gene_symbol}: Patient's most significant variant status is '{gene_actual_status_term}'. Query intent: {primary_intent} of '{query_status_keyword}'."

        if primary_intent == "GET_EFFECT":
            # For "effect of", the status is the patient's actual status.
            met_status = gene_actual_status_term 
            summary_details += " Reporting observed effect."
        else: # CHECK_PRESENCE or CHECK_ABSENCE
            # Mapping query keywords to patient's actual status terms
            # This needs to be robust. e.g. query "pathogenic" should match patient "PATHOGENIC_MUTATION_DETECTED"
            keyword_to_actual_term_map = {
                "ACTIVATING": "ACTIVATING_MUTATION_DETECTED",
                "PATHOGENIC/LOF": "PATHOGENIC_MUTATION_DETECTED",
                "RESISTANCE": "RESISTANCE_MUTATION_DETECTED",
                "WILD_TYPE": "WILD_TYPE_CONFIRMED",
                "ANY_MUTATION": ["ACTIVATING_MUTATION_DETECTED", "PATHOGENIC_MUTATION_DETECTED", "RESISTANCE_MUTATION_DETECTED", "VUS_DETECTED"] # A list of "mutated" states
            }
            
            target_actual_term = keyword_to_actual_term_map.get(query_status_keyword)

            if target_actual_term:
                condition_met = False
                if isinstance(target_actual_term, list): # For ANY_MUTATION
                    condition_met = gene_actual_status_term in target_actual_term
                else: # For specific statuses
                    condition_met = gene_actual_status_term == target_actual_term

                if primary_intent == "CHECK_PRESENCE":
                    met_status = "MET" if condition_met else "NOT_MET"
                elif primary_intent == "CHECK_ABSENCE":
                    met_status = "MET" if not condition_met else "NOT_MET"
                summary_details += f" Criterion for {query_status_keyword} was {met_status}."
            else:
                summary_details += " Could not map query status keyword to patient's variant status for MET/NOT_MET evaluation."
                met_status = "UNCLEAR" # If query status keyword is unmappable

        return GeneSummaryStatus(status=met_status, details=summary_details)


    def _generate_clinical_significance_context(self, target_genes: List[str], final_gene_summaries: Dict[str, GeneSummaryStatus], overall_status: str) -> str:
        """Generates a brief clinical significance context string."""
        if not target_genes:
            return self.clinical_context_map["DEFAULT"].get(overall_status, "Clinical context generation failed: No target genes.")

        primary_gene = target_genes[0] # For simplicity, base context on the first gene mentioned
        gene_specific_context_map = self.clinical_context_map.get(primary_gene.upper(), self.clinical_context_map["DEFAULT"])
        
        # Try to get context based on the gene's summary status (which reflects MET/NOT_MET for the query intent)
        gene_summary = final_gene_summaries.get(primary_gene)
        
        context_key_to_try = None
        if gene_summary:
            # Example: if gene_summary.status is "MET" and query was for "ACTIVATING_MUTATION" for "EGFR"
            # we'd want to use a key like "ACTIVATING_MUTATION_TRUE" if it exists in EGFR map.
            # This requires knowing what the original query *intent* was for that gene.
            # For now, we'll use a simpler approach: use the overall status (MET/NOT_MET) or a gene default.
            
            # A more refined approach would be to map the gene_summary.status (which is query-dependent MET/NOT_MET)
            # back to a more "absolute" patient status if possible, then use that for context.
            # e.g., if query was "Absence of activating EGFR mutation" and it was MET, patient is EGFR WT (for activating muts).
            # This is complex. Let's use a simpler lookup for now.
            pass


        # Fallback strategy:
        # 1. Try gene-specific default.
        # 2. Try overall default based on MET/NOT_MET.
        # 3. Generic default.
        context = gene_specific_context_map.get("DEFAULT_CONTEXT") # Default for the specific gene
        if not context:
             context = self.clinical_context_map["DEFAULT"].get(overall_status) # Default based on overall status
        if not context:
            context = "No specific clinical context snippet available for this scenario."
            
        # Attempt to make it slightly more specific if possible
        if gene_summary and primary_gene.upper() in self.clinical_context_map:
            # Try to find a more specific context based on what was being looked for (simplified)
            # This is a placeholder for a more robust mapping.
            # For example, if the gene summary status is MET, and we know the original query was about "ACTIVATING" for this gene:
            # We could try to form a key like "ACTIVATING_MUTATION_TRUE"
            # This part needs more info from intent to be truly effective.
            # For now, just adding the gene name to the default context.
            # Let's assume the gene_summary.status already reflects if the condition (e.g. ACTIVATING_FOUND) was met or not relative to the query.
            pass


        return f"Context for {primary_gene}: {context}"


    async def run(self, genomic_query: str, patient_id: str, patient_mutations: List[Dict[str, Any]], criterion_id: str = "custom_query") -> GenomicAnalysisResult:
        logging.debug(f"[{self.name}] V1.5 Received query: '{genomic_query[:100]}...' for patient {patient_id}.")
        if not isinstance(patient_mutations, list):
            logging.error(f"[{self.name}] Expected patient_mutations to be a list, got {type(patient_mutations)}")
            return GenomicAnalysisResult(
                criterion_id=criterion_id, criterion_query=genomic_query, status="ERROR",
                evidence="Internal error: Invalid format for patient genomic data.", errors=["Invalid patient_mutations format."]
            )
        
        target_genes = self._extract_genes(genomic_query)
        specific_variants_from_query = self._extract_specific_variants(genomic_query)
        intent_details = self._determine_criterion_intent(genomic_query)

        logging.info(f"[{self.name}] Parsed Query: Target Genes={target_genes}, Specific Variants in Query={specific_variants_from_query}, Intent={intent_details}")

        if not target_genes and not specific_variants_from_query: # If query is too vague like "any mutation" without a gene.
            # However, if a variant type like "Nonsense_Mutation" was extracted as a specific_variant_from_query,
            # but no gene, it's still an issue. The mock API needs a gene.
            # Let's assume for now that if specific_variants_from_query has something like "Nonsense_Mutation",
            # the query should also have a gene. If not, it's an error/unclear.
             if not target_genes:
                logging.warning(f"[{self.name}] No target gene identified for query: {genomic_query}")
                return GenomicAnalysisResult(
                    criterion_id=criterion_id, criterion_query=genomic_query, status="UNCLEAR",
                    evidence="No specific target gene identified in the query for analysis.", 
                    errors=["No target gene identified in query."]
                )

        all_simulated_vep_details: List[SimulatedVEPDetail] = []
        all_errors: List[str] = []
        final_gene_summaries: Dict[str, GeneSummaryStatus] = {}
        
        # If target_genes is empty, but specific_variants_from_query has items,
        # it means the query might be malformed (e.g. "V600E" without "BRAF").
        # The current _classify_variant_simulated expects a gene_symbol.
        # For now, we'll proceed if there's at least one target gene.
        # If no target genes, but specific variants, result will be unclear.
        
        processed_genes = set()

        if not target_genes and specific_variants_from_query:
            all_errors.append("Query mentions specific variants but no gene context. Analysis might be incomplete or inaccurate.")
            # We could try to infer gene if variant is unique (e.g. V600E -> BRAF) but that's advanced.

        for gene_symbol in target_genes if target_genes else ["UNKNOWN_GENE_CONTEXT"]: # Loop at least once if only variants specified
            if gene_symbol == "UNKNOWN_GENE_CONTEXT" and not specific_variants_from_query:
                continue # Skip if no gene and no specific variants from query.

            processed_genes.add(gene_symbol)
            gene_specific_patient_mutations = [
                m for m in patient_mutations if m.get("hugo_gene_symbol", "").upper() == gene_symbol.upper()
            ]

            vep_details_for_gene, cls_errors, _ = self._classify_variant_simulated( # matched_patient_variants not used here directly
                gene_symbol=gene_symbol,
                patient_variants_for_gene=gene_specific_patient_mutations,
                specific_variants_from_query=specific_variants_from_query if gene_symbol != "UNKNOWN_GENE_CONTEXT" else [], # Only pass query variants if gene context exists
                intent_details=intent_details
            )
            all_simulated_vep_details.extend(vep_details_for_gene)
            all_errors.extend(cls_errors)
            
            if gene_symbol != "UNKNOWN_GENE_CONTEXT":
                 final_gene_summaries[gene_symbol] = self._get_gene_summary_status(gene_symbol, vep_details_for_gene, intent_details)

        # Determine Overall Status (MET/NOT_MET/UNCLEAR)
        overall_status = "UNCLEAR" # Default
        if not processed_genes and not specific_variants_from_query: # Nothing was analyzed
            overall_status = "UNCLEAR"
            all_errors.append("Query did not lead to any specific gene or variant analysis.")
        elif not final_gene_summaries and specific_variants_from_query and not target_genes: # e.g. "V600E" query, no gene context
             overall_status = "UNCLEAR"
             all_errors.append("Query variants analyzed without gene context, overall status unclear.")
        elif not final_gene_summaries and not specific_variants_from_query : # No genes processed effectively
            overall_status = "UNCLEAR"
            all_errors.append("No gene summaries generated.")
        else:
            # If all processed genes are MET, then overall is MET.
            # If any processed gene is NOT_MET, then overall is NOT_MET.
            # Otherwise (mix of MET/UNCLEAR, or all UNCLEAR), overall is UNCLEAR.
            status_values = [gs.status for gs in final_gene_summaries.values()]
            if not status_values: # Should be caught by previous conditions
                overall_status = "UNCLEAR"
            elif all(s == "MET" for s in status_values):
                overall_status = "MET"
            elif any(s == "NOT_MET" for s in status_values):
                overall_status = "NOT_MET"
            else: # Mix of MET/UNCLEAR, or all UNCLEAR
                overall_status = "UNCLEAR"
        
        if all_errors and overall_status != "ERROR": # If errors occurred but not critical enough to set status to ERROR
            if overall_status == "MET" or overall_status == "NOT_MET":
                overall_status = "UNCLEAR" # Downgrade to unclear if there were errors
                all_errors.append(f"Overall status changed to UNCLEAR due to non-critical errors during analysis.")


        # Build Evidence String (simplified)
        evidence_builder = [
            f"Genomic Analysis Report for query: '{genomic_query}'",
            f"Patient ID: {patient_id}",
            f"Determined Intent: {intent_details}",
            f"Target Genes: {target_genes}, Specific Variants in Query: {specific_variants_from_query}",
            "--- Simulated VEP Details ---"
        ]
        if not all_simulated_vep_details:
            evidence_builder.append("No specific variant effect predictions were generated (e.g., patient WT for gene, or error).")
        for detail in all_simulated_vep_details:
            evidence_builder.append(
                f"  Input: {detail.input_variant_query} (Gene: {detail.gene_symbol}), Type: {detail.variant_type_from_input or 'N/A'}"
            )
            evidence_builder.append(
                f"  Classified as: {detail.simulated_classification} (Consequence: {detail.predicted_consequence or 'N/A'})"
            )
            evidence_builder.append(f"  Reason: {detail.classification_reasoning}")
            if detail.simulated_tools:
                evidence_builder.append(f"  Mock Tools: SIFT -> {detail.simulated_tools.sift}, PolyPhen -> {detail.simulated_tools.polyphen}")
            if detail.mock_knowledgebases:
                evidence_builder.append(f"  Mock KB: ClinVar -> {detail.mock_knowledgebases.clinvar_significance}, OncoKB -> {detail.mock_knowledgebases.oncokb_level}")
            evidence_builder.append("  ----")
        
        evidence_builder.append("--- Gene Summaries ---")
        if not final_gene_summaries:
            evidence_builder.append("No gene-specific summaries were generated.")
        for gene, summary in final_gene_summaries.items():
            evidence_builder.append(f"Gene: {gene}, Status for criterion: {summary.status}, Details: {summary.details}")

        evidence_builder.append(f"--- Overall Query Status: {overall_status} ---")
        if all_errors:
            evidence_builder.append("--- Errors/Warnings ---")
            evidence_builder.extend(all_errors)

        self.clinical_significance_context = self._generate_clinical_significance_context(
            target_genes, final_gene_summaries, overall_status
        )

        return GenomicAnalysisResult(
            criterion_id=criterion_id,
            criterion_query=genomic_query,
            status=overall_status,
            evidence="\\n".join(evidence_builder),
            gene_summary_statuses=final_gene_summaries,
            simulated_vep_details=all_simulated_vep_details,
            clinical_significance_context=self.clinical_significance_context,
            errors=all_errors
        )

# Example of how this agent might be called (conceptual)
if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    agent = GenomicAnalystAgent()

    # Mock patient data
    mock_patient_mutations_1 = [
        {"hugo_gene_symbol": "BRAF", "protein_change": "V600E", "variant_type": "Missense_Mutation"},
        {"hugo_gene_symbol": "TP53", "protein_change": "R248Q", "variant_type": "Missense_Mutation"},
        {"hugo_gene_symbol": "EGFR", "protein_change": "L858R", "variant_type": "Missense_Mutation"},
    ]
    mock_patient_mutations_2 = [
        {"hugo_gene_symbol": "KRAS", "protein_change": "G12D", "variant_type": "Missense_Mutation"},
        {"hugo_gene_symbol": "EGFR", "protein_change": "T790M", "variant_type": "Missense_Mutation"} 
    ]
    mock_patient_mutations_3_wt_kras = [
         {"hugo_gene_symbol": "TP53", "protein_change": "P72R", "variant_type": "Missense_Mutation"},
    ]


    queries = [
        "Effect of BRAF V600E",
        "Presence of activating KRAS mutation",
        "Absence of EGFR T790M resistance mutation",
        "EGFR wild-type",
        "Pathogenic mutation in TP53",
        "Nonsense_Mutation in BRCA1", # Patient has no BRCA1
        "Impact of PIK3CA H1047R", # Patient has no PIK3CA
        "ERBB2 negative", # HER2-negative
        "ALK mutation" # Patient no ALK
    ]

    print("\\n--- Testing with Patient 1 (BRAF V600E, TP53 R248Q, EGFR L858R) ---")
    for q in queries:
        print(f"\\n--- Query: {q} ---")
        result = agent.run(genomic_query=q, patient_id="PAT123", patient_mutations=mock_patient_mutations_1)
        print(f"Status: {result.status}")
        print(f"Gene Summaries: {result.gene_summary_statuses}")
        print(f"Clinical Context: {result.clinical_significance_context}")
        if result.errors: print(f"Errors: {result.errors}")
        # print(f"VEP Details: {result.simulated_vep_details}")
        # print(f"Evidence: \\n{result.evidence}")


    print("\\n\\n--- Testing with Patient 2 (KRAS G12D, EGFR T790M) ---")
    for q in queries:
        print(f"\\n--- Query: {q} ---")
        result = agent.run(genomic_query=q, patient_id="PAT456", patient_mutations=mock_patient_mutations_2)
        print(f"Status: {result.status}")
        print(f"Gene Summaries: {result.gene_summary_statuses}")
        print(f"Clinical Context: {result.clinical_significance_context}")
        if result.errors: print(f"Errors: {result.errors}")

    print("\\n\\n--- Testing with Patient 3 (TP53 P72R - effectively WT for KRAS) ---")
    kras_queries = [
        "KRAS wild-type",
        "Absence of KRAS G12C",
        "Activating KRAS mutation"
    ]
    for q in kras_queries:
        print(f"\\n--- Query: {q} ---")
        result = agent.run(genomic_query=q, patient_id="PAT789", patient_mutations=mock_patient_mutations_3_wt_kras)
        print(f"Status: {result.status}")
        print(f"Gene Summaries: {result.gene_summary_statuses}")
        print(f"Clinical Context: {result.clinical_significance_context}")
        if result.errors: print(f"Errors: {result.errors}") 
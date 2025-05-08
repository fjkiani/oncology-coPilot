from typing import Dict, Any, List, Tuple, Optional
import logging
import re # Import regex

# Attempt to import the interface, handle if not found for now
try:
    from ..core.agent_interface import AgentInterface
except ImportError:
    logging.warning("AgentInterface not found. Using dummy class.")
    class AgentInterface:
        pass

class GenomicAnalystAgent(AgentInterface):
    """Agent specializing in analyzing genomic criteria using simulated VEP logic."""

    @property
    def name(self) -> str:
        return "GenomicAnalystAgent"

    @property
    def description(self) -> str:
        return "Analyzes genomic criteria by simulating variant effect prediction based on mock patient data and clinical interpretations."

    def __init__(self):
        self.api_client = None 
        logging.info(f"[{self.name}] Initialized (V1 - Rule-Based Simulation). API client placeholder set.")
        
        self.known_genes = ["PIK3CA", "KRAS", "TP53", "BRCA1", "BRCA2", "AKT", "AKT1", "AKT2", "AKT3", "EGFR", "BRAF", "HER2"]
        
        self.intent_patterns = {
            'ACTIVATING_PRESENCE': [r'activating', r'oncogenic'],
            'PATHOGENIC_PRESENCE': [r'pathogenic', r'deleterious', r'loss[- ]of[- ]function', r'lof'],
            'RESISTANCE_ABSENCE': [r'absence of resistance', r'no resistance'],
            'RESISTANCE_PRESENCE': [r'resistance mutation'],
            'WILD_TYPE': [r'wild[- ]?type', r'wt', r'absence of mutation', r'no mutation', r'negative for mutation', r'unmutated'],
            'MUTATION_PRESENCE': [r'mutation', r'variant', r'alteration'],
        }

        # Task 3.1.3 (Rule-Based VEP Logic) & 3.3.2 (Known variant lookup)
        self.known_variant_classifications: Dict[str, Dict[str, Tuple[str, str]]] = {
            "BRAF": {
                "V600E": ("PREDICTED_ACTIVATING", "Known activating mutation BRAF V600E")
            },
            "EGFR": {
                "T790M": ("PREDICTED_RESISTANCE", "Known resistance mutation EGFR T790M"),
                "L858R": ("PREDICTED_ACTIVATING", "Known activating mutation EGFR L858R"),
                # Add common exon deletions/insertions if they have fixed classifications
                "EXON19DEL": ("PREDICTED_ACTIVATING", "Common activating EGFR exon 19 deletion"),
                "EXON20INS": ("PREDICTED_RESISTANCE", "Common EGFR exon 20 insertion conferring resistance to some TKIs")
            },
            "KRAS": {
                "G12C": ("PREDICTED_ACTIVATING", "Known activating mutation KRAS G12C"),
                "G12D": ("PREDICTED_ACTIVATING", "Known activating mutation KRAS G12D"),
                "G13D": ("PREDICTED_ACTIVATING", "Known activating mutation KRAS G13D"),
            }
            # Add more known classifications here
        }

        # Mapping for variant types to simulated classification and rationale
        self.variant_type_rules: Dict[str, Tuple[str, str]] = {
            "Frame_Shift_Del": ("PREDICTED_PATHOGENIC/LOF", "Rule: Frameshift deletion often leads to loss of function."),
            "Frame_Shift_Ins": ("PREDICTED_PATHOGENIC/LOF", "Rule: Frameshift insertion often leads to loss of function."),
            "Nonsense_Mutation": ("PREDICTED_PATHOGENIC/LOF", "Rule: Nonsense mutation introduces premature stop codon."),
            "Splice_Site": ("PREDICTED_PATHOGENIC/LOF", "Rule: Splice site mutation can disrupt mRNA processing."),
            "In_Frame_Del": ("PREDICTED_VUS", "Rule: In-frame deletion, impact uncertain without more context."), # Could be pathogenic
            "In_Frame_Ins": ("PREDICTED_VUS", "Rule: In-frame insertion, impact uncertain without more context."), # Could be pathogenic
            "Missense_Mutation": ("PREDICTED_VUS", "Rule: Missense mutation, functional impact varies."),
            # Add other variant types as needed: Translation_Start_Site, Nonstop_Mutation etc.
        }

    def _extract_genes(self, query_text: str) -> List[str]:
        found_genes = set()
        query_upper = query_text.upper()
        for gene in self.known_genes:
            pattern = r'\b' + re.escape(gene) + r'(?![a-zA-Z0-9])'
            if re.search(pattern, query_upper):
                found_genes.add(gene)
        return sorted(list(found_genes))

    def _extract_specific_variants(self, query_text: str) -> List[str]:
        variants_found = []
        protein_pattern = r'[pP]\.\)?(?:[A-Z][a-z]{2})?([A-Z])(\d+)([A-Z*])'
        short_protein_pattern = r'(?<![a-zA-Z])([A-Z])(\d+)([A-Z*])(?![a-zA-Z])'
        exon_pattern = r'exon\s*(\d+)\s*(?:deletion|del|insertion|ins)\b'
        
        for match in re.finditer(protein_pattern, query_text):
             # Normalize to simple form like V600E for lookup
             aa1, pos, aa2 = match.groups()[-3:] # Get the capturing groups for AA1, POS, AA2
             variants_found.append(f"{aa1}{pos}{aa2}")
        for match in re.finditer(short_protein_pattern, query_text):
             variants_found.append(match.group(0))
        for match in re.finditer(exon_pattern, query_text, re.IGNORECASE):
            # Normalize exon changes to a consistent key, e.g., EXON19DEL
            exon_num = match.group(1)
            change_type = "DEL" if "del" in match.group(0).lower() else "INS"
            variants_found.append(f"EXON{exon_num}{change_type}")
            
        return list(set(variants_found))

    def _determine_criterion_intent(self, query_text: str) -> Dict[str, Any]:
        query_lower = query_text.lower()
        intent = {
            'required_status': 'ANY_MUTATION',
            'presence_required': True
        }
        absence_keywords = ['absence', 'no known', 'without', 'negative for']
        if any(keyword in query_lower for keyword in absence_keywords):
            intent['presence_required'] = False
        
        for status_key, keywords in self.intent_patterns.items():
            if any(re.search(r'\b' + keyword + r'\b', query_lower) for keyword in keywords):
                if 'ACTIVATING' in status_key:
                    intent['required_status'] = 'ACTIVATING'
                elif 'PATHOGENIC' in status_key:
                     intent['required_status'] = 'PATHOGENIC/LOF'
                elif 'RESISTANCE' in status_key:
                     intent['required_status'] = 'RESISTANCE'
                elif 'WILD_TYPE' in status_key:
                     intent['required_status'] = 'WILD_TYPE'
                     if not intent['presence_required']:
                         intent['required_status'] = 'ANY_MUTATION'
                         intent['presence_required'] = True 
                     else:
                          intent['presence_required'] = True 
                elif 'MUTATION_PRESENCE' in status_key:
                    pass 
                
                if intent['required_status'] != 'WILD_TYPE' and not intent['presence_required']:
                    pass 
                elif intent['required_status'] != 'WILD_TYPE' and intent['presence_required']:
                    pass 
                logging.debug(f"Determined intent status '{intent['required_status']}' based on keywords: {keywords}")
                break 
        
        if not intent['presence_required'] and intent['required_status'] == 'ANY_MUTATION':
             intent['required_status'] = 'WILD_TYPE'
             intent['presence_required'] = True
             logging.debug("Adjusted intent to WILD_TYPE based on absence keywords.")

        logging.info(f"Determined Intent: {intent}")
        return intent

    # Task 3.3.1: Implement _classify_variant_simulated
    def _classify_variant_simulated(self, gene_symbol: str, variant_data: Dict[str, Any]) -> Tuple[str, str]:
        """Classifies a given variant based on predefined rules.

        Args:
            gene_symbol: The HUGO gene symbol.
            variant_data: A dictionary representing the mutation, expected to have
                          'protein_change' and 'variant_type'.

        Returns:
            A tuple: (simulated_classification_string, classification_rationale_string)
        """
        protein_change_raw = variant_data.get('protein_change', '')
        variant_type = variant_data.get('variant_type', '')
        gene_upper = gene_symbol.upper()

        # Normalize protein_change for lookup (e.g., p.V600E -> V600E)
        # More robust normalization might be needed for complex changes
        protein_change_normalized = protein_change_raw
        if protein_change_normalized and protein_change_normalized.startswith("p."):
            protein_change_normalized = protein_change_normalized[2:]

        # 1. Check known specific variant classifications (highest precedence)
        if gene_upper in self.known_variant_classifications:
            gene_specific_rules = self.known_variant_classifications[gene_upper]
            if protein_change_normalized in gene_specific_rules:
                return gene_specific_rules[protein_change_normalized]
            # Check for normalized exon changes if protein_change is not specific enough
            # This assumes protein_change_normalized might already be an EXON string like "EXON19DEL"
            # if such normalizations are done by the caller or if variant_data could contain it.
            # For now, _extract_specific_variants normalizes it, so this lookup should work if query contained it.
            if protein_change_raw in gene_specific_rules: # Check raw if it matches EXON19DEL etc.
                return gene_specific_rules[protein_change_raw]

        # 2. Apply rules based on variant_type
        if variant_type in self.variant_type_rules:
            return self.variant_type_rules[variant_type]

        # 3. Default classification if no specific rules matched
        logging.debug(f"No specific rule matched for {gene_upper} {protein_change_raw} ({variant_type}). Defaulting.")
        return ("PREDICTED_BENIGN/UNCLEAR", "Default: No specific pathogenic/activating/resistance rule matched.")

    async def run(self, genomic_query: str, patient_genomic_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        logging.debug(f"[{self.name}] Received query: '{genomic_query[:100]}...' for V1 rule-based simulation.")
        if not isinstance(patient_genomic_data, list):
             logging.error(f"[{self.name}] Expected patient_genomic_data to be a list of mutations, got {type(patient_genomic_data)}")
             return {"status": "ERROR", "evidence": "Internal error: Invalid format for patient genomic data.", "simulated_vep_details": []}
             
        logging.debug(f"[{self.name}] Patient genomic mutation records received: {len(patient_genomic_data)}")
        
        target_genes = self._extract_genes(genomic_query)
        # Also extract specific variants mentioned in the query itself, which might guide interpretation or matching
        # query_mentioned_variants = self._extract_specific_variants(genomic_query) 
        # For V1, we mainly focus on classifying patient's variants. Query variants might be used later.

        criterion_intent = self._determine_criterion_intent(genomic_query)
        logging.info(f"[{self.name}] Parsed Query: Target Genes={target_genes}, Intent={criterion_intent}")

        if not target_genes:
            logging.warning(f"[{self.name}] Could not identify target gene in query: {genomic_query}")
            return {
                "status": "UNCLEAR",
                "evidence": "Could not identify a specific target gene in the criterion text for analysis.",
                "simulated_vep_details": []
            }
            
        simulated_vep_details = []
        all_genes_assessed_status = {} # To track overall status for each gene

        for gene_symbol in target_genes:
            gene_upper = gene_symbol.upper()
            found_variants_for_gene = [
                mut for mut in patient_genomic_data 
                if mut.get('hugo_gene_symbol', '').upper() == gene_upper
            ]
            
            gene_classifications = []
            if not found_variants_for_gene:
                # No mutation found for this gene in patient data
                # This implies WILD_TYPE status for this gene *if* the criterion allows/requires it.
                classification = "WILD_TYPE"
                rationale = "No mutation found in patient data for this gene."
                simulated_vep_details.append({
                    "gene_symbol": gene_symbol,
                    "variant_identified": "None (Wild-Type)",
                    "simulated_classification": classification,
                    "classification_reasoning": rationale
                })
                gene_classifications.append(classification)
            else:
                for variant in found_variants_for_gene:
                    classification, rationale = self._classify_variant_simulated(gene_symbol, variant)
                    simulated_vep_details.append({
                        "gene_symbol": gene_symbol,
                        "variant_identified": variant.get('protein_change', 'N/A'), # Or other relevant variant field
                        "simulated_classification": classification,
                        "classification_reasoning": rationale,
                        "raw_mutation_data": variant
                    })
                    gene_classifications.append(classification)
            
            # Determine the overall status for this specific gene based on its variants and intent
            # This is a simplified aggregation for the gene. Complex scenarios might need more logic.
            if not gene_classifications: # Should be handled by 'not found_variants_for_gene' but as a safeguard
                all_genes_assessed_status[gene_symbol] = 'WILD_TYPE' 
            elif any(c == 'PREDICTED_ACTIVATING' for c in gene_classifications):
                all_genes_assessed_status[gene_symbol] = 'ACTIVATING_FOUND'
            elif any(c == 'PREDICTED_PATHOGENIC/LOF' for c in gene_classifications):
                all_genes_assessed_status[gene_symbol] = 'PATHOGENIC_FOUND'
            elif any(c == 'PREDICTED_RESISTANCE' for c in gene_classifications):
                all_genes_assessed_status[gene_symbol] = 'RESISTANCE_FOUND'
            elif all(c == 'WILD_TYPE' for c in gene_classifications): # All variants were benign, or no variants
                all_genes_assessed_status[gene_symbol] = 'WILD_TYPE'
            elif any(c == 'PREDICTED_VUS' for c in gene_classifications):
                all_genes_assessed_status[gene_symbol] = 'VUS_PRESENT' # Has at least one VUS
            else: # Benign or unclear findings only
                all_genes_assessed_status[gene_symbol] = 'BENIGN/UNCLEAR_ONLY'

        # --- Determine Overall MET/NOT_MET Status based on all_genes_assessed_status and criterion_intent --- #
        final_status = "UNCLEAR"
        met_conditions_for_all_genes = True

        if not target_genes: # Should have been caught earlier
            final_status = "UNCLEAR"
            met_conditions_for_all_genes = False
        else:
            for gene_symbol in target_genes:
                gene_status_summary = all_genes_assessed_status.get(gene_symbol, 'WILD_TYPE') # Default to WT if somehow missed
                required_status = criterion_intent['required_status']
                presence_required = criterion_intent['presence_required']
                gene_met_criterion = False

                if required_status == 'ACTIVATING':
                    gene_met_criterion = (gene_status_summary == 'ACTIVATING_FOUND' and presence_required) or \
                                       (gene_status_summary != 'ACTIVATING_FOUND' and not presence_required)
                elif required_status == 'PATHOGENIC/LOF':
                    gene_met_criterion = (gene_status_summary == 'PATHOGENIC_FOUND' and presence_required) or \
                                       (gene_status_summary != 'PATHOGENIC_FOUND' and not presence_required) 
                elif required_status == 'RESISTANCE':
                    gene_met_criterion = (gene_status_summary == 'RESISTANCE_FOUND' and presence_required) or \
                                       (gene_status_summary != 'RESISTANCE_FOUND' and not presence_required)
                elif required_status == 'WILD_TYPE':
                     # presence_required for WILD_TYPE means gene must be WILD_TYPE
                     # not presence_required for WILD_TYPE means gene must NOT be WILD_TYPE (i.e., any mutation)
                    gene_met_criterion = (gene_status_summary == 'WILD_TYPE' and presence_required) or \
                                       (gene_status_summary != 'WILD_TYPE' and not presence_required) 
                elif required_status == 'ANY_MUTATION': # Requires presence of ANY non-benign, non-VUS classified mutation
                    is_mutated = gene_status_summary in ['ACTIVATING_FOUND', 'PATHOGENIC_FOUND', 'RESISTANCE_FOUND'] # VUS not included here
                    gene_met_criterion = (is_mutated and presence_required) or (not is_mutated and not presence_required)
                
                if not gene_met_criterion:
                    met_conditions_for_all_genes = False
                    break
        
        if met_conditions_for_all_genes and target_genes:
            final_status = "MET"
        elif not met_conditions_for_all_genes and target_genes:
            final_status = "NOT_MET"
        # Else, remains UNCLEAR (e.g. no target genes identified)

        evidence_lines = [f"Genomic Analysis Simulation Report for query: '{genomic_query}'"]
        evidence_lines.append(f"Criterion Intent Determined: Required Status='{criterion_intent['required_status']}', Presence Required={criterion_intent['presence_required']}")
        evidence_lines.append(f"Target Gene(s) Analyzed: {', '.join(target_genes) if target_genes else 'None Identified'}")
        evidence_lines.append("Simulated Findings per Variant:")
        for detail in simulated_vep_details:
            evidence_lines.append(f"- Gene: {detail['gene_symbol']}, Variant: {detail['variant_identified']}, Simulated Classification: {detail['simulated_classification']} ({detail['classification_reasoning']})")
        evidence_lines.append("Gene-Level Assessed Status:")
        for gene, status_summary in all_genes_assessed_status.items():
            evidence_lines.append(f"- Gene: {gene}, Summary: {status_summary}")
        evidence_lines.append(f"Overall Status for Criterion: {final_status}")
             
        final_evidence = "\n".join(evidence_lines)
        logging.info(f"[{self.name}] Simulation complete. Final Status: {final_status} for query '{genomic_query}'. Assessed gene statuses: {all_genes_assessed_status}")

        return {
            "status": final_status,
            "evidence": final_evidence,
            "simulated_vep_details": simulated_vep_details,
            "gene_summary_statuses": all_genes_assessed_status
        } 
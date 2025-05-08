"""
Mock API for simulating responses from an Evo2-like Variant Effect Predictor.
For V1.5 development of the GenomicAnalystAgent.
"""
from typing import Dict, Any, Optional
import random # For generating mock scores
import re

# More structured known variant classifications
# Now includes mock predictive scores and knowledgebase entries
KNOWN_VARIANT_CLASSIFICATIONS = {
    "BRAF": {
        "V600E": {
            "classification": "PATHOGENIC_BY_RULE",
            "reasoning": "BRAF V600E is a well-known activating mutation targeted by multiple therapies.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)",
            "polyphen": "probably_damaging (mock)",
            "clinvar": "Pathogenic (mock)",
            "oncokb": "Level 1 (mock)",
        },
        "V600K": {
            "classification": "PATHOGENIC_BY_RULE",
            "reasoning": "BRAF V600K is a known activating mutation.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)",
            "polyphen": "probably_damaging (mock)",
            "clinvar": "Pathogenic (mock)",
            "oncokb": "Level 1 (mock)",
        }
    },
    "EGFR": {
        "L858R": {
            "classification": "PATHOGENIC_BY_RULE",
            "reasoning": "EGFR L858R is a common activating mutation in lung cancer.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)",
            "polyphen": "probably_damaging (mock)",
            "clinvar": "Pathogenic (mock)",
            "oncokb": "Level A2 (mock)", # Example, might differ
        },
        "T790M": {
            "classification": "RESISTANCE_BY_RULE",
            "reasoning": "EGFR T790M is a common resistance mutation to EGFR inhibitors.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)", # Assuming it's deleterious to drug binding
            "polyphen": "possibly_damaging (mock)",
            "clinvar": "Pathogenic (mock)", # In the context of resistance
            "oncokb": "Resistance (mock)",
        }
    },
    "TP53": {
        "R248Q": {
            "classification": "PATHOGENIC_BY_RULE",
            "reasoning": "TP53 R248Q is a known hotspot oncogenic mutation.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)",
            "polyphen": "probably_damaging (mock)",
            "clinvar": "Pathogenic (mock)",
            "oncokb": "Likely Oncogenic (mock)",
        },
        "P72R": { # Example of a potentially more common, less impactful variant
            "classification": "UNCLEAR_BY_RULE", # Or VUS_BY_RULE
            "reasoning": "TP53 P72R is a common polymorphism with unclear clinical significance in many contexts.",
            "consequence": "missense_variant",
            "sift": "tolerated (mock)",
            "polyphen": "benign (mock)",
            "clinvar": "Benign/Likely_Benign (mock)",
            "oncokb": "N/A (mock)",
        }
    },
    "KRAS": {
        "G12C": {
            "classification": "PATHOGENIC_BY_RULE",
            "reasoning": "KRAS G12C is an oncogenic mutation with targeted therapies available.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)",
            "polyphen": "probably_damaging (mock)",
            "clinvar": "Pathogenic (mock)",
            "oncokb": "Level 2B (mock)",
        },
         "G12D": {
            "classification": "PATHOGENIC_BY_RULE",
            "reasoning": "KRAS G12D is a common oncogenic mutation.",
            "consequence": "missense_variant",
            "sift": "deleterious (mock)",
            "polyphen": "probably_damaging (mock)",
            "clinvar": "Pathogenic (mock)",
            "oncokb": "Likely Oncogenic (mock)",
        }
    },
    "DEFAULT_PATHOGENIC": { # Generic response for "pathogenic" queries if specific variant unknown
        "classification": "PREDICTED_PATHOGENIC_BY_MOCK_EVO2",
        "reasoning": "Mock Evo2 simulation based on query intent (pathogenic). Specific evidence not found in mock DB.",
        "consequence": "unknown",
        "sift": "unknown (mock)",
        "polyphen": "unknown (mock)",
        "clinvar": "Uncertain significance (mock)",
        "oncokb": "N/A (mock)",
    },
    "DEFAULT_BENIGN": {
        "classification": "PREDICTED_BENIGN_BY_MOCK_EVO2",
        "reasoning": "Mock Evo2 simulation based on query intent (benign). Specific evidence not found in mock DB.",
        "consequence": "unknown",
        "sift": "tolerated (mock)", # Assuming default benign aligns with tolerated
        "polyphen": "benign (mock)",
        "clinvar": "Benign (mock)",
        "oncokb": "N/A (mock)",
    },
    "DEFAULT_VUS": {
        "classification": "UNCLEAR_BY_MOCK_EVO2", # Changed from PREDICTED_VUS
        "reasoning": "Mock Evo2 simulation: variant significance is unclear or not found in mock DB.",
        "consequence": "unknown",
        "sift": "unknown (mock)",
        "polyphen": "unknown (mock)",
        "clinvar": "Uncertain significance (mock)",
        "oncokb": "N/A (mock)",
    }
}

# More detailed general variant type effects for the mock API
GENERAL_VARIANT_TYPE_EFFECTS_MOCK = {
    "Nonsense_Mutation": {
        "classification": "LIKELY_PATHOGENIC_BY_MOCK_EVO2", # Often disruptive
        "reasoning": "Nonsense mutations typically lead to truncated proteins, often causing loss of function.",
        "consequence": "nonsense",
        "sift": "deleterious (mock)",
        "polyphen": "probably_damaging (mock)",
        "clinvar": "Likely Pathogenic (mock general)",
        "oncokb": "Likely Oncogenic (mock general)",
    },
    "Frameshift_Variant": { # Covers Frame_Shift_Del and Frame_Shift_Ins
        "classification": "LIKELY_PATHOGENIC_BY_MOCK_EVO2", # Often highly disruptive
        "reasoning": "Frameshift mutations alter the reading frame, usually resulting in a non-functional protein.",
        "consequence": "frameshift_variant",
        "sift": "deleterious (mock)",
        "polyphen": "probably_damaging (mock)",
        "clinvar": "Likely Pathogenic (mock general)",
        "oncokb": "Likely Oncogenic (mock general)",
    },
    "Splice_Site": { # Covers Splice_Site_SNP, Splice_Site_Del, Splice_Site_Ins
        "classification": "LIKELY_PATHOGENIC_BY_MOCK_EVO2", # Often disruptive
        "reasoning": "Splice site mutations can lead to aberrant splicing and non-functional proteins.",
        "consequence": "splice_acceptor_variant or splice_donor_variant", # Could be more specific
        "sift": "deleterious (mock)",
        "polyphen": "probably_damaging (mock)",
        "clinvar": "Likely Pathogenic (mock general)",
        "oncokb": "Likely Oncogenic (mock general)",
    },
    "Missense_Mutation": { # Default for missense if not specifically known
        "classification": "UNCLEAR_BY_MOCK_EVO2", # Missense effects are highly variable
        "reasoning": "The impact of a missense mutation is variable and requires specific evidence for classification.",
        "consequence": "missense_variant",
        "sift": "unknown (mock)",
        "polyphen": "unknown (mock)",
        "clinvar": "Uncertain significance (mock general)",
        "oncokb": "N/A (mock general)",
    },
    "In_Frame_Del": { # In-frame deletions
        "classification": "UNCLEAR_BY_MOCK_EVO2", # Effect can vary
        "reasoning": "In-frame deletions remove amino acids without changing the reading frame; impact is variable.",
        "consequence": "inframe_deletion",
        "sift": "unknown (mock)",
        "polyphen": "unknown (mock)",
        "clinvar": "Uncertain significance (mock general)",
        "oncokb": "N/A (mock general)",
    },
     "In_Frame_Ins": { # In-frame insertions
        "classification": "UNCLEAR_BY_MOCK_EVO2", # Effect can vary
        "reasoning": "In-frame insertions add amino acids without changing the reading frame; impact is variable.",
        "consequence": "inframe_insertion",
        "sift": "unknown (mock)",
        "polyphen": "unknown (mock)",
        "clinvar": "Uncertain significance (mock general)",
        "oncokb": "N/A (mock general)",
    },
    # Add other general types if needed, e.g., Silent, 5'UTR, 3'UTR
    "Silent": {
        "classification": "LIKELY_BENIGN_BY_MOCK_EVO2",
        "reasoning": "Silent mutations do not change the amino acid sequence, generally considered benign.",
        "consequence": "synonymous_variant",
        "sift": "tolerated (mock)",
        "polyphen": "benign (mock)",
        "clinvar": "Benign (mock general)",
        "oncokb": "N/A (mock general)",
    },
     "DEFAULT": { # Fallback for unknown variant types
        "classification": "UNCLEAR_BY_MOCK_EVO2",
        "reasoning": "Variant type effect not specifically modeled in Mock Evo2.",
        "consequence": "unknown",
        "sift": "unknown (mock)",
        "polyphen": "unknown (mock)",
        "clinvar": "Uncertain significance (mock general)",
        "oncokb": "N/A (mock general)",
    }
}

def get_variant_effect_mock(gene_symbol: str, variant_query: str, variant_type: Optional[str] = None, query_intent: Optional[str] = None):
    """
    Simulates a call to an Evo2-like API for variant effect prediction.
    Returns a more structured dictionary with detailed mock information.

    Args:
        gene_symbol: The gene symbol (e.g., "BRAF").
        variant_query: The variant information (e.g., "V600E", "p.V600E", "c.1799T>A").
                       Can also be a general type like "Nonsense_Mutation".
        variant_type: The type of variant from MAF/VCF if available (e.g., "Missense_Mutation", "Nonsense_Mutation").
                      This helps in classifying generic types if specific variant is not in KNOWN_VARIANT_CLASSIFICATIONS.
        query_intent: An optional parameter indicating the desired outcome from the query
                      (e.g., "pathogenic", "benign"). Used for fallback if variant is unknown.

    Returns:
        A dictionary containing the simulated VEP details.
    """
    # Normalize protein change format if present (e.g., p.V600E -> V600E)
    protein_change_match = re.match(r"^[pP]\\.([A-Za-z0-9*]+)$", variant_query)
    normalized_variant_query = protein_change_match.group(1) if protein_change_match else variant_query
    
    data_source = "BeatCancer_MockEvo2_v1.5.1" # Versioning this mock

    base_response = {
        "input_variant_query": variant_query,
        "gene_symbol": gene_symbol,
        "protein_change": normalized_variant_query if not variant_query.endswith(("_Mutation", "_Variant")) and not variant_query == "Splice_Site" else None, # Store normalized p. change
        "canonical_variant_id": f"{gene_symbol}:p.{normalized_variant_query}" if protein_change_match else f"{gene_symbol}:{variant_query}",
        "variant_type_from_input": variant_type,
        "data_source": data_source,
        # Default values, to be overridden
        "simulated_classification": "UNCLEAR_BY_MOCK_EVO2",
        "classification_reasoning": "Variant not found in mock DB and no clear type/intent match.",
        "predicted_consequence": "unknown",
        "simulated_tools": {"sift": "unknown (mock)", "polyphen": "unknown (mock)"},
        "mock_knowledgebases": {"clinvar_significance": "Uncertain significance (mock)", "oncokb_level": "N/A (mock)"}
    }

    # 1. Check known specific variants
    if gene_symbol in KNOWN_VARIANT_CLASSIFICATIONS and \
       normalized_variant_query in KNOWN_VARIANT_CLASSIFICATIONS[gene_symbol]:
        details = KNOWN_VARIANT_CLASSIFICATIONS[gene_symbol][normalized_variant_query]
        base_response.update({
            "simulated_classification": details["classification"],
            "classification_reasoning": details["reasoning"],
            "predicted_consequence": details.get("consequence", "unknown"),
            "simulated_tools": {
                "sift": details.get("sift", "unknown (mock)"),
                "polyphen": details.get("polyphen", "unknown (mock)")
            },
            "mock_knowledgebases": {
                "clinvar_significance": details.get("clinvar", "Uncertain significance (mock)"),
                "oncokb_level": details.get("oncokb", "N/A (mock)")
            }
        })
        # Ensure protein_change is correctly set for specific variant matches
        base_response["protein_change"] = normalized_variant_query
        base_response["canonical_variant_id"] = f"{gene_symbol}:p.{normalized_variant_query}"
        return base_response

    # 2. Check general variant types (if specific variant not found or query is a type)
    type_to_check = None
    # Handle if variant_query itself is a general type name (e.g. "Nonsense_Mutation")
    # or if variant_type (from patient data) indicates a general type.
    # Prioritize explicit query if it matches a general type name.
    if variant_query in GENERAL_VARIANT_TYPE_EFFECTS_MOCK:
        type_to_check = variant_query
    elif variant_type:
        if variant_type in GENERAL_VARIANT_TYPE_EFFECTS_MOCK:
            type_to_check = variant_type
        elif "Frame_Shift" in variant_type:
            type_to_check = "Frameshift_Variant"
        elif "Splice_Site" in variant_type: # Covers Splice_Site_SNP, Splice_Site_Del, Splice_Site_Ins etc.
            type_to_check = "Splice_Site"
        # Add more general mappings if necessary, e.g. for In_Frame_Ins, In_Frame_Del if they are not direct keys

    if type_to_check and type_to_check in GENERAL_VARIANT_TYPE_EFFECTS_MOCK:
        details = GENERAL_VARIANT_TYPE_EFFECTS_MOCK[type_to_check]
        base_response.update({
            "simulated_classification": details["classification"],
            "classification_reasoning": details["reasoning"],
            "predicted_consequence": details.get("consequence", base_response["predicted_consequence"]), # Keep "unknown" if not specified
            "simulated_tools": {
                "sift": details.get("sift", base_response["simulated_tools"]["sift"]),
                "polyphen": details.get("polyphen", base_response["simulated_tools"]["polyphen"])
            },
            "mock_knowledgebases": {
                "clinvar_significance": details.get("clinvar", base_response["mock_knowledgebases"]["clinvar_significance"]),
                "oncokb_level": details.get("oncokb", base_response["mock_knowledgebases"]["oncokb_level"])
            }
        })
        # If the original query was just a type, or if it's a general classification
        # protein_change should be None and canonical_variant_id should reflect the type.
        base_response["protein_change"] = None
        base_response["canonical_variant_id"] = f"{gene_symbol}:{type_to_check}"
        return base_response
    
    # 3. Use query_intent as a fallback if no specific match and not a general type match
    intent_reasoning_prefix = "Mock Evo2 simulation based on query intent"
    if query_intent:
        default_details_key = None
        if query_intent == "pathogenic":
            default_details_key = "DEFAULT_PATHOGENIC"
        elif query_intent == "benign":
            default_details_key = "DEFAULT_BENIGN"
        # Add other intents like "resistance", "activating" if needed and map to a default VUS or specific default.
        
        if default_details_key and default_details_key in KNOWN_VARIANT_CLASSIFICATIONS:
            details = KNOWN_VARIANT_CLASSIFICATIONS[default_details_key]
            base_response.update({
                "simulated_classification": details["classification"],
                "classification_reasoning": f"{intent_reasoning_prefix} ('{query_intent}'). {details['reasoning']}",
                "predicted_consequence": details.get("consequence", base_response["predicted_consequence"]),
                "simulated_tools": {
                    "sift": details.get("sift", base_response["simulated_tools"]["sift"]),
                    "polyphen": details.get("polyphen", base_response["simulated_tools"]["polyphen"])
                },
                "mock_knowledgebases": {
                    "clinvar_significance": details.get("clinvar", base_response["mock_knowledgebases"]["clinvar_significance"]),
                    "oncokb_level": details.get("oncokb", base_response["mock_knowledgebases"]["oncokb_level"])
                }
            })
            # For intent-based, protein_change is not applicable from the query itself
            base_response["protein_change"] = None 
            base_response["canonical_variant_id"] = f"{gene_symbol}:IntentBasedQuery-{query_intent}"
            return base_response

    # 4. If still no match, use the default VUS / Unclear
    # Decide if it's an unknown specific variant (use DEFAULT_VUS from KNOWN_VARIANT_CLASSIFICATIONS)
    # or an unrecognized general type (use DEFAULT from GENERAL_VARIANT_TYPE_EFFECTS_MOCK)
    
    # Heuristic: if variant_query contains typical protein change patterns (letters and numbers)
    # or was normalized from p. notation, it's likely an attempt at a specific variant.
    is_likely_specific_variant_attempt = bool(protein_change_match or re.search(r"[A-Za-z]\d+[A-Za-z*]$", normalized_variant_query))

    if is_likely_specific_variant_attempt:
        final_default_details = KNOWN_VARIANT_CLASSIFICATIONS["DEFAULT_VUS"]
        # protein_change and canonical_variant_id are already set from initial base_response for specific variants
    else: # Likely an unrecognized general type query or other non-specific query
        final_default_details = GENERAL_VARIANT_TYPE_EFFECTS_MOCK["DEFAULT"]
        base_response["protein_change"] = None # Not a specific protein change
        base_response["canonical_variant_id"] = f"{gene_symbol}:{variant_query}" # Use original query as part of ID


    base_response.update({
        "simulated_classification": final_default_details["classification"],
        "classification_reasoning": final_default_details["reasoning"],
        "predicted_consequence": final_default_details.get("consequence", base_response["predicted_consequence"]),
        "simulated_tools": {
            "sift": final_default_details.get("sift", base_response["simulated_tools"]["sift"]),
            "polyphen": final_default_details.get("polyphen", base_response["simulated_tools"]["polyphen"])
        },
        "mock_knowledgebases": {
            "clinvar_significance": final_default_details.get("clinvar", base_response["mock_knowledgebases"]["clinvar_significance"]),
            "oncokb_level": final_default_details.get("oncokb", base_response["mock_knowledgebases"]["oncokb_level"])
        }
    })
    return base_response

# Example Usage:
if __name__ == '__main__':
    print("--- Specific Known Variant ---")
    print(get_variant_effect_mock("BRAF", "V600E", "Missense_Mutation"))
    print("\n--- Specific Known Variant (p. notation) ---")
    print(get_variant_effect_mock("TP53", "p.R248Q", "Missense_Mutation"))
    print("\n--- Unknown Specific Missense Variant (likely specific attempt) ---")
    print(get_variant_effect_mock("ABC", "X123Y", "Missense_Mutation"))
    print("\n--- Known General Variant Type (query is the type) ---")
    print(get_variant_effect_mock("TP53", "Nonsense_Mutation", "Nonsense_Mutation"))
    print("\n--- General Variant Type from patient data (novel specific variant, falls back to type) ---")
    print(get_variant_effect_mock("BRCA1", "some_novel_variant_text", "Nonsense_Mutation"))
    print("\n--- Frameshift from patient data (compound type) ---")
    print(get_variant_effect_mock("BRCA2", "c.123delA_someframeshift", "Frame_Shift_Del"))
    print("\n--- Silent Mutation from patient data (known general type) ---")
    print(get_variant_effect_mock("XYZ", "A10A", "Silent")) # Assuming A10A is a specific variant query
    print("\n--- Query with Intent (Pathogenic) ---")
    print(get_variant_effect_mock("SOMEGENE", "SomeUnknownVar", "Missense_Mutation", query_intent="pathogenic"))
    print("\n--- Query with Intent (Benign) ---")
    print(get_variant_effect_mock("OTHERGENE", "AnotherUnknown", "Missense_Mutation", query_intent="benign"))
    print("\n--- Completely Unknown Type/Query (not matching specific patterns or general types) ---")
    print(get_variant_effect_mock("ANO1", "MysteriousChangeType", "Intronic_Variant")) # Intronic_Variant not in GENERAL_VARIANT_TYPE_EFFECTS_MOCK
    print("\n--- EGFR T790M (Resistance by rule) ---")
    print(get_variant_effect_mock("EGFR", "T790M", "Missense_Mutation"))
    print("\n--- TP53 P72R (Unclear by rule) ---")
    print(get_variant_effect_mock("TP53", "p.P72R", "Missense_Mutation")) 
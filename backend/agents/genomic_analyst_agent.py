from typing import Dict, Any
import logging

class GenomicAnalystAgent:
    async def run(self, genomic_query: str, patient_genomic_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes genomic criteria using mock data.
        
        Args:
            genomic_query: The genomic criterion to analyze
            patient_genomic_data: Dictionary containing patient's genomic data
            
        Returns:
            Dict containing:
            - status: MET, NOT_MET, or UNCLEAR
            - evidence: Clear explanation of the analysis
        """
        try:
            # Extract gene names from the query
            gene_names = []
            for gene in ["PIK3CA", "KRAS", "TP53", "BRCA1", "BRCA2", "AKT1", "AKT2", "AKT3"]:
                if gene.lower() in genomic_query.lower():
                    gene_names.append(gene)
            
            if not gene_names:
                return {
                    "status": "UNCLEAR",
                    "evidence": "No specific gene mutations were mentioned in the criterion."
                }
            
            # Check each gene against patient data
            results = []
            for gene in gene_names:
                if gene in patient_genomic_data:
                    mutation = patient_genomic_data[gene]
                    results.append(f"{gene}: {mutation['status']} ({mutation['details']})")
                else:
                    results.append(f"{gene}: Not tested")
            
            # Determine overall status
            if all(gene in patient_genomic_data for gene in gene_names):
                # If all required genes are present in patient data
                if "mutation" in genomic_query.lower():
                    # If looking for mutations
                    if all(patient_genomic_data[gene]["status"] == "Present" for gene in gene_names):
                        status = "MET"
                    else:
                        status = "NOT_MET"
                else:
                    # If looking for wild-type
                    if all(patient_genomic_data[gene]["status"] == "Absent" for gene in gene_names):
                        status = "MET"
                    else:
                        status = "NOT_MET"
            else:
                status = "UNCLEAR"
            
            # Format evidence
            evidence = f"Genomic Analysis Results:\n" + "\n".join(results)
            
            return {
                "status": status,
                "evidence": evidence
            }
            
        except Exception as e:
            logging.error(f"Error in genomic analysis: {str(e)}")
            return {
                "status": "UNCLEAR",
                "evidence": f"Error in genomic analysis: {str(e)}"
            } 
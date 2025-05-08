import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { DNALoader } from '../components/Loaders'; // Assuming a cool loader component
import Loader from '../components/Loader'; // Use existing Loader

const mockPatientIds = ["PAT12345", "PAT67890", "PAT11223"]; // Replace with actual patient ID fetching if possible

// Pre-defined query templates for suggested queries feature
const suggestedQueryTemplates = {
    effect: [
        { label: "Effect of [GENE] [VARIANT]", value: "Effect of {gene} {variant}", requiresGene: true, requiresVariant: true },
        { label: "Impact of [GENE] mutation", value: "Impact of {gene} mutation", requiresGene: true, requiresVariant: false },
    ],
    presence: [
        { label: "Activating [GENE] mutation", value: "Activating {gene} mutation", requiresGene: true, requiresVariant: false },
        { label: "Pathogenic [GENE] mutation", value: "Pathogenic {gene} mutation", requiresGene: true, requiresVariant: false },
        { label: "Presence of [GENE] [VARIANT]", value: "Presence of {gene} {variant}", requiresGene: true, requiresVariant: true },
        { label: "Any mutation in [GENE]", value: "Any mutation in {gene}", requiresGene: true, requiresVariant: false },
    ],
    absence: [
        { label: "[GENE] wild-type", value: "{gene} wild-type", requiresGene: true, requiresVariant: false },
        { label: "Absence of [GENE] [VARIANT]", value: "Absence of {gene} {variant}", requiresGene: true, requiresVariant: true },
        { label: "No pathogenic [GENE] mutation", value: "No pathogenic {gene} mutation", requiresGene: true, requiresVariant: false },
    ],
    resistance: [
        { label: "Resistance mutation in [GENE]", value: "Resistance mutation in {gene}", requiresGene: true, requiresVariant: false },
        { label: "No resistance mutation in [GENE]", value: "No resistance mutation in {gene}", requiresGene: true, requiresVariant: false },
    ]
};

const MutationExplorer = () => {
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [patientMutations, setPatientMutations] = useState([]);
    const [genomicQuery, setGenomicQuery] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isLoadingPatient, setIsLoadingPatient] = useState(false);
    const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    // Fetch patient mutations when selectedPatientId changes
    const fetchPatientMutations = useCallback(async () => {
        if (!selectedPatientId) {
            setPatientMutations([]);
            setAnalysisResult(null);
            setError(null);
            return;
        }
        setIsLoadingPatient(true);
        setError(null);
        setAnalysisResult(null); // Clear previous analysis
        setPatientMutations([]); // Clear previous mutations

        try {
            // Fetch full patient data, which includes mutations
            const response = await fetch(`http://localhost:8000/api/patients/${selectedPatientId}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success && result.data && result.data.mutations) {
                 setPatientMutations(result.data.mutations);
            } else {
                console.warn("Mutations data not found in response for patient:", selectedPatientId, result);
                setPatientMutations([]); // Set empty if not found
                // Optionally set an error message if mutations are expected but missing
                // setError("Could not load mutation data for this patient."); 
            }
        } catch (err) {
            console.error("Error fetching patient data:", err);
            setError(err.message || "Failed to load patient data.");
            setPatientMutations([]);
        } finally {
            setIsLoadingPatient(false);
        }
    }, [selectedPatientId]);

    useEffect(() => {
        fetchPatientMutations();
    }, [fetchPatientMutations]);

    const handleAnalyze = async () => {
        if (!selectedPatientId || !genomicQuery) {
            setError("Please select a patient and enter a genomic query.");
            return;
        }
        setIsLoadingAnalysis(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const response = await fetch('http://localhost:8000/api/research/mutation-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    patient_id: selectedPatientId, 
                    genomic_query: genomicQuery 
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setAnalysisResult(data);
        } catch (err) {
            console.error("Error performing genomic analysis:", err);
            setError(err.message || "Failed to perform genomic analysis.");
            setAnalysisResult(null);
        } finally {
            setIsLoadingAnalysis(false);
        }
    };
    
    const getStatusColor = (status) => {
        if (!status) return 'text-gray-500';
        switch (status.toUpperCase()) {
            case 'MET': return 'text-green-500';
            case 'NOT_MET': return 'text-red-500';
            case 'UNCLEAR': return 'text-yellow-500';
            case 'ERROR': return 'text-red-700';
            default: return 'text-gray-500';
        }
    };

    // Helper function for suggested queries to populate the gene/variant
    const fillQueryTemplate = (template, gene = null, variant = null) => {
        let filledQuery = template;
        if (gene) {
            filledQuery = filledQuery.replace('{gene}', gene);
        }
        if (variant) {
            filledQuery = filledQuery.replace('{variant}', variant);
        }
        return filledQuery;
    };

    // Helper function to get a random mutation from the list for a suggested query
    const getRandomMutation = (mutations) => {
        if (!mutations || mutations.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * mutations.length);
        return mutations[randomIndex];
    };

    // Function to apply a suggested query template
    const applySuggestedQuery = (template) => {
        let query = "";
        
        // If patient has mutations, try to use an actual gene/variant from their data
        if (patientMutations.length > 0) {
            const randomMutation = getRandomMutation(patientMutations);
            if (randomMutation) {
                const gene = randomMutation.hugo_gene_symbol;
                const variant = randomMutation.protein_change;
                
                if (template.requiresGene && template.requiresVariant && gene && variant) {
                    query = fillQueryTemplate(template.value, gene, variant);
                } else if (template.requiresGene && gene) {
                    // If template only needs a gene or variant is missing
                    query = fillQueryTemplate(template.value, gene);
                } else {
                    // Fallback to generic
                    query = fillQueryTemplate(template.value, "BRAF", "V600E");
                }
                setGenomicQuery(query);
                
                // Auto-trigger analysis
                setTimeout(() => {
                    handleAnalyze();
                }, 100);
                return;
            }
        }
        
        // Fallback for when no mutations are available
        if (template.requiresGene) {
            const placeholderGene = "BRAF"; // Common cancer gene as fallback
            const placeholderVariant = template.requiresVariant ? "V600E" : "";
            query = fillQueryTemplate(template.value, placeholderGene, placeholderVariant);
        } else {
            query = template.value;
        }
        
        setGenomicQuery(query);
        
        // Auto-trigger analysis
        setTimeout(() => {
            handleAnalyze();
        }, 100);
    };

    return (
        <div className="container mx-auto p-6 bg-gray-900 text-gray-100 min-h-screen">
            <button onClick={() => navigate(-1)} className="mb-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                &larr; Back
            </button>
            <h1 className="text-3xl font-bold mb-6 text-center text-purple-400">Mutation Explorer</h1>

            {/* Patient Selector */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
                <label htmlFor="patient-select" className="block text-lg font-medium text-gray-300 mb-2">Select Patient ID:</label>
                <select 
                    id="patient-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 text-gray-100 border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
                >
                    <option value="">-- Select a Patient --</option>
                    {mockPatientIds.map(id => (
                        <option key={id} value={id}>{id}</option>
                    ))}
                </select>
            </div>

            {/* Display Patient Mutations List */}
            {isLoadingPatient && <Loader />} 
            {!isLoadingPatient && selectedPatientId && patientMutations.length > 0 && (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold mb-3 text-gray-300">Known Mutations for {selectedPatientId}:</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700 bg-gray-750 rounded">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Gene</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Protein Change</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Variant Type</th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th> 
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {patientMutations.map((mutation, index) => (
                                    <tr key={mutation.mutation_id || index}> {/* Use a unique ID if available */}
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{mutation.hugo_gene_symbol}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{mutation.protein_change}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{mutation.variant_type}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                             <button 
                                                 onClick={() => {
                                                     const query = `Effect of ${mutation.hugo_gene_symbol} ${mutation.protein_change}`;
                                                     setGenomicQuery(query);
                                                     // Optionally auto-trigger analysis: handleAnalyze(query); 
                                                     // For now, just pre-fill the query box.
                                                 }}
                                                 className="text-indigo-400 hover:text-indigo-300 text-xs font-medium"
                                             >
                                                 Analyze Effect
                                             </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
             {!isLoadingPatient && selectedPatientId && patientMutations.length === 0 && error == null && (
                 <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md text-gray-400">
                    No known mutations found in the database for {selectedPatientId}.
                </div>
             )}

            {selectedPatientId && (
                <>
                    {/* Genomic Query Input */}
                    <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
                        <label htmlFor="genomic-query" className="block text-lg font-medium text-gray-300 mb-2">Genomic Query:</label>
                        {!isLoadingPatient && selectedPatientId && patientMutations.length === 0 && !error && (
                            <p className="text-sm text-gray-400 mb-2">
                                Note: While {selectedPatientId} has no mutations listed in the database, you can still enter a general genomic query (e.g., 'Absence of BRAF V600E', 'Any activating oncogene') to analyze their genomic profile.
                            </p>
                        )}
                        
                        {/* Suggested Queries Section */}
                        <div className="mb-4 p-3 bg-gray-700 rounded-md">
                            <h4 className="text-sm font-medium text-gray-300 mb-2">Suggested Queries:</h4>
                            
                            <div className="space-y-2">
                                <div>
                                    <span className="text-xs text-indigo-300 block mb-1">Effect Queries:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedQueryTemplates.effect.map((template, idx) => (
                                            <button 
                                                key={`effect-${idx}`}
                                                onClick={() => applySuggestedQuery(template)}
                                                className="bg-indigo-900 hover:bg-indigo-800 text-xs text-gray-200 py-1 px-2 rounded"
                                            >
                                                {template.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <span className="text-xs text-green-300 block mb-1">Presence Queries:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedQueryTemplates.presence.map((template, idx) => (
                                            <button 
                                                key={`presence-${idx}`}
                                                onClick={() => applySuggestedQuery(template)}
                                                className="bg-green-900 hover:bg-green-800 text-xs text-gray-200 py-1 px-2 rounded"
                                            >
                                                {template.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <span className="text-xs text-yellow-300 block mb-1">Absence Queries:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedQueryTemplates.absence.map((template, idx) => (
                                            <button 
                                                key={`absence-${idx}`}
                                                onClick={() => applySuggestedQuery(template)}
                                                className="bg-yellow-900 hover:bg-yellow-800 text-xs text-gray-200 py-1 px-2 rounded"
                                            >
                                                {template.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <span className="text-xs text-red-300 block mb-1">Resistance Queries:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedQueryTemplates.resistance.map((template, idx) => (
                                            <button 
                                                key={`resistance-${idx}`}
                                                onClick={() => applySuggestedQuery(template)}
                                                className="bg-red-900 hover:bg-red-800 text-xs text-gray-200 py-1 px-2 rounded"
                                            >
                                                {template.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <p className="mt-2 text-xs text-gray-400">
                                Click any template to populate the query box. Templates will use actual genes/variants from patient data when available.
                            </p>
                        </div>
                        
                        <textarea 
                            id="genomic-query"
                            rows="3"
                            value={genomicQuery}
                            onChange={(e) => setGenomicQuery(e.target.value)}
                            placeholder="e.g., Pathogenic KRAS mutation, Absence of BRAF V600E, Effect of TP53 P72R"
                            className="w-full p-2 rounded bg-gray-700 text-gray-100 border border-gray-600 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <div className="mt-2 text-xs text-gray-400">
                            <p className="font-semibold">Example query types:</p>
                            <ul className="list-disc list-inside pl-2">
                                <li><code className="text-purple-300">Effect of GENE VARIANT</code> (e.g., Effect of BRAF V600E)</li>
                                <li><code className="text-purple-300">Presence/Absence of GENE VARIANT</code> (e.g., Absence of EGFR T790M, Is IDH1 R132H present?)</li>
                                <li><code className="text-purple-300">STATUS GENE mutation</code> (e.g., Pathogenic KRAS mutation, Activating PIK3CA mutation)</li>
                                <li><code className="text-purple-300">No STATUS GENE mutation</code> (e.g., No pathogenic TP53 mutation)</li>
                                <li><code className="text-purple-300">Any mutation in GENE</code> (e.g., Any mutation in BRCA1)</li>
                            </ul>
                        </div>
                        <button 
                            onClick={handleAnalyze}
                            disabled={isLoadingAnalysis || !genomicQuery}
                            className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoadingAnalysis ? (
                                // <DNALoader size={20} color="#FFFFFF" /> // Adjust size/color as needed
                                <span className="italic">Analyzing...</span> // Simple text fallback for now
                            ) : "Analyze Query"}
                        </button>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-800 text-red-100 rounded-md shadow-md">
                            <p className="font-semibold">Error:</p>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Analysis Results Display */}
                    {isLoadingAnalysis && (
                        <div className="flex justify-center items-center p-6">
                            {/* <DNALoader size={50} /> */}
                            <Loader /> 
                            {/* <p className="ml-3 text-xl">Analyzing mutations...</p> Removed message, Loader includes one */}
                        </div>
                    )}

                    {analysisResult && !isLoadingAnalysis && (
                        <div className="p-4 bg-gray-800 rounded-lg shadow-md">
                            <h2 className="text-2xl font-semibold mb-4 text-purple-300">Analysis Results</h2>
                            
                            <div className="mb-4 p-3 bg-gray-700 rounded">
                                <p className="text-lg font-medium">Overall Query Status: 
                                    <span className={`font-bold ${getStatusColor(analysisResult.status)}`}>{analysisResult.status || 'N/A'}</span>
                                </p>
                                <p className="mt-1 text-sm text-gray-400">Note: Variant Effect Prediction (VEP) is based on a MOCK EVO2 SIMULATION.</p>
                            </div>

                            {/* NEW: Clinical Significance Context */}
                            {analysisResult.clinical_significance_context && (
                                <div className="mb-4 p-3 bg-indigo-900 bg-opacity-50 border border-indigo-700 rounded">
                                     <h3 className="text-lg font-semibold mb-1 text-indigo-300">Clinical Context & Significance:</h3>
                                     <p className="text-gray-200 text-sm">{analysisResult.clinical_significance_context}</p>
                                </div>
                            )}

                            {analysisResult.gene_summary_statuses && Object.keys(analysisResult.gene_summary_statuses).length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-2 text-gray-300">Gene Summary Statuses:</h3>
                                    <ul className="list-disc list-inside pl-2 space-y-1 bg-gray-700 p-3 rounded">
                                        {Object.entries(analysisResult.gene_summary_statuses).map(([gene, status]) => (
                                            <li key={gene} className="text-gray-200">
                                                <span className="font-semibold">{gene}:</span> {typeof status === 'string' ? status : status.status}
                                                {typeof status !== 'string' && status.details && (
                                                    <span className="text-xs block ml-6 mt-1 text-gray-400">{status.details}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysisResult.simulated_vep_details && analysisResult.simulated_vep_details.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-2 text-gray-300">Simulated VEP Details:</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-700 bg-gray-750 rounded">
                                            <thead className="bg-gray-700">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Gene</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Variant</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Classification</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Consequence</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Prediction Scores</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Knowledge Bases</th>
                                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reasoning</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                                {analysisResult.simulated_vep_details.map((detail, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{detail.gene_symbol}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">
                                                            {detail.canonical_variant_id || detail.protein_change || detail.input_variant_query}
                                                            {detail.variant_type_from_input && (
                                                                <span className="block text-xs text-gray-400">
                                                                    ({detail.variant_type_from_input})
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{detail.simulated_classification}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-200">{detail.predicted_consequence || 'N/A'}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-200">
                                                            {detail.simulated_tools ? (
                                                                <>
                                                                    <div><span className="font-semibold">SIFT:</span> {detail.simulated_tools.sift || 'N/A'}</div>
                                                                    <div><span className="font-semibold">PolyPhen:</span> {detail.simulated_tools.polyphen || 'N/A'}</div>
                                                                </>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-200">
                                                            {detail.mock_knowledgebases ? (
                                                                <>
                                                                    <div><span className="font-semibold">ClinVar:</span> {detail.mock_knowledgebases.clinvar_significance || 'N/A'}</div>
                                                                    <div><span className="font-semibold">OncoKB:</span> {detail.mock_knowledgebases.oncokb_level || 'N/A'}</div>
                                                                </>
                                                            ) : 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-300 max-w-xs">{detail.classification_reasoning}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            
                            {analysisResult.evidence && (
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-2 text-gray-300">Full Evidence String:</h3>
                                    <pre className="p-3 bg-gray-700 text-gray-200 rounded whitespace-pre-wrap text-xs leading-relaxed">
                                        {analysisResult.evidence}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MutationExplorer; 
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Assuming components are in src/components/research/
import SearchBar from '../components/research/SearchBar';
import ResultsDisplay from '../components/research/ResultsDisplay';

// Placeholder data structure anticipating agent outputs
const placeholderTrial = {
  id: 'NCI-2021-08397',
  title: 'Using Cancer Cells in the Blood (ctDNA) to Determine the Type of Chemotherapy that will Benefit Patients who Have Had Surgery for Colon Cancer, (CIRCULATE-NORTH AMERICA)',
  // --- Agent Outputs ---
  aiSummary: 'AI Summary Placeholder: This Phase II/III trial for Stage II/III Colon Cancer compares chemotherapy strategies based on ctDNA status after surgery. ctDNA+ patients get standard chemo vs. mFOLFIRINOX. ctDNA- patients get standard chemo vs. surveillance with chemo upon ctDNA detection.',
  aiEligibility: 'AI Eligibility Placeholder: [Review Needed] Appears eligible for Stage III Colon Cancer, ECOG 0-1, post-R0 resection. Requires specific checks: ctDNA test results, MSI status (must be stable), lab values (ANC, platelets, Hgb, bili, CrCl), prior treatment review.',
  // --- Extracted Key Details ---
  keyDetails: {
    phase: 'Phase II / Phase III',
    status: 'Active',
    condition: 'Colon Cancer', // Simplified
    leadOrg: 'National Cancer Institute (NCI)', // Example
  },
  // --- Actionable Info ---
  contactInfo: { // Example: First contact listed
    name: 'Site Public Contact (UAB Cancer Center)',
    phone: '205-934-0220',
    email: 'tmyrick@uab.edu'
  },
  sourceUrl: 'https://www.cancer.gov/research/participate/clinical-trials-search/v?id=NCI-2021-08397'
};

const Research = () => {
  const { patientId } = useParams(); // Get patientId if navigating from EMR
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Combined loading state
  const [error, setError] = useState(null);
  const [patientData, setPatientData] = useState(null); // State for full patient data

  // Effect to fetch patient data if patientId exists
  useEffect(() => {
    setSearchResults([]); // Clear results on patient change
    setError(null);
    setPatientData(null); // Clear previous patient data

    if (patientId) {
      console.log(`Fetching patient data for: ${patientId}`);
      setIsLoading(true); // Use the combined loading state
      const fetchPatientData = async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/patients/${patientId}`); // Use actual endpoint
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to load patient data.' }));
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
          }
          const data = await response.json();
          if (data.success && data.data) {
            console.log("Patient data loaded:", data.data);
            setPatientData(data.data);
          } else {
            throw new Error(data.message || 'Patient data not found or invalid format.');
          }
        } catch (err) {
          console.error("Error fetching patient data:", err);
          setError(`Failed to load patient data: ${err.message}`);
          setPatientData(null); // Ensure patient data is null on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchPatientData();
    } else {
       console.log('Research page loaded without patient context.');
       setIsLoading(false); // No patientId, so not loading
    }
  }, [patientId]); // Rerun when patientId changes

  const handleSearch = async (query) => {
    if (!query) {
      setError('Please enter a search query.');
      return;
    }
    console.log(`Performing search for: ${query}`);
    setSearchQuery(query);
    setIsLoading(true);
    setError(null);
    setSearchResults([]); // Clear previous results

    // Prepare request body using the fetched patientData state
    const requestBody = {
        query: query,
        patient_context: patientData // Use the full patientData object (or null if not loaded)
    };

    try {
        const response = await fetch('http://localhost:8000/api/search-trials', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response.' }));
             console.error("Backend search error:", response.status, errorData);
             throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data && result.data.found_trials) {
            console.log("Trials found:", result.data.found_trials);
            setSearchResults(result.data.found_trials);
            if (result.data.found_trials.length === 0) {
                 // Changed: Display message via ResultsDisplay instead of setting error here
                 // setError('No matching trials found.');
            }
        } else if (result.success) {
            console.log("Search successful but no trials found or data format unexpected.");
            setSearchResults([]);
            // Changed: Display message via ResultsDisplay instead of setting error here
            // setError(result.message || 'No matching trials found.');
        } else {
             console.error("Backend indicated failure:", result);
             throw new Error(result.message || 'Backend search failed.');
        }
    } catch (err) {
        console.error("Error fetching search results:", err);
        setError(err.message || 'Failed to fetch search results. Check backend connection.');
        setSearchResults([]); // Ensure results are cleared on error
    } finally {
        setIsLoading(false); // Ensure loading state is turned off
    }
  };

  // --- NEW: Function to handle search triggered by button ---
  const handlePatientContextSearch = () => {
    if (!patientData) {
      setError("Cannot search by context: Patient data not loaded.");
      return;
    }

    // Construct query from patient data (e.g., primary diagnosis)
    const diagnosis = patientData.diagnosis?.primary;
    if (!diagnosis) {
      // Fallback if primary diagnosis is missing
      setError("Cannot generate query: Primary diagnosis missing in patient data.");
      // Alternatively, you could try a broader query or prompt user
      return;
    }
    
    console.log(`Triggering context search using diagnosis: ${diagnosis}`);
    // Call the main search handler with the generated query
    handleSearch(diagnosis);
  };

  return (
    <div className="research-container p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Research Portal</h1>
      {patientId && patientData && // Show patient ID only if data loaded successfully
        <p className="mb-4 text-sm text-gray-600">Showing research relevant to Patient ID: {patientId} ({patientData.demographics?.name || 'Name N/A'})</p>
      }
      {patientId && !patientData && !isLoading && // Show if patientId exists but data failed to load
         <p className="mb-4 text-sm text-red-600">Could not load data for Patient ID: {patientId}. Proceeding without context.</p>
      }
      
      {/* --- Search Area --- */}
      <div className="search-controls mb-6 flex flex-col sm:flex-row items-start gap-3">
        {/* Search Bar takes full width on small, less on larger */}
        <div className="flex-grow w-full sm:w-auto">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
        
        {/* Context Search Button - only enabled if patientData exists */}
        <button
          onClick={handlePatientContextSearch}
          disabled={!patientData || isLoading} // Disable if no patient or already loading
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto whitespace-nowrap"
        >
          Find Trials for This Patient
        </button>
      </div>

      <div className="mt-6">
         {/* Simplified loading/error display - ResultsDisplay handles empty/error states related to search itself */}
        {isLoading && <p className="text-center text-gray-500">Loading...</p>}
        {error && !isLoading && <p className="text-center text-red-500">Error: {error}</p>} 
        {!isLoading && (
          <ResultsDisplay results={searchResults} patientContext={patientData} />
        )}
      </div>
    </div>
  );
};

export default Research; 
import React, { useState } from 'react';
import SearchBar from '../../components/research/SearchBar';
import ResultsDisplay from '../../components/research/ResultsDisplay';

// Define API URLs (adjust port if necessary)
const API_BASE_URL = 'http://localhost:8000/api/research'; // Make sure backend port matches

const ResearchPortal = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Function to parse ClinicalTrials query string
  const parseClinicalTrialsQuery = (query) => {
    const criteria = {};
    const pairs = query.split(',');
    pairs.forEach(pair => {
      const parts = pair.split('=');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const value = parts[1].trim();
        // Basic validation for potential keys (extend as needed)
        if (key.startsWith('query.')) {
           criteria[key] = value;
        }
      }
    });
    return criteria;
  };

  const handleSearch = async (query, type) => {
    console.log(`Searching ${type} for: ${query}`);
    setIsLoading(true);
    setSearchResults([]); 
    setError(null); // Clear previous errors

    let url = '';
    let body = {};

    if (type === 'pubmed') {
      url = `${API_BASE_URL}/pubmed/search`;
      body = { query: query }; // Send query directly
    } else if (type === 'clinicaltrials') {
      url = `${API_BASE_URL}/clinicaltrials/search`;
      // Parse the query string into criteria object for clinical trials
      const criteria = parseClinicalTrialsQuery(query);
      if (Object.keys(criteria).length === 0) {
          setError("Invalid format for ClinicalTrials search. Use key=value pairs separated by commas (e.g., query.cond=Glioblastoma, query.intr=CAR-T).");
          setIsLoading(false);
          return;
      }
      body = { criteria: criteria }; 
    } else {
      console.error("Unknown search type:", type);
      setError("Invalid search type selected.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization headers if/when needed
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Try to get error detail from response body
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
        } catch (jsonError) {
             // Ignore if response body is not JSON
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      setSearchResults(data); // Update results state

    } catch (err) {
      console.error("API Call failed:", err);
      setError(err.message || "Failed to fetch search results.");
      setSearchResults([]); // Clear results on error
    } finally {
      setIsLoading(false); // Ensure loading is set to false
    }
  };

  return (
    <div style={{ padding: '20px' }}> {/* Add some padding */}
      <h1>Research Portal</h1>
      <p>Search for PubMed articles and Clinical Trials.</p>
      
      <SearchBar onSearch={handleSearch} /> { /* Pass handleSearch */}
      
      {error && <div style={{ color: 'red', marginTop: '10px' }}>Error: {error}</div>} 
      
      <ResultsDisplay results={searchResults} loading={isLoading} />
    </div>
  );
};

export default ResearchPortal; 
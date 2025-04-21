import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('pubmed');

  const handleInputChange = (event) => {
    setQuery(event.target.value);
  };

  const handleTypeChange = (event) => {
    setSearchType(event.target.value);
  };

  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query, searchType);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearchClick();
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <div>
        <label style={{ marginRight: '10px' }}>
          <input 
            type="radio" 
            value="pubmed" 
            checked={searchType === 'pubmed'}
            onChange={handleTypeChange} 
            style={{ marginRight: '5px' }}
          />
          PubMed
        </label>
        <label>
          <input 
            type="radio" 
            value="clinicaltrials" 
            checked={searchType === 'clinicaltrials'}
            onChange={handleTypeChange}
            style={{ marginRight: '5px' }}
          />
          ClinicalTrials.gov
        </label>
      </div>
      <div style={{ marginTop: '10px' }}>
        <input 
          type="text" 
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={searchType === 'pubmed' 
            ? "Search PubMed (e.g., cancer immunotherapy)" 
            : "Search ClinicalTrials (e.g., condition=glioblastoma, intervention=CAR-T)"}
          style={{ width: '75%', padding: '10px', marginRight: '10px' }} 
        />
        <button onClick={handleSearchClick} style={{ padding: '10px' }}>Search</button>
      </div>
      {searchType === 'clinicaltrials' && (
         <p style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
             Tip: Use field prefixes like `query.cond=`, `query.intr=`, `query.term=` (see API docs for more).
         </p>
      )}
    </div>
  );
};

export default SearchBar; 
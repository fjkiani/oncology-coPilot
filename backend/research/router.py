from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List

# Import the utility function
from .pubmed_utils import search_pubmed

router = APIRouter()

@router.post("/pubmed/search", response_model=List[Dict[str, Any]])
async def search_pubmed_endpoint(payload: Dict[str, Any] = Body(...)):
    """ Endpoint to search PubMed. """
    query = payload.get('query')
    max_results = payload.get('max_results', 10) # Default to 10 results

    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query' in request body")
    
    print(f"Received PubMed search request for query: {query}")
    try:
        results = await search_pubmed(query, max_results=max_results)
        return results
    except Exception as e:
        # Log the exception details on the server
        print(f"Error calling PubMed search utility: {e}") 
        # Return a generic error to the client
        raise HTTPException(status_code=500, detail="Internal server error during PubMed search.")

@router.post("/clinicaltrials/search", response_model=List[Dict[str, Any]])
async def search_clinical_trials_endpoint(payload: Dict[str, Any] = Body(...)):
    """ Endpoint to search ClinicalTrials.gov. """
    criteria = payload.get('criteria')
    if not criteria or not isinstance(criteria, dict):
        raise HTTPException(status_code=400, detail="Missing or invalid 'criteria' object in request body")

    print(f"Received ClinicalTrials search request with criteria: {criteria}")
    # TODO: Implement actual call to clinicaltrials_utils.search_clinical_trials
    
    # Placeholder response
    mock_results = [
        { "id": "NCT12345", "title": "Mock Clinical Trial 1", "summary": "Mock summary for criteria: " + str(criteria), "source": "ClinicalTrials.gov" },
        { "id": "NCT67890", "title": "Mock Clinical Trial 2", "summary": "Another mock trial summary...", "source": "ClinicalTrials.gov" }
    ]
    return mock_results
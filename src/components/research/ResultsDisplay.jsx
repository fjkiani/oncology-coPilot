import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, ClipboardDocumentCheckIcon, XMarkIcon, DocumentDuplicateIcon, PlusCircleIcon } from '@heroicons/react/24/solid'; // Added icons

// Placeholder action handler
const handleDraftInquiry = (trialId, patientContext, contactInfo) => {
  console.log('Drafting inquiry for trial:', trialId);
  console.log('Patient Context:', patientContext);
  console.log('Contact Info:', contactInfo);
  // TODO: Implement backend call to DraftAgent 
  alert(`Placeholder: Would draft inquiry to ${contactInfo?.name || 'contact'} for trial ${trialId}.`);
};

// Helper function to render criteria lists
const CriteriaList = ({ title, items, icon: Icon, colorClass, detailKey = 'reasoning' }) => {
  if (!items || items.length === 0) return null;

  // Helper to determine confidence color
  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'text-green-700';
      case 'medium': return 'text-yellow-700';
      case 'low': return 'text-red-700';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="mb-3">
      <h6 className={`flex items-center font-semibold text-sm ${colorClass}-700 mb-1`}>
        <Icon className={`h-4 w-4 mr-1.5 ${colorClass}-600`} />
        {title} ({items.length})
      </h6>
      <ul className="list-disc list-inside pl-4 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-xs text-gray-700">
            <span className="font-medium">{item.criterion}</span>
            {/* Display Reasoning/Evidence */}
            {item[detailKey] && 
              <span className="text-gray-500 italic ml-1">- {item[detailKey]}</span>
            }
            {/* --- NEW: Display Confidence --- */}
            {item.confidence && 
              <span className={`ml-2 font-semibold ${getConfidenceColor(item.confidence)}`}>
                (Confidence: {item.confidence})
              </span>
            }
            {/* --- END NEW --- */}
  </li>
        ))}
      </ul>
    </div>
  );
};

// Updated component to render a single Trial Result with detailed AI eligibility
const InterpretedTrialResult = ({ item, patientContext, onPlanFollowups }) => {
  const interpretedResult = item.interpreted_result || {};
  const assessmentStatus = interpretedResult.eligibility_assessment || "Not Assessed";
  const narrativeSummary = interpretedResult.narrative_summary || "Summary not available.";
  const detailedAnalysis = interpretedResult.llm_eligibility_analysis;
  const eligibilityAssessment = detailedAnalysis?.eligibility_assessment || {};
  const metCriteria = eligibilityAssessment.met_criteria || [];
  const unmetCriteria = eligibilityAssessment.unmet_criteria || [];
  const unclearCriteria = eligibilityAssessment.unclear_criteria || [];
  const actionSuggestions = interpretedResult.action_suggestions || []; // Needed for button
  const hasActionSuggestions = actionSuggestions.length > 0;

  // Handler for Plan Followups button
  const handlePlanFollowupsClick = () => {
     if (onPlanFollowups && hasActionSuggestions) {
         onPlanFollowups({ 
             suggestions: actionSuggestions, 
             trialId: item.nct_id, 
             trialTitle: item.title 
         }); 
     } else {
         console.error("onPlanFollowups handler not provided or no suggestions exist.");
         alert("Cannot plan followups."); 
     }
  };

  // --- Determine Status Color (same as before) ---
  let overallStatusColor = "text-gray"; 
  let overallStatusBg = "bg-gray-100";
  // ... (status color logic) ...
  if (assessmentStatus.toLowerCase().includes("likely eligible")) {
    overallStatusColor = "text-green-700"; overallStatusBg = "bg-green-100";
  } else if (assessmentStatus.toLowerCase().includes("likely ineligible")) {
    overallStatusColor = "text-red-700"; overallStatusBg = "bg-red-100";
  } else if (assessmentStatus.toLowerCase().includes("unclear")) {
    overallStatusColor = "text-yellow-700"; overallStatusBg = "bg-yellow-100";
  } else if (assessmentStatus.toLowerCase().includes("failed")) {
     overallStatusColor = "text-red-700"; overallStatusBg = "bg-red-100";
  }
  // --- End Status Color ---

  // --- Render Eligibility Content Inline --- 
  let eligibilityContent;
  if (detailedAnalysis && typeof detailedAnalysis === 'object') {
    eligibilityContent = (
      <div className="text-sm mt-2">
        <CriteriaList 
          title="Met Criteria"
          items={metCriteria}
          icon={CheckCircleIcon} 
          colorClass="text-green"
        />
        <CriteriaList 
          title="Unmet Criteria"
          items={unmetCriteria}
          icon={XCircleIcon} 
          colorClass="text-red"
        />
        <div className="relative"> {/* Container for list and button */}        
          <CriteriaList 
            title="Unclear Criteria"
            items={unclearCriteria}
            icon={QuestionMarkCircleIcon} 
            colorClass="text-yellow"
          />
          {/* Button for Planning Followups - Positioned relative to Unclear List */}          
          {hasActionSuggestions && (
            <button
              onClick={handlePlanFollowupsClick} 
              className="absolute top-0 right-0 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded hover:bg-purple-200"
              title="Plan Follow-up Actions for Unclear Items"
            >
              Plan Follow-ups
            </button>
          )}
        </div>
      </div>
    );
  } else {
    // Fallback/Error display
    eligibilityContent = <p className={`flex items-center text-sm ${overallStatusColor}-700 mt-2`}>
         {assessmentStatus.includes("Failed") ? 
           <ExclamationTriangleIcon className={`h-4 w-4 mr-1.5 ${overallStatusColor}-500`} /> : 
           <InformationCircleIcon className={`h-4 w-4 mr-1.5 ${overallStatusColor}-400`} />
         }
         <span>{assessmentStatus}</span>
      </p>;
  }
  // --- End Eligibility Content --- 

  return (
    <li className="mb-4 border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
      {/* Top Row: Title, Status Badge */}
      <div className="flex justify-between items-start mb-2">
        {/* Left side: Title and Trial Info */}
        <div className="flex-grow mr-4">
           <h4 className="text-base font-semibold text-blue-700 mb-0.5">{item.title || 'No Title'}</h4>
           <div className="text-xs text-gray-600">
              <span>NCT ID: {item.nct_id || 'N/A'}</span> |
              <span> Status: {item.status ? item.status.replace(/\n.*/, '').trim() : 'N/A'}</span> |
              <span> Phase: {item.phase || 'N/A'}</span>
            </div>
        </div>
        {/* Right side: Status Badge */}        
        <div className="flex items-center flex-shrink-0">
           <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${overallStatusBg} ${overallStatusColor}`}> 
              {assessmentStatus}
           </span>
        </div>
      </div>

      {/* --- Inline Narrative Summary --- */}      
      <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-3 text-sm text-blue-800">
         <h5 className="font-semibold mb-1 text-xs">AI Narrative Summary:</h5>
         <p>{narrativeSummary}</p>
      </div>

      {/* --- Inline Eligibility Breakdown --- */}      
      <div className="bg-gray-50 border border-gray-100 rounded p-3">
        <h5 className="font-semibold text-sm text-gray-800 mb-1">Eligibility Criteria Details:</h5>
        {eligibilityContent}
      </div>
    </li>
  );
};

const ResultsDisplay = ({ results, patientContext, onPlanFollowups }) => {
  // No loading state needed here as it's handled in the parent Research.jsx

  if (!results) {
    return <div className="mt-6 text-center text-gray-500">Enter search criteria or context loading...</div>; // Initial state message
  }
  
  if (results.length === 0) {
    return <div className="mt-6 text-center text-gray-500">No relevant clinical trials found.</div>;
  }

  // Assume all results are clinical trials for now, using the new structure
  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Matching Clinical Trials ({results.length}):</h3>
      <ul>
        {results.map((item, index) => (
          <InterpretedTrialResult 
            key={item.source_url || item.nct_id || index} 
            item={item} 
            patientContext={patientContext} 
            onPlanFollowups={onPlanFollowups} // Pass the handler down
          />
        ))}
      </ul>
    </div>
  );
};

export default ResultsDisplay; 
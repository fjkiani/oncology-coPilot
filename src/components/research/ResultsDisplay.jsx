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
const CriteriaList = ({ title, items, icon: Icon, colorClass, detailKey }) => {
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
      <h6 className={`flex items-center font-semibold text-sm ${colorClass}-800 mb-1`}>
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
  const interpretedResult = item.interpreted_result || {}; // Ensure interpretedResult exists
  const assessmentStatus = interpretedResult.eligibility_assessment || "Not Assessed"; // Overall status string
  const narrativeSummary = interpretedResult.narrative_summary || "Summary not available.";
  const detailedAnalysis = interpretedResult.llm_eligibility_analysis; // The object with inclusion/exclusion lists
  const actionSuggestions = interpretedResult.action_suggestions || []; // Get suggestions
  
  const hasActionSuggestions = actionSuggestions.length > 0;

  // --- Handler for Plan Followups button ---
  const handlePlanFollowupsClick = () => {
     if (onPlanFollowups && hasActionSuggestions) {
         onPlanFollowups(actionSuggestions); // Pass suggestions to parent handler
     } else {
         console.error("onPlanFollowups handler not provided or no suggestions exist.");
         alert("Cannot plan followups."); 
     }
  };

  let eligibilityContent;
  let overallStatusColor = "text-gray"; // Default color

  // Determine color based on overall assessment status
  if (assessmentStatus.toLowerCase().includes("likely eligible")) {
    overallStatusColor = "text-green";
  } else if (assessmentStatus.toLowerCase().includes("likely ineligible")) {
    overallStatusColor = "text-red";
  } else if (assessmentStatus.toLowerCase().includes("unclear")) {
    overallStatusColor = "text-yellow";
  } else if (assessmentStatus.toLowerCase().includes("failed")) {
     overallStatusColor = "text-red";
  }

  // Render detailed breakdown if available
  if (detailedAnalysis && typeof detailedAnalysis === 'object') {
    // --- FIX: Access criteria lists from the nested eligibility_assessment object --- 
    const eligibilityAssessment = detailedAnalysis.eligibility_assessment || {};
    // --- END FIX ---
    eligibilityContent = (
      <div className="text-sm mt-2"> {/* Added margin top */}
        {/* Use analysis from eligibilityAssessment */}
        <CriteriaList 
          title="Met Inclusion / Did Not Meet Exclusion" 
          items={eligibilityAssessment.met_criteria || []}
          icon={CheckCircleIcon} 
          colorClass="text-green"
          detailKey="reasoning"
        />
        <CriteriaList 
          title="Did Not Meet Inclusion / Met Exclusion" 
          items={eligibilityAssessment.unmet_criteria || []}
          icon={XCircleIcon} 
          colorClass="text-red"
          detailKey="reasoning"
        />
        <div className="relative"> {/* Container for list and button */}
          <CriteriaList 
            title="Unclear Criteria" 
            items={eligibilityAssessment.unclear_criteria || []}
            icon={QuestionMarkCircleIcon} 
            colorClass="text-yellow"
            detailKey="reasoning" // Use reasoning which should explain missing info
          />
          {/* Button for Planning Followups */}
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
  } else if (assessmentStatus.includes("Not Assessed") || assessmentStatus.includes("Failed")) {
    // Handle specific statuses where detailed breakdown is missing/irrelevant
    eligibilityContent = (
      <p className={`flex items-center text-sm ${overallStatusColor}-700 mt-2`}>
         {assessmentStatus.includes("Failed") ? 
           <ExclamationTriangleIcon className={`h-4 w-4 mr-1.5 ${overallStatusColor}-500`} /> : 
           <InformationCircleIcon className={`h-4 w-4 mr-1.5 ${overallStatusColor}-400`} />
         }
         <span>{assessmentStatus}</span>
      </p>
    );
  } else {
     // Fallback if detailedAnalysis is somehow missing but status is not 'Not Assessed/Failed'
     eligibilityContent = <p className="text-sm text-gray-500 mt-2">Detailed breakdown not available.</p>;
  }

  return (
    <li className="mb-6 border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Title and Source Link */}
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-lg font-semibold text-blue-700">{item.title || 'No Title'}</h4>
        <a 
          href={item.source_url || '#'}
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline whitespace-nowrap ml-4"
        >
          View Full Source
        </a>
      </div>

      {/* Key Details */}
      <div className="text-xs text-gray-600 mb-3">
        <span>NCT ID: {item.nct_id || 'N/A'}</span> |
        {/* Clean up status display if needed */}
        <span> Status: {item.status ? item.status.replace(/\n.*/, '').trim() : 'N/A'}</span> |
        <span> Phase: {item.phase || 'N/A'}</span>
      </div>

      {/* --- Display Overall Assessment Status --- */}
       <div className={`mb-2 font-semibold ${overallStatusColor}-700`}>
         AI Eligibility Status: {assessmentStatus}
       </div>
       
      {/* --- Display Narrative Summary --- */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3 text-sm text-blue-800">
         <h5 className="font-semibold mb-1">AI Narrative Summary:</h5>
         <p>{narrativeSummary}</p>
      </div>

      {/* --- Display Detailed Eligibility Breakdown --- */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
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
            key={item.source_url || index}
            item={item} 
            patientContext={patientContext} 
            onPlanFollowups={onPlanFollowups}
          />
        ))}
      </ul>
    </div>
  );
};

export default ResultsDisplay; 
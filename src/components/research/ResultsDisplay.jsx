import React from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'; // Using solid icons

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
            {item[detailKey] && <span className="text-gray-500 italic ml-1">- {item[detailKey]}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Updated component to render a single Trial Result with detailed AI eligibility
const InterpretedTrialResult = ({ item, patientContext }) => {
  const assessment = item.eligibility_assessment;
  let eligibilityContent;

  if (assessment && typeof assessment === 'object' && !assessment.error && assessment.status !== 'skipped') {
    // Valid assessment received
    eligibilityContent = (
      <div className="text-sm">
        <p className="font-semibold mb-2 text-gray-800">{assessment.eligibility_summary || 'No overall summary provided.'}</p>
        <CriteriaList 
          title="Met Criteria" 
          items={assessment.met_criteria} 
          icon={CheckCircleIcon} 
          colorClass="text-green"
          detailKey="evidence"
        />
        <CriteriaList 
          title="Unmet Criteria" 
          items={assessment.unmet_criteria} 
          icon={XCircleIcon} 
          colorClass="text-red"
          detailKey="reasoning"
        />
        <CriteriaList 
          title="Unclear Criteria" 
          items={assessment.unclear_criteria} 
          icon={QuestionMarkCircleIcon} 
          colorClass="text-yellow"
          detailKey="missing_info"
        />
      </div>
    );
  } else if (assessment && assessment.status === 'skipped') {
    // Assessment was skipped
    eligibilityContent = (
      <p className="flex items-center text-sm text-gray-600">
         <InformationCircleIcon className="h-4 w-4 mr-1.5 text-gray-400" />
         <span>AI Check Skipped: {assessment.reason || 'Reason not specified.'}</span>
      </p>
    );
  } else if (assessment && assessment.error) {
    // Error during assessment
     eligibilityContent = (
      <p className="flex items-center text-sm text-red-700">
        <ExclamationTriangleIcon className="h-4 w-4 mr-1.5 text-red-500" />
        <span>AI Check Error: {assessment.error || 'An unknown error occurred.'}</span>
      </p>
    );
  } else {
    // Default placeholder if assessment is missing entirely
     eligibilityContent = (
      <p className="flex items-center text-sm text-gray-600">
        <InformationCircleIcon className="h-4 w-4 mr-1.5 text-gray-400" />
        <span>Eligibility analysis pending or not available.</span>
      </p>
    );
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

      {/* Detailed AI Eligibility Assessment */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
        <h5 className="font-semibold text-sm text-gray-800 mb-2">AI Eligibility Check:</h5>
        {eligibilityContent}
      </div>

      {/* AI Summary (Now uses backend field) */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <h5 className="font-semibold text-sm text-blue-800 mb-1">AI Summary:</h5>
        <p className="text-sm text-blue-700">{item.ai_summary || 'Summary generation pending or not available.'}</p>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button 
          onClick={() => handleDraftInquiry(item.nct_id || item.source_url, patientContext, item.contactInfo)}
          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Draft Inquiry to Contact
        </button>
      </div>
    </li>
  );
};

const ResultsDisplay = ({ results, patientContext }) => {
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
            patientContext={patientContext} // Pass patient context down
          />
        ))}
      </ul>
    </div>
  );
};

export default ResultsDisplay; 
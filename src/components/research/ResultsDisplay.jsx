import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, EnvelopeIcon, FlagIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid'; // Added Chevrons

// Placeholder action handler
const handleDraftInquiry = (trialId, patientContext, contactInfo) => {
  console.log('Drafting inquiry for trial:', trialId);
  console.log('Patient Context:', patientContext);
  console.log('Contact Info:', contactInfo);
  // TODO: Implement backend call to DraftAgent 
  alert(`Placeholder: Would draft inquiry to ${contactInfo?.name || 'contact'} for trial ${trialId}.`);
};

// Placeholder component for criteria lists (can be reused or adapted from ResultsDisplay)
const CriteriaDisplayList = ({ title, items, icon: Icon, colorClass, detailKey = 'reasoning' }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className={`flex items-center font-semibold text-sm ${colorClass}-700 mb-1.5`}>
        <Icon className={`h-4 w-4 mr-1.5 ${colorClass}-600`} />
        {title} ({items.length})
      </h4>
      <ul className="list-disc list-inside pl-4 space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-xs text-gray-700">
            <span className="font-medium">{item.criterion}</span>
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

// Updated component to render a single Trial Result with EXPANDABLE detailed AI eligibility
const InterpretedTrialResult = ({ 
  item, 
  patientContext, 
  onPlanFollowups, 
  actionSuggestions,
  hasActionSuggestions,
  relevantTasks
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // State for expansion
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState(false);
  const [deepDiveReport, setDeepDiveReport] = useState(null);
  const [deepDiveError, setDeepDiveError] = useState(null);

  const interpretedResult = item.interpreted_result || {}; 
  const assessmentStatus = interpretedResult.eligibility_assessment || "Not Assessed"; 
  const narrativeSummary = interpretedResult.narrative_summary || "Summary not available.";

  const detailedAnalysis = interpretedResult.llm_eligibility_analysis; 
  const eligibilityAssessment = detailedAnalysis?.eligibility_assessment || {}; // Safely access nested
  const metCriteria = eligibilityAssessment.met_criteria || [];
  const unmetCriteria = eligibilityAssessment.unmet_criteria || [];
  const unclearCriteria = eligibilityAssessment.unclear_criteria || [];

  // --- NEW: Handler for Plan Followups button ---
  const handlePlanFollowupsClick = () => {
     if (onPlanFollowups && hasActionSuggestions) {
         // Pass suggestions AND trial info (id and title) to parent handler
         onPlanFollowups({ 
             suggestions: actionSuggestions, 
             trialId: item.nct_id, // Use nct_id from the item prop
             trialTitle: item.title // Use title from the item prop
         }); 
     } else {
         // Make error message more specific
         if (!onPlanFollowups) {
             console.error("onPlanFollowups handler not provided to InterpretedTrialResult.");
         } else if (!hasActionSuggestions) {
             console.error("No action suggestions found in item.interpreted_result to plan followups.");
             // Optionally alert user if no suggestions
             // alert("No follow-up suggestions available for this trial."); 
         }
         // Avoid generic alert if console error is sufficient
         // alert("Cannot plan followups."); 
     }
  };
  // --- END NEW HANDLER ---

  // --- NEW: Handler for Deep Dive Request ---
  const handleRequestDeepDive = async () => {
    if (!item || !patientContext || !eligibilityAssessment) {
      setDeepDiveError("Missing necessary data (trial, patient, or assessment) to request deep dive.");
      return;
    }
    
    setIsDeepDiveLoading(true);
    setDeepDiveReport(null);
    setDeepDiveError(null);
    
    const requestBody = {
        unmet_criteria: unmetCriteria,
        unclear_criteria: unclearCriteria,
        patient_data: patientContext, // Send the whole patient data object
        trial_data: item // Send the whole trial item object
    };

    try {
        console.log("Sending deep dive request:", JSON.stringify(requestBody, null, 2)); // Log request body
        const response = await fetch('http://localhost:8000/api/request-deep-dive', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(`HTTP error ${response.status}: ${errorData.detail || 'Failed to fetch deep dive results'}`);
        }

        const report = await response.json();
        console.log("Received deep dive report:", report); // Log response
        setDeepDiveReport(report);

    } catch (error) {
        console.error("Error requesting deep dive:", error);
        setDeepDiveError(error.message || "An unexpected error occurred during the deep dive request.");
    } finally {
        setIsDeepDiveLoading(false);
    }
  };
  // --- END NEW HANDLER ---

  // --- Determine Status Color (same as before) ---
  let overallStatusColor = "text-gray"; 
  let overallStatusBg = "bg-gray-100";
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

  return (
    <li className="mb-4 border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"> {/* Added overflow-hidden */} 
      {/* --- Always Visible Header --- */}      
      <div className="flex justify-between items-center p-4"> {/* Use consistent padding */}        
        {/* Left side: Title and Trial Info */}
        <div className="flex-grow mr-4">
           <h4 className="text-base font-semibold text-blue-700 mb-0.5">{item.title || 'No Title'}</h4>
           <div className="text-xs text-gray-600">
              <span>NCT ID: {item.nct_id || 'N/A'}</span> |
              <span> Status: {item.status ? item.status.replace(/\n.*/, '').trim() : 'N/A'}</span> |
              <span> Phase: {item.phase || 'N/A'}</span>
            </div>
        </div>
        {/* Right side: Status Badge and Expand/Collapse Button */}        
        <div className="flex items-center flex-shrink-0">
           <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${overallStatusBg} ${overallStatusColor} mr-3`}> 
              {assessmentStatus}
           </span>
           <button 
              onClick={() => setIsExpanded(!isExpanded)} // Toggle expansion state
              className="p-1.5 text-gray-500 rounded hover:bg-gray-100"
              title={isExpanded ? "Collapse Details" : "Expand Details"}
            >
              {isExpanded ? <ChevronUpIcon className="h-5 w-5"/> : <ChevronDownIcon className="h-5 w-5"/>}
            </button>
        </div>
      </div>

      {/* --- Conditionally Rendered Detailed View --- */}      
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 bg-gray-50"> {/* Background for details section */} 
          {/* Reuse the 3-panel layout logic (adapted from PatientTrialMatchView) */}          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* --- Panel 1: Patient & Trial Summary --- */}        
            <div className="md:col-span-3 bg-white p-3 rounded border border-gray-200">
               <h5 className="text-sm font-semibold mb-2 text-gray-700 border-b pb-1">Patient Snapshot</h5>
               <div className="space-y-1 text-xs text-gray-600">
                  {/* Ensure patientContext exists before accessing */}                  
                  {patientContext ? (
                    <>
                      <p><strong>ID:</strong> {patientContext.patientId}</p>
                      <p><strong>Name:</strong> {patientContext.demographics?.name || 'N/A'}</p>
                      <p><strong>DOB:</strong> {patientContext.demographics?.dob || 'N/A'}</p>
                      <p><strong>Diagnosis:</strong> {patientContext.diagnosis?.primary || 'N/A'}</p>
                    </>
                  ) : (
                     <p className="text-gray-400 italic">Patient context not available.</p> 
                  )}
               </div>
               
               <h5 className="text-sm font-semibold mt-3 mb-2 text-gray-700 border-b pb-1">Trial Snapshot</h5>
               {/* Display key trial details from 'item' prop */}               
               <div className="space-y-1 text-xs text-gray-600">
                 {/* Example: Add more fields from item if needed */}                 
                 <p><strong>Status:</strong> {item.status || 'N/A'}</p>
                 <p><strong>Phase:</strong> {item.phase || 'N/A'}</p>
               </div>
            </div>

            {/* --- Panel 2: Eligibility Deep Dive --- */}       
            <div className="md:col-span-6 bg-white p-3 rounded border border-gray-200">
                <h5 className="text-sm font-semibold mb-2 text-gray-700 border-b pb-1">Eligibility Analysis</h5>
                {/* Met Criteria */}            
                <CriteriaDisplayList
                  title="Met Criteria"
                  items={metCriteria}
                  icon={CheckCircleIcon}
                  colorClass="text-green"
                />
                 {/* Unmet Criteria */}            
                <CriteriaDisplayList
                  title="Unmet Criteria"
                  items={unmetCriteria}
                  icon={XCircleIcon}
                  colorClass="text-red"
                />
                 {/* Unclear Criteria / Action Hub */}            
                <div className="mb-1">
                  <h6 className="flex items-center font-semibold text-sm text-yellow-700 mb-1.5">
                    <QuestionMarkCircleIcon className="h-4 w-4 mr-1.5 text-yellow-600" />
                    Unclear Criteria / Follow-ups ({unclearCriteria.length})
                  </h6>
                  {unclearCriteria.length === 0 ? (
                      <p className="text-xs text-gray-500 pl-1">No unclear criteria identified.</p>
                  ) : (
                      <ul className="space-y-2 pl-1">
                        {unclearCriteria.map((criterionItem, index) => (
                          <li key={index} className="text-xs text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                            {/* Criterion Text & Reasoning */}                        
                            <div>
                              <span className="font-semibold block">{criterionItem.criterion}</span>
                              {criterionItem.reasoning && 
                                <span className="text-yellow-800 italic ml-1">- {criterionItem.reasoning}</span>
                              }
                            </div>
                          </li>
                        ))}
                      </ul>
                  )}
                </div>
            </div>

            {/* --- Panel 3: Agent Insights & Actions --- */}        
            <div className="md:col-span-3 bg-white p-3 rounded border border-gray-200">
                <h5 className="text-sm font-semibold mb-2 text-gray-700 border-b pb-1">Insights & Actions</h5>
                {/* Narrative Summary */}            
                <div className="mb-3">
                  <h6 className="text-xs font-semibold text-gray-600 mb-1">Narrative Summary</h6>
                  <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-100">{narrativeSummary}</p>
                </div>
                {/* Confidence Score Placeholder */}            
                <div className="mb-3">
                  <h6 className="text-xs font-semibold text-gray-600 mb-1">Confidence Score</h6>
                  <p className="text-xs text-gray-500 italic">Not implemented.</p>
                </div>
                {/* Deeper Analysis Placeholder */}            
                <div className="mb-3">
                  <h6 className="text-xs font-semibold text-gray-600 mb-1">Deeper Analysis</h6>
                  <button 
                      onClick={handleRequestDeepDive}
                      className="w-full px-3 py-1 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-wait" // Added cursor-wait
                      disabled={isDeepDiveLoading} // Disable during loading
                    >
                      {isDeepDiveLoading ? 'Analyzing...' : 'Request Deeper Analysis'}
                  </button>
                  
                  {/* --- NEW: Display Deep Dive Results --- */}
                  {deepDiveError && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">Error: {deepDiveError}</p>
                  )}
                  {deepDiveReport && (
                     <div className="mt-2 text-xs space-y-2">
                         {/* Summary */}
                         <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                            <p className="font-semibold text-indigo-800">Deep Dive Summary:</p> 
                            <p className="text-indigo-700">{deepDiveReport.summary}</p>
                         </div>
                         
                         {/* Clarified Items */}
                         {deepDiveReport.clarified_items?.length > 0 && (
                            <div className="bg-green-50 p-2 rounded border border-green-100">
                                <p className="font-semibold text-green-800">Clarified ({deepDiveReport.clarified_items.length}):</p>
                                <ul className="list-disc list-inside pl-2">
                                    {deepDiveReport.clarified_items.map((item, idx) => (
                                        <li key={`clarified-${idx}`} className="text-green-700">
                                            <span className="font-medium">{item.criterion}</span> ({item.deep_dive_status}): <span className="italic">{item.deep_dive_evidence}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )}

                         {/* Remaining Gaps */}
                         {deepDiveReport.remaining_gaps?.length > 0 && (
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                                <p className="font-semibold text-yellow-800">Remaining Gaps ({deepDiveReport.remaining_gaps.length}):</p>
                                <ul className="list-disc list-inside pl-2">
                                    {deepDiveReport.remaining_gaps.map((item, idx) => (
                                        <li key={`gap-${idx}`} className="text-yellow-700">
                                            <span className="font-medium">{item.criterion}</span> ({item.deep_dive_status}): <span className="italic">{item.deep_dive_evidence || item.original_reasoning}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )}

                         {/* Refined Next Steps */}
                         {deepDiveReport.refined_next_steps?.length > 0 && (
                            <div className="bg-purple-50 p-2 rounded border border-purple-100">
                                <p className="font-semibold text-purple-800">Refined Next Steps:</p>
                                <ul className="list-disc list-inside pl-2 space-y-1">
                                    {deepDiveReport.refined_next_steps.map((step, idx) => (
                                        <li key={`step-${idx}`} className="text-purple-700">
                                            <strong>{step.action_type || 'INFO'}:</strong> {step.description}
                                            {step.rationale && <em className="ml-1 text-xs text-purple-600">({step.rationale})</em>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )}
                     </div>
                  )}
                  {/* --- END Display Deep Dive Results --- */}
                </div>
                {/* --- END UPDATED Deeper Analysis --- */}

                {/* Plan Follow-ups Button (Keep as is) */}
                <div>
                   <h6 className="text-xs font-semibold text-gray-600 mb-1">Follow-up Actions</h6>
                   <button 
                      onClick={handlePlanFollowupsClick} 
                      disabled={!hasActionSuggestions}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={hasActionSuggestions ? "Create follow-up tasks based on AI suggestions" : "No follow-up suggestions available"}
                    >
                       <CheckCircleIcon className="h-4 w-4" /> {/* Using CheckCircle for planning */} 
                       Plan Follow-ups ({actionSuggestions.length})
                   </button>
                </div>
            </div>
          </div> 
        </div>
      )}
  </li>
);
};

// ResultsDisplay component now receives tasks and filters them for each trial
const ResultsDisplay = ({ results, patientContext, onPlanFollowups, kanbanTasks }) => { 
  // No loading state needed here as it's handled in the parent Research.jsx

  if (!results) {
    return <div className="mt-6 text-center text-gray-500">Enter search criteria or context loading...</div>;
  }
  
  if (results.length === 0) {
    return <div className="mt-6 text-center text-gray-500">No relevant clinical trials found.</div>;
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-700">Matching Clinical Trials ({results.length}):</h3>
      <ul>
        {results.map((item, index) => {
           // Filter tasks specific to this trial
           const relevantTasks = kanbanTasks 
               ? kanbanTasks.filter(task => task.trial_id === item.nct_id)
               : [];
           
           // Pass necessary props down, including the filtered tasks
           return (
              <InterpretedTrialResult 
                key={item.source_url || item.nct_id || index} 
                item={item} 
                patientContext={patientContext} 
                onPlanFollowups={onPlanFollowups}
                actionSuggestions={item.interpreted_result?.action_suggestions || []}
                hasActionSuggestions={(item.interpreted_result?.action_suggestions || []).length > 0}
                relevantTasks={relevantTasks} // <-- Pass filtered tasks down
              />
           );
        })}
      </ul>
    </div>
  );
};

export default ResultsDisplay; 
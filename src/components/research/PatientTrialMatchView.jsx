import React from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, InformationCircleIcon, ArrowLeftIcon, EnvelopeIcon, FlagIcon } from '@heroicons/react/24/solid';

// Placeholder component for criteria lists
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
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- PatientTrialMatchView Component ---
const PatientTrialMatchView = ({ trialItem, patientContext, onClose }) => {
  // Basic check for essential data
  if (!trialItem || !patientContext) {
    return (
      <div className="p-4 text-center text-red-600">
        Error: Missing trial or patient data for Match Center view.
      </div>
    );
  }

  // Data Extraction
  const patientDemo = patientContext.demographics || {};
  const patientDiag = patientContext.diagnosis || {};
  const trialInterpreted = trialItem.interpreted_result || {};
  const trialAnalysis = trialInterpreted.llm_eligibility_analysis || {};
  const eligibilityAssessment = trialAnalysis.eligibility_assessment || {};
  const overallStatus = trialInterpreted.eligibility_assessment || "Not Assessed";
  const narrativeSummary = trialInterpreted.narrative_summary || "Summary not available.";
  const metCriteria = eligibilityAssessment.met_criteria || [];
  const unmetCriteria = eligibilityAssessment.unmet_criteria || [];
  const unclearCriteria = eligibilityAssessment.unclear_criteria || [];

  // Determine Status Color
  let overallStatusColor = "text-gray";
  let overallStatusBg = "bg-gray-100";
  if (overallStatus.toLowerCase().includes("likely eligible")) {
    overallStatusColor = "text-green-700"; overallStatusBg = "bg-green-100";
  } else if (overallStatus.toLowerCase().includes("likely ineligible")) {
    overallStatusColor = "text-red-700"; overallStatusBg = "bg-red-100";
  } else if (overallStatus.toLowerCase().includes("unclear")) {
    overallStatusColor = "text-yellow-700"; overallStatusBg = "bg-yellow-100";
  } else if (overallStatus.toLowerCase().includes("failed")) {
     overallStatusColor = "text-red-700"; overallStatusBg = "bg-red-100";
  }

  // Placeholder Action Handlers for this view
  const handleDraftMessageClick = (criterionItem) => {
    console.log("Trigger Patient Message Draft for criterion:", criterionItem);
    alert(`Placeholder: Would draft patient message for: ${criterionItem.criterion}`);
  };
  const handleFlagReviewClick = (criterionItem) => {
    console.log("Flag criterion for Clinician Review:", criterionItem);
    alert(`Placeholder: Would flag criterion for clinician review: ${criterionItem.criterion}`);
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex-grow">
          <h2 className="text-lg font-semibold text-gray-800 leading-tight">
            Matching <span className="text-blue-600">{patientDemo.name || `Patient ${patientContext.patientId}`}</span> with <span className="text-blue-600">Trial {trialItem.nct_id}</span>
          </h2>
          <p className="text-sm text-gray-600 truncate" title={trialItem.title}>{trialItem.title}</p>
        </div>
        <div className={`ml-4 px-3 py-1 rounded-full text-sm font-medium ${overallStatusBg} ${overallStatusColor}`}>
          Status: {overallStatus}
        </div>
        {onClose && (
            <button onClick={onClose} className="ml-4 p-2 text-gray-500 rounded-full hover:bg-gray-200" title="Close View">
               <ArrowLeftIcon className="h-5 w-5"/>
            </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

        {/* Panel 1: Patient & Trial Summary */}
        <div className="lg:col-span-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
           <h3 className="text-base font-semibold mb-3 text-gray-700 border-b pb-2">Patient Snapshot</h3>
           <div className="space-y-1.5 text-xs text-gray-600">
              <p><strong className="text-gray-800">ID:</strong> {patientContext.patientId}</p>
              <p><strong className="text-gray-800">Name:</strong> {patientDemo.name || 'N/A'}</p>
              <p><strong className="text-gray-800">DOB:</strong> {patientDemo.dob || 'N/A'}</p>
              <p><strong className="text-gray-800">Diagnosis:</strong> {patientDiag.primary || 'N/A'}</p>
           </div>
           <h3 className="text-base font-semibold mt-4 mb-3 text-gray-700 border-b pb-2">Trial Snapshot</h3>
           <div className="space-y-1.5 text-xs text-gray-600">
              <p><strong className="text-gray-800">ID:</strong> {trialItem.nct_id || 'N/A'}</p>
              <p><strong className="text-gray-800">Status:</strong> {trialItem.status || 'N/A'}</p>
              <p><strong className="text-gray-800">Phase:</strong> {trialItem.phase || 'N/A'}</p>
           </div>
        </div>

        {/* Panel 2: Eligibility Deep Dive */}
        <div className="lg:col-span-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold mb-3 text-gray-700 border-b pb-2">Eligibility Analysis</h3>
            <CriteriaDisplayList title="Met Criteria" items={metCriteria} icon={CheckCircleIcon} colorClass="text-green" />
            <CriteriaDisplayList title="Unmet Criteria" items={unmetCriteria} icon={XCircleIcon} colorClass="text-red" />
            {/* Unclear Criteria / Action Hub */}
            <div className="mb-4">
              <h4 className="flex items-center font-semibold text-sm text-yellow-700 mb-1.5">
                <QuestionMarkCircleIcon className="h-4 w-4 mr-1.5 text-yellow-600" />
                Unclear Criteria / Follow-ups ({unclearCriteria.length})
              </h4>
              {unclearCriteria.length === 0 ? (
                  <p className="text-xs text-gray-500 pl-1">No unclear criteria identified.</p>
              ) : (
                  <ul className="space-y-2 pl-1">
                    {unclearCriteria.map((item, index) => (
                      <li key={index} className="text-xs text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                        <div>
                          <span className="font-semibold block">{item.criterion}</span>
                          {item.reasoning && <span className="text-yellow-800 italic ml-1">- {item.reasoning}</span>}
                        </div>
                        {/* Action Buttons for this criterion */}
                        <div className="flex justify-start items-center gap-2 mt-1.5 pt-1.5 border-t border-yellow-100">
                          <button onClick={() => handleDraftMessageClick(item)} className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200" title="Draft a message to the patient about this item">
                            <EnvelopeIcon size={14} /> Draft Patient Message
                          </button>
                          <button onClick={() => handleFlagReviewClick(item)} className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200" title="Flag this item for internal clinician review">
                            <FlagIcon size={14} /> Flag for Review
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
              )}
            </div>
        </div>

        {/* Panel 3: Agent Insights & Actions */}
        <div className="lg:col-span-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-base font-semibold mb-3 text-gray-700 border-b pb-2">Insights & Actions</h3>
            <div className="mb-4">
               <h4 className="text-sm font-semibold text-gray-600 mb-1">Narrative Summary</h4>
               <p className="text-xs text-gray-700 bg-blue-50 p-2 rounded border border-blue-100">{narrativeSummary}</p>
            </div>
             <div className="mb-4">
               <h4 className="text-sm font-semibold text-gray-600 mb-1">Confidence Score</h4>
               <p className="text-xs text-gray-500 italic">Confidence scoring not yet implemented.</p>
            </div>
             <div className="mb-4">
               <h4 className="text-sm font-semibold text-gray-600 mb-1">Deeper Analysis</h4>
               <button className="w-full px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-gray-400" disabled>
                  Request Deeper Analysis (Future)
               </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PatientTrialMatchView;
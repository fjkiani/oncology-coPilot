import React, { useState } from 'react';
import PropTypes from 'prop-types';

// Helper function to format dates (optional, basic implementation)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return dateString; // Return original if formatting fails
  }
};

const PatientRecordViewer = ({ patientData }) => {
  // State for Prompt Interaction
  const [promptText, setPromptText] = useState("");
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [promptResult, setPromptResult] = useState(null);
  const [promptError, setPromptError] = useState(null);
  const [activeActionTab, setActiveActionTab] = useState(null);

  if (!patientData) {
    return <div className="p-4 text-center text-gray-500">No patient data available.</div>;
  }

  // Destructure for easier access, providing default empty objects/arrays
  const {
    patientId = 'N/A',
    demographics = {},
    diagnosis = {},
    medicalHistory = [],
    currentMedications = [],
    allergies = [],
    recentLabs = [],
    imagingStudies = [],
    patientGeneratedHealthData = null,
    notes = []
  } = patientData;

  // --- Generic Prompt Submission Handler --- 
  const submitPrompt = async (currentPrompt) => {
    if (!currentPrompt.trim() || !patientId) {
      setPromptError("Cannot process empty prompt or missing patient ID.");
      return;
    }

    setIsProcessingPrompt(true);
    setPromptResult(null);
    setPromptError(null);
    console.log(`Sending prompt for patient ${patientId}: ${currentPrompt}`);

    try {
      const response = await fetch(`http://localhost:8000/api/prompt/${patientId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentPrompt })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Received prompt result:", result);
      setPromptResult(result); // Store the entire result

      // Handle non-success statuses for user feedback 
      if (result.status !== "success") {
        if (result.status === "failure") {
          setPromptError(result.error_message || "Processing failed.");
        } else if (result.status === "agent_not_implemented") {
          setPromptError(result.message || "This feature is not yet available."); 
        } else if (result.status === "unknown_intent") {
          setPromptError(result.message || "Could not understand the request.");
        } else {
          // Catch-all for other statuses
          setPromptError(result.message || `Received status: ${result.status}`);
        }
      }

    } catch (err) {
      console.error("Error processing prompt:", err);
      setPromptError(err.message || "Failed to process prompt.");
    } finally {
      setIsProcessingPrompt(false);
    }
  };

  // Handler for the form submission
  const handlePromptFormSubmit = (e) => {
    e.preventDefault();
    submitPrompt(promptText); // Use the text from the textarea
  };

  // Placeholder handler for future actions
  const handlePlaceholderAction = (actionName) => {
    console.log(`Placeholder action triggered: ${actionName} for patient ${patientId}`);
    alert(`Action '${actionName}' is not implemented in the MVP.`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 rounded-lg shadow space-y-6">
      {/* --- Title --- */}
      <h2 className="text-2xl font-bold text-indigo-700">Patient Record: {demographics.name || 'N/A'} ({patientId})</h2>
      
      {/* --- CoPilot Prompt Panel --- */}
      <section className="p-4 bg-white rounded shadow sticky top-5 z-10 max-h-[50vh] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-indigo-700">CoPilot Prompt</h3>
        <form onSubmit={handlePromptFormSubmit} className="space-y-3">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder={`Ask about ${demographics.name || 'this patient'} (e.g., "Summarize latest notes", "What was the last WBC?", "Notify PCP about elevated glucose")`}
            className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            rows={3}
            disabled={isProcessingPrompt}
          />
          {/* --- Quick Action Buttons/Tags --- */}
          <div className="flex flex-wrap gap-2 text-xs mb-2"> {/* Reduced mb */}
            <span className="font-medium text-gray-600 mr-1">Quick Actions:</span>
            <button type="button" onClick={() => setPromptText('Summarize the patient record')} className="py-0.5 px-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Summarize</button>
            <button 
              type="button" 
              onClick={() => {
                  const recentLabName = patientData?.recentLabs?.[0]?.panelName;
                  const recentImageName = patientData?.imagingStudies?.[0]?.type;
                  const testExample = recentLabName || recentImageName || '[Test/Finding]';
                  setPromptText(`What was the result of the ${testExample}?`);
              }}
              className="py-0.5 px-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >Ask Question</button>
            <button 
              type="button" 
              onClick={() => {
                  const condition = diagnosis?.primary || '[Condition/Finding]';
                  setPromptText(`Notify [Recipient Role e.g., PCP] about ${condition}`);
              }}
              className="py-0.5 px-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >Draft Notification</button>
            <button 
              type="button" 
              onClick={() => {
                  const reason = diagnosis?.primary ? `follow-up for ${diagnosis.primary}` : 'follow-up';
                  setPromptText(`Schedule ${reason} for [Timeframe e.g., next week]`);
              }}
              className="py-0.5 px-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >Schedule</button>
            <button 
              type="button" 
              onClick={() => {
                  const condition = diagnosis?.primary || '[Condition]';
                  setPromptText(`Find clinical trials for ${condition}`);
              }}
              className="py-0.5 px-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >Find Trials</button>
            <button 
              type="button" 
              onClick={() => {
                  const reason = diagnosis?.primary ? `evaluation for ${diagnosis.primary}` : 'evaluation';
                  setPromptText(`Draft referral to [Specialty] for ${reason}`);
              }}
              className="py-0.5 px-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >Draft Referral</button>
          </div>
          
          {/* --- Suggested Action Tabs --- */}
          <div className="flex flex-wrap gap-2 text-xs border-t pt-2 mb-2"> 
             <span className="font-medium text-gray-600 mr-1 self-center">Suggested Actions:</span>
             <button 
               type="button" 
               onClick={() => setActiveActionTab('admin')}
               className={`py-0.5 px-2 rounded transition-colors ${activeActionTab === 'admin' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Admin/Coordinator
             </button>
             <button 
               type="button" 
               onClick={() => setActiveActionTab('clinical')}
               className={`py-0.5 px-2 rounded transition-colors ${activeActionTab === 'clinical' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Clinical/Nursing
             </button>
             <button 
               type="button" 
               onClick={() => setActiveActionTab('research')}
               className={`py-0.5 px-2 rounded transition-colors ${activeActionTab === 'research' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Research
             </button>
             <button 
               type="button" 
               onClick={() => setActiveActionTab('pharmacy')}
               className={`py-0.5 px-2 rounded transition-colors ${activeActionTab === 'pharmacy' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Pharmacy
             </button>
              <button 
               type="button" 
               onClick={() => setActiveActionTab(null)} // Button to close tabs
               title="Hide Actions"
               className={`py-0.5 px-2 rounded transition-colors text-red-600 hover:bg-red-100 ${!activeActionTab ? 'invisible' : ''}`}
              >
                ✕
             </button>
          </div>

          {/* --- Action Button Display Area (Conditional) --- */}
          {activeActionTab && (
            <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200 min-h-[50px]"> {/* Added min-height */}
              {/* Admin/Coordinator Actions */}
              {activeActionTab === 'admin' && (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => handlePlaceholderAction('Schedule Follow-up')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Schedule Follow-up
                    </button>
                    <button
                        onClick={() => handlePlaceholderAction('Draft Referral')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Draft Referral
                    </button>
                </div>
              )}
              {/* Clinical / Nursing Actions */}
              {activeActionTab === 'clinical' && (
                <div className="flex flex-wrap gap-1.5">
                     <button
                        onClick={() => handlePlaceholderAction('Notify PCP')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Notify PCP
                    </button>
                     <button
                        onClick={() => handlePlaceholderAction('Draft Lab Order')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Draft Lab Order
                    </button>
                    <button
                        onClick={() => handlePlaceholderAction('Flag for Review')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Flag for Review
                    </button>
                </div>
              )}
               {/* Research Actions */}
              {activeActionTab === 'research' && (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => handlePlaceholderAction('Check Trial Eligibility')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Check Trial Eligibility
                    </button>
                </div>
              )}
              {/* Pharmacy Actions */}
              {activeActionTab === 'pharmacy' && (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => handlePlaceholderAction('Review Side Effects')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Review Side Effects
                    </button>
                     <button
                        onClick={() => handlePlaceholderAction('Check Interactions')}
                        disabled title="Functionality not implemented in MVP"
                        className="px-2 py-1 rounded text-xs text-white bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                        Check Interactions
                    </button>
                </div>
              )}
            </div>
          )}

          {/* --- Submit Buttons Row --- */}
          <div className="flex items-center space-x-2">
            <button 
              type="submit" 
              disabled={isProcessingPrompt || !promptText.trim()}
              className={`flex-grow px-4 py-2 rounded-md text-white font-semibold transition-colors duration-200 ${
                isProcessingPrompt || !promptText.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isProcessingPrompt ? 'Processing...' : 'Submit Prompt'}
            </button>
            <button 
              type="button" 
              onClick={() => submitPrompt("Generate a clinical summary")}
              disabled={isProcessingPrompt}
              className={`px-4 py-2 rounded-md text-white font-semibold transition-colors duration-200 ${
                isProcessingPrompt
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isProcessingPrompt ? 'Processing...' : 'Quick Summary'}
            </button>
          </div>
        </form>
        {/* --- Display Prompt Results/Errors --- */}
        {promptError && (
          <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            <p><strong>Error:</strong> {promptError}</p>
          </div>
        )}
        {/* Display results in a more structured way */} 
        {promptResult && !promptError && ( 
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm space-y-2">
            <p className="font-semibold mb-1">CoPilot Response (Status: <span className={`font-bold ${promptResult.status === 'success' ? 'text-green-700' : 'text-orange-700'}`}>{promptResult.status}</span>)</p>
            
            {/* Display specific outputs */} 
            {/* AI Summary Output */}
            {promptResult.output?.summary_text && (
              <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                <h4 className="font-medium text-gray-700">[Clinician/User] Generated Summary:</h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{promptResult.output.summary_text}</p>
              </div>
            )}

            {/* AI Answer Output */}
            {promptResult.output?.answer_text && (
              <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                <h4 className="font-medium text-gray-700">[Clinician/User] AI Answer:</h4>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{promptResult.output.answer_text}</p>
              </div>
            )}

            {/* Notification Output */}
            {promptResult.output?.simulated_send && (
              <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                <h4 className="font-medium text-gray-700">[Review Required] Notification Draft:</h4>
                <p className="text-sm italic text-gray-600">(Drafted for review before sending to: {promptResult.output.target || 'Recipient'})</p>
                <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">{promptResult.output.message_draft || 'No message drafted.'}</pre>
                {/* <p className="text-sm text-green-700">Simulated Send: Message logged to console.</p> */}
              </div>
            )}

            {/* Scheduling Output */}
            {promptResult.output?.available_slots?.length > 0 && (
              <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                <h4 className="font-medium text-gray-700">[Admin/Coordinator] Scheduling Options:</h4>
                <ul className="list-disc list-inside text-sm text-gray-800">
                  {promptResult.output.available_slots.map((slot, index) => <li key={`slot-${index}`}>{slot}</li>)}
                </ul>
              </div>
            )}
             {promptResult.output?.booked_slot && (
                 <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                     <h4 className="font-medium text-gray-700">[Admin/Coordinator] Appointment Booked:</h4>
                     <p className="text-sm text-green-700">Successfully booked: {promptResult.output.booked_slot}</p>
                 </div>
            )}

             {/* Referral Output */}
            {promptResult.output?.referral_letter_draft && (
                <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                    <h4 className="font-medium text-gray-700">[Admin/Coordinator] Referral Letter Draft:</h4>
                     <p className="text-sm italic text-gray-600">(Drafted for review and sending to: {promptResult.output.referring_to_specialty || 'Specialist'})</p>
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">{promptResult.output.referral_letter_draft}</pre>
                </div>
            )}

            {/* Side Effect Output */}
            {(promptResult.output?.potential_side_effects?.length > 0 || promptResult.output?.management_tips?.length > 0) && (
                 <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                    <h4 className="font-medium text-gray-700">[Pharmacist/Clinician] Side Effect Information:</h4>
                    {/* Display Potential Side Effects */}
                    {promptResult.output?.potential_side_effects?.length > 0 && (
                        <div className="mt-1 pl-2">
                            <p className="text-sm font-medium text-gray-600">Potential Side Effects{promptResult.output.target_medication ? ` for ${promptResult.output.target_medication}` : ' (General)'}:</p>
                            <ul className="list-disc list-inside text-sm text-gray-800">
                                {promptResult.output.potential_side_effects.map((effect, index) => <li key={`se-${index}`}>{effect}</li>)}
                            </ul>
                        </div>
                    )}
                    {/* Display Management Tips */}
                    {promptResult.output?.management_tips?.length > 0 && (
                        <div className="mt-2 pl-2">
                             <p className="text-sm font-medium text-gray-600">Management Tips:</p>
                            {promptResult.output.management_tips.map((tipInfo, index) => (
                                <div key={`tip-${index}`} className="mt-1">
                                    <p className="text-sm text-gray-800"><strong>{tipInfo.symptom}:</strong> {tipInfo.tip}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Clinical Trial Output */}
            {promptResult.output?.found_trials && (
                <div className="mt-1 border-t pt-2"> {/* Added separator */} 
                    <h4 className="font-medium text-gray-700">[Research] Potential Clinical Trials ({promptResult.output.found_trials.length} found):</h4>
                    {promptResult.output.found_trials.length === 0 ? (
                        <p className="text-sm text-gray-600 italic pl-2">No trials found matching criteria: {promptResult.output?.search_criteria?.condition || 'N/A'}</p>
                    ) : (
                        <ul className="space-y-2 pl-2 mt-1">
                            {promptResult.output.found_trials.map((trial, index) => (
                                <li key={trial.nct_id || index} className="text-sm border-b border-gray-200 pb-1 last:border-b-0">
                                    <p className="font-semibold text-gray-800">{trial.title || 'N/A'} (Phase {trial.phase || 'N/A'})</p>
                                    <p className="text-gray-600">Status: {trial.status || 'N/A'} | Location(s): {trial.location || 'N/A'}</p>
                                    {/* In a real app, the NCT ID or a direct URL would be a link */}
                                    <p className="text-gray-600">ID: {trial.nct_id || 'N/A'} {trial.url ? <a href={trial.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs ml-1">(Details)</a> : ''}</p>
                                    {trial.summary && <p className="text-xs italic text-gray-500 mt-0.5">Summary: {trial.summary}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Display agent summary only if NO specific output was displayed */}
            {promptResult.summary && 
               !promptResult.output?.summary_text && 
               !promptResult.output?.answer_text && 
               !promptResult.output?.simulated_send &&
               !promptResult.output?.available_slots &&
               !promptResult.output?.booked_slot &&
               !promptResult.output?.referral_letter_draft && 
               !(promptResult.output?.potential_side_effects?.length > 0 || promptResult.output?.management_tips?.length > 0) &&
               !promptResult.output?.found_trials && // <-- Add check for trials
               (
                 <p className="italic mt-1 border-t pt-2 text-gray-600">{promptResult.summary}</p>
            )}
            
            {/* Display message for non-success statuses */} 
            {promptResult.status !== 'success' && promptResult.message && (
              <p className="text-orange-700 mt-1 border-t pt-2">{promptResult.message}</p>
            )}
          </div>
        )}
      </section>

      {/* Demographics */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Demographics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <p><strong>Name:</strong> {demographics.name || 'N/A'}</p>
          <p><strong>DOB:</strong> {formatDate(demographics.dob)}</p>
          <p><strong>Sex:</strong> {demographics.sex || 'N/A'}</p>
          <p><strong>Contact:</strong> {demographics.contact || 'N/A'}</p>
          <p className="md:col-span-2"><strong>Address:</strong> {demographics.address || 'N/A'}</p>
        </div>
      </section>

      {/* Diagnosis */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Diagnosis</h3>
        <div className="text-sm">
          <p><strong>Primary:</strong> {diagnosis.primary || 'N/A'}</p>
          <p><strong>Diagnosed Date:</strong> {formatDate(diagnosis.diagnosedDate)}</p>
          <p><strong>Status:</strong> {diagnosis.status || 'N/A'}</p>
        </div>
      </section>

      {/* Combined History Section */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Medical History</h4>
            {medicalHistory.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {medicalHistory.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            ) : <p className="text-sm text-gray-500">None reported.</p>}
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Current Medications</h4>
            {currentMedications.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {currentMedications.map((med, index) => (
                  <li key={index}>{med.name} {med.dosage} {med.frequency}</li>
                ))}
              </ul>
            ) : <p className="text-sm text-gray-500">None reported.</p>}
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-2 text-gray-700">Allergies</h4>
            {allergies.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {allergies.map((allergy, index) => <li key={index}>{allergy}</li>)}
              </ul>
            ) : <p className="text-sm text-gray-500">None reported.</p>}
          </div>
        </div>
      </section>

      {/* Recent Labs */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Recent Labs</h3>
        {recentLabs.length > 0 ? (
          <div className="space-y-4">
            {recentLabs.map((lab, index) => (
              <div key={index} className="p-3 border rounded bg-gray-50 text-sm">
                <p className="font-semibold">{lab.panelName} ({formatDate(lab.resultDate)}) - Status: {lab.status}</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  {lab.components?.map((comp, cIndex) => (
                    <li key={cIndex}>
                      {comp.test}: {comp.value} {comp.unit} (Ref: {comp.refRange}) <span className={comp.flag !== 'Normal' ? 'font-bold text-red-600' : ''}>{comp.flag}</span>
                    </li>
                  ))}
                </ul>
                {lab.interpretation && <p className="mt-2 text-xs italic text-gray-600">Interpretation: {lab.interpretation}</p>}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No recent labs available.</p>}
      </section>

      {/* Imaging Studies */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Imaging Studies</h3>
        {imagingStudies.length > 0 ? (
          <div className="space-y-4">
            {imagingStudies.map((study, index) => (
              <div key={study.studyId || index} className="p-3 border rounded bg-gray-50 text-sm">
                <p className="font-semibold">{study.type} ({study.modality}) - {formatDate(study.date)} - Status: {study.status}</p>
                <p className="mt-1 whitespace-pre-wrap">{study.reportText}</p>
                {/* Conceptual: Add button to view image if PACS integration existed */}
                {study.imageAccess && (
                   <p className="mt-1 text-xs text-gray-500">Accession: {study.imageAccess.accessionNumber}</p>
                 )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No imaging studies available.</p>}
      </section>

      {/* Patient Generated Health Data */}
      {patientGeneratedHealthData && (
        <section className="mb-6 p-4 bg-white rounded shadow">
          <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Patient Generated Health Data</h3>
          <div className="text-sm space-y-2">
            <p><strong>Source:</strong> {patientGeneratedHealthData.source || 'N/A'}</p>
            <p><strong>Last Sync:</strong> {formatDate(patientGeneratedHealthData.lastSync)}</p>
            {patientGeneratedHealthData.summary && (
              <div className="mt-2 p-3 border rounded bg-blue-50">
                <h4 className="font-semibold text-base mb-1">Summary (Last 7 Days)</h4>
                <p>Avg Steps: {patientGeneratedHealthData.summary.averageStepsLast7Days ?? 'N/A'}</p>
                <p>Avg Resting HR: {patientGeneratedHealthData.summary.averageRestingHeartRateLast7Days ?? 'N/A'} bpm</p>
                <p>Avg Sleep: {patientGeneratedHealthData.summary.averageSleepHoursLast7Days ?? 'N/A'} hours</p>
                {patientGeneratedHealthData.summary.significantEvents?.length > 0 && (
                  <div className="mt-2">
                    <h5 className="font-semibold">Significant Events:</h5>
                    <ul className="list-disc list-inside ml-4">
                      {patientGeneratedHealthData.summary.significantEvents.map((event, eIndex) => (
                        <li key={eIndex} className="text-orange-700">{formatDate(event.date)} - {event.type}: {event.detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Notes */}
      <section className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Progress Notes</h3>
        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.noteId} className="p-3 border rounded bg-gray-50 text-sm">
                <p className="font-semibold">{formatDate(note.date)} - {note.provider} ({note.type || 'Note'})</p>
                <p className="mt-1 whitespace-pre-wrap">{note.text}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No notes available.</p>}
      </section>

    </div>
  );
};

// PropTypes for basic type checking
PatientRecordViewer.propTypes = {
  patientData: PropTypes.shape({
    patientId: PropTypes.string,
    demographics: PropTypes.object,
    diagnosis: PropTypes.object,
    medicalHistory: PropTypes.array,
    currentMedications: PropTypes.array,
    allergies: PropTypes.array,
    recentLabs: PropTypes.array,
    imagingStudies: PropTypes.array,
    patientGeneratedHealthData: PropTypes.object,
    notes: PropTypes.array
  }).isRequired // Make patientData required
};

export default PatientRecordViewer; 
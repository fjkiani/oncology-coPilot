import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import useWebSocket from '../../../frontend/src/hooks/useWebSocket';
import ConsultationPanel from '../../../frontend/src/components/collaboration/ConsultationPanel';
import { v4 as uuidv4 } from 'uuid';

// Helper function to format dates (optional, basic implementation)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return dateString; // Return original if formatting fails
  }
};

// --- Helper Component to Render Included Info in Joining View ---
const RenderIncludedInfo = ({ relatedInfo }) => {
  if (!relatedInfo || Object.keys(relatedInfo).length === 0) {
    return <p className="text-xs italic text-gray-500 mt-2">No specific data sections were included by the initiator.</p>;
  }

  return (
    <div className="space-y-3 mt-2">
      {Object.entries(relatedInfo).map(([key, data]) => {
        // Handle potential empty data sections
        if (!data || (Array.isArray(data) && data.length === 0)) {
             return (
                <div key={key} className="mb-2 pb-2 border-b last:border-b-0">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">{key}</h4>
                    <p className="text-xs text-gray-500 italic pl-2">None included or available.</p>
                </div>
            );
        }

        return (
          <div key={key} className="mb-2 pb-2 border-b last:border-b-0">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">{key}</h4>
            <div className="pl-2 text-xs space-y-1">
              {/* --- Specific Rendering based on Key --- */}
              
              {key === 'Recent Labs' && Array.isArray(data) && data.map((panel, pIndex) => (
                 <div key={`panel-${pIndex}`} className="mb-1">
                     <p className="font-medium text-gray-600">{panel.panelName || 'Lab Panel'} ({formatDate(panel.resultDate)})</p>
                     <ul className="list-disc list-inside ml-2">
                         {panel.components?.map((comp, cIndex) => (
                            <li key={`comp-${cIndex}`}>
                               {comp.test}: {comp.value} {comp.unit} {comp.flag && comp.flag !== 'Normal' ? <span className='text-red-600 font-semibold'>({comp.flag})</span> : ''}
                            </li>
                         ))}
                     </ul>
                 </div>
              ))}

              {key === 'Current Medications' && Array.isArray(data) && data.map((med, mIndex) => (
                 <p key={`med-${mIndex}`}>{med.name} {med.dosage} - {med.frequency}</p>
              ))}

              {key === 'Medical History' && Array.isArray(data) && data.map((item, hIndex) => (
                  // Handle both string history items and potential object structure
                  <p key={`hist-${hIndex}`}>
                      {typeof item === 'string' ? item : 
                      (item.condition ? `${item.condition} (Diagnosed: ${formatDate(item.diagnosisDate)})` : JSON.stringify(item))}
                  </p>
              ))}

              {key === 'Recent Notes' && Array.isArray(data) && data.map((note, nIndex) => (
                 <div key={`note-${nIndex}`} className="border-t first:border-t-0 pt-1 mt-1">
                    <p className="font-medium text-gray-600">{formatDate(note.date)} - {note.provider || note.author}</p>
                    <p className="italic text-gray-700 whitespace-pre-wrap">"{note.text?.substring(0, 150) || note.content?.substring(0, 150)}..."</p>
                 </div>
              ))}

              {key === 'Diagnosis' && typeof data === 'object' && data !== null && (
                 <div>
                    <p><strong>Primary:</strong> {data.primary || data.condition || 'N/A'}</p>
                    <p><strong>Date:</strong> {formatDate(data.diagnosedDate || data.diagnosisDate)}</p>
                    <p><strong>Status:</strong> {data.status || 'N/A'}</p>
                 </div>
              )}
              
               {/* Add more specific renderers for other keys if needed (e.g., Allergies, Imaging) */}
               {/* Fallback for unhandled data types/keys */}
               {!['Recent Labs', 'Current Medications', 'Medical History', 'Recent Notes', 'Diagnosis'].includes(key) && (
                    <pre className="text-xs whitespace-pre-wrap bg-gray-100 p-1 rounded">{JSON.stringify(data, null, 1)}</pre>
               )}

            </div>
          </div>
        );
      })}
    </div>
  );
};

const PatientRecordViewer = ({ patientData }) => {
  console.log("[PatientRecordViewer] Rendering..."); // <-- Log 1: Check if component renders
  
  // State for Prompt Interaction
  const [promptText, setPromptText] = useState("");
  const [isProcessingPrompt, setIsProcessingPrompt] = useState(false);
  const [promptResult, setPromptResult] = useState(null);
  const [promptError, setPromptError] = useState(null);
  const [activeActionTab, setActiveActionTab] = useState(null);
  
  // --- State for Consultation Panel ---
  const [isConsultPanelOpen, setIsConsultPanelOpen] = useState(false);
  const [currentConsultation, setCurrentConsultation] = useState(null); // { roomId, participants, initialContext }
  const [incomingConsultRequest, setIncomingConsultRequest] = useState(null); // Store request details { roomId, patientId, initiator, context }
  const [isJoiningConsult, setIsJoiningConsult] = useState(false);
  
  // --- State for Consultation Initiation Options (Revised for Modal Flow) ---
  const [showConsultOptionsModal, setShowConsultOptionsModal] = useState(false);
  const [consultTargetUser, setConsultTargetUser] = useState(null);
  const [consultTopic, setConsultTopic] = useState("");
  const [consultUseAI, setConsultUseAI] = useState(true);
  const [consultIncludeOptions, setConsultIncludeOptions] = useState({ // Data sections to include
    includeLabs: true,
    includeMeds: true,
    includeHistory: false,
    includeNotes: false, 
    includeDiagnosis: true,
  });
  const [consultInitiatorNote, setConsultInitiatorNote] = useState("");
  
  // --- State for Highlighting Sections --- 
  const [highlightSections, setHighlightSections] = useState(null); // Stores { includeLabs: true, ... } or null
  
  // --- Determine Current User (for testing purposes) ---
  // Check for userId query parameter to simulate different users
  const queryParams = new URLSearchParams(window.location.search);
  const queryUserId = queryParams.get('userId');
  
  const currentUser = queryUserId === 'dr_b' 
      ? { id: 'dr_b', name: 'Dr. Baker (PCP)' } 
      : { id: 'dr_a', name: 'Dr. Adams (Oncologist)' }; // Default to dr_a

  console.log("[PatientRecordViewer] Current simulated user:", currentUser.id);

  // --- WebSocket Setup (Main connection for patient context/notifications) ---
  const patientId = patientData?.patientId; 
  console.log("[PatientRecordViewer] patientId:", patientId); // <-- Log 2: Check if patientId is available
  const wsUrl = patientId ? `ws://localhost:8000/ws` : null; 
  const mainAuthToken = `valid_token_${currentUser.id}`; // Use dynamic currentUser.id

  console.log("[PatientRecordViewer] Calling useWebSocket hook..."); // <-- Log 3: Check if hook call is reached
  const {
    isConnected: isMainWsConnected, 
    lastMessage: lastMainWsMessage, 
    sendMessage: sendMainWsMessage, // Use this for general comms / initiation
    error: mainWsError,
    readyState: mainWsReadyState
  } = useWebSocket(wsUrl, mainAuthToken, patientId); // Connect to patient room initially

  // --- Effect to handle incoming MAIN WebSocket messages (e.g., notifications) ---
  useEffect(() => {
    if (lastMainWsMessage) {
      console.log("Main WS message received in PatientViewer:", lastMainWsMessage);
      const { type, message, result, error, roomId, patientId: reqPatientId, initiator, context } = lastMainWsMessage;
      
      if (type === 'prompt_result') {
         // This block handles results from prompts sent via the MAIN connection 
         // (If we decide to keep the main prompt input outside the consult panel)
         // If prompts are ONLY sent via consult panel OR dedicated prompt socket,
         // this specific handling might move or be removed.
        setPromptResult(result);
        setPromptError(null);
        setIsProcessingPrompt(false);
      } else if (type === 'status') {
        console.log("Main WebSocket Status Update:", message);
      } else if (type === 'error') {
        setPromptError(message || 'Unknown WebSocket error');
        setPromptResult(null);
        setIsProcessingPrompt(false);
      } else if (type === 'consult_request') {
        console.log(`Received consult request from ${initiator?.name} for patient ${reqPatientId} in room ${roomId}`);
        // Log the received context
        console.log("[PatientViewer] Received context:", context);
        if (reqPatientId === patientId) { 
            setIncomingConsultRequest({ 
                roomId: roomId,
                patientId: reqPatientId,
                initiator: initiator, 
                context: context // Store the potentially enriched context object
            });
        } else {
            console.warn(`Received consult request for different patient (${reqPatientId}), ignoring for current view (${patientId}).`);
            // Optionally show a global notification elsewhere
        }
      } else if (type === 'initiate_ok') {
        // Confirmation that our initiated consult was sent to the target
        console.log(`Consultation initiation confirmed for room ${roomId}`);
        // We already opened the panel optimistically, could add visual confirmation here
      } else if (type === 'initiate_fail') {
         // Failed to notify the target user
         console.error(`Failed to initiate consultation for room ${roomId}: ${error}`);
         setPromptError(`Failed to notify colleague: ${error || 'Unknown reason'}`);
         // Close the panel if it was opened optimistically
         handleCloseConsultation(); // Assuming this safely handles null currentConsultation
      }
      
    }
  }, [lastMainWsMessage, patientId]);
  
   // Effect to handle MAIN WebSocket connection errors
   useEffect(() => {
     if (mainWsError) {
       console.error("Main WebSocket Hook Error:", mainWsError);
       setPromptError(`Main Connection Error: ${mainWsError.message}`);
       setIsProcessingPrompt(false); 
     }
   }, [mainWsError]);

  if (!patientData) {
    return <div className="p-4 text-center text-gray-500">Loading patient data...</div>;
  }

  // Destructure for easier access, providing default empty objects/arrays
  const {
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

  // --- New WebSocket Prompt Submission Handler ---
  const submitPromptViaWebSocket = (currentPrompt) => {
     if (!currentPrompt.trim()) {
       setPromptError("Cannot process empty prompt.");
       return;
     }
     if (!isMainWsConnected) {
       setPromptError("WebSocket is not connected. Please wait or refresh.");
       console.error("Attempted to send prompt while WebSocket is not connected.");
       return;
     }

     setIsProcessingPrompt(true);
     setPromptResult(null);
     setPromptError(null);
     console.log(`Sending prompt via WebSocket for patient ${patientId}: ${currentPrompt}`);

     // Send message in the format expected by the backend WS endpoint
     sendMainWsMessage({
       type: "prompt", // Indicate this is a prompt message
       prompt: currentPrompt
     });

     // Note: We no longer handle the response directly here.
     // The useEffect hook listening to lastMainWsMessage will handle the result.
  };

  // Handler for the form submission - NOW USES WEBSOCKET
  const handlePromptFormSubmit = (e) => {
    e.preventDefault();
    submitPromptViaWebSocket(promptText); // New WebSocket call
  };

  // Handler for the Quick Summary button - NOW USES WEBSOCKET
  const handleQuickSummaryClick = () => {
    submitPromptViaWebSocket("Generate a clinical summary"); // New WebSocket call
  }

  // Placeholder handler for future actions
  const handlePlaceholderAction = (actionName) => {
    console.log(`Placeholder action triggered: ${actionName} for patient ${patientId}`);
    alert(`Action '${actionName}' is not implemented in the MVP.`);
  };

  // --- Consultation Initiation & Joining Logic (Revised Modal Flow) ---
  
  // Step 1: Show options modal when MAIN "Consult Colleague" is clicked
  const handleInitiateConsultation = (targetParticipant) => {
    console.log("Initiating consultation process with:", targetParticipant);
    setConsultTargetUser(targetParticipant);
    setConsultTopic("Review patient case");
    setConsultUseAI(true);
    setConsultIncludeOptions({ includeLabs: true, includeMeds: true, includeHistory: false, includeNotes: false, includeDiagnosis: true });
    setConsultInitiatorNote("");
    setHighlightSections(null); // Clear any previous highlights when starting new consult
    setShowConsultOptionsModal(true);
  };

  // Step 2: Send the invitation from the modal with selected options
  const handleSendConsultInvitation = () => {
    if (!patientId || !isMainWsConnected || !consultTargetUser) {
        setPromptError("Cannot initiate consultation: Missing required info or connection.");
        setShowConsultOptionsModal(false);
        return;
    }
    const roomId = `consult_${patientId}_${uuidv4()}`;
    const initiationPayload = {
        type: 'initiate_consult',
        targetUserId: consultTargetUser.id,
        patientId: patientId,
        initiator: currentUser,
        roomId: roomId,
        context: {
            initialTrigger: { description: consultTopic || "General Consultation" }, 
            includeOptions: consultIncludeOptions,
            useAI: consultUseAI,
            initiatorNote: consultInitiatorNote || null
        }
    };
    console.log("Sending initiate_consult message:", initiationPayload);
    sendMainWsMessage(initiationPayload);
    setCurrentConsultation({
      roomId: roomId,
      participants: [consultTargetUser],
      initialContext: { 
          ...initiationPayload.context, 
          description: `Consultation regarding: ${consultTopic || 'General Consultation'}` 
      }
    });
    setIsConsultPanelOpen(true);
    setShowConsultOptionsModal(false);
  };

  // Step 3: Close the modal without sending
  const handleCloseConsultOptionsModal = () => {
      setShowConsultOptionsModal(false);
      setConsultTargetUser(null);
      setConsultTopic("");
  };
  
  // handleJoinConsultation, handleCloseConsultation, handleViewFullRecord (as before)
  const handleJoinConsultation = () => {
      if (!incomingConsultRequest) return;
      console.log(`Joining consultation room: ${incomingConsultRequest.roomId}`);
      console.log("[PatientViewer] Setting consultation context:", incomingConsultRequest.context);
      setCurrentConsultation({
          roomId: incomingConsultRequest.roomId,
          participants: [incomingConsultRequest.initiator], 
          initialContext: incomingConsultRequest.context // Pass the full context object
      });
      setIsConsultPanelOpen(true);
      setIsJoiningConsult(true); 
      setIncomingConsultRequest(null); 
  };
  const handleCloseConsultation = () => {
      console.log(`Closing consultation room: ${currentConsultation?.roomId}`);
      setIsConsultPanelOpen(false);
      setCurrentConsultation(null);
      setIsJoiningConsult(false);
      setHighlightSections(null); // Clear highlights when consult panel is closed
  };
  const handleViewFullRecord = () => {
      // Persist the include options for highlighting
      if (currentConsultation?.initialContext?.includeOptions) {
          console.log("Setting highlight sections:", currentConsultation.initialContext.includeOptions);
          setHighlightSections(currentConsultation.initialContext.includeOptions);
      } else {
           console.log("Clearing highlight sections (no options found).");
           setHighlightSections(null); // Clear if no options found
      }
      setIsJoiningConsult(false); // Switch view
  };

  // --- Render Consultation Options Modal (Defined here) ---
  const renderConsultOptionsModal = () => {
    if (!showConsultOptionsModal || !consultTargetUser) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
          <h3 className="text-xl font-semibold mb-4">Initiate Consultation with {consultTargetUser.name}</h3>
          {/* Topic Input */}
          <div className="mb-4">
             <label htmlFor="consultTopic" className="block text-sm font-medium text-gray-700 mb-1">
              Consultation Topic/Reason:
            </label>
             <input
              type="text"
              id="consultTopic"
              value={consultTopic}
              onChange={(e) => setConsultTopic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Review recent labs, Discuss treatment options"
            />
          </div>
           {/* Include Data Sections Checkboxes */}
           <div className="mb-4 border p-3 rounded border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-2">Include in shared context:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {Object.keys(consultIncludeOptions).map((key) => (
                  <label key={key} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={consultIncludeOptions[key]}
                      onChange={(e) => setConsultIncludeOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-indigo-600 rounded mr-2"
                    />
                    {key.replace('include', '')}
                  </label>
                ))}
              </div>
            </div>
          {/* AI Toggle */}
          <div className="mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={consultUseAI}
                onChange={(e) => setConsultUseAI(e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600 rounded"
              />
              <span className="ml-2 text-gray-700">Enable AI Assistance (Generate Focus Statement)</span>
            </label>
          </div>
          {/* Initiator Note */}
          <div className="mb-4">
            <label htmlFor="initiatorNote" className="block text-sm font-medium text-gray-700 mb-1">
              Add a note (optional):
            </label>
            <textarea
              id="initiatorNote"
              rows="3"
              value={consultInitiatorNote}
              onChange={(e) => setConsultInitiatorNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., 'Concerned about potential nephrotoxicity...'"
            ></textarea>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCloseConsultOptionsModal}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSendConsultInvitation}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
              disabled={!isMainWsConnected}
              title={!isMainWsConnected ? "WebSocket disconnected" : "Send consultation invitation"}
            >
              Send Invitation
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render Logic ---
  const commonHeader = (
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-indigo-700">Patient Record: {demographics.name || 'N/A'} ({patientId})</h2>
        {/* Ensure button is shown correctly and calls the right handler */} 
        {!isJoiningConsult && !showConsultOptionsModal && ( 
             <button 
                onClick={() => handleInitiateConsultation(
                    { id: 'dr_b', name: 'Dr. Baker (PCP)' } // Just pass the target user
                )}
                disabled={!patientId || !isMainWsConnected} 
                className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors duration-200 ${!patientId || !isMainWsConnected ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                title={patientId && isMainWsConnected ? "Start a real-time consultation with a colleague" : "Cannot consult (missing patient data or disconnected)"}
              >
                Consult Colleague
              </button>
        )}
      </div>
  );

  // --- Conditional Rendering Based on View Mode ---

  if (isJoiningConsult && currentConsultation) {
    // --- RENDER SIMPLIFIED "JOINING CONSULT" VIEW --- 
    return (
      <div className="max-w-4xl mx-auto p-4 bg-gray-100 rounded-lg shadow space-y-4 relative">
         {/* Notification Area */} 
         {incomingConsultRequest && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg w-3/4">
                    <strong className="font-bold">Consult Request!</strong>
                    <span className="block sm:inline ml-2">
                        {incomingConsultRequest.initiator?.name || 'A colleague'} wants to consult about Patient {incomingConsultRequest.patientId} regarding "{incomingConsultRequest.context?.description || 'General'}".
                    </span>
                    <button 
                        onClick={handleJoinConsultation}
                        className="ml-4 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-semibold"
                    >
                        Accept & Join
                    </button>
                    <button 
                        onClick={() => setIncomingConsultRequest(null)}
                        className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                        Dismiss
                    </button>
                </div>
            )}
            
            {commonHeader}
            
            {/* Focused Context Area - Updated to show related items */} 
            <section className="p-4 bg-white rounded shadow border border-indigo-200 space-y-3">
                <h3 className="text-lg font-semibold text-indigo-600">Consultation Context</h3>
                <div>
                    <p className="text-sm text-gray-700">
                        Initiated by: {currentConsultation.participants[0]?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-800 font-medium mt-1">
                        Initial Topic: {currentConsultation.initialContext?.description || 'General Consultation'}
                    </p>
                </div>
                
                {/* --- Display AI Consult Focus --- */}
                {currentConsultation.initialContext?.consultFocusStatement && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-semibold text-blue-800 mb-1">AI Generated Consult Focus:</p>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap"> 
                            {currentConsultation.initialContext.consultFocusStatement}
                        </p>
                    </div>
                )}
                {/* --- End AI Consult Focus --- */}
                
                {/* Display Included Related Info - USE HELPER COMPONENT */}
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                   <p className="text-sm font-medium text-gray-600 mb-1">Included Information Sent by Initiator:</p>
                   <RenderIncludedInfo relatedInfo={currentConsultation.initialContext?.relatedInfo} /> 
                </div>
            </section>
            
            {/* Consultation Panel takes main space */} 
            <section className="flex justify-center"> {/* Center the panel */} 
                <ConsultationPanel 
                   patientId={patientId}
                   consultationRoomId={currentConsultation.roomId}
                   currentUser={currentUser}
                   participants={currentConsultation.participants}
                   initialContext={currentConsultation.initialContext}
                   onClose={handleCloseConsultation}
                 />
            </section>
            
            {/* Button to switch back */} 
            <div className="text-center mt-4">
                <button 
                   onClick={handleViewFullRecord}
                   className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200 transition-colors"
                >
                    View Full Patient Record
                </button>
            </div>
         </div>
       );
   } else {
       // --- RENDER FULL PATIENT RECORD VIEW (Original Layout) --- 
       return (
         <div className="max-w-4xl mx-auto p-4 bg-gray-50 rounded-lg shadow space-y-6 relative"> 
             {/* Render Modal if shown */}
             {renderConsultOptionsModal()} 

             {/* Notification Area */} 
              {incomingConsultRequest && (
                 <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-lg w-3/4">
                     <strong className="font-bold">Consult Request!</strong>
                     <span className="block sm:inline ml-2">
                         {incomingConsultRequest.initiator?.name || 'A colleague'} wants to consult about Patient {incomingConsultRequest.patientId} regarding "{incomingConsultRequest.context?.description || 'General'}".
                     </span>
                     <button 
                         onClick={handleJoinConsultation}
                         className="ml-4 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-semibold"
                     >
                         Accept & Join
                     </button>
                     <button 
                         onClick={() => setIncomingConsultRequest(null)}
                         className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                     >
                         Dismiss
                     </button>
                 </div>
             )}
             
             {commonHeader}
     
             {/* --- CoPilot Prompt Panel --- */}
             <section className="p-4 bg-white rounded shadow sticky top-5 z-10 max-h-[50vh] overflow-y-auto">
               <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-indigo-700">CoPilot Prompt</h3>
               {/* Display MAIN WebSocket Connection Status */} 
               <div className="text-xs mb-2 text-right">
                 Connection Status: 
                 {wsUrl ? (
                   <span className={`font-semibold ${isMainWsConnected ? 'text-green-600' : (mainWsReadyState === 0 ? 'text-yellow-600' : 'text-red-600')}`}>
                     {isMainWsConnected ? 'Connected' : (mainWsReadyState === 0 ? 'Connecting...' : (mainWsReadyState === 2 ? 'Closing...' : 'Disconnected'))}
                   </span>
                 ) : (
                   <span className="text-gray-500 font-semibold">Inactive (No Patient ID)</span>
                 )}
               </div>
               <form onSubmit={handlePromptFormSubmit} className="space-y-3">
                 <textarea
                   value={promptText}
                   onChange={(e) => setPromptText(e.target.value)}
                   placeholder={`Ask about ${demographics.name || 'this patient'} (e.g., "Summarize latest notes", "What was the last WBC?", "Notify PCP about elevated glucose")`}
                   className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                   rows={3}
                   disabled={isProcessingPrompt || !isMainWsConnected} // Disable if processing OR not connected
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
                     disabled={isProcessingPrompt || !promptText.trim() || !isMainWsConnected} // Disable if processing, empty, OR not connected
                     className={`flex-grow px-4 py-2 rounded-md text-white font-semibold transition-colors duration-200 ${isProcessingPrompt || !promptText.trim() || !isMainWsConnected ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                   >
                     {isProcessingPrompt ? 'Processing...' : 'Submit Prompt'}
                   </button>
                   <button 
                     type="button" 
                     onClick={handleQuickSummaryClick} // Updated handler
                     disabled={isProcessingPrompt || !isMainWsConnected} // Disable if processing OR not connected
                     className={`px-4 py-2 rounded-md text-white font-semibold transition-colors duration-200 ${isProcessingPrompt || !isMainWsConnected ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                   >
                     {isProcessingPrompt ? 'Processing...' : 'Quick Summary'}
                   </button>
                 </div>
               </form>
               {/* --- Display Prompt Results/Errors --- */}
               {/* Display MAIN WebSocket connection errors first if they exist */} 
               {mainWsError && !promptError && ( // Show WS error if no specific prompt error is active
                  <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                   <p><strong>Connection Error:</strong> {promptError || mainWsError.message}</p> {/* Prioritize promptError if set */} 
                 </div>
               )}
               {/* Display prompt processing errors */} 
               {promptError && (
                 <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                   <p><strong>Error:</strong> {promptError}</p>
                 </div>
               )}
               {/* Display results in a more structured way */} 
               {promptResult && !promptError && ( // Only show results if no error
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
             <section className={`mb-6 p-4 bg-white rounded shadow ${highlightSections?.includeDiagnosis ? 'border-2 border-yellow-400 shadow-lg shadow-yellow-200/50' : ''}`}>
               <h3 className="text-xl font-semibold mb-3 border-b pb-2 text-gray-800">Diagnosis</h3>
               <div className="text-sm">
                 <p><strong>Primary:</strong> {diagnosis.primary || 'N/A'}</p>
                 <p><strong>Diagnosed Date:</strong> {formatDate(diagnosis.diagnosedDate)}</p>
                 <p><strong>Status:</strong> {diagnosis.status || 'N/A'}</p>
               </div>
             </section>

             {/* Combined History Section */}
             <section className={`mb-6 p-4 bg-white rounded shadow ${highlightSections?.includeHistory || highlightSections?.includeMeds || highlightSections?.includeAllergies ? 'border-2 border-yellow-400 shadow-lg shadow-yellow-200/50' : ''}`}>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className={highlightSections?.includeHistory ? 'bg-yellow-50 p-2 rounded' : ''}>
                   <h4 className="text-lg font-semibold mb-2 text-gray-700">Medical History</h4>
                   {medicalHistory.length > 0 ? (
                     <ul className="list-disc list-inside text-sm space-y-1">
                       {medicalHistory.map((item, index) => <li key={index}>{item}</li>)}
                     </ul>
                   ) : <p className="text-sm text-gray-500">None reported.</p>}
                 </div>
                 <div className={highlightSections?.includeMeds ? 'bg-yellow-50 p-2 rounded' : ''}>
                   <h4 className="text-lg font-semibold mb-2 text-gray-700">Current Medications</h4>
                   {currentMedications.length > 0 ? (
                     <ul className="list-disc list-inside text-sm space-y-1">
                       {currentMedications.map((med, index) => (
                         <li key={index}>{med.name} {med.dosage} {med.frequency}</li>
                       ))}
                     </ul>
                   ) : <p className="text-sm text-gray-500">None reported.</p>}
                 </div>
                 <div className={highlightSections?.includeAllergies ? 'bg-yellow-50 p-2 rounded' : ''}>
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
             <section className={`mb-6 p-4 bg-white rounded shadow ${highlightSections?.includeLabs ? 'border-2 border-yellow-400 shadow-lg shadow-yellow-200/50' : ''}`}>
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
             <section className={`mb-6 p-4 bg-white rounded shadow ${highlightSections?.includeNotes ? 'border-2 border-yellow-400 shadow-lg shadow-yellow-200/50' : ''}`}>
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

             {/* --- Consultation Panel (Renders if Dr. A initiated or Dr. B switched back) --- */}
             {isConsultPanelOpen && currentConsultation && (
             <div className="absolute top-16 right-5 z-20"> {/* Adjusted top positioning slightly */} 
               <ConsultationPanel 
                 patientId={patientId}
                 consultationRoomId={currentConsultation.roomId}
                 currentUser={currentUser}
                 participants={currentConsultation.participants}
                 initialContext={currentConsultation.initialContext}
                 onClose={handleCloseConsultation}
               />
             </div>
           )}

         </div>
       );
   }
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
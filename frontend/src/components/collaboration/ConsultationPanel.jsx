import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import useWebSocket from '../../hooks/useWebSocket'; // Adjust path if necessary

const ConsultationPanel = ({ 
  patientId, 
  consultationRoomId, 
  currentUser, // e.g., { id: 'dr_a', name: 'Dr. A' }
  participants, // e.g., [{ id: 'dr_b', name: 'Dr. B' }]
  initialContext, // Optional: e.g., { type: 'lab', id: 'lab123', description: 'Glucose 110 mg/dL' }
  onClose // Function to close the panel
}) => {

  // --- Add Logging --- 
  console.log('[ConsultPanel] Rendering with props:', {
      patientId,
      consultationRoomId,
      currentUser,
      participants,
      initialContext
  });
  // --- End Logging ---

  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]); // Array to hold message objects { senderId, senderName, text, timestamp, type: 'chat'|'agent'|'system' }
  const messagesEndRef = useRef(null); // To scroll to bottom

  // --- WebSocket Connection ---
  // TODO: Securely generate/retrieve auth token
  const authToken = `valid_token_${currentUser?.id || 'unknown'}`; 
  const wsUrl = consultationRoomId ? `ws://localhost:8000/ws` : null; // Use generic endpoint, room handled by join message

  const {
    isConnected: isWsConnected,
    lastMessage: lastWsMessage,
    sendMessage: sendWsMessage,
    error: wsError,
    readyState: wsReadyState
  } = useWebSocket(wsUrl, authToken, consultationRoomId); // Pass room ID to useWebSocket hook

  // --- Add Logging --- 
  useEffect(() => {
      console.log('[ConsultPanel] WebSocket State:', {
          url: wsUrl,
          tokenUsed: authToken,
          room: consultationRoomId,
          isConnected: isWsConnected,
          readyState: wsReadyState,
          error: wsError
      });
  }, [wsUrl, authToken, consultationRoomId, isWsConnected, wsReadyState, wsError]);
  // --- End Logging ---

  // --- Message Handling ---
  useEffect(() => {
    if (lastWsMessage) {
      // Log the entire message received by the panel
      console.log("[ConsultPanel] Raw incoming message:", JSON.stringify(lastWsMessage, null, 2)); 
      const { type } = lastWsMessage;

      let receivedMsg = null;

      if (type === 'chat_message') {
         console.log("[ConsultPanel] Handling chat_message");
         // Basic example: structure needs to be defined by backend
         receivedMsg = {
             senderId: lastWsMessage.senderId || 'system', 
             senderName: lastWsMessage.senderName || 'System', 
             text: lastWsMessage.text || JSON.stringify(lastWsMessage), 
             timestamp: lastWsMessage.timestamp || Date.now(),
             type: 'chat' // Explicitly set type for rendering
         };
      } else if (type === 'agent_result') {
         console.log("[ConsultPanel] Handling agent_result"); // <-- Log entry
         // Handle results from agent commands
         const agentResultPayload = lastWsMessage.result;
         console.log("[ConsultPanel] Agent Result Payload:", agentResultPayload); // <-- Log the nested result
         const agentOutput = agentResultPayload?.output; 
         console.log("[ConsultPanel] Agent Output Field:", agentOutput); // <-- Log the output field
         let agentText = "AI processed the request (no specific output text found)."; // Default text
         
         // Extract meaningful text from known agent outputs
         if(agentOutput?.summary_text) {
             agentText = agentOutput.summary_text;
             console.log("[ConsultPanel] Extracted summary_text:", agentText);
         } else if (agentOutput?.answer_text) {
             agentText = agentOutput.answer_text;
              console.log("[ConsultPanel] Extracted answer_text:", agentText);
         } else if (agentResultPayload?.summary) {
             agentText = agentResultPayload.summary;
             console.log("[ConsultPanel] Extracted fallback summary:", agentText);
         } else if (agentResultPayload?.message) {
              agentText = agentResultPayload.message;
              console.log("[ConsultPanel] Extracted fallback message:", agentText);
         } else if (typeof agentResultPayload === 'string') {
              agentText = agentResultPayload;
              console.log("[ConsultPanel] Result was string:", agentText);
         } else if (agentResultPayload?.status === 'failure') {
             agentText = `AI Error: ${agentResultPayload.error_message || 'Unknown error'}`;
             console.log("[ConsultPanel] Handled failure status:", agentText);
         }
         
         receivedMsg = {
             senderId: 'ai_agent', 
             senderName: 'CoPilot AI', 
             text: agentText,
             timestamp: lastWsMessage.timestamp || Date.now(),
             type: 'agent' 
         };
         console.log("[ConsultPanel] Prepared agent message object:", receivedMsg); // <-- Log the final object
      } else if (type === 'error') {
         console.log("[ConsultPanel] Handling error message type");
         receivedMsg = {
             senderId: 'system', senderName: 'System', text: `Error: ${lastWsMessage.message}`, timestamp: Date.now(), type: 'system' 
         };
      } else if (type === 'system_message') { // Handle the system message we added
          console.log("[ConsultPanel] Handling system_message");
          receivedMsg = {
             senderId: 'system',
             senderName: 'System',
             text: lastWsMessage.text || 'System update.',
             timestamp: Date.now(),
             type: 'system' 
         };
      }
      // Ignore auth/join messages handled by the hook itself
      else {
          console.log(`[ConsultPanel] Ignoring message type: ${type}`);
      }

      if(receivedMsg){
           console.log("[ConsultPanel] Adding message to state:", receivedMsg);
           setMessages(prevMessages => [...prevMessages, receivedMsg]);
      }
    }
  }, [lastWsMessage]);

  // Effect to scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
    
   // Effect to handle WebSocket connection errors
   useEffect(() => {
     if (wsError) {
        setMessages(prevMessages => [...prevMessages, {
            senderId: 'system', senderName: 'System', text: `WebSocket Error: ${wsError.message}`, timestamp: Date.now(), type: 'system' 
        }]);
     }
   }, [wsError]);


  // --- Sending Messages & Commands ---
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !isWsConnected) return;

    const messageToSend = {
      type: 'chat_message', // Define specific message type for backend routing
      room: consultationRoomId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: newMessage,
      timestamp: Date.now()
    };

    console.log("Sending chat message:", messageToSend);
    sendWsMessage(messageToSend); // Send the structured message object
    setNewMessage(''); // Clear input field
    
    // Optimistic UI update (optional) - Add message locally immediately
    // setMessages(prevMessages => [...prevMessages, { ...messageToSend, type: 'chat' }]); 

  }, [newMessage, isWsConnected, sendWsMessage, consultationRoomId, currentUser]);

  const handleSendCommand = useCallback((command, params = {}) => {
      if (!isWsConnected) return;

      // Corrected payload structure to match backend expectations
      const commandToSend = {
        type: 'agent_command', 
        roomId: consultationRoomId, // Use roomId
        sender: {                // Use sender object
             id: currentUser.id,
             name: currentUser.name 
        },
        patientId: patientId,       // Include patientId
        command: command,
        params: params, 
        timestamp: Date.now()
      };

      console.log("Sending agent command:", commandToSend);
      sendWsMessage(commandToSend);
      
      // Optional: Add a local system message indicating command was sent?
      // setMessages(prevMessages => [...prevMessages, { type:'system', text:`Command sent: /${command}`, ... }]);

  }, [isWsConnected, sendWsMessage, consultationRoomId, currentUser, patientId]); // Added patientId to dependencies

  // Function to send predefined chat messages
  const handleSendPredefinedMessage = useCallback((text) => {
      if (!isWsConnected) return;
      const messageToSend = {
          type: 'chat_message',
          room: consultationRoomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          text: text, // Use the predefined text
          timestamp: Date.now()
      };
      console.log("Sending predefined chat message:", messageToSend);
      sendWsMessage(messageToSend);
      // Optionally add optimistic UI update here if needed
  }, [isWsConnected, sendWsMessage, consultationRoomId, currentUser]);

  // Handle Enter key press in input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline
      handleSendMessage();
    }
  };

  // --- UI Rendering ---
  return (
    // Basic styling - enhance later with Tailwind etc.
    <div style={{ 
        border: '1px solid #ccc', 
        borderRadius: '8px', 
        height: '500px', 
        width: '400px', 
        display: 'flex', 
        flexDirection: 'column', 
        margin: '10px',
        backgroundColor: '#f9f9f9'
    }}>
      {/* Header */}
      <div style={{ padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h4 style={{ margin: 0, fontSize: '1.1em' }}>Consult: Patient {patientId}</h4>
             {/* Context display removed - shown in parent component */}
             <p style={{fontSize: '0.8em', color: '#555', margin: '2px 0 0 0'}}>
                 Participants: {currentUser.name}, {participants.map(p => p.name).join(', ')}
             </p>
             <p style={{fontSize: '0.7em', color: isWsConnected ? 'green' : 'red', margin: '2px 0 0 0'}}>
                 Status: {isWsConnected ? 'Connected' : (wsReadyState === 0 ? 'Connecting...' : 'Disconnected')} {wsError ? `(${wsError.message})` : ''}
             </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2em', cursor: 'pointer' }}>&times;</button>
      </div>

      {/* Message Display Area */}
      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.map((msg, index) => {
          // Determine alignment and styling based on sender type
          const isCurrentUser = msg.senderId === currentUser.id;
          const isAgent = msg.senderId === 'ai_agent';
          const isSystem = msg.senderId === 'system';
          const alignment = isCurrentUser ? 'right' : 'left';
          const bubbleColor = isCurrentUser ? '#dcf8c6' : (isAgent ? '#e1f5fe' : (isSystem ? '#f1f1f1' : '#fff'));
          const bubbleBorder = isAgent || isSystem ? '1px dashed #ccc' : '1px solid #eee';
          const nameStyle = isAgent || isSystem ? { fontStyle: 'italic' } : {};

          return (
            <div key={index} style={{ marginBottom: '10px', textAlign: alignment }}>
              {/* Sender Name & Timestamp */}
               <span style={{ fontSize: '0.7em', color: '#777', display: 'block', ...nameStyle }}>
                  {/* Optionally add an icon for AI/System */} 
                  {isAgent && '🤖 '} 
                  {isSystem && '⚙️ '} 
                  {msg.senderName} ({new Date(msg.timestamp).toLocaleTimeString()})
              </span>
              {/* Message Bubble */}
              <div style={{ 
                  display: 'inline-block', 
                  padding: '8px 12px', 
                  borderRadius: '10px', 
                  backgroundColor: bubbleColor, 
                  border: bubbleBorder,
                  maxWidth: '85%', 
                  textAlign: 'left' // Keep text left-aligned inside bubble
              }}>
                  {/* Message Text - Preserve Formatting */}
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}> 
                      {msg.text}
                  </p>
                  
                  {/* --- Contextual Follow-up Actions --- */}
                  {msg.type === 'agent_result' && msg.command === 'ask_glucose_trend' && (
                      <div style={{ marginTop: '8px', paddingTop: '5px', borderTop: '1px dashed #ccc' }}>
                          <p style={{ fontSize: '0.75em', color: '#444', marginBottom: '4px', fontWeight: '500' }}>Follow-up Actions:</p>
                          <button 
                              onClick={() => handleSendPredefinedMessage('[System Notification] Dr. B acknowledged glucose trend/A1c. Will continue monitoring.')}
                              style={contextualButtonStyle}
                              title="Send acknowledgment message to chat"
                          >
                              Acknowledge & Monitor
                          </button>
                          <button 
                              onClick={() => handleSendPredefinedMessage('[System Notification] Dr. B to Dr. A: Glucose trend noted. Thoughts on current management/Metformin?')}
                              style={{...contextualButtonStyle, marginLeft: '5px'}}
                              title="Send message to discuss management"
                          >
                              Discuss Trend/Meds
                          </button>
                      </div>
                  )}
                  {/* --- End Contextual Follow-up Actions --- */}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} /> 
      </div>
      
      {/* --- Suggested AI Questions --- */}
      <div style={{ padding: '5px 10px', borderTop: '1px solid #eee' }}>
          <p style={{ fontSize: '0.8em', color: '#555', marginBottom: '5px', fontWeight: '500' }}>Suggested AI Questions:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              <button 
                  onClick={() => handleSendCommand('ask_glucose_trend', { question: 'What is the recent glucose trend & last A1c?' })}
                  disabled={!isWsConnected}
                  style={suggestedButtonStyle(isWsConnected)}
              >
                  Glucose Trend & A1c?
              </button>
              <button 
                  onClick={() => handleSendCommand('ask_letrozole_effect', { question: 'Could Letrozole affect glucose or interact with Metformin?' })}
                  disabled={!isWsConnected}
                  style={suggestedButtonStyle(isWsConnected)}
              >
                  Letrozole/Glucose Impact?
              </button>
               <button 
                  onClick={() => handleSendCommand('ask_management_recommendations', { question: 'What are standard recommendations for managing this glucose level during cancer treatment?' })}
                  disabled={!isWsConnected}
                  style={suggestedButtonStyle(isWsConnected)}
               >
                  Management Recommendations?
              </button>
          </div>
      </div>
      {/* --- End Suggested AI Questions --- */}

       {/* Agent/Graph Interaction Buttons */}
       <div style={{ padding: '5px 10px', borderTop: '1px solid #eee', borderBottom: '1px solid #eee', background: '#f0f0f0' }}>
            <span style={{ fontSize: '0.8em', color: '#666' }}>Quick Actions: </span>
            {/* Functional Summarize Button */}
            <button 
                onClick={() => handleSendCommand('summarize')}
                disabled={!isWsConnected} 
                title={isWsConnected ? "Request AI Summary" : "Not connected"}
                style={{fontSize: '0.7em', margin:'2px', padding: '2px 5px', cursor: isWsConnected ? 'pointer' : 'not-allowed'}}
            >
                Summarize Record
            </button>
            {/* Functional Check Interactions Button */}
            <button 
                onClick={() => handleSendCommand('check_interactions')}
                disabled={!isWsConnected} 
                title={isWsConnected ? "Check Drug Interactions" : "Not connected"}
                style={{fontSize: '0.7em', margin:'2px', padding: '2px 5px', cursor: isWsConnected ? 'pointer' : 'not-allowed'}}
            >
                Check Interactions
            </button>
            {/* Other placeholder buttons */}
            <button disabled style={{fontSize: '0.7em', margin:'2px', padding: '2px 5px'}}>/graph ...</button>
       </div>

      {/* Input Area */}
      <div style={{ display: 'flex', padding: '10px', borderTop: '1px solid #eee' }}>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={!isWsConnected}
          style={{ flexGrow: 1, marginRight: '10px', resize: 'none', padding: '8px', border: '1px solid #ccc', borderRadius: '5px' }}
          rows={2}
        />
        <button 
          onClick={handleSendMessage} 
          disabled={!isWsConnected || !newMessage.trim()}
          style={{ padding: '8px 15px', cursor: !isWsConnected || !newMessage.trim() ? 'not-allowed' : 'pointer'}}
        >
            Send
        </button>
      </div>
    </div>
  );
};

// Helper function for button styling to avoid repetition
const suggestedButtonStyle = (enabled) => ({
    fontSize: '0.75em',
    padding: '3px 8px',
    backgroundColor: enabled ? '#e0e7ff' : '#e5e7eb',
    color: enabled ? '#3730a3' : '#9ca3af',
    border: '1px solid #c7d2fe',
    borderRadius: '4px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    opacity: enabled ? 1 : 0.6,
});

// Helper function for contextual buttons inside messages
const contextualButtonStyle = {
    fontSize: '0.7em',
    padding: '2px 6px',
    backgroundColor: '#f0f9ff',
    color: '#075985',
    border: '1px solid #bae6fd',
    borderRadius: '4px',
    cursor: 'pointer',
};

ConsultationPanel.propTypes = {
  patientId: PropTypes.string.isRequired,
  consultationRoomId: PropTypes.string.isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
   initialContext: PropTypes.object,
   onClose: PropTypes.func.isRequired,
};

export default ConsultationPanel; 
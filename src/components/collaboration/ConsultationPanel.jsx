import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import useWebSocket from '../../hooks/useWebSocket'; // <<<- IMPORTANT: Check if this path is correct relative to src/components/collaboration

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
         // Need to handle sender being an object
         const senderName = typeof lastWsMessage.sender === 'object' ? lastWsMessage.sender.name : (lastWsMessage.senderName || 'System');
         const senderId = typeof lastWsMessage.sender === 'object' ? lastWsMessage.sender.id : (lastWsMessage.senderId || 'system');
         receivedMsg = {
             senderId: senderId,
             senderName: senderName, 
             text: lastWsMessage.content || lastWsMessage.text || JSON.stringify(lastWsMessage), // Prioritize content, then text
             timestamp: lastWsMessage.timestamp || Date.now(),
             type: 'chat' // Explicitly set type for rendering
         };
      } else if (type === 'agent_response') { // Corrected type check
         console.log("[ConsultPanel] Handling agent_response"); 
         
         let agentText = lastWsMessage.text || "Agent response received, but text is missing."; // Get text directly
         const agentStatus = lastWsMessage.status || "success"; // Check status
         const agentName = lastWsMessage.sender || "ai_agent"; // Get agent name from sender field
         const agentDisplayName = agentName.replace("_", " ").title(); // Format display name

         if(agentStatus === 'failure') {
             agentText = `AI Error (${agentDisplayName}): ${lastWsMessage.error || agentText}`;
             console.log("[ConsultPanel] Handled agent failure status:", agentText);
         }
         
         receivedMsg = {
             senderId: 'agent', // Use generic 'agent' ID or specific agentName
             senderName: agentDisplayName, 
             text: agentText,
             timestamp: lastWsMessage.timestamp || Date.now(),
             type: 'agent' // Keep type as 'agent' for styling
         };
         console.log("[ConsultPanel] Prepared agent message object:", receivedMsg);
      } else if (type === 'agent_output') {
        console.log("[ConsultPanel] Handling generic agent_output");
        const agentName = lastWsMessage.agentName || "Unknown Agent";
        // Basic name formatting (can be improved)
        const agentDisplayName = agentName.replace("Agent", "").replace(/([A-Z])/g, ' $1').trim(); 
        receivedMsg = {
            senderId: agentName, 
            senderName: agentDisplayName, // Show which agent produced the output
            text: lastWsMessage.content || "Agent output received, but content is missing.", // Get text from 'content' field
            timestamp: lastWsMessage.timestamp || Date.now(),
            type: 'agent' // Render as an agent message
        };
        console.log("[ConsultPanel] Prepared agent_output message object:", receivedMsg);
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
             text: lastWsMessage.content || 'System update.',
             timestamp: lastWsMessage.timestamp || Date.now(),
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
    const messageText = newMessage.trim();
    if (!messageText || !isWsConnected) return;

    let messageToSend = null;

    // Check for specific agent commands
    if (messageText.startsWith('/compare-therapy') || messageText.startsWith('/draft-patient-info')) {
        // Send the raw command text as a message
        // The backend's handle_message_for_agent will parse it
        console.log(`Sending agent command via text: ${messageText}`);
        messageToSend = {
            type: 'agent_command_text', // Use a specific type for raw command text
            roomId: consultationRoomId, // Use roomId from props
            sender: { // Use sender object
                id: currentUser.id,
                name: currentUser.name 
            },
            patientId: patientId, // Include patientId from props
            text: messageText,
            timestamp: Date.now()
        };
    } else {
        // Standard chat message
        messageToSend = {
            type: 'chat_message', 
            roomId: consultationRoomId, // Use roomId from props
            sender: { // Use sender object
                id: currentUser.id,
                name: currentUser.name 
            },
            patientId: patientId, // Include patientId from props
            content: messageText, // Use 'content' key as expected by backend chat handling
            text: messageText, // Also keep text for optimistic UI or if backend uses it
            timestamp: Date.now()
        };
    }

    console.log("Sending WebSocket message:", messageToSend);
    sendWsMessage(messageToSend); // Send the structured message object
    setNewMessage(''); // Clear input field
    
    // Optimistic UI update (optional) - Add user's own message locally immediately
    // if (messageToSend.type === 'chat_message') {
    //     setMessages(prevMessages => [...prevMessages, { 
    //         senderId: currentUser.id, 
    //         senderName: currentUser.name, 
    //         text: messageText, 
    //         timestamp: messageToSend.timestamp,
    //         type: 'chat' 
    //     }]); 
    // }

  }, [newMessage, isWsConnected, sendWsMessage, consultationRoomId, currentUser, patientId]); // Added patientId

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

  // Function to send predefined chat messages - Added replyingToTimestamp
  const handleSendPredefinedMessage = useCallback((text, replyingToTimestamp) => {
      if (!isWsConnected) return;
      const messageToSend = {
          type: 'chat_message',
          room: consultationRoomId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          text: text, // Use the predefined text
          timestamp: Date.now(), // Timestamp of this new message
          replyingToTimestamp: replyingToTimestamp // Link to the original AI message
      };
      console.log("Sending predefined chat message:", messageToSend);
      sendWsMessage(messageToSend);
      // Optionally add optimistic UI update here if needed
  }, [isWsConnected, sendWsMessage, consultationRoomId, currentUser]);

  // Handle Enter key press in input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent default Enter behavior (new line)
      handleSendMessage();
    }
  };

  // --- Add Logging --- 
  useEffect(() => {
      console.log("[ConsultPanel] Initial context received:", initialContext);
      if (initialContext?.description) {
          // Add initial context as a system message
          const systemMsg = {
              senderId: 'system',
              senderName: 'System',
              text: `Consultation started regarding: ${initialContext.description}`,
              timestamp: Date.now(),
              type: 'system'
          };
          setMessages([systemMsg]); // Start with the context message
          console.log("[ConsultPanel] Added initial context message:", systemMsg);
      }
  }, [initialContext]); // Run only when initialContext changes (effectively on mount/prop change)
  // --- End Logging ---

  // --- Rendering Logic ---
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error("Error formatting timestamp:", timestamp, e);
      return 'Invalid Date';
    }
  };

  // --- UI Elements ---
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>Consultation: Patient {patientId}</span>
        <button onClick={onClose} style={closeButtonStyle}>&times;</button>
      </div>

      {/* Participants */}
      <div style={participantsStyle}>
        Participants: {currentUser.name}, {participants.map(p => p.name).join(', ')}
      </div>

      {/* Message Display Area */}
      <div style={messagesAreaStyle}>
        {messages.map((msg, index) => (
          <div key={index} style={messageStyle(msg.senderId === currentUser.id, msg.type)}>
            <span style={senderNameStyle(msg.senderId === currentUser.id, msg.type)}>
                {msg.senderName} ({formatTimestamp(msg.timestamp)})
            </span>
            <p style={messageTextStyle}>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Anchor for scrolling */} 
      </div>

      {/* Message Input Area */}
      <div style={inputAreaStyle}>
        <textarea
          style={textareaStyle}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress} // Use onKeyPress for Enter
          placeholder="Type your message or command..."
          rows={3}
          disabled={!isWsConnected}
        />
        <button 
          style={sendButtonStyle(!isWsConnected || !newMessage.trim())} 
          onClick={handleSendMessage} 
          disabled={!isWsConnected || !newMessage.trim()}
        >
          Send
        </button>
      </div>

      {/* WebSocket Status */}
      <div style={statusStyle(isWsConnected)}>
        {isWsConnected ? 'Connected' : 'Connecting...'}
      </div>
    </div>
  );
};

ConsultationPanel.propTypes = {
  patientId: PropTypes.string.isRequired,
  consultationRoomId: PropTypes.string.isRequired,
  currentUser: PropTypes.shape({ 
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired,
  participants: PropTypes.arrayOf(PropTypes.shape({ 
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })).isRequired,
  initialContext: PropTypes.object, // Can be any object
  onClose: PropTypes.func.isRequired,
};

// --- Basic Inline Styles (Replace with CSS Modules or Styled Components in a real app) ---
const panelStyle = {
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  width: '400px',
  height: '500px',
  backgroundColor: 'white',
  border: '1px solid #ccc',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000, // Ensure it's above other content
};

const headerStyle = {
  padding: '10px 15px',
  borderBottom: '1px solid #eee',
  backgroundColor: '#f7f7f7',
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontWeight: 'bold',
};

const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#666',
};

const participantsStyle = {
    padding: '5px 15px',
    fontSize: '0.8em',
    color: '#555',
    borderBottom: '1px solid #eee',
};

const messagesAreaStyle = {
  flexGrow: 1,
  overflowY: 'auto',
  padding: '15px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const messageStyle = (isCurrentUser, messageType) => ({
  alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
  maxWidth: '80%',
  padding: '8px 12px',
  borderRadius: '15px',
  backgroundColor: messageType === 'agent' ? '#e1f5fe' : (isCurrentUser ? '#dcf8c6' : '#f1f0f0'),
  wordWrap: 'break-word',
});

const senderNameStyle = (isCurrentUser, messageType) => ({
  display: 'block',
  fontSize: '0.75em',
  fontWeight: 'bold',
  color: messageType === 'agent' ? '#0277bd' : (isCurrentUser ? '#555' : '#333'),
  marginBottom: '3px',
});

const messageTextStyle = {
    margin: 0, // Remove default paragraph margins
    fontSize: '0.9em',
    whiteSpace: 'pre-wrap', // Preserve whitespace and newlines
};

const inputAreaStyle = {
  display: 'flex',
  padding: '10px',
  borderTop: '1px solid #eee',
  gap: '10px',
};

const textareaStyle = {
  flexGrow: 1,
  padding: '8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  resize: 'none',
  fontFamily: 'inherit', // Ensure font matches the rest of the app
};

const sendButtonStyle = (disabled) => ({
  padding: '10px 15px',
  backgroundColor: disabled ? '#ccc' : '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const statusStyle = (isConnected) => ({
    padding: '5px 15px',
    fontSize: '0.75em',
    textAlign: 'center',
    color: isConnected ? 'green' : 'orange',
    backgroundColor: '#f7f7f7',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
});

// Suggested Actions Style (Example)
const suggestedActionsStyle = {
  padding: '5px 15px',
  display: 'flex',
  gap: '5px',
  flexWrap: 'wrap',
  borderTop: '1px solid #eee',
};

const suggestedButtonStyle = (enabled) => ({
    padding: '4px 8px',
    fontSize: '0.8em',
    backgroundColor: enabled ? '#e0e0e0' : '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: '10px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? '#333' : '#999',
});


export default ConsultationPanel; 
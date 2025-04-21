import React, { useState, useEffect } from 'react';
import useWebSocket from '../../hooks/useWebSocket'; // Adjust path if needed

// --- Configuration (Replace with dynamic values later) --- 
const WS_URL = 'ws://localhost:8000/ws/react-client'; // Use ws:// for local dev
const DUMMY_AUTH_TOKEN = 'valid_token_user123'; // Example valid token for backend placeholder
const DUMMY_ROOM_ID = 'consult_room_abc';
// --- End Configuration --- 

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');

  const { 
    isConnected, 
    lastMessage, 
    sendMessage, 
    error,
    readyState
  } = useWebSocket(WS_URL, DUMMY_AUTH_TOKEN, DUMMY_ROOM_ID);

  // Append new messages to the list when they arrive
  useEffect(() => {
    if (lastMessage) {
      // Avoid adding confirmation messages to the chat log
      if (lastMessage.type === 'message') {
         setMessages((prevMessages) => [...prevMessages, lastMessage]);
      }
      // Could handle other types like 'join', 'leave' notifications here
    }
  }, [lastMessage]);

  const handleSendMessage = () => {
    if (messageInput.trim() && isConnected) {
      sendMessage(messageInput); // Send plain text for now
      setMessageInput(''); // Clear input field
    }
  };

  const handleInputChange = (event) => {
    setMessageInput(event.target.value);
  };
  
  const handleKeyPress = (event) => {
     if (event.key === 'Enter' && !event.shiftKey) {
       event.preventDefault(); // Prevent newline on Enter
       handleSendMessage();
     }
  };

  // Helper to display readyState
  const getStatusText = () => {
      if (error) return `Error: ${error.message}`;
      switch (readyState) {
          case WebSocket.CONNECTING: return 'Connecting...';
          case WebSocket.OPEN:
               return isConnected ? 'Connected & Ready' : 'Authenticating/Joining...';
          case WebSocket.CLOSING: return 'Closing...';
          case WebSocket.CLOSED: return 'Disconnected';
          default: return 'Idle';
      }
  };

  return (
    <div className="border rounded p-4 shadow bg-white max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-2">WebSocket Test Chat</h3>
      <div className="text-sm mb-2">Status: <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>{getStatusText()}</span></div>
      
      {/* Message Display Area */}
      <div className="h-48 overflow-y-auto border rounded p-2 mb-2 bg-gray-50 text-xs space-y-1">
        {messages.map((msg, index) => (
          <div key={index}>
            <span className="font-semibold text-blue-700">{msg.sender || 'System'}:</span> {msg.data}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress} // Send on Enter
          className="flex-grow p-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder={isConnected ? "Type your message..." : "Waiting for connection..."}
          disabled={!isConnected}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !messageInput.trim()}
          className={`px-4 py-1.5 rounded text-sm text-white font-semibold transition-colors ${
            (!isConnected || !messageInput.trim()) 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatComponent; 
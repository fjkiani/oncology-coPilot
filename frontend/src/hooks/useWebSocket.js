import { useState, useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, authToken, roomToJoin) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track auth state
  const [isInRoom, setIsInRoom] = useState(false); // Track room join state
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const ws = useRef(null);

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
    }
    if (!url) {
      console.error("WebSocket URL is not provided.");
      return;
    }

    console.log(`Attempting to connect WebSocket to: ${url}`);
    ws.current = new WebSocket(url);
    setIsConnected(false); // Reset states on new connection attempt
    setIsAuthenticated(false);
    setIsInRoom(false);
    setError(null);

    ws.current.onopen = () => {
      console.log('WebSocket Connected');
      if (authToken) {
        console.log(`Sending auth token and initial room/patientId: ${roomToJoin}`);
        const authPayload = { 
            type: 'auth', 
            token: authToken,
            patientId: roomToJoin // Use roomToJoin as the patientId for auto-join
        };
        const authMsg = JSON.stringify(authPayload);
        ws.current?.send(authMsg);
      } else {
        console.warn('No auth token provided for WebSocket connection.');
      }
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket Disconnected', event.reason, `Code: ${event.code}`);
      setIsConnected(false);
      setIsAuthenticated(false);
      setIsInRoom(false);
      if (event.code !== 1000) { 
          setError(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason || ''}`.trim()));
      }
      ws.current = null; 
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket Error: ", err);
      setError(new Error('WebSocket connection error.'));
      setIsConnected(false);
      setIsAuthenticated(false);
      setIsInRoom(false);
       ws.current = null;
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket Message Received:", message);

        if (message.type === 'auth_success') {
          console.log('WebSocket Authentication successful');
          setIsAuthenticated(true);
          if (roomToJoin) {
              console.log(`Authentication successful, assuming auto-join to room: ${roomToJoin}`);
              setIsInRoom(true);
              setIsConnected(true); // Consider connected after successful auth & implied join
          } else {
               console.log('Authentication successful, but no specific room to join.');
               setIsConnected(true); 
          }
        } else if (message.type === 'auth_fail') {
          console.error('WebSocket Authentication failed:', message.message);
          setError(new Error(`Authentication failed: ${message.message}`));
          setIsAuthenticated(false);
          setIsConnected(false);
          ws.current?.close(1008, "Authentication Failed"); // Close connection on auth failure
        } else if (message.type === 'status' && message.message?.startsWith('Joined room')) {
             const joinedRoomId = message.message.split(' ').pop();
             console.log(`Successfully joined room: ${joinedRoomId}`);
             if (joinedRoomId === roomToJoin) {
                 setIsInRoom(true);
                 setIsConnected(true); 
             } else {
                 console.warn(`Joined a different room (${joinedRoomId}) than initially specified (${roomToJoin})`);
             }
        } else if (message.type === 'error') {
            console.error('Received error message from WebSocket:', message.message);
            setError(new Error(`Server error: ${message.message}`));
        } else {
           setLastMessage(message);
        }

      } catch (e) {
        console.error("Failed to parse WebSocket message or handle message:", e, "Raw data:", event.data);
      }
    };

  }, [url, authToken, roomToJoin]); // Dependencies for reconnecting

  // Effect to establish connection on mount or when dependencies change
  useEffect(() => {
    // Ensure all required parameters are present before attempting connection
    if (url && authToken && roomToJoin) { 
        console.log(`[useWebSocket Effect] Dependencies met, attempting connect for room: ${roomToJoin}, url: ${url}`);
        connect();
    } else {
        // Log why connection is not attempted
        console.log(`[useWebSocket Effect] Skipping connection attempt. url: ${!!url}, authToken: ${!!authToken}, roomToJoin: ${!!roomToJoin}`);
        // Ensure connection is closed if params become invalid while connected
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            console.log("[useWebSocket Effect] Closing existing connection due to invalid parameters.");
            ws.current.close(1000, "Invalid parameters");
            ws.current = null; // Clear ref
             // Reset state explicitly when params become invalid
            setIsConnected(false);
            setIsAuthenticated(false);
            setIsInRoom(false);
            setError(null);
        }
    }
    
    // Cleanup function to close WebSocket connection on unmount or before re-running effect
    return () => {
      if (ws.current) {
        console.log(`[useWebSocket Cleanup] Closing WebSocket connection for room: ${roomToJoin}`);
        ws.current.close(1000, "Component unmounting or parameters changed"); // Normal closure
        ws.current = null;
      }
    };
  }, [url, authToken, roomToJoin, connect]); // Re-run if connection details change

  // Function to send messages
  const sendMessage = useCallback((message) => {
    const readyToSend = ws.current && ws.current.readyState === WebSocket.OPEN && isConnected && isAuthenticated && isInRoom;
    if (readyToSend) {
        const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
        console.log("Sending WebSocket Message:", messageToSend);
        ws.current.send(messageToSend);
    } else {
      console.error(`WebSocket is not ready to send. State: connected=${isConnected}, authenticated=${isAuthenticated}, inRoom=${isInRoom}, readyState=${ws.current?.readyState}`);
      setError(new Error("Connection not fully established. Cannot send message."));
    }
  }, [isConnected, isAuthenticated, isInRoom]); // Depend on all state parts

  return { 
      isConnected: isConnected && isAuthenticated && isInRoom, // Combined readiness state
      lastMessage, 
      sendMessage, 
      error,
      readyState: ws.current?.readyState // Expose readyState if needed (0=Connecting, 1=Open, 2=Closing, 3=Closed)
  };
};

export default useWebSocket; 
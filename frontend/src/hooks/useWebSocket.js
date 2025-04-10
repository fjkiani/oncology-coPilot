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
      // Send authentication message immediately upon connection
      if (authToken) {
        console.log('Sending auth token...');
        const authMsg = JSON.stringify({ type: 'auth', token: authToken });
        ws.current?.send(authMsg);
      } else {
        console.warn('No auth token provided for WebSocket connection.');
        // Optionally close connection if auth is strictly required
        // ws.current?.close(); 
        // setError(new Error('Authentication token required.'));
      }
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket Disconnected', event.reason, `Code: ${event.code}`);
      setIsConnected(false);
      setIsAuthenticated(false);
      setIsInRoom(false);
      // Optionally set an error or attempt reconnect based on close code
      if (event.code !== 1000) { // 1000 is normal closure
          setError(new Error(`WebSocket closed unexpectedly: ${event.code} ${event.reason || ''}`.trim()));
      }
      ws.current = null; // Clean up ref on close
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket Error: ", err);
      setError(new Error('WebSocket connection error.'));
      setIsConnected(false);
      setIsAuthenticated(false);
      setIsInRoom(false);
      // ws.current?.close(); // Ensure closed on error
       ws.current = null;
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket Message Received:", message);

        // Handle backend confirmation messages
        if (message.type === 'auth_ok') {
          console.log('WebSocket Authentication successful');
          setIsAuthenticated(true);
          // Now attempt to join the room if specified
          if (roomToJoin) {
            console.log(`Attempting to join room: ${roomToJoin}`);
            const joinMsg = JSON.stringify({ type: 'join', room: roomToJoin });
            ws.current?.send(joinMsg);
          } else {
             // If no room needed, consider connection ready after auth
             setIsInRoom(true); // Or adjust logic if room is mandatory
             setIsConnected(true);
          }
        } else if (message.type === 'auth_fail') {
          console.error('WebSocket Authentication failed:', message.error);
          setError(new Error(`Authentication failed: ${message.error}`));
          ws.current?.close(); // Close connection on auth failure
        } else if (message.type === 'join_ok') {
          console.log(`Successfully joined room: ${message.room}`);
          setIsInRoom(true);
          setIsConnected(true); // Connection is fully ready (auth + room)
        } else if (message.type === 'join_fail') {
           console.error('WebSocket room join failed:', message.error);
           setError(new Error(`Failed to join room: ${message.error}`));
           ws.current?.close(); // Close connection on join failure
        } else {
           // Handle other message types (e.g., regular chat messages)
           setLastMessage(message);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message or handle message:", e, "Raw data:", event.data);
        // Handle non-JSON messages or parsing errors if necessary
      }
    };

  }, [url, authToken, roomToJoin]); // Dependencies for reconnecting

  // Effect to establish connection on mount or when dependencies change
  useEffect(() => {
    if (url && authToken && roomToJoin) { // Only connect if params are provided
        connect();
    }
    
    // Cleanup function to close WebSocket connection on unmount
    return () => {
      if (ws.current) {
        console.log("Closing WebSocket connection on unmount.");
        ws.current.close(1000, "Component unmounting"); // Normal closure
        ws.current = null;
      }
    };
  }, [url, authToken, roomToJoin, connect]); // Re-run if connection details change

  // Function to send messages
  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && isConnected) {
        // Ensure message is stringified if it's an object
        const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
        console.log("Sending WebSocket Message:", messageToSend);
        ws.current.send(messageToSend);
    } else {
      console.error('WebSocket is not connected or ready.');
      // Optionally queue message or show error to user
    }
  }, [isConnected]); // isConnected dependency ensures we don't send if not ready

  return { 
      isConnected: isConnected && isAuthenticated && isInRoom, // Define "ready" state
      lastMessage, 
      sendMessage, 
      error,
      readyState: ws.current?.readyState // Expose readyState if needed (0=Connecting, 1=Open, 2=Closing, 3=Closed)
  };
};

export default useWebSocket; 
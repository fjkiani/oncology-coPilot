from fastapi import WebSocket
from typing import List, Dict, Set, Optional, Any
import asyncio
import json

class ConnectionManager:
    """Manages active WebSocket connections, rooms, and user mapping."""
    def __init__(self):
        # Stores connections per room
        self.room_connections: Dict[str, List[WebSocket]] = {}
        # Allows quick lookup of rooms a socket is in
        self.socket_to_rooms: Dict[WebSocket, Set[str]] = {}
        # Maps user ID to their active WebSocket connection(s)
        # Note: A user might have multiple connections (e.g., multiple tabs)
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # Maps WebSocket to user ID for quick reverse lookup
        self.socket_to_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket):
        """Accepts a new WebSocket connection. Room joining happens separately."""
        await websocket.accept()
        self.socket_to_rooms[websocket] = set() # Initialize room set for this socket
        print(f"WebSocket connection accepted: {websocket.client.host}:{websocket.client.port}")
        # User association will happen upon successful authentication

    async def associate_user(self, user_id: str, websocket: WebSocket):
        """Associates an authenticated user ID with a WebSocket connection."""
        self.socket_to_user[websocket] = user_id
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        if websocket not in self.user_connections[user_id]:
            self.user_connections[user_id].append(websocket)
            print(f"Associated user '{user_id}' with socket {websocket.client.host}:{websocket.client.port}")
        else:
             print(f"User '{user_id}' already associated with socket {websocket.client.host}:{websocket.client.port}")

    async def get_user_sockets(self, user_id: str) -> List[WebSocket]:
        """Returns a list of active WebSocket connections for a given user ID."""
        return self.user_connections.get(user_id, [])

    async def join_room(self, room_id: str, websocket: WebSocket):
        """Adds a WebSocket connection to a specific room."""
        if room_id not in self.room_connections:
            self.room_connections[room_id] = []
        if websocket not in self.room_connections[room_id]:
            self.room_connections[room_id].append(websocket)
            self.socket_to_rooms[websocket].add(room_id)
            print(f"Socket {websocket.client.host}:{websocket.client.port} joined room '{room_id}'")
            # Optionally broadcast a join message to the room
            # await self.broadcast_to_room(room_id, json.dumps({"type": "join", "user": "anonymous"}), websocket)
        else:
             print(f"Socket {websocket.client.host}:{websocket.client.port} already in room '{room_id}'")

    async def leave_room(self, room_id: str, websocket: WebSocket):
        """Removes a WebSocket connection from a specific room."""
        if room_id in self.room_connections and websocket in self.room_connections[room_id]:
            self.room_connections[room_id].remove(websocket)
            if not self.room_connections[room_id]: # Delete room if empty
                 del self.room_connections[room_id]
            if websocket in self.socket_to_rooms:
                 self.socket_to_rooms[websocket].discard(room_id)
            print(f"Socket {websocket.client.host}:{websocket.client.port} left room '{room_id}'")
            # Optionally broadcast a leave message
            # await self.broadcast_to_room(room_id, json.dumps({"type": "leave", "user": "anonymous"}), websocket)
        else:
            print(f"Socket {websocket.client.host}:{websocket.client.port} not found in room '{room_id}' for removal")

    def disconnect(self, websocket: WebSocket):
        """Handles disconnection, removing socket from rooms and user mappings."""
        user_id = self.socket_to_user.get(websocket)
        
        # Remove from rooms
        if websocket in self.socket_to_rooms:
            rooms_to_leave = list(self.socket_to_rooms[websocket]) # Iterate over a copy
            print(f"Disconnecting socket {websocket.client.host}:{websocket.client.port} from rooms: {rooms_to_leave}")
            # Use asyncio.create_task for fire-and-forget or gather if needed
            for room_id in rooms_to_leave:
                 # Intentionally not awaiting leave_room here to avoid blocking disconnect
                 asyncio.create_task(self.leave_room(room_id, websocket))
                 # await self.leave_room(room_id, websocket) # Alternative if blocking is ok
            del self.socket_to_rooms[websocket]
            
        # Remove from user mapping
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
                if not self.user_connections[user_id]: # Remove user if no connections left
                    del self.user_connections[user_id]
                print(f"Removed socket association for user '{user_id}'")
            else:
                print(f"Warning: Socket not found in user '{user_id}' connection list during disconnect.")

        # Remove reverse lookup
        if websocket in self.socket_to_user:
            del self.socket_to_user[websocket]
            
        print(f"Disconnected completed for socket {websocket.client.host}:{websocket.client.port} (User: {user_id or 'N/A'})")

    async def send_personal_message(self, message_data: Any, websocket: WebSocket):
        """Sends a message (Python object) directly to a specific WebSocket connection, converting to JSON."""
        try:
            # Convert the Python object (dict, list, etc.) to a JSON string
            message_str = json.dumps(message_data)
            await websocket.send_text(message_str)
        except TypeError as e:
            # Handle cases where the data isn't JSON serializable
            print(f"Serialization Error sending personal message to {websocket.client.host}:{websocket.client.port}: {e}. Data: {message_data}")
            # Optionally, disconnect or send an error message back if appropriate
            # For now, just log and potentially disconnect
            self.disconnect(websocket)
        except Exception as e:
             # Catch other errors like connection closed abruptly
             print(f"Error sending personal message to {websocket.client.host}:{websocket.client.port}: {e}")
             self.disconnect(websocket)

    async def broadcast_to_room(self, room_id: str, message_data: Any, sender: Optional[WebSocket] = None):
        """Sends a message (Python object) to all connections in a room (optionally excluding sender), converting to JSON."""
        if room_id in self.room_connections:
            try:
                # Convert the Python object to a JSON string once for efficiency
                message_str = json.dumps(message_data)
                print(f"Broadcasting to room '{room_id}' (from {sender.client.host}:{sender.client.port if sender else 'N/A'}): {message_str[:100]}...") # Log more info
                
                # Prepare tasks, excluding the sender if provided
                tasks = []
                for websocket in self.room_connections[room_id]:
                    if sender is None or websocket != sender:
                         # Use a wrapper coroutine to handle potential send errors individually
                         async def send_wrapper(ws, msg_str):
                            try:
                                await ws.send_text(msg_str)
                            except Exception as send_ex:
                                print(f"Error sending broadcast message to {ws.client.host}:{ws.client.port} in room '{room_id}': {send_ex}")
                                # Disconnect the problematic socket
                                self.disconnect(ws)
                         
                         tasks.append(send_wrapper(websocket, message_str))
                
                if tasks:
                    await asyncio.gather(*tasks) # Exceptions are handled within send_wrapper
                else:
                    print(f"No clients (excluding sender, if specified) in room '{room_id}' to broadcast to.")
                    
            except TypeError as e:
                # Handle cases where the data isn't JSON serializable before broadcasting
                print(f"Serialization Error preparing broadcast for room '{room_id}': {e}. Data: {message_data}")
            except Exception as e:
                 print(f"Unexpected error during broadcast preparation for room '{room_id}': {e}")
        else:
             print(f"Attempted to broadcast to non-existent room '{room_id}'")

# Singleton instance
manager = ConnectionManager() 
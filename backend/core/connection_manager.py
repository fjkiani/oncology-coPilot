from fastapi import WebSocket
from typing import List, Dict, Set
import asyncio
import json

class ConnectionManager:
    """Manages active WebSocket connections within specific rooms."""
    def __init__(self):
        # Stores connections per room
        self.room_connections: Dict[str, List[WebSocket]] = {}
        # Allows quick lookup of rooms a socket is in
        self.socket_to_rooms: Dict[WebSocket, Set[str]] = {}

    async def connect(self, websocket: WebSocket):
        """Accepts a new WebSocket connection. Room joining happens separately."""
        await websocket.accept()
        self.socket_to_rooms[websocket] = set() # Initialize room set for this socket
        print(f"WebSocket connection accepted: {websocket.client.host}:{websocket.client.port}")

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
        """Handles disconnection, removing the socket from all rooms."""
        if websocket in self.socket_to_rooms:
            rooms_to_leave = list(self.socket_to_rooms[websocket]) # Iterate over a copy
            print(f"Disconnecting socket {websocket.client.host}:{websocket.client.port} from rooms: {rooms_to_leave}")
            # Use asyncio.create_task for fire-and-forget or gather if needed
            for room_id in rooms_to_leave:
                 # Intentionally not awaiting leave_room here to avoid blocking disconnect
                 asyncio.create_task(self.leave_room(room_id, websocket))
                 # await self.leave_room(room_id, websocket) # Alternative if blocking is ok
            del self.socket_to_rooms[websocket]
        else:
             print(f"Attempted to disconnect an untracked WebSocket: {websocket.client.host}:{websocket.client.port}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Sends a message directly to a specific WebSocket connection."""
        try:
            await websocket.send_text(message)
        except Exception as e:
             print(f"Error sending personal message to {websocket.client.host}:{websocket.client.port}: {e}")
             # Handle potential errors like client disconnected abruptly
             self.disconnect(websocket)

    async def broadcast_to_room(self, room_id: str, message: str, sender: WebSocket):
        """Sends a message to all connections in a specific room, excluding the sender."""
        if room_id in self.room_connections:
            print(f"Broadcasting to room '{room_id}' (from {sender.client.host}:{sender.client.port}): {message[:50]}...")
            # Create list of tasks, excluding the sender
            tasks = [
                self.send_personal_message(message, websocket) 
                for websocket in self.room_connections[room_id] 
                if websocket != sender
            ]
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                # Optional: Log errors from broadcasting
                for i, result in enumerate(results):
                     if isinstance(result, Exception):
                         # Find corresponding websocket for error logging if needed (more complex)
                         print(f"Error broadcasting to a connection in room '{room_id}': {result}")
            else:
                print(f"No other clients in room '{room_id}' to broadcast to.")
        else:
             print(f"Attempted to broadcast to non-existent room '{room_id}'")

# Singleton instance
manager = ConnectionManager() 
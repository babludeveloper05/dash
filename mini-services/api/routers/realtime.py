"""
Real-time WebSocket router for Project Delta.
Handles live classes, doubt solving, and room isolation.
"""
import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_ws import get_current_user_from_ws_direct
from models import User

router = APIRouter()

# Connection manager for WebSocket rooms
class ConnectionManager:
    def __init__(self):
        # room_id -> set of websocket connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # user_id -> websocket connection (for DMs)
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: int):
        await websocket.accept()
        
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        self.rooms[room_id].add(websocket)
        self.active_connections[user_id] = websocket
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        for room_id, connections in self.rooms.items():
            if websocket in connections:
                connections.discard(websocket)
                break
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude: Optional[WebSocket] = None):
        """Send message to all users in a room (with optional exclusion)."""
        if room_id not in self.rooms:
            return
        
        disconnected = []
        for connection in self.rooms[room_id]:
            if connection == exclude:
                continue
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            for connections in self.rooms.values():
                connections.discard(conn)
    
    async def send_personal_message(self, user_id: int, message: dict):
        """Send message to a specific user."""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception:
                del self.active_connections[user_id]

manager = ConnectionManager()

@router.websocket("/ws/room/{room_id}")
async def websocket_room(
    websocket: WebSocket,
    room_id: str,
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for room-based real-time features.
    Room isolation: users only receive messages from their assigned room.
    Supports: live classes, doubt solving, collaborative notes.
    """
    # Authenticate user from query params (token)
    user = await get_current_user_from_ws_direct(websocket, db)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    await manager.connect(websocket, room_id, user.id)
    
    # Notify room about new user
    await manager.broadcast_to_room(
        room_id,
        {"type": "user_joined", "user_id": user.id, "username": user.username}
    )
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            msg_type = message.get("type")
            
            if msg_type == "doubt":
                # Broadcast doubt to room (e.g., for TAs to see)
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "doubt_received",
                        "user_id": user.id,
                        "content": message.get("content"),
                        "timestamp": message.get("timestamp")
                    }
                )
            
            elif msg_type == "chat":
                # Broadcast chat message to room
                await manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "chat_message",
                        "user_id": user.id,
                        "username": user.username,
                        "content": message.get("content"),
                        "timestamp": message.get("timestamp")
                    }
                )
            
            elif msg_type == "ping":
                # Heartbeat for reconnection detection
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
        await manager.broadcast_to_room(
            room_id,
            {"type": "user_left", "user_id": user.id, "username": user.username}
        )
    except Exception as e:
        manager.disconnect(websocket, user.id)
        # Log error but don't expose to client
        print(f"WebSocket error in room {room_id}: {e}")

@router.websocket("/ws/dm/{target_user_id}")
async def websocket_dm(
    websocket: WebSocket,
    target_user_id: int,
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for direct messaging between users.
    """
    user = await get_current_user_from_ws_direct(websocket, db)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    # Create a unique room ID for this DM pair
    room_id = f"dm_{min(user.id, target_user_id)}_{max(user.id, target_user_id)}"
    
    await manager.connect(websocket, room_id, user.id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Forward message to target user
            await manager.send_personal_message(
                target_user_id,
                {
                    "type": "dm_received",
                    "from_user_id": user.id,
                    "from_username": user.username,
                    "content": message.get("content"),
                    "timestamp": message.get("timestamp")
                }
            )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
    except Exception as e:
        manager.disconnect(websocket, user.id)
        print(f"WebSocket DM error: {e}")

@router.get("/rooms/{room_id}/stats", response_model=None)
async def get_room_stats(room_id: str, db: Session = Depends(get_db)):
    """Get statistics for a room (active users count)."""
    if room_id not in manager.rooms:
        return {"room_id": room_id, "active_users": 0, "connections": []}
    
    connections = manager.rooms[room_id]
    return {
        "room_id": room_id,
        "active_users": len(connections),
        "status": "active" if connections else "inactive"
    }

@router.post("/rooms/{room_id}/broadcast", response_model=None)
async def broadcast_to_room(
    room_id: str,
    message: dict,
    current_user: User = Depends(get_current_user_from_ws_direct)
):
    """
    HTTP endpoint to broadcast a message to a room.
    Useful for server-initiated events (e.g., class starting).
    """
    if room_id not in manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    await manager.broadcast_to_room(room_id, message)
    return {"status": "broadcasted", "room_id": room_id}

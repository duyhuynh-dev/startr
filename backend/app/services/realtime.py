"""WebSocket service for real-time messaging and notifications."""

from __future__ import annotations

import json
import logging
from typing import Dict, Set
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from sqlmodel import Session

from app.models.message import Message
from app.models.match import Match

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time features."""

    def __init__(self):
        # Map of profile_id -> Set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Map of WebSocket -> profile_id for quick lookup
        self.connection_to_profile: Dict[WebSocket, str] = {}
        # Map of profile_id -> typing status (match_id -> timestamp)
        self.typing_status: Dict[str, Dict[str, datetime]] = {}

    async def connect(self, websocket: WebSocket, profile_id: str) -> None:
        """Connect a WebSocket for a profile."""
        await websocket.accept()
        
        if profile_id not in self.active_connections:
            self.active_connections[profile_id] = set()
        
        self.active_connections[profile_id].add(websocket)
        self.connection_to_profile[websocket] = profile_id
        
        logger.info(f"WebSocket connected for profile {profile_id}. Total connections: {len(self.active_connections[profile_id])}")

    def disconnect(self, websocket: WebSocket) -> None:
        """Disconnect a WebSocket."""
        profile_id = self.connection_to_profile.pop(websocket, None)
        
        if profile_id and profile_id in self.active_connections:
            self.active_connections[profile_id].discard(websocket)
            
            # Clean up empty sets
            if not self.active_connections[profile_id]:
                del self.active_connections[profile_id]
                if profile_id in self.typing_status:
                    del self.typing_status[profile_id]
        
        logger.info(f"WebSocket disconnected for profile {profile_id}")

    async def send_personal_message(self, message: dict, profile_id: str) -> bool:
        """Send a message to a specific profile's connections."""
        if profile_id not in self.active_connections:
            logger.warning(f"No active connections for profile {profile_id}")
            return False
        
        connections = self.active_connections[profile_id]
        logger.info(f"Sending message to profile {profile_id} ({len(connections)} connection(s)): {message}")
        
        disconnected = set()
        for connection in connections:
            try:
                await connection.send_json(message)
                logger.debug(f"Message sent successfully to profile {profile_id}")
            except Exception as e:
                logger.error(f"Error sending message to profile {profile_id}: {e}", exc_info=True)
                disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)
        
        success = len(disconnected) < len(connections)
        logger.info(f"Message send result for profile {profile_id}: {success} ({len(connections) - len(disconnected)}/{len(connections)} connections successful)")
        return success

    async def broadcast_message(self, message: dict, match_id: str, session: Session) -> None:
        """Broadcast a message to both users in a match."""
        try:
            # Get match to find both users
            match = session.get(Match, match_id)
            if not match:
                logger.warning(f"Match {match_id} not found for broadcast")
                return
            
            logger.info(f"Broadcasting message to match {match_id} (founder: {match.founder_id}, investor: {match.investor_id})")
            
            # Send to both founder and investor
            founder_result = await self.send_personal_message(message, match.founder_id)
            investor_result = await self.send_personal_message(message, match.investor_id)
            
            logger.info(f"Broadcast results - Founder: {founder_result}, Investor: {investor_result}")
        except Exception as e:
            logger.error(f"Error broadcasting message to match {match_id}: {e}", exc_info=True)

    async def send_typing_indicator(self, match_id: str, sender_id: str, is_typing: bool, session: Session) -> None:
        """Send typing indicator to the other user in a match."""
        match = session.get(Match, match_id)
        if not match:
            return
        
        # Determine recipient (the other party in the match)
        recipient_id = match.investor_id if sender_id == match.founder_id else match.founder_id
        
        message = {
            "type": "typing",
            "match_id": match_id,
            "sender_id": sender_id,
            "is_typing": is_typing,
        }
        
        await self.send_personal_message(message, recipient_id)
        
        # Update typing status
        if sender_id not in self.typing_status:
            self.typing_status[sender_id] = {}
        
        if is_typing:
            self.typing_status[sender_id][match_id] = datetime.utcnow()
        else:
            self.typing_status[sender_id].pop(match_id, None)

    def is_online(self, profile_id: str) -> bool:
        """Check if a profile is currently online."""
        return profile_id in self.active_connections and len(self.active_connections[profile_id]) > 0

    def get_online_count(self) -> int:
        """Get total number of online users."""
        return len(self.active_connections)


# Global connection manager instance
connection_manager = ConnectionManager()


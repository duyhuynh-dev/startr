"""WebSocket endpoints for real-time messaging and notifications."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query, status, HTTPException
from sqlmodel import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import ValidationError
from app.db.session import get_session
from app.models.user import User
from app.services.realtime import connection_manager
from app.services.messaging import messaging_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/{profile_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    profile_id: str,
    token: Optional[str] = Query(None),
):
    """WebSocket endpoint for real-time messaging and notifications.
    
    **Connection:**
    ```
    ws://localhost:8000/api/v1/realtime/ws/{profile_id}?token=<jwt_token>
    ```
    
    **Message Types:**
    
    1. **Send Message:**
    ```json
    {
        "type": "send_message",
        "match_id": "match-id",
        "content": "Hello!",
        "attachment_url": null
    }
    ```
    
    2. **Typing Indicator:**
    ```json
    {
        "type": "typing",
        "match_id": "match-id",
        "is_typing": true
    }
    ```
    
    3. **Mark Read:**
    ```json
    {
        "type": "mark_read",
        "match_id": "match-id",
        "message_id": "message-id"
    }
    ```
    
    **Received Messages:**
    
    1. **New Message:**
    ```json
    {
        "type": "new_message",
        "message": {
            "id": "msg-id",
            "match_id": "match-id",
            "sender_id": "sender-id",
            "content": "Hello!",
            "created_at": "2025-01-20T12:00:00Z"
        }
    }
    ```
    
    2. **Typing Indicator:**
    ```json
    {
        "type": "typing",
        "match_id": "match-id",
        "sender_id": "sender-id",
        "is_typing": true
    }
    ```
    
    3. **Online Status:**
    ```json
    {
        "type": "online_status",
        "profile_id": "profile-id",
        "is_online": true
    }
    ```
    """
    # TODO: Verify token and get user profile_id
    # For now, accept profile_id from path and verify later
    
    await connection_manager.connect(websocket, profile_id)
    
    try:
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connected",
            "profile_id": profile_id,
            "message": "WebSocket connected successfully"
        })
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "typing":
                # Handle typing indicator
                match_id = data.get("match_id")
                is_typing = data.get("is_typing", False)
                
                from app.db.session import engine
                with Session(engine) as session:
                    try:
                        await connection_manager.send_typing_indicator(
                            match_id,
                            profile_id,
                            is_typing,
                            session
                        )
                    except Exception as e:
                        logger.error(f"Error sending typing indicator: {e}")
                    
            elif message_type == "ping":
                # Heartbeat/ping
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
                
            elif message_type == "send_message":
                # Handle sending a message - use REST endpoint instead
                # WebSocket is primarily for receiving real-time updates
                await websocket.send_json({
                    "type": "error",
                    "message": "Use POST /api/v1/messages endpoint to send messages. WebSocket is for real-time updates only."
                })
                
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
                
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected for profile {profile_id}")
    except Exception as e:
        logger.error(f"WebSocket error for profile {profile_id}: {e}")
        connection_manager.disconnect(websocket)


@router.get(
    "/online/{profile_id}",
    summary="Check if a profile is online",
    description="Check if a specific profile is currently connected via WebSocket.",
    responses={
        200: {
            "description": "Online status returned",
            "content": {
                "application/json": {
                    "example": {
                        "profile_id": "profile-id",
                        "is_online": True
                    }
                }
            }
        }
    }
)
async def check_online_status(
    profile_id: str,
    user: User = Depends(get_current_user),
) -> dict:
    """Check if a profile is online."""
    is_online = connection_manager.is_online(profile_id)
    return {
        "profile_id": profile_id,
        "is_online": is_online
    }


@router.get(
    "/online",
    summary="Get online user count",
    description="Get the total number of currently connected users.",
    responses={
        200: {
            "description": "Online count returned",
            "content": {
                "application/json": {
                    "example": {
                        "online_count": 42
                    }
                }
            }
        }
    }
)
async def get_online_count(
    user: User = Depends(get_current_user),
) -> dict:
    """Get total number of online users."""
    count = connection_manager.get_online_count()
    return {
        "online_count": count
    }


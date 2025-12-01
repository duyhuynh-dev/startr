"""Background task for broadcasting messages via WebSocket."""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Global background task queue
_broadcast_queue: Optional[asyncio.Queue] = None
_broadcast_task: Optional[asyncio.Task] = None


def _get_broadcast_queue() -> asyncio.Queue:
    """Get or create the broadcast queue."""
    global _broadcast_queue
    if _broadcast_queue is None:
        _broadcast_queue = asyncio.Queue()
    return _broadcast_queue


async def _broadcast_worker():
    """Background worker that processes broadcast messages."""
    from app.services.realtime import connection_manager
    from app.db.session import engine
    from sqlmodel import Session
    
    queue = _get_broadcast_queue()
    
    while True:
        try:
            # Get message from queue (blocks until available)
            broadcast_data = await queue.get()
            
            if broadcast_data is None:  # Shutdown signal
                break
            
            message_dict, match_id = broadcast_data
            
            # Broadcast to both users in the match
            with Session(engine) as session:
                await connection_manager.broadcast_message(
                    message_dict,
                    match_id,
                    session
                )
            
            queue.task_done()
        except Exception as e:
            logger.error(f"Error in broadcast worker: {e}")


def start_broadcast_worker():
    """Start the background broadcast worker."""
    global _broadcast_task
    
    # Check if worker is already running
    if _broadcast_task is not None and not _broadcast_task.done():
        return
    
    try:
        # Try to get the running event loop (FastAPI uses uvicorn which has one)
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # If no event loop is running, we'll start the worker when the first message is queued
        # The worker will be started lazily in queue_broadcast if needed
        logger.warning("No event loop running, broadcast worker will start lazily")
        return
    
    # Create and start the task
    _broadcast_task = loop.create_task(_broadcast_worker())
    logger.info("Broadcast worker started")


def queue_broadcast(message_dict: dict, match_id: str) -> None:
    """Queue a message for WebSocket broadcast (non-blocking)."""
    global _broadcast_task
    
    try:
        queue = _get_broadcast_queue()
        
        # Start worker if not already running
        if _broadcast_task is None or _broadcast_task.done():
            try:
                # Try to get the running event loop
                loop = asyncio.get_running_loop()
                _broadcast_task = loop.create_task(_broadcast_worker())
                logger.info("Broadcast worker started lazily")
            except RuntimeError:
                # If called from sync context (REST endpoint), schedule on next tick
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # We're in an async context but can't create task here
                        # Schedule the worker start on next tick
                        loop.call_soon_threadsafe(
                            lambda: loop.create_task(_broadcast_worker())
                        )
                    else:
                        _broadcast_task = loop.create_task(_broadcast_worker())
                        logger.info("Broadcast worker started with new event loop")
                except Exception as e:
                    logger.error(f"Cannot start broadcast worker: {e}")
                    # Continue anyway - message might still be queued if worker is already running
        
        # Try to put message in queue (non-blocking)
        try:
            queue.put_nowait((message_dict, match_id))
            logger.debug(f"Message queued for broadcast to match {match_id}")
        except asyncio.QueueFull:
            logger.warning("Broadcast queue is full, dropping message")
    except Exception as e:
        logger.error(f"Error queueing broadcast: {e}", exc_info=True)


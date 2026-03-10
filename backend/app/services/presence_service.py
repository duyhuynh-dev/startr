"""Redis-based presence service for online/offline status.

Uses Redis as the source of truth so presence works across:
- Multiple server instances (horizontal scaling)
- Server restarts
- WebSocket reconnects
"""

from __future__ import annotations

import logging
from typing import List, Set

from app.core.redis import redis_client

logger = logging.getLogger(__name__)

PRESENCE_PREFIX = "presence:"
PRESENCE_TTL_SECONDS = 90  # Consider offline after 90s without heartbeat


def _key(profile_id: str) -> str:
    return f"{PRESENCE_PREFIX}{profile_id}"


def set_online(profile_id: str) -> None:
    """Mark a profile as online. Call on WebSocket connect and heartbeat."""
    try:
        redis_client.set(_key(profile_id), "1", ex=PRESENCE_TTL_SECONDS)
    except Exception as e:
        logger.warning(f"Presence set_online failed for {profile_id}: {e}")


def set_offline(profile_id: str) -> None:
    """Mark a profile as offline. Call on WebSocket disconnect."""
    try:
        redis_client.delete(_key(profile_id))
    except Exception as e:
        logger.warning(f"Presence set_offline failed for {profile_id}: {e}")


def is_online(profile_id: str) -> bool:
    """Check if a profile is currently online."""
    try:
        return redis_client.exists(_key(profile_id)) > 0
    except Exception as e:
        logger.warning(f"Presence is_online failed for {profile_id}: {e}")
        return False


def get_online_profile_ids(profile_ids: List[str]) -> Set[str]:
    """Batch check which profiles are online. Returns set of online profile IDs."""
    if not profile_ids:
        return set()
    try:
        keys = [_key(pid) for pid in profile_ids]
        results = redis_client.mget(keys)
        return {pid for pid, val in zip(profile_ids, results) if val is not None}
    except Exception as e:
        logger.warning(f"Presence batch check failed: {e}")
        return set()

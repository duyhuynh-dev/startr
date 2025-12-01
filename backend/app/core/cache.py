"""Centralized Redis caching utilities with TTL management."""

from __future__ import annotations

import json
from typing import Any, Callable, Optional, TypeVar

from redis.exceptions import RedisError

from app.core.redis import redis_client

T = TypeVar("T")

# Cache TTL defaults (in seconds)
CACHE_TTL_SHORT = 300  # 5 minutes - for frequently changing data
CACHE_TTL_MEDIUM = 1800  # 30 minutes - for moderately changing data
CACHE_TTL_LONG = 3600  # 1 hour - for slowly changing data
CACHE_TTL_VERY_LONG = 86400  # 24 hours - for mostly static data

# Cache key prefixes
PROFILE_CACHE_PREFIX = "profile:"
FEED_CACHE_PREFIX = "feed:"
COMPATIBILITY_CACHE_PREFIX = "compat:"
DILIGENCE_CACHE_PREFIX = "diligence:"
LIKES_QUEUE_PREFIX = "likes_queue:"
PROMPT_TEMPLATE_CACHE_PREFIX = "prompt_template:"
EMBEDDING_CACHE_PREFIX = "embedding:"
EMBEDDING_TEXT_CACHE_PREFIX = "embedding_text:"


class CacheService:
    """Centralized caching service with TTL management."""

    @staticmethod
    def get(key: str, default: Optional[T] = None) -> Optional[T]:
        """Get value from cache. Returns None if not found or on error."""
        try:
            value = redis_client.get(key)
            if value is None:
                return default
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # Return as string if not JSON
                return value  # type: ignore
        except RedisError:
            return default

    @staticmethod
    def set(
        key: str,
        value: Any,
        ttl: int = CACHE_TTL_MEDIUM,
        serialize: bool = True,
    ) -> bool:
        """Set value in cache with TTL. Returns True on success, False on error."""
        try:
            if serialize and not isinstance(value, (str, bytes)):
                serialized = json.dumps(value, default=str)
            else:
                serialized = value

            redis_client.setex(key, ttl, serialized)
            return True
        except RedisError:
            return False

    @staticmethod
    def delete(key: str) -> bool:
        """Delete key from cache. Returns True on success, False on error."""
        try:
            redis_client.delete(key)
            return True
        except RedisError:
            return False

    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """Delete all keys matching pattern. Returns count of deleted keys."""
        try:
            keys = redis_client.keys(pattern)
            if keys:
                return redis_client.delete(*keys)
            return 0
        except RedisError:
            return 0

    @staticmethod
    def get_or_set(
        key: str,
        fetch_func: Callable[[], T],
        ttl: int = CACHE_TTL_MEDIUM,
        serialize: bool = True,
    ) -> T:
        """Get value from cache, or fetch and cache it if not found."""
        cached = CacheService.get(key)
        if cached is not None:
            return cached  # type: ignore

        value = fetch_func()
        CacheService.set(key, value, ttl, serialize)
        return value

    @staticmethod
    def invalidate_profile(profile_id: str) -> None:
        """Invalidate all cache entries related to a profile."""
        patterns = [
            f"{PROFILE_CACHE_PREFIX}{profile_id}",
            f"{FEED_CACHE_PREFIX}*:{profile_id}*",
            f"{FEED_CACHE_PREFIX}*{profile_id}*",
            f"{COMPATIBILITY_CACHE_PREFIX}{profile_id}:*",
            f"{COMPATIBILITY_CACHE_PREFIX}*:{profile_id}",
            f"{DILIGENCE_CACHE_PREFIX}{profile_id}",
            f"{EMBEDDING_CACHE_PREFIX}{profile_id}",
        ]
        for pattern in patterns:
            CacheService.delete_pattern(pattern)

    @staticmethod
    def invalidate_feeds_for_profile(profile_id: str) -> None:
        """Invalidate feed cache for a specific profile."""
        CacheService.delete_pattern(f"{FEED_CACHE_PREFIX}{profile_id}:*")

    @staticmethod
    def invalidate_all_feeds() -> None:
        """Invalidate all feed caches."""
        CacheService.delete_pattern(f"{FEED_CACHE_PREFIX}*")

    @staticmethod
    def invalidate_compatibility_scores(profile_id: str) -> None:
        """Invalidate compatibility scores involving a profile."""
        CacheService.delete_pattern(f"{COMPATIBILITY_CACHE_PREFIX}{profile_id}:*")
        CacheService.delete_pattern(f"{COMPATIBILITY_CACHE_PREFIX}*:{profile_id}")

    @staticmethod
    def get_profile_key(profile_id: str) -> str:
        """Get cache key for a profile."""
        return f"{PROFILE_CACHE_PREFIX}{profile_id}"

    @staticmethod
    def get_feed_key(profile_id: str, role: str) -> str:
        """Get cache key for a feed."""
        return f"{FEED_CACHE_PREFIX}{profile_id}:{role}"

    @staticmethod
    def get_compatibility_key(profile_a_id: str, profile_b_id: str) -> str:
        """Get cache key for compatibility score."""
        # Always use consistent ordering for bidirectional lookups
        if profile_a_id < profile_b_id:
            return f"{COMPATIBILITY_CACHE_PREFIX}{profile_a_id}:{profile_b_id}"
        return f"{COMPATIBILITY_CACHE_PREFIX}{profile_b_id}:{profile_a_id}"

    @staticmethod
    def get_diligence_key(profile_id: str) -> str:
        """Get cache key for diligence summary."""
        return f"{DILIGENCE_CACHE_PREFIX}{profile_id}"

    @staticmethod
    def get_prompt_template_key(template_id: str) -> str:
        """Get cache key for a prompt template."""
        return f"{PROMPT_TEMPLATE_CACHE_PREFIX}{template_id}"

    @staticmethod
    def get_embedding_key(profile_id: str) -> str:
        """Get cache key for a profile embedding."""
        return f"{EMBEDDING_CACHE_PREFIX}{profile_id}"

    @staticmethod
    def get_text_embedding_key(text: str) -> str:
        """Get cache key for a text embedding (hash the text)."""
        import hashlib
        text_hash = hashlib.sha256(text.encode()).hexdigest()[:16]
        return f"{EMBEDDING_TEXT_CACHE_PREFIX}{text_hash}"

    @staticmethod
    def invalidate_embedding(profile_id: str) -> None:
        """Invalidate embedding cache for a profile."""
        CacheService.delete(CacheService.get_embedding_key(profile_id))

    @staticmethod
    def exists(key: str) -> bool:
        """Check if a key exists in cache."""
        try:
            return redis_client.exists(key) > 0
        except RedisError:
            return False

    @staticmethod
    def get_ttl(key: str) -> int:
        """Get remaining TTL for a key in seconds. Returns -1 if no TTL or key doesn't exist."""
        try:
            return redis_client.ttl(key)
        except RedisError:
            return -1

    @staticmethod
    def extend_ttl(key: str, ttl: int) -> bool:
        """Extend TTL for an existing key."""
        try:
            return redis_client.expire(key, ttl) is True
        except RedisError:
            return False


cache_service = CacheService()


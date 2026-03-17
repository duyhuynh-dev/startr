"""Cloudflare Turnstile verification."""

from __future__ import annotations

import httpx

from app.core.config import settings

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile(token: str | None, remote_ip: str | None = None) -> bool:
    """Verify a Turnstile token with Cloudflare's API.

    Returns True if verification passes or Turnstile is not configured.
    """
    if not settings.turnstile_secret_key:
        return True

    if not token:
        return False

    payload: dict[str, str] = {
        "secret": settings.turnstile_secret_key,
        "response": token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    # Keep a hard timeout so auth never hangs waiting on Turnstile.
    timeout = httpx.Timeout(connect=3.0, read=3.0, write=3.0, pool=3.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(VERIFY_URL, data=payload)
            data = resp.json()
    except Exception:
        return False

    return data.get("success", False)

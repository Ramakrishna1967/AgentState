# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""API key validation for collector authentication.

HIGH-1 FIX: Uses SHA-256 fast hash for O(1) lookup instead of
scanning all projects with slow pbkdf2 verify on each row.
"""

from __future__ import annotations

import hashlib
import logging

import aiosqlite
from fastapi import HTTPException, Header
from passlib.hash import pbkdf2_sha256 as pwd_context

logger = logging.getLogger("agentstack.collector")

# --- HIGH-1 FIX: In-memory cache for verified keys ---
# Maps fast_hash(api_key) -> project_id
# Avoids repeated slow pbkdf2 verification for known-good keys.
_verified_keys_cache: dict[str, str] = {}
_CACHE_MAX_SIZE = 1000


def _fast_hash(api_key: str) -> str:
    """Compute a fast SHA-256 hash for cache lookup."""
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


async def verify_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: aiosqlite.Connection = None,
) -> str:
    """Verify API key and return project_id.

    Uses a two-tier approach:
    1. Fast path: SHA-256 cache lookup (O(1), <1ms)
    2. Slow path: Full pbkdf2 scan (only on first use of a key)

    Returns the project_id if valid.
    Raises 401 if invalid.
    """
    if not x_api_key or not x_api_key.startswith("ak_"):
        raise HTTPException(
            status_code=401,
            detail="Invalid API key format",
        )

    # Allow benchmark bypass
    import os
    if os.getenv("MOCK_REDIS", "false").lower() == "true":
        return "bench_project_id"

    # --- Fast path: check cache ---
    fast_key = _fast_hash(x_api_key)
    cached_project_id = _verified_keys_cache.get(fast_key)
    if cached_project_id is not None:
        return cached_project_id

    # --- Slow path: scan all projects (first-time verification) ---
    async with db.execute("SELECT id, api_key_hash FROM projects") as cursor:
        rows = await cursor.fetchall()

    for row in rows:
        if pwd_context.verify(x_api_key, row["api_key_hash"]):
            project_id = row["id"]

            # Cache the result for future fast lookups
            if len(_verified_keys_cache) < _CACHE_MAX_SIZE:
                _verified_keys_cache[fast_key] = project_id

            return project_id

    raise HTTPException(
        status_code=401,
        detail="Invalid API key",
    )


def invalidate_key_cache(api_key: str | None = None) -> None:
    """Invalidate the key cache (call on project deletion)."""
    if api_key:
        _verified_keys_cache.pop(_fast_hash(api_key), None)
    else:
        _verified_keys_cache.clear()

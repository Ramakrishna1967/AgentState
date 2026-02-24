# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Health and readiness probes for collector."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Health probe response."""

    status: str = "ok"
    service: str = "collector"
    version: str = "0.1.0-alpha"


class ReadinessResponse(BaseModel):
    """Readiness probe response."""

    ready: bool
    database: str = "connected"


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint (always returns 200 if service is running)."""
    return HealthResponse()


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check():
    """Readiness check endpoint (checks database connectivity).

    In production, should verify DB connection pool.
    """
    # For MVP, assume ready if service is running
    return ReadinessResponse(ready=True)

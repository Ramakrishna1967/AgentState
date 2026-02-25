# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Middleware for CORS and rate limiting."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from collections import defaultdict
from typing import Callable

# Simple in-memory rate limiter
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_REQUESTS = 100
_RATE_LIMIT_WINDOW = 60  # seconds


def add_cors_middleware(app: FastAPI) -> None:
    """Add CORS middleware for Vite dev server (localhost:5173)."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",  # Alternative dev port
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


async def rate_limit_middleware(request: Request, call_next: Callable):
    """Simple rate limiting middleware (100 req/min per IP).

    In production, use Redis or similar for distributed rate limiting.
    """
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()

    # Clean old entries
    _rate_limit_store[client_ip] = [
        timestamp
        for timestamp in _rate_limit_store[client_ip]
        if current_time - timestamp < _RATE_LIMIT_WINDOW
    ]

    # Check rate limit
    if len(_rate_limit_store[client_ip]) >= _RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Rate limit exceeded. Try again later.",
                "retry_after": _RATE_LIMIT_WINDOW,
            },
        )

    # Record request
    _rate_limit_store[client_ip].append(current_time)

    response = await call_next(request)
    return response

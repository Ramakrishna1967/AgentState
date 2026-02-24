# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Authentication routes — JWT login and registration for dashboard users."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from passlib.hash import pbkdf2_sha256 as pwd_context

from api.config import settings
from api.db import get_db
from api.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserSchema,
)

router = APIRouter()
logger = logging.getLogger("agentstack.api")

# --- HIGH-2 + LOW-1: In-memory rate limiter & lockout ---
# Production should use Redis for these, but this works for MVP.
_login_attempts: dict[str, list[float]] = {}  # email -> [timestamps]
_MAX_LOGIN_ATTEMPTS = 5
_LOCKOUT_SECONDS = 900  # 15 minutes
_RATE_WINDOW_SECONDS = 300  # 5-minute window for attempt counting


def _check_login_rate_limit(email: str) -> None:
    """Check if the email is rate-limited due to too many failed logins."""
    import time

    now = time.time()
    attempts = _login_attempts.get(email, [])

    # Clean old attempts outside the window
    attempts = [t for t in attempts if now - t < _LOCKOUT_SECONDS]
    _login_attempts[email] = attempts

    if len(attempts) >= _MAX_LOGIN_ATTEMPTS:
        oldest = min(attempts)
        remaining = int(_LOCKOUT_SECONDS - (now - oldest))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {remaining} seconds.",
        )


def _record_failed_login(email: str) -> None:
    """Record a failed login attempt."""
    import time

    if email not in _login_attempts:
        _login_attempts[email] = []
    _login_attempts[email].append(time.time())


def _clear_login_attempts(email: str) -> None:
    """Clear login attempts on successful login."""
    _login_attempts.pop(email, None)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    # LOW-3 FIX: Use timezone-aware datetime
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


@router.post("/auth/register", response_model=UserSchema)
async def register(
    request_body: UserRegisterRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Register a new user.

    Email must be unique.
    Password is hashed with pbkdf2_sha256.
    """
    # Check if email already exists
    async with db.execute(
        "SELECT id FROM users WHERE email = ?", (request_body.email,)
    ) as cursor:
        existing = await cursor.fetchone()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(request_body.password)
    now = datetime.now(timezone.utc)  # LOW-3 FIX

    await db.execute(
        """
        INSERT INTO users (id, email, hashed_password, is_active, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, request_body.email, hashed_password, True, now),
    )
    await db.commit()

    return UserSchema(
        id=user_id,
        email=request_body.email,
        is_active=True,
        created_at=now,
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    request_body: UserLoginRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
):
    """Login with email and password.

    Returns JWT access token on success.
    Rate-limited to 5 attempts per email per 15 minutes.
    """
    # --- HIGH-2 FIX: Rate limiting ---
    _check_login_rate_limit(request_body.email)

    # Fetch user
    async with db.execute(
        "SELECT id, email, hashed_password, is_active FROM users WHERE email = ?",
        (request_body.email,),
    ) as cursor:
        user_row = await cursor.fetchone()

    if not user_row:
        _record_failed_login(request_body.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    user = dict(user_row)

    # Verify password
    if not pwd_context.verify(request_body.password, user["hashed_password"]):
        _record_failed_login(request_body.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    # --- LOW-1 FIX: Clear lockout on success ---
    _clear_login_attempts(request_body.email)

    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})

    return TokenResponse(access_token=access_token)

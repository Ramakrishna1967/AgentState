# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Span routes — individual span detail."""

from __future__ import annotations

import json
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from api.db import get_db
from api.dependencies import get_current_active_user
from api.schemas import SpanSchema, SpanStatus

router = APIRouter()


@router.get("/spans/{span_id}", response_model=SpanSchema)
async def get_span_detail(
    span_id: str,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get individual span detail by ID."""
    async with db.execute(
        """
        SELECT span_id, trace_id, parent_span_id, project_id, name, start_time, end_time,
               duration_ms, status, service_name, attributes, events
        FROM spans
        WHERE span_id = ?
        """,
        (span_id,),
    ) as cursor:
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Span not found")

    # Parse JSON fields
    attributes = json.loads(row["attributes"]) if row["attributes"] else {}
    events = json.loads(row["events"]) if row["events"] else []

    return SpanSchema(
        span_id=row["span_id"],
        trace_id=row["trace_id"],
        parent_span_id=row["parent_span_id"],
        name=row["name"],
        start_time=row["start_time"],
        end_time=row["end_time"],
        duration_ms=row["duration_ms"],
        status=SpanStatus(row["status"]),
        service_name=row["service_name"] or "default",
        attributes=attributes,
        events=events,
        project_id=row["project_id"],
    )

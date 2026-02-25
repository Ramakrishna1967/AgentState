# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Trace routes — list traces, get trace detail with full span tree."""

from __future__ import annotations

import json
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

from api.db import get_db
from api.dependencies import get_current_active_user
from api.schemas import TraceSchema, TraceDetailSchema, SpanSchema, SpanStatus

router = APIRouter()


@router.get("/traces", response_model=dict)
async def list_traces(
    project_id: str | None = Query(None),
    status: str | None = Query(None),
    start_date: int | None = Query(None, description="Unix timestamp in nanoseconds"),
    end_date: int | None = Query(None, description="Unix timestamp in nanoseconds"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """List traces with pagination and filters.

    Filters: project_id, status, date range.
    Returns paginated list of traces.
    """
    # Build query
    where_clauses = []
    params = []

    if project_id:
        where_clauses.append("project_id = ?")
        params.append(project_id)

    if status:
        where_clauses.append("status = ?")
        params.append(status)

    if start_date:
        where_clauses.append("start_time >= ?")
        params.append(start_date)

    if end_date:
        where_clauses.append("start_time <= ?")
        params.append(end_date)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # Count total
    count_query = f"SELECT COUNT(*) FROM traces {where_sql}"
    async with db.execute(count_query, params) as cursor:
        row = await cursor.fetchone()
        total = row[0]

    # Fetch page
    offset = (page - 1) * page_size
    query = f"""
        SELECT trace_id, project_id, start_time, end_time, duration_ms, status, created_at
        FROM traces
        {where_sql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    """
    params.extend([page_size, offset])

    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()

    traces = []
    for row in rows:
        # Count spans for this trace
        async with db.execute(
            "SELECT COUNT(*) FROM spans WHERE trace_id = ?", (row["trace_id"],)
        ) as span_cursor:
            span_count_row = await span_cursor.fetchone()
            span_count = span_count_row[0]

        traces.append({
            "trace_id": row["trace_id"],
            "project_id": row["project_id"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "duration_ms": row["duration_ms"],
            "status": row["status"],
            "span_count": span_count,
        })

    return {
        "items": traces,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/traces/{trace_id}", response_model=TraceDetailSchema)
async def get_trace_detail(
    trace_id: str,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get full trace detail with all spans in tree structure."""
    # Fetch trace
    async with db.execute(
        "SELECT trace_id, project_id, start_time, end_time, duration_ms, status FROM traces WHERE trace_id = ?",
        (trace_id,),
    ) as cursor:
        trace_row = await cursor.fetchone()

    if not trace_row:
        raise HTTPException(status_code=404, detail="Trace not found")

    # Fetch all spans
    async with db.execute(
        """
        SELECT span_id, trace_id, parent_span_id, project_id, name, start_time, end_time,
               duration_ms, status, service_name, attributes, events
        FROM spans
        WHERE trace_id = ?
        ORDER BY start_time ASC
        """,
        (trace_id,),
    ) as cursor:
        span_rows = await cursor.fetchall()

    spans = []
    for row in span_rows:
        # Parse JSON fields
        attributes = json.loads(row["attributes"]) if row["attributes"] else {}
        events = json.loads(row["events"]) if row["events"] else []

        spans.append(
            SpanSchema(
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
        )

    return TraceDetailSchema(
        trace_id=trace_row["trace_id"],
        project_id=trace_row["project_id"],
        start_time=trace_row["start_time"],
        end_time=trace_row["end_time"],
        duration_ms=trace_row["duration_ms"],
        status=SpanStatus(trace_row["status"]),
        spans=spans,
    )

@router.get("/traces/{trace_id}/replay", response_model=List[SpanSchema])
async def get_trace_replay(
    trace_id: str,
    db: aiosqlite.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_active_user),
):
    """Get ordered spans for a trace to support Time Machine replay."""
    # Fetch all spans for the trace ordered precisely by start_time
    async with db.execute(
        """
        SELECT span_id, trace_id, parent_span_id, project_id, name, start_time, end_time,
               duration_ms, status, service_name, attributes, events
        FROM spans
        WHERE trace_id = ?
        ORDER BY start_time ASC
        """,
        (trace_id,),
    ) as cursor:
        span_rows = await cursor.fetchall()
        
    if not span_rows:
        raise HTTPException(status_code=404, detail="Trace not found or contains no spans")

    spans = []
    for row in span_rows:
        # Parse JSON fields
        attributes = json.loads(row["attributes"]) if row["attributes"] else {}
        events = json.loads(row["events"]) if row["events"] else []

        spans.append(
            SpanSchema(
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
        )

    return spans

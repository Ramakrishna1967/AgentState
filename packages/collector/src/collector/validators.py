# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Payload validation for trace ingestion."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field, ValidationError


class SpanPayload(BaseModel):
    """Span payload schema for ingestion."""

    span_id: str
    trace_id: str
    parent_span_id: str | None = None
    name: str
    start_time: int
    end_time: int
    duration_ms: int
    status: str = "OK"
    service_name: str = "default"
    attributes: dict[str, Any] = Field(default_factory=dict)
    events: list[dict[str, Any]] = Field(default_factory=list)


class TraceIngestionPayload(BaseModel):
    """Trace ingestion payload with batch of spans."""

    spans: list[SpanPayload] = Field(..., min_length=1, max_length=1000)


def validate_span(span_data: dict) -> None:
    """Validate a single span dict has required fields.

    Raises ValueError if validation fails.
    """
    required_fields = ["span_id", "trace_id", "name", "start_time", "end_time"]
    missing = [f for f in required_fields if f not in span_data]
    if missing:
        raise ValueError(f"Missing required span fields: {', '.join(missing)}")

    # Validate types
    if not isinstance(span_data["span_id"], str) or not span_data["span_id"]:
        raise ValueError("span_id must be a non-empty string")
    if not isinstance(span_data["trace_id"], str) or not span_data["trace_id"]:
        raise ValueError("trace_id must be a non-empty string")
    if not isinstance(span_data["start_time"], (int, float)):
        raise ValueError("start_time must be a number")
    if not isinstance(span_data["end_time"], (int, float)):
        raise ValueError("end_time must be a number")


def validate_payload(payload: dict) -> TraceIngestionPayload:
    """Validate incoming trace payload.

    Raises HTTPException 400 if validation fails.
    """
    try:
        return TraceIngestionPayload(**payload)
    except ValidationError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payload: {e.errors()}",
        )


def check_payload_size(content_length: int | None, max_size_mb: int = 5) -> None:
    """Check payload size limit.

    Raises HTTPException 413 if payload exceeds limit.
    """
    if content_length is None:
        return

    max_size_bytes = max_size_mb * 1024 * 1024
    if content_length > max_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Payload too large. Max size: {max_size_mb}MB",
        )

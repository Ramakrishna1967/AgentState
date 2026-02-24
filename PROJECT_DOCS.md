# AgentStack — Complete Project Documentation

> **"Chrome DevTools for AI Agents"** — Real-time observability, security analysis, and cost tracking for LLM-powered agents.

---

## Table of Contents

1. [What Is AgentStack?](#1-what-is-agentstack)
2. [High-Level Architecture](#2-high-level-architecture)
3. [How Data Flows (End to End)](#3-how-data-flows-end-to-end)
4. [Package: SDK (sdk-python)](#4-package-sdk-sdk-python)
5. [Package: Collector](#5-package-collector)
6. [Package: API](#6-package-api)
7. [Package: Workers](#7-package-workers)
8. [Package: Dashboard](#8-package-dashboard)
9. [Deploy Layer](#9-deploy-layer)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Database Schemas](#11-database-schemas)
12. [API Endpoints Reference](#12-api-endpoints-reference)
13. [Security Model](#13-security-model)
14. [Developer Guide](#14-developer-guide)

---

## 1. What Is AgentStack?

AgentStack is an **open-source observability platform** built specifically for AI agents. Think of it like Datadog or New Relic, but designed from the ground up for LLM-based systems.

### Core Problems It Solves

| Problem | How AgentStack Solves It |
|---------|--------------------------|
| "Why did my agent fail?" | Full trace tree showing every LLM call, tool use, memory read |
| "Is my agent being attacked?" | Real-time prompt injection and PII leak detection |
| "How much is my agent costing me?" | Per-model token counting and USD cost calculation |
| "What happened 2 hours ago?" | Persistent trace storage with full replay |

### Key Concepts

- **Span** — A single unit of work: one LLM call, one tool invocation, one function. Has a start time, end time, status (OK/ERROR), and key-value attributes.
- **Trace** — A tree of spans representing one complete agent execution (one user request → one trace).
- **Project** — A logical grouping of traces. Each project gets an API key. You might have one project per agent or per environment.
- **Worker** — A background process that consumes spans from Redis and does something with them (write to DB, analyze for security, calculate cost).

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR AI AGENT                            │
│                   (Python, any framework)                       │
│                                                                 │
│   @observe decorator  ──►  SDK  ──►  BatchSpanProcessor         │
│                                         │                       │
│                              HTTP POST /v1/traces               │
└─────────────────────────────────────────┼───────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        COLLECTOR  :4318                         │
│   • Validates API key (checks SQLite projects table)            │
│   • Validates span schema                                       │
│   • Writes to Redis Stream "spans.ingest"                       │
│   • Returns 202 Accepted immediately                            │
└─────────────────────────────────────────┼───────────────────────┘
                                          │
                              Redis Stream: spans.ingest
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    │                     │                       │
                    ▼                     ▼                       ▼
          ┌──────────────┐    ┌──────────────────┐   ┌─────────────────┐
          │  ClickHouse  │    │ Security Engine  │   │ Cost Calculator │
          │   Writer     │    │   Worker         │   │   Worker        │
          │              │    │                  │   │                 │
          │ Writes spans │    │ Checks for:      │   │ Counts tokens,  │
          │ to ClickHouse│    │ • Prompt inject  │   │ calculates USD, │
          │ for analytics│    │ • PII leaks      │   │ writes to CH    │
          │              │    │ • Anomalies      │   │                 │
          └──────────────┘    └────────┬─────────┘   └─────────────────┘
                                       │
                              Redis Stream: alerts.live
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API  :8000                             │
│   • REST API for Dashboard (traces, spans, projects, auth)      │
│   • WebSocket /ws/traces — reads alerts.live, broadcasts        │
│   • Stores metadata in SQLite                                   │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DASHBOARD  :80                            │
│   React SPA served by Nginx                                     │
│   • Shows trace list, trace detail waterfall                    │
│   • Live feed of incoming spans via WebSocket                   │
│   • Security alerts panel                                       │
│   • Cost analytics charts                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Services and Ports

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| Nginx | 80 | nginx:alpine | Reverse proxy / gateway |
| API | 8000 | FastAPI + uvicorn | REST API + WebSocket |
| Collector | 4318 | FastAPI + uvicorn | Span ingestion endpoint |
| Dashboard | — | React + Vite → Nginx | Frontend SPA |
| Redis | 6379 | Redis 7 | Message bus (streams) |
| ClickHouse | 8123/9000 | ClickHouse 24.3 | Analytics database |
| SQLite | file | aiosqlite | Metadata (projects, users, traces) |

---

## 3. How Data Flows (End to End)

### Step-by-Step: A Span's Journey

```
1. Your code calls a function decorated with @observe
2. SDK creates a Span object (span_id, trace_id, name, start_time)
3. Function executes
4. SDK records end_time, status, attributes
5. Span.end() is called → span queued in RingBuffer
6. BatchSpanProcessor background thread wakes up (every 5s or when 64 spans queued)
7. Spans serialized to JSON, gzip-compressed
8. HTTP POST to Collector /v1/traces with X-API-Key header
9. Collector validates API key against SQLite projects table
10. Collector validates each span has required fields
11. Collector writes span to Redis Stream "spans.ingest" as msgpack
12. Collector returns 202 Accepted
13. ClickHouseWriter worker reads from "spans.ingest"
14. Writer batches spans, inserts into ClickHouse "spans" table
15. SecurityEngine worker reads same stream
16. Engine checks for prompt injection, PII, anomalies
17. If threat found → writes alert to Redis Stream "alerts.live"
18. CostCalculator worker reads same stream
19. Calculator extracts token counts, computes USD cost
20. Calculator writes to ClickHouse "cost_metrics" table
21. API WebSocket consumer reads "alerts.live"
22. API broadcasts alert to all connected Dashboard clients
23. Dashboard shows alert in SecurityPanel in real-time
```

### Redis Streams Used

| Stream Key | Producer | Consumers | Data Format |
|------------|----------|-----------|-------------|
| `spans.ingest` | Collector | ClickHouseWriter, SecurityEngine, CostCalculator | msgpack |
| `alerts.live` | SecurityEngine | API WebSocket consumer | JSON (decode_responses=True) |

---

## 4. Package: SDK (sdk-python)

**Location:** `agentstack/packages/sdk-python/`
**Install:** `pip install agentstack-sdk` (or local path)
**Purpose:** Instruments your Python agent code to emit spans.

### File Tree

```
sdk-python/
├── pyproject.toml              # Hatch build config, dependencies
└── src/agentstack/
    ├── __init__.py             # Public API surface
    ├── config.py               # Config from env vars
    ├── context.py              # Async-safe span context propagation
    ├── decorator.py            # @observe decorator
    ├── exporter.py             # BatchSpanProcessor (background thread)
    ├── local_store.py          # SQLite fallback for offline spans
    ├── models.py               # SpanModel, TraceModel, SpanEvent
    ├── sanitizer.py            # PII scrubber (runs before export)
    ├── tracer.py               # Span class, Tracer class
    ├── frameworks/
    │   └── autogen.py          # AutoGen auto-instrumentation (stub)
    └── _internal/
        ├── buffer.py           # Thread-safe RingBuffer
        └── transport.py        # HTTP client with retry/backoff
```

### `__init__.py` — Public API

This is the only file users need to import from. It exports:
- `observe` — the decorator for instrumenting functions
- `Tracer` — for manual span creation
- `flush` — force-send all buffered spans
- `configure` — set SDK options programmatically

```python
from agentstack import observe, Tracer, flush
```

### `config.py` — Configuration

Reads all settings from `AGENTSTACK_*` environment variables. Uses a frozen dataclass (`AgentStackConfig`) so config is immutable after initialization.

| Env Var | Default | Description |
|---------|---------|-------------|
| `AGENTSTACK_API_KEY` | `""` | Required. Your project API key (starts with `ak_`) |
| `AGENTSTACK_COLLECTOR_URL` | `http://localhost:4318` | Where to send spans |
| `AGENTSTACK_ENABLED` | `true` | Master on/off switch |
| `AGENTSTACK_BATCH_SIZE` | `64` | Flush when this many spans queued |
| `AGENTSTACK_EXPORT_INTERVAL` | `5000` | Flush every N milliseconds |
| `AGENTSTACK_MAX_QUEUE_SIZE` | `2048` | Ring buffer capacity |
| `AGENTSTACK_LOG_LEVEL` | `INFO` | Python logging level |
| `AGENTSTACK_DEBUG` | `false` | Verbose SDK logging |
| `AGENTSTACK_SERVICE_NAME` | `default` | Tagged on all spans |

**Singleton pattern:** `get_config()` returns the same instance every call. `reset_config()` clears it (for testing).

### `models.py` — Data Models

**`SpanStatus`** — Enum: `OK` or `ERROR`

**`SpanEvent`** — A discrete event within a span (e.g., a streaming chunk arriving):
- `name: str`
- `timestamp: int` — nanoseconds since epoch
- `attributes: dict[str, str]`

**`SpanModel`** — The core data model, matches ClickHouse schema:
- `trace_id` — UUID grouping all spans in one agent run
- `span_id` — UUID for this specific operation
- `parent_span_id` — Links to parent span (forms the tree)
- `name` — Operation name: `llm.chat`, `tool.call`, `memory.read`
- `start_time` / `end_time` — Nanoseconds since epoch
- `duration_ms` — Computed duration
- `status` — OK or ERROR
- `service_name` — From config
- `attributes` — Key-value pairs: `llm.model`, `llm.tokens.in`, `tool.name`
- `events` — List of SpanEvents
- `project_id` / `api_key_hash` — Set by Collector

**`TraceModel`** — A collection of spans:
- `trace_id`, `spans`, `start_time`, `end_time`, `service_name`, `status`
- Computed properties: `duration_ms`, `span_count`, `has_errors`

### `context.py` — Context Propagation

Uses Python's `contextvars` module. This is critical for async code — it ensures that when you have nested `@observe` calls, child spans automatically know their parent.

Two context variables:
- `_trace_id_var` — The current trace ID
- `_span_stack_var` — Stack of active spans

**`span_context(span)`** — Context manager that pushes a span onto the stack. When you enter it, that span becomes the "current" span. Any new spans created inside will set their `parent_span_id` to this span's `span_id`. On exit, the previous state is restored (important for async tasks that run concurrently).

**Key insight:** The stack is copied on each push (`stack.copy()`), not mutated. This means two concurrent async tasks each get their own independent stack — no cross-contamination.

### `tracer.py` — Span and Tracer

**`Span`** class — represents an in-flight operation:
- Created by `Tracer.start_span()`
- `end()` — records end time, computes duration, scrubs PII from attributes, queues to processor
- `set_attribute(key, value)` — add metadata
- `add_event(name, attributes)` — record a discrete event
- `set_status(status)` — mark OK or ERROR
- `record_exception(exc)` — records exception details as an event
- `to_model()` — converts to `SpanModel` for export

**`Tracer`** class — factory for creating spans:
- `start_span(name, attributes)` — creates a new Span, sets trace_id and parent_span_id from context
- `start_trace(name)` — creates a root span (no parent), generates new trace_id

### `decorator.py` — @observe

The `@observe` decorator wraps any function (sync or async) to automatically create a span around it.

```python
@observe(name="llm.chat", attributes={"llm.model": "gpt-4"})
async def call_gpt(prompt: str) -> str:
    ...
```

What it does:
1. Detects if the function is `async` or sync
2. Creates a span via `Tracer.start_span()`
3. Enters `span_context(span)` so nested calls link correctly
4. Calls the original function
5. On success: calls `span.end()` with `SpanStatus.OK`
6. On exception: calls `span.record_exception(exc)`, `span.set_status(ERROR)`, `span.end()`, re-raises

### `exporter.py` — BatchSpanProcessor

The background export engine. Runs a daemon thread.

**Flush triggers:**
1. Ring buffer reaches `batch_size` (default 64)
2. Export interval timer fires (default 5s)
3. Process exit (atexit hook)
4. Manual `flush()` call

**`_do_flush()`** — the core method:
1. Drains all spans from the RingBuffer
2. Converts each `Span` to `SpanModel` via `span.to_model()`
3. Serializes to JSON dicts
4. Sends via `HttpTransport.send()`
5. On success: done
6. On failure: saves to `LocalStore` (SQLite fallback)

**`_retry_unsent()`** — runs every ~30s, reads unsent spans from LocalStore and retries sending them.

**Singleton:** `get_processor()` returns the global instance. Thread-safe via double-checked locking.

### `_internal/buffer.py` — RingBuffer

Thread-safe fixed-capacity buffer using `collections.deque(maxlen=N)`.

- `add(item)` — if full, oldest item is silently dropped (drop counter incremented)
- `drain()` — removes and returns ALL items atomically
- `peek(n)` — read without removing
- All operations protected by `threading.Lock`

**Why a ring buffer?** If your agent generates spans faster than they can be exported, we drop old spans rather than growing memory unboundedly or blocking your agent.

### `_internal/transport.py` — HttpTransport

HTTP client using Python's stdlib `urllib` (no external dependencies).

- Serializes spans to JSON, gzip-compresses the payload
- Sets headers: `Content-Type: application/json`, `Content-Encoding: gzip`, `X-API-Key`
- Retry loop: 3 attempts with exponential backoff (1s, 2s, 4s)
- Retries on: 429, 500, 502, 503, 504, connection errors
- Does NOT retry on 4xx client errors (except 429)
- Returns `TransportResult(success, status_code, error, retries_used)`

### `local_store.py` — Offline Fallback

SQLite database (`.agentstack.db` in current directory) for storing spans when the Collector is unreachable.

- `save_spans(spans)` — batch insert with `INSERT OR REPLACE`
- `get_unsent_spans(limit=100)` — fetch spans where `sent=0`
- `mark_as_sent(span_ids)` — update `sent=1` after successful retry
- `delete_sent()` — cleanup old sent spans
- `export_to_json(path)` — debug utility

### `sanitizer.py` — PII Scrubber

Runs on every span's attributes before export. Pre-compiled regex patterns for speed (<1ms per span).

Detects and replaces:
- SSN: `123-45-6789` → `[REDACTED_SSN]`
- Email: `user@example.com` → `[REDACTED_EMAIL]`
- Credit card: `4111-1111-1111-1111` → `[REDACTED_CC]`
- Phone numbers → `[REDACTED_PHONE]`
- AWS access keys (`AKIA...`) → `[REDACTED_AWS_KEY]`
- OpenAI keys (`sk-...`) → `[REDACTED_OPENAI_KEY]`
- Generic API keys/tokens → `[REDACTED_API_KEY]`

### `frameworks/autogen.py` — Framework Stubs

Stub for future AutoGen auto-instrumentation. Currently a no-op. Future implementation will monkey-patch AutoGen's `Agent.receive()` and `Agent.send()` to automatically create spans.

---

## 5. Package: Collector

**Location:** `agentstack/packages/collector/`
**Port:** 4318
**Purpose:** The ingestion endpoint. Receives spans from SDKs, validates them, and pushes to Redis.

### File Tree

```
collector/
├── Dockerfile
├── pyproject.toml
└── src/collector/
    ├── server.py       # FastAPI app, /v1/traces endpoint
    ├── auth.py         # API key verification
    ├── validators.py   # Span schema validation
    ├── redis_writer.py # Writes spans to Redis Stream
    ├── health.py       # /health and /ready endpoints
    └── config.py       # Collector-specific settings
```

### `server.py` — Main App

FastAPI app with lifespan management:
- **Startup:** initializes SQLite DB (for auth), connects Redis writer
- **Shutdown:** closes Redis connection

**`POST /v1/traces`** — the only real endpoint:
1. Checks `Content-Length` header, rejects if >5MB
2. Reads `X-API-Key` header, calls `verify_api_key()`
3. Parses JSON body — accepts `{"spans": [...]}` or `[...]` or a single span dict
4. For each span: calls `validate_span()`, enriches with `project_id`, calls `redis_writer.add_span()`
5. Returns `202 Accepted` with count of queued spans

**Important:** The Collector imports from the `api` package (`from api.db import get_database`) to share the SQLite database for API key verification. The Dockerfile copies the `api/src` directory into the image for this reason.

### `auth.py` — API Key Verification

```python
async def verify_api_key(x_api_key, db) -> str:  # returns project_id
```

- Checks key starts with `ak_` prefix
- Queries all projects from SQLite
- Uses `pbkdf2_sha256.verify()` to check the key against each stored hash
- Returns `project_id` if valid, raises 401 if not

**Performance note:** This does a full table scan and hash comparison for every request. For MVP this is fine. Production would use a cache.

### `validators.py` — Span Validation

**`validate_span(span_data: dict)`** — checks required fields:
- `span_id` (str)
- `trace_id` (str)
- `name` (str)
- `start_time` (int)
- `end_time` (int)

Raises `ValueError` if any field is missing or wrong type. Invalid spans are logged and skipped (not rejected — the whole batch still succeeds).

**`validate_payload(payload)`** — validates the full Pydantic model (`TraceIngestionPayload`).

**`check_payload_size(size_bytes)`** — raises 413 if payload >5MB.

### `redis_writer.py` — Redis Stream Writer

```python
class RedisWriter:
    async def connect(self)   # connects to Redis
    async def add_span(span_data: dict)  # writes to stream
    async def close()
```

- Reads `REDIS_URL` from environment (fixed bug — was hardcoded to localhost)
- Uses `redis.asyncio` for async writes
- Serializes span dict to msgpack before writing to stream
- Stream key: `spans.ingest`

### `health.py` — Health Probes

- `GET /health` — always returns 200 if service is running
- `GET /ready` — readiness check (currently always ready for MVP)

Used by Docker healthchecks and load balancers.

---

## 6. Package: API

**Location:** `agentstack/packages/api/`
**Port:** 8000
**Purpose:** REST API for the Dashboard. Stores metadata in SQLite, reads analytics from ClickHouse.

### File Tree

```
api/
├── Dockerfile
├── pyproject.toml
└── src/api/
    ├── main.py              # FastAPI app factory
    ├── config.py            # Settings (JWT secret, etc.)
    ├── db.py                # SQLite connection manager
    ├── db_clickhouse.py     # ClickHouse connection
    ├── dependencies.py      # JWT auth dependency
    ├── middleware.py        # CORS, rate limiting
    ├── schemas.py           # Pydantic request/response models
    └── routes/
        ├── auth.py          # POST /auth/register, /auth/login
        ├── traces.py        # GET /traces, /traces/{id}
        ├── spans.py         # GET /spans/{id}
        ├── projects.py      # CRUD /projects
        ├── security.py      # GET /security/alerts
        ├── analytics.py     # GET /analytics/cost
        └── ws.py            # WebSocket /ws/traces
```

### `main.py` — App Factory

`create_app()` builds the FastAPI instance:
1. Adds CORS middleware (all origins for MVP)
2. Adds rate limiting middleware
3. Registers health check at `GET /`
4. Includes all routers under `/api/v1`

Lifespan:
- **Startup:** `db.init_db()` creates SQLite tables, `ws.start_ws_consumer()` starts Redis consumer
- **Shutdown:** `ws.stop_ws_consumer()` cancels the task

### `config.py` — Settings

Uses `pydantic-settings` to read from `.env` file:
- `JWT_SECRET_KEY` — sign/verify JWT tokens (change in production!)
- `ALGORITHM` — `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` — 7 days (10080 minutes)
- `DATABASE_URL` — SQLite path
- `ENVIRONMENT` — `development` or `production`

### `db.py` — SQLite Manager

**`Database`** class manages async SQLite via `aiosqlite`.

**`init_db()`** creates these tables if they don't exist:
- `projects` — id, name, api_key_hash, created_at, updated_at
- `traces` — trace_id, project_id, start_time, end_time, duration_ms, status
- `spans` — span_id, trace_id, parent_span_id, project_id, name, start_time, end_time, duration_ms, status, service_name, attributes (JSON), events (JSON)
- `security_alerts` — id, trace_id, span_id, project_id, severity, alert_type, message, metadata (JSON)
- `users` — id, email, hashed_password, is_active

Pragmas set on every connection: `WAL mode`, `synchronous=NORMAL`, `busy_timeout=5000ms`, `foreign_keys=ON`.

**`get_db()`** — FastAPI dependency that yields a connection and closes it after the request.

### `db_clickhouse.py` — ClickHouse Client

Wraps `asynch` (async ClickHouse native protocol client).

```python
class ClickHouseClient:
    async def execute(query, args) -> list[dict]
    async def check_health() -> bool
```

Connection string built from env vars: `CLICKHOUSE_HOST`, `CLICKHOUSE_NATIVE_PORT`, `CLICKHOUSE_DB`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`.

### `dependencies.py` — Auth Dependency

**`get_current_user(credentials, db)`**:
1. Extracts Bearer token from `Authorization` header
2. Decodes JWT with `python-jose`
3. Extracts `sub` (user_id) from payload
4. Queries `users` table to verify user exists and is active
5. Returns user dict or raises 401

**`get_current_active_user`** — wraps `get_current_user`, used as `Depends()` in all protected routes.

### `schemas.py` — Pydantic Models

All request/response shapes:

| Schema | Purpose |
|--------|---------|
| `SpanSchema` | Single span response |
| `TraceSchema` | Trace summary (no spans) |
| `TraceDetailSchema` | Trace with full span list |
| `SecurityAlertSchema` | Security alert |
| `ProjectSchema` | Project info |
| `ProjectCreateRequest` | `{name: str}` |
| `ProjectCreateResponse` | Project + API key (shown once) |
| `UserRegisterRequest` | `{email, password}` |
| `UserLoginRequest` | `{email, password}` |
| `TokenResponse` | `{access_token, token_type}` |
| `HealthResponse` | `{status, version}` |
| `PaginatedResponse` | `{items, total, page, page_size, total_pages}` |

### Routes

#### `auth.py`
- `POST /api/v1/auth/register` — creates user, hashes password with `pbkdf2_sha256`
- `POST /api/v1/auth/login` — verifies password, returns JWT token

#### `traces.py`
- `GET /api/v1/traces` — paginated list with filters: `project_id`, `status`, `start_date`, `end_date`, `page`, `page_size`
- `GET /api/v1/traces/{trace_id}` — full trace with all spans ordered by `start_time ASC`

#### `spans.py`
- `GET /api/v1/spans/{span_id}` — single span detail, parses JSON `attributes` and `events` fields

#### `projects.py`
- `POST /api/v1/projects` — creates project, generates `ak_` prefixed API key, stores hash, returns key ONCE
- `GET /api/v1/projects` — list all projects
- `GET /api/v1/projects/{id}` — get one project
- `DELETE /api/v1/projects/{id}` — delete project (cascades to traces/spans via FK)

#### `security.py`
- `GET /api/v1/security/alerts` — list alerts with filters: `project_id`, `severity`, `limit`

#### `analytics.py`
- `GET /api/v1/analytics/cost` — queries ClickHouse `cost_metrics` table with parameterized queries, requires auth

#### `ws.py` — WebSocket
- `GET /ws/traces` — WebSocket endpoint
- Clients connect, server adds them to `_connections` set
- Background task reads from Redis Stream `alerts.live`
- Broadcasts each alert to all connected clients as `{"type": "alert", "data": {...}}`
- Handles ping/pong keepalive (30s timeout)
- Cleans up disconnected clients on send failure

---

## 7. Package: Workers

**Location:** `agentstack/packages/workers/`
**Purpose:** Background processes that consume spans from Redis and do work.

### File Tree

```
workers/
├── Dockerfile
├── README.md
└── src/workers/
    ├── consumer.py           # BaseConsumer (abstract Redis Stream consumer)
    ├── clickhouse_writer.py  # Writes spans to ClickHouse
    ├── security_engine.py    # Analyzes spans for threats
    ├── cost_calculator.py    # Calculates LLM token costs
    └── rules/
        ├── injection.py      # Prompt injection detection
        ├── pii.py            # PII detection
        └── anomaly.py        # Statistical anomaly detection
```

### `consumer.py` — BaseConsumer

Abstract base class for all workers. Handles the Redis Stream consumer group boilerplate.

```python
class BaseConsumer(ABC):
    async def start()          # main loop
    async def stop()           # graceful shutdown
    async def cleanup()        # close Redis connection
    async def process_message(message_id, data)  # ABSTRACT - implement in subclass
    def decode_msgpack(data)   # helper
```

**Consumer Group pattern:** Each worker type has its own consumer group. This means all three workers (writer, security, cost) each get a copy of every message — they don't compete, they all process independently.

**The loop:**
1. `XREADGROUP` — read up to `batch_size` messages, block for `poll_interval` ms
2. For each message: call `process_message()`
3. `XACK` — acknowledge the message (base class does this per-message)

**Note:** `ClickHouseWriter` overrides this to do bulk ACK after batch insert.

### `clickhouse_writer.py` — ClickHouseWriter

Extends `BaseConsumer`. Batches spans and bulk-inserts into ClickHouse.

**Key design:** Instead of inserting one span at a time, it accumulates spans in a buffer and flushes every N spans or every T seconds. This is critical for ClickHouse performance — it's optimized for bulk inserts.

**`process_message()`** — decodes msgpack, appends to `_buffer`, flushes if buffer full.

**`flush_buffer()`**:
1. If buffer empty, return
2. Build list of row tuples matching ClickHouse `spans` table schema
3. `client.insert("spans", rows, column_names=[...])`
4. **Only clears buffer on success** (fixed bug — was clearing even on failure)
5. On failure: logs error, keeps buffer for retry next cycle
6. Bulk ACKs all processed message IDs via Redis pipeline

**Custom `start()` loop:** Overrides base class to skip per-message ACK. Instead, ACKs happen in bulk inside `flush_buffer()` only after successful DB insert.

### `security_engine.py` — SecurityEngine

Analyzes every span for security threats.

**`process_message()`**:
1. Decodes msgpack span
2. Extracts text fields: `attributes` values, span name
3. Runs `check_injection(text)` — returns threat score 0-100
4. Runs `check_pii(text)` — returns list of detected PII types
5. Runs anomaly rules
6. If any threat found: creates alert dict, saves to SQLite `security_alerts`, writes to Redis Stream `alerts.live`

**Alert format written to `alerts.live`:**
```json
{
  "id": "uuid",
  "rule": "PROMPT_INJECTION",
  "severity": "HIGH",
  "score": 80.0,
  "description": "Possible prompt injection detected",
  "trace_id": "...",
  "span_id": "...",
  "project_id": "..."
}
```

### `cost_calculator.py` — CostCalculator

Calculates token costs for LLM spans.

**`process_message()`** — checks if span has `llm.tokens.in` or `llm.tokens.out` attributes. If yes, extracts model name, token counts, computes USD cost using a pricing table.

**Pricing table** (approximate, stored in code):
```python
PRICING = {
    "gpt-4": {"input": 0.03, "output": 0.06},      # per 1K tokens
    "gpt-3.5-turbo": {"input": 0.001, "output": 0.002},
    "claude-3-opus": {"input": 0.015, "output": 0.075},
    # etc.
}
```

**`flush_buffer()`** — bulk inserts cost records into ClickHouse `cost_metrics` table. Only clears buffer on success (fixed data-loss bug).

### `rules/injection.py` — Prompt Injection Detection

Simple regex-based detection for MVP. Patterns:
- `"ignore previous instructions"`
- `"system prompt"`
- `"DAN mode"`, `"jailbreak"`, `"dev mode"`
- `"roleplay as"`, `"you are not a"`

Each match adds 40 points to a threat score (capped at 100). Returns float 0.0-100.0.

### `rules/pii.py` — PII Detection

Regex patterns for:
- Email addresses
- SSN (`\d{3}-\d{2}-\d{4}`)
- Credit cards (16 digits with optional separators)
- AWS access keys (`AKIA[0-9A-Z]{16}`)
- OpenAI keys (`sk-[a-zA-Z0-9]{48}`)

Returns list of detected PII type names.

### `rules/anomaly.py` — Anomaly Detection

Statistical anomaly detection. Tracks rolling statistics (mean, std dev) for span durations per operation name. Flags spans that are >3 standard deviations from the mean as anomalies.

Uses `except (ValueError, TypeError)` — not bare `except` — so `KeyboardInterrupt` is never swallowed.

---

## 8. Package: Dashboard

**Location:** `agentstack/packages/dashboard/`
**Technology:** React 18 + TypeScript + Vite + TanStack Query
**Port:** Served by Nginx on port 80

### File Tree

```
dashboard/
├── Dockerfile              # Multi-stage: Node build → Nginx serve
├── package.json            # Dependencies
├── vite.config.ts          # Vite config
├── tsconfig.json
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Router + layout
    ├── index.css           # Global styles (CSS variables, dark theme)
    ├── pages/
    │   ├── Dashboard.tsx   # Metrics overview page
    │   ├── TraceView.tsx   # Trace list + waterfall detail
    │   └── Settings.tsx    # Project management
    ├── components/
    │   ├── LiveFeed.tsx        # Real-time span stream
    │   ├── SecurityPanel.tsx   # Security alerts
    │   ├── SpanDetail.tsx      # Span detail panel
    │   ├── TraceSearch.tsx     # Search/filter UI
    │   ├── TraceTimeline.tsx   # Waterfall chart
    │   └── ProjectSwitcher.tsx # Project selector
    ├── hooks/
    │   ├── useTraces.ts    # TanStack Query hooks for traces/metrics
    │   ├── useProject.ts   # TanStack Query hooks for projects
    │   └── useWebSocket.ts # WebSocket connection manager
    └── lib/
        ├── api.ts          # Axios client + interceptors
        ├── types.ts        # TypeScript interfaces
        └── utils.ts        # Formatting utilities
```

### `App.tsx` — Router and Layout

Uses `react-router-dom` with these routes:
- `/` → `Dashboard` (metrics overview)
- `/traces` → `TraceView` (trace list + detail)
- `/settings` → `Settings` (project management)
- `/login` → `LoginPage` (handles 401 redirects)

Layout: Sidebar navigation + main content area. `ProjectSwitcher` in sidebar lets you switch between projects.

### `lib/api.ts` — Axios Client

- Base URL from `VITE_API_URL` env var (default `http://localhost:8000`)
- Attaches `Authorization: Bearer <token>` header from localStorage
- **401 interceptor:** redirects to `/login` automatically
- All API calls go through this client

### `lib/types.ts` — TypeScript Types

Mirrors the Python Pydantic schemas:
- `Span`, `Trace`, `TraceDetail`
- `SecurityAlert`, `SecurityAlertSeverity`
- `Project`, `User`
- `PaginatedResponse<T>`

### `lib/utils.ts` — Utilities

- `formatDuration(ms)` — "1.2s", "450ms", "2m 30s"
- `formatTimestamp(ns)` — nanoseconds → human readable
- `formatRelativeTime(date)` — "2 minutes ago"
- `truncate(str, maxLen)` — "long string..."
- `getStatusColor(status)` — CSS class for OK/ERROR
- `getSeverityColor(severity)` — CSS class for LOW/MEDIUM/HIGH/CRITICAL

### `hooks/useTraces.ts` — Data Fetching

TanStack Query hooks:
- `useTraces(filters)` — fetches paginated trace list, refetches every 30s
- `useTraceDetail(traceId)` — fetches single trace with all spans
- `useDashboardMetrics(projectId)` — fetches traces and computes metrics client-side (total traces, error rate, avg latency, total cost)

### `hooks/useProject.ts` — Project Management

- `useProjects()` — list all projects
- `useCreateProject()` — mutation, invalidates project cache on success
- `useDeleteProject()` — mutation, invalidates project cache on success

### `hooks/useWebSocket.ts` — Real-time Connection

Manages WebSocket connection to `/ws/traces`:
- Connects on mount
- **Exponential backoff reconnection:** 1s, 2s, 4s, 8s... up to 30s max
- Parses incoming messages: `type: "alert"` → adds to alerts state, `type: "span"` → adds to live feed
- Sends ping every 25s to keep connection alive
- Exposes: `spans` (live feed), `alerts`, `connectionStatus`

### `pages/Dashboard.tsx` — Metrics Overview

Shows 4 metric cards:
- Total Traces (blue)
- Error Rate % (red)
- Avg Latency ms (green)
- Total Cost $ (purple)

Uses skeleton loading animation while data loads.

### `pages/TraceView.tsx` — Trace Explorer

Left panel: `TraceSearch` + paginated trace list
Right panel: `TraceTimeline` (waterfall) + `SpanDetail` for selected span

### `pages/Settings.tsx` — Project Management

Lists all projects, allows creating new projects (shows API key once in a modal), and deleting projects.

### `components/TraceTimeline.tsx` — Waterfall Chart

Renders spans as horizontal bars on a timeline:
- Calculates total trace duration
- Positions each span based on `start_time` relative to trace start
- Width proportional to `duration_ms`
- Indentation based on parent-child depth
- Error spans highlighted in red
- Click to select and show in `SpanDetail`

### `components/LiveFeed.tsx` — Real-time Feed

Shows incoming spans from WebSocket in real-time. Connection status indicator (green/yellow/red). "Clear" button to reset the feed.

### `components/SecurityPanel.tsx` — Alerts

Shows security alerts from WebSocket. Color-coded by severity. Shows rule name, description, trace ID.

---

## 9. Deploy Layer

**Location:** `deploy/`

### File Tree

```
deploy/
├── docker-compose.yml
├── .env                    # YOU CREATE THIS
├── nginx/
│   └── default.conf        # Nginx reverse proxy config
├── redis/
│   └── redis.conf          # Redis memory limits
└── clickhouse/
    └── init.sql            # ClickHouse schema
```

### `docker-compose.yml`

Defines 8 services with memory limits for 8GB RAM systems:

| Service | Memory Limit | Notes |
|---------|-------------|-------|
| redis | 1GB | With AOF persistence |
| clickhouse | 3GB | Largest consumer |
| api | 512MB | FastAPI |
| collector | 512MB | FastAPI |
| worker-writer | 256MB | Low memory |
| worker-security | 512MB | Regex matching |
| worker-cost | 256MB | Low memory |
| dashboard | 1GB | Node build |

**Shared volume:** `api_data` is mounted by both `api` and `collector` so they share the same SQLite database file.

**Dependency order:** `redis` and `clickhouse` start first, then `api` and `collector`, then workers.

### `nginx/default.conf` — Reverse Proxy

Routes all traffic through port 80:
- `/api/` → `http://api:8000` (REST API)
- `/v1/traces` → `http://collector:4318` (span ingestion)
- `/ws/` → `http://api:8000` with WebSocket upgrade headers
- `/` → static files from `/usr/share/nginx/html` with SPA fallback (`try_files $uri /index.html`)

### `clickhouse/init.sql` — ClickHouse Schema

Three tables:

**`spans`** — Core telemetry (MergeTree engine):
- Partitioned by month (`toYYYYMM(start_time)`)
- Ordered by `(project_id, service_name, start_time, trace_id, span_id)`
- TTL: 90 days auto-delete
- `attributes` stored as `Map(String, String)`

**`security_alerts`** — Threat records (MergeTree):
- `severity` as `Enum8` for efficient storage
- Ordered by `(project_id, severity, created_at)`

**`cost_metrics`** — Pre-aggregated costs (SummingMergeTree):
- SummingMergeTree automatically sums numeric columns when merging parts
- Ordered by `(project_id, model, timestamp)` — perfect for time-series queries

### `redis/redis.conf`

Key settings:
- `maxmemory 900mb` — leaves headroom within the 1GB container limit
- `maxmemory-policy allkeys-lru` — evict least recently used keys when full
- `appendonly yes` — AOF persistence so streams survive Redis restart

---

## 10. Environment Variables Reference

### SDK (set in your agent's environment)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENTSTACK_API_KEY` | ✅ Yes | — | Your project API key (`ak_...`) |
| `AGENTSTACK_COLLECTOR_URL` | No | `http://localhost:4318` | Collector endpoint |
| `AGENTSTACK_ENABLED` | No | `true` | Disable SDK entirely |
| `AGENTSTACK_BATCH_SIZE` | No | `64` | Spans before flush |
| `AGENTSTACK_EXPORT_INTERVAL` | No | `5000` | ms between flushes |
| `AGENTSTACK_SERVICE_NAME` | No | `default` | Tag on all spans |

### API & Collector (set in docker-compose or .env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ Yes | `changeme` | JWT signing key |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection |
| `CLICKHOUSE_HOST` | No | `localhost` | ClickHouse hostname |
| `CLICKHOUSE_NATIVE_PORT` | No | `9000` | ClickHouse native port |
| `CLICKHOUSE_DB` | No | `default` | Database name |
| `CLICKHOUSE_USER` | No | `default` | Username |
| `CLICKHOUSE_PASSWORD` | No | `""` | Password |

### Dashboard (set at build time in Vite)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | API base URL |
| `VITE_WS_URL` | `ws://localhost:8000` | WebSocket base URL |

---

## 11. Database Schemas

### SQLite (metadata)

```sql
-- Projects
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,   -- pbkdf2_sha256 hash of ak_... key
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Traces
CREATE TABLE traces (
    trace_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    start_time INTEGER NOT NULL,  -- nanoseconds
    end_time INTEGER,
    duration_ms INTEGER,
    status TEXT DEFAULT 'OK',
    created_at TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Spans
CREATE TABLE spans (
    span_id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    parent_span_id TEXT,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    duration_ms INTEGER,
    status TEXT DEFAULT 'OK',
    service_name TEXT,
    attributes TEXT,   -- JSON string
    events TEXT,       -- JSON array string
    api_key_hash TEXT,
    created_at TIMESTAMP
);

-- Security Alerts
CREATE TABLE security_alerts (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    severity TEXT NOT NULL,     -- low/medium/high/critical
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,              -- JSON string
    created_at TIMESTAMP
);

-- Users (dashboard auth)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP
);
```

### ClickHouse (analytics)

```sql
-- Spans (analytics queries)
CREATE TABLE spans (
    span_id String,
    trace_id String,
    parent_span_id String,
    project_id String,
    name String,
    service_name String,
    status String,
    start_time DateTime64(6),
    end_time DateTime64(6),
    duration_ms Float64,
    attributes Map(String, String),
    events String,              -- JSON
    ingested_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (project_id, service_name, start_time, trace_id, span_id)
TTL start_time + INTERVAL 90 DAY;

-- Cost metrics (pre-aggregated)
CREATE TABLE cost_metrics (
    project_id String,
    model String,
    span_kind String,
    timestamp DateTime,
    prompt_tokens Int64,
    completion_tokens Int64,
    total_tokens Int64,
    cost_usd Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, model, timestamp);
```

---

## 12. API Endpoints Reference

All endpoints under `/api/v1` require `Authorization: Bearer <token>` except `/auth/*`.

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/register` | `{email, password}` | `UserSchema` |
| POST | `/auth/login` | `{email, password}` | `{access_token, token_type}` |

### Projects

| Method | Path | Response |
|--------|------|----------|
| GET | `/projects` | `ProjectSchema[]` |
| POST | `/projects` | `{project, api_key}` — key shown ONCE |
| GET | `/projects/{id}` | `ProjectSchema` |
| DELETE | `/projects/{id}` | 204 No Content |

### Traces

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| GET | `/traces` | `project_id`, `status`, `start_date`, `end_date`, `page`, `page_size` | Paginated trace list |
| GET | `/traces/{trace_id}` | — | `TraceDetailSchema` with spans |

### Spans

| Method | Path | Response |
|--------|------|----------|
| GET | `/spans/{span_id}` | `SpanSchema` |

### Security

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| GET | `/security/alerts` | `project_id`, `severity`, `limit` | `SecurityAlertSchema[]` |

### Analytics

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| GET | `/analytics/cost` | `project_id`, `start_date`, `end_date` | Cost time series |

### WebSocket

| Path | Protocol | Description |
|------|----------|-------------|
| `/ws/traces` | WebSocket | Real-time alerts and span feed |

### Collector

| Method | Path | Headers | Response |
|--------|------|---------|----------|
| POST | `/v1/traces` | `X-API-Key: ak_...` | `{status: "accepted", spans_queued: N}` |
| GET | `/health` | — | `{status: "ok"}` |
| GET | `/ready` | — | `{ready: true}` |

---

## 13. Security Model

### Authentication Layers

1. **SDK → Collector:** API key in `X-API-Key` header. Key is hashed with `pbkdf2_sha256` and stored in SQLite. Never stored in plaintext.

2. **Dashboard → API:** JWT token in `Authorization: Bearer` header. Token signed with `SECRET_KEY` using HS256. Expires after 7 days.

3. **Workers → Redis:** No auth in MVP (internal network only). Production should use Redis AUTH.

4. **Workers → ClickHouse:** Password-based auth via connection string. Empty password in MVP.

### API Key Format

```
ak_<32 random URL-safe bytes>
```
Example: `ak_xK9mP2vL8nQ4rT7wY1jH6cF3bE5dA0sZ`

Generated with `secrets.token_urlsafe(32)`. Shown to user ONCE on project creation. Only the `pbkdf2_sha256` hash is stored.

### PII Protection

The SDK's `sanitizer.py` scrubs PII from span attributes BEFORE they leave the user's machine. This is a client-side protection layer. The SecurityEngine also detects PII server-side and creates alerts.

### SQL Injection Prevention

All SQLite queries use parameterized queries (`?` placeholders). ClickHouse analytics queries use `%s` parameterized queries. No f-string interpolation of user input.

### Rate Limiting

The API has a rate limiting middleware (`middleware.py`). Limits requests per IP per minute.

---

## 14. Developer Guide

### Running Locally (Development)

```bash
# 1. Start infrastructure only
cd deploy
docker-compose up -d redis clickhouse

# 2. Run API
cd agentstack/packages/api
pip install hatch
hatch run uvicorn api.main:app --reload --port 8000

# 3. Run Collector
cd agentstack/packages/collector
hatch run uvicorn collector.server:app --reload --port 4318

# 4. Run a worker
cd agentstack/packages/workers
hatch run python -m workers.clickhouse_writer

# 5. Run Dashboard
cd agentstack/packages/dashboard
npm install
npm run dev   # runs on http://localhost:5173
```

### Running with Docker (Production)

```bash
# Create .env file
echo "SECRET_KEY=$(openssl rand -hex 32)" > deploy/.env

# Start everything
cd deploy
docker-compose up -d

# Check logs
docker-compose logs -f api
docker-compose logs -f collector
docker-compose logs -f worker-writer
```

### Instrumenting Your Agent

```python
import os
os.environ["AGENTSTACK_API_KEY"] = "ak_your_key_here"
os.environ["AGENTSTACK_COLLECTOR_URL"] = "http://localhost:4318"

from agentstack import observe, Tracer

# Option 1: Decorator (easiest)
@observe(name="llm.chat")
async def call_llm(prompt: str) -> str:
    response = await openai_client.chat(...)
    return response

# Option 2: Manual spans
tracer = Tracer()
with tracer.start_span("my.operation") as span:
    span.set_attribute("input.length", len(prompt))
    result = do_work()
    span.set_attribute("output.length", len(result))

# Option 3: Nested (automatic parent-child linking)
@observe(name="agent.run")
async def run_agent(query: str):
    plan = await plan_step(query)      # creates child span
    result = await execute_step(plan)  # creates child span
    return result

@observe(name="agent.plan")
async def plan_step(query: str): ...

@observe(name="agent.execute")
async def execute_step(plan: str): ...
```

### Adding LLM Cost Tracking

Add these attributes to your LLM spans:

```python
@observe(name="llm.chat")
async def call_llm(prompt: str) -> str:
    response = await openai_client.chat(...)
    
    # These attributes trigger cost calculation
    span = get_current_span()
    span.set_attribute("llm.model", "gpt-4")
    span.set_attribute("llm.tokens.in", response.usage.prompt_tokens)
    span.set_attribute("llm.tokens.out", response.usage.completion_tokens)
    
    return response.choices[0].message.content
```

### Project Structure Conventions

- All Python packages use `hatch` for build/dependency management
- All packages have `pyproject.toml` with `[tool.hatch.envs.default]` for dev dependencies
- Import paths: `from api.xxx import yyy` (not relative imports in routes)
- All async DB operations use `aiosqlite` with `async with db.execute(...) as cursor`
- All workers extend `BaseConsumer` and implement `process_message()`

### Adding a New Worker

1. Create `src/workers/my_worker.py`
2. Extend `BaseConsumer`
3. Implement `process_message(self, message_id, data)`
4. Add to `docker-compose.yml` as a new service
5. Use the same `spans.ingest` stream key — you get a copy of every message

```python
class MyWorker(BaseConsumer):
    def __init__(self):
        super().__init__(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            stream_key="spans.ingest",
            group_name="my-worker-group",
            consumer_name="my-worker-1",
        )
    
    async def process_message(self, message_id, data):
        span = self.decode_msgpack(data[b"span"])
        # do your work here
```

### Adding a New API Route

1. Create `src/api/routes/my_route.py`
2. Define `router = APIRouter()`
3. Add `Depends(get_current_active_user)` to protect the endpoint
4. Use `Depends(get_db)` for SQLite or `Depends(get_clickhouse)` for ClickHouse
5. Import and include in `main.py`:

```python
from api.routes import my_route
app.include_router(my_route.router, prefix="/api/v1", tags=["my-feature"])
```

---

*Last updated: 2026-02-18 | AgentStack v0.1.0-alpha*

# AgentStack — Complete System Architecture

> **What is AgentStack?**
> A Python SDK + web dashboard that lets developers SEE inside their AI agents.
> Like "Chrome DevTools" but for LLM-powered agents (LangGraph, CrewAI, AutoGen).

---

## 1. SYSTEM ARCHITECTURE (How Everything Connects)

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                           AgentStack — Full System Map                              ║
╚══════════════════════════════════════════════════════════════════════════════════════╝


 ┌─────────────────────────────────────────────────────────┐
 │              🖥️  DEVELOPER'S APP (their code)           │
 │                                                         │
 │   from agentstack import observe                        │
 │                                                         │
 │   @observe                    ┌──────────────────────┐  │
 │   def my_agent(query):  ───►  │  AgentStack SDK      │  │
 │       ...                     │  - Creates a "span"   │  │
 │       return answer           │  - Records: LLM call, │  │
 │                               │    tool use, tokens,  │  │
 │                               │    memory reads       │  │
 │                               │  - Adds to batch      │  │
 │                               │    queue (async)      │  │
 │                               └──────────┬───────────┘  │
 │                                          │               │
 └──────────────────────────────────────────┼───────────────┘
                                            │
                              OTLP/HTTP + Protobuf (gzip)
                              Batched: 64 spans or every 5s
                                            │
                                            ▼
 ┌──────────────────────────────────────────────────────────┐
 │              ⚡ INGESTION LAYER                          │
 │                                                          │
 │   ┌────────────────────────┐                             │
 │   │   Trace Collector      │  ◄── FastAPI endpoint       │
 │   │   POST /v1/traces      │      validates schema       │
 │   │   authenticates API key│      checks payload size    │
 │   └───────────┬────────────┘                             │
 │               │                                          │
 │               │  XADD (MsgPack)                          │
 │               ▼                                          │
 │   ┌────────────────────────┐                             │
 │   │   Redis Streams        │  ◄── Event bus              │
 │   │   Stream: spans.ingest │      Durable queue          │
 │   │   Stream: alerts.live  │      Consumer groups        │
 │   └───────────┬────────────┘                             │
 │               │                                          │
 └───────────────┼──────────────────────────────────────────┘
                 │
                 │  Three PARALLEL consumers read from Redis:
                 │
        ┌────────┼────────────────────┐
        │        │                    │
        ▼        ▼                    ▼
 ┌──────────────────────────────────────────────────────────┐
 │              💾 STORAGE / PROCESSING LAYER               │
 │                                                          │
 │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
 │  │  ClickHouse  │  │  Security    │  │  Cost         │   │
 │  │  Writer      │  │  Engine      │  │  Calculator   │   │
 │  │              │  │              │  │               │   │
 │  │  Reads spans │  │  Reads spans │  │  Reads spans  │   │
 │  │  from Redis  │  │  from Redis  │  │  from Redis   │   │
 │  │              │  │              │  │               │   │
 │  │  Batch INSERT│  │  Scans for:  │  │  Extracts:    │   │
 │  │  into        │  │  - Prompt    │  │  - Token count│   │
 │  │  ClickHouse  │  │    injection │  │  - Model used │   │
 │  │              │  │  - PII leaks │  │  - Cost/token │   │
 │  │              │  │  - Infinite  │  │               │   │
 │  │              │  │    loops     │  │  Writes cost  │   │
 │  │              │  │              │  │  metrics to   │   │
 │  │              │  │  Writes      │  │  ClickHouse   │   │
 │  │              │  │  alerts to   │  │               │   │
 │  │              │  │  ClickHouse  │  │               │   │
 │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
 │         │                 │                  │           │
 │         └─────────────────┼──────────────────┘           │
 │                           │                              │
 │                           ▼                              │
 │              ┌────────────────────────┐                  │
 │              │     ClickHouse DB      │                  │
 │              │                        │                  │
 │              │  Tables:               │                  │
 │              │  - spans (main data)   │                  │
 │              │  - security_alerts     │                  │
 │              │  - cost_metrics        │                  │
 │              │  - projects            │                  │
 │              │                        │                  │
 │              │  Optimized for:        │                  │
 │              │  100K+ queries/sec     │                  │
 │              │  Columnar storage      │                  │
 │              └────────────┬───────────┘                  │
 │                           │                              │
 └───────────────────────────┼──────────────────────────────┘
                             │
                    SQL Queries (< 500ms)
                             │
                             ▼
 ┌──────────────────────────────────────────────────────────┐
 │              🔌 API LAYER                                │
 │                                                          │
 │   ┌────────────────────────────────────────────┐         │
 │   │         FastAPI Server                     │         │
 │   │                                            │         │
 │   │   REST Endpoints:                          │         │
 │   │   GET  /api/v1/traces      → list traces   │         │
 │   │   GET  /api/v1/traces/:id  → trace detail  │         │
 │   │   GET  /api/v1/security    → alert list    │         │
 │   │   GET  /api/v1/analytics   → cost data     │         │
 │   │   POST /api/v1/projects    → create project│         │
 │   │                                            │         │
 │   │   WebSocket:                               │         │
 │   │   WS   /ws/traces          → live stream   │         │
 │   │        (pushes new spans in real-time)      │         │
 │   └──────────────────┬─────────────────────────┘         │
 │                      │                                   │
 └──────────────────────┼───────────────────────────────────┘
                        │
              REST/JSON + WebSocket/JSON
                        │
                        ▼
 ┌──────────────────────────────────────────────────────────┐
 │              🖼️  FRONTEND                                │
 │                                                          │
 │   ┌──────────────────────────────────────────────┐       │
 │   │        React Dashboard (Vite + Shadcn)       │       │
 │   │                                              │       │
 │   │   Pages:                                     │       │
 │   │   ┌────────────┐  ┌────────────────────┐     │       │
 │   │   │ Dashboard   │  │ Trace View         │     │       │
 │   │   │ (overview   │  │ (waterfall timeline│     │       │
 │   │   │  metrics)   │  │  + span detail)    │     │       │
 │   │   └────────────┘  └────────────────────┘     │       │
 │   │   ┌────────────┐  ┌────────────────────┐     │       │
 │   │   │ Security    │  │ Analytics          │     │       │
 │   │   │ (threat     │  │ (cost charts,      │     │       │
 │   │   │  alerts)    │  │  token usage)      │     │       │
 │   │   └────────────┘  └────────────────────┘     │       │
 │   │   ┌────────────┐                             │       │
 │   │   │ Settings    │                             │       │
 │   │   │ (API keys,  │                             │       │
 │   │   │  projects)  │                             │       │
 │   │   └────────────┘                             │       │
 │   └──────────────────────────────────────────────┘       │
 │                                                          │
 └──────────────────────────────────────────────────────────┘
```

---

## 2. FILE STRUCTURE

```
agentstack/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # Lint, test, build on push
│   │   ├── release.yml               # PyPI + npm publish workflow
│   │   └── docker-publish.yml        # Build and push Docker images
│   └── CODEOWNERS                    # Defines code review ownership rules
│
├── packages/
│   ├── sdk-python/
│   │   ├── src/
│   │   │   └── agentstack/
│   │   │       ├── __init__.py       # Public API: observe, init
│   │   │       ├── decorator.py      # @observe decorator implementation logic
│   │   │       ├── tracer.py         # OpenTelemetry tracer span creation
│   │   │       ├── context.py        # Async context propagation manager
│   │   │       ├── exporter.py       # Batch span export via HTTP
│   │   │       ├── sanitizer.py      # PII scrubbing before span export
│   │   │       ├── config.py         # SDK configuration and env vars
│   │   │       ├── models.py         # Pydantic span and trace models
│   │   │       ├── local_store.py    # SQLite/JSON local span storage
│   │   │       ├── frameworks/
│   │   │       │   ├── __init__.py   # Framework auto-detection entry point
│   │   │       │   ├── langraph.py   # LangGraph node/edge instrumentation
│   │   │       │   ├── crewai.py     # CrewAI task/agent instrumentation
│   │   │       │   └── autogen.py    # AutoGen message flow instrumentation
│   │   │       └── _internal/
│   │   │           ├── clock.py      # Monotonic clock for span timing
│   │   │           ├── buffer.py     # Ring buffer for span batching
│   │   │           └── transport.py  # HTTP/retry transport with backoff
│   │   ├── tests/
│   │   │   ├── test_decorator.py     # @observe decorator unit tests
│   │   │   ├── test_exporter.py      # Batch export and retry tests
│   │   │   ├── test_sanitizer.py     # PII detection and scrubbing tests
│   │   │   ├── test_context.py       # Async context propagation tests
│   │   │   └── conftest.py           # Shared fixtures and mock spans
│   │   ├── pyproject.toml            # Python package metadata and deps
│   │   ├── README.md                 # SDK quick-start and API docs
│   │   └── Makefile                  # Dev commands: test, lint, build
│   │
│   ├── collector/
│   │   ├── src/
│   │   │   └── collector/
│   │   │       ├── __init__.py       # Collector package initialization marker
│   │   │       ├── server.py         # FastAPI ingestion endpoint server
│   │   │       ├── redis_writer.py   # Redis Streams XADD span writer
│   │   │       ├── validators.py     # Incoming span payload validation
│   │   │       ├── auth.py           # API key authentication middleware
│   │   │       └── health.py         # Health check and readiness probes
│   │   ├── tests/
│   │   │   ├── test_server.py        # Ingestion endpoint integration tests
│   │   │   └── test_validators.py    # Payload validation edge case tests
│   │   ├── pyproject.toml            # Collector package metadata and deps
│   │   └── Dockerfile                # Collector container image definition
│   │
│   ├── workers/
│   │   ├── src/
│   │   │   └── workers/
│   │   │       ├── __init__.py       # Workers package initialization marker
│   │   │       ├── clickhouse_writer.py  # Batch insert spans to ClickHouse
│   │   │       ├── security_engine.py    # Prompt injection and PII scanner
│   │   │       ├── cost_calculator.py    # LLM token usage cost aggregator
│   │   │       ├── consumer.py       # Redis consumer group base class
│   │   │       └── rules/
│   │   │           ├── injection.py  # Prompt injection detection rules
│   │   │           ├── pii.py        # PII pattern matching definitions
│   │   │           └── anomaly.py    # Loop and timeout anomaly detection
│   │   ├── tests/
│   │   │   ├── test_security.py      # Security engine rule unit tests
│   │   │   └── test_writer.py        # ClickHouse batch write tests
│   │   ├── pyproject.toml            # Workers package metadata and deps
│   │   └── Dockerfile                # Workers container image definition
│   │
│   ├── api/
│   │   ├── src/
│   │   │   └── api/
│   │   │       ├── __init__.py       # API package initialization marker
│   │   │       ├── main.py           # FastAPI application factory and setup
│   │   │       ├── routes/
│   │   │       │   ├── traces.py     # GET traces with filtering/pagination
│   │   │       │   ├── spans.py      # GET individual span detail endpoint
│   │   │       │   ├── projects.py   # Project CRUD and API key management
│   │   │       │   ├── security.py   # Security alerts query endpoint
│   │   │       │   ├── analytics.py  # Cost and usage analytics endpoint
│   │   │       │   └── ws.py         # WebSocket live trace streaming
│   │   │       ├── dependencies.py   # Shared dependency injection providers
│   │   │       ├── middleware.py     # CORS, auth, rate limit middleware
│   │   │       ├── db.py            # ClickHouse connection pool manager
│   │   │       └── schemas.py       # Pydantic response/request schemas
│   │   ├── tests/
│   │   │   ├── test_traces.py        # Trace query endpoint integration tests
│   │   │   ├── test_ws.py            # WebSocket streaming connection tests
│   │   │   └── conftest.py           # Test client and DB fixtures
│   │   ├── pyproject.toml            # API package metadata and deps
│   │   ├── alembic/
│   │   │   ├── versions/             # Database migration version scripts
│   │   │   └── env.py                # Alembic migration environment config
│   │   └── Dockerfile                # API server container image definition
│   │
│   └── dashboard/
│       ├── src/
│       │   ├── main.tsx              # React app entry point and providers
│       │   ├── App.tsx               # Root layout with routing setup
│       │   ├── components/
│       │   │   ├── ui/               # Shadcn UI primitives (button, card...)
│       │   │   ├── TraceTimeline.tsx  # Waterfall timeline span visualization
│       │   │   ├── SpanDetail.tsx     # Individual span metadata inspector
│       │   │   ├── LiveFeed.tsx       # Real-time WebSocket trace feed
│       │   │   ├── SecurityPanel.tsx  # Threat alerts and PII warnings
│       │   │   ├── CostChart.tsx      # Token usage cost over time chart
│       │   │   ├── TraceSearch.tsx    # Full-text trace search with filters
│       │   │   └── ProjectSwitcher.tsx # Multi-project navigation selector
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx      # Overview metrics and recent traces
│       │   │   ├── TraceView.tsx      # Single trace detail deep dive
│       │   │   ├── Security.tsx       # Security alerts dashboard page
│       │   │   ├── Analytics.tsx      # Cost and usage analytics page
│       │   │   └── Settings.tsx       # Project config and API keys page
│       │   ├── hooks/
│       │   │   ├── useTraces.ts       # React Query trace data fetching
│       │   │   ├── useWebSocket.ts    # WebSocket connection state manager
│       │   │   └── useProject.ts      # Active project context provider
│       │   ├── lib/
│       │   │   ├── api.ts             # Axios API client configuration
│       │   │   ├── types.ts           # TypeScript interfaces for all models
│       │   │   └── utils.ts           # Formatting and helper utilities
│       │   └── styles/
│       │       └── globals.css        # Design tokens and base styles
│       ├── public/
│       │   └── favicon.svg            # AgentStack logo favicon asset
│       ├── index.html                 # HTML shell for Vite SPA
│       ├── vite.config.ts             # Vite build and dev config
│       ├── tsconfig.json              # TypeScript compiler configuration
│       ├── tailwind.config.ts         # Tailwind CSS theme configuration
│       ├── package.json               # Frontend dependencies and scripts
│       └── Dockerfile                 # Dashboard nginx container image
│
├── deploy/
│   ├── docker-compose.yml            # Full stack orchestration manifest
│   ├── docker-compose.dev.yml        # Dev overrides with hot reload
│   ├── .env.example                  # Required environment variable template
│   ├── nginx/
│   │   └── default.conf              # Reverse proxy routing configuration
│   ├── clickhouse/
│   │   └── init.sql                  # ClickHouse schema bootstrap script
│   └── redis/
│       └── redis.conf                # Redis Streams memory tuning config
│
├── docs/
│   ├── getting-started.md            # Five-minute AgentStack setup guide
│   ├── sdk-reference.md              # Complete SDK API reference docs
│   ├── self-hosting.md               # Docker Compose deployment instructions
│   └── security-model.md             # Threat model and data handling
│
├── scripts/
│   ├── dev-setup.sh                  # One-command local dev environment setup
│   ├── seed-data.py                  # Generate sample traces for testing
│   └── benchmark.py                  # SDK overhead latency benchmarking tool
│
├── ARCHITECTURE.md                   # This file: system design document
├── LICENSE                           # Apache 2.0 open source license
├── README.md                         # Project overview and quick start
├── Makefile                          # Top-level dev workflow commands
└── .gitignore                        # Git ignore patterns for project
```

---

## 3. DATA FLOW — Step by Step (What Happens When an Agent Runs)

### 3A. Happy Path (Everything Works)

```
STEP 1: Developer calls their agent
═══════════════════════════════════

    Developer's Code                    AgentStack SDK
    ┌───────────────┐                  ┌──────────────────────────┐
    │               │                  │                          │
    │  @observe     │ ──── calls ────► │  1. Generate trace_id    │
    │  def agent(): │                  │  2. Start timer          │
    │    result =   │                  │  3. Record: model name,  │
    │     llm(...)  │                  │     prompt, tokens,      │
    │    return x   │                  │     tool calls, memory   │
    │               │                  │  4. Stop timer           │
    │               │ ◄── returns ──── │  5. Create "span" object │
    │               │   (< 5ms added)  │  6. Add span to batch    │
    └───────────────┘                  └──────────────────────────┘
                                                   │
                                                   │ (async, non-blocking)
                                                   ▼

STEP 2: SDK batches and sends spans
════════════════════════════════════

    ┌─────────────────────────────────────────┐
    │  Batch Exporter (runs in background)    │
    │                                         │
    │  Collects spans until EITHER:           │
    │    • 64 spans accumulated    OR         │
    │    • 5 seconds have passed              │
    │                                         │
    │  Then sends ONE HTTP request:           │
    │    POST /v1/traces                      │
    │    Content: Protobuf + gzip             │
    │    Header:  X-API-Key: <project_key>    │
    └────────────────────┬────────────────────┘
                         │
                         ▼

STEP 3: Collector receives and validates
════════════════════════════════════════

    ┌─────────────────────────────────────────┐
    │  Trace Collector (FastAPI)              │
    │                                         │
    │  1. Check API key → valid?              │
    │  2. Validate span schema → correct?     │
    │  3. Check payload size → under limit?   │
    │  4. Write to Redis Stream               │
    │     Command: XADD spans.ingest *        │
    │     Format:  MsgPack (compact binary)   │
    │  5. Return HTTP 202 Accepted            │
    └────────────────────┬────────────────────┘
                         │
                         ▼

STEP 4: Three workers process in PARALLEL
═════════════════════════════════════════

    Redis Stream: spans.ingest
    ════════════════════════════
              │
              ├──────────────────────────────────────────────────────┐
              │                                                      │
              ▼                          ▼                           ▼
    ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
    │ Worker 1:        │   │ Worker 2:        │   │ Worker 3:        │
    │ ClickHouse       │   │ Security         │   │ Cost             │
    │ Writer           │   │ Engine           │   │ Calculator       │
    │                  │   │                  │   │                  │
    │ • Reads spans    │   │ • Reads spans    │   │ • Reads spans    │
    │ • Batches 1000   │   │ • Checks for:    │   │ • Extracts:      │
    │ • INSERT into    │   │   - "ignore prev │   │   - token_count  │
    │   ClickHouse     │   │     instructions"│   │   - model_name   │
    │ • ACKs Redis     │   │   - SSN, email,  │   │ • Looks up price │
    │                  │   │     credit cards  │   │   per token      │
    │                  │   │   - Same call     │   │ • INSERT into    │
    │                  │   │     repeated 50x  │   │   cost_metrics   │
    │                  │   │ • If threat found:│   │ • ACKs Redis     │
    │                  │   │   INSERT alert    │   │                  │
    │                  │   │ • ACKs Redis      │   │                  │
    └──────────────────┘   └──────────────────┘   └──────────────────┘
              │                      │                       │
              └──────────────────────┼───────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │   ClickHouse DB  │
                          │   (all data      │
                          │    lands here)   │
                          └────────┬─────────┘
                                   │
                                   ▼

STEP 5: Dashboard queries the API
═════════════════════════════════

    ┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
    │  React Dashboard │ ──GET──►│  FastAPI Server   │──SQL──► │  ClickHouse  │
    │                  │         │                   │         │              │
    │  User clicks     │         │  /api/v1/traces   │         │  Returns     │
    │  "View Traces"   │         │  ?project_id=abc  │         │  rows in     │
    │                  │ ◄─JSON──│  &limit=50        │◄─rows── │  < 500ms     │
    │  Renders         │         │                   │         │              │
    │  timeline UI     │         │                   │         │              │
    └──────────────────┘         └──────────────────┘         └──────────────┘


STEP 6: Live streaming (real-time view)
═══════════════════════════════════════

    ┌──────────────────┐  WebSocket  ┌──────────────────┐  XREAD  ┌─────────┐
    │  React Dashboard │ ◄══════════ │  FastAPI Server   │ ◄══════ │  Redis  │
    │                  │   JSON push │                   │  tail   │ Streams │
    │  Shows spans as  │             │  /ws/traces       │         │         │
    │  they happen     │             │  Pushes each new  │         │         │
    │  (live!)         │             │  span instantly   │         │         │
    └──────────────────┘             └──────────────────┘         └─────────┘
```

---

### 3B. Error / Failure Paths (When Things Break)

```
FAILURE 1: Collector is down
═════════════════════════════

    SDK Batch Exporter                      Collector
    ┌──────────────────┐                    ┌─────────┐
    │  POST /v1/traces │ ────── ✖ ────────► │  DOWN!  │
    │                  │      timeout       └─────────┘
    │  Retry #1 (1s)   │ ────── ✖ ──────►
    │  Retry #2 (2s)   │ ────── ✖ ──────►
    │  Retry #3 (4s)   │ ────── ✖ ──────►
    │                  │
    │  *** All retries failed ***           ┌──────────────────┐
    │  Write spans to ──────────────────►   │  Local SQLite    │
    │  local fallback                       │  (spans saved!)  │
    │                                       │                  │
    │  When collector comes back:           │  Auto-resend     │
    │  Read from local + send ──────────►   │  all buffered    │
    └──────────────────┘                    └──────────────────┘

    DEVELOPER IMPACT: Zero. Agent keeps running. No spans lost.


FAILURE 2: Redis is down
═════════════════════════

    Collector                               Redis
    ┌──────────────────┐                    ┌─────────┐
    │  XADD command    │ ────── ✖ ────────► │  DOWN!  │
    │                  │   connection error  └─────────┘
    │  Buffer spans    │
    │  in memory       │  (max 10,000 spans in bounded queue)
    │                  │
    │  Retry Redis     │
    │  every 5 seconds │
    │                  │
    │  If memory queue │
    │  is full:        │ ──── HTTP 429 ────► SDK backs off
    │                  │   (backpressure)
    └──────────────────┘

    DEVELOPER IMPACT: Spans delayed but not lost. Agent keeps running.


FAILURE 3: ClickHouse is down
═════════════════════════════

    ClickHouse Writer                       ClickHouse
    ┌──────────────────┐                    ┌─────────┐
    │  INSERT batch    │ ────── ✖ ────────► │  DOWN!  │
    │                  │   connection error  └─────────┘
    │  DON'T ACK Redis │
    │  (spans stay in  │
    │   Redis stream!) │
    │                  │
    │  Redis holds up  │──► Redis has room for ~1 million spans
    │  to 1M spans     │    That's ~2.7 hours of buffer at 100k/s
    │                  │
    │  Retry ClickHouse│
    │  with backoff    │
    └──────────────────┘

    DEVELOPER IMPACT: Dashboard shows stale data. Collection continues.
    RECOVERY: Writer replays all buffered spans when ClickHouse returns.
```

---

## 4. COMPONENT TABLE

| # | Component | Technology | What It Does | If It Dies... | How It Recovers |
|---|-----------|-----------|-------------|---------------|-----------------|
| 1 | **SDK** | Python 3.12 + OpenTelemetry | Instruments agent code with `@observe`, creates spans, batches them | No telemetry collected. **Agent still works normally** — zero impact on user's code | Writes spans to local SQLite fallback. Auto-reconnects with exponential backoff |
| 2 | **Trace Collector** | FastAPI + Uvicorn | Receives span batches via HTTP, validates, writes to Redis | SDK buffers spans locally. No new data enters the pipeline | Stateless service — Docker auto-restarts it. SDK retries queued spans |
| 3 | **Redis Streams** | Redis 7.x | Event bus between Collector and all Workers. Durable message queue | All 3 workers stall. Collector buffers in-memory (bounded 10K) | AOF persistence recovers data. Consumers resume from last acknowledged position |
| 4 | **ClickHouse Writer** | Python consumer process | Reads spans from Redis, batch-inserts into ClickHouse | Spans accumulate in Redis (safe — Redis holds ~1M). Dashboard shows stale data | Withholds Redis ACK so no data lost. Reprocesses from last checkpoint on restart |
| 5 | **Security Engine** | Python consumer + regex patterns | Scans every span for prompt injection, PII leaks, infinite loops | No security alerts generated. Traces still stored normally | Independent consumer — restart picks up from last ACK. No data lost |
| 6 | **Cost Calculator** | Python consumer process | Extracts token counts from spans, applies model pricing, stores cost | No cost analytics. Traces and security unaffected | Independent consumer — restart picks up from last ACK. No data lost |
| 7 | **ClickHouse** | ClickHouse 24.x (columnar DB) | Stores ALL data: spans, alerts, costs. Powers all dashboard queries | All dashboard queries fail. Shows stale/no data. **Data pipeline keeps buffering in Redis** | WAL recovery. Workers replay buffered spans. Can add replicas for HA |
| 8 | **FastAPI Server** | FastAPI + Pydantic v2 | REST API + WebSocket endpoint for the dashboard to query data | Dashboard cannot load any data. Data collection pipeline unaffected | Stateless — Docker auto-restarts. Can run multiple replicas behind Nginx |
| 9 | **React Dashboard** | React 19 + Vite + Shadcn UI | Visual interface: trace timeline, security alerts, cost charts | Users can't view data. Everything else keeps working | Static files served by Nginx. No state to lose. Refresh reconnects |
| 10 | **Nginx** | Nginx 1.25 | Reverse proxy, TLS termination, serves dashboard static files | External access blocked. Internal services still function fine | Docker auto-restarts. Config reload without downtime |

---

## 5. BUILD ORDER (What to Build and When)

```
══════════════════════════════════════════════════════════════════════════
                    PHASE 1: MVP (Local-Only Mode)
                    Estimated: ~40 hours | 12 days
                    Goal: Working SDK that saves traces locally
══════════════════════════════════════════════════════════════════════════

  Week 1                          Week 2
  ├─────────────────────────────┤ ├─────────────────────────┤

  ┌─────────────────────┐
  │ 1. SDK Core          │ 12 hrs
  │ @observe decorator   │
  │ Span model (Pydantic)│
  │ Context propagation  │────┐
  └─────────────────────┘    │
                              │
  ┌─────────────────────┐    │   ┌─────────────────────┐
  │ 2. PII Sanitizer    │ 4h │   │ 4. CLI Trace Viewer │ 8 hrs
  │ Basic regex patterns│    ├──►│ Rich terminal UI    │
  └─────────────────────┘    │   │ View spans locally  │
                              │   └──────────┬──────────┘
  ┌─────────────────────┐    │              │
  │ 3. Local Storage     │ 8h │              │
  │ JSON file export     │────┘              │
  │ SQLite local store   │                   │
  └─────────────────────┘                   │
                                             │
  ┌─────────────────────┐                   │
  │ 5. LangGraph Hooks  │ 4 hrs             │
  │ Auto-instrument     │                   │
  │ LangGraph nodes     │                   │
  └─────────────────────┘                   │
                                             ▼
                              ┌─────────────────────┐
                              │ 6. Tests + CI       │ 4 hrs
                              │ pytest + GitHub     │
                              │ Actions pipeline    │
                              └─────────────────────┘
                                        │
                                        ▼
                              ✅ PHASE 1 DONE
                              Developer can: pip install agentstack
                              Add @observe to agent
                              See traces in terminal


══════════════════════════════════════════════════════════════════════════
                    PHASE 2: Server + Web Dashboard
                    Estimated: ~70 hours | 18 days
                    Goal: Web UI to view traces
══════════════════════════════════════════════════════════════════════════

  Week 3                    Week 4                    Week 5
  ├────────────────────────┤ ├───────────────────────┤ ├───────────────┤

  ┌─────────────────────┐
  │ 7. FastAPI Server   │ 12 hrs
  │ REST endpoints      │
  │ Project management  │────┐
  └─────────────────────┘    │
                              │
  ┌─────────────────────┐    │   ┌─────────────────────┐
  │ 8. SQLite Backend   │ 8h │   │ 10. React Dashboard │ 12 hrs
  │ Server-side storage │    ├──►│ Vite + Shadcn setup  │
  └─────────────────────┘    │   │ Routing + Layout     │────┐
                              │   └─────────────────────┘    │
  ┌─────────────────────┐    │                               │
  │ 9. SDK HTTP Export  │ 4h │                               │
  │ Send to collector   │────┘                               │
  └─────────────────────┘                                    │
                                                              │
                              ┌─────────────────────┐        │
                              │ 11. Trace Timeline  │ 12 hrs │
                              │ Waterfall view      │ ◄──────┘
                              │ Span detail panel   │────┐
                              └─────────────────────┘    │
                                                         │
                              ┌─────────────────────┐    │
                              │ 12. WebSocket Live  │ 8h │
                              │ Real-time streaming │ ◄──┘
                              └─────────────────────┘────┐
                                                         │
                              ┌─────────────────────┐    │
                              │ 13. Auth + API Keys │ 8h │
                              │ Project scoping     │    │
                              └─────────────────────┘    │
                                                         │
                                             ┌───────────┘
                                             ▼
                              ┌─────────────────────┐
                              │ 14. Integration     │ 6 hrs
                              │ Tests               │
                              └─────────────────────┘
                                        │
                                        ▼
                              ✅ PHASE 2 DONE
                              Developer can: open browser
                              See trace timelines
                              Click into span details
                              Watch agents live


══════════════════════════════════════════════════════════════════════════
                    PHASE 3: Production Scale
                    Estimated: ~80 hours | 20 days
                    Goal: Handle 100K spans/sec, security, Docker deploy
══════════════════════════════════════════════════════════════════════════

  Week 6                    Week 7                    Week 8
  ├────────────────────────┤ ├───────────────────────┤ ├───────────────┤

  ┌─────────────────────┐
  │ 15. Redis Streams   │ 8 hrs
  │ Event bus setup     │
  │ Consumer groups     │────┐
  └─────────────────────┘    │
                              │
  ┌─────────────────────┐    │   ┌─────────────────────┐
  │ 16. Collector Svc   │ 8h │   │ 18. ClickHouse      │ 8 hrs
  │ Dedicated ingest    │    │   │ Writer Worker        │
  │ endpoint            │    │   │ Batch inserts        │
  └─────────────────────┘    │   └─────────────────────┘────┐
                              │                              │
  ┌─────────────────────┐    │                              │
  │ 17. ClickHouse      │ 8h │                              │
  │ Schema + Migration  │────┘                              │
  └─────────────────────┘                                   │
                                                             │
                              ┌─────────────────────┐       │
                              │ 19. Security Engine │ 12 hrs│
                              │ Prompt injection    │ ◄─────┘
                              │ PII detection       │────┐
                              │ Loop detection      │    │
                              └─────────────────────┘    │
                                                         │
                              ┌─────────────────────┐    │
                              │ 20. Cost Calculator │ 8h │
                              │ Token pricing       │ ◄──┘
                              │ Usage aggregation   │────┐
                              └─────────────────────┘    │
                                                         │
                              ┌─────────────────────┐    │
                              │ 21. Dashboard Pages │ 8h │
                              │ Security alerts UI  │ ◄──┘
                              │ Cost analytics UI   │────┐
                              └─────────────────────┘    │
                                                         │
                                             ┌───────────┘
                                             ▼
                              ┌─────────────────────┐
                              │ 22. Docker Compose  │ 8 hrs
                              │ Full stack deploy   │
                              │ Nginx + TLS         │
                              └─────────────────────┘
                                        │
                              ┌─────────────────────┐
                              │ 23. Load Testing    │ 8 hrs
                              │ k6: 100K spans/sec  │
                              │ Dashboard < 500ms   │
                              └─────────────────────┘
                                        │
                              ┌─────────────────────┐
                              │ 24. Documentation   │ 4 hrs
                              │ Getting started     │
                              │ Self-hosting guide  │
                              └─────────────────────┘
                                        │
                                        ▼
                              ✅ PHASE 3 DONE
                              System handles 100K spans/sec
                              Security scanning active
                              One-command Docker deploy
                              Production ready!
```

---

## TOTAL EFFORT SUMMARY

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Phase 1 (MVP)         ████████░░░░░░░░░░░░   ~40 hrs  | 12 days │
│   Phase 2 (Dashboard)   ██████████████░░░░░░░   ~70 hrs  | 18 days │
│   Phase 3 (Production)  ████████████████░░░░░   ~80 hrs  | 20 days │
│   ───────────────────────────────────────────────────────────────  │
│   TOTAL                 ████████████████████░   ~190 hrs | 50 days │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## QUICK REFERENCE: What Each Span Contains

```
┌─────────────────────────────────────────────────────────┐
│                    SPAN OBJECT                          │
├─────────────────────────────────────────────────────────┤
│  trace_id:      "abc-123-def-456"   (groups all spans) │
│  span_id:       "span-789"          (this specific step)│
│  parent_id:     "span-456"          (who called me)    │
│  name:          "llm.chat"          (what happened)    │
│  start_time:    1707801234.567      (when it started)  │
│  end_time:      1707801235.123      (when it ended)    │
│  duration_ms:   556                 (how long)         │
│  status:        "OK" | "ERROR"      (did it work?)     │
│                                                         │
│  attributes:                                            │
│    llm.model:       "gpt-4"                             │
│    llm.tokens.in:   150                                 │
│    llm.tokens.out:  89                                  │
│    llm.cost:        0.0073                              │
│    tool.name:       "search_database"                   │
│    tool.input:      "{query: 'user data'}"              │
│    tool.output:     "{results: [...]}"                  │
│    memory.key:      "conversation_history"              │
│    memory.action:   "read"                              │
│    error.message:   "Rate limit exceeded"  (if error)   │
│    security.flags:  ["pii_detected"]       (if threat)  │
│                                                         │
│  project_id:    "proj-abc"          (which project)    │
│  api_key_hash:  "sha256:..."        (who sent it)      │
└─────────────────────────────────────────────────────────┘
```

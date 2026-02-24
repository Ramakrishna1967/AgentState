# AgentStack — Security Audit Report

> **Purpose:** Identify every security weakness in the current codebase so they can be fixed before production deployment.
> **Date:** 2026-02-18
> **Scope:** All 5 packages + deploy layer
> **Methodology:** Manual code review against OWASP Top 10, CWE, and cloud-native security best practices.

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 **CRITICAL** | Exploitable now, can cause data breach or full system compromise |
| 🟠 **HIGH** | Serious weakness, exploitable with moderate effort |
| 🟡 **MEDIUM** | Weakness that reduces security posture |
| 🔵 **LOW** | Minor issue, defense-in-depth recommendation |
| ⚪ **INFO** | Best-practice suggestion |

---

## Summary: 22 Weaknesses Found

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 4 |
| 🟠 HIGH | 6 |
| 🟡 MEDIUM | 6 |
| 🔵 LOW | 4 |
| ⚪ INFO | 2 |

---

## 🔴 CRITICAL Vulnerabilities

### CRIT-1: Default JWT Secret Key in Production

**File:** `api/src/api/config.py` (line 13)
```python
JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
```

**Problem:** If the deployer forgets to set `SECRET_KEY` in their `.env` file, the JWT signing key is a publicly known string. Anyone can forge valid JWT tokens and access all API endpoints as any user.

**Impact:** Complete authentication bypass. Full read/write access to all projects, traces, spans, and user data.

**Fix:**
```python
import os, sys

JWT_SECRET_KEY: str = os.getenv("SECRET_KEY", "")

# Fail fast if no secret key in production
if not JWT_SECRET_KEY and os.getenv("ENVIRONMENT") != "development":
    print("FATAL: SECRET_KEY environment variable not set!", file=sys.stderr)
    sys.exit(1)
```

---

### CRIT-2: No Redis Authentication

**File:** `deploy/docker-compose.yml`, `deploy/redis/redis.conf`

**Problem:** Redis has no password set. Anyone who can reach port 6379 can:
- Read all spans and alerts from streams
- Write fake spans or alerts
- Flush all data with `FLUSHALL`
- Execute arbitrary Lua scripts via `EVAL`

**Impact:** Data tampering, data destruction, potential Remote Code Execution via Redis modules.

**Fix:**
```conf
# redis.conf
requirepass your-strong-redis-password-here
```
```yaml
# docker-compose.yml - all services that use Redis
environment:
  - REDIS_URL=redis://:your-strong-redis-password-here@redis:6379/0
```

---

### CRIT-3: Empty ClickHouse Password

**File:** `deploy/docker-compose.yml` (line 36)
```yaml
CLICKHOUSE_PASSWORD: ""
```

**Problem:** ClickHouse has no password. Anyone who can reach port 8123 or 9000 can:
- Read all span data, security alerts, and cost metrics
- Drop tables, delete data
- Execute system queries

**Impact:** Full database access — read all telemetry and PII that passed through the system.

**Fix:**
```yaml
environment:
  CLICKHOUSE_PASSWORD: ${CLICKHOUSE_PASSWORD:-your-strong-password}
```

---

### CRIT-4: CORS Allows All Origins on Collector

**File:** `collector/src/collector/server.py` (lines 63-69)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # ← Dangerous with allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Problem:** `allow_origins=["*"]` combined with `allow_credentials=True` means any website can make authenticated cross-origin requests to the Collector. A malicious website could inject spans into any project if the user has an API key stored.

**Note:** Per the CORS spec, browsers should block `credentials: true` with `origin: *`, but some older browsers and non-browser clients don't enforce this.

**Fix:**
```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)
```

---

## 🟠 HIGH Vulnerabilities

### HIGH-1: API Key Verification via Full Table Scan + Hash Compare

**File:** `collector/src/collector/auth.py` (lines 30-35)
```python
async with db.execute("SELECT id, api_key_hash FROM projects") as cursor:
    rows = await cursor.fetchall()

for row in rows:
    if pwd_context.verify(x_api_key, row["api_key_hash"]):
        return row["id"]
```

**Problem (Timing Attack + DoS):**
1. **Timing attack:** `pbkdf2_sha256.verify()` is deliberately slow (~100ms). With N projects, each request takes up to N × 100ms. An attacker can measure timing to determine how many projects exist.
2. **Denial of Service:** Send rapid requests with invalid API keys. Each request triggers N hash comparisons. With 100 projects, each request costs ~10 seconds of CPU. A few concurrent requests can saturate the Collector.

**Fix:** Use a fast hash (SHA-256) of the API key as a lookup index, then verify the full hash only once:
```python
import hashlib

# On key creation: store both fast_hash and slow_hash
fast_hash = hashlib.sha256(api_key.encode()).hexdigest()

# On verification: O(1) lookup by fast_hash, then verify
async with db.execute(
    "SELECT id, api_key_hash FROM projects WHERE fast_key_hash = ?",
    (hashlib.sha256(x_api_key.encode()).hexdigest(),)
) as cursor:
    row = await cursor.fetchone()
if row and pwd_context.verify(x_api_key, row["api_key_hash"]):
    return row["id"]
```

---

### HIGH-2: No Rate Limiting on Auth Endpoints

**File:** `api/src/api/routes/auth.py`

**Problem:** Login and registration endpoints have no rate limiting. An attacker can:
- **Brute-force passwords** — try millions of combinations against `/auth/login`
- **Credential stuffing** — use leaked email/password lists
- **Registration spam** — create thousands of accounts

**Fix:**
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/login")
@limiter.limit("5/minute")  # 5 login attempts per minute per IP
async def login(request: Request, ...):
    ...

@router.post("/auth/register")
@limiter.limit("3/hour")  # 3 registrations per hour per IP
async def register(request: Request, ...):
    ...
```

---

### HIGH-3: No Input Size Validation on WebSocket Messages

**File:** `api/src/api/routes/ws.py` (line 124)
```python
data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
message = json.loads(data)
```

**Problem:** No check on the size of incoming WebSocket messages. An attacker can send a 100MB JSON payload causing:
- Memory exhaustion (OOM kill)
- `json.loads()` CPU spike on large payloads
- Denial of service for all WebSocket clients

**Fix:**
```python
data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
if len(data) > 4096:  # 4KB max for control messages
    await websocket.close(code=1009, reason="Message too large")
    return
message = json.loads(data)
```

---

### HIGH-4: Collector Payload Size Check is Bypassable

**File:** `collector/src/collector/server.py` (lines 90-92)
```python
content_length = request.headers.get("content-length")
if content_length:
    check_payload_size(int(content_length))
```

**Problem:** The `Content-Length` header is **optional** and **client-controlled**. An attacker can:
1. Omit the `Content-Length` header entirely → bypass the check
2. Send `Content-Length: 100` but actually send a 100MB body (HTTP request smuggling)
3. Use chunked `Transfer-Encoding` which has no `Content-Length`

**Fix:** Read the actual body and check its size:
```python
body_bytes = await request.body()
if len(body_bytes) > 5 * 1024 * 1024:  # 5MB
    raise HTTPException(status_code=413, detail="Payload too large")
body = json.loads(body_bytes)
```

---

### HIGH-5: No Project-Level Access Control

**File:** `api/src/api/routes/traces.py`, `projects.py`, `security.py`

**Problem:** Any authenticated user can see ALL projects, ALL traces, ALL alerts across ALL projects. There is no concept of project ownership. User A can see User B's data.

```python
# traces.py — returns traces for ANY project_id the user passes
if project_id:
    where_clauses.append("project_id = ?")

# projects.py — returns ALL projects, not just the user's
"SELECT id, name, created_at, updated_at FROM projects ORDER BY created_at DESC"
```

**Impact:** Any registered user can enumerate and read all projects and their telemetry data.

**Fix:** Add a `user_projects` join table and enforce ownership:
```sql
CREATE TABLE user_projects (
    user_id TEXT REFERENCES users(id),
    project_id TEXT REFERENCES projects(id),
    role TEXT DEFAULT 'owner',
    PRIMARY KEY (user_id, project_id)
);
```

---

### HIGH-6: Bare Exception Swallows Errors in Collector Auth

**File:** `collector/src/collector/server.py` → `consumer.py` (line 49-55)
```python
except Exception as e:
    if "BUSYGROUP" in str(e):
        logger.info(...)
    else:
        logger.error(...)
        pass  # ← silently continues even on critical errors
```

**Problem:** If the Redis consumer group creation fails for any reason other than "already exists," the worker silently continues without a working consumer group. This means it may process no messages or process messages incorrectly.

**Fix:**
```python
except Exception as e:
    if "BUSYGROUP" in str(e):
        logger.info(f"Consumer group {self.group_name} already exists")
    else:
        logger.error(f"Fatal error creating consumer group: {e}")
        raise  # Fail fast — don't run a broken worker
```

---

## 🟡 MEDIUM Vulnerabilities

### MED-1: No Nginx Security Headers

**File:** `deploy/nginx/default.conf`

**Missing headers:**
```nginx
# Add to server block:
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

---

### MED-2: No Password Complexity Validation

**File:** `api/src/api/schemas.py` (line 131)
```python
password: str = Field(..., min_length=8)
```

**Problem:** Only checks minimum length. Allows passwords like `"aaaaaaaa"` or `"12345678"`.

**Fix:**
```python
from pydantic import field_validator
import re

@field_validator("password")
@classmethod
def validate_password(cls, v):
    if len(v) < 12:
        raise ValueError("Password must be at least 12 characters")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain uppercase letter")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain lowercase letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain a digit")
    return v
```

---

### MED-3: JWT Tokens Have No Revocation Mechanism

**File:** `api/src/api/dependencies.py`

**Problem:** Once a JWT is issued, it's valid for 7 days. If a user's account is compromised or deactivated, their token still works until it naturally expires. There's no way to revoke a token.

**Fix:** Implement a token blacklist (Redis set) or use short-lived tokens (15 min) with refresh tokens.

---

### MED-4: SQLite Shared Between Containers via Volume

**File:** `deploy/docker-compose.yml` (lines 62, 83)
```yaml
volumes:
  - api_data:/data  # Both API and Collector mount this
```

**Problem:** SQLite does not support concurrent writes from multiple processes reliably, even with WAL mode. Under high load, the API and Collector will conflict on writes, causing `SQLITE_BUSY` errors and potential data corruption.

**Fix:** Use PostgreSQL for shared metadata instead of SQLite, or make the Collector verify API keys via an HTTP call to the API instead of direct DB access.

---

### MED-5: Error Messages Leak Internal Information

**File:** Multiple files

```python
# db_clickhouse.py
logger.error(f"ClickHouse health check failed: {e}")

# ws.py
logger.error(f"WebSocket error: {e}")

# consumer.py
logger.error(f"Error in consumer loop: {e}")
```

**Problem:** Stack traces and error details are logged with `{e}` which may include internal paths, connection strings, query text, or table names. If logs are exposed, this gives attackers reconnaissance information.

**Fix:** Log full details at `DEBUG` level only. At `ERROR` level, log generic messages:
```python
logger.error("ClickHouse health check failed", exc_info=True)  # only in debug
```

---

### MED-6: No HTTPS / TLS Configured

**File:** `deploy/nginx/default.conf`
```nginx
listen 80;  # HTTP only, no TLS
```

**Problem:** All traffic (JWT tokens, API keys, user passwords, span data) travels in plaintext. Anyone on the same network can sniff credentials.

**Fix:** Add TLS with Let's Encrypt:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/yourdomain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain/privkey.pem;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

---

## 🔵 LOW Vulnerabilities

### LOW-1: No Account Lockout After Failed Logins

**File:** `api/src/api/routes/auth.py`

**Problem:** No tracking of failed login attempts. Combined with no rate limiting (HIGH-2), allows unlimited brute-force attempts.

**Fix:** Track failed attempts per email in Redis with expiry. Lock account after 5 failures for 15 minutes.

---

### LOW-2: API Key Shown in HTTP Response Body

**File:** `api/src/api/routes/projects.py` (line 64)
```python
return ProjectCreateResponse(project=project, api_key=api_key)
```

**Problem:** The API key is returned in JSON. If the response is logged by a proxy, load balancer, or monitoring tool, the key is captured in plaintext in logs.

**Fix:** Return the key via a secure channel (e.g., only show in Dashboard UI with clipboard copy, never in API response body after initial creation).

---

### LOW-3: `datetime.utcnow()` is Deprecated

**File:** `api/src/api/routes/auth.py`, `projects.py`
```python
expire = datetime.utcnow() + timedelta(...)
```

**Problem:** `datetime.utcnow()` is deprecated in Python 3.12+. It returns a naive datetime (no timezone info), which can cause issues.

**Fix:** Use `datetime.now(datetime.UTC)` instead.

---

### LOW-4: Docker Containers Run as Root

**File:** All Dockerfiles

**Problem:** No `USER` directive in any Dockerfile. Containers run as root by default. If a container is compromised, the attacker has root access inside it.

**Fix:**
```dockerfile
RUN adduser --disabled-password --gecos '' appuser
USER appuser
```

---

## ⚪ INFO — Best Practice Suggestions

### INFO-1: No Request ID / Correlation ID

Add a unique request ID to every API request for traceability:
```python
@app.middleware("http")
async def add_request_id(request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response
```

---

### INFO-2: No Dependency Version Pinning

**File:** `dashboard/package.json`
```json
"axios": "^1.7.0"  # ^ allows minor version bumps
```

Use exact versions or lockfiles to prevent supply-chain attacks via compromised npm packages.

---

## Remediation Priority

Fix these in this order:

| Priority | ID | Effort | Impact |
|----------|----|--------|--------|
| **Fix NOW** | CRIT-1 | 5 min | Full auth bypass |
| **Fix NOW** | CRIT-2 | 10 min | Full data access |
| **Fix NOW** | CRIT-3 | 10 min | Full data access |
| **Fix NOW** | CRIT-4 | 5 min | Cross-origin attacks |
| **Fix this week** | HIGH-1 | 30 min | DoS via auth |
| **Fix this week** | HIGH-2 | 20 min | Brute force |
| **Fix this week** | HIGH-4 | 10 min | Payload bypass |
| **Fix this week** | HIGH-5 | 2 hours | Data isolation |
| **Fix this week** | MED-6 | 30 min | Traffic sniffing |
| **Fix before launch** | HIGH-3 | 15 min | WebSocket DoS |
| **Fix before launch** | MED-1 | 10 min | Browser protections |
| **Fix before launch** | MED-2 | 10 min | Weak passwords |
| **Fix before launch** | MED-3 | 1 hour | Token revocation |
| **Fix before launch** | MED-4 | 2 hours | DB corruption |

---

*This audit was performed against the AgentStack codebase as of 2026-02-18. All findings are based on static code analysis. A runtime penetration test would likely uncover additional issues.*

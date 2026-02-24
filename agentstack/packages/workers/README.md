# AgentStack Workers

Background worker services for trace processing, security analysis, and cost calculation.

## Workers

- **ClickHouseWriter** — Batches spans from Redis Stream and writes to ClickHouse.
- **SecurityEngine** — Analyzes spans for prompt injection, PII leaks, and anomalies.
- **CostCalculator** — Extracts token usage from spans and calculates cost metrics.

## Running

```bash
# Individual worker
python -m workers.clickhouse_writer
python -m workers.security_engine
python -m workers.cost_calculator
```

## Environment Variables

- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379/0`)
- `CLICKHOUSE_HOST` — ClickHouse host (default: `localhost`)

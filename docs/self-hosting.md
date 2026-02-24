# Self-Hosting Guide

AgentStack is designed to be easily self-hosted using Docker Compose.

## Architecture

- **API**: FastAPI backend for querying data and managing projects.
- **Collector**: High-throughput ingestion endpoint (OpenTelemetry compatible).
- **Workers**: Async processes for writing to DB, security analysis, and cost calculation.
- **Redis**: Event bus and buffering layer.
- **ClickHouse**: OLAP database for high-performance analytics.
- **Dashboard**: React-based frontend.

## Deployment Steps

1. **Configure Environment**
   Copy `deploy/.env.example` to `deploy/.env` and update secrets.
   ```bash
   cp deploy/.env.example deploy/.env
   ```

2. **Run Docker Compose**
   ```bash
   cd deploy
   docker-compose up -d
   ```

   This will start all services including the Nginx gateway.

3. **Verify Installation**
   - Dashboard: `http://localhost`
   - API: `http://localhost/api/docs`
   - Collector: `http://localhost/v1/traces`

## Scaling

- **Workers**: You can scale workers horizontally.
  ```bash
  docker-compose up -d --scale worker-security=3
  ```
- **ClickHouse**: Use a ClickHouse cluster for large datasets.

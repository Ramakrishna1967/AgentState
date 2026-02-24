# Getting Started with AgentStack

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Docker & Docker Compose**

## Quickstart (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ramakrishna1967/AgentStack.git
   cd AgentStack
   ```

2. **Start Infrastructure (Redis & ClickHouse)**
   ```bash
   docker-compose -f deploy/docker-compose.yml up -d redis clickhouse
   ```

3. **Install Dependencies**
   ```bash
   # API & Workers
   pip install -e packages/api
   pip install -e packages/collector
   pip install -e packages/workers

   # Dashboard
   cd packages/dashboard
   npm install
   ```

4. **Run Services**
   - **API**: `uvicorn api.main:app --reload --port 8000`
   - **Collector**: `uvicorn collector.server:app --reload --port 4318`
   - **Workers**: `python -m workers.security_engine` (and others)
   - **Dashboard**: `npm run dev`

5. **Visit Dashboard**
   Open [http://localhost:5173](http://localhost:5173) to view traces.

## Seed Data

To populate the system with fake traffic:
```bash
python scripts/seed_data.py
```

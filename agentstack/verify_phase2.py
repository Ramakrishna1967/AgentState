import asyncio
import sys
import os
import json
from pathlib import Path

# Add paths
root_dir = Path(os.getcwd())
sys.path.append(str(root_dir / "packages/api/src"))
sys.path.append(str(root_dir / "packages/collector/src"))

from api.main import create_app as create_api_app
from api.db import get_db, Database
from collector.server import app as collector_app
from httpx import AsyncClient, ASGITransport

async def run_verification():
    print("🚀 Starting Phase 2 Verification...")
    
    # Initialize DB (shared between API and Collector)
    # We use the actual file db to ensure persistence across apps if they were separate, 
    # but here they share the same sqlite file access.
    # We'll use a test db file to avoid messing with real data if any.
    import api.db
    api.db.DB_PATH = "verify_phase2.db"
    if os.path.exists(api.db.DB_PATH):
        os.remove(api.db.DB_PATH)
        
    db = Database(api.db.DB_PATH)
    await db.init_db()
    # Patch the global db
    api.db._db = db
    
    print("✅ Database initialized")

    # API Client
    api_app = create_api_app()
    async with AsyncClient(transport=ASGITransport(app=api_app), base_url="http://api") as api_client:
        
        # 1. Health Check
        resp = await api_client.get("/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print("✅ API Health Check passed")

        # 2. Register & Login
        user_data = {"email": "verifier@test.com", "password": "password123"}
        await api_client.post("/api/v1/auth/register", json=user_data)
        resp = await api_client.post("/api/v1/auth/login", json=user_data)
        token = resp.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        print("✅ Auth (Register + Login) passed")

        # 3. Create Project
        resp = await api_client.post("/api/v1/projects", json={"name": "VerifyProject"}, headers=auth_headers)
        project_data = resp.json()
        api_key = project_data["api_key"]
        project_id = project_data["project"]["id"]
        print(f"✅ Project created: {project_id} (Key: {api_key[:10]}...)")

    # Collector Client
    # Collector needs to import api.db which we already patched
    async with AsyncClient(transport=ASGITransport(app=collector_app), base_url="http://collector") as collector_client:
        
        # 4. Ingest Trace
        trace_id = "trace-verify-01"
        payload = {
            "spans": [
                {
                    "span_id": "span-01",
                    "trace_id": trace_id,
                    "name": "verification-span",
                    "start_time": 1700000000000000,
                    "end_time": 1700000000100000,
                    "duration_ms": 100,
                    "status": "OK",
                    "attributes": {"env": "test"},
                    "events": []
                }
            ]
        }
        resp = await collector_client.post(
            "/v1/traces", 
            json=payload, 
            headers={"X-API-Key": api_key, "Content-Type": "application/json"}
        )
        assert resp.status_code == 202, f"Ingestion failed: {resp.text}"
        print("✅ Trace ingestion accepted (202 Accepted)")

    # 5. Verify Trace via API
    async with AsyncClient(transport=ASGITransport(app=api_app), base_url="http://api") as api_client:
        resp = await api_client.get("/api/v1/traces", headers=auth_headers)
        data = resp.json()
        assert data["total"] == 1, f"Expected 1 trace, got {data['total']}"
        assert data["items"][0]["trace_id"] == trace_id, "Trace ID mismatch"
        print("✅ Trace verification via API passed")
        
        # Verify Trace Detail
        resp = await api_client.get(f"/api/v1/traces/{trace_id}", headers=auth_headers)
        detail = resp.json()
        assert len(detail["spans"]) == 1, "Expected 1 span in detail"
        print("✅ Trace Detail verification passed")

    print("\n🎉 ALL CHECKS PASSED SUCCESSFULLY!")
    
    # Cleanup
    if os.path.exists(api.db.DB_PATH):
        os.remove(api.db.DB_PATH)

if __name__ == "__main__":
    asyncio.run(run_verification())

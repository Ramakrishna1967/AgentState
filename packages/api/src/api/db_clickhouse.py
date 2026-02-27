# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

import logging
from typing import AsyncGenerator
from asynch import connect
from asynch.cursors import DictCursor

import os

CLICKHOUSE_HOST = os.getenv("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_PORT = os.getenv("CLICKHOUSE_NATIVE_PORT", "9000") # 9000 is native, 8123 is HTTP. asynch uses native?
# asynch documentation says it uses native TCP protocol, default port 9000.
CLICKHOUSE_DB = os.getenv("CLICKHOUSE_DB", "default")
CLICKHOUSE_USER = os.getenv("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.getenv("CLICKHOUSE_PASSWORD", "")

CLICKHOUSE_URL = f"clickhouse://{CLICKHOUSE_USER}:{CLICKHOUSE_PASSWORD}@{CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}/{CLICKHOUSE_DB}"

logger = logging.getLogger("agentstack.api.clickhouse")

class ClickHouseClient:
    """Async ClickHouse client wrapper."""
    
    def __init__(self, dsn: str = CLICKHOUSE_URL):
        self.dsn = dsn
        self.pool = None # asynch doesn't have a built-in pool in the same way, but we can manage connections

    async def execute(self, query: str, args: dict | list | tuple = None) -> list[dict]:
        """Execute a query and return dict results."""
        async with connect(dsn=self.dsn) as conn:
            async with conn.cursor(cursor_factory=DictCursor) as cursor:
                await cursor.execute(query, args)
                return await cursor.fetchall()

    async def check_health(self) -> bool:
        """Check connection health."""
        try:
            res = await self.execute("SELECT 1")
            return res == [{'1': 1}]
        except Exception as e:
            logger.error(f"ClickHouse health check failed: {e}")
            return False

# Global instance
ch_client = ClickHouseClient()

async def get_clickhouse() -> AsyncGenerator[ClickHouseClient, None]:
    """Dependency for FastAPI."""
    yield ch_client

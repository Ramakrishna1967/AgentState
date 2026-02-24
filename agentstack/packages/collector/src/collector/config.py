# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""Collector configuration."""

import os

class CollectorSettings:
    # Use same DB as API for now
    DATABASE_URL: str = os.getenv("DATABASE_URL", "agentstack.db")
    
settings = CollectorSettings()

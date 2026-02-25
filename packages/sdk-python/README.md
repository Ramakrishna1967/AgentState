# AgentStack

**Chrome DevTools for AI Agents** — open-source observability for LangGraph, CrewAI, AutoGen, and custom Python agents.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/Ramakrishna1967/AgentState/blob/main/LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg)](https://python.org)

## Install

```bash
pip install agentstate-sdk
```

## Quick Start

```python
from agentstack import observe, init

init(
    collector_url="https://your-collector.example.com",
    api_key="ak_your_project_key",
)

@observe
def research_agent(query: str) -> str:
    context = search_tool(query)
    return llm.chat(f"Answer based on: {context}")

@observe(name="planning.step")
async def async_agent(objective: str) -> list[str]:
    return await llm.achat(f"Break this into steps: {objective}")
```

Every call now produces a full trace — arguments, return values, timing, exceptions, token counts, and cost — visible in the AgentStack dashboard.

## Key Features

- **Real-time Tracing** — Captures every LLM call, tool invocation, and function as structured spans
- **Time Machine Replay** — Step through past agent executions span-by-span
- **Security Engine** — Detects prompt injection, PII leakage, and anomalous behavior
- **Cost Analytics** — Per-model token counting with USD cost tracking
- **Auto PII Sanitization** — Scrubs sensitive data before export
- **Framework Auto-Detection** — Native hooks for LangGraph, CrewAI, and AutoGen
- **Offline Resilience** — Spans buffer locally when collector is unreachable
- **Zero Interference** — The `@observe` decorator never crashes your application

## Supported Frameworks

| Framework | Status |
|-----------|--------|
| LangGraph | ✅ Auto-instrumented |
| CrewAI | ✅ Auto-instrumented |
| AutoGen | ✅ Auto-instrumented |
| Custom Python | ✅ Via `@observe` decorator |

## Self-Host the Dashboard

AgentStack is fully self-hostable with Docker Compose:

```bash
git clone https://github.com/Ramakrishna1967/AgentState.git
cd AgentState/deploy
cp .env.example .env
docker compose up -d --build
```

## Links

- [GitHub Repository](https://github.com/Ramakrishna1967/AgentState)
- [Full Documentation](https://github.com/Ramakrishna1967/AgentState#readme)
- [Report Issues](https://github.com/Ramakrishna1967/AgentState/issues)

## License

Apache 2.0 — see [LICENSE](https://github.com/Ramakrishna1967/AgentState/blob/main/LICENSE) for details.

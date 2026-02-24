# AgentStack 🕵️‍♂️

**Chrome DevTools for AI Agents** — Open-source observability, security, and debugging for AI agents.

![Dashboard Preview](https://via.placeholder.com/800x400?text=AgentStack+Dashboard)

## Features

- 🔍 **Real-time Tracing**: Visual timeline of agent execution steps.
- 🛡️ **Security Engine**: Detect prompt injection, PII leaks, and anomalies.
- 💰 **Cost Tracking**: Monitor LLM spend across models and projects.
- ⏪ **Time Machine**: Replay agent sessions to debug failures (Coming Soon).
- 🚀 **High Performance**: Built on Redis Streams & ClickHouse for 10k+ spans/sec.

## Quickstart

```bash
git clone https://github.com/Ramakrishna1967/AgentStack.git
cd AgentStack
docker-compose -f deploy/docker-compose.yml up -d
```

Visit [http://localhost](http://localhost) to see the dashboard.

## Documentation

- [Getting Started](docs/getting-started.md)
- [SDK Reference](docs/sdk-reference.md)
- [Self-Hosting](docs/self-hosting.md)

## Tech Stack

- **Backend**: Python (FastAPI), Redis, ClickHouse
- **Frontend**: React, TailwindCSS, Vite
- **Infrastructure**: Docker

## License

Apache 2.0

# SDK Reference

## Python SDK

The `agentstack-sdk` is used to instrument your AI agents.

### Installation

```bash
pip install agentstack-sdk
```

### Usage

```python
from agentstack import agent_ops

@agent_ops.trace(name="generate_summary")
def summarize(text: str):
    # Your LLM call here
    return llm.create(text)
```

### Configuration

Set environment variables to point to your collector:
- `AGENTSTACK_COLLECTOR_URL`: Default `http://localhost:4318/v1/traces`
- `AGENTSTACK_PROJECT_ID`: Your project identifier

## Trace Attributes

The SDK automatically captures:
- Function inputs/outputs
- Duration
- Errors
- System metrics (optional)

You can add custom attributes:
```python
agent_ops.set_attribute("user_id", "12345")
```

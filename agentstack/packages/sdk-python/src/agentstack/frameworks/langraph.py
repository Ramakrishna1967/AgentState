# Copyright 2026 AgentStack Contributors
# SPDX-License-Identifier: Apache-2.0

"""LangGraph auto-instrumentation via monkey-patching.

Automatically creates spans for each LangGraph node execution by wrapping
the node functions when the graph is compiled.

This is completely transparent — developers don't need to add @observe to
their node functions. AgentStack captures:
    - Node name
    - Input state
    - Output state
    - Execution duration
    - Errors

Instrumentation is applied when instrument() is called during SDK init.
"""

from __future__ import annotations

import functools
import logging
from typing import Any, Callable

logger = logging.getLogger("agentstack")

_instrumented = False


def instrument() -> None:
    """Apply LangGraph instrumentation by monkey-patching StateGraph.

    This modifies the LangGraph library to automatically create spans
    for node executions. Safe to call multiple times (idempotent).
    """
    global _instrumented
    if _instrumented:
        return

    try:
        # Import LangGraph components
        from langgraph.graph import StateGraph

        # Save the original compile method
        original_compile = StateGraph.compile

        def instrumented_compile(self, *args: Any, **kwargs: Any) -> Any:
            """Wrapped compile that instruments all nodes before compilation."""
            # Instrument each node in the graph
            for node_name, node_func in list(self.nodes.items()):
                if not hasattr(node_func, "_agentstack_instrumented"):
                    instrumented_node = _instrument_node(node_name, node_func)
                    self.nodes[node_name] = instrumented_node

            # Call the original compile
            return original_compile(self, *args, **kwargs)

        # Replace the compile method
        StateGraph.compile = instrumented_compile
        _instrumented = True
        logger.debug("LangGraph instrumentation applied successfully")

    except ImportError:
        logger.debug("LangGraph not installed, skipping instrumentation")
    except Exception:
        logger.debug("Failed to instrument LangGraph", exc_info=True)


def _instrument_node(node_name: str, node_func: Callable) -> Callable:
    """Wrap a LangGraph node function to create spans.

    Args:
        node_name: Name of the node in the graph.
        node_func: The original node function.

    Returns:
        Wrapped function that creates spans.
    """
    from agentstack.context import span_context
    from agentstack.tracer import Tracer

    @functools.wraps(node_func)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        tracer = Tracer.get_tracer()
        span = tracer.start_span(f"langgraph.node.{node_name}")

        try:
            span.set_attribute("langgraph.node.name", node_name)
            span.set_attribute("framework", "langgraph")

            # Capture input state (first arg is usually the state dict)
            if args and isinstance(args[0], dict):
                span.set_attribute("langgraph.input.keys", str(list(args[0].keys())))

            # Execute the node
            with span_context(span):
                result = node_func(*args, **kwargs)

            # Capture output state
            if isinstance(result, dict):
                span.set_attribute("langgraph.output.keys", str(list(result.keys())))

            span.end()
            return result

        except Exception as exc:
            span.record_exception(exc)
            span.end()
            raise

    # Mark as instrumented to avoid double-wrapping
    wrapped._agentstack_instrumented = True  # type: ignore
    return wrapped

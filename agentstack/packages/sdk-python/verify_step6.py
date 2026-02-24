"""Verify Step 6: Framework auto-detection and instrumentation."""
import sys
sys.path.insert(0, "src")

# ── Framework Detection ───────────────────────────────────────────────
from agentstack.frameworks import detect_frameworks, auto_instrument

detected = detect_frameworks()
assert isinstance(detected, dict)
assert "langgraph" in detected
assert "crewai" in detected
assert "autogen" in detected
# Frameworks may or may not be installed - just check the keys exist
print(f"[OK] Framework detection: {detected}")

# ── Auto-instrumentation (safe regardless of frameworks) ──────────────
results = auto_instrument()
assert isinstance(results, dict)
print(f"[OK] Auto-instrument: {results}")

# ── Import stubs (should not crash) ────────────────────────────────────
from agentstack.frameworks import crewai, autogen, langraph

crewai.instrument()
print("[OK] CrewAI stub: instrument() is no-op")

autogen.instrument()  
print("[OK] AutoGen stub: instrument() is no-op")

langraph.instrument()
print("[OK] LangGraph: instrument() is no-op when LangGraph not installed")

# ── Verify LangGraph node instrumentation logic (mock test) ────────────
# We can't fully test without LangGraph installed, but we can verify the wrapper exists
from agentstack.frameworks.langraph import _instrument_node

def dummy_node(state):
    return {"result": "test"}

wrapped = _instrument_node("test_node", dummy_node)
assert hasattr(wrapped, "_agentstack_instrumented")
assert wrapped._agentstack_instrumented is True
print("[OK] LangGraph node wrapper: marked as instrumented")

# Execute wrapped node (creates a span)
result = wrapped({"input": "test"})
assert result == {"result": "test"}
print("[OK] LangGraph wrapped node: executes correctly")

print("\n=== ALL STEP 6 CHECKS PASSED! ===")

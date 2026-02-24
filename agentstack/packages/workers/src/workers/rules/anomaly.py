def check_anomaly(span: dict) -> list[str]:
    """Check span for anomalies.
    
    Returns:
        List of anomaly descriptions.
    """
    anomalies = []
    
    # 1. Long duration (> 5 minutes is suspicious for most LLM calls)
    duration = span.get("duration_ms", 0) or 0
    if duration > 300_000:
        anomalies.append(f"Excessive duration: {duration}ms")
        
    # 2. Token explosion (heuristic)
    # Check attributes for usage
    attrs = span.get("attributes", {})
    # Token usage might be nested or flat depending on provider
    # Simple check for total_tokens if available
    total_tokens = 0
    if "llm.usage.total_tokens" in attrs:
        try:
           total_tokens = int(attrs["llm.usage.total_tokens"])
        except (ValueError, TypeError):
           pass
           
    if total_tokens > 32000: # Arbitrary threshold for "explosion"
        anomalies.append(f"High token usage: {total_tokens}")
        
    return anomalies

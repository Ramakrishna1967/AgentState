import re

# Simple regex-based patterns for MVP
# In production, use Bloom Filter + more sophisticated models

INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"fail to recall",
    r"system prompt",
    r"you are not a",
    r"DAN mode",
    r"jailbreak",
    r"dev mode",
    r"roleplay as",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]

def check_injection(text: str) -> float:
    """Check text for prompt injection patterns.
    
    Returns:
        Threat score (0.0 to 100.0)
    """
    if not text:
        return 0.0
        
    score = 0.0
    for pattern in COMPILED_PATTERNS:
        if pattern.search(text):
            score += 40.0 # Additive score
            
    return min(score, 100.0)

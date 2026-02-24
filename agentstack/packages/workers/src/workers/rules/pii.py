import re

# PII Patterns
PATTERNS = {
    "EMAIL": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "CREDIT_CARD": re.compile(r"\b(?:\d{4}[- ]?){3}\d{4}\b"),
    "AWS_KEY": re.compile(r"AKIA[0-9A-Z]{16}"),
    "OPENAI_KEY": re.compile(r"sk-[a-zA-Z0-9]{48}"),
}

def check_pii(text: str) -> list[str]:
    """Check text for PII.
    
    Returns:
        List of detected PII types.
    """
    if not text:
        return []
        
    detected = []
    for name, pattern in PATTERNS.items():
        if pattern.search(text):
            detected.append(name)
            
    return detected

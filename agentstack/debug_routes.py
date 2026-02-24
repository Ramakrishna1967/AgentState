import sys
import os
from pathlib import Path

# Add paths
root_dir = Path(os.getcwd())
sys.path.append(str(root_dir / "packages/api/src"))

from api.main import create_app

app = create_app()

print("Registered Routes:")
for route in app.routes:
    print(f"  {route.path} ({type(route).__name__})")

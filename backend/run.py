import os
import sys
from pathlib import Path

# Add project root to sys.path so 'backend' is always importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import run_server

if __name__ == "__main__":
    run_server()

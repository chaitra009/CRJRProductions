import os
import sys
import json
from pathlib import Path

# Add project root to sys.path so 'backend' is always importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Standard-library .env loader (zero external pip packages needed)
def load_env_file(filepath: Path):
    if filepath.exists():
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"[Backend Config] Note reading .env: {e}")

load_env_file(ROOT_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "5000"))
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")

# Read firebase config if present
FIREBASE_CONFIG_PATH = ROOT_DIR / "firebase-applet-config.json"
FIREBASE_CONFIG = {}
if FIREBASE_CONFIG_PATH.exists():
    try:
        with open(FIREBASE_CONFIG_PATH, "r", encoding="utf-8") as f:
            FIREBASE_CONFIG = json.load(f)
    except Exception as e:
        print(f"[Backend Config] Warning loading firebase config: {e}")

FIRESTORE_PROJECT_ID = FIREBASE_CONFIG.get("projectId", "crjrproductions")
FIRESTORE_DATABASE_ID = FIREBASE_CONFIG.get("firestoreDatabaseId", "(default)")

# Vertex AI Settings
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", FIRESTORE_PROJECT_ID)
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1") # Defaulting to us-central1 as standard for Vertex AI Free Tier
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

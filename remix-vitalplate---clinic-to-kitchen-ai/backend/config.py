import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load root .env
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
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

FIRESTORE_PROJECT_ID = FIREBASE_CONFIG.get("projectId", "")
FIRESTORE_DATABASE_ID = FIREBASE_CONFIG.get("firestoreDatabaseId", "(default)")

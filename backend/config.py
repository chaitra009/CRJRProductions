import os
import sys
from pathlib import Path

BACKEND_HOST = os.environ.get("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "8000"))
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FIRESTORE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "gen-lang-client-0656692186")
FIRESTORE_DATABASE_ID = "ai-studio-remixvitalplatec-beb36462-0cd2-4b7f-8b1f-84d8d822b318"

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_FILE = ROOT_DIR / ".backend_db.json"

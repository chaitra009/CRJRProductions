import uvicorn
from backend.config import BACKEND_HOST, BACKEND_PORT

if __name__ == "__main__":
    print(f"[Python Backend] Starting VitalPlate AI & Business Logic Server on {BACKEND_HOST}:{BACKEND_PORT}...")
    uvicorn.run("backend.main:app", host=BACKEND_HOST, port=BACKEND_PORT, log_level="info")

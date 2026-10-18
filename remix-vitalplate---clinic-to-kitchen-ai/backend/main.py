import sys
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import GEMINI_API_KEY, FIRESTORE_PROJECT_ID, FIRESTORE_DATABASE_ID
from backend.db import db_manager
from backend.ai_engine import (
    parse_clinical_lab,
    audit_home_cooked_plate,
    calculate_ingredient_swap,
    generate_audio_briefing,
    reindex_meal_queue,
)

# FastAPI instance
app = FastAPI(
    title="VitalPlate APAC - Clinic-to-Kitchen Python Backend",
    description="Dedicated Python AI & Business Logic Server for VitalPlate APAC",
    version="2.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== HEALTH & ARCHITECTURE INSPECTION ====================

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "VitalPlate Python AI & Business Logic Backend",
        "pythonVersion": sys.version.split()[0],
        "hasGeminiApiKey": bool(GEMINI_API_KEY),
        "firestoreProjectId": FIRESTORE_PROJECT_ID or "configured",
        "firestoreDatabaseId": FIRESTORE_DATABASE_ID or "ai-studio-remixvitalplatec",
        "stats": {
            "householdsCount": len(db_manager.households),
            "usersCount": len(db_manager.users),
            "patientsCount": len(db_manager.patients),
            "mealsCount": len(db_manager.meals),
            "plateAuditsCount": len(db_manager.plate_audits),
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/backend/architecture")
def backend_architecture():
    """
    Returns full metadata regarding the split backend architecture:
    Business logic, DB connections, and AI engine integrations.
    """
    return {
        "architecture": "Split Architecture (Python Backend + React Vite Modern UI)",
        "modules": [
            {
                "name": "AI Compatibility Engine (backend/ai_engine.py)",
                "framework": "Google GenAI SDK (google-genai)",
                "capabilities": [
                    "Multimodal Clinical Lab Panel Parsing (Biomarkers, Reference Ranges)",
                    "Visual Plate Adherence Auditing (1-10 Oil Sheen, Macro Distribution)",
                    "Voice-First Ingredient Swap Reasoning (Clinical Guardrails)",
                    "Delta-Only Spoken Kitchen Audio Briefings (7 Asian Dialects)",
                    "Clinical Re-Indexing of Weekly Meal Queues",
                ],
            },
            {
                "name": "Database & Business Logic Layer (backend/db.py)",
                "framework": "Firestore DB Sync + Local JSON Persistence Cache",
                "entities": [
                    "Households (memberIds array referencing users)",
                    "Users (Multi-Role RBAC: Admin, Caregiver, Cook, Dietitian, Patient)",
                    "Patients (Clinical condition phenotypes, texture needs, sodium/GI limits)",
                    "Biomarkers (Quantitative clinical values, status, timestamps)",
                    "Meal Plans (Delta directives, approval workflow: DRAFT -> APPROVED)",
                    "Plate Audits (Adherence tier, oil observation, feedback in dialect)",
                    "Grocery Inventory (Clinical reasoning for pantry staples)",
                ],
            },
            {
                "name": "API Service Gateway (backend/main.py)",
                "framework": "FastAPI + Uvicorn ASGI Server",
                "endpoints": [
                    "/api/health",
                    "/api/backend/architecture",
                    "/api/parse-lab",
                    "/api/audit-plate",
                    "/api/ingredient-swap",
                    "/api/audio-briefing",
                    "/api/reindex-meals",
                    "/api/households",
                    "/api/users",
                    "/api/patients",
                    "/api/biomarkers",
                    "/api/meals",
                    "/api/plate-audits",
                    "/api/grocery",
                    "/api/seed",
                ],
            },
        ],
        "frontendIntegration": "Lightweight fetch gateway via /api/* with zero business logic in UI components",
    }


# ==================== AI ENDPOINTS ====================

class LabParseRequest(BaseModel):
    imageBase64: Optional[str] = None
    mimeType: Optional[str] = "image/jpeg"
    textContent: Optional[str] = None

@app.post("/api/parse-lab")
def api_parse_lab(payload: LabParseRequest):
    try:
        data = parse_clinical_lab(
            image_base64=payload.imageBase64,
            mime_type=payload.mimeType or "image/jpeg",
            text_content=payload.textContent,
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PlateAuditRequest(BaseModel):
    imageBase64: str
    mimeType: Optional[str] = "image/jpeg"
    patientProfile: Optional[Any] = None
    plannedMealName: Optional[str] = "Asian home-cooked lunch"

@app.post("/api/audit-plate")
def api_audit_plate(payload: PlateAuditRequest):
    try:
        data = audit_home_cooked_plate(
            image_base64=payload.imageBase64,
            mime_type=payload.mimeType or "image/jpeg",
            patient_profile=payload.patientProfile,
            planned_meal_name=payload.plannedMealName or "Asian home-cooked lunch",
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class IngredientSwapRequest(BaseModel):
    missingIngredient: str
    dishName: str
    cuisine: str
    clinicalConstraints: Optional[Any] = None
    dialect: Optional[str] = "Hindi"

@app.post("/api/ingredient-swap")
def api_ingredient_swap(payload: IngredientSwapRequest):
    try:
        data = calculate_ingredient_swap(
            missing_ingredient=payload.missingIngredient,
            dish_name=payload.dishName,
            cuisine=payload.cuisine,
            clinical_constraints=payload.clinicalConstraints,
            dialect=payload.dialect or "Hindi",
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AudioBriefingRequest(BaseModel):
    mealName: str
    cuisine: str
    deltaInstructions: Any
    dialect: Optional[str] = "Hindi"
    voiceName: Optional[str] = "Kore"

@app.post("/api/audio-briefing")
def api_audio_briefing(payload: AudioBriefingRequest):
    try:
        data = generate_audio_briefing(
            meal_name=payload.mealName,
            cuisine=payload.cuisine,
            delta_instructions=payload.deltaInstructions,
            dialect=payload.dialect or "Hindi",
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReindexMealsRequest(BaseModel):
    guardrails: Any
    currentMeals: Any
    patientProfiles: Any

@app.post("/api/reindex-meals")
def api_reindex_meals(payload: ReindexMealsRequest):
    try:
        data = reindex_meal_queue(
            guardrails=payload.guardrails,
            current_meals=payload.currentMeals,
            patient_profiles=payload.patientProfiles,
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DB & PERSISTENCE ENDPOINTS ====================

# 1. Households
@app.get("/api/households")
def get_households():
    return {"success": True, "data": db_manager.list_households()}

@app.post("/api/households")
def create_household(household: Dict[str, Any] = Body(...)):
    saved = db_manager.save_household(household)
    return {"success": True, "data": saved}

@app.get("/api/households/{id_or_code}")
def get_household_item(id_or_code: str):
    # Try by code first
    found = db_manager.get_household_by_code(id_or_code)
    if not found:
        # Try by id
        found = db_manager.get_household(id_or_code)
    if not found:
        raise HTTPException(status_code=404, detail="Household not found")
    return {"success": True, "data": found}

# 2. Users
@app.get("/api/users")
def get_users(householdId: Optional[str] = None):
    return {"success": True, "data": db_manager.list_users(householdId)}

@app.post("/api/users")
def create_user(user: Dict[str, Any] = Body(...)):
    saved = db_manager.save_user(user)
    return {"success": True, "data": saved}

@app.get("/api/users/{user_id}")
def get_user_item(user_id: str):
    u = db_manager.get_user(user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "data": u}

@app.delete("/api/users/{user_id}")
def delete_user_item(user_id: str, householdId: Optional[str] = None):
    success = db_manager.delete_user(user_id, householdId)
    return {"success": success}

# 3. Patients
@app.get("/api/patients")
def get_patients(householdId: Optional[str] = None):
    return {"success": True, "data": db_manager.list_patients(householdId)}

@app.post("/api/patients")
def create_patient(patient: Dict[str, Any] = Body(...)):
    saved = db_manager.save_patient(patient)
    return {"success": True, "data": saved}

# 4. Biomarkers
@app.get("/api/biomarkers")
def get_biomarkers(patientId: Optional[str] = None, householdId: Optional[str] = None):
    return {"success": True, "data": db_manager.list_biomarkers(patientId, householdId)}

@app.post("/api/biomarkers")
def create_biomarker(biomarker: Dict[str, Any] = Body(...)):
    saved = db_manager.save_biomarker(biomarker)
    return {"success": True, "data": saved}

# 5. Meals
@app.get("/api/meals")
def get_meals(householdId: Optional[str] = None):
    return {"success": True, "data": db_manager.list_meals(householdId)}

@app.post("/api/meals")
def create_meal(meal: Dict[str, Any] = Body(...)):
    saved = db_manager.save_meal(meal)
    return {"success": True, "data": saved}

class MealStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    reviewer: Optional[str] = None

@app.patch("/api/meals/{meal_id}/status")
def update_meal_status_api(meal_id: str, payload: MealStatusUpdate):
    updated = db_manager.update_meal_status(
        meal_id=meal_id,
        status=payload.status,
        notes=payload.notes,
        reviewer=payload.reviewer,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"success": True, "data": updated}

# 6. Plate Audits
@app.get("/api/plate-audits")
def get_plate_audits(householdId: Optional[str] = None):
    return {"success": True, "data": db_manager.list_plate_audits(householdId)}

@app.post("/api/plate-audits")
def create_plate_audit(audit: Dict[str, Any] = Body(...)):
    saved = db_manager.save_plate_audit(audit)
    return {"success": True, "data": saved}

# 7. Grocery Inventory
@app.get("/api/grocery")
def get_grocery(householdId: Optional[str] = None):
    return {"success": True, "data": db_manager.list_groceries(householdId)}

@app.post("/api/grocery")
def create_grocery(item: Dict[str, Any] = Body(...)):
    saved = db_manager.save_grocery_item(item)
    return {"success": True, "data": saved}

@app.patch("/api/grocery/{item_id}")
def update_grocery(item_id: str, updates: Dict[str, Any] = Body(...)):
    updated = db_manager.update_grocery_item(item_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Grocery item not found")
    return {"success": True, "data": updated}

# 8. Seed Demo Clinic-to-Kitchen Data
@app.post("/api/seed")
def seed_database_endpoint():
    seeded = db_manager.seed_data()
    return {"success": True, "data": seeded, "message": "Demo data successfully seeded into Python DB"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)

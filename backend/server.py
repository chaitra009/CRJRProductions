import json
import os
import sys
import time
from typing import Any, Dict
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import BACKEND_HOST, BACKEND_PORT, GEMINI_API_KEY, FIRESTORE_PROJECT_ID, FIRESTORE_DATABASE_ID
from backend.db import db_manager
from backend.ai_engine import (
    parse_clinical_lab,
    analyze_household_cuisine_and_diet,
    translate_diet_instructions,
    generate_audio_briefing,
    calculate_ingredient_swap,
    audit_home_cooked_plate,
    reindex_meal_queue,
)

class VitalPlateAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: Any, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def _read_json(self) -> Dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    # ==================== GET HANDLERS ====================
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path == "/api/health":
            self._send_json({
                "status": "online",
                "service": "VitalPlate Python AI & Business Logic Server",
                "pythonVersion": sys.version.split()[0],
                "hasGeminiApiKey": bool(GEMINI_API_KEY),
                "firestoreProjectId": FIRESTORE_PROJECT_ID,
                "firestoreDatabaseId": FIRESTORE_DATABASE_ID,
                "stats": {
                    "householdsCount": len(db_manager.households),
                    "usersCount": len(db_manager.users),
                    "patientsCount": len(db_manager.patients),
                    "mealsCount": len(db_manager.meals),
                    "plateAuditsCount": len(db_manager.plate_audits),
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            return

        if path == "/api/backend/architecture":
            self._send_json({
                "architecture": "Split Architecture (Python Backend + React Vite Modern UI)",
                "modules": [
                    {
                        "name": "Python AI Engine (backend/ai_engine.py)",
                        "framework": "Google GenAI API + Python Standard Library",
                        "capabilities": [
                            "Multimodal Clinical Lab Panel Parsing (Biomarkers, Reference Ranges)",
                            "Household Cuisine Clinical Benefit Analysis (Vertex / GenAI reasoning)",
                            "Visual Plate Adherence Auditing (1-10 Oil Sheen, Macro Distribution)",
                            "Voice-First Ingredient Swap Reasoning (Clinical Guardrails)",
                            "Spoken Kitchen Audio Briefings & Multi-Language Instruction Translation (8 Dialects)",
                            "Clinical Re-Indexing of Weekly Meal Queues",
                        ],
                    },
                    {
                        "name": "Database & Business Logic Layer (backend/db.py)",
                        "framework": "Firestore DB Sync + Local JSON Persistence Cache",
                        "entities": [
                            "Households (Family Home Code system, memberIds array)",
                            "Users (Multi-Role RBAC: Admin, Caregiver, Cook, Dietitian, Patient)",
                            "Patients (Clinical condition phenotypes, texture needs, sodium/GI limits)",
                            "Biomarkers (Quantitative clinical values, status, timestamps)",
                            "Meal Plans (Delta directives, approval workflow: DRAFT_PENDING -> APPROVED_ACTIVE)",
                            "Plate Audits (Adherence tier, oil observation, feedback in dialect)",
                            "Grocery Inventory (Clinical reasoning for pantry staples)",
                        ],
                    },
                ],
                "frontendIntegration": "Pure UI display consuming Python backend APIs via /api/*",
            })
            return

        if path == "/api/households":
            self._send_json({"success": True, "data": db_manager.list_households()})
            return

        if path.startswith("/api/households/"):
            hid = path.split("/")[3]
            hh = db_manager.get_household(hid) or db_manager.get_household_by_code(hid)
            if hh:
                self._send_json({"success": True, "data": hh})
            else:
                self._send_json({"success": False, "error": "Not found"}, 404)
            return

        if path == "/api/users":
            hid = qs.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_users(hid)})
            return

        if path == "/api/patients":
            hid = qs.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_patients(hid)})
            return

        if path == "/api/biomarkers":
            pid = qs.get("patientId", [None])[0]
            hid = qs.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_biomarkers(pid, hid)})
            return

        if path == "/api/meals":
            hid = qs.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_meals(hid)})
            return

        if path == "/api/plate-audits":
            hid = qs.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_plate_audits(hid)})
            return

        if path == "/api/grocery":
            hid = qs.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_groceries(hid)})
            return

        self._send_json({"error": "Not found"}, 404)

    # ==================== POST HANDLERS ====================
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_json()

        if path == "/api/households":
            res = db_manager.save_household(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/users":
            res = db_manager.save_user(body)
            self._send_json({"success": True, "data": res})
            return

        if path.startswith("/api/households/") and path.endswith("/members"):
            hid = path.split("/")[3]
            body["householdId"] = hid
            res = db_manager.save_user(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/patients":
            res = db_manager.save_patient(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/biomarkers":
            res = db_manager.save_biomarker(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/meals":
            res = db_manager.save_meal(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/grocery":
            res = db_manager.save_grocery_item(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/plate-audits":
            res = db_manager.save_plate_audit(body)
            self._send_json({"success": True, "data": res})
            return

        if path == "/api/seed":
            data = db_manager.seed_data()
            self._send_json({"success": True, "data": data, "message": "Demo database seeded."})
            return

        # AI Endpoints
        if path == "/api/parse-lab":
            data = parse_clinical_lab(
                image_base64=body.get("imageBase64"),
                mime_type=body.get("mimeType", "image/jpeg"),
                text_content=body.get("textContent")
            )
            self._send_json({"success": True, "data": data})
            return

        if path == "/api/generate-household-diet":
            hid = body.get("householdId", "hh-prime")
            result = analyze_household_cuisine_and_diet(
                household_id=hid,
                household_name=body.get("householdName", "Vance Residence"),
                region=body.get("region", "SINGAPORE"),
                patients=body.get("patients") or db_manager.list_patients(hid),
                biomarkers=body.get("biomarkers") or db_manager.list_biomarkers(None, hid),
                available_cuisines=body.get("availableCuisines"),
                available_appliances=body.get("availableAppliances")
            )
            saved = []
            for draft in result.get("generatedDraftMeals", []):
                draft["householdId"] = hid
                draft["approvalStatus"] = "DRAFT_PENDING"
                saved.append(db_manager.save_meal(draft))

            self._send_json({
                "success": True,
                "data": {
                    "clinicalSummary": result.get("clinicalSummary"),
                    "cuisineRecommendations": result.get("cuisineRecommendations"),
                    "meals": saved
                }
            })
            return

        if path == "/api/translate-instructions":
            data = translate_diet_instructions(
                dish_name=body.get("dishName", "Dish"),
                delta_directives=body.get("deltaDirectives", []),
                target_language=body.get("targetLanguage", "Tagalog")
            )
            self._send_json({"success": True, "data": data})
            return

        if path == "/api/audio-briefing":
            data = generate_audio_briefing(
                meal_name=body.get("mealName", "Steamed Dish"),
                cuisine=body.get("cuisine", "Hainanese Heritage"),
                delta_instructions=body.get("deltaInstructions", []),
                dialect=body.get("dialect", "Tagalog")
            )
            self._send_json({"success": True, "data": data})
            return

        if path == "/api/ingredient-swap":
            data = calculate_ingredient_swap(
                missing_ingredient=body.get("missingIngredient", "Light Soy Sauce"),
                dish_name=body.get("dishName", "Steamed Fish"),
                cuisine=body.get("cuisine", "Hainanese Heritage"),
                clinical_constraints=body.get("clinicalConstraints"),
                dialect=body.get("dialect", "Tagalog")
            )
            self._send_json({"success": True, "data": data})
            return

        if path == "/api/audit-plate":
            data = audit_home_cooked_plate(
                image_base64=body.get("imageBase64", ""),
                mime_type=body.get("mimeType", "image/jpeg"),
                patient_profile=body.get("patientProfile"),
                planned_meal_name=body.get("plannedMealName", "Asian dish")
            )
            self._send_json({"success": True, "data": data})
            return

        if path == "/api/reindex-meals":
            data = reindex_meal_queue(
                guardrails=body.get("guardrails"),
                current_meals=body.get("currentMeals"),
                patient_profiles=body.get("patientProfiles")
            )
            self._send_json({"success": True, "data": data})
            return

        self._send_json({"error": "Not found"}, 404)

    # ==================== PATCH & DELETE ====================
    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_json()

        if path.startswith("/api/meals/") and path.endswith("/status"):
            mid = path.split("/")[3]
            updated = db_manager.update_meal_status(
                meal_id=mid,
                status=body.get("status", "APPROVED_ACTIVE"),
                notes=body.get("notes"),
                reviewer=body.get("reviewer")
            )
            if updated:
                self._send_json({"success": True, "data": updated})
            else:
                self._send_json({"success": False, "error": "Not found"}, 404)
            return

        if path.startswith("/api/grocery/"):
            gid = path.split("/")[3]
            updated = db_manager.update_grocery_item(gid, body)
            if updated:
                self._send_json({"success": True, "data": updated})
            else:
                self._send_json({"success": False, "error": "Not found"}, 404)
            return

        self._send_json({"error": "Not found"}, 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        if path.startswith("/api/users/"):
            uid = path.split("/")[3]
            hid = qs.get("householdId", [None])[0]
            deleted = db_manager.delete_user(uid, hid)
            self._send_json({"success": deleted})
            return

        self._send_json({"error": "Not found"}, 404)


def run_server():
    server = HTTPServer((BACKEND_HOST, BACKEND_PORT), VitalPlateAPIHandler)
    print(f"[Python Backend] VitalPlate Business Logic & AI Server active at http://{BACKEND_HOST}:{BACKEND_PORT}")
    server.serve_forever()

if __name__ == "__main__":
    import time
    run_server()

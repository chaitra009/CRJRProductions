import sys
import time
import json
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional, Dict, Any

from backend.config import GEMINI_API_KEY, FIRESTORE_PROJECT_ID, FIRESTORE_DATABASE_ID, BACKEND_PORT, BACKEND_HOST
from backend.db import db_manager
from backend.ai_engine import (
    parse_clinical_lab,
    audit_home_cooked_plate,
    calculate_ingredient_swap,
    generate_audio_briefing,
    reindex_meal_queue,
)

class VitalPlateHTTPHandler(BaseHTTPRequestHandler):
    """
    High-performance native Python HTTP server for VitalPlate AI & Business Logic.
    Zero external dependencies required - 100% portable across standard Python runtimes.
    """

    def _set_cors_headers(self, status_code: int = 200, content_type: str = "application/json"):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_cors_headers(204)

    def _read_json_body(self) -> Dict[str, Any]:
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw)
        except Exception as e:
            print(f"[Backend HTTP] Error reading body: {e}")
        return {}

    def _send_json(self, data: Any, status_code: int = 200):
        self._set_cors_headers(status_code)
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def _send_error(self, message: str, status_code: int = 400):
        self._set_cors_headers(status_code)
        self.wfile.write(json.dumps({"success": False, "error": message}).encode("utf-8"))

    # ==================== GET REQUESTS ====================

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api"):
            path = "/api" + (path if path.startswith("/") else f"/{path}")
        query = urllib.parse.parse_qs(parsed.query)

        # 1. Health & Status
        if path == "/api/health":
            self._send_json({
                "status": "online",
                "service": "VitalPlate Python AI & Business Logic Backend",
                "pythonVersion": sys.version.split()[0],
                "hasGeminiApiKey": bool(GEMINI_API_KEY),
                "firestoreProjectId": FIRESTORE_PROJECT_ID or "configured",
                "firestoreDatabaseId": FIRESTORE_DATABASE_ID or "ai-studio-remixvitalplatec",
                "port": BACKEND_PORT,
                "stats": {
                    "householdsCount": len(db_manager.households),
                    "usersCount": len(db_manager.users),
                    "patientsCount": len(db_manager.patients),
                    "mealsCount": len(db_manager.meals),
                    "plateAuditsCount": len(db_manager.plate_audits),
                    "groceriesCount": len(db_manager.groceries),
                    "lowStockCount": len(db_manager.list_low_stock_groceries()),
                },
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            return

        # 2. Architecture metadata
        if path == "/api/backend/architecture":
            self._send_json({
                "architecture": "Split Architecture (Python Backend + React Vite Modern UI)",
                "modules": [
                    {
                        "name": "AI Compatibility Engine (backend/ai_engine.py)",
                        "framework": "Google GenAI REST API & Native Python Runtime",
                        "capabilities": [
                            "Multimodal Clinical Lab Panel Parsing (Biomarkers, Reference Ranges)",
                            "Visual Plate Adherence Auditing (1-10 Oil Sheen, Macro Balance)",
                            "Voice-First Ingredient Swap Reasoning (Clinical Guardrails)",
                            "Delta-Only Spoken Kitchen Audio Briefings (7 Asian Dialects)",
                            "Clinical Re-Indexing of Weekly Meal Queues",
                        ],
                    },
                    {
                        "name": "Database & Business Logic Layer (backend/db.py)",
                        "framework": "Firestore DB Sync + JSON Persistence Cache",
                        "entities": [
                            "Households (memberIds array referencing users table)",
                            "Users (Multi-Role RBAC: Admin, Caregiver, Cook, Dietitian, Patient)",
                            "Patients (Clinical condition phenotypes, texture needs, sodium/GI limits)",
                            "Biomarkers (Quantitative clinical values, status, timestamps)",
                            "Meal Plans (Delta directives, approval workflow: DRAFT -> APPROVED)",
                            "Plate Audits (Adherence tier, oil observation, feedback in dialect)",
                            "Grocery Inventory (Consumption patterns & Low Stock Depletion Alerts)",
                        ],
                    },
                    {
                        "name": "API Service Gateway (backend/main.py)",
                        "framework": "Python 3 HTTP REST Gateway",
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
                            "/api/grocery/low-stock",
                            "/api/seed",
                            "/api/synthesis",
                            "/api/clinical-analysis",
                        ],
                    },
                ],
                "frontendIntegration": "Clean fetch gateway via /api/* with zero business logic in display UI",
            })
            return

        # 3. Households
        if path == "/api/households":
            self._send_json({"success": True, "data": db_manager.list_households()})
            return

        if path.startswith("/api/households/"):
            hid = path.replace("/api/households/", "").strip()
            item = db_manager.get_household_by_code(hid) or db_manager.get_household(hid)
            if item:
                self._send_json({"success": True, "data": item})
            else:
                self._send_error("Household not found", 404)
            return

        # 4. Users
        if path == "/api/users":
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_users(hid)})
            return

        # 5. Patients
        if path == "/api/patients":
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_patients(hid)})
            return

        # 6. Biomarkers
        if path == "/api/biomarkers":
            pid = query.get("patientId", [None])[0]
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_biomarkers(pid, hid)})
            return

        # 7. Meals
        if path == "/api/meals":
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_meals(hid)})
            return

        # 8. Plate Audits
        if path == "/api/plate-audits":
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_plate_audits(hid)})
            return

        # 9. Groceries & Low Stock Alerts
        if path == "/api/grocery/low-stock":
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_low_stock_groceries(hid)})
            return

        if path == "/api/grocery":
            hid = query.get("householdId", [None])[0]
            self._send_json({"success": True, "data": db_manager.list_groceries(hid)})
            return

        # 10. Clinical Synthesis
        if path == "/api/synthesis":
            hid = query.get("householdId", [None])[0]
            if not hid:
                self._send_error("householdId required", 400)
                return
            synthesis = db_manager.get_synthesis(hid)
            self._send_json({"success": True, "data": synthesis})
            return

        # 11. Dedicated Clinical Analysis (for Dietitian Review)
        if path == "/api/clinical-analysis":
            hid = query.get("householdId", [None])[0]
            if not hid:
                self._send_error("householdId required", 400)
                return
            analysis = db_manager.get_clinical_analysis(hid)
            self._send_json({"success": True, "data": analysis})
            return

        self._send_error(f"Route not found: {path}", 404)

    # ==================== POST REQUESTS ====================

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api"):
            path = "/api" + (path if path.startswith("/") else f"/{path}")
        body = self._read_json_body()

        # 1. AI: Parse Lab Panel
        if path == "/api/parse-lab":
            data = parse_clinical_lab(
                image_base64=body.get("imageBase64"),
                mime_type=body.get("mimeType", "image/jpeg"),
                text_content=body.get("textContent"),
            )
            self._send_json({"success": True, "data": data})
            return

        # 2. AI: Audit Plate Photo
        if path == "/api/audit-plate":
            data = audit_home_cooked_plate(
                image_base64=body.get("imageBase64", ""),
                mime_type=body.get("mimeType", "image/jpeg"),
                patient_profile=body.get("patientProfile"),
                planned_meal_name=body.get("plannedMealName", "Asian home-cooked lunch"),
            )
            self._send_json({"success": True, "data": data})
            return

        # 3. AI: Ingredient Swap
        if path == "/api/ingredient-swap":
            data = calculate_ingredient_swap(
                missing_ingredient=body.get("missingIngredient", "Soy Sauce"),
                dish_name=body.get("dishName", "Steamed Fish"),
                cuisine=body.get("cuisine", "Hainanese Heritage"),
                clinical_constraints=body.get("clinicalConstraints"),
                dialect=body.get("dialect", "Hindi"),
            )
            self._send_json({"success": True, "data": data})
            return

        # 4. AI: Audio Briefing Script
        if path == "/api/audio-briefing":
            data = generate_audio_briefing(
                meal_name=body.get("mealName", "Steamed Fish"),
                cuisine=body.get("cuisine", "Hainanese Heritage"),
                delta_instructions=body.get("deltaInstructions", []),
                dialect=body.get("dialect", "Hindi"),
            )
            self._send_json({"success": True, "data": data})
            return

        # 5. AI: Reindex Meals
        if path == "/api/reindex-meals":
            hid = body.get("householdId")
            data = reindex_meal_queue(
                guardrails=body.get("guardrails"),
                current_meals=body.get("currentMeals", []),
                patient_profiles=body.get("patientProfiles", []),
            )
            
            # Persist the reindexed meals if they were generated
            reindexed = data.get("reindexedMeals", [])
            if reindexed and hid:
                # Clear existing meals for this household to avoid duplication if it's a full week refresh
                # Optional: depends on if we want to replace or append. 
                # User says "Diet approval table needs to have a weeks diet i dont se that",
                # implying we should replace the current view with the new week.
                for mid in list(db_manager.meals.keys()):
                    if db_manager.meals[mid].get("householdId") == hid:
                        del db_manager.meals[mid]

                # Save each meal to the database
                for idx, meal in enumerate(reindexed):
                    meal["householdId"] = hid
                    # Ensure unique ID even if AI returned duplicates or no ID
                    meal["id"] = f"meal-{hid}-{int(time.time())}-{idx}"
                    db_manager.save_meal(meal)
            
            # Save the clinical synthesis persistence for next week
            if hid:
                db_manager.save_synthesis(hid, {
                    "clinicalSynthesisNote": data.get("clinicalSynthesisNote"),
                    "guardrailsApplied": body.get("guardrails"),
                    "memberProfiles": body.get("patientProfiles", [])
                })
            self._send_json({"success": True, "data": data})
            return

        # 6. Entity Creation
        if path == "/api/households":
            saved = db_manager.save_household(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/users":
            saved = db_manager.save_user(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/patients":
            saved = db_manager.save_patient(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/biomarkers":
            saved = db_manager.save_biomarker(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/meals":
            saved = db_manager.save_meal(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/plate-audits":
            saved = db_manager.save_plate_audit(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/grocery":
            saved = db_manager.save_grocery_item(body)
            self._send_json({"success": True, "data": saved})
            return

        if path == "/api/seed":
            seeded = db_manager.seed_data()
            self._send_json({
                "success": True,
                "data": seeded,
                "message": "Demo data successfully seeded into Python DB"
            })
            return

        self._send_error(f"POST route not found: {path}", 404)

    # ==================== PATCH REQUESTS ====================

    def do_PATCH(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api"):
            path = "/api" + (path if path.startswith("/") else f"/{path}")
        body = self._read_json_body()

        # Update meal status
        if path.startswith("/api/meals/") and path.endswith("/status"):
            meal_id = path.replace("/api/meals/", "").replace("/status", "").strip()
            updated = db_manager.update_meal_status(
                meal_id=meal_id,
                status=body.get("status", "APPROVED_ACTIVE"),
                notes=body.get("notes"),
                reviewer=body.get("reviewer"),
            )
            if updated:
                self._send_json({"success": True, "data": updated})
            else:
                self._send_error("Meal not found", 404)
            return

        # Update grocery item
        if path.startswith("/api/grocery/"):
            item_id = path.replace("/api/grocery/", "").strip()
            updated = db_manager.update_grocery_item(item_id, body)
            if updated:
                self._send_json({"success": True, "data": updated})
            else:
                self._send_error("Grocery item not found", 404)
            return

        self._send_error(f"PATCH route not found: {path}", 404)

    # ==================== DELETE REQUESTS ====================

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if not path.startswith("/api"):
            path = "/api" + (path if path.startswith("/") else f"/{path}")
        query = urllib.parse.parse_qs(parsed.query)
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/users/"):
            uid = path.replace("/api/users/", "").strip()
            hid = query.get("householdId", [None])[0]
            success = db_manager.delete_user(uid, hid)
            self._send_json({"success": success})
            return

        self._send_error(f"DELETE route not found: {path}", 404)

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[Python Backend] {self.command} {self.path} - {args[1] if len(args) > 1 else ''}\n")


def run_server():
    server_address = (BACKEND_HOST, BACKEND_PORT)
    httpd = HTTPServer(server_address, VitalPlateHTTPHandler)
    print(f"[Python Backend] VitalPlate AI & Business Logic Server running on {BACKEND_HOST}:{BACKEND_PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[Python Backend] Shutting down...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()

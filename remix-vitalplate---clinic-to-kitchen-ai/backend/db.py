import json
import os
import time
from typing import Dict, List, Optional, Any
from pathlib import Path
from backend.config import ROOT_DIR, FIRESTORE_PROJECT_ID, FIRESTORE_DATABASE_ID

# Local JSON storage file to ensure data survives server restarts
DB_FILE = ROOT_DIR / ".backend_db.json"

class DatabaseManager:
    """
    Manages DB connections, data persistence, and core business logic
    for VitalPlate clinic-to-kitchen workflows.
    """

    def __init__(self):
        self.households: Dict[str, Dict[str, Any]] = {}
        self.users: Dict[str, Dict[str, Any]] = {}
        self.patients: Dict[str, Dict[str, Any]] = {}
        self.biomarkers: Dict[str, Dict[str, Any]] = {}
        self.meals: Dict[str, Dict[str, Any]] = {}
        self.plate_audits: Dict[str, Dict[str, Any]] = {}
        self.groceries: Dict[str, Dict[str, Any]] = {}
        self.load_from_disk()

    def load_from_disk(self):
        if DB_FILE.exists():
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.households = data.get("households", {})
                    self.users = data.get("users", {})
                    self.patients = data.get("patients", {})
                    self.biomarkers = data.get("biomarkers", {})
                    self.meals = data.get("meals", {})
                    self.plate_audits = data.get("plate_audits", {})
                    self.groceries = data.get("groceries", {})
            except Exception as e:
                print(f"[DB] Error loading local DB: {e}")

    def save_to_disk(self):
        try:
            data = {
                "households": self.households,
                "users": self.users,
                "patients": self.patients,
                "biomarkers": self.biomarkers,
                "meals": self.meals,
                "plate_audits": self.plate_audits,
                "groceries": self.groceries,
                "savedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[DB] Error saving to disk: {e}")

    # ==================== HOUSEHOLD BUSINESS LOGIC ====================

    def save_household(self, household: Dict[str, Any]) -> Dict[str, Any]:
        hid = household.get("id") or f"hh-{int(time.time()*1000)}"
        household["id"] = hid
        if "memberIds" not in household:
            household["memberIds"] = []
        if "createdAt" not in household:
            household["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        household["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        self.households[hid] = household
        self.save_to_disk()
        return household

    def get_household(self, household_id: str) -> Optional[Dict[str, Any]]:
        return self.households.get(household_id)

    def get_household_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        clean_code = code.strip().upper()
        for hh in self.households.values():
            if hh.get("homeCode", "").strip().upper() == clean_code:
                return hh
        return None

    def list_households(self) -> List[Dict[str, Any]]:
        return list(self.households.values())

    # ==================== USER BUSINESS LOGIC ====================

    def save_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        uid = user.get("id") or f"usr-{int(time.time()*1000)}"
        user["id"] = uid
        if "roles" not in user:
            user["roles"] = ["caregiver"]
        if "createdAt" not in user:
            user["createdAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        user["updatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        self.users[uid] = user

        # Associate with household memberIds if householdId is specified
        hid = user.get("householdId")
        if hid and hid in self.households:
            hh = self.households[hid]
            if uid not in hh.get("memberIds", []):
                hh.setdefault("memberIds", []).append(uid)

        self.save_to_disk()
        return user

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.users.get(user_id)

    def list_users(self, household_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not household_id:
            return list(self.users.values())
        return [u for u in self.users.values() if u.get("householdId") == household_id]

    def delete_user(self, user_id: str, household_id: Optional[str] = None) -> bool:
        deleted = False
        if user_id in self.users:
            del self.users[user_id]
            deleted = True
        if household_id and household_id in self.households:
            hh = self.households[household_id]
            if "memberIds" in hh and user_id in hh["memberIds"]:
                hh["memberIds"] = [m for m in hh["memberIds"] if m != user_id]
        self.save_to_disk()
        return deleted

    # ==================== PATIENTS & BIOMARKERS ====================

    def save_patient(self, patient: Dict[str, Any]) -> Dict[str, Any]:
        pid = patient.get("id") or f"pt-{int(time.time()*1000)}"
        patient["id"] = pid
        self.patients[pid] = patient
        self.save_to_disk()
        return patient

    def list_patients(self, household_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not household_id:
            return list(self.patients.values())
        return [p for p in self.patients.values() if p.get("householdId") == household_id]

    def save_biomarker(self, biomarker: Dict[str, Any]) -> Dict[str, Any]:
        bid = biomarker.get("id") or f"bm-{int(time.time()*1000)}"
        biomarker["id"] = bid
        self.biomarkers[bid] = biomarker
        self.save_to_disk()
        return biomarker

    def list_biomarkers(self, patient_id: Optional[str] = None, household_id: Optional[str] = None) -> List[Dict[str, Any]]:
        res = list(self.biomarkers.values())
        if household_id:
            res = [b for b in res if b.get("householdId") == household_id]
        if patient_id:
            res = [b for b in res if b.get("patientId") == patient_id]
        return res

    # ==================== MEALS & AUDITS ====================

    def save_meal(self, meal: Dict[str, Any]) -> Dict[str, Any]:
        mid = meal.get("id") or f"meal-{int(time.time()*1000)}"
        meal["id"] = mid
        self.meals[mid] = meal
        self.save_to_disk()
        return meal

    def list_meals(self, household_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not household_id:
            return list(self.meals.values())
        return [m for m in self.meals.values() if m.get("householdId") == household_id]

    def update_meal_status(self, meal_id: str, status: str, notes: Optional[str] = None, reviewer: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if meal_id in self.meals:
            self.meals[meal_id]["approvalStatus"] = status
            if notes is not None:
                self.meals[meal_id]["dietitianNotes"] = notes
            if reviewer is not None:
                self.meals[meal_id]["dietitianReviewer"] = reviewer
            if status == "APPROVED_ACTIVE":
                self.meals[meal_id]["approvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            self.save_to_disk()
            return self.meals[meal_id]
        return None

    def save_plate_audit(self, audit: Dict[str, Any]) -> Dict[str, Any]:
        aid = audit.get("id") or f"audit-{int(time.time()*1000)}"
        audit["id"] = aid
        if "auditedAt" not in audit:
            audit["auditedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self.plate_audits[aid] = audit
        self.save_to_disk()
        return audit

    def list_plate_audits(self, household_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not household_id:
            return list(self.plate_audits.values())
        return [a for a in self.plate_audits.values() if a.get("householdId") == household_id]

    # ==================== GROCERY INVENTORY ====================

    def save_grocery_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        gid = item.get("id") or f"groc-{int(time.time()*1000)}"
        item["id"] = gid
        self.groceries[gid] = item
        self.save_to_disk()
        return item

    def list_groceries(self, household_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if not household_id:
            return list(self.groceries.values())
        return [g for g in self.groceries.values() if g.get("householdId") == household_id]

    def update_grocery_item(self, item_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if item_id in self.groceries:
            self.groceries[item_id].update(updates)
            self.save_to_disk()
            return self.groceries[item_id]
        return None

    # ==================== SEED DEMO DATA ====================

    def seed_data(self) -> Dict[str, Any]:
        """
        Seeds clinical and household demonstration data matching APAC specifications.
        """
        hh_id = "hh-prime"
        u1 = {
            "id": "usr-admin-1",
            "name": "Eleanor Vance",
            "email": "eleanor.vance@vitalplate.app",
            "age": 48,
            "gender": "Female",
            "roles": ["admin", "caregiver"],
            "isHomeHead": True,
            "householdId": hh_id,
        }
        u2 = {
            "id": "usr-cook-1",
            "name": "Maria Santos",
            "email": "maria.cook@vitalplate.app",
            "age": 36,
            "gender": "Female",
            "roles": ["cook"],
            "isHomeHead": False,
            "householdId": hh_id,
        }
        u3 = {
            "id": "usr-patient-1",
            "name": "Arthur Vance",
            "email": "arthur.vance@vitalplate.app",
            "age": 78,
            "gender": "Male",
            "roles": ["patient"],
            "isHomeHead": False,
            "householdId": hh_id,
        }

        household = {
            "id": hh_id,
            "homeCode": "VITAL-8821",
            "name": "Vance Residence",
            "region": "SINGAPORE",
            "memberIds": [u1["id"], u2["id"], u3["id"]],
            "activeCuisines": ["Hainanese Heritage", "Peranakan Balance", "Low-Sodium Teochew"],
            "activeAppliances": ["Rice Cooker (IH)", "Slow Cooker / Claypot", "Air Fryer"],
            "defaultCookLanguage": "Tagalog",
        }

        p1 = {
            "id": "pt-arthur",
            "householdId": hh_id,
            "name": "Arthur Vance",
            "age": 78,
            "primaryCondition": "Hypertension (Stage 2) & Mild Dysphagia",
            "secondaryConditions": ["Mild CKD Stage 3a", "Gout"],
            "textureNeeds": "Level 5 Minced & Moist (IDDSI)",
            "targetSodiumMg": 1200,
            "targetMaxGI": 55,
            "potassiumRestricted": True,
            "purineRestricted": True,
            "notes": "Elderly senior requiring soft steamed fish, low purine, and rich dashi/ginger flavor compensation.",
        }

        p2 = {
            "id": "pt-priya",
            "householdId": hh_id,
            "name": "Priya Sharma",
            "age": 29,
            "primaryCondition": "PCOS (Insulin Resistance Phenotype)",
            "secondaryConditions": ["Hyperandrogenism"],
            "textureNeeds": "Standard Whole Foods",
            "targetSodiumMg": 1800,
            "targetMaxGI": 48,
            "potassiumRestricted": False,
            "purineRestricted": False,
            "notes": "Target fasting insulin < 8 uIU/mL. Strict high-fiber low glycemic grain index.",
        }

        # Seed users & household
        self.save_user(u1)
        self.save_user(u2)
        self.save_user(u3)
        self.save_household(household)
        self.save_patient(p1)
        self.save_patient(p2)

        # Seed sample biomarkers
        b1 = {
            "id": "bm-1",
            "patientId": "pt-arthur",
            "householdId": hh_id,
            "markerName": "Serum Sodium",
            "category": "Electrolytes",
            "value": 144,
            "unit": "mmol/L",
            "referenceRange": "135 - 145 mmol/L",
            "status": "NORMAL",
            "clinicalSignificance": "Upper borderline. Strict table salt and hidden soy sauce restriction mandated.",
            "dateTested": "2026-10-10",
            "labProvider": "Singapore General Hospital Pathology",
        }
        b2 = {
            "id": "bm-2",
            "patientId": "pt-arthur",
            "householdId": hh_id,
            "markerName": "Serum Creatinine",
            "category": "Cardiovascular & Renal",
            "value": 1.45,
            "unit": "mg/dL",
            "referenceRange": "0.70 - 1.20 mg/dL",
            "status": "ELEVATED",
            "clinicalSignificance": "eGFR 48 mL/min indicates CKD Stage 3a. Limit total daily animal protein density.",
            "dateTested": "2026-10-10",
            "labProvider": "Singapore General Hospital Pathology",
        }
        b3 = {
            "id": "bm-3",
            "patientId": "pt-priya",
            "householdId": hh_id,
            "markerName": "Fasting Insulin",
            "category": "Metabolic & Glycemic",
            "value": 18.4,
            "unit": "uIU/mL",
            "referenceRange": "< 10.0 uIU/mL",
            "status": "CRITICAL_HIGH",
            "clinicalSignificance": "Severe hyperinsulinemia fueling ovarian androgen synthesis. Zero refined sugars.",
            "dateTested": "2026-10-12",
            "labProvider": "National University Hospital Lab",
        }
        self.save_biomarker(b1)
        self.save_biomarker(b2)
        self.save_biomarker(b3)

        # Seed sample meal items
        m1 = {
            "id": "m-1",
            "householdId": hh_id,
            "dayOfWeek": "Monday",
            "mealType": "LUNCH",
            "dishName": "Steamed Barramundi with Ginger Scallion Dashi & Foxtail Millet",
            "cuisine": "Hainanese Heritage",
            "baseRecipe": "Traditional steamed fish fillet with light soy, scallions, and fragrant jasmine rice.",
            "deltaDirectives": [
                "Swap white jasmine rice with 100% steamed foxtail millet (GI 54)",
                "Eliminate dark soy sauce; use kombu-shiitake dashi + freshly grated young ginger for umami",
                "Limit cold-pressed sesame oil to strictly 1/2 teaspoon for aroma only",
                "Steam barramundi until fork-tender (Level 5 Minced & Moist for Arthur)",
            ],
            "flavorCompensation": "Kombu dashi reduction + splash of calamansi zest provides salinity illusion without added sodium.",
            "textureGuidance": "Flake fillet into small 4mm bite-sized flakes with moist ginger broth.",
            "estimatedSodiumMg": 340,
            "estimatedGI": 48,
            "targetPatients": ["pt-arthur", "pt-priya"],
            "approvalStatus": "APPROVED_ACTIVE",
            "dietitianReviewer": "Dr. Sarah Chen, APD (Dietitians Association of Australia)",
            "dietitianNotes": "Exceptional low-sodium execution. Safe for Arthur's CKD and Priya's insulin resistance.",
            "approvedAt": "2026-10-14T08:30:00Z",
        }
        self.save_meal(m1)

        # Seed sample plate audit
        a1 = {
            "id": "aud-1",
            "householdId": hh_id,
            "mealPlanId": "m-1",
            "mealName": "Steamed Barramundi with Ginger Scallion Dashi",
            "imageUrl": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80",
            "overallAdherenceScore": 94,
            "adherenceTier": "OPTIMAL",
            "oilSheenScore": 2,
            "oilObservation": "Minimal glistening surface, no pooling oil droplets, perfectly steamed finish.",
            "fiberPercentage": 45,
            "proteinPercentage": 30,
            "carbPercentage": 25,
            "clinicalViolations": [],
            "positiveHighlights": [
                "Foxtail millet portion strictly controlled under 1 cup cooked volume",
                "Generous ginger shreds boosting digestive comfort and flavor without sodium",
                "Fish is thoroughly moist and easily flaked for senior chewing comfort",
            ],
            "cookFeedback": "Mahusay, Maria! The oil quantity was spot-on and the fish texture is soft and safe for lolo Arthur.",
            "auditedAt": "2026-10-15T12:45:00Z",
        }
        self.save_plate_audit(a1)

        # Seed sample grocery items
        g1 = {
            "id": "g-1",
            "householdId": hh_id,
            "name": "Foxtail Millet (Kangni / Thinai)",
            "category": "Grains & Millets",
            "quantityNeeded": "2 kg",
            "inPantryStock": True,
            "purchased": True,
            "clinicalReason": "Low-GI complex carb substitute for white rice (PCOS & Insulin Resistance)",
        }
        g2 = {
            "id": "g-2",
            "householdId": hh_id,
            "name": "Fresh Barramundi Fillets (Skin-on)",
            "category": "Proteins & Dal",
            "quantityNeeded": "600 g",
            "inPantryStock": False,
            "purchased": False,
            "clinicalReason": "High omega-3 lean marine protein with low purine burden",
        }
        g3 = {
            "id": "g-3",
            "householdId": hh_id,
            "name": "Dried Hokkaido Kombu Kelp",
            "category": "Condiments & Umami",
            "quantityNeeded": "1 packet (100g)",
            "inPantryStock": True,
            "purchased": True,
            "clinicalReason": "Natural glutamic umami base to replace sodium bouillon and salt",
        }
        self.save_grocery_item(g1)
        self.save_grocery_item(g2)
        self.save_grocery_item(g3)

        return {
            "household": household,
            "users": [u1, u2, u3],
            "patients": [p1, p2],
            "biomarkers": [b1, b2, b3],
            "meals": [m1],
            "plateAudits": [a1],
            "groceries": [g1, g2, g3],
        }

db_manager = DatabaseManager()

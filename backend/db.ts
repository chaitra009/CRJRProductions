import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { firebaseConfig, ROOT_DIR } from './config.js';

// Local disk cache fallback
const DB_FILE = path.resolve(ROOT_DIR, '.backend_db.json');

export interface HouseholdRecord {
  id: string;
  homeCode: string;
  name: string;
  region: string;
  memberIds: string[];
  activeCuisines: string[];
  activeAppliances: string[];
  defaultCookLanguage: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  roles: string[];
  isHomeHead: boolean;
  householdId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PatientProfile {
  id: string;
  householdId: string;
  name: string;
  age: number;
  primaryCondition: string;
  secondaryConditions?: string[];
  textureNeeds?: string;
  targetSodiumMg?: number;
  targetMaxGI?: number;
  potassiumRestricted?: boolean;
  purineRestricted?: boolean;
  notes?: string;
}

export interface BiomarkerRecord {
  id: string;
  patientId: string;
  householdId: string;
  markerName: string;
  category: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: string;
  clinicalSignificance: string;
  dateTested: string;
  labProvider?: string;
}

export interface MealPlanItem {
  id: string;
  householdId: string;
  dayOfWeek: string;
  mealType: string;
  dishName: string;
  cuisine: string;
  baseRecipe?: string;
  deltaDirectives: string[];
  flavorCompensation?: string;
  textureGuidance?: string;
  estimatedSodiumMg?: number;
  estimatedGI?: number;
  targetPatients: string[];
  approvalStatus: 'DRAFT_PENDING' | 'APPROVED_ACTIVE' | 'REVISION_REQUIRED';
  dietitianReviewer?: string;
  dietitianNotes?: string;
  approvedAt?: string;
}

export interface PlateAuditRecord {
  id: string;
  householdId: string;
  mealPlanId?: string;
  mealName: string;
  imageUrl?: string;
  overallAdherenceScore: number;
  adherenceTier: 'OPTIMAL' | 'ACCEPTABLE' | 'NON_COMPLIANT';
  oilSheenScore: number;
  oilObservation: string;
  fiberPercentage: number;
  proteinPercentage: number;
  carbPercentage: number;
  clinicalViolations: string[];
  positiveHighlights: string[];
  cookFeedback: string;
  auditedAt: string;
}

export interface GroceryItem {
  id: string;
  householdId: string;
  name: string;
  category: string;
  quantityNeeded: string;
  inPantryStock: boolean;
  purchased: boolean;
  clinicalReason: string;
}

class BackendDatabase {
  private firestore: Firestore | null = null;
  public isFirestoreConnected: boolean = false;
  public connectionError: string | null = null;

  // In-memory cache synced with disk and Firestore
  public households: Record<string, HouseholdRecord> = {};
  public users: Record<string, UserRecord> = {};
  public patients: Record<string, PatientProfile> = {};
  public biomarkers: Record<string, BiomarkerRecord> = {};
  public meals: Record<string, MealPlanItem> = {};
  public plateAudits: Record<string, PlateAuditRecord> = {};
  public groceries: Record<string, GroceryItem> = {};

  constructor() {
    this.initFirestore();
    this.loadFromDisk();
    if (Object.keys(this.households).length === 0) {
      this.seedData();
    }
  }

  /**
   * Initializes direct connection to Google Cloud Firestore using configured credentials.
   */
  public initFirestore(): void {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      this.firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      this.isFirestoreConnected = true;
      console.log(`[Backend DB] Connected to Firestore Database: ${firebaseConfig.firestoreDatabaseId}`);
    } catch (err: any) {
      this.isFirestoreConnected = false;
      this.connectionError = err.message;
      console.warn('[Backend DB] Firestore initialization notice:', err.message);
    }
  }

  public async testFirestore(): Promise<{ connected: boolean; databaseId: string; details: string }> {
    if (!this.firestore) {
      return {
        connected: false,
        databaseId: firebaseConfig.firestoreDatabaseId,
        details: this.connectionError || 'Firestore client not initialized',
      };
    }
    try {
      // Test read from Firestore
      const testRef = doc(this.firestore, 'test', 'connection');
      const snap = await getDoc(testRef);
      return {
        connected: true,
        databaseId: firebaseConfig.firestoreDatabaseId,
        details: `Connected to cloud firestore (doc exists: ${snap.exists()})`,
      };
    } catch (e: any) {
      // Reached database endpoint over network
      const isNetworkReachable = !e.message?.includes('the client is offline');
      return {
        connected: isNetworkReachable,
        databaseId: firebaseConfig.firestoreDatabaseId,
        details: e.message,
      };
    }
  }

  public loadFromDisk(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.households = data.households || {};
        this.users = data.users || {};
        this.patients = data.patients || {};
        this.biomarkers = data.biomarkers || {};
        this.meals = data.meals || {};
        this.plateAudits = data.plateAudits || {};
        this.groceries = data.groceries || {};
      }
    } catch (e) {
      console.warn('[Backend DB] Reading local cache:', e);
    }
  }

  public saveToDisk(): void {
    try {
      const data = {
        households: this.households,
        users: this.users,
        patients: this.patients,
        biomarkers: this.biomarkers,
        meals: this.meals,
        plateAudits: this.plateAudits,
        groceries: this.groceries,
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Backend DB] Error saving to disk:', e);
    }
  }

  // ==================== 1. HOUSEHOLDS ====================
  public async saveHousehold(hh: Partial<HouseholdRecord>): Promise<HouseholdRecord> {
    const id = hh.id || `hh-${Date.now()}`;
    const now = new Date().toISOString();
    const record: HouseholdRecord = {
      id,
      homeCode: (hh.homeCode || 'APAC-8421').trim().toUpperCase(),
      name: hh.name || 'Family Household',
      region: hh.region || 'SINGAPORE',
      memberIds: hh.memberIds || [],
      activeCuisines: hh.activeCuisines || ['Sino-Singaporean', 'Washoku (Japanese)'],
      activeAppliances: hh.activeAppliances || ['Rice Cooker (Porridge Mode)', 'Bamboo Steamer'],
      defaultCookLanguage: hh.defaultCookLanguage || 'Tagalog',
      createdAt: hh.createdAt || now,
      updatedAt: now,
    };

    this.households[id] = record;
    this.saveToDisk();

    // Async sync to live Firestore
    if (this.firestore) {
      setDoc(doc(this.firestore, 'households', id), record).catch((err) =>
        console.warn(`[Backend DB] Firestore sync households/${id} note:`, err.message)
      );
    }

    return record;
  }

  public getHousehold(id: string): HouseholdRecord | null {
    return this.households[id] || null;
  }

  public getHouseholdByCode(code: string): HouseholdRecord | null {
    const clean = code.trim().toUpperCase();
    return Object.values(this.households).find((h) => h.homeCode === clean) || null;
  }

  public listHouseholds(): HouseholdRecord[] {
    return Object.values(this.households);
  }

  // ==================== 2. USERS & MEMBERS ====================
  public async saveUser(u: Partial<UserRecord>): Promise<UserRecord> {
    const id = u.id || `usr-${Date.now()}`;
    const now = new Date().toISOString();
    const record: UserRecord = {
      id,
      name: u.name || 'Household Member',
      email: u.email || `${id}@vitalplate.app`,
      age: u.age || 40,
      gender: u.gender || 'Other',
      roles: u.roles && u.roles.length ? u.roles : ['caregiver'],
      isHomeHead: Boolean(u.isHomeHead),
      householdId: u.householdId,
      createdAt: u.createdAt || now,
      updatedAt: now,
    };

    this.users[id] = record;

    if (record.householdId && this.households[record.householdId]) {
      const hh = this.households[record.householdId];
      if (!hh.memberIds.includes(id)) {
        hh.memberIds.push(id);
      }
    }

    this.saveToDisk();

    if (this.firestore) {
      setDoc(doc(this.firestore, 'users', id), record).catch((err) =>
        console.warn(`[Backend DB] Firestore sync users/${id} note:`, err.message)
      );
    }

    return record;
  }

  public getUser(id: string): UserRecord | null {
    return this.users[id] || null;
  }

  public listUsers(householdId?: string): UserRecord[] {
    const list = Object.values(this.users);
    if (!householdId) return list;
    return list.filter((u) => u.householdId === householdId);
  }

  public async deleteUser(userId: string, householdId?: string): Promise<boolean> {
    let deleted = false;
    if (this.users[userId]) {
      delete this.users[userId];
      deleted = true;
    }
    if (householdId && this.households[householdId]) {
      const hh = this.households[householdId];
      hh.memberIds = hh.memberIds.filter((m) => m !== userId);
    }
    this.saveToDisk();

    if (this.firestore) {
      deleteDoc(doc(this.firestore, 'users', userId)).catch(() => {});
    }

    return deleted;
  }

  // ==================== 3. PATIENTS & BIOMARKERS ====================
  public async savePatient(p: Partial<PatientProfile>): Promise<PatientProfile> {
    const id = p.id || `pt-${Date.now()}`;
    const record: PatientProfile = {
      id,
      householdId: p.householdId || 'hh-prime',
      name: p.name || 'Patient',
      age: p.age || 60,
      primaryCondition: p.primaryCondition || 'Hypertension',
      secondaryConditions: p.secondaryConditions || [],
      textureNeeds: p.textureNeeds || 'Standard Whole Foods',
      targetSodiumMg: p.targetSodiumMg || 1400,
      targetMaxGI: p.targetMaxGI || 50,
      potassiumRestricted: Boolean(p.potassiumRestricted),
      purineRestricted: Boolean(p.purineRestricted),
      notes: p.notes || '',
    };

    this.patients[id] = record;
    this.saveToDisk();

    if (this.firestore) {
      setDoc(doc(this.firestore, 'households', record.householdId, 'patients', id), record).catch(() => {});
    }

    return record;
  }

  public listPatients(householdId?: string): PatientProfile[] {
    const list = Object.values(this.patients);
    if (!householdId) return list;
    return list.filter((p) => p.householdId === householdId);
  }

  public async saveBiomarker(b: Partial<BiomarkerRecord>): Promise<BiomarkerRecord> {
    const id = b.id || `bm-${Date.now()}`;
    const record: BiomarkerRecord = {
      id,
      patientId: b.patientId || 'pt-default',
      householdId: b.householdId || 'hh-prime',
      markerName: b.markerName || 'Biomarker',
      category: b.category || 'Metabolic & Glycemic',
      value: Number(b.value) || 0,
      unit: b.unit || '',
      referenceRange: b.referenceRange || '',
      status: b.status || 'NORMAL',
      clinicalSignificance: b.clinicalSignificance || '',
      dateTested: b.dateTested || new Date().toISOString().split('T')[0],
      labProvider: b.labProvider || 'Clinical Lab Diagnostics',
    };

    this.biomarkers[id] = record;
    this.saveToDisk();

    if (this.firestore) {
      setDoc(doc(this.firestore, 'households', record.householdId, 'biomarkers', id), record).catch(() => {});
    }

    return record;
  }

  public listBiomarkers(patientId?: string, householdId?: string): BiomarkerRecord[] {
    let list = Object.values(this.biomarkers);
    if (householdId) list = list.filter((b) => b.householdId === householdId);
    if (patientId) list = list.filter((b) => b.patientId === patientId);
    return list;
  }

  // ==================== 4. MEAL PLANS ====================
  public async saveMeal(m: Partial<MealPlanItem>): Promise<MealPlanItem> {
    const id = m.id || `meal-${Date.now()}`;
    const record: MealPlanItem = {
      id,
      householdId: m.householdId || 'hh-prime',
      dayOfWeek: m.dayOfWeek || 'Monday',
      mealType: m.mealType || 'LUNCH',
      dishName: m.dishName || 'Healthy Asian Dish',
      cuisine: m.cuisine || 'Sino-Singaporean',
      baseRecipe: m.baseRecipe || '',
      deltaDirectives: m.deltaDirectives || [],
      flavorCompensation: m.flavorCompensation || '',
      textureGuidance: m.textureGuidance || '',
      estimatedSodiumMg: m.estimatedSodiumMg || 380,
      estimatedGI: m.estimatedGI || 48,
      targetPatients: m.targetPatients || [],
      approvalStatus: m.approvalStatus || 'APPROVED_ACTIVE',
      dietitianReviewer: m.dietitianReviewer || '',
      dietitianNotes: m.dietitianNotes || '',
      approvedAt: m.approvedAt,
    };

    this.meals[id] = record;
    this.saveToDisk();

    if (this.firestore) {
      setDoc(doc(this.firestore, 'households', record.householdId, 'meal_plans', id), record).catch(() => {});
    }

    return record;
  }

  public listMeals(householdId?: string): MealPlanItem[] {
    const list = Object.values(this.meals);
    if (!householdId) return list;
    return list.filter((m) => m.householdId === householdId);
  }

  public async updateMealStatus(
    mealId: string,
    status: 'DRAFT_PENDING' | 'APPROVED_ACTIVE' | 'REVISION_REQUIRED',
    notes?: string,
    reviewer?: string
  ): Promise<MealPlanItem | null> {
    if (!this.meals[mealId]) return null;
    this.meals[mealId].approvalStatus = status;
    if (notes !== undefined) this.meals[mealId].dietitianNotes = notes;
    if (reviewer !== undefined) this.meals[mealId].dietitianReviewer = reviewer;
    if (status === 'APPROVED_ACTIVE') {
      this.meals[mealId].approvedAt = new Date().toISOString();
    }
    this.saveToDisk();

    if (this.firestore) {
      const hhId = this.meals[mealId].householdId;
      setDoc(doc(this.firestore, 'households', hhId, 'meal_plans', mealId), this.meals[mealId]).catch(() => {});
    }

    return this.meals[mealId];
  }

  // ==================== 5. PLATE AUDITS & GROCERIES ====================
  public async savePlateAudit(a: Partial<PlateAuditRecord>): Promise<PlateAuditRecord> {
    const id = a.id || `audit-${Date.now()}`;
    const record: PlateAuditRecord = {
      id,
      householdId: a.householdId || 'hh-prime',
      mealPlanId: a.mealPlanId,
      mealName: a.mealName || 'Audited Plate',
      imageUrl: a.imageUrl,
      overallAdherenceScore: a.overallAdherenceScore || 90,
      adherenceTier: a.adherenceTier || 'OPTIMAL',
      oilSheenScore: a.oilSheenScore || 2,
      oilObservation: a.oilObservation || 'Steamed finish with controlled surface oil sheen.',
      fiberPercentage: a.fiberPercentage || 45,
      proteinPercentage: a.proteinPercentage || 30,
      carbPercentage: a.carbPercentage || 25,
      clinicalViolations: a.clinicalViolations || [],
      positiveHighlights: a.positiveHighlights || ['Steamed technique followed accurately.'],
      cookFeedback: a.cookFeedback || 'Great execution conforming to clinical limits.',
      auditedAt: a.auditedAt || new Date().toISOString(),
    };

    this.plateAudits[id] = record;
    this.saveToDisk();

    if (this.firestore) {
      setDoc(doc(this.firestore, 'households', record.householdId, 'plate_audits', id), record).catch(() => {});
    }

    return record;
  }

  public listPlateAudits(householdId?: string): PlateAuditRecord[] {
    const list = Object.values(this.plateAudits);
    if (!householdId) return list;
    return list.filter((a) => a.householdId === householdId);
  }

  public async saveGroceryItem(g: Partial<GroceryItem>): Promise<GroceryItem> {
    const id = g.id || `groc-${Date.now()}`;
    const record: GroceryItem = {
      id,
      householdId: g.householdId || 'hh-prime',
      name: g.name || 'Kitchen Staple',
      category: g.category || 'Vegetables & Greens',
      quantityNeeded: g.quantityNeeded || '1 pack',
      inPantryStock: Boolean(g.inPantryStock),
      purchased: Boolean(g.purchased),
      clinicalReason: g.clinicalReason || 'Clinical dietary balance',
    };

    this.groceries[id] = record;
    this.saveToDisk();

    if (this.firestore) {
      setDoc(doc(this.firestore, 'households', record.householdId, 'grocery_inventory', id), record).catch(() => {});
    }

    return record;
  }

  public listGroceries(householdId?: string): GroceryItem[] {
    const list = Object.values(this.groceries);
    if (!householdId) return list;
    return list.filter((g) => g.householdId === householdId);
  }

  public async updateGroceryItem(id: string, updates: Partial<GroceryItem>): Promise<GroceryItem | null> {
    if (!this.groceries[id]) return null;
    this.groceries[id] = { ...this.groceries[id], ...updates };
    this.saveToDisk();

    if (this.firestore) {
      const hhId = this.groceries[id].householdId;
      setDoc(doc(this.firestore, 'households', hhId, 'grocery_inventory', id), this.groceries[id]).catch(() => {});
    }

    return this.groceries[id];
  }

  // ==================== SEED DEMO DATA ====================
  public seedData(): any {
    const hhId = 'hh-prime';

    const u1: UserRecord = {
      id: 'usr-admin-1',
      name: 'Eleanor Vance',
      email: 'eleanor.vance@vitalplate.app',
      age: 48,
      gender: 'Female',
      roles: ['admin', 'caregiver'],
      isHomeHead: true,
      householdId: hhId,
      createdAt: new Date().toISOString(),
    };

    const u2: UserRecord = {
      id: 'usr-cook-1',
      name: 'Maria Santos',
      email: 'maria.cook@vitalplate.app',
      age: 36,
      gender: 'Female',
      roles: ['cook'],
      isHomeHead: false,
      householdId: hhId,
      createdAt: new Date().toISOString(),
    };

    const u3: UserRecord = {
      id: 'usr-patient-1',
      name: 'Arthur Vance',
      email: 'arthur.vance@vitalplate.app',
      age: 78,
      gender: 'Male',
      roles: ['patient'],
      isHomeHead: false,
      householdId: hhId,
      createdAt: new Date().toISOString(),
    };

    const u4: UserRecord = {
      id: 'usr-dietitian-1',
      name: 'Dr. Sarah Chen, APD',
      email: 'sarah.chen@vitalplate.app',
      age: 42,
      gender: 'Female',
      roles: ['dietitian'],
      isHomeHead: false,
      householdId: hhId,
      createdAt: new Date().toISOString(),
    };

    const household: HouseholdRecord = {
      id: hhId,
      homeCode: 'APAC-8421',
      name: 'Vance Residence',
      region: 'SINGAPORE',
      memberIds: [u1.id, u2.id, u3.id, u4.id],
      activeCuisines: ['Hainanese Heritage', 'Washoku (Japanese)', 'Sino-Singaporean', 'South Indian'],
      activeAppliances: ['Rice Cooker (Porridge Mode)', 'Bamboo Steamer', 'Induction Cooktop', 'Slow Cooker'],
      defaultCookLanguage: 'Tagalog',
      createdAt: new Date().toISOString(),
    };

    const p1: PatientProfile = {
      id: 'pt-arthur',
      householdId: hhId,
      name: 'Arthur Vance',
      age: 78,
      primaryCondition: 'Hypertension (Stage 2) & Mild Dysphagia',
      secondaryConditions: ['Mild CKD Stage 3a', 'Gout Hyperuricemia'],
      textureNeeds: 'Level 5 Minced & Moist (IDDSI)',
      targetSodiumMg: 1200,
      targetMaxGI: 52,
      potassiumRestricted: true,
      purineRestricted: true,
      notes: 'Senior citizen post-stroke requiring soft steamed fish, low purine, and kombu dashi/calamansi umami flavor compensation without salt.',
    };

    const p2: PatientProfile = {
      id: 'pt-ananya',
      householdId: hhId,
      name: 'Ananya Vance',
      age: 28,
      primaryCondition: 'PCOS & High Insulin Resistance',
      secondaryConditions: ['Hyperinsulinemia', 'HOMA-IR 4.2'],
      textureNeeds: 'Standard Whole Foods',
      targetSodiumMg: 1500,
      targetMaxGI: 48,
      potassiumRestricted: false,
      purineRestricted: false,
      notes: 'Target fasting insulin < 10 uIU/mL. Strict high-fiber low glycemic grain index (foxtail millet, barley).',
    };

    this.saveUser(u1);
    this.saveUser(u2);
    this.saveUser(u3);
    this.saveUser(u4);
    this.saveHousehold(household);
    this.savePatient(p1);
    this.savePatient(p2);

    const b1: BiomarkerRecord = {
      id: 'bm-1',
      patientId: 'pt-arthur',
      householdId: hhId,
      markerName: 'Serum Sodium',
      category: 'Electrolytes',
      value: 144,
      unit: 'mmol/L',
      referenceRange: '135 - 145 mmol/L',
      status: 'NORMAL',
      clinicalSignificance: 'Upper borderline. Strict table salt and hidden soy sauce restriction mandated.',
      dateTested: '2026-10-10',
      labProvider: 'Singapore General Hospital Pathology',
    };

    const b2: BiomarkerRecord = {
      id: 'bm-2',
      patientId: 'pt-arthur',
      householdId: hhId,
      markerName: 'Serum Creatinine',
      category: 'Cardiovascular & Renal',
      value: 1.45,
      unit: 'mg/dL',
      referenceRange: '0.70 - 1.20 mg/dL',
      status: 'ELEVATED',
      clinicalSignificance: 'eGFR 48 mL/min indicates CKD Stage 3a. Limit total daily animal protein density.',
      dateTested: '2026-10-10',
      labProvider: 'Singapore General Hospital Pathology',
    };

    const b3: BiomarkerRecord = {
      id: 'bm-3',
      patientId: 'pt-ananya',
      householdId: hhId,
      markerName: 'Fasting Insulin',
      category: 'Metabolic & Glycemic',
      value: 24.0,
      unit: 'uIU/mL',
      referenceRange: '< 10.0 uIU/mL',
      status: 'CRITICAL_HIGH',
      clinicalSignificance: 'Severe hyperinsulinemia (HOMA-IR 4.2) fueling ovarian androgen synthesis. Zero refined sugars.',
      dateTested: '2026-10-12',
      labProvider: 'National University Hospital Lab',
    };

    this.saveBiomarker(b1);
    this.saveBiomarker(b2);
    this.saveBiomarker(b3);

    const m1: MealPlanItem = {
      id: 'm-1',
      householdId: hhId,
      dayOfWeek: 'Monday',
      mealType: 'LUNCH',
      dishName: 'Steamed Barramundi with Ginger Scallion Dashi & Foxtail Millet',
      cuisine: 'Hainanese Heritage',
      baseRecipe: 'Traditional steamed fish fillet with light soy, scallions, and fragrant jasmine rice.',
      deltaDirectives: [
        'Swap white jasmine rice with 100% steamed foxtail millet (GI 54)',
        'Eliminate dark soy sauce; use kombu-shiitake dashi + freshly grated young ginger for umami',
        'Limit cold-pressed sesame oil to strictly 1/2 teaspoon for aroma only',
        'Steam barramundi until fork-tender (Level 5 Minced & Moist for Arthur)',
      ],
      flavorCompensation: 'Kombu dashi reduction + splash of calamansi zest provides salinity illusion without added sodium.',
      textureGuidance: 'Flake fillet into small 4mm bite-sized flakes with moist ginger broth.',
      estimatedSodiumMg: 340,
      estimatedGI: 48,
      targetPatients: ['pt-arthur', 'pt-ananya'],
      approvalStatus: 'APPROVED_ACTIVE',
      dietitianReviewer: 'Dr. Sarah Chen, APD (Dietitians Association of Australia)',
      dietitianNotes: 'Exceptional low-sodium execution. Safe for Arthur CKD/hypertension and Ananya insulin resistance.',
      approvedAt: new Date().toISOString(),
    };

    this.saveMeal(m1);

    const g1: GroceryItem = {
      id: 'g-1',
      householdId: hhId,
      name: 'Foxtail Millet (Kangni / Thinai)',
      category: 'Grains & Millets',
      quantityNeeded: '2 kg',
      inPantryStock: true,
      purchased: true,
      clinicalReason: 'Low-GI complex carb substitute for white rice (PCOS & Insulin Resistance)',
    };

    this.saveGroceryItem(g1);

    return {
      household,
      users: [u1, u2, u3, u4],
      patients: [p1, p2],
      biomarkers: [b1, b2, b3],
      meals: [m1],
      groceries: [g1],
    };
  }
}

export const backendDb = new BackendDatabase();

import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), '.backend_db.json');

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

class DatabaseManager {
  public households: Record<string, HouseholdRecord> = {};
  public users: Record<string, UserRecord> = {};
  public patients: Record<string, PatientProfile> = {};
  public biomarkers: Record<string, BiomarkerRecord> = {};
  public meals: Record<string, MealPlanItem> = {};
  public plateAudits: Record<string, PlateAuditRecord> = {};
  public groceries: Record<string, GroceryItem> = {};

  constructor() {
    this.loadFromDisk();
    if (Object.keys(this.households).length === 0) {
      this.seedData();
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
      console.warn('[Backend DB] Error reading DB file, starting fresh:', e);
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
      console.error('[Backend DB] Error saving DB to disk:', e);
    }
  }

  // ==================== HOUSEHOLDS ====================
  public saveHousehold(hh: Partial<HouseholdRecord>): HouseholdRecord {
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

  // ==================== USERS ====================
  public saveUser(u: Partial<UserRecord>): UserRecord {
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

  public deleteUser(userId: string, householdId?: string): boolean {
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
    return deleted;
  }

  // ==================== PATIENTS & BIOMARKERS ====================
  public savePatient(p: Partial<PatientProfile>): PatientProfile {
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
    return record;
  }

  public listPatients(householdId?: string): PatientProfile[] {
    const list = Object.values(this.patients);
    if (!householdId) return list;
    return list.filter((p) => p.householdId === householdId);
  }

  public saveBiomarker(b: Partial<BiomarkerRecord>): BiomarkerRecord {
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
    return record;
  }

  public listBiomarkers(patientId?: string, householdId?: string): BiomarkerRecord[] {
    let list = Object.values(this.biomarkers);
    if (householdId) list = list.filter((b) => b.householdId === householdId);
    if (patientId) list = list.filter((b) => b.patientId === patientId);
    return list;
  }

  // ==================== MEALS & AUDITS ====================
  public saveMeal(m: Partial<MealPlanItem>): MealPlanItem {
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
    return record;
  }

  public listMeals(householdId?: string): MealPlanItem[] {
    const list = Object.values(this.meals);
    if (!householdId) return list;
    return list.filter((m) => m.householdId === householdId);
  }

  public updateMealStatus(
    mealId: string,
    status: 'DRAFT_PENDING' | 'APPROVED_ACTIVE' | 'REVISION_REQUIRED',
    notes?: string,
    reviewer?: string
  ): MealPlanItem | null {
    if (!this.meals[mealId]) return null;
    this.meals[mealId].approvalStatus = status;
    if (notes !== undefined) this.meals[mealId].dietitianNotes = notes;
    if (reviewer !== undefined) this.meals[mealId].dietitianReviewer = reviewer;
    if (status === 'APPROVED_ACTIVE') {
      this.meals[mealId].approvedAt = new Date().toISOString();
    }
    this.saveToDisk();
    return this.meals[mealId];
  }

  public savePlateAudit(a: Partial<PlateAuditRecord>): PlateAuditRecord {
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
    return record;
  }

  public listPlateAudits(householdId?: string): PlateAuditRecord[] {
    const list = Object.values(this.plateAudits);
    if (!householdId) return list;
    return list.filter((a) => a.householdId === householdId);
  }

  // ==================== GROCERY ====================
  public saveGroceryItem(g: Partial<GroceryItem>): GroceryItem {
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
    return record;
  }

  public listGroceries(householdId?: string): GroceryItem[] {
    const list = Object.values(this.groceries);
    if (!householdId) return list;
    return list.filter((g) => g.householdId === householdId);
  }

  public updateGroceryItem(id: string, updates: Partial<GroceryItem>): GroceryItem | null {
    if (!this.groceries[id]) return null;
    this.groceries[id] = { ...this.groceries[id], ...updates };
    this.saveToDisk();
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

    const m2: MealPlanItem = {
      id: 'm-2',
      householdId: hhId,
      dayOfWeek: 'Tuesday',
      mealType: 'DINNER',
      dishName: 'Miso-Simmered Silk Tofu & Kabocha Squash in Kelp Broth',
      cuisine: 'Washoku (Japanese)',
      baseRecipe: 'Simmered tofu with sweet mirin sauce, shoyu, and white sticky rice.',
      deltaDirectives: [
        'Substitute white polished rice with rolled barley & foxtail millet blend',
        'Use white low-sodium koji miso (max 1 tsp) diluted in intense kombu dashi',
        'Simmer kabocha squash until velvet-soft for senior chewing ease',
        'Add finely slivered myoga and yuzu peel for vibrant aromatic lift without salt',
      ],
      flavorCompensation: 'Toasted sesame oil mist (1 drop) + yuzu zest mimics rich savoriness without sodium overload.',
      textureGuidance: 'Ultra-tender squash and silky tofu naturally suited for Level 5 swallowing safety.',
      estimatedSodiumMg: 290,
      estimatedGI: 45,
      targetPatients: ['pt-arthur'],
      approvalStatus: 'APPROVED_ACTIVE',
      dietitianReviewer: 'Dr. Sarah Chen, APD',
      dietitianNotes: 'Verified ultra-low purine and sodium. High soluble fiber promotes gentle glycemic response.',
      approvedAt: new Date().toISOString(),
    };

    const m3: MealPlanItem = {
      id: 'm-3',
      householdId: hhId,
      dayOfWeek: 'Wednesday',
      mealType: 'LUNCH',
      dishName: 'Spiced Bitter Gourd (Karela) & Moong Dal with Ragi Roti',
      cuisine: 'South Indian',
      baseRecipe: 'Fried bitter gourd with tamarind jaggery gravy and white rice.',
      deltaDirectives: [
        'Omit jaggery sugar entirely; utilize roasted cumin and amchur (dry mango powder) for tang',
        'Steam bitter gourd slices lightly before dry-roasting with minimal mustard oil (1/2 tsp)',
        'Pair with split yellow moong dal cooked with turmeric and hing (asafoetida)',
        'Swap refined wheat or rice with high-fiber finger millet (Ragi) soft phulka',
      ],
      flavorCompensation: 'Roasted cumin, carom seeds (ajwain), and freshly squeezed lime mask bitterness naturally.',
      textureGuidance: 'Moong dal whisked smooth and warm; soft ragi roti torn into bite-size pieces.',
      estimatedSodiumMg: 310,
      estimatedGI: 42,
      targetPatients: ['pt-ananya', 'pt-arthur'],
      approvalStatus: 'DRAFT_PENDING',
      dietitianReviewer: '',
      dietitianNotes: 'Pending final sodium check on dal tempering.',
    };

    this.saveMeal(m1);
    this.saveMeal(m2);
    this.saveMeal(m3);

    const a1: PlateAuditRecord = {
      id: 'aud-1',
      householdId: hhId,
      mealPlanId: 'm-1',
      mealName: 'Steamed Barramundi with Ginger Scallion Dashi',
      imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=80',
      overallAdherenceScore: 94,
      adherenceTier: 'OPTIMAL',
      oilSheenScore: 2,
      oilObservation: 'Minimal glistening surface, no pooling oil droplets, perfectly steamed finish.',
      fiberPercentage: 45,
      proteinPercentage: 30,
      carbPercentage: 25,
      clinicalViolations: [],
      positiveHighlights: [
        'Foxtail millet portion strictly controlled under 1 cup cooked volume',
        'Generous ginger shreds boosting digestive comfort and flavor without sodium',
        'Fish is thoroughly moist and easily flaked for senior chewing comfort',
      ],
      cookFeedback: 'Mahusay, Maria! The oil quantity was spot-on and the fish texture is soft and safe for lolo Arthur.',
      auditedAt: new Date().toISOString(),
    };
    this.savePlateAudit(a1);

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

    const g2: GroceryItem = {
      id: 'g-2',
      householdId: hhId,
      name: 'Fresh Barramundi Fillets (Skin-on)',
      category: 'Proteins & Dal',
      quantityNeeded: '600 g',
      inPantryStock: false,
      purchased: false,
      clinicalReason: 'High omega-3 lean marine protein with low purine burden',
    };

    const g3: GroceryItem = {
      id: 'g-3',
      householdId: hhId,
      name: 'Dried Hokkaido Kombu Kelp',
      category: 'Condiments & Umami',
      quantityNeeded: '1 packet (100g)',
      inPantryStock: true,
      purchased: true,
      clinicalReason: 'Natural glutamic umami base to replace sodium bouillon and salt',
    };

    const g4: GroceryItem = {
      id: 'g-4',
      householdId: hhId,
      name: 'Fresh Calamansi / Lime',
      category: 'Produce & Aromatics',
      quantityNeeded: '1 bag',
      inPantryStock: true,
      purchased: true,
      clinicalReason: 'Acidic citrus bite creates taste illusion of salinity without sodium',
    };

    this.saveGroceryItem(g1);
    this.saveGroceryItem(g2);
    this.saveGroceryItem(g3);
    this.saveGroceryItem(g4);

    return {
      household,
      users: [u1, u2, u3, u4],
      patients: [p1, p2],
      biomarkers: [b1, b2, b3],
      meals: [m1, m2, m3],
      plateAudits: [a1],
      groceries: [g1, g2, g3, g4],
    };
  }
}

export const dbManager = new DatabaseManager();

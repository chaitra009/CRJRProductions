export type UserRole = 'admin' | 'caregiver' | 'cook' | 'dietitian' | 'patient';

export type RegionalRegion = 'SINGAPORE' | 'JAPAN' | 'INDIA' | 'SOUTHEAST_ASIA';

export type SupportedDialect =
  | 'Tagalog'
  | 'Japanese'
  | 'Mandarin'
  | 'Bahasa Indonesia'
  | 'Tamil'
  | 'Hindi'
  | 'Kannada'
  | 'English';

export interface HouseholdRecord {
  id: string;
  homeCode: string;
  name: string;
  region: RegionalRegion;
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
  roles: UserRole[];
  isHomeHead: boolean;
  householdId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HouseholdMemberInfo {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  roles: UserRole[];
  isHomeHead: boolean;
  preferredLanguage?: string;
  patientId?: string;
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
  category: 'Metabolic & Glycemic' | 'Cardiovascular & Renal' | 'Electrolytes' | 'Lipid Profile' | 'Hormonal & PCOS';
  value: number;
  unit: string;
  referenceRange: string;
  status: 'NORMAL' | 'ELEVATED' | 'CRITICAL_HIGH' | 'LOW';
  clinicalSignificance: string;
  dateTested: string;
  labProvider?: string;
}

export interface MealPlanItem {
  id: string;
  householdId: string;
  dayOfWeek: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
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
  category: 'Grains & Millets' | 'Proteins & Dal' | 'Vegetables & Greens' | 'Condiments & Umami' | 'Produce & Aromatics';
  quantityNeeded: string;
  inPantryStock: boolean;
  purchased: boolean;
  clinicalReason: string;
}

export interface AudioBriefingData {
  scriptInDialect: string;
  scriptPhonetic: string;
  scriptEnglishTranslation: string;
  flavorCompensationTip: string;
  audioBase64: string | null;
  mimeType: string;
}

export interface IngredientSwapResult {
  missingIngredient: string;
  clinicalRiskOfOriginal: string;
  bestSwap: {
    substituteName: string;
    ratio: string;
    flavorProfileNote: string;
    clinicalBenefit: string;
  };
  alternativeSwaps: Array<{
    substituteName: string;
    ratio: string;
    notes: string;
  }>;
  cookDialectInstruction: string;
}

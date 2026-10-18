/**
 * VitalPlate APAC - Frontend API Client
 * Connects frontend to the Unified Node.js backend via /api/*
 */

import {
  HouseholdRecord,
  UserRecord,
  PatientProfile,
  BiomarkerRecord,
  MealPlanItem,
  PlateAuditRecord,
  GroceryItem,
  AudioBriefingData,
  IngredientSwapResult,
} from '../types';

export interface BackendHealthResponse {
  status: string;
  service: string;
  pythonVersion: string;
  hasGeminiApiKey: boolean;
  firestoreProjectId: string;
  firestoreDatabaseId: string;
  stats: {
    householdsCount: number;
    usersCount: number;
    patientsCount: number;
    mealsCount: number;
    plateAuditsCount: number;
  };
  timestamp: string;
}

export interface BackendArchitectureModule {
  name: string;
  framework: string;
  capabilities?: string[];
  entities?: string[];
  endpoints?: string[];
}

export interface BackendArchitectureResponse {
  architecture: string;
  modules: BackendArchitectureModule[];
  frontendIntegration: string;
}

// Helper fetch wrapper
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`API Error [${response.status}] ${response.statusText}: ${errorBody}`);
  }

  return response.json();
}

// 1. Health & Architecture Inspection
export async function getBackendHealth(): Promise<BackendHealthResponse> {
  return apiFetch<BackendHealthResponse>('/api/health');
}

export async function getBackendArchitecture(): Promise<BackendArchitectureResponse> {
  return apiFetch<BackendArchitectureResponse>('/api/backend/architecture');
}

// 2. AI Intelligence Endpoints
export async function parseLabReport(payload: {
  imageBase64?: string;
  mimeType?: string;
  textContent?: string;
}): Promise<{ success: boolean; data: any }> {
  return apiFetch('/api/parse-lab', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function auditMealPlate(payload: {
  imageBase64: string;
  mimeType?: string;
  patientProfile?: any;
  plannedMealName?: string;
}): Promise<{ success: boolean; data: any }> {
  return apiFetch('/api/audit-plate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestIngredientSwap(payload: {
  missingIngredient: string;
  dishName: string;
  cuisine: string;
  clinicalConstraints?: any;
  dialect?: string;
}): Promise<{ success: boolean; data: IngredientSwapResult }> {
  return apiFetch('/api/ingredient-swap', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestAudioBriefing(payload: {
  mealName: string;
  cuisine: string;
  deltaInstructions: string[];
  dialect?: string;
  voiceName?: string;
}): Promise<{ success: boolean; data: AudioBriefingData }> {
  return apiFetch('/api/audio-briefing', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reindexMealQueue(payload: {
  guardrails: any;
  currentMeals: MealPlanItem[];
  patientProfiles: PatientProfile[];
}): Promise<{ success: boolean; data: { reindexedMeals: MealPlanItem[]; clinicalSynthesisNote: string } }> {
  return apiFetch('/api/reindex-meals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 3. Database & Entity Persistence Endpoints
export async function fetchHouseholds(): Promise<HouseholdRecord[]> {
  const res = await apiFetch<{ success: boolean; data: HouseholdRecord[] }>('/api/households');
  return res.data || [];
}

export async function createOrUpdateHousehold(household: HouseholdRecord): Promise<HouseholdRecord> {
  const res = await apiFetch<{ success: boolean; data: HouseholdRecord }>('/api/households', {
    method: 'POST',
    body: JSON.stringify(household),
  });
  return res.data;
}

export async function fetchHouseholdByCodeOrId(idOrCode: string): Promise<HouseholdRecord | null> {
  try {
    const res = await apiFetch<{ success: boolean; data: HouseholdRecord }>(`/api/households/${encodeURIComponent(idOrCode)}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchUsers(householdId?: string): Promise<UserRecord[]> {
  const url = householdId ? `/api/users?householdId=${encodeURIComponent(householdId)}` : '/api/users';
  const res = await apiFetch<{ success: boolean; data: UserRecord[] }>(url);
  return res.data || [];
}

export async function createOrUpdateUser(user: UserRecord): Promise<UserRecord> {
  const res = await apiFetch<{ success: boolean; data: UserRecord }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
  return res.data;
}

export async function deleteUser(userId: string, householdId?: string): Promise<boolean> {
  const url = householdId
    ? `/api/users/${encodeURIComponent(userId)}?householdId=${encodeURIComponent(householdId)}`
    : `/api/users/${encodeURIComponent(userId)}`;
  const res = await apiFetch<{ success: boolean }>(url, { method: 'DELETE' });
  return Boolean(res.success);
}

export async function fetchPatients(householdId?: string): Promise<PatientProfile[]> {
  const url = householdId ? `/api/patients?householdId=${encodeURIComponent(householdId)}` : '/api/patients';
  const res = await apiFetch<{ success: boolean; data: PatientProfile[] }>(url);
  return res.data || [];
}

export async function createOrUpdatePatient(patient: PatientProfile): Promise<PatientProfile> {
  const res = await apiFetch<{ success: boolean; data: PatientProfile }>('/api/patients', {
    method: 'POST',
    body: JSON.stringify(patient),
  });
  return res.data;
}

export async function fetchBiomarkers(patientId?: string, householdId?: string): Promise<BiomarkerRecord[]> {
  let url = '/api/biomarkers';
  const params = new URLSearchParams();
  if (patientId) params.append('patientId', patientId);
  if (householdId) params.append('householdId', householdId);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await apiFetch<{ success: boolean; data: BiomarkerRecord[] }>(url);
  return res.data || [];
}

export async function createOrUpdateBiomarker(biomarker: BiomarkerRecord): Promise<BiomarkerRecord> {
  const res = await apiFetch<{ success: boolean; data: BiomarkerRecord }>('/api/biomarkers', {
    method: 'POST',
    body: JSON.stringify(biomarker),
  });
  return res.data;
}

export async function fetchMeals(householdId?: string): Promise<MealPlanItem[]> {
  const url = householdId ? `/api/meals?householdId=${encodeURIComponent(householdId)}` : '/api/meals';
  const res = await apiFetch<{ success: boolean; data: MealPlanItem[] }>(url);
  return res.data || [];
}

export async function createOrUpdateMeal(meal: MealPlanItem): Promise<MealPlanItem> {
  const res = await apiFetch<{ success: boolean; data: MealPlanItem }>('/api/meals', {
    method: 'POST',
    body: JSON.stringify(meal),
  });
  return res.data;
}

export async function updateMealStatus(mealId: string, status: string, notes?: string, reviewer?: string): Promise<MealPlanItem> {
  const res = await apiFetch<{ success: boolean; data: MealPlanItem }>(`/api/meals/${encodeURIComponent(mealId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes, reviewer }),
  });
  return res.data;
}

export async function fetchPlateAudits(householdId?: string): Promise<PlateAuditRecord[]> {
  const url = householdId ? `/api/plate-audits?householdId=${encodeURIComponent(householdId)}` : '/api/plate-audits';
  const res = await apiFetch<{ success: boolean; data: PlateAuditRecord[] }>(url);
  return res.data || [];
}

export async function createPlateAudit(audit: PlateAuditRecord): Promise<PlateAuditRecord> {
  const res = await apiFetch<{ success: boolean; data: PlateAuditRecord }>('/api/plate-audits', {
    method: 'POST',
    body: JSON.stringify(audit),
  });
  return res.data;
}

export async function fetchGroceries(householdId?: string): Promise<GroceryItem[]> {
  const url = householdId ? `/api/grocery?householdId=${encodeURIComponent(householdId)}` : '/api/grocery';
  const res = await apiFetch<{ success: boolean; data: GroceryItem[] }>(url);
  return res.data || [];
}

export async function createGroceryItem(item: GroceryItem): Promise<GroceryItem> {
  const res = await apiFetch<{ success: boolean; data: GroceryItem }>('/api/grocery', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return res.data;
}

export async function updateGroceryItem(itemId: string, updates: Partial<GroceryItem>): Promise<GroceryItem> {
  const res = await apiFetch<{ success: boolean; data: GroceryItem }>(`/api/grocery/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function seedDemoDatabase(): Promise<any> {
  const res = await apiFetch<{ success: boolean; data: any; message: string }>('/api/seed', {
    method: 'POST',
  });
  return res.data;
}

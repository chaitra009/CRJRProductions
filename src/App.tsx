import React, { useState, useEffect } from 'react';
import {
  UserRole,
  RegionalRegion,
  SupportedDialect,
  PatientProfile,
  BiomarkerRecord,
  MealPlanItem,
  GroceryItem,
  PlateAuditRecord,
  HouseholdMemberInfo,
  UserRecord,
  HouseholdRecord,
} from './types';
import { Header } from './components/Header';
import { Breadcrumb } from './components/Breadcrumb';
import { LoginPage } from './components/LoginPage';
import { RoleOnboardingPage } from './components/RoleOnboardingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CaregiverConsole } from './components/CaregiverConsole';
import { CookStation } from './components/CookStation';
import { DietitianConsole } from './components/DietitianConsole';
import { PatientView } from './components/PatientView';
import { AdminConsole } from './components/AdminConsole';
import { DatabaseViewer } from './components/DatabaseViewer';
import { BackendInspectorModal } from './components/BackendInspectorModal';
import { testConnection, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  saveHouseholdRecord,
  saveUserRecord,
  getHouseholdByCode,
  getHouseholdUsers,
} from './services/dbService';
import {
  fetchHouseholds,
  fetchUsers,
  fetchPatients,
  fetchBiomarkers,
  fetchMeals,
  fetchGroceries,
  fetchPlateAudits,
  updateMealStatus,
  createOrUpdateBiomarker,
  createOrUpdateHousehold,
  createOrUpdateUser,
  deleteUser as apiDeleteUser,
  createGroceryItem,
  updateGroceryItem,
  createPlateAudit,
} from './services/backendApi';
import {
  SAMPLE_PATIENTS,
  SAMPLE_BIOMARKERS,
  SAMPLE_MEALS,
  SAMPLE_GROCERIES,
} from './data/sampleData';

interface AuthUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: UserRole;
  isHomeHead?: boolean;
  needsFirstStep?: boolean;
}

export default function App() {
  // Auth state defaults to authorized user for immediate live interactive preview
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>({
    uid: 'usr-admin-1',
    email: 'eleanor.vance@vitalplate.app',
    displayName: 'Eleanor Vance (Family Caregiver)',
    role: 'caregiver',
    isHomeHead: true,
    needsFirstStep: false,
  });

  const [needsFirstStep, setNeedsFirstStep] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showDbInspector, setShowDbInspector] = useState<boolean>(false);
  const [showBackendInspector, setShowBackendInspector] = useState<boolean>(false);

  // Active Role and Navigation
  const [currentRole, setCurrentRole] = useState<UserRole>('caregiver');
  const [homeName, setHomeName] = useState<string>('Vance Residence');
  const [homeCode, setHomeCode] = useState<string>('APAC-8421');
  const [householdRegion, setHouseholdRegion] = useState<RegionalRegion>('SINGAPORE');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([
    'Hainanese Heritage',
    'Washoku (Japanese)',
    'South Indian',
  ]);
  const [activeAppliances, setActiveAppliances] = useState<string[]>([
    'Rice Cooker (Porridge Mode)',
    'Bamboo Steamer',
    'Induction Cooktop',
  ]);
  const [cookLanguage, setCookLanguage] = useState<string>('Tagalog');
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState<boolean>(false);

  // Entities state
  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>(SAMPLE_PATIENTS);
  const [biomarkers, setBiomarkers] = useState<BiomarkerRecord[]>(SAMPLE_BIOMARKERS);
  const [meals, setMeals] = useState<MealPlanItem[]>(SAMPLE_MEALS);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(SAMPLE_GROCERIES);
  const [plateAudits, setPlateAudits] = useState<PlateAuditRecord[]>([]);

  // Initial load & Firestore connection check
  const loadBackendData = async () => {
    try {
      const [hhs, usrs, pts, bms, mls, grocs, auds] = await Promise.all([
        fetchHouseholds().catch(() => []),
        fetchUsers().catch(() => []),
        fetchPatients().catch(() => SAMPLE_PATIENTS),
        fetchBiomarkers().catch(() => SAMPLE_BIOMARKERS),
        fetchMeals().catch(() => SAMPLE_MEALS),
        fetchGroceries().catch(() => SAMPLE_GROCERIES),
        fetchPlateAudits().catch(() => []),
      ]);

      if (hhs.length > 0) {
        setHouseholds(hhs);
        setHomeName(hhs[0].name);
        setHomeCode(hhs[0].homeCode);
        setHouseholdRegion(hhs[0].region as any);
        if (hhs[0].defaultCookLanguage) setCookLanguage(hhs[0].defaultCookLanguage);
      }
      if (usrs.length > 0) setUsers(usrs);
      if (pts.length > 0) setPatients(pts);
      if (bms.length > 0) setBiomarkers(bms);
      if (mls.length > 0) setMeals(mls);
      if (grocs.length > 0) setGroceryItems(grocs);
      if (auds.length > 0) setPlateAudits(auds);
    } catch (err) {
      console.warn('Initial data load notice:', err);
    }
  };

  useEffect(() => {
    testConnection().then((connected) => {
      setIsDbConnected(connected);
    });

    loadBackendData();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'user@vitalplate.app',
          displayName: firebaseUser.displayName || 'Authorized User',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'caregiver',
          isHomeHead: true,
          needsFirstStep: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {}
    setCurrentUser(null);
    setNeedsFirstStep(false);
  };

  const handleLoginSuccess = async (profile: AuthUserProfile) => {
    setCurrentUser(profile);
    if (profile.role) {
      setCurrentRole(profile.role);
    }
    if (profile.needsFirstStep) {
      setNeedsFirstStep(true);
    } else {
      setNeedsFirstStep(false);
    }
  };

  // Generation of Household Diet via Vertex / Gemini AI
  const handleGenerateHouseholdDiet = async () => {
    setIsGeneratingDiet(true);
    try {
      const res = await fetch('/api/generate-household-diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: households[0]?.id || 'hh-prime',
          householdName: homeName,
          region: householdRegion,
          patients,
          biomarkers,
          availableCuisines: activeCuisines,
          availableAppliances: activeAppliances,
        }),
      });

      const json = await res.json();
      if (json.success && json.data.meals) {
        setMeals(json.data.meals);
        // Switch to Dietitian Console or show notification so Dietitian signs off
        alert(
          `Cuisine Analysis Complete!\n${json.data.clinicalSummary}\n\nGenerated ${json.data.meals.length} dishes in DRAFT_PENDING. Switched to Dietitian Gatekeeper for clinical review and sign-off.`
        );
        setCurrentRole('dietitian');
      }
    } catch (e: any) {
      console.error('Diet generation error:', e);
    } finally {
      setIsGeneratingDiet(false);
    }
  };

  // Dietitian Gatekeeper Sign-off
  const handleUpdateMealApproval = async (
    mealId: string,
    status: 'APPROVED_ACTIVE' | 'REVISION_REQUIRED' | 'DRAFT_PENDING',
    notes?: string
  ) => {
    try {
      const updated = await updateMealStatus(mealId, status, notes, 'Dr. Sarah Chen, APD');
      setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, ...updated } : m)));
    } catch {
      // Local fallback
      setMeals((prev) =>
        prev.map((m) =>
          m.id === mealId
            ? {
                ...m,
                approvalStatus: status,
                dietitianNotes: notes,
                dietitianReviewer: 'Dr. Sarah Chen, APD',
                approvedAt: status === 'APPROVED_ACTIVE' ? new Date().toISOString() : undefined,
              }
            : m
        )
      );
    }
  };

  const handleAddBiomarker = async (record: BiomarkerRecord) => {
    try {
      await createOrUpdateBiomarker(record);
    } catch {}
    setBiomarkers((prev) => [record, ...prev]);
  };

  const handleAddMember = async (member: {
    name: string;
    email: string;
    age: number;
    gender: string;
    roles: UserRole[];
    isHomeHead: boolean;
  }) => {
    const newUser: UserRecord = {
      id: `usr-${Date.now()}`,
      householdId: households[0]?.id || 'hh-prime',
      createdAt: new Date().toISOString(),
      ...member,
    };
    try {
      await createOrUpdateUser(newUser);
    } catch {}
    setUsers((prev) => [...prev, newUser]);
  };

  const handleDeleteMember = async (userId: string) => {
    try {
      await apiDeleteUser(userId, households[0]?.id);
    } catch {}
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleUpdateHousehold = async (updates: Partial<HouseholdRecord>) => {
    if (updates.name) setHomeName(updates.name);
    if (updates.homeCode) setHomeCode(updates.homeCode);
    if (updates.region) setHouseholdRegion(updates.region);
    const existing = households[0] || {
      id: 'hh-prime',
      homeCode: 'APAC-8421',
      name: 'Vance Residence',
      region: 'SINGAPORE',
      memberIds: [],
      activeCuisines,
      activeAppliances,
      defaultCookLanguage: cookLanguage,
      createdAt: new Date().toISOString(),
    };
    const updated = { ...existing, ...updates };
    try {
      await createOrUpdateHousehold(updated);
      saveHouseholdRecord(updated).catch(() => {});
    } catch {}
  };

  const handleTogglePantryStock = async (id: string) => {
    const item = groceryItems.find((g) => g.id === id);
    if (!item) return;
    const updated = { ...item, inPantryStock: !item.inPantryStock };
    setGroceryItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
    updateGroceryItem(id, { inPantryStock: updated.inPantryStock }).catch(() => {});
  };

  const handleTogglePurchased = async (id: string) => {
    const item = groceryItems.find((g) => g.id === id);
    if (!item) return;
    const updated = { ...item, purchased: !item.purchased };
    setGroceryItems((prev) => prev.map((g) => (g.id === id ? updated : g)));
    updateGroceryItem(id, { purchased: updated.purchased }).catch(() => {});
  };

  const handleAddGroceryItem = async (item: Omit<GroceryItem, 'id'>) => {
    const newItem: GroceryItem = {
      id: `groc-${Date.now()}`,
      ...item,
    };
    setGroceryItems((prev) => [...prev, newItem]);
    createGroceryItem(newItem).catch(() => {});
  };

  // Only approved meals pass through to Cook Station & Patient View
  const approvedMeals = meals.filter((m) => m.approvalStatus === 'APPROVED_ACTIVE');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* App Header with Role Switcher & Telemetry */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        homeCode={homeCode}
        homeName={homeName}
        isDbConnected={isDbConnected}
        onOpenDbInspector={() => setShowDbInspector(true)}
        onOpenBackendInspector={() => setShowBackendInspector(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      {/* Breadcrumb Bar */}
      <Breadcrumb currentRole={currentRole} homeName={homeName} homeCode={homeCode} />

      {/* Main Role Consoles */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentRole === 'caregiver' && (
          <CaregiverConsole
            patients={patients}
            biomarkers={biomarkers}
            onAddBiomarker={handleAddBiomarker}
            meals={meals}
            groceryItems={groceryItems}
            onTogglePantryStock={handleTogglePantryStock}
            onTogglePurchased={handleTogglePurchased}
            onAddGroceryItem={handleAddGroceryItem}
            householdRegion={householdRegion}
            onUpdateRegion={setHouseholdRegion}
            activeCuisines={activeCuisines}
            onToggleCuisine={(c) =>
              setActiveCuisines((prev) =>
                prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
              )
            }
            activeAppliances={activeAppliances}
            onToggleAppliance={(a) =>
              setActiveAppliances((prev) =>
                prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
              )
            }
            cookLanguage={cookLanguage}
            onUpdateCookLanguage={setCookLanguage}
            onGenerateHouseholdDiet={handleGenerateHouseholdDiet}
            isGeneratingDiet={isGeneratingDiet}
          />
        )}

        {currentRole === 'dietitian' && (
          <DietitianConsole
            meals={meals}
            onUpdateMealApproval={handleUpdateMealApproval}
            patients={patients}
            onReindexMeals={setMeals}
            plateAudits={plateAudits}
            onAddPlateAudit={(audit) => {
              setPlateAudits((prev) => [audit, ...prev]);
              createPlateAudit(audit).catch(() => {});
            }}
          />
        )}

        {currentRole === 'cook' && (
          <CookStation
            approvedMeals={approvedMeals}
            allMeals={meals}
            defaultLanguage={cookLanguage as SupportedDialect}
          />
        )}

        {currentRole === 'patient' && (
          <PatientView
            patient={patients[0]}
            approvedMeals={approvedMeals}
            biomarkers={biomarkers}
          />
        )}

        {currentRole === 'admin' && (
          <AdminConsole
            household={households[0] || null}
            users={users}
            patients={patients}
            onAddMember={handleAddMember}
            onDeleteMember={handleDeleteMember}
            onUpdateHousehold={handleUpdateHousehold}
          />
        )}
      </main>

      {/* Backend API & Architecture Inspector Modal */}
      <BackendInspectorModal
        isOpen={showBackendInspector}
        onClose={() => setShowBackendInspector(false)}
        onDataRefresh={loadBackendData}
      />

      {/* Live Firestore DB Inspector Modal */}
      <DatabaseViewer
        isOpen={showDbInspector}
        onClose={() => setShowDbInspector(false)}
        isDbConnected={isDbConnected}
        households={households}
        users={users}
        patients={patients}
        biomarkers={biomarkers}
        meals={meals}
      />

      {/* Care Configuration Wizard Modal */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSavePreferences={(prefs) => {
          setHouseholdRegion(prefs.region);
          setActiveCuisines(prefs.cuisines);
          setActiveAppliances(prefs.appliances);
          setCookLanguage(prefs.cookLanguage);
        }}
      />
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { testConnection, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  saveHouseholdRecord,
  saveUserRecord,
  getHouseholdByCode,
  getHouseholdUsers,
  addMemberToHousehold,
} from './services/dbService';

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
  // Auth state defaults to null so user sees Login Page first
  const [currentUser, setCurrentUser] = useState<AuthUserProfile | null>(null);

  // First step role identification flag
  const [needsFirstStep, setNeedsFirstStep] = useState<boolean>(false);

  // Onboarding Wizard modal state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Cloud Firestore Database Inspector state
  const [showDbInspector, setShowDbInspector] = useState<boolean>(false);

  // Navigation & Role State - No hardcoded defaults, clean start!
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activeTab, setActiveTab] = useState<string>('admin');
  const [homeName, setHomeName] = useState<string>('');
  const [homeCode, setHomeCode] = useState<string>('');
  const [householdRegion, setHouseholdRegion] = useState<RegionalRegion>('SINGAPORE');
  const [activeCuisines, setActiveCuisines] = useState<string[]>([]);
  const [activeAppliances, setActiveAppliances] = useState<string[]>([]);
  const [cookLanguage, setCookLanguage] = useState<string>('Tagalog');
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // Household Members: Empty by default! Stored in users table, referenced by memberIds in household table
  const [members, setMembers] = useState<HouseholdMemberInfo[]>([]);

  // Clinical & Culinary State: Empty by default! Only populated when user creates or adds them
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [biomarkers, setBiomarkers] = useState<BiomarkerRecord[]>([]);
  const [meals, setMeals] = useState<MealPlanItem[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [plateAudits, setPlateAudits] = useState<PlateAuditRecord[]>([]);

  // Startup test connection to Firestore per skill
  useEffect(() => {
    testConnection().then((connected) => {
      setIsDbConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'user@vitalplate.app',
          displayName: firebaseUser.displayName || 'Authorized User',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'admin',
          isHomeHead: true,
          needsFirstStep: true, // Prompt role identification on first sign-in
        });
        setNeedsFirstStep(true);
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
    if (profile.needsFirstStep) {
      setNeedsFirstStep(true);
    } else {
      setNeedsFirstStep(false);
      const role = profile.role || 'caregiver';
      setCurrentRole(role);
      if (role === 'cook') setActiveTab('cook');
      else if (role === 'dietitian') setActiveTab('dietitian');
      else if (role === 'patient') setActiveTab('patient');
      else if (role === 'admin') setActiveTab('admin');
      else setActiveTab('caregiver');
    }
  };

  // Completion from First-Step Role identification as ADMIN
  const handleOnboardingCompleteAsAdmin = async (data: {
    homeName: string;
    homeCode: string;
    region: RegionalRegion;
    activeCuisines: string[];
    activeAppliances: string[];
    cookLanguage: string;
    members: HouseholdMemberInfo[];
    patients: PatientProfile[];
    biomarkers: BiomarkerRecord[];
  }) => {
    const householdId = `hh-${Date.now()}`;
    const memberUserIds = data.members.map((m) => m.id);

    // 1. Separate Household Table with memberIds array
    const householdRecord: HouseholdRecord = {
      id: householdId,
      homeCode: data.homeCode,
      name: data.homeName,
      region: data.region,
      memberIds: memberUserIds,
      activeCuisines: data.activeCuisines,
      activeAppliances: data.activeAppliances,
      defaultCookLanguage: data.cookLanguage,
      createdAt: new Date().toISOString(),
    };
    saveHouseholdRecord(householdRecord).catch(console.error);

    // 2. Separate Users Table with full user details
    for (const mem of data.members) {
      const userRecord: UserRecord = {
        id: mem.id,
        name: mem.name,
        email: mem.email,
        age: mem.age,
        gender: mem.gender,
        roles: mem.roles,
        isHomeHead: mem.isHomeHead,
        householdId: householdId,
        createdAt: new Date().toISOString(),
      };
      saveUserRecord(userRecord).catch(console.error);
    }

    setHomeName(data.homeName);
    setHomeCode(data.homeCode);
    setHouseholdRegion(data.region);
    setActiveCuisines(data.activeCuisines);
    setActiveAppliances(data.activeAppliances);
    setCookLanguage(data.cookLanguage);
    setMembers(data.members);
    setPatients(data.patients);
    setBiomarkers(data.biomarkers);
    setCurrentRole('admin');
    setActiveTab('admin');
    setNeedsFirstStep(false);
    setShowOnboarding(false);
  };

  // Completion from First-Step Role identification as MEMBER (Caregiver, Cook, Dietitian, Patient)
  const handleOnboardingCompleteAsMember = async (memberData: {
    name: string;
    age: number;
    gender: string;
    role: UserRole;
    homeCode: string;
    dialect?: string;
    conditions?: string[];
  }) => {
    const userId = currentUser?.uid || `usr-${Date.now()}`;
    const householdId = 'hh-active';

    const newMemberUser: UserRecord = {
      id: userId,
      name: memberData.name,
      email: currentUser?.email || 'member@vitalplate.app',
      age: memberData.age,
      gender: memberData.gender,
      roles: [memberData.role],
      isHomeHead: memberData.role === 'admin',
      householdId: householdId,
      createdAt: new Date().toISOString(),
    };

    // Save in Users table and link to Household table
    saveUserRecord(newMemberUser).catch(console.error);

    const newMember: HouseholdMemberInfo = {
      id: userId,
      name: memberData.name,
      email: currentUser?.email || 'member@vitalplate.app',
      age: memberData.age,
      gender: memberData.gender,
      roles: [memberData.role],
      isHomeHead: memberData.role === 'admin',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setMembers((prev) => [...prev, newMember]);
    if (memberData.homeCode) {
      setHomeCode(memberData.homeCode);
    }
    if (memberData.dialect) {
      setCookLanguage(memberData.dialect);
    }
    if (memberData.role === 'patient') {
      const newPat: PatientProfile = {
        id: `pat-${Date.now()}`,
        householdId: householdId,
        name: memberData.name,
        age: memberData.age,
        primaryCondition: memberData.conditions?.join(', ') || 'Custom Nutrition & Health Care',
        secondaryConditions: [],
        targetSodiumMg: 1800,
        targetMaxGI: 50,
        potassiumRestricted: false,
        purineRestricted: false,
        notes: 'Added during member onboarding.',
      };
      setPatients((prev) => [...prev, newPat]);
    }

    setCurrentRole(memberData.role);
    if (memberData.role === 'cook') setActiveTab('cook');
    else if (memberData.role === 'dietitian') setActiveTab('dietitian');
    else if (memberData.role === 'patient') setActiveTab('patient');
    else if (memberData.role === 'admin') setActiveTab('admin');
    else setActiveTab('caregiver');

    setNeedsFirstStep(false);
    setShowOnboarding(false);
  };

  // Load a household and its referenced users from Cloud Firestore
  const handleLoadHouseholdFromDb = async (hh: HouseholdRecord) => {
    setHomeName(hh.name);
    setHomeCode(hh.homeCode);
    setHouseholdRegion(hh.region);
    if (hh.activeCuisines) setActiveCuisines(hh.activeCuisines);
    if (hh.activeAppliances) setActiveAppliances(hh.activeAppliances);
    if (hh.defaultCookLanguage) setCookLanguage(hh.defaultCookLanguage);

    if (hh.memberIds && hh.memberIds.length > 0) {
      try {
        const userDocs = await getHouseholdUsers(hh.memberIds);
        const mappedMembers: HouseholdMemberInfo[] = userDocs.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          age: u.age,
          gender: u.gender,
          roles: u.roles,
          isHomeHead: u.isHomeHead,
          joinedAt: u.createdAt ? u.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        }));
        setMembers(mappedMembers);
      } catch (err) {
        console.error('Error fetching household users from Firestore:', err);
      }
    }
    setShowDbInspector(false);
  };

  // Handlers for Admin Role Management
  const handleUpdateMemberRoles = (memberId: string, newRoles: UserRole[]) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, roles: newRoles } : m))
    );
  };

  const handleAddMember = (newMem: Omit<HouseholdMemberInfo, 'id' | 'joinedAt'>) => {
    const created: HouseholdMemberInfo = {
      ...newMem,
      id: `usr-${Date.now()}`,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setMembers((prev) => [...prev, created]);

    // Save in separate Users table
    saveUserRecord({
      id: created.id,
      name: created.name,
      email: created.email,
      age: created.age,
      gender: created.gender,
      roles: created.roles,
      isHomeHead: created.isHomeHead,
      householdId: 'hh-active',
      createdAt: new Date().toISOString(),
    }).catch(console.error);
  };

  // Handlers for Caregiver Console
  const handleAddBiomarker = (record: BiomarkerRecord) => {
    setBiomarkers((prev) => [record, ...prev]);
  };

  const handleToggleCuisine = (cuisine: string) => {
    setActiveCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  const handleToggleAppliance = (appliance: string) => {
    setActiveAppliances((prev) =>
      prev.includes(appliance) ? prev.filter((a) => a !== appliance) : [...prev, appliance]
    );
  };

  const handleTogglePantryStock = (id: string) => {
    setGroceryItems((prev) =>
      prev.map((g) => (g.id === id ? { ...g, inPantryStock: !g.inPantryStock } : g))
    );
  };

  const handleTogglePurchased = (id: string) => {
    setGroceryItems((prev) =>
      prev.map((g) => (g.id === id ? { ...g, purchased: !g.purchased } : g))
    );
  };

  const handleAddGroceryItem = (item: Omit<GroceryItem, 'id'>) => {
    const newItem: GroceryItem = {
      ...item,
      id: `grocery-${Date.now()}`,
    };
    setGroceryItems((prev) => [...prev, newItem]);
  };

  // Handlers for Dietitian Console
  const handleUpdateMealApproval = (
    mealId: string,
    status: 'APPROVED_ACTIVE' | 'REVISION_REQUIRED',
    notes?: string
  ) => {
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? {
              ...m,
              approvalStatus: status,
              dietitianReviewer: 'Dr. Cheryl Lim (RD)',
              dietitianNotes: notes || m.dietitianNotes,
              approvedAt: status === 'APPROVED_ACTIVE' ? new Date().toISOString() : undefined,
            }
          : m
      )
    );
  };

  const handleReindexMeals = (updatedMeals: MealPlanItem[]) => {
    setMeals(updatedMeals);
  };

  const handleAddPlateAudit = (audit: PlateAuditRecord) => {
    setPlateAudits((prev) => [audit, ...prev]);
  };

  // Filter approved meals for the cook
  const approvedMeals = meals.filter((m) => m.approvalStatus === 'APPROVED_ACTIVE');

  // 1. If not logged in, show Google Login page (with option to inspect Cloud DB)
  if (!currentUser) {
    return (
      <>
        {showDbInspector && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-5xl w-full">
              <DatabaseViewer
                onClose={() => setShowDbInspector(false)}
                onSelectHousehold={handleLoadHouseholdFromDb}
              />
            </div>
          </div>
        )}
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          homeCode={homeCode}
          onOpenDatabase={() => setShowDbInspector(true)}
          onStartOnboarding={() => {
            setCurrentUser({
              uid: `usr-${Date.now()}`,
              email: 'user@vitalplate.app',
              displayName: 'New Household User',
              role: 'admin',
              isHomeHead: true,
              needsFirstStep: true,
            });
            setNeedsFirstStep(true);
          }}
        />
      </>
    );
  }

  // 2. If logged in but hasn't completed First Step role assignment, show dedicated Role Onboarding Page
  if (needsFirstStep) {
    return (
      <RoleOnboardingPage
        initialHomeCode={homeCode}
        userEmail={currentUser.email}
        userName={currentUser.displayName}
        onCompleteAsAdmin={handleOnboardingCompleteAsAdmin}
        onCompleteAsMember={handleOnboardingCompleteAsMember}
      />
    );
  }

  // 3. Main Dashboard with Breadcrumb Dropdown
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header - Compact, no overflowing buttons */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        homeCode={homeCode}
        onHomeCodeChange={setHomeCode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDbConnected={isDbConnected}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onToggleDatabase={() => setShowDbInspector((prev) => !prev)}
      />

      {/* Interactive Breadcrumb Bar with Responsive Console Dropdown */}
      <Breadcrumb
        homeName={homeName}
        homeCode={homeCode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenOnboarding={() => setShowOnboarding(true)}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
      />

      {/* Database Inspector Modal if triggered from Header or Admin Console */}
      {showDbInspector && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <DatabaseViewer
            onClose={() => setShowDbInspector(false)}
            onSelectHousehold={handleLoadHouseholdFromDb}
          />
        </div>
      )}

      {/* Onboarding Wizard Modal if manually re-opened */}
      {showOnboarding && (
        <OnboardingWizard
          initialHomeCode={homeCode}
          onComplete={handleOnboardingCompleteAsAdmin}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'caregiver' && (
          <CaregiverConsole
            patients={patients}
            biomarkers={biomarkers}
            onAddBiomarker={handleAddBiomarker}
            groceryItems={groceryItems}
            onTogglePantryStock={handleTogglePantryStock}
            onTogglePurchased={handleTogglePurchased}
            onAddGroceryItem={handleAddGroceryItem}
            householdRegion={householdRegion}
            onUpdateRegion={setHouseholdRegion}
            activeCuisines={activeCuisines}
            onToggleCuisine={handleToggleCuisine}
            activeAppliances={activeAppliances}
            onToggleAppliance={handleToggleAppliance}
            cookLanguage={cookLanguage}
            onUpdateCookLanguage={setCookLanguage}
          />
        )}

        {activeTab === 'cook' && (
          <CookStation
            approvedMeals={approvedMeals}
            allMeals={meals}
            defaultLanguage={cookLanguage as SupportedDialect}
          />
        )}

        {activeTab === 'dietitian' && (
          <DietitianConsole
            meals={meals}
            onUpdateMealApproval={handleUpdateMealApproval}
            patients={patients}
            onReindexMeals={handleReindexMeals}
            plateAudits={plateAudits}
            onAddPlateAudit={handleAddPlateAudit}
          />
        )}

        {activeTab === 'patient' && (
          <PatientView
            patients={patients}
            approvedMeals={approvedMeals}
            biomarkers={biomarkers}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConsole
            members={members}
            onUpdateMemberRoles={handleUpdateMemberRoles}
            onAddMember={handleAddMember}
            homeCode={homeCode}
            onUpdateHomeCode={setHomeCode}
            onOpenDatabase={() => setShowDbInspector(true)}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseViewer onSelectHousehold={handleLoadHouseholdFromDb} />
        )}
      </main>

      {/* Modern Calming Sleek Footer */}
      <footer className="border-t border-slate-200/90 bg-white py-6 text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <span className="font-semibold text-slate-900">VitalPlate</span>
            <span className="mx-2 text-slate-300">·</span>
            <span>Clinic-to-Kitchen Multi-Persona AI</span>
            <span className="mx-2 text-slate-300">·</span>
            <span className="text-slate-500">Singapore · Japan · India · Southeast Asia</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] text-slate-500">
            <span>GCP Project: crjrproductions</span>
            <span>·</span>
            <span>Home: {homeName || 'Unassigned'} ({homeCode || 'NO CODE'})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

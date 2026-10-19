/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  UserRole,
  CanonicalUserRole,
  normalizeRole,
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
import { HouseholdGatePage } from './components/HouseholdGatePage';
import { RoleOnboardingPage } from './components/RoleOnboardingPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CaregiverConsole } from './components/CaregiverConsole';
import { CookStation } from './components/CookStation';
import { DietitianConsole } from './components/DietitianConsole';
import { PatientView } from './components/PatientView';
import { MemberConsole } from './components/MemberConsole';
import { AdminConsole } from './components/AdminConsole';
import { DatabaseViewer } from './components/DatabaseViewer';
import { BackendInspectorModal } from './components/BackendInspectorModal';
import { testConnection, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  saveHouseholdRecord,
  saveUserRecord,
  getUserByEmail,
  getHouseholdRecord,
  getHouseholdByCode,
  getHouseholdUsers,
  addMemberToHousehold,
  FIXED_DEMO_USERS,
  syncFixedDemoUsers,
} from './services/dbService';
import * as backendApi from './services/backendApi';
import { INITIAL_HOUSEHOLD, INITIAL_MEMBERS, INITIAL_PATIENTS, INITIAL_BIOMARKERS, INITIAL_MEALS, INITIAL_GROCERY } from './data/sampleData';

interface AuthUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: UserRole;
  isHomeHead?: boolean;
  needsFirstStep?: boolean;
  householdId?: string;
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

  // Python AI Backend & Architecture Inspector modal state
  const [showBackendModal, setShowBackendModal] = useState<boolean>(false);

  // Navigation & Role State - No hardcoded defaults, clean start!
  const [currentRole, setCurrentRole] = useState<UserRole>('caregiver_cook');
  const [activeTab, setActiveTab] = useState<string>('caregiver');
  const [homeName, setHomeName] = useState<string>(INITIAL_HOUSEHOLD.name);
  const [homeCode, setHomeCode] = useState<string>(INITIAL_HOUSEHOLD.homeCode);
  const [householdRegion, setHouseholdRegion] = useState<RegionalRegion>(INITIAL_HOUSEHOLD.region);
  const [activeCuisines, setActiveCuisines] = useState<string[]>(INITIAL_HOUSEHOLD.activeCuisines);
  const [activeAppliances, setActiveAppliances] = useState<string[]>(INITIAL_HOUSEHOLD.activeAppliances);
  const [cookLanguage, setCookLanguage] = useState<string>(INITIAL_HOUSEHOLD.defaultCookLanguage);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);

  // Household Members: Seeded with dummy data!
  const [members, setMembers] = useState<HouseholdMemberInfo[]>(INITIAL_MEMBERS);

  // Clinical & Culinary State: Seeded with dummy data!
  const [patients, setPatients] = useState<PatientProfile[]>(INITIAL_PATIENTS);
  const [biomarkers, setBiomarkers] = useState<BiomarkerRecord[]>(INITIAL_BIOMARKERS);
  const [meals, setMeals] = useState<MealPlanItem[]>(INITIAL_MEALS);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(INITIAL_GROCERY);
  const [plateAudits, setPlateAudits] = useState<PlateAuditRecord[]>([]);

  const refreshAllBackendData = async () => {
    try {
      const [g, p, b, m, a] = await Promise.all([
        backendApi.fetchGroceries(),
        backendApi.fetchPatients(),
        backendApi.fetchBiomarkers(),
        backendApi.fetchMeals(),
        backendApi.fetchPlateAudits(),
      ]);
      if (g && g.length > 0) setGroceryItems(g);
      if (p && p.length > 0) setPatients(p);
      if (b && b.length > 0) setBiomarkers(b);
      if (m && m.length > 0) setMeals(m);
      if (a && a.length > 0) setPlateAudits(a);
    } catch (e) {
      console.warn('Backend sync note:', e);
    }
  };

  // Startup test connection to Firestore per skill and load backend data
  useEffect(() => {
    console.log('[App] Initializing app, checking Firestore connection...');
    testConnection().then((connected) => {
      console.log('[App] Firestore connected:', connected);
      setIsDbConnected(connected);
    });

    // Populate initial state from Python Backend persistence
    refreshAllBackendData();
    
    // Auto-seed demo if requested or if needed
    // syncFixedDemoUsers().catch(console.warn);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Only trigger auto-login for real Firebase users if no one is logged in via password yet
        setCurrentUser(prev => {
          if (prev) return prev;
          
          return {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'user@vitalplate.app',
            displayName: firebaseUser.displayName || 'Authorized User',
            photoURL: firebaseUser.photoURL || undefined,
            role: 'admin',
            isHomeHead: true,
            needsFirstStep: true,
          };
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
    setHomeCode('');
    setHomeName('');
    setMembers([]);
    setPatients([]);
  };

  const handleLeaveHousehold = () => {
    setHomeCode('');
    setHomeName('');
    setNeedsFirstStep(true);
  };

  const handleLoginSuccess = async (profile: AuthUserProfile) => {
    let finalProfile = { ...profile };

    // AUTO-DISCOVERY LOGIC: Check if user already exists by email (added by an admin)
    if (!finalProfile.householdId && finalProfile.email) {
      try {
        console.log('[App] Attempting auto-discovery for email:', finalProfile.email);
        const discoveredUser = await getUserByEmail(finalProfile.email);
        if (discoveredUser) {
          console.log('[App] Auto-discovered user profile:', discoveredUser);
          finalProfile.householdId = discoveredUser.householdId;
          finalProfile.role = discoveredUser.roles[0];
          finalProfile.isHomeHead = discoveredUser.isHomeHead;
          finalProfile.needsFirstStep = false;
        }
      } catch (err) {
        console.warn('[App] Auto-discovery failed:', err);
      }
    }

    setCurrentUser(finalProfile);

    if (finalProfile.householdId) {
      // Load existing household info
      try {
        const hh = await getHouseholdRecord(finalProfile.householdId);
        if (hh) {
          console.log('[App] Loading discovered household:', hh.name);
          handleLoadHouseholdFromDb(hh);
          setNeedsFirstStep(false);
          
          const role = finalProfile.role || normalizeRole('member');
          setCurrentRole(role);
          if (role === 'caregiver_cook') setActiveTab('caregiver');
          else if (role === 'dietitian') setActiveTab('dietitian');
          else setActiveTab('admin');
        } else {
          setNeedsFirstStep(true);
        }
      } catch (err) {
        console.error('[App] Error loading discovered household:', err);
        setNeedsFirstStep(true);
      }
    } else {
      // Clean sign-in without a household: enforce Join Household or Create Household ONLY
      setNeedsFirstStep(true);
      setHomeCode('');
      setHomeName('');
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
    console.log('[App] handleOnboardingCompleteAsAdmin - householdRecord:', householdRecord);
    // Persist to both Firestore and Backend
    try {
      await saveHouseholdRecord(householdRecord);
      console.log('[App] Household record successfully persisted to Firestore & Backend');
    } catch (err) {
      console.error('[App] saveHouseholdRecord ERROR:', err);
    }

    // 2. Separate Users Table with full user details
    for (const mem of data.members) {
      const householdId = householdRecord.id;
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
      console.log('[App] handleOnboardingCompleteAsAdmin - userRecord:', userRecord);
      try {
        await saveUserRecord(userRecord);
        console.log('[App] User record successfully persisted to Firestore & Backend:', userRecord.email);
      } catch (err) {
        console.error('[App] saveUserRecord ERROR:', err);
      }

      // 2b. Automatically create a PatientProfile for every member so they can hold lab reports
      const patientProfile: PatientProfile = {
        id: mem.id, // Direct 1:1 mapping for simplified lab ingestion
        householdId: householdId,
        name: mem.name,
        age: mem.age || 35,
        primaryCondition: 'General Health Monitoring',
        secondaryConditions: [],
        targetSodiumMg: 2000,
        targetMaxGI: 50,
        potassiumRestricted: false,
        purineRestricted: false,
        notes: 'Profile auto-created via Household Admin onboarding.',
      };
      setPatients(prev => [...prev, patientProfile]); // Update local state immediately
      backendApi.createOrUpdatePatient(patientProfile).catch((err) => console.error('[App] Auto-create Patient ERROR:', err));
    }

    setHomeName(data.homeName);
    setHomeCode(data.homeCode);
    setHouseholdRegion(data.region);
    setActiveCuisines(data.activeCuisines);
    setActiveAppliances(data.activeAppliances);
    setCookLanguage(data.cookLanguage);
    setMembers(data.members);
    if (data.patients && data.patients.length > 0) {
      setPatients(data.patients);
    }
    if (data.biomarkers && data.biomarkers.length > 0) {
      setBiomarkers(data.biomarkers);
    }
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
    console.log('[App] handleOnboardingCompleteAsMember - memberData:', memberData);
    const userId = currentUser?.uid || `usr-${Date.now()}`;
    const householdId = `hh-${memberData.homeCode.toLowerCase()}`;

    // Fetch existing household info if available from Python Backend
    try {
      const hh = await backendApi.fetchHouseholdByCodeOrId(memberData.homeCode);
      if (hh) {
        setHomeName(hh.name);
        setHouseholdRegion(hh.region || 'SINGAPORE');
        if (hh.activeCuisines) setActiveCuisines(hh.activeCuisines);
        if (hh.activeAppliances) setActiveAppliances(hh.activeAppliances);
        if (hh.defaultCookLanguage) setCookLanguage(hh.defaultCookLanguage);
      } else {
        setHomeName(`Household ${memberData.homeCode}`);
      }
    } catch {
      setHomeName(`Household ${memberData.homeCode}`);
    }

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

    // Save in Users table and Python backend
    console.log('[App] handleOnboardingCompleteAsMember - newMemberUser:', newMemberUser);
    saveUserRecord(newMemberUser).catch((err) => console.error('[App] saveUserRecord ERROR:', err));
    backendApi.createOrUpdateUser(newMemberUser).catch((err) => console.error('[App] backendApi.createOrUpdateUser ERROR:', err));

    // Auto-create PatientProfile for self-onboarding members
    const patientProfile: PatientProfile = {
      id: userId,
      householdId: householdId,
      name: memberData.name,
      age: memberData.age || 35,
      primaryCondition: memberData.conditions?.join(', ') || 'General Wellness',
      secondaryConditions: [],
      targetSodiumMg: 2000,
      targetMaxGI: 50,
      potassiumRestricted: false,
      purineRestricted: false,
      notes: 'Self-registered member profile.',
    };
    setPatients(prev => [...prev, patientProfile]); // Update local state immediately
    backendApi.createOrUpdatePatient(patientProfile).catch((err) => console.error('[App] Auto-create Patient ERROR:', err));

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
      backendApi.createOrUpdatePatient(newPat).catch(console.error);
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

  // Dedicated Role & Demo User Switcher for the 3 Canonical Roles (Caregiver/Cook, Dietitian, Members)
  const handleRoleChange = (role: UserRole) => {
    console.log('[App] handleRoleChange:', role);
    setCurrentRole(role);
    let matchedFixed: UserRecord | undefined;
    if (role === 'caregiver_cook' || role === 'cook' || role === 'caregiver') {
      matchedFixed = FIXED_DEMO_USERS.find((u) => u.roles.includes('caregiver_cook'));
      setActiveTab('caregiver');
    } else if (role === 'dietitian') {
      matchedFixed = FIXED_DEMO_USERS.find((u) => u.roles.includes('dietitian'));
      setActiveTab('dietitian');
    } else if (role === 'member' || role === 'patient') {
      matchedFixed = FIXED_DEMO_USERS.find((u) => u.roles.includes('member'));
      setActiveTab('patient');
    } else {
      matchedFixed = FIXED_DEMO_USERS.find((u) => u.roles.includes('member'));
      setActiveTab('admin');
    }

    if (matchedFixed) {
      setCurrentUser({
        uid: matchedFixed.id,
        email: matchedFixed.email,
        displayName: matchedFixed.name,
        role: role,
        isHomeHead: matchedFixed.isHomeHead,
        householdId: homeCode ? `hh-${homeCode.toLowerCase()}` : 'hh-prime',
        needsFirstStep: false,
      });
    }
  };

  // Handlers for Admin Role Management
  const handleUpdateMemberRoles = (memberId: string, newRoles: UserRole[]) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, roles: newRoles } : m))
    );
    const member = members.find((m) => m.id === memberId);
    if (member) {
      const activeHhId = homeCode ? `hh-${homeCode.toLowerCase()}` : 'hh-prime';
      const userRecord: UserRecord = {
        id: member.id,
        name: member.name,
        email: member.email,
        age: member.age,
        gender: member.gender,
        roles: newRoles,
        isHomeHead: member.isHomeHead,
        householdId: activeHhId,
        createdAt: new Date().toISOString(),
      };
      saveUserRecord(userRecord).catch(console.error);
      backendApi.createOrUpdateUser(userRecord).catch(console.error);
    }
  };

  const handleAddMember = async (newMem: Omit<HouseholdMemberInfo, 'id' | 'joinedAt'>) => {
    if (members.length >= 5) {
      console.warn('Max members reached');
      return;
    }
    const memberId = `usr-${Date.now()}`;
    const created: HouseholdMemberInfo = {
      ...newMem,
      id: memberId,
      joinedAt: new Date().toISOString().split('T')[0],
    };

    const activeHhId = homeCode ? `hh-${homeCode.toLowerCase()}` : 'hh-prime';
    const userRecord: UserRecord = {
      id: memberId,
      name: created.name,
      email: created.email,
      password: (newMem as any).password, // Preserve password
      age: created.age,
      gender: created.gender,
      roles: created.roles,
      isHomeHead: created.isHomeHead,
      householdId: activeHhId,
      createdAt: new Date().toISOString(),
    };

    // Auto-create PatientProfile so admin can upload labs immediately
    const patientProfile: PatientProfile = {
      id: memberId,
      householdId: activeHhId,
      name: created.name,
      age: created.age || 35,
      primaryCondition: 'General Monitoring',
      secondaryConditions: [],
      targetSodiumMg: 2000,
      targetMaxGI: 50,
      potassiumRestricted: false,
      purineRestricted: false,
      notes: 'Auto-created upon member addition by admin.',
    };

    // Update local state immediately
    setMembers((prev) => [...prev, created]);
    setPatients(prev => [...prev, patientProfile]);

    // Save in separate Users table in both Python Backend and Cloud Firestore
    try {
      console.log('Adding member to household:', activeHhId, userRecord);
      await addMemberToHousehold(activeHhId, userRecord);

      // Re-fetch members from backend to ensure synchronization
      const updatedMembers = await backendApi.fetchUsers(activeHhId);
      if (updatedMembers && updatedMembers.length > 0) {
        setMembers(updatedMembers as any);
      }
    } catch (e) {
      console.warn('Error saving new member to users table:', e);
      saveUserRecord(userRecord).catch(console.error);
      backendApi.createOrUpdateUser(userRecord).catch(console.error);
    }

    // Persist patient profile
    backendApi.createOrUpdatePatient(patientProfile).catch(err => console.error('Failed to auto-create patient profile:', err));
  };

  const handleRemoveMember = async (memberId: string) => {
    console.log('[App] handleRemoveMember:', memberId);
    const activeHhId = homeCode ? `hh-${homeCode.toLowerCase()}` : 'hh-prime';
    
    try {
      await deleteUserRecord(memberId, activeHhId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setPatients((prev) => prev.filter((p) => p.id !== memberId));
      console.log('[App] Member successfully removed from household');
    } catch (e) {
      console.error('[App] Error removing member:', e);
    }
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
      prev.map((g) => {
        if (g.id === id) {
          const nextStock = !g.inPantryStock;
          const updated = {
            ...g,
            inPantryStock: nextStock,
            isLowStock: !nextStock,
            daysRemaining: nextStock ? 14 : 0,
          };
          backendApi.updateGroceryItem(id, {
            inPantryStock: nextStock,
            isLowStock: !nextStock,
            daysRemaining: nextStock ? 14 : 0,
          }).catch(console.warn);
          return updated;
        }
        return g;
      })
    );
  };

  const handleTogglePurchased = (id: string) => {
    setGroceryItems((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const nextPurchased = !g.purchased;
          backendApi.updateGroceryItem(id, { purchased: nextPurchased }).catch(console.warn);
          return { ...g, purchased: nextPurchased };
        }
        return g;
      })
    );
  };

  const handleAddGroceryItem = (item: Omit<GroceryItem, 'id'>) => {
    const newItem: GroceryItem = {
      ...item,
      id: `grocery-${Date.now()}`,
      isLowStock: !item.inPantryStock,
    };
    setGroceryItems((prev) => [...prev, newItem]);
    backendApi.createGroceryItem(newItem).catch(console.warn);
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
        />
      </>
    );
  }

  // 2. If logged in, but user has NO active household: strictly show Join Household or Create Household ONLY!
  if (!homeCode || needsFirstStep) {
    return (
      <HouseholdGatePage
        userEmail={currentUser.email}
        userName={currentUser.displayName}
        userId={currentUser.uid}
        onJoinHousehold={handleOnboardingCompleteAsMember}
        onCreateHousehold={handleOnboardingCompleteAsAdmin}
        onSignOut={handleSignOut}
      />
    );
  }

  // 3. Main Dashboard with Breadcrumb Dropdown
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Top Header - Compact, no overflowing buttons */}
      <Header
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        homeCode={homeCode}
        onHomeCodeChange={setHomeCode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDbConnected={isDbConnected}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onLeaveHousehold={handleLeaveHousehold}
        onOpenOnboarding={() => setShowOnboarding(true)}
        onToggleDatabase={() => setShowDbInspector((prev) => !prev)}
        onToggleBackendModal={() => setShowBackendModal((prev) => !prev)}
      />

      {/* Interactive Breadcrumb Bar with Responsive Console Dropdown */}
      <Breadcrumb
        homeName={homeName}
        homeCode={homeCode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenOnboarding={() => setShowOnboarding(true)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        currentUser={currentUser}
      />

      {/* Python AI Backend Architecture Inspector Modal */}
      {showBackendModal && (
        <BackendInspectorModal
          isOpen={showBackendModal}
          onClose={() => setShowBackendModal(false)}
          onDataRefresh={refreshAllBackendData}
        />
      )}

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
            approvedMeals={approvedMeals}
            allMeals={meals}
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
            householdId={homeCode ? `hh-${homeCode.toLowerCase()}` : 'hh-prime'}
            meals={meals}
            onUpdateMealApproval={handleUpdateMealApproval}
            patients={patients}
            biomarkers={biomarkers}
            onReindexMeals={handleReindexMeals}
            plateAudits={plateAudits}
            onAddPlateAudit={handleAddPlateAudit}
          />
        )}

        {activeTab === 'patient' && currentUser && (
          <MemberConsole
            user={currentUser}
            patient={patients.find(p => p.id === (currentUser.uid || currentUser.id)) || null}
            approvedMeals={approvedMeals}
            biomarkers={biomarkers}
            onAddBiomarker={handleAddBiomarker}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConsole
            members={members}
            patients={patients}
            onUpdateMemberRoles={handleUpdateMemberRoles}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onAddBiomarker={handleAddBiomarker}
            homeCode={homeCode}
            onUpdateHomeCode={setHomeCode}
            onOpenDatabase={() => setShowDbInspector(true)}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseViewer onSelectHousehold={handleLoadHouseholdFromDb} />
        )}
      </main>


    </div>
  );
}

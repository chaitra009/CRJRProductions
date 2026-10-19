import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';
import { HouseholdRecord, UserRecord } from '../types';
import * as backendApi from './backendApi';

/**
 * Household & User Persistence Service
 * Split Architecture:
 * - Direct business logic & persistence handled via Python Backend APIs
 * - Synchronized with Cloud Firestore for real-time multi-device consistency
 */

// Save or create a new household record with memberIds array
export async function saveHouseholdRecord(household: HouseholdRecord): Promise<void> {
  // 1. Persist to Python Backend
  try {
    await backendApi.createOrUpdateHousehold(household);
  } catch (err) {
    console.warn('[DB Service] Backend persistence warning:', err);
  }

  // 2. Synchronize to Firestore
  console.log('[DB Service] Attempting Firestore sync for household:', household.id);
  try {
    const householdRef = doc(db, 'households', household.id);
    await setDoc(householdRef, {
      ...household,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[DB Service] Firestore sync SUCCESS for household:', household.id);
  } catch (error) {
    console.error('[DB Service] Firestore sync ERROR for household:', household.id, error);
    console.warn('[DB Service] Firestore sync info:', error);
  }
}

// Save or create a new user profile record
export async function saveUserRecord(user: UserRecord): Promise<void> {
  // 1. Persist to Python Backend (includes password if provided)
  try {
    await backendApi.createOrUpdateUser(user);
  } catch (err) {
    console.warn('[DB Service] Backend persistence warning:', err);
  }

  // 2. Synchronize to Firestore
  console.log('[DB Service] Attempting Firestore sync for user:', user.email);
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    console.log('[DB Service] Firestore sync SUCCESS for user:', user.id);
  } catch (error) {
    console.error('[DB Service] Firestore sync ERROR for user:', user.id, error);
  }
}

// Retrieve household by ID
export async function getHouseholdRecord(householdId: string): Promise<HouseholdRecord | null> {
  // Try Backend first
  try {
    const hh = await backendApi.fetchHouseholdByCodeOrId(householdId);
    if (hh) return hh;
  } catch {}

  // Fallback to Firestore
  try {
    const docRef = doc(db, 'households', householdId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as HouseholdRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `households/${householdId}`);
    return null;
  }
}

// Retrieve household by Home Code
export async function getHouseholdByCode(homeCode: string): Promise<HouseholdRecord | null> {
  // Try Backend first
  try {
    const hh = await backendApi.fetchHouseholdByCodeOrId(homeCode);
    if (hh) return hh;
  } catch {}

  // Fallback to Firestore
  try {
    const q = query(
      collection(db, 'households'),
      where('homeCode', '==', homeCode.trim().toUpperCase())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as HouseholdRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'households');
    return null;
  }
}

// Retrieve a user profile by ID
export async function getUserRecord(userId: string): Promise<UserRecord | null> {
  try {
    const users = await backendApi.fetchUsers();
    const u = users.find((item) => item.id === userId);
    if (u) return u;
  } catch {}

  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    return null;
  }
}

/**
 * Retrieve a user record by email address (used for auto-discovering 
 * members added by an admin)
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    // 1. Try Backend search if supported (fallback to filtering all users if no direct API)
    try {
      const allUsers = await backendApi.fetchUsers();
      const match = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (match) return match;
    } catch (e) {
      console.warn('[DB Service] Backend getUserByEmail fallback:', e);
    }

    // 2. Query Firestore for the user with this email
    const q = query(
      collection(db, 'users'),
      where('email', '==', email.trim().toLowerCase())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserRecord;
    }
    return null;
  } catch (error) {
    console.warn('[DB Service] getUserByEmail error:', error);
    return null;
  }
}

// Retrieve all user records given an array of memberIds
export async function getHouseholdUsers(memberIds: string[]): Promise<UserRecord[]> {
  if (!memberIds || memberIds.length === 0) return [];
  try {
    const all = await backendApi.fetchUsers();
    if (all && all.length > 0) {
      return all.filter((u) => memberIds.includes(u.id));
    }
  } catch {}

  try {
    const users: UserRecord[] = [];
    for (const mId of memberIds) {
      const user = await getUserRecord(mId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

// Retrieve all households currently in system
export async function getAllHouseholds(): Promise<HouseholdRecord[]> {
  try {
    const list = await backendApi.fetchHouseholds();
    if (list && list.length > 0) return list;
  } catch {}

  try {
    const snap = await getDocs(collection(db, 'households'));
    return snap.docs.map((d) => d.data() as HouseholdRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'households');
    return [];
  }
}

// Retrieve all users currently in system
export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    const list = await backendApi.fetchUsers();
    if (list && list.length > 0) return list;
  } catch {}

  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

// Add a new member to an existing household
export async function addMemberToHousehold(householdId: string, user: UserRecord): Promise<void> {
  console.log('[DB Service] addMemberToHousehold - hh:', householdId, 'user:', user.id);
  try {
    // 1. Save user in backend
    await backendApi.createOrUpdateUser({
      ...user,
      householdId,
    });
  } catch (err) {
    console.warn('[DB Service] Backend addMember warning:', err);
  }

  try {
    // 2. Synchronize in Firestore
    console.log('[DB Service] Attempting Firestore sync for user in addMember:', user.id);
    await saveUserRecord(user);
    const householdRef = doc(db, 'households', householdId);
    console.log('[DB Service] Attempting to update household memberIds in Firestore:', householdId);
    
    // First ensure household document exists in Firestore
    const householdSnap = await getDoc(householdRef);
    if (!householdSnap.exists()) {
      console.log('[DB Service] Household not in Firestore, creating it first...');
      const hh = await backendApi.fetchHouseholdByCodeOrId(householdId);
      if (hh) {
        await setDoc(householdRef, {
          ...hh,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await updateDoc(householdRef, {
      memberIds: arrayUnion(user.id),
      updatedAt: new Date().toISOString(),
    });
    console.log('[DB Service] Firestore addMember sync SUCCESS');
  } catch (error) {
    console.error('[DB Service] Firestore addMember sync ERROR:', error);
    console.warn('[DB Service] Firestore addMember sync:', error);
  }
}

// Delete user from users table and from household memberIds
export async function deleteUserRecord(userId: string, householdId?: string): Promise<void> {
  try {
    await backendApi.deleteUser(userId, householdId);
  } catch (err) {
    console.warn('[DB Service] Backend deleteUser warning:', err);
  }

  try {
    await deleteDoc(doc(db, 'users', userId));
    if (householdId) {
      const hh = await getHouseholdRecord(householdId);
      if (hh && hh.memberIds) {
        const updated = hh.memberIds.filter((id) => id !== userId);
        const householdRef = doc(db, 'households', householdId);
        await updateDoc(householdRef, { memberIds: updated });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }
}

// Seed initial database test data via Python backend
// Exactly 3 Fixed Demo Users with 3 Roles (Caregiver/Cook, Dietitian, Members)
export const FIXED_DEMO_USERS: UserRecord[] = [
  {
    id: 'demo-usr-caregiver-cook',
    name: 'Household Cook',
    email: 'cook@vitalplate.app',
    age: 36,
    gender: 'Female',
    roles: ['caregiver_cook'],
    isHomeHead: false,
    householdId: 'hh-prime',
    createdAt: '2026-10-18T00:00:00Z',
  },
  {
    id: 'demo-usr-dietitian',
    name: 'Clinical Dietitian',
    email: 'dietitian@vitalplate.app',
    age: 41,
    gender: 'Female',
    roles: ['dietitian'],
    isHomeHead: false,
    householdId: 'hh-prime',
    createdAt: '2026-10-18T00:00:00Z',
  },
  {
    id: 'demo-usr-member',
    name: 'Household Admin',
    email: 'member@vitalplate.app',
    age: 48,
    gender: 'Female',
    roles: ['member'],
    isHomeHead: true,
    householdId: 'hh-prime',
    createdAt: '2026-10-18T00:00:00Z',
  },
];

// Synchronize the 3 fixed demo users to both Python DB and Firestore
export async function syncFixedDemoUsers(): Promise<void> {
  for (const user of FIXED_DEMO_USERS) {
    try {
      await saveUserRecord(user);
    } catch (e) {
      console.warn('Sync fixed user error:', e);
    }
  }
}

// Seed initial database test data via Python backend
export async function seedInitialDatabase(): Promise<{ household: HouseholdRecord; users: UserRecord[] }> {
  console.log('[DB Service] seedInitialDatabase started');
  try {
    const seeded = await backendApi.seedDemoDatabase();
    if (seeded && seeded.household && seeded.users) {
      console.log('[DB Service] Backend seeded, now syncing fixed demo users...');
      await syncFixedDemoUsers();
      console.log('[DB Service] Seed SUCCESS');
      return { household: seeded.household, users: seeded.users };
    }
  } catch (err) {
    console.error('[DB Service] Backend seed ERROR:', err);
    console.warn('[DB Service] Backend seed warning:', err);
  }

  // Local fallback
  const hhId = 'hh-prime';
  const household: HouseholdRecord = {
    id: hhId,
    homeCode: 'VITAL-8821',
    name: 'Vance Residence',
    region: 'SINGAPORE',
    memberIds: FIXED_DEMO_USERS.map((u) => u.id),
    activeCuisines: ['Hainanese Heritage', 'Peranakan Balance', 'Low-Sodium Teochew'],
    activeAppliances: ['Rice Cooker (IH)', 'Slow Cooker / Claypot', 'Air Fryer'],
    defaultCookLanguage: 'English',
    createdAt: new Date().toISOString(),
  };

  for (const u of FIXED_DEMO_USERS) {
    await saveUserRecord(u);
  }
  await saveHouseholdRecord(household);

  return { household, users: FIXED_DEMO_USERS };
}

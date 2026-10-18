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
  try {
    const householdRef = doc(db, 'households', household.id);
    await setDoc(householdRef, {
      ...household,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('[DB Service] Firestore sync info:', error);
  }
}

// Save or create a new user profile record
export async function saveUserRecord(user: UserRecord): Promise<void> {
  // 1. Persist to Python Backend
  try {
    await backendApi.createOrUpdateUser(user);
  } catch (err) {
    console.warn('[DB Service] Backend persistence warning:', err);
  }

  // 2. Synchronize to Firestore
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.warn('[DB Service] Firestore sync info:', error);
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
    await saveUserRecord(user);
    const householdRef = doc(db, 'households', householdId);
    await updateDoc(householdRef, {
      memberIds: arrayUnion(user.id),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
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
export async function seedInitialDatabase(): Promise<{ household: HouseholdRecord; users: UserRecord[] }> {
  try {
    const seeded = await backendApi.seedDemoDatabase();
    if (seeded && seeded.household && seeded.users) {
      return { household: seeded.household, users: seeded.users };
    }
  } catch (err) {
    console.warn('[DB Service] Backend seed warning:', err);
  }

  // Local fallback
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

  const household: HouseholdRecord = {
    id: hhId,
    homeCode: 'VITAL-8821',
    name: 'Vance Residence',
    region: 'SINGAPORE',
    memberIds: [u1.id, u2.id, u3.id],
    activeCuisines: ['Hainanese Heritage', 'Peranakan Balance', 'Low-Sodium Teochew'],
    activeAppliances: ['Rice Cooker (IH)', 'Slow Cooker / Claypot', 'Air Fryer'],
    defaultCookLanguage: 'Tagalog',
    createdAt: new Date().toISOString(),
  };

  await saveUserRecord(u1);
  await saveUserRecord(u2);
  await saveUserRecord(u3);
  await saveHouseholdRecord(household);

  return { household, users: [u1, u2, u3] };
}

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  HouseholdRecord,
  UserRecord,
  PatientProfile,
  BiomarkerRecord,
  MealPlanItem,
  PlateAuditRecord,
  GroceryItem,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Households
export async function saveHouseholdRecord(hh: HouseholdRecord): Promise<void> {
  const path = `households/${hh.id}`;
  try {
    await setDoc(doc(db, 'households', hh.id), hh);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getHouseholdByCode(code: string): Promise<HouseholdRecord | null> {
  const path = 'households';
  try {
    const clean = code.trim().toUpperCase();
    const q = query(collection(db, 'households'), where('homeCode', '==', clean));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as HouseholdRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// 2. Users
export async function saveUserRecord(user: UserRecord): Promise<void> {
  const path = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getHouseholdUsers(householdId: string): Promise<UserRecord[]> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('householdId', '==', householdId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UserRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function addMemberToHousehold(householdId: string, userId: string): Promise<void> {
  const path = `households/${householdId}`;
  try {
    const docRef = doc(db, 'households', householdId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as HouseholdRecord;
      const members = data.memberIds || [];
      if (!members.includes(userId)) {
        await updateDoc(docRef, { memberIds: [...members, userId] });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 3. Patients
export async function savePatientProfile(patient: PatientProfile): Promise<void> {
  const path = `households/${patient.householdId}/patients/${patient.id}`;
  try {
    await setDoc(doc(db, 'households', patient.householdId, 'patients', patient.id), patient);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Biomarkers
export async function saveBiomarkerRecord(bm: BiomarkerRecord): Promise<void> {
  const path = `households/${bm.householdId}/biomarkers/${bm.id}`;
  try {
    await setDoc(doc(db, 'households', bm.householdId, 'biomarkers', bm.id), bm);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 5. Meals
export async function saveMealPlan(meal: MealPlanItem): Promise<void> {
  const path = `households/${meal.householdId}/meal_plans/${meal.id}`;
  try {
    await setDoc(doc(db, 'households', meal.householdId, 'meal_plans', meal.id), meal);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 6. Plate Audits
export async function savePlateAuditRecord(audit: PlateAuditRecord): Promise<void> {
  const path = `households/${audit.householdId}/plate_audits/${audit.id}`;
  try {
    await setDoc(doc(db, 'households', audit.householdId, 'plate_audits', audit.id), audit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 7. Groceries
export async function saveGroceryRecord(item: GroceryItem): Promise<void> {
  const path = `households/${item.householdId}/grocery_inventory/${item.id}`;
  try {
    await setDoc(doc(db, 'households', item.householdId, 'grocery_inventory', item.id), item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

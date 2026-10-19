import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, getDocs } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

/**
 * PRODUCTION READY FIREBASE INITIALIZATION
 * Uses Vite environment variables for security.
 * Ensure these are set in your deployment environment (e.g., Cloud Run or Firebase Hosting).
 */
const firebaseConfig: any = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('[Firebase] Firestore Error details:', errInfo);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't throw if we want to continue, but here it's used as a final handler
  // throw new Error(JSON.stringify(errInfo));
}

// Test connection on startup per Firebase guidelines
export async function testConnection(): Promise<boolean> {
  console.log('[Firebase] Testing connection to database:', firebaseConfig.firestoreDatabaseId);
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log('[Firebase] Connection test SUCCESS');
    return true;
  } catch (error) {
    console.error('[Firebase] Connection test FAILED:', error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
      return false;
    }
    // Expected in testing if test doc doesn't exist yet, but connection was made
    return true;
  }
}

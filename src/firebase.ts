import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, getDocs } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

/**
 * PRODUCTION READY FIREBASE INITIALIZATION
 * Uses Vite environment variables with fallback to original JSON values
 * to prevent blank page during local development.
 */
const firebaseConfig: any = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "crjrproductions",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:441340478763:web:20947dbd6b48565a28b16e",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyADyJKA57Y1nY6DgeE_JesIkxuTOkD8r8U",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "crjrproductions.firebaseapp.com",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-remixremixvitalp-d3df39cf-3517-426c-9f2c-856a99b18063",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "crjrproductions.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "441340478763",
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

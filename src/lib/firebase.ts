import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import autoConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || autoConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || autoConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || autoConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || autoConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || autoConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || autoConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || autoConfig.firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  try {
    await signInWithRedirect(auth, provider);
  } catch (error: any) {
    console.error('Login failed:', error);
    if (error.code === 'auth/unauthorized-domain') {
      alert('Domain not authorized for OAuth. Please add this URL to Firebase Console > Authentication > Settings > Authorized domains.');
    } else {
      alert('Google Sign-in failed: ' + error.message);
    }
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (error: any) {
    console.error('Email login failed:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // Auto-signup if not found
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      alert('Sign-in failed: ' + error.message);
      throw error;
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
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
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

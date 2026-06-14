import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Mengizinkan penimpaan (override) via environment variables agar mudah dideploy di hosting sendiri (Vercel, Netlify, VS Code lokal, dll.)
const isCustomFirebaseEnv = !!(import.meta as any).env.VITE_FIREBASE_PROJECT_ID;

// Deteksi otomatis apakah sedang dibuka di sandboxed preview AI Studio atau domain rilis mandiri Anda.
// Jika dibuka di Vercel (eduflow13.vercel.app), localhost, atau server mandiri Anda, otomatis gunakan Firebase Anda.
const isStudioPreview = typeof window !== 'undefined' && 
  (window.location.hostname.includes('ais-dev-') || 
   window.location.hostname.includes('ais-pre-') || 
   window.location.hostname.includes('googleusercontent.com'));

// Firebase Config milik Anda (eduflow-83411)
const personalFirebaseConfig = {
  apiKey: "AIzaSyDDLVrxLBeNbIL-zxRcVFOt6qwRxMhHbeE",
  authDomain: "eduflow-83411.firebaseapp.com",
  projectId: "eduflow-83411",
  storageBucket: "eduflow-83411.firebasestorage.app",
  messagingSenderId: "231062152838",
  appId: "1:231062152838:web:17c7a48077029cab9e5307",
  firestoreDatabaseId: "(default)"
};

const config = {
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || 
             (!isStudioPreview ? personalFirebaseConfig.projectId : firebaseConfig.projectId),
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || 
         (!isStudioPreview ? personalFirebaseConfig.appId : firebaseConfig.appId),
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || 
          (!isStudioPreview ? personalFirebaseConfig.apiKey : firebaseConfig.apiKey),
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || 
              (!isStudioPreview ? personalFirebaseConfig.authDomain : firebaseConfig.authDomain),
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 
                       (!isStudioPreview ? personalFirebaseConfig.firestoreDatabaseId : firebaseConfig.firestoreDatabaseId),
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || 
                 (!isStudioPreview ? personalFirebaseConfig.storageBucket : firebaseConfig.storageBucket),
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || 
                     (!isStudioPreview ? personalFirebaseConfig.messagingSenderId : firebaseConfig.messagingSenderId),
};

const app = initializeApp(config);
export const db = getFirestore(app, config.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

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
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

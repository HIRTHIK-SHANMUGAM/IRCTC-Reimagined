import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

/**
 * Firebase public config. These values are safe in the client bundle — they
 * identify the project, they do not authorise anything. The Groq key is NOT
 * here; it lives only in the Cloud Functions runtime (master prompt §2).
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when a project has actually been configured. */
export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let fnInstance: Functions | undefined;

function ensureApp(): FirebaseApp | undefined {
  if (!firebaseConfigured) return undefined;
  if (!app) {
    app = initializeApp(config);
  }
  return app;
}

export function getAuthClient(): Auth | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  if (!authInstance) {
    authInstance = getAuth(a);
    if (useEmulators) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
  }
  return authInstance;
}

export function getDb(): Firestore | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  if (!dbInstance) {
    dbInstance = getFirestore(a);
    if (useEmulators) connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
  }
  return dbInstance;
}

export function getFns(): Functions | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  if (!fnInstance) {
    fnInstance = getFunctions(a, import.meta.env.VITE_FUNCTIONS_REGION || 'asia-south1');
    if (useEmulators) connectFunctionsEmulator(fnInstance, '127.0.0.1', 5001);
  }
  return fnInstance;
}

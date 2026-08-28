import { firebaseConfigured } from '@/lib/firebase';
import { localRepo } from './localRepo';
import { firestoreRepo } from './firestoreRepo';
import type { Repo } from './types';

/**
 * One selector, one interface. With VITE_FIREBASE_* set (or the emulators
 * running) every read and write goes to Firestore; without a project the local
 * adapter keeps the app fully usable. Nothing above this line knows which.
 */
export const repo: Repo = firebaseConfigured ? firestoreRepo : localRepo;

export const backendKind = repo.kind;
export { DEFAULT_PREFERENCES } from './types';
export type { Repo } from './types';

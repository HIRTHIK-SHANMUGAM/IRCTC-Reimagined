import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import type {
  AppNotification,
  AuditLog,
  Booking,
  ChatMessage,
  Grievance,
  Journey,
  JourneyTracking,
  Person,
  SavedSearch,
  TdrClaim,
  TrainWatch,
  UserProfile,
  Wallet,
  WalletTransaction,
} from '@/types';
import { DEFAULT_PREFERENCES, STARTING_WALLET_BALANCE, type Repo } from './types';
import { getAuthClient, getDb } from '@/lib/firebase';
import { aadhaarRef } from '@/lib/hash';

/**
 * The real backend. Auth is Firebase Auth; every user action persists to
 * Cloud Firestore under /users/{uid}/... exactly as laid out in §5.
 *
 * Sign-in is mobile + OTP with the Aadhaar reference as the durable account
 * key. The demo uses an anonymous Firebase session carrying that key so the
 * flow is complete without a paid SMS provider; swapping in
 * signInWithPhoneNumber + RecaptchaVerifier changes only this file.
 */

function db() {
  const d = getDb();
  if (!d) throw new Error('Firestore is not configured');
  return d;
}

function auth() {
  const a = getAuthClient();
  if (!a) throw new Error('Firebase Auth is not configured');
  return a;
}

function uid(): string {
  const u = auth().currentUser;
  if (!u) throw new Error('Not signed in');
  return u.uid;
}

const userDoc = (id: string) => doc(db(), 'users', id);
const sub = (name: string) => collection(db(), 'users', uid(), name);

async function loadProfile(u: User): Promise<UserProfile | null> {
  const snap = await getDoc(userDoc(u.uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Client-side OTP holding pen. Real SMS delivery is a provider concern. */
const pendingOtp = new Map<string, string>();

export const firestoreRepo: Repo = {
  kind: 'firestore',

  async requestOtp(mobile) {
    pendingOtp.set(mobile, '123456');
    return { sent: true, hint: '123456' };
  },

  async verifyOtp(mobile, otp, aadhaar, name) {
    if ((pendingOtp.get(mobile) ?? '123456') !== otp) {
      throw new Error('That code did not match. Check the six digits and try again.');
    }
    pendingOtp.delete(mobile);

    const cred = await signInAnonymously(auth());
    const ref = await aadhaarRef(aadhaar);
    const existing = await loadProfile(cred.user);

    if (existing) {
      const patch: Partial<UserProfile> = { mobile, aadhaar_ref: ref };
      if (name?.trim()) patch.name = name.trim();
      await updateDoc(userDoc(cred.user.uid), patch);
      return { ...existing, ...patch } as UserProfile;
    }

    const profile: UserProfile = {
      uid: cred.user.uid,
      aadhaar_ref: ref,
      mobile,
      name: name?.trim() || 'Traveller',
      locale: 'en',
      created_at: Date.now(),
      preferences: { ...DEFAULT_PREFERENCES },
      preferences_updated_at: Date.now(),
    };
    await setDoc(userDoc(cred.user.uid), profile);
    await addDoc(collection(db(), 'users', cred.user.uid, 'people'), {
      name: profile.name,
      age: 30,
      gender: 'Other',
      aadhaar_ref: ref,
      relation: 'self',
      is_frequent: true,
      saved_at: Date.now(),
    });
    return profile;
  },

  async currentUser() {
    const u = auth().currentUser;
    return u ? loadProfile(u) : null;
  },

  async signOut() {
    await fbSignOut(auth());
  },

  onUserChanged(cb) {
    return onAuthStateChanged(auth(), async (u) => {
      cb(u ? await loadProfile(u) : null);
    });
  },

  async updateProfile(patch) {
    await updateDoc(userDoc(uid()), patch);
    const snap = await getDoc(userDoc(uid()));
    return snap.data() as UserProfile;
  },

  async updatePreferences(patch) {
    const snap = await getDoc(userDoc(uid()));
    const current = snap.data() as UserProfile;
    const preferences = { ...current.preferences, ...patch };
    await updateDoc(userDoc(uid()), { preferences, preferences_updated_at: Date.now() });
    return { ...current, preferences, preferences_updated_at: Date.now() };
  },

  async listPeople() {
    const snap = await getDocs(query(sub('people'), orderBy('saved_at')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person);
  },

  async addPerson(p) {
    const payload = { ...p, saved_at: Date.now() };
    const created = await addDoc(sub('people'), payload);
    return { id: created.id, ...payload };
  },

  async updatePerson(id, patch) {
    await updateDoc(doc(db(), 'users', uid(), 'people', id), patch);
  },

  async removePerson(id) {
    await deleteDoc(doc(db(), 'users', uid(), 'people', id));
  },

  async listJourneys() {
    const snap = await getDocs(query(sub('journeys'), orderBy('booking_time', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Journey);
  },

  async createJourney(j) {
    const created = await addDoc(sub('journeys'), j);
    // /pnr_status is a top-level record so the railways can resolve a PNR
    // without reading into a user's private tree.
    await setDoc(doc(db(), 'pnr_status', j.pnr), {
      journey_id: created.id,
      user_id: uid(),
      status: j.status,
      seats: j.passengers.map((p) => p.seat_number),
      last_updated: Date.now(),
    });
    return { id: created.id, ...j };
  },

  async updateJourney(id, patch) {
    await updateDoc(doc(db(), 'users', uid(), 'journeys', id), patch);
  },

  async cancelJourney(id, reason) {
    await updateDoc(doc(db(), 'users', uid(), 'journeys', id), {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: Date.now(),
      payment_state: 'refunding',
    });
  },

  async listSavedSearches() {
    const snap = await getDocs(query(sub('saved_searches'), orderBy('saved_at', 'desc'), fsLimit(8)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SavedSearch);
  },

  async saveSearch(s) {
    const payload = { ...s, saved_at: Date.now() };
    const created = await addDoc(sub('saved_searches'), payload);
    return { id: created.id, ...payload };
  },

  async removeSavedSearch(id) {
    await deleteDoc(doc(db(), 'users', uid(), 'saved_searches', id));
  },

  async listNotifications() {
    const snap = await getDocs(query(sub('notifications'), orderBy('created_at', 'desc'), fsLimit(60)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification);
  },

  async pushNotification(n) {
    const payload = { ...n, read: false, created_at: Date.now() };
    const created = await addDoc(sub('notifications'), payload);
    return { id: created.id, ...payload };
  },

  async markNotificationRead(id) {
    await updateDoc(doc(db(), 'users', uid(), 'notifications', id), { read: true });
  },

  async markAllNotificationsRead() {
    const snap = await getDocs(sub('notifications'));
    const batch = writeBatch(db());
    snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  },

  async listMessages() {
    const snap = await getDocs(query(sub('conversations'), orderBy('timestamp'), fsLimit(80)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChatMessage);
  },

  async appendMessage(m) {
    await setDoc(doc(db(), 'users', uid(), 'conversations', m.id), m);
  },

  async clearMessages() {
    const snap = await getDocs(sub('conversations'));
    const batch = writeBatch(db());
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  async listWatches() {
    const snap = await getDocs(sub('watches'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TrainWatch);
  },

  async addWatch(w) {
    const payload = { ...w, created_at: Date.now(), fulfilled: false };
    const created = await addDoc(sub('watches'), payload);
    return { id: created.id, ...payload };
  },

  async removeWatch(id) {
    await deleteDoc(doc(db(), 'users', uid(), 'watches', id));
  },

  async getTracking(pnr) {
    const snap = await getDoc(doc(db(), 'journey_tracking', pnr));
    return snap.exists() ? (snap.data() as JourneyTracking) : null;
  },

  async putTracking(t) {
    await setDoc(doc(db(), 'journey_tracking', t.pnr), t, { merge: true });
  },

  async logAudit(a) {
    await addDoc(collection(db(), 'audit_logs'), { ...a, timestamp: Date.now() });
  },

  async listAudit(limit = 30) {
    const snap = await getDocs(
      query(collection(db(), 'audit_logs'), orderBy('timestamp', 'desc'), fsLimit(limit)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLog);
  },

  /* ---------------------------------------------------------- bookings */

  async listBookings() {
    const snap = await getDocs(sub('bookings'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Booking)
      .sort((a, b) => b.created_at - a.created_at);
  },

  async createBooking(b) {
    const payload = { ...b, created_at: Date.now() };
    const created = await addDoc(sub('bookings'), payload);
    return { id: created.id, ...payload };
  },

  async cancelBooking(id, reason) {
    const ref = doc(db(), 'users', uid(), 'bookings', id);
    const snap = await getDoc(ref);
    const total = snap.exists() ? ((snap.data() as Booking).total ?? 0) : 0;
    await updateDoc(ref, {
      status: 'cancelled',
      cancelled_at: Date.now(),
      cancellation_reason: reason,
      refund_status: 'initiated',
      refund_amount: Math.round(total * 0.8),
    });
  },

  /* ------------------------------------------------------------ wallet */

  async getWallet() {
    const ref = doc(db(), 'users', uid(), 'wallet', 'main');
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as Wallet;
    // First read seeds the welcome balance shown in the header chip.
    const seeded: Wallet = { balance: STARTING_WALLET_BALANCE, updated_at: Date.now() };
    await setDoc(ref, seeded);
    await addDoc(sub('wallet_transactions'), {
      kind: 'credit',
      amount: STARTING_WALLET_BALANCE,
      note: 'Welcome balance',
      created_at: Date.now(),
    });
    return seeded;
  },

  async listWalletTransactions() {
    const snap = await getDocs(sub('wallet_transactions'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as WalletTransaction)
      .sort((a, b) => b.created_at - a.created_at);
  },

  async addWalletTransaction(t) {
    const current = await this.getWallet();
    const delta = t.kind === 'credit' ? t.amount : -t.amount;
    const next: Wallet = {
      balance: Math.max(0, Math.round((current.balance + delta) * 100) / 100),
      updated_at: Date.now(),
    };
    await addDoc(sub('wallet_transactions'), { ...t, created_at: Date.now() });
    await setDoc(doc(db(), 'users', uid(), 'wallet', 'main'), next);
    return next;
  },

  /* -------------------------------------------------------- grievances */

  async listGrievances() {
    const snap = await getDocs(sub('grievances'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Grievance)
      .sort((a, b) => b.created_at - a.created_at);
  },

  async fileGrievance(g) {
    const payload = {
      ...g,
      complaint_id: 'RM' + String(Math.floor(1e8 + Math.random() * 9e8)),
      status: 'filed' as const,
      created_at: Date.now(),
    };
    const created = await addDoc(sub('grievances'), payload);
    return { id: created.id, ...payload };
  },

  /* --------------------------------------------------------------- TDR */

  async listTdrClaims() {
    const snap = await getDocs(sub('tdr_claims'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as TdrClaim)
      .sort((a, b) => b.created_at - a.created_at);
  },

  async fileTdrClaim(c) {
    const payload = {
      ...c,
      tdr_id: 'TDR' + String(Math.floor(1e7 + Math.random() * 9e7)),
      status: 'filed' as const,
      created_at: Date.now(),
    };
    const created = await addDoc(sub('tdr_claims'), payload);
    return { id: created.id, ...payload };
  },
};

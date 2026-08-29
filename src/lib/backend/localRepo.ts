import type {
  AppNotification,
  AuditLog,
  Booking,
  ChatMessage,
  Grievance,
  Journey,
  JourneyTracking,
  Person,
  Preferences,
  SavedSearch,
  TdrClaim,
  TrainWatch,
  UserProfile,
  Wallet,
  WalletTransaction,
} from '@/types';
import { DEFAULT_PREFERENCES, STARTING_WALLET_BALANCE, type Repo } from './types';
import { aadhaarRef, randomId } from '@/lib/hash';

/**
 * Local persistence adapter. Used only when no Firebase project is configured,
 * so the app is runnable and demoable out of the box. Writes survive reload and
 * sign-out/sign-in, which is what the master prompt's persistence bar requires;
 * point VITE_FIREBASE_* at a project (or run the emulators) and the Firestore
 * implementation takes over with no UI changes.
 */

const KEY = 'irctc-ri:v1';

interface Bucket {
  profile: UserProfile;
  people: Person[];
  journeys: Journey[];
  saved: SavedSearch[];
  notifications: AppNotification[];
  messages: ChatMessage[];
  watches: TrainWatch[];
  tracking: Record<string, JourneyTracking>;
  audit: AuditLog[];
  bookings: Booking[];
  wallet: Wallet;
  walletTxns: WalletTransaction[];
  grievances: Grievance[];
  tdr: TdrClaim[];
}

interface Store {
  session: string | null;
  /** Keyed by aadhaar_ref — Aadhaar effectively *is* the account (§6). */
  accounts: Record<string, Bucket>;
  /** mobile → aadhaar_ref, so a returning user is recognised by phone. */
  byMobile: Record<string, string>;
  otp: Record<string, string>;
}

function emptyStore(): Store {
  return { session: null, accounts: {}, byMobile: {}, otp: {} };
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    return { ...emptyStore(), ...parsed };
  } catch {
    return emptyStore();
  }
}

function write(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode — the session still works in memory */
  }
}

type Listener = (u: UserProfile | null) => void;
const listeners = new Set<Listener>();

function emit(u: UserProfile | null): void {
  for (const l of listeners) l(u);
}

function activeBucket(s: Store): Bucket | null {
  if (!s.session) return null;
  return s.accounts[s.session] ?? null;
}

function mutate<T>(fn: (b: Bucket, s: Store) => T): T {
  const s = read();
  const b = activeBucket(s);
  if (!b) throw new Error('Not signed in');
  const result = fn(hydrate(b), s);
  write(s);
  return result;
}

/**
 * Buckets written before the multi-category release lack the newer
 * collections, so every accessor backfills them rather than throwing.
 */
function hydrate(b: Bucket): Bucket {
  b.bookings ??= [];
  b.walletTxns ??= [];
  b.grievances ??= [];
  b.tdr ??= [];
  b.wallet ??= { balance: STARTING_WALLET_BALANCE, updated_at: Date.now() };
  return b;
}

function requireBucket(): Bucket {
  const s = read();
  const b = activeBucket(s);
  if (!b) throw new Error('Not signed in');
  return hydrate(b);
}

export const localRepo: Repo = {
  kind: 'local',

  async requestOtp(mobile) {
    const s = read();
    // Demo OTP. A real deployment uses Firebase Auth phone sign-in.
    s.otp[mobile] = '123456';
    write(s);
    return { sent: true, hint: '123456' };
  },

  async verifyOtp(mobile, otp, aadhaar, name) {
    const s = read();
    if ((s.otp[mobile] ?? '123456') !== otp) {
      throw new Error('That code did not match. Check the six digits and try again.');
    }
    const ref = await aadhaarRef(aadhaar);
    let bucket = s.accounts[ref];
    if (!bucket) {
      const profile: UserProfile = {
        uid: ref,
        aadhaar_ref: ref,
        mobile,
        name: name?.trim() || 'Traveller',
        locale: 'en',
        created_at: Date.now(),
        preferences: { ...DEFAULT_PREFERENCES },
        preferences_updated_at: Date.now(),
      };
      bucket = {
        profile,
        people: [],
        journeys: [],
        saved: [],
        notifications: [],
        messages: [],
        watches: [],
        tracking: {},
        audit: [],
        bookings: [],
        wallet: { balance: STARTING_WALLET_BALANCE, updated_at: Date.now() },
        walletTxns: [
          {
            id: randomId('wt'),
            kind: 'credit',
            amount: STARTING_WALLET_BALANCE,
            note: 'Welcome balance',
            created_at: Date.now(),
          },
        ],
        grievances: [],
        tdr: [],
      };
      // The account holder is always the first travel person.
      bucket.people.push({
        id: randomId('p'),
        name: profile.name,
        age: 30,
        gender: 'Other',
        aadhaar_ref: ref,
        relation: 'self',
        is_frequent: true,
        saved_at: Date.now(),
      });
      s.accounts[ref] = bucket;
    } else if (name?.trim()) {
      bucket.profile.name = name.trim();
    }
    bucket.profile.mobile = mobile;
    s.byMobile[mobile] = ref;
    s.session = ref;
    delete s.otp[mobile];
    write(s);
    emit(bucket.profile);
    return bucket.profile;
  },

  async currentUser() {
    return activeBucket(read())?.profile ?? null;
  },

  async signOut() {
    const s = read();
    s.session = null;
    write(s);
    emit(null);
  },

  onUserChanged(cb) {
    listeners.add(cb);
    void this.currentUser().then(cb);
    return () => listeners.delete(cb);
  },

  async updateProfile(patch) {
    return mutate((b) => {
      b.profile = { ...b.profile, ...patch };
      emit(b.profile);
      return b.profile;
    });
  },

  async updatePreferences(patch) {
    return mutate((b) => {
      b.profile.preferences = { ...b.profile.preferences, ...patch };
      b.profile.preferences_updated_at = Date.now();
      emit(b.profile);
      return b.profile;
    });
  },

  async listPeople() {
    return [...requireBucket().people].sort((a, b) => a.saved_at - b.saved_at);
  },

  async addPerson(p) {
    return mutate((b) => {
      const person: Person = { ...p, id: randomId('p'), saved_at: Date.now() };
      b.people.push(person);
      return person;
    });
  },

  async updatePerson(id, patch) {
    mutate((b) => {
      const i = b.people.findIndex((p) => p.id === id);
      if (i >= 0) b.people[i] = { ...b.people[i], ...patch };
    });
  },

  async removePerson(id) {
    mutate((b) => {
      b.people = b.people.filter((p) => p.id !== id);
    });
  },

  async listJourneys() {
    return [...requireBucket().journeys].sort((a, b) => b.booking_time - a.booking_time);
  },

  async createJourney(j) {
    return mutate((b) => {
      const journey: Journey = { ...j, id: randomId('j') };
      b.journeys.push(journey);
      return journey;
    });
  },

  async updateJourney(id, patch) {
    mutate((b) => {
      const i = b.journeys.findIndex((x) => x.id === id);
      if (i >= 0) b.journeys[i] = { ...b.journeys[i], ...patch };
    });
  },

  async cancelJourney(id, reason) {
    mutate((b) => {
      const i = b.journeys.findIndex((x) => x.id === id);
      if (i >= 0) {
        b.journeys[i] = {
          ...b.journeys[i],
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: Date.now(),
          payment_state: 'refunding',
        };
      }
    });
  },

  async listSavedSearches() {
    return [...requireBucket().saved].sort((a, b) => b.saved_at - a.saved_at);
  },

  async saveSearch(s) {
    return mutate((b) => {
      const entry: SavedSearch = { ...s, id: randomId('s'), saved_at: Date.now() };
      b.saved = [entry, ...b.saved.filter((x) => !(x.from === s.from && x.to === s.to && x.date === s.date))].slice(0, 8);
      return entry;
    });
  },

  async removeSavedSearch(id) {
    mutate((b) => {
      b.saved = b.saved.filter((x) => x.id !== id);
    });
  },

  async listNotifications() {
    return [...requireBucket().notifications].sort((a, b) => b.created_at - a.created_at);
  },

  async pushNotification(n) {
    return mutate((b) => {
      const notif: AppNotification = { ...n, id: randomId('n'), read: false, created_at: Date.now() };
      b.notifications = [notif, ...b.notifications].slice(0, 60);
      return notif;
    });
  },

  async markNotificationRead(id) {
    mutate((b) => {
      const i = b.notifications.findIndex((n) => n.id === id);
      if (i >= 0) b.notifications[i] = { ...b.notifications[i], read: true };
    });
  },

  async markAllNotificationsRead() {
    mutate((b) => {
      b.notifications = b.notifications.map((n) => ({ ...n, read: true }));
    });
  },

  async listMessages() {
    return [...requireBucket().messages];
  },

  async appendMessage(m) {
    mutate((b) => {
      b.messages = [...b.messages, m].slice(-80);
    });
  },

  async clearMessages() {
    mutate((b) => {
      b.messages = [];
    });
  },

  async listWatches() {
    return [...requireBucket().watches];
  },

  async addWatch(w) {
    return mutate((b) => {
      const watch: TrainWatch = { ...w, id: randomId('w'), created_at: Date.now(), fulfilled: false };
      b.watches.push(watch);
      return watch;
    });
  },

  async removeWatch(id) {
    mutate((b) => {
      b.watches = b.watches.filter((w) => w.id !== id);
    });
  },

  async getTracking(pnr) {
    return requireBucket().tracking[pnr] ?? null;
  },

  async putTracking(t) {
    mutate((b) => {
      b.tracking[t.pnr] = t;
    });
  },

  async logAudit(a) {
    mutate((b) => {
      b.audit = [{ ...a, id: randomId('a'), timestamp: Date.now() }, ...b.audit].slice(0, 120);
    });
  },

  async listAudit(limit = 30) {
    return requireBucket().audit.slice(0, limit);
  },

  /* ---------------------------------------------------------- bookings */

  async listBookings() {
    return [...requireBucket().bookings].sort((a, b) => b.created_at - a.created_at);
  },

  async createBooking(b) {
    return mutate((bucket) => {
      const booking: Booking = { ...b, id: randomId('bk'), created_at: Date.now() };
      bucket.bookings.push(booking);
      return booking;
    });
  },

  async cancelBooking(id, reason) {
    mutate((bucket) => {
      bucket.bookings = bucket.bookings.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'cancelled' as const,
              cancelled_at: Date.now(),
              cancellation_reason: reason,
              refund_status: 'initiated' as const,
              refund_amount: Math.round(b.total * 0.8),
            }
          : b,
      );
    });
  },

  /* ------------------------------------------------------------ wallet */

  async getWallet() {
    return { ...requireBucket().wallet };
  },

  async listWalletTransactions() {
    return [...requireBucket().walletTxns].sort((a, b) => b.created_at - a.created_at);
  },

  async addWalletTransaction(t) {
    return mutate((bucket) => {
      const txn: WalletTransaction = { ...t, id: randomId('wt'), created_at: Date.now() };
      bucket.walletTxns.push(txn);
      const delta = t.kind === 'credit' ? t.amount : -t.amount;
      bucket.wallet = {
        balance: Math.max(0, Math.round((bucket.wallet.balance + delta) * 100) / 100),
        updated_at: Date.now(),
      };
      return { ...bucket.wallet };
    });
  },

  /* -------------------------------------------------------- grievances */

  async listGrievances() {
    return [...requireBucket().grievances].sort((a, b) => b.created_at - a.created_at);
  },

  async fileGrievance(g) {
    return mutate((bucket) => {
      const grievance: Grievance = {
        ...g,
        id: randomId('gr'),
        complaint_id: 'RM' + String(Math.floor(1e8 + Math.random() * 9e8)),
        status: 'filed',
        created_at: Date.now(),
      };
      bucket.grievances.push(grievance);
      return grievance;
    });
  },

  /* --------------------------------------------------------------- TDR */

  async listTdrClaims() {
    return [...requireBucket().tdr].sort((a, b) => b.created_at - a.created_at);
  },

  async fileTdrClaim(c) {
    return mutate((bucket) => {
      const claim: TdrClaim = {
        ...c,
        id: randomId('td'),
        tdr_id: 'TDR' + String(Math.floor(1e7 + Math.random() * 9e7)),
        status: 'filed',
        created_at: Date.now(),
      };
      bucket.tdr.push(claim);
      return claim;
    });
  },
};

export type { Preferences };

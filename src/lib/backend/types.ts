import type {
  AppNotification,
  AuditLog,
  Booking,
  Grievance,
  Journey,
  JourneyTracking,
  Person,
  Preferences,
  SavedSearch,
  TdrClaim,
  TrainWatch,
  UserProfile,
  ChatMessage,
  Wallet,
  WalletTransaction,
} from '@/types';

/**
 * Everything the app persists. Two implementations sit behind this:
 *  - firestoreRepo — the real backend (Auth + Firestore + Functions)
 *  - localRepo     — a durable local adapter used only when no Firebase
 *                    project is configured, so the app still runs and demos.
 * The UI never knows which one it is talking to.
 */
export interface Repo {
  readonly kind: 'firestore' | 'local';

  /* auth */
  requestOtp(mobile: string): Promise<{ sent: boolean; hint?: string }>;
  verifyOtp(mobile: string, otp: string, aadhaar: string, name?: string): Promise<UserProfile>;
  currentUser(): Promise<UserProfile | null>;
  signOut(): Promise<void>;
  onUserChanged(cb: (u: UserProfile | null) => void): () => void;

  /* profile */
  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile>;
  updatePreferences(patch: Partial<Preferences>): Promise<UserProfile>;

  /* people */
  listPeople(): Promise<Person[]>;
  addPerson(p: Omit<Person, 'id' | 'saved_at'>): Promise<Person>;
  updatePerson(id: string, patch: Partial<Person>): Promise<void>;
  removePerson(id: string): Promise<void>;

  /* journeys */
  listJourneys(): Promise<Journey[]>;
  createJourney(j: Omit<Journey, 'id'>): Promise<Journey>;
  updateJourney(id: string, patch: Partial<Journey>): Promise<void>;
  cancelJourney(id: string, reason: string): Promise<void>;

  /* saved searches */
  listSavedSearches(): Promise<SavedSearch[]>;
  saveSearch(s: Omit<SavedSearch, 'id' | 'saved_at'>): Promise<SavedSearch>;
  removeSavedSearch(id: string): Promise<void>;

  /* notifications */
  listNotifications(): Promise<AppNotification[]>;
  pushNotification(n: Omit<AppNotification, 'id' | 'created_at' | 'read'>): Promise<AppNotification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;

  /* conversation */
  listMessages(): Promise<ChatMessage[]>;
  appendMessage(m: ChatMessage): Promise<void>;
  clearMessages(): Promise<void>;

  /* watches */
  listWatches(): Promise<TrainWatch[]>;
  addWatch(w: Omit<TrainWatch, 'id' | 'created_at' | 'fulfilled'>): Promise<TrainWatch>;
  removeWatch(id: string): Promise<void>;

  /* cross-category bookings (flights, buses, hotels, cabs, packages, …) */
  listBookings(): Promise<Booking[]>;
  createBooking(b: Omit<Booking, 'id' | 'created_at'>): Promise<Booking>;
  cancelBooking(id: string, reason: string): Promise<void>;

  /* eWallet — a genuinely persisted balance and ledger (addendum §5) */
  getWallet(): Promise<Wallet>;
  listWalletTransactions(): Promise<WalletTransaction[]>;
  addWalletTransaction(t: Omit<WalletTransaction, 'id' | 'created_at'>): Promise<Wallet>;

  /* Rail Madad grievances */
  listGrievances(): Promise<Grievance[]>;
  fileGrievance(g: Omit<Grievance, 'id' | 'complaint_id' | 'created_at' | 'status'>): Promise<Grievance>;

  /* TDR refund claims */
  listTdrClaims(): Promise<TdrClaim[]>;
  fileTdrClaim(c: Omit<TdrClaim, 'id' | 'tdr_id' | 'created_at' | 'status'>): Promise<TdrClaim>;

  /* tracking + audit */
  getTracking(pnr: string): Promise<JourneyTracking | null>;
  putTracking(t: JourneyTracking): Promise<void>;
  logAudit(a: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  listAudit(limit?: number): Promise<AuditLog[]>;
}

/** Seeded starting balance, matching the header chip in the reference. */
export const STARTING_WALLET_BALANCE = 1250;

export const DEFAULT_PREFERENCES: Preferences = {
  preferred_class: '3A',
  preferred_departure: 'morning',
  max_budget: 1500,
  comfort_over_price: 'sometimes',
  fewer_changes: true,
  personalization_enabled: true,
};

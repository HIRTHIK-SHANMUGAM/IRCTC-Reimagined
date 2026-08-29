import { create } from 'zustand';
import type {
  AppNotification,
  Booking,
  Journey,
  Locale,
  Person,
  Preferences,
  SavedSearch,
  UserProfile,
  Wallet,
  WalletTransaction,
} from '@/types';
import { repo } from '@/lib/backend';
import { setLocale } from '@/i18n';

interface SessionState {
  user: UserProfile | null;
  people: Person[];
  journeys: Journey[];
  saved: SavedSearch[];
  notifications: AppNotification[];
  bookings: Booking[];
  wallet: Wallet;
  walletTxns: WalletTransaction[];
  ready: boolean;
  busy: boolean;

  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  signIn: (mobile: string, otp: string, aadhaar: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLanguage: (locale: Locale) => Promise<void>;
  savePreferences: (patch: Partial<Preferences>) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  addPerson: (p: Omit<Person, 'id' | 'saved_at'>) => Promise<void>;
  removePerson: (id: string) => Promise<void>;
  addJourney: (j: Omit<Journey, 'id'>) => Promise<Journey>;
  patchJourney: (id: string, patch: Partial<Journey>) => Promise<void>;
  cancelJourney: (id: string, reason: string) => Promise<void>;
  saveSearch: (s: Omit<SavedSearch, 'id' | 'saved_at'>) => Promise<void>;
  notify: (n: Omit<AppNotification, 'id' | 'created_at' | 'read'>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;

  /* cross-category bookings + the eWallet ledger */
  addBooking: (b: Omit<Booking, 'id' | 'created_at'>) => Promise<Booking>;
  cancelBooking: (id: string, reason: string) => Promise<void>;
  /** Debits the wallet and records the ledger line. Returns false if short. */
  payFromWallet: (amount: number, note: string, ref?: string) => Promise<boolean>;
  topUpWallet: (amount: number) => Promise<void>;
  creditWallet: (amount: number, note: string, ref?: string) => Promise<void>;
}

async function loadAll() {
  const [people, journeys, saved, notifications, bookings, wallet, walletTxns] = await Promise.all([
    repo.listPeople(),
    repo.listJourneys(),
    repo.listSavedSearches(),
    repo.listNotifications(),
    repo.listBookings(),
    repo.getWallet(),
    repo.listWalletTransactions(),
  ]);
  return { people, journeys, saved, notifications, bookings, wallet, walletTxns };
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  people: [],
  journeys: [],
  saved: [],
  notifications: [],
  bookings: [],
  wallet: { balance: 0, updated_at: 0 },
  walletTxns: [],
  ready: false,
  busy: false,

  async bootstrap() {
    const user = await repo.currentUser();
    if (!user) {
      set({ user: null, ready: true });
      return;
    }
    const data = await loadAll();
    if (user.locale) await setLocale(user.locale);
    set({ user, ...data, ready: true });
  },

  async refresh() {
    if (!get().user) return;
    // The profile is re-read too — seeding and preference writes change it, and
    // a stale copy here means the UI keeps using yesterday's home station.
    const [user, data] = await Promise.all([repo.currentUser(), loadAll()]);
    set({ ...data, ...(user ? { user } : {}) });
  },

  async signIn(mobile, otp, aadhaar, name) {
    set({ busy: true });
    try {
      const user = await repo.verifyOtp(mobile, otp, aadhaar, name);
      const data = await loadAll();
      if (user.locale) await setLocale(user.locale);
      set({ user, ...data, ready: true });
    } finally {
      set({ busy: false });
    }
  },

  async signOut() {
    await repo.signOut();
    set({ user: null, people: [], journeys: [], saved: [], notifications: [] });
  },

  async setLanguage(locale) {
    await setLocale(locale);
    if (!get().user) return;
    const user = await repo.updateProfile({ locale });
    set({ user });
  },

  async savePreferences(patch) {
    const user = await repo.updatePreferences(patch);
    set({ user });
  },

  async updateName(name) {
    const user = await repo.updateProfile({ name });
    set({ user });
  },

  async addPerson(p) {
    await repo.addPerson(p);
    set({ people: await repo.listPeople() });
  },

  async removePerson(id) {
    await repo.removePerson(id);
    set({ people: await repo.listPeople() });
  },

  async addJourney(j) {
    const journey = await repo.createJourney(j);
    set({ journeys: await repo.listJourneys() });
    return journey;
  },

  async patchJourney(id, patch) {
    await repo.updateJourney(id, patch);
    set({ journeys: await repo.listJourneys() });
  },

  async cancelJourney(id, reason) {
    await repo.cancelJourney(id, reason);
    set({ journeys: await repo.listJourneys() });
  },

  async saveSearch(s) {
    await repo.saveSearch(s);
    set({ saved: await repo.listSavedSearches() });
  },

  async notify(n) {
    await repo.pushNotification(n);
    set({ notifications: await repo.listNotifications() });
  },

  async markRead(id) {
    await repo.markNotificationRead(id);
    set({ notifications: await repo.listNotifications() });
  },

  async markAllRead() {
    await repo.markAllNotificationsRead();
    set({ notifications: await repo.listNotifications() });
  },

  /* ------------------------------------------------ bookings + wallet */

  async addBooking(b) {
    const booking = await repo.createBooking(b);
    set({ bookings: [booking, ...get().bookings] });
    return booking;
  },

  async cancelBooking(id, reason) {
    await repo.cancelBooking(id, reason);
    const booking = get().bookings.find((x) => x.id === id);
    set({ bookings: await repo.listBookings() });
    // Cancellation refunds 80% straight back to the wallet, visibly.
    if (booking) {
      const refund = Math.round(booking.total * 0.8);
      if (refund > 0) await get().creditWallet(refund, `Refund · ${booking.title}`, booking.reference);
    }
  },

  async payFromWallet(amount, note, ref) {
    if (get().wallet.balance < amount) return false;
    const wallet = await repo.addWalletTransaction({
      kind: 'debit',
      amount,
      note,
      booking_ref: ref,
    });
    set({ wallet, walletTxns: await repo.listWalletTransactions() });
    return true;
  },

  async topUpWallet(amount) {
    const wallet = await repo.addWalletTransaction({
      kind: 'credit',
      amount,
      note: 'Added to wallet',
    });
    set({ wallet, walletTxns: await repo.listWalletTransactions() });
  },

  async creditWallet(amount, note, ref) {
    const wallet = await repo.addWalletTransaction({
      kind: 'credit',
      amount,
      note,
      booking_ref: ref,
    });
    set({ wallet, walletTxns: await repo.listWalletTransactions() });
  },
}));

/** Upcoming journeys, soonest first. */
export function upcomingJourneys(journeys: Journey[]): Journey[] {
  const today = new Date().toISOString().slice(0, 10);
  return journeys
    .filter((j) => j.status !== 'cancelled' && j.status !== 'completed' && j.journey_date >= today)
    .sort((a, b) => a.journey_date.localeCompare(b.journey_date));
}

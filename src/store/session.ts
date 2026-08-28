import { create } from 'zustand';
import type {
  AppNotification,
  Journey,
  Locale,
  Person,
  Preferences,
  SavedSearch,
  UserProfile,
} from '@/types';
import { repo } from '@/lib/backend';
import { setLocale } from '@/i18n';

interface SessionState {
  user: UserProfile | null;
  people: Person[];
  journeys: Journey[];
  saved: SavedSearch[];
  notifications: AppNotification[];
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
}

async function loadAll() {
  const [people, journeys, saved, notifications] = await Promise.all([
    repo.listPeople(),
    repo.listJourneys(),
    repo.listSavedSearches(),
    repo.listNotifications(),
  ]);
  return { people, journeys, saved, notifications };
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  people: [],
  journeys: [],
  saved: [],
  notifications: [],
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
    set(await loadAll());
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
}));

/** Upcoming journeys, soonest first. */
export function upcomingJourneys(journeys: Journey[]): Journey[] {
  const today = new Date().toISOString().slice(0, 10);
  return journeys
    .filter((j) => j.status !== 'cancelled' && j.status !== 'completed' && j.journey_date >= today)
    .sort((a, b) => a.journey_date.localeCompare(b.journey_date));
}

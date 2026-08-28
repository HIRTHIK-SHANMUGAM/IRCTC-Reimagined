import { create } from 'zustand';
import type {
  FareBreakdown,
  JourneyPassenger,
  PaymentState,
  Person,
  RankedTrain,
  SearchQuery,
} from '@/types';

/**
 * The booking draft. The agent may fill every field here — that is the amber
 * "prepare" autonomy level. Turning it into a Journey requires the red
 * "execute" step, which only the user can take (master prompt §7).
 */

export type BerthPreference = 'none' | 'lower' | 'middle' | 'upper' | 'side_lower' | 'window';

interface BookingState {
  query: SearchQuery | null;
  selection: RankedTrain | null;
  passengers: Person[];
  berth: BerthPreference;
  paymentMethod: string;
  paymentState: PaymentState | null;
  preparedByAgent: boolean;

  setQuery: (q: SearchQuery) => void;
  patchQuery: (patch: Partial<SearchQuery>) => void;
  select: (r: RankedTrain | null) => void;
  setPassengers: (p: Person[]) => void;
  togglePassenger: (p: Person) => void;
  setBerth: (b: BerthPreference) => void;
  setPaymentMethod: (m: string) => void;
  setPaymentState: (s: PaymentState | null) => void;
  markPrepared: (v: boolean) => void;
  reset: () => void;
}

export const useBooking = create<BookingState>((set, get) => ({
  query: null,
  selection: null,
  passengers: [],
  berth: 'none',
  paymentMethod: 'upi',
  paymentState: null,
  preparedByAgent: false,

  setQuery: (query) => set({ query }),
  patchQuery: (patch) => {
    const q = get().query;
    if (q) set({ query: { ...q, ...patch } });
  },
  select: (selection) => set({ selection }),
  setPassengers: (passengers) => set({ passengers }),
  togglePassenger: (p) => {
    const current = get().passengers;
    set({
      passengers: current.some((x) => x.id === p.id)
        ? current.filter((x) => x.id !== p.id)
        : [...current, p],
    });
  },
  setBerth: (berth) => set({ berth }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setPaymentState: (paymentState) => set({ paymentState }),
  markPrepared: (preparedByAgent) => set({ preparedByAgent }),
  reset: () =>
    set({
      query: null,
      selection: null,
      passengers: [],
      berth: 'none',
      paymentMethod: 'upi',
      paymentState: null,
      preparedByAgent: false,
    }),
}));

/* ---------------------------------------------------------------- fares */

export const CONVENIENCE_FEE_PER_TICKET = 20;
export const INSURANCE_PER_TICKET = 5;

/** Full breakdown, always shown before payment. Nothing hidden (§11). */
export function computeFare(pricePerSeat: number, passengers: number): FareBreakdown & { total: number } {
  const base = pricePerSeat * passengers;
  const convenience_fee = CONVENIENCE_FEE_PER_TICKET * passengers;
  const insurance = INSURANCE_PER_TICKET * passengers;
  return {
    base,
    convenience_fee,
    insurance,
    other: 0,
    total: base + convenience_fee + insurance,
  };
}

const BERTH_ORDER: Record<BerthPreference, string[]> = {
  none: ['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper'],
  lower: ['Lower', 'Side Lower', 'Middle', 'Upper'],
  middle: ['Middle', 'Lower', 'Upper'],
  upper: ['Upper', 'Middle', 'Side Upper'],
  side_lower: ['Side Lower', 'Lower', 'Middle'],
  window: ['Window', 'Aisle'],
};

const SEATING_CLASSES = new Set(['CC', 'EC', '2S']);

/** Deterministic seat allocation, so a demo booking always looks sensible. */
export function allocateSeats(
  people: Person[],
  travelClass: string,
  berth: BerthPreference,
  status: 'confirmed' | 'RAC' | 'waitlist',
  seedText: string,
): JourneyPassenger[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;

  const seating = SEATING_CLASSES.has(travelClass);
  const coachPrefix = seating ? 'C' : travelClass === 'SL' ? 'S' : travelClass === '1A' ? 'H' : 'B';
  const coachNumber = 1 + (seed % 4);
  const berthOrder = seating ? BERTH_ORDER.window : BERTH_ORDER[berth];
  const firstSeat = 1 + (seed % 40);

  return people.map((p, i) => ({
    person_id: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    coach: status === 'waitlist' ? '—' : `${coachPrefix}${coachNumber}`,
    seat_number: status === 'waitlist' ? `WL ${i + 1}` : String(firstSeat + i * 2),
    berth_type:
      status === 'waitlist'
        ? 'Allotted after chart preparation'
        : berthOrder[(seed + i) % berthOrder.length],
    status: status === 'confirmed' ? 'confirmed' : status === 'RAC' ? 'RAC' : 'waitlist',
  }));
}

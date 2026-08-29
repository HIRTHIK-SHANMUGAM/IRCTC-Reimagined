/** Domain model. Mirrors the Firestore schema in the master prompt §5. */

export type Locale = 'en' | 'ta' | 'hi';

/** A translatable value stored as a language map, so one toggle switches
 *  UI strings *and* railway data (master prompt §12). */
export type LocalizedText = Record<Locale, string> & { [key: string]: string };

export type TravelClass = 'SL' | '3A' | '2A' | '1A' | 'CC' | 'EC' | '2S';

export type Quota =
  | 'General'
  | 'Tatkal'
  | 'Premium Tatkal'
  | 'Ladies'
  | 'Senior'
  | 'Divyangjan';

export type DeparturePreference = 'morning' | 'afternoon' | 'evening' | 'night' | 'any';

export type AvailabilityState = 'available' | 'rac' | 'waitlist' | 'unavailable';

export type JourneyStatus = 'confirmed' | 'RAC' | 'waitlist' | 'cancelled' | 'completed';

export type PaymentState =
  | 'initiated'
  | 'processing'
  | 'received'
  | 'reserving'
  | 'confirmed'
  | 'failed'
  | 'refunding'
  | 'refunded';

export interface Station {
  code: string;
  name: LocalizedText;
  city: LocalizedText;
  state: string;
  /** Rough coordinates, used only to draw the route line. */
  lat: number;
  lng: number;
}

export interface TrainClassOption {
  name: TravelClass;
  price: number;
  total_seats: number;
  available_seats: number;
  /** Derived presentation state; seeded so the demo is deterministic. */
  state: AvailabilityState;
  /** Waitlist position when state === 'waitlist'. */
  waitlist_position?: number;
  /** 0..1 — surfaced as Low / Medium / High, never as a bare number. */
  confirmation_probability?: number;
}

export interface TrainStop {
  station: string;
  arrival: string | null;
  departure: string | null;
  day: number;
  distance_km: number;
  platform?: number;
}

export interface Train {
  id: string;
  number: string;
  name: LocalizedText;
  from_station: string;
  to_station: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  distance_km: number;
  rating: number;
  /** 0=Sunday .. 6=Saturday */
  runs_on: number[];
  classes: TrainClassOption[];
  stops: TrainStop[];
  /** Presentation hints used by the ranking explanation. */
  has_pantry: boolean;
  is_overnight: boolean;
  punctuality: number;
}

export interface Person {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  /** Tokenised. A raw Aadhaar number is never persisted or displayed (§6). */
  aadhaar_ref: string;
  relation: string;
  is_frequent: boolean;
  saved_at: number;
}

export interface Preferences {
  preferred_class: TravelClass;
  preferred_departure: DeparturePreference;
  max_budget: number;
  comfort_over_price: 'always' | 'sometimes' | 'never';
  fewer_changes: boolean;
  personalization_enabled: boolean;
}

export interface UserProfile {
  uid: string;
  aadhaar_ref: string;
  mobile: string;
  name: string;
  locale: Locale;
  created_at: number;
  preferences: Preferences;
  preferences_updated_at: number;
  home_station?: string;
  elder_mode?: boolean;
}

export interface JourneyPassenger {
  person_id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  seat_number: string;
  berth_type: string;
  coach: string;
  status: JourneyStatus;
}

export interface FareBreakdown {
  base: number;
  convenience_fee: number;
  insurance: number;
  other: number;
}

export interface Journey {
  id: string;
  /** Backend marker. Never presented as something to memorise (§6). */
  pnr: string;
  train_id: string;
  train_number: string;
  train_name: LocalizedText;
  from_station: string;
  to_station: string;
  journey_date: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  class: TravelClass;
  quota: Quota;
  passengers: JourneyPassenger[];
  total_fare: number;
  fare_breakdown: FareBreakdown;
  status: JourneyStatus;
  booking_time: number;
  payment_method: string;
  payment_state: PaymentState;
  boarding_station?: string;
  cancellation_reason?: string;
  cancelled_at?: number;
}

export interface SavedSearch {
  id: string;
  from: string;
  to: string;
  date: string;
  class?: TravelClass;
  note?: string;
  saved_at: number;
}

export type NotificationPriority = 'critical' | 'important' | 'useful' | 'marketing';

export type NotificationType =
  | 'cancelled'
  | 'platform_change'
  | 'delay'
  | 'arriving_soon'
  | 'arrived'
  | 'departing'
  | 'chart_prepared'
  | 'watch_hit'
  | 'promo';

export interface AppNotification {
  id: string;
  priority: NotificationPriority;
  type: NotificationType;
  title: string;
  body: string;
  journey_id?: string;
  read: boolean;
  created_at: number;
}

export interface JourneyTracking {
  pnr: string;
  current_station: string;
  next_stop: { station: string; arrival_time: string } | null;
  delay_minutes: number;
  platform: number;
  speed_kmh: number;
  /** 0..1 along the route, drives the progress rail. */
  progress: number;
  alerts: { type: string; message: string; timestamp: number }[];
  updated_at: number;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  input_entities: Record<string, unknown>;
  reasoning: string;
  result: string;
  timestamp: number;
}

export interface TrainWatch {
  id: string;
  train_id: string;
  travel_class: TravelClass;
  date: string;
  created_at: number;
  fulfilled: boolean;
}

/* ---------- Agent ---------- */

export interface JourneyIntentEntities {
  from?: string;
  to?: string;
  date?: string;
  time_window?: DeparturePreference;
  budget?: number;
  travel_class?: TravelClass;
  passengers?: number;
  priority?: 'cheapest' | 'fastest' | 'comfort' | 'balanced';
  quota?: Quota;
}

export type AgentIntent =
  | 'search_trains'
  | 'pnr_status'
  | 'track_train'
  | 'cancel_booking'
  | 'explore'
  | 'book_usual'
  | 'refine'
  | 'greeting'
  | 'unknown';

export interface AgentAction {
  id: string;
  label: string;
  /** Autonomy level, enforced in the UI (master prompt §7). */
  level: 'suggest' | 'prepare' | 'execute';
  payload?: Record<string, unknown>;
}

export interface AgentTurn {
  intent: AgentIntent;
  entities: JourneyIntentEntities;
  response_text: string;
  missing_field?: keyof JourneyIntentEntities;
  suggested_actions: AgentAction[];
  /** Which engine produced this turn — surfaced honestly in the UI. */
  engine: 'groq' | 'rules';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: number;
  intent?: AgentIntent;
  entities?: JourneyIntentEntities;
  /** Attached result cards, so the agent is never a bare chat wall (§7.4). */
  results?: RankedTrain[];
  actions?: AgentAction[];
  engine?: 'groq' | 'rules';
}

export interface RankedTrain {
  train: Train;
  travel_class: TravelClass;
  price: number;
  availability: TrainClassOption;
  score: number;
  /** The "Why?" that must accompany every recommendation (§7). */
  reasons: string[];
  bucket?: 'best' | 'cheapest' | 'fastest' | 'comfort' | 'earliest';
}

export interface SearchQuery {
  from: string;
  to: string;
  date: string;
  travel_class?: TravelClass;
  quota: Quota;
  passengers: number;
  budget?: number;
  time_window?: DeparturePreference;
  priority?: 'cheapest' | 'fastest' | 'comfort' | 'balanced';
}

export interface Alternative {
  kind: 'other_day' | 'other_class' | 'nearby_station' | 'other_quota';
  label: string;
  reason: string;
  query: Partial<SearchQuery>;
}

/* ------------------------------------------------------------------ */
/* Cross-category bookings (addendum §5)                               */
/* ------------------------------------------------------------------ */

/**
 * Every non-train product books through one generic shape so My Trips,
 * Cancelled Tickets, the wallet ledger and TDR all work across categories
 * without a per-product branch.
 */
export type BookingCategory =
  | 'train'
  | 'flight'
  | 'bus'
  | 'hotel'
  | 'cab'
  | 'package'
  | 'activity'
  | 'food'
  | 'retiring'
  | 'lounge';

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending';

export type RefundStatus = 'none' | 'initiated' | 'processed';

export interface Booking {
  id: string;
  category: BookingCategory;
  /** PNR-style reference the user is shown on the confirmation screen. */
  reference: string;
  title: string;
  subtitle: string;
  /** ISO date of travel / check-in / delivery. */
  date: string;
  time?: string;
  status: BookingStatus;
  total: number;
  /** Rendered as a label/value grid on the ticket and detail views. */
  details: Record<string, string>;
  created_at: number;
  cancelled_at?: number;
  cancellation_reason?: string;
  refund_status?: RefundStatus;
  refund_amount?: number;
  /** Promo code applied at mock checkout, if any. */
  promo_code?: string;
}

/* ---------------------------------------------------------- eWallet ---- */

export interface WalletTransaction {
  id: string;
  kind: 'credit' | 'debit';
  amount: number;
  note: string;
  /** Booking this transaction settled, when it came from a checkout. */
  booking_ref?: string;
  created_at: number;
}

export interface Wallet {
  balance: number;
  updated_at: number;
}

/* ------------------------------------------------------- Rail Madad ---- */

export type CaseStatus = 'filed' | 'under_review' | 'resolved';

export interface Grievance {
  id: string;
  complaint_id: string;
  category: string;
  reference: string;
  description: string;
  status: CaseStatus;
  created_at: number;
}

/* -------------------------------------------------------------- TDR ---- */

export interface TdrClaim {
  id: string;
  tdr_id: string;
  pnr: string;
  reason: string;
  status: CaseStatus;
  amount: number;
  created_at: number;
}

/* ------------------------------------------------------- Loyalty ------- */

export type LoyaltyTier = 'Silver' | 'Gold' | 'Platinum';

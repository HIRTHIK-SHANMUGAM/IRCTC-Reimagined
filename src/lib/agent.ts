import { httpsCallable } from 'firebase/functions';
import type {
  AgentAction,
  AgentTurn,
  JourneyIntentEntities,
  ChatMessage,
  RankedTrain,
} from '@/types';
import { getFns, firebaseConfigured } from '@/lib/firebase';
import { rulesTurn, nextMissingField, MISSING_FIELD_QUESTION } from '@/engine/intent';
import { STATIONS } from '@/data/stations';
import { availabilityLabel } from '@/engine/availability';
import { formatDuration } from '@/engine/search';

/**
 * One interface, two engines. Groq runs server-side in a Cloud Function; the
 * rules engine runs in the browser. If Groq is missing, slow or rate-limited we
 * fall through silently and the flow is identical (master prompt §7).
 */

const STATION_LIST = STATIONS.map((s) => ({
  code: s.code,
  name: s.name.en,
  city: s.city.en,
}));

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface RawTurn {
  intent?: string;
  entities?: Record<string, unknown>;
  missing_field?: string | null;
  response_text?: string;
  suggested_actions?: AgentAction[];
}

/** The model's output is untrusted shape-wise; coerce it against our types. */
function coerce(raw: RawTurn, fallback: AgentTurn): AgentTurn {
  const e = (raw.entities ?? {}) as Record<string, unknown>;
  const codes = new Set(STATIONS.map((s) => s.code));

  const entities: JourneyIntentEntities = { ...fallback.entities };
  // Only accept a station the data layer actually knows about.
  if (typeof e.from === 'string' && codes.has(e.from)) entities.from = e.from;
  if (typeof e.to === 'string' && codes.has(e.to)) entities.to = e.to;
  if (typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date)) entities.date = e.date;
  if (typeof e.budget === 'number' && e.budget > 0) entities.budget = e.budget;
  if (typeof e.passengers === 'number' && e.passengers > 0 && e.passengers <= 6) {
    entities.passengers = Math.round(e.passengers);
  }
  if (typeof e.time_window === 'string' && ['morning', 'afternoon', 'evening', 'night', 'any'].includes(e.time_window)) {
    entities.time_window = e.time_window as JourneyIntentEntities['time_window'];
  }
  if (typeof e.travel_class === 'string' && ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S'].includes(e.travel_class)) {
    entities.travel_class = e.travel_class as JourneyIntentEntities['travel_class'];
  }
  if (typeof e.priority === 'string' && ['cheapest', 'fastest', 'comfort', 'balanced'].includes(e.priority)) {
    entities.priority = e.priority as JourneyIntentEntities['priority'];
  }

  const intent = (
    [
      'search_trains', 'pnr_status', 'track_train', 'cancel_booking',
      'explore', 'book_usual', 'refine', 'greeting', 'unknown',
    ].includes(String(raw.intent))
      ? raw.intent
      : fallback.intent
  ) as AgentTurn['intent'];

  const actions = Array.isArray(raw.suggested_actions)
    ? raw.suggested_actions
        .filter((a) => a && typeof a.label === 'string')
        // The model can suggest, never escalate. Execute is the UI's to grant.
        .map((a) => ({
          id: String(a.id ?? a.label),
          label: String(a.label).slice(0, 40),
          level: a.level === 'prepare' ? ('prepare' as const) : ('suggest' as const),
        }))
        .slice(0, 3)
    : [];

  const missing = nextMissingField(entities);

  return {
    intent,
    entities,
    response_text:
      typeof raw.response_text === 'string' && raw.response_text.trim()
        ? raw.response_text.trim().slice(0, 400)
        : fallback.response_text,
    missing_field: missing,
    suggested_actions: actions,
    engine: 'groq',
  };
}

export interface AgentContext {
  history: ChatMessage[];
  carried: JourneyIntentEntities;
  candidates?: RankedTrain[];
}

/** Compact, verified train facts. The model may describe these and nothing else. */
function candidatePayload(rows: RankedTrain[] = []) {
  return rows.slice(0, 6).map((r) => ({
    number: r.train.number,
    name: r.train.name.en,
    class: r.travel_class,
    price: r.price,
    departure: r.train.departure_time,
    arrival: r.train.arrival_time,
    duration_minutes: r.train.duration_minutes,
    availability: availabilityLabel(r.availability).headline,
    duration: formatDuration(r.train.duration_minutes),
  }));
}

export async function runAgentTurn(
  message: string,
  ctx: AgentContext,
): Promise<AgentTurn> {
  // The deterministic result is computed first and always available. Groq can
  // only improve on it; it can never be the sole source of an answer.
  const fallback = rulesTurn(message, ctx.carried);

  const fns = firebaseConfigured ? getFns() : undefined;
  if (!fns) return fallback;

  const hasCandidates = (ctx.candidates?.length ?? 0) > 0;
  const fnName = hasCandidates ? 'agentRespond' : 'parseIntent';

  try {
    const call = httpsCallable<Record<string, unknown>, RawTurn>(fns, fnName);
    const res = await call({
      message,
      history: ctx.history.slice(-8).map((m) => ({ role: m.role, text: m.text })),
      carriedEntities: ctx.carried,
      stationList: STATION_LIST,
      candidates: candidatePayload(ctx.candidates),
      today: todayISO(),
    });
    return coerce(res.data ?? {}, fallback);
  } catch {
    // Unavailable, rate-limited, timed out, no key — all the same to the user.
    return fallback;
  }
}

/** The one question to ask when something is still missing. */
export function questionFor(field: keyof JourneyIntentEntities): string {
  return MISSING_FIELD_QUESTION[field] ?? 'Could you tell me a little more?';
}

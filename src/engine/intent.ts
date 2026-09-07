import type {
  AgentIntent,
  AgentTurn,
  JourneyIntentEntities,
  TravelClass,
  DeparturePreference,
} from '@/types';
import { STATIONS } from '@/data/stations';
import { addDays } from './search';

/**
 * Deterministic rules parser. This is the fallback engine — it drives the whole
 * agent flow unchanged when Groq is unavailable or rate-limited (§7).
 * Same interface as the Groq path, so either can be swapped in.
 */

const CITY_ALIASES: Record<string, string> = {
  // Chennai
  chennai: 'MAS', madras: 'MAS', 'chennai central': 'MAS', mas: 'MAS',
  egmore: 'MS', 'chennai egmore': 'MS', ezhumbur: 'MS',
  // Bengaluru
  bangalore: 'SBC', bengaluru: 'SBC', blr: 'SBC', sbc: 'SBC', banglore: 'SBC',
  yesvantpur: 'YPR', yeshwantpur: 'YPR',
  // Tamil Nadu
  coimbatore: 'CBE', kovai: 'CBE', cbe: 'CBE',
  madurai: 'MDU', mdu: 'MDU',
  trichy: 'TPJ', tiruchirappalli: 'TPJ', tiruchi: 'TPJ',
  salem: 'SA', erode: 'ED', katpadi: 'KPD', vellore: 'KPD',
  kanyakumari: 'CAPE', cape: 'CAPE',
  // Kerala
  kochi: 'ERS', cochin: 'ERS', ernakulam: 'ERS',
  kottayam: 'KTYM',
  trivandrum: 'TVC', thiruvananthapuram: 'TVC',
  // Telugu states
  hyderabad: 'HYB', hyd: 'HYB', secunderabad: 'SC',
  vijayawada: 'BZA', bezawada: 'BZA',
  visakhapatnam: 'VSKP', vizag: 'VSKP',
  // North / west / east
  mumbai: 'CSMT', bombay: 'CSMT',
  'mumbai central': 'BCT',
  delhi: 'NDLS', 'new delhi': 'NDLS', ndls: 'NDLS',
  kolkata: 'HWH', calcutta: 'HWH', howrah: 'HWH',
  pune: 'PUNE', poona: 'PUNE',
  ahmedabad: 'ADI', jaipur: 'JP', patna: 'PNBE',
};

// Station names in every locale also resolve, so Tamil/Hindi input works.
const LOCALE_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const s of STATIONS) {
    // Station names first, city names second, and never overwrite an existing
    // entry — otherwise "Chennai" (the city of both MAS and MS) resolves to
    // whichever station happens to come last in the table.
    for (const value of [...Object.values(s.name), ...Object.values(s.city)]) {
      if (!value) continue;
      const k = value.toLowerCase();
      if (!(k in map)) map[k] = s.code;
    }
  }
  return map;
})();

/** Mixed-language date words — "naalaiku" (ta), "kal" (hi), "nalaikku". */
const TOMORROW_WORDS = ['tomorrow', 'tmrw', 'naalaiku', 'nalaiku', 'nalaikku', 'naalai', 'kal', 'kaal'];
const TODAY_WORDS = ['today', 'tonight', 'indhu', 'indru', 'inniki', 'aaj', 'aj'];
const DAY_AFTER_WORDS = ['day after tomorrow', 'day after', 'naalaiku maru', 'parsu', 'parso'];

const MORNING_WORDS = ['morning', 'am', 'kaalai', 'kalai', 'subah', 'savere'];
const AFTERNOON_WORDS = ['afternoon', 'noon', 'madhiyam', 'mathiyam', 'dopahar'];
const EVENING_WORDS = ['evening', 'saayangalam', 'sayangalam', 'shaam', 'sham'];
const NIGHT_WORDS = ['night', 'overnight', 'iravu', 'raat', 'raatri', 'sleep', 'thoonga', 'sona'];

const CLASS_WORDS: [RegExp, TravelClass][] = [
  [/\b(1a|first class|first ac)\b/i, '1A'],
  [/\b(2a|second ac|2 tier|two tier)\b/i, '2A'],
  [/\b(3a|third ac|3 tier|three tier)\b/i, '3A'],
  [/\b(ec|executive)\b/i, 'EC'],
  [/\b(cc|chair car|chaircar)\b/i, 'CC'],
  [/\b(sl|sleeper|padukkai)\b/i, 'SL'],
  [/\b(2s|second sitting)\b/i, '2S'],
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchAny(text: string, words: string[]): boolean {
  // Word-boundary matching, otherwise "sleeper" (a class) reads as "sleep" (a night hint).
  return words.some((w) => new RegExp(`(?:^|\\s)${w}(?:\\s|$)`).test(text));
}

export function resolveStation(fragment: string): string | undefined {
  const key = normalise(fragment);
  if (!key) return undefined;
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];
  if (LOCALE_ALIASES[key]) return LOCALE_ALIASES[key];
  // Longest alias contained in the fragment wins, so "chennai central" beats "chennai".
  let best: { code: string; len: number } | undefined;
  for (const [alias, code] of Object.entries({ ...LOCALE_ALIASES, ...CITY_ALIASES })) {
    if (key.includes(alias) && (!best || alias.length > best.len)) {
      best = { code, len: alias.length };
    }
  }
  return best?.code;
}

const STOP_WORDS =
  '(?:on|to|tomorrow|today|kal|naalaiku|nalaiku|morning|evening|night|afternoon|under|below|for|in|by|at|with|and|next|this)';

function startsWithPlace(phrase: string): string | undefined {
  const tokens = phrase.trim().split(/\s+/);
  for (let n = Math.min(2, tokens.length); n >= 1; n--) {
    const head = tokens.slice(0, n).join(' ');
    const code = CITY_ALIASES[head] ?? LOCALE_ALIASES[head];
    if (code) return code;
  }
  return undefined;
}

function findMarked(text: string, marker: string): string | undefined {
  // A sentence can hold several "to" phrases — "I want to sleep, chennai to delhi".
  // Prefer the one whose capture *begins* with a place; fall back to a loose match.
  const re = new RegExp(
    `\\b${marker}\\s+([a-z\u0b80-\u0bff\u0900-\u097f\\s]+?)(?=\\s+${STOP_WORDS}\\b|$)`,
    'g',
  );
  let loose: string | undefined;
  for (const m of text.matchAll(re)) {
    const exact = startsWithPlace(m[1]);
    if (exact) return exact;
    loose = loose ?? resolveStation(m[1]);
  }
  return loose;
}

/** Ordered list of every place named in the sentence. */
function placesInOrder(text: string): string[] {
  const found: string[] = [];
  const tokens = text.split(/\s+/);
  const hits: { idx: number; code: string }[] = [];
  for (let n = 2; n >= 1; n--) {
    for (let i = 0; i <= tokens.length - n; i++) {
      const phrase = tokens.slice(i, i + n).join(' ');
      const code = CITY_ALIASES[phrase] ?? LOCALE_ALIASES[phrase];
      if (code && !hits.some((h) => h.code === code)) hits.push({ idx: i, code });
    }
  }
  hits.sort((a, b) => a.idx - b.idx);
  for (const h of hits) found.push(h.code);
  return found;
}

function extractStations(text: string): { from?: string; to?: string } {
  // "from A to B" — the unambiguous form.
  const fromTo = text.match(
    /\b(?:from|frm)\s+([a-z\u0b80-\u0bff\u0900-\u097f\s]+?)\s+(?:to|until|till)\s+([a-z\u0b80-\u0bff\u0900-\u097f\s]+?)(?=\s+(?:on|tomorrow|today|kal|naalaiku|morning|evening|night|under|below|for|in|by|at)\b|$)/,
  );
  if (fromTo) {
    const from = resolveStation(fromTo[1]);
    const to = resolveStation(fromTo[2]);
    if (from && to) return { from, to };
  }

  // "Chennai la irundhu Madurai poganum" — Tamil postpositions.
  const tamil = text.match(
    /([a-z\u0b80-\u0bff\s]+?)\s*(?:la\s+)?irundhu\s+([a-z\u0b80-\u0bff\s]+?)(?:\s+poganum|\s+poga|$)/,
  );
  if (tamil) {
    const from = resolveStation(tamil[1]);
    const to = resolveStation(tamil[2]);
    if (from && to) return { from, to };
  }

  // Explicit markers in any order — "go Bangalore from Chennai" must not invert.
  const markedFrom = findMarked(text, '(?:from|frm)');
  const markedTo = findMarked(text, 'to');
  const ordered = placesInOrder(text);

  if (markedFrom && markedTo) return { from: markedFrom, to: markedTo };
  if (markedFrom) {
    const to = ordered.find((c) => c !== markedFrom);
    return { from: markedFrom, to };
  }
  if (markedTo) {
    const from = ordered.find((c) => c !== markedTo);
    return { from, to: markedTo };
  }

  // Bare "Chennai Bangalore tomorrow" — reading order is origin then destination.
  if (ordered.length >= 2) return { from: ordered[0], to: ordered[1] };
  if (ordered.length === 1) return { to: ordered[0] };
  return {};
}

function extractDate(text: string): string | undefined {
  if (matchAny(text, DAY_AFTER_WORDS)) return addDays(todayISO(), 2);
  if (matchAny(text, TOMORROW_WORDS)) return addDays(todayISO(), 1);
  if (matchAny(text, TODAY_WORDS)) return todayISO();

  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const dmy = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (dmy) {
    const now = new Date();
    const year = dmy[3] ? Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]) : now.getFullYear();
    const d = new Date(year, Number(dmy[2]) - 1, Number(dmy[1]));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const weekday = text.match(
    /\b(?:next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekday) {
    const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const target = names.indexOf(weekday[1]);
    const now = new Date();
    let delta = (target - now.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    return addDays(todayISO(), delta);
  }
  return undefined;
}

function extractWindow(text: string): DeparturePreference | undefined {
  if (matchAny(text, NIGHT_WORDS)) return 'night';
  if (matchAny(text, MORNING_WORDS)) return 'morning';
  if (matchAny(text, AFTERNOON_WORDS)) return 'afternoon';
  if (matchAny(text, EVENING_WORDS)) return 'evening';
  return undefined;
}

function extractBudget(text: string): number | undefined {
  const m = text.match(/(?:under|below|less than|within|upto|up to|max|budget of|kammi|kam)\s*(?:rs\.?|₹|inr)?\s*(\d{2,6})/);
  if (m) return Number(m[1]);
  const bare = text.match(/(?:rs\.?|₹|inr)\s*(\d{2,6})/);
  if (bare) return Number(bare[1]);
  return undefined;
}

function extractPassengers(text: string): number | undefined {
  const digits = text.match(/\b(\d{1,2})\s*(?:people|passengers|persons|adults|tickets|seats|per|nabar|log)\b/);
  if (digits) return Number(digits[1]);
  const words: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    oru: 1, rendu: 2, moonu: 3, naalu: 4,
    ek: 1, do: 2, teen: 3, char: 4,
  };
  const w = text.match(
    /\b(one|two|three|four|five|six|oru|rendu|moonu|naalu|ek|do|teen|char)\s*(?:people|passengers|persons|adults|tickets|seats|per|log)\b/,
  );
  if (w) return words[w[1]];
  if (/\b(just me|only me|myself|alone|naan mattum|akela)\b/.test(text)) return 1;
  return undefined;
}

function extractPriority(text: string): JourneyIntentEntities['priority'] {
  if (/\b(cheap|cheapest|budget|affordable|low cost|kammi|sasta)\b/.test(text)) return 'cheapest';
  if (/\b(fast|fastest|quick|quickest|earliest arrival|sikkiram|jaldi)\b/.test(text)) return 'fastest';
  if (/\b(comfort|comfortable|ac|sleep|rest|nice|sowkiyam|aaram)\b/.test(text)) return 'comfort';
  return undefined;
}

/** A 5-digit train number, or a 10-digit PNR. */
export function extractTrainNumber(text: string): string | undefined {
  const m = text.match(/\b(\d{5})\b/);
  return m ? m[1] : undefined;
}

export function extractPnr(text: string): string | undefined {
  const m = text.match(/\b(\d{10})\b/);
  return m ? m[1] : undefined;
}

export function classifyIntent(text: string): AgentIntent {
  const t = normalise(text);
  if (/^\s*\d{10}\s*$/.test(t)) return 'pnr_status';
  if (/\b(pnr|ticket status|my status)\b/.test(t)) return 'pnr_status';
  if (/\b(where is|track|running status|live status|kahan hai|enga irukku)\b/.test(t)) return 'track_train';
  if (/\b(cancel|refund|cancellation)\b/.test(t)) return 'cancel_booking';
  if (/\b(usual|same as last|book my usual|regular)\b/.test(t)) return 'book_usual';
  if (/\b(where can i go|somewhere|anywhere|suggest a trip|weekend trip|explore|ideas)\b/.test(t)) return 'explore';
  if (/^(hi|hello|hey|vanakkam|namaste|namaskaram)\b/.test(t)) return 'greeting';
  if (/\b(only|just|remove|instead|change|cheaper|earlier|later|no |don't|dont)\b/.test(t) && t.split(' ').length <= 8) {
    return 'refine';
  }
  return 'search_trains';
}

export function parseEntities(text: string): JourneyIntentEntities {
  const t = normalise(text);
  const { from, to } = extractStations(t);
  const entities: JourneyIntentEntities = {};
  if (from) entities.from = from;
  if (to) entities.to = to;

  const date = extractDate(t);
  if (date) entities.date = date;

  const win = extractWindow(t);
  if (win) entities.time_window = win;

  const budget = extractBudget(t);
  if (budget) entities.budget = budget;

  const pax = extractPassengers(t);
  if (pax) entities.passengers = pax;

  const priority = extractPriority(t);
  if (priority) entities.priority = priority;

  for (const [re, cls] of CLASS_WORDS) {
    if (re.test(t)) {
      entities.travel_class = cls;
      break;
    }
  }

  if (/\btatkal\b/.test(t)) entities.quota = /\bpremium\b/.test(t) ? 'Premium Tatkal' : 'Tatkal';
  else if (/\b(ladies|women)\b/.test(t)) entities.quota = 'Ladies';
  else if (/\b(senior|elderly)\b/.test(t)) entities.quota = 'Senior';

  // "I want to sleep" implies an overnight journey in a berth (§7).
  if (matchAny(t, ['sleep', 'thoonga', 'sona', 'overnight']) && !entities.travel_class) {
    entities.travel_class = 'SL';
    entities.time_window = entities.time_window ?? 'night';
  }

  return entities;
}

/** The one thing still missing, asked one question at a time (§7.2). */
export function nextMissingField(
  e: JourneyIntentEntities,
): keyof JourneyIntentEntities | undefined {
  if (!e.to) return 'to';
  if (!e.from) return 'from';
  if (!e.date) return 'date';
  if (!e.passengers) return 'passengers';
  return undefined;
}

export const MISSING_FIELD_QUESTION: Record<string, string> = {
  to: 'Where are you heading?',
  from: 'Which city are you starting from?',
  date: 'Which day do you want to travel?',
  passengers: 'How many of you are travelling?',
};

/** Full rules turn — mirrors what the Groq function returns. */
export function rulesTurn(text: string, carried: JourneyIntentEntities = {}): AgentTurn {
  const intent = classifyIntent(text);
  const parsed = parseEntities(text);
  const entities: JourneyIntentEntities = { ...carried, ...parsed };

  if (intent === 'greeting') {
    return {
      intent,
      entities,
      response_text:
        'Hello. Tell me where you want to go and roughly when — for example "Bangalore tomorrow morning, under ₹1000".',
      suggested_actions: [],
      engine: 'rules',
    };
  }

  if (intent === 'explore') {
    return {
      intent,
      entities,
      response_text:
        'Happy to. Give me a budget and how long you have, and I will show you where the rail network can take you.',
      suggested_actions: [{ id: 'open-explore', label: 'Open Explore', level: 'suggest' }],
      engine: 'rules',
    };
  }

  if (intent === 'track_train') {
    const number = extractTrainNumber(text);
    return {
      intent,
      entities,
      response_text: number
        ? `Pulling up live running status for ${number}.`
        : 'Which train shall I look up? Give me the number, or open a trip and I will track it for you.',
      suggested_actions: number
        ? [{ id: 'track', label: `Track ${number}`, level: 'suggest', payload: { number } }]
        : [{ id: 'open-track', label: 'Open Track', level: 'suggest' }],
      engine: 'rules',
    };
  }

  if (intent === 'pnr_status') {
    const pnr = extractPnr(text);
    return {
      intent,
      entities,
      response_text: pnr
        ? 'Checking that booking now.'
        : 'You do not need to remember a PNR here — your trips are already in My Trips. Shall I open them?',
      suggested_actions: [{ id: 'open-trips', label: 'Open My Trips', level: 'suggest', payload: pnr ? { pnr } : undefined }],
      engine: 'rules',
    };
  }

  if (intent === 'cancel_booking') {
    return {
      intent,
      entities,
      response_text:
        'I can start a cancellation, but I will not complete it without your confirmation. Which trip do you mean?',
      suggested_actions: [{ id: 'open-trips', label: 'Choose a trip', level: 'suggest' }],
      engine: 'rules',
    };
  }

  if (intent === 'book_usual') {
    return {
      intent,
      entities,
      response_text: 'Let me pull up what you usually book and fill it in for you.',
      suggested_actions: [{ id: 'book-usual', label: 'Book my usual', level: 'prepare' }],
      engine: 'rules',
    };
  }

  const missing = nextMissingField(entities);
  if (missing) {
    return {
      intent,
      entities,
      response_text: MISSING_FIELD_QUESTION[missing],
      missing_field: missing,
      suggested_actions: [],
      engine: 'rules',
    };
  }

  return {
    intent,
    entities,
    response_text: 'Searching trains…',
    suggested_actions: [],
    engine: 'rules',
  };
}

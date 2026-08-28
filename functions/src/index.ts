import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { callGroq, groqKey, parseJsonLoose, type GroqMessage } from './groq';

admin.initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const db = admin.firestore();

/* ------------------------------------------------------------------ */
/* Agent                                                               */
/* ------------------------------------------------------------------ */

const SYSTEM_PROMPT = `You are IRCTC RI, a calm, precise railway travel agent.
Extract structured intent. Never invent train data — only use the trains passed to you.
Ask one clarifying question at a time. Always give a short reason for a recommendation.
Confirm before booking.

Reply with JSON only, shaped exactly like:
{
  "intent": "search_trains" | "pnr_status" | "track_train" | "cancel_booking" | "explore" | "book_usual" | "refine" | "greeting" | "unknown",
  "entities": {
    "from": "<station code or null>",
    "to": "<station code or null>",
    "date": "<YYYY-MM-DD or null>",
    "time_window": "morning" | "afternoon" | "evening" | "night" | null,
    "budget": <number or null>,
    "travel_class": "SL" | "3A" | "2A" | "1A" | "CC" | "EC" | "2S" | null,
    "passengers": <number or null>,
    "priority": "cheapest" | "fastest" | "comfort" | "balanced" | null
  },
  "missing_field": "<the single most important missing field, or null>",
  "response_text": "<one or two short sentences, plain and calm>",
  "suggested_actions": [{ "id": "...", "label": "...", "level": "suggest" | "prepare" | "execute" }]
}

Rules you must not break:
- Station codes only, from the list provided. If a place is not in the list, leave it null.
- Never state a departure time, fare, seat count or availability that was not given to you.
- If candidate trains are supplied, you may describe them and say why one fits — nothing more.
- Booking and cancellation always require the user's explicit confirmation. Never imply it is done.
- The user may write in mixed English/Tamil/Hindi. Interpret it; reply in the language they used.`;

interface AgentPayload {
  message: string;
  history?: { role: 'user' | 'agent'; text: string }[];
  carriedEntities?: Record<string, unknown>;
  stationList?: { code: string; name: string; city: string }[];
  candidates?: {
    number: string;
    name: string;
    class: string;
    price: number;
    departure: string;
    arrival: string;
    duration_minutes: number;
    availability: string;
  }[];
  today?: string;
}

/**
 * parseIntent — structured extraction only. The client calls this first; if it
 * throws or times out, the client's rules engine takes over with the same shape.
 */
export const parseIntent = onCall<AgentPayload>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (!groqKey()) throw new HttpsError('failed-precondition', 'GROQ_API_KEY is not configured.');

  const { message, history = [], carriedEntities = {}, stationList = [], today } = request.data;
  if (!message?.trim()) throw new HttpsError('invalid-argument', 'message is required');

  const messages: GroqMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content:
        `Today is ${today ?? new Date().toISOString().slice(0, 10)}.\n` +
        `Known so far: ${JSON.stringify(carriedEntities)}\n` +
        `Valid stations: ${stationList.map((s) => `${s.code}=${s.name} (${s.city})`).join('; ')}`,
    },
    ...history.slice(-8).map<GroqMessage>((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text,
    })),
    { role: 'user', content: message },
  ];

  const raw = await callGroq(messages, { temperature: 0.1, maxTokens: 500 });
  const parsed = parseJsonLoose<Record<string, unknown>>(raw);
  if (!parsed) throw new HttpsError('internal', 'Model did not return usable JSON.');
  return { ...parsed, engine: 'groq' };
});

/**
 * agentRespond — natural language *about verified data*. Candidate trains come
 * from the data layer and are passed in; the model may only describe them.
 */
export const agentRespond = onCall<AgentPayload>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  if (!groqKey()) throw new HttpsError('failed-precondition', 'GROQ_API_KEY is not configured.');

  const { message, history = [], candidates = [], carriedEntities = {} } = request.data;

  const messages: GroqMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content:
        `Booking state: ${JSON.stringify(carriedEntities)}\n` +
        `These are the ONLY trains that exist for this request. Do not add to them, ` +
        `do not change any number in them:\n${JSON.stringify(candidates, null, 1)}`,
    },
    ...history.slice(-6).map<GroqMessage>((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text,
    })),
    { role: 'user', content: message },
  ];

  const raw = await callGroq(messages, { temperature: 0.3, maxTokens: 600 });
  const parsed = parseJsonLoose<Record<string, unknown>>(raw);
  if (!parsed) throw new HttpsError('internal', 'Model did not return usable JSON.');
  return { ...parsed, engine: 'groq' };
});

/* ------------------------------------------------------------------ */
/* Journey tracking + notifications                                    */
/* ------------------------------------------------------------------ */

interface TrackedJourney {
  id: string;
  userId: string;
  pnr: string;
  train_number: string;
  train_name: string;
  from_station: string;
  to_station: string;
  journey_date: string;
  status: string;
}

async function activeJourneys(): Promise<TrackedJourney[]> {
  const today = new Date().toISOString().slice(0, 10);
  const snap = await db
    .collectionGroup('journeys')
    .where('journey_date', '>=', today)
    .where('status', 'in', ['confirmed', 'RAC', 'waitlist'])
    .limit(400)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      // /users/{uid}/journeys/{id}
      userId: d.ref.parent.parent!.id,
      pnr: data.pnr,
      train_number: data.train_number,
      train_name: typeof data.train_name === 'object' ? data.train_name.en : data.train_name,
      from_station: data.from_station,
      to_station: data.to_station,
      journey_date: data.journey_date,
      status: data.status,
    };
  });
}

async function notify(
  userId: string,
  n: {
    priority: 'critical' | 'important' | 'useful' | 'marketing';
    type: string;
    title: string;
    body: string;
    journey_id?: string;
  },
): Promise<void> {
  // Never send the same event twice for the same journey.
  const dupe = await db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .where('type', '==', n.type)
    .where('journey_id', '==', n.journey_id ?? null)
    .limit(1)
    .get();
  if (!dupe.empty) return;

  await db
    .collection('users')
    .doc(userId)
    .collection('notifications')
    .add({ ...n, journey_id: n.journey_id ?? null, read: false, created_at: Date.now() });
}

/**
 * Advances the live simulation and fires the journey notifications the brief
 * calls for: arriving-soon, arrived, about-to-depart (§9).
 */
export const tickJourneyTracking = onSchedule('every 5 minutes', async () => {
  const journeys = await activeJourneys();
  const now = new Date();

  for (const j of journeys) {
    if (!j.pnr) continue;
    const ref = db.collection('journey_tracking').doc(j.pnr);
    const snap = await ref.get();
    const prev = snap.exists ? (snap.data() as { progress?: number }) : {};
    const progress = Math.min(1, (prev.progress ?? 0) + 0.04);

    // Delay drifts slowly rather than jumping, so the banner is believable.
    const delay = Math.max(0, Math.round(Math.sin(now.getMinutes() / 9) * 12));

    await ref.set(
      {
        pnr: j.pnr,
        progress,
        delay_minutes: delay,
        speed_kmh: progress >= 1 ? 0 : 55 + Math.round(Math.sin(progress * 7) * 35),
        platform: 1 + (Number(j.train_number) % 8),
        updated_at: Date.now(),
      },
      { merge: true },
    );

    if (progress > 0.05 && progress < 0.12) {
      await notify(j.userId, {
        priority: 'important',
        type: 'departing',
        title: 'Your train is about to depart',
        body: `${j.train_number} ${j.train_name} leaves shortly. Platform ${1 + (Number(j.train_number) % 8)}.`,
        journey_id: j.id,
      });
    }

    if (progress > 0.88 && progress < 0.96) {
      await notify(j.userId, {
        priority: 'important',
        type: 'arriving_soon',
        title: `Arriving at ${j.to_station} in about 30 minutes`,
        body: 'Time to gather your things. Keep your ID handy.',
        journey_id: j.id,
      });
    }

    if (progress >= 1) {
      await notify(j.userId, {
        priority: 'useful',
        type: 'arrived',
        title: `Your train has arrived at ${j.to_station}`,
        body: 'Journey complete. Safe onward travel.',
        journey_id: j.id,
      });
      await db
        .collection('users')
        .doc(j.userId)
        .collection('journeys')
        .doc(j.id)
        .update({ status: 'completed' });
    }
  }
});

/**
 * Chart preparation, ~4 hours before departure. Also the moment a waitlist
 * resolves, which is when a "watch this train" alert is worth sending.
 */
export const prepareCharts = onSchedule('every 60 minutes', async () => {
  const journeys = await activeJourneys();
  const today = new Date().toISOString().slice(0, 10);

  for (const j of journeys) {
    if (j.journey_date !== today) continue;
    await notify(j.userId, {
      priority: 'useful',
      type: 'chart_prepared',
      title: 'Chart prepared',
      body: `Seats are final for ${j.train_number} ${j.train_name}. Your coach and berth are confirmed in My Trips.`,
      journey_id: j.id,
    });
  }
});

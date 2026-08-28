# IRCTC RI

**Your railway travel operating system.** A reimagining of India's IRCTC that
borrows Instagram's *interaction* genius — personalised, contextual,
low-friction, progressively disclosed — and wraps the railway system's
complexity in a calm, agentic experience.

> The user should never have to understand Indian Railways in order to use
> Indian Railways.

This is a real, deployable web app with a real backend (Firebase Auth,
Firestore, Cloud Functions, FCM). Only the train / station / seat *data* is
mock — every user action persists for real.

---

## What's inside

- **A Journey Agent** — type *"Bangalore tomorrow morning, under ₹1000,
  comfortable"* and it parses your intent, asks only what's missing (one
  question at a time), searches real functions over the data layer, shows cards
  **with a "Why?"**, pre-fills your saved passengers, and stops at the payment
  gate for explicit confirmation. It never books silently.
- **Two agent engines behind one interface** — Groq (`llama-3.3-70b-versatile`,
  server-side in a Cloud Function) with a **deterministic rules engine** as a
  fallback, so the whole flow works with Groq off, rate-limited, or unconfigured.
- **The golden path, end to end** — sign in → Home → agent → results → passengers
  → review → a visible **payment state machine** → success → a live **Track**
  simulation → notifications.
- **Aadhaar-centric accounts** — Aadhaar is the account (stored only as a salted,
  one-way reference, never a raw number). Mobile is for communication. PNR is a
  backend marker, never something you must memorise. Tickets are issued in each
  passenger's own name.
- **Full multi-language** — English, Tamil, Hindi. One toggle switches the UI
  **and** train/station names, instantly, no reload. The agent accepts
  mixed-language input (*"Naalaiku morning Chennai la irundhu Madurai poganum"*).
- **Trust layer** — full fare transparency, plain-language availability, no dark
  patterns, an explainability trail (`/audit_logs`, surfaced in Profile), and
  human confirmation for anything consequential.
- **Accessibility** — larger text, high contrast, and an Elder / Simple mode;
  every motion effect respects `prefers-reduced-motion`.
- **A hand-authored motion graphic** on the login page (an original SVG train
  with parallax landscape, telegraph poles and turning wheels) plus a mild
  cursor-follow effect — see `docs/DESIGN_RESEARCH.md` for the references these
  were built from.

## Tech stack

React + TypeScript + Vite · Tailwind CSS · React Router · Zustand ·
Framer Motion · lucide-react · i18next · **Firebase** (Auth, Firestore, Cloud
Functions, FCM, Hosting) · **Groq** (server-side only).

---

## Run it locally

```bash
npm install
npm run dev
```

That's it. **With no Firebase project configured, the app runs fully against a
durable local persistence adapter** — sign in, book, reload, and everything is
still there. Use *"Try the instant demo"* on the login screen to sign in as
Ananya Rao with saved people and one upcoming journey.

### Connect a real Firebase backend

1. Create a Firebase project and copy `.env.example` to `.env`, filling in the
   `VITE_FIREBASE_*` public config values.
2. The app automatically switches from the local adapter to Firestore — no code
   change. Sign-in, people, journeys and preferences now persist server-side.

### Groq (the AI layer) — server-side only

**The Groq key never ships to the browser.** All Groq calls run inside a Cloud
Function.

1. Generate a **fresh** key at <https://console.groq.com>.
2. Put it in `functions/.env` (gitignored):
   ```
   GROQ_API_KEY=gsk_your_fresh_key_here
   GROQ_MODEL=llama-3.3-70b-versatile
   ```
   or `firebase functions:config:set groq.key="gsk_..."`.
3. Deploy the functions (below). With Groq unconfigured the app falls back to the
   rules engine and the agent works exactly the same.

> Any key that has ever been pasted into a chat, ticket, or commit must be
> rotated before use. Nothing secret lives in this repo — see `.gitignore`.

### Emulators

```bash
npm run emulators          # Auth, Firestore, Functions, Hosting UI
# set VITE_USE_EMULATORS=true in .env, then:
npm run dev
```

### Seed a real Firestore project

```bash
# with a service-account key at ./serviceAccount.json (gitignored), or
# against the emulator via FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
npm run seed
```

Seeds `/trains`, `/stations`, and one demo account with people, a saved search,
preferences and an upcoming journey.

---

## Deploy

```bash
npm run build
firebase deploy            # hosting + functions + firestore rules/indexes
```

The build outputs to `dist/`; `firebase.json` serves it as an SPA. Cloud
Functions include `parseIntent` / `agentRespond` (Groq) and the scheduled
`tickJourneyTracking` / `prepareCharts` that drive live tracking and journey
notifications.

---

## Project layout

```
src/
  data/        mock trains, stations, and the instant-demo seed
  engine/      availability · search + ranking · intent parsing (rules)
  lib/         firebase · backend adapters (local + firestore) · agent bridge · messaging
  store/       session · booking draft · accessibility settings (Zustand)
  components/  ui primitives · motion (train scene, cursor, microinteractions) · layout
  features/    auth · home · agent · search · booking · trips · track · explore · profile
  i18n/        en / ta / hi resources + locale detection
functions/     Cloud Functions — Groq (server-side) + scheduled tracking/notifications
scripts/       seed.ts (Firestore), engine-check.ts (deterministic engine tests)
docs/          DESIGN_RESEARCH.md — the references this UI was built from
```

## Definition of done — how this maps

- **Real auth & persistence** — Firestore (or the local adapter); reload/relogin
  keeps journeys, people, preferences.
- **Golden path** — flawless end to end, with an instant demo login.
- **Agent** — parses NL, asks only what's missing, cards + Why, prepares the
  booking, stops at pay; rules fallback works with Groq off.
- **Availability in plain language**; PNR never required as memory; ticket in the
  passenger's real name.
- **Notifications** — arriving-soon / arrived / about-to-depart fire from the
  scheduled function; priority tiers; no marketing during a journey.
- **One-click language** — UI **and** train/station names; local + English
  surfaced by location, any language selectable.
- **No secrets in the repo** — Groq via Cloud Function only; `.env.example`
  present; this README documents fresh-key setup and deploy.
- **No dead ends, no unexplained errors, full fare transparency, visible payment
  states.**

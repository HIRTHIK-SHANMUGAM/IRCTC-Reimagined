# IRCTC RI — a reimagined Indian Railways booking system

A full-stack, deployable web application: the whole IRCTC surface — trains,
flights, buses, hotels, holiday packages, cabs, activities, food on train,
retiring rooms, lounges, Rail Madad, eWallet, loyalty and offers — with an AI
assistant that keeps working when the model does not.

**Live:** https://irctc-reimagined-bcd77.web.app

---

## What it is

Booking a train in India means knowing things you should not have to know: what
RAC means, when Tatkal opens, which quota you qualify for, what a WL 23 is worth.
This build hides none of that — it just explains it. Availability is stated in
plain language, every recommendation carries its reason, the fare is shown in
full before you pay, and the payment state is named on screen at every step.

### The design

Navy and orange over a light grey-blue page, clean sans throughout, white cards
with soft borders. Three screens are built to match a specific reference:

- **Login** — split layout with a drawn, *moving* golden-hour scene: a WAP-7
  locomotive holds the frame while four parallax bands (hills, treeline,
  catenary masts, track) scroll past it, wheels turning and exhaust drifting.
  It is SVG rather than a photograph, so it loads instantly, scales to any
  panel, and actually animates. Honours `prefers-reduced-motion`.
- **Dashboard** — fixed sidebar, universal ask bar, search card, quick actions,
  recommendation rail, ranked train list, and a right column with the next
  journey, a live-running status timeline, tourism promo and offers.
- **AI Assistant** — chat with inline result **tables**, quick-action pills,
  suggestion chips, an attachment slot, and a tools/FAQ sidebar.

### Interaction layer

- Hover **shine slide** on every button — a soft diagonal streak, ~600ms.
- **Card lift** (`translateY(-2px)` + shadow) on every clickable card, 150ms.
- **Live pulse** on the current-position dot in the running-status timeline.
- **Chat bubbles** fade and slide in from their own side.
- **Result rows** stagger in 40ms apart.

---

## The AI assistant, and why it never breaks

Three layers, in order:

1. **Groq** (`llama-3.3-70b-versatile`) via a Cloud Function. Never sees train
   data it did not receive — the ranked candidates are computed locally and
   passed in, so the model describes real rows and cannot invent a train.
2. **Deterministic rules engine** in the browser. Regex and dictionary parsing
   for route, date, time window, budget and class. It runs *first* on every
   turn, so a usable answer already exists before the model is even called.
3. **The FAQ table** for questions with one correct answer — refund windows,
   Tatkal timings, what RAC means. Those never go to a model at all.

The Groq call has an explicit **8-second timeout**. A timeout, a malformed
response, a rate limit, an invalid key or no key at all all resolve the same
way: the deterministic answer is used, the failure is written to `/audit_logs`,
and the user sees an uninterrupted conversation. If neither engine can extract
enough to search, the assistant asks exactly one clarifying question rather than
showing an error or an empty state.

Each reply carries an honest one-line badge saying which engine answered it.

### Multiple Groq keys

Keys are tried in order and rotated automatically on `401`, `403` or `429`.
Adding another key is a config change, never a code change. In `functions/.env`:

```bash
# easiest — comma-separated
GROQ_API_KEYS=gsk_first...,gsk_second...,gsk_third...

# or numbered
GROQ_API_KEY_1=gsk_first...
GROQ_API_KEY_2=gsk_second...

# the original single-key names still work
GROQ_API_KEY=gsk_...
```

A timeout or network fault is *not* treated as a key problem, so a slow
network does not burn through the rotation.

---

## Running it

```bash
npm install
npm run dev            # http://localhost:5173
```

With no Firebase project configured the app still runs end to end against a
durable local adapter — every write survives reload and sign-out. Set the
`VITE_FIREBASE_*` variables (copy `.env.example` to `.env.local`) and every read
and write moves to Firestore with no other change.

### Signing in

- **Try the instant demo** — one click into a seeded account. Nothing to type.
- Or the real flow: any 12-digit Aadhaar, any 10-digit mobile, and the OTP is
  shown on screen (`123456`). No SMS provider is wired in.

Aadhaar is the account key, but the number itself is hashed to a one-way
reference before anything is persisted. It is never stored or displayed.

### Backend

```bash
npm run emulators      # Auth + Firestore + Functions locally
npm run seed           # populate /trains, /stations and a demo account
npm run build
firebase deploy
```

Seeding against the live project needs a service-account key at
`serviceAccount.json` (gitignored), or `GOOGLE_APPLICATION_CREDENTIALS` set.

---

## Project structure

```
src/
  nav.ts                  single source of truth for the sidebar
  App.tsx                 routing — every nav row resolves to a real screen
  components/
    art/                  TrainHero (the moving login scene), SceneArt
    layout/               Sidebar, TopBar, AppShell, notifications, language
    ui/                   the design system: buttons, inputs, badges, modals
  data/                   trains, stations, and the mock catalogue
  engine/                 search ranking, availability, intent parsing
  features/
    auth/                 login
    dashboard/            home
    assistant/            the AI screen
    trains/               search card, result row, results + Tatkal
    booking/              passengers → review → payment → success
    travel/               flights, buses, hotels, packages, cabs, activities
    journeys/             trips, live status, PNR, cancelled, TDR
    services/             food, rooms, lounge, Rail Madad, wallet, loyalty…
    tools/                schedule, platform locator, coach position
    common/Checkout.tsx   the shared checkout every category books through
  hooks/useLiveTrain.ts   the running-train simulation
  lib/
    agent.ts              Groq → rules → FAQ, with the timeout and fallback
    backend/              Repo interface + Firestore and local implementations
  store/                  session, booking, settings
functions/src/            Cloud Functions: agent, Groq client with key rotation
```

Two backends sit behind one `Repo` interface — Firestore when a project is
configured, a local adapter when it is not. Nothing above that line knows which
one it is talking to.

---

## What is real and what is mock

**Real:** Firebase Auth sessions. Every user action persisting to Firestore —
bookings across all ten categories, the eWallet balance and its ledger, saved
people, preferences, grievances, TDR claims, the conversation thread, audit
logs. The ranking engine, availability model and fare maths. The Groq call and
its fallback chain. Promo codes that actually reduce the total.

**Mock:** Train, flight, bus, hotel and package inventory. Live train positions
(simulated from the timetable, refreshed on an interval). Payments — no gateway,
no money moves. OTP delivery. UIDAI lookup.

The eWallet is deliberately genuine: top-ups credit it, bookings debit it,
cancellations refund 80% straight back to it, and the figure in the header moves
with all three.

---

## Definition of done

- [x] Every sidebar row opens a real, populated, interactive screen — no dead
      links, no "coming soon" pages.
- [x] Login, Dashboard and Assistant match the reference layouts.
- [x] The assistant works with Groq **and** continues working when Groq fails,
      is rate-limited or has no key — both paths verified.
- [x] Multiple Groq keys configurable and rotated automatically on failure.
- [x] Hover shine and card lift throughout, fast enough never to slow a booking.
- [x] eWallet genuinely persisted and moved by bookings, top-ups and refunds.
- [x] The golden path — search → book → pay → confirm → track → notification —
      still flawless.

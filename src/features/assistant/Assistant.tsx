import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ban,
  Bookmark,
  Bot,
  Calculator,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Info,
  Paperclip,
  Search,
  Send,
  Ticket,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { ChatMessage, JourneyIntentEntities, RankedTrain, Train, TravelClass } from '@/types';
import { FAQS } from '@/data/catalog';
import { getStation } from '@/data/stations';
import { bucketResults, formatDuration, rankTrains } from '@/engine/search';
import { availabilityLabel } from '@/engine/availability';
import { runAgentTurn, questionFor } from '@/lib/agent';
import { repo } from '@/lib/backend';
import { rupees, todayISO } from '@/lib/format';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { Badge, Button, IconTile, cx, useToast } from '@/components/ui';

const QUICK_INTRO = [
  { label: 'Check PNR status', icon: Search },
  { label: 'Confirm ticket availability', icon: CheckCheck },
  { label: 'Tatkal booking help', icon: Zap },
  { label: 'Cancel & refund rules', icon: Ban },
];

const INPUT_CHIPS = [
  { label: 'PNR Status', starter: 'What is the status of my PNR ' },
  { label: 'Cancel Ticket', starter: 'I want to cancel my ticket' },
  { label: 'Refund Rules', starter: 'What are the refund rules?' },
  { label: 'Tatkal Booking', starter: 'How does Tatkal booking work?' },
  { label: 'Seat Availability', starter: 'Seat availability in 2A from Chennai to Bengaluru' },
];

const TOOLS = [
  { to: '/pnr', title: 'PNR Enquiry', body: 'Check your ticket status', icon: Ticket },
  { to: '/schedule', title: 'Train Schedule', body: 'Timings, routes & halts', icon: Timer },
  { to: '/trains', title: 'Seat Availability', body: 'Check real-time availability', icon: CheckCheck },
  { to: '/trains', title: 'Fare Enquiry', body: 'Check fares between stations', icon: TrendingUp },
  { to: '/tdr', title: 'Refund Calculator', body: 'Estimate refund amount', icon: Calculator },
];

const SUGGESTIONS = [
  'Best trains to Mysuru',
  'Tatkal booking rules',
  'How to cancel a ticket?',
  'Refund timeline',
  'Seat availability in 2A',
];

function newId(): string {
  return `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function clockLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * The AI Assistant (addendum §4). Groq runs it when a key is configured; the
 * deterministic engine runs it when Groq is missing, slow, rate-limited or
 * returns something malformed. The user sees the same conversation either way
 * — the only visible difference is a small honest badge on the reply.
 */
export function Assistant() {
  const navigate = useNavigate();
  const toast = useToast();
  const { L } = useLocalized();
  const [params, setParams] = useSearchParams();

  const user = useSession((s) => s.user);
  const journeys = useSession((s) => s.journeys);
  const startBooking = useBooking((s) => s.start);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [attached, setAttached] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const carried = useRef<JourneyIntentEntities>({});
  /** True while the origin came from the profile rather than from the user. */
  const assumedOrigin = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sending = useRef(false);

  /* The account's home station seeds the origin, so "Bangalore tomorrow
     morning" is answered rather than met with "which city are you starting
     from?". The assumption is stated in the reply and the user can override it
     just by naming a different origin. */
  useEffect(() => {
    if (user?.home_station && !carried.current.from) {
      carried.current.from = user.home_station;
      assumedOrigin.current = true;
    }
  }, [user?.home_station]);

  /* Re-read the persisted thread on mount, so the conversation survives a
     route change or a reload rather than starting over. */
  useEffect(() => {
    let alive = true;
    void repo
      .listMessages()
      .then((m) => {
        if (alive) setMessages(m);
      })
      .catch(() => undefined)
      .finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  /* A question handed over from the header ask box arrives as ?q= */
  useEffect(() => {
    const q = params.get('q');
    if (!q || !hydrated) return;
    setParams({}, { replace: true });
    void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || sending.current) return;
    sending.current = true;

    const userMsg: ChatMessage = { id: newId(), role: 'user', text: body, timestamp: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setThinking(true);
    void repo.appendMessage(userMsg).catch(() => undefined);

    try {
      const history = [...messages, userMsg];

      // Pass 1 — understand. Pass 2 — if it is a search and we know enough,
      // rank real trains and let the model describe only those rows.
      let turn = await runAgentTurn(body, { history, carried: carried.current });
      carried.current = { ...carried.current, ...turn.entities };

      let results: RankedTrain[] = [];
      const e = turn.entities;

      if (turn.intent === 'search_trains' || turn.intent === 'refine') {
        if (e.from && e.to) {
          const rows = rankTrains(
            {
              from: e.from,
              to: e.to,
              date: e.date ?? todayISO(),
              travel_class: e.travel_class,
              quota: e.quota ?? 'General',
              passengers: e.passengers ?? 1,
              budget: e.budget,
              time_window: e.time_window,
              priority: e.priority,
            },
            user?.preferences,
          );
          results = bucketResults(rows, {
            from: e.from,
            to: e.to,
            date: e.date ?? todayISO(),
            quota: e.quota ?? 'General',
            passengers: e.passengers ?? 1,
            time_window: e.time_window,
          }).slice(0, 5);

          if (results.length > 0) {
            turn = await runAgentTurn(body, {
              history,
              carried: carried.current,
              candidates: results,
            });
          }
        }
      }

      /* Never a dead end: if something essential is still missing, ask exactly
         one question rather than showing an empty or error state (§4.3). */
      let reply = turn.response_text;
      if (turn.missing_field && results.length === 0) {
        reply = questionFor(turn.missing_field);
      } else if (results.length === 0 && (turn.intent === 'search_trains' || turn.intent === 'refine')) {
        reply =
          e.from && e.to
            ? `I could not find a direct train from ${L(getStation(e.from)?.city) || e.from} to ${
                L(getStation(e.to)?.city) || e.to
              } on that date. Would you like me to try the day before or after?`
            : reply;
      } else if (turn.intent === 'pnr_status') {
        const j = journeys.find((x) => x.status !== 'cancelled');
        reply = j
          ? `Your ${j.train_name.en} (${j.train_number}) on ${j.journey_date} is ${j.status}. Coach ${
              j.passengers[0]?.coach ?? '—'
            }, seat ${j.passengers[0]?.seat_number ?? '—'}. PNR ${j.pnr}.`
          : 'I could not find an active booking on your account. Open PNR Enquiry and enter the ten-digit number from your ticket and I will read it back in plain language.';
      }

      if (assumedOrigin.current && results.length > 0 && e.from) {
        const origin = L(getStation(e.from)?.city) || e.from;
        reply = `Starting from ${origin}, since that is your home station. ${reply}`;
        assumedOrigin.current = false;
      }

      const agentMsg: ChatMessage = {
        id: newId(),
        role: 'agent',
        text: reply,
        timestamp: Date.now(),
        intent: turn.intent,
        entities: turn.entities,
        results: results.length ? results : undefined,
        engine: turn.engine,
      };
      setMessages((m) => [...m, agentMsg]);
      void repo.appendMessage(agentMsg).catch(() => undefined);
    } finally {
      setThinking(false);
      sending.current = false;
    }
  }

  function onSelect(train: Train, cls: TravelClass) {
    const e = carried.current;
    startBooking(
      {
        from: e.from ?? train.from_station,
        to: e.to ?? train.to_station,
        date: e.date ?? todayISO(),
        quota: e.quota ?? 'General',
        passengers: e.passengers ?? 1,
        travel_class: cls,
      },
      train,
      cls,
    );
    navigate('/trains/passengers');
  }

  const showIntro = messages.length === 0;
  const firstName = (user?.name ?? 'there').split(' ')[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col">
        {/* -------------------------------------------------------- header */}
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[1.5rem] font-extrabold tracking-tight text-ink">AI Assistant</h1>
              <Badge tone="accent">Powered by AI</Badge>
            </div>
            <p className="mt-1.5 text-[0.9375rem] text-ink-muted">
              Your intelligent travel companion. Ask anything about trains, bookings, PNR, refunds and more.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void repo.clearMessages().catch(() => undefined);
                setMessages([]);
                carried.current = user?.home_station ? { from: user.home_station } : {};
                assumedOrigin.current = Boolean(user?.home_station);
                toast('Conversation cleared');
              }}
              className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-muted hover:text-navy-700"
            >
              <Clock className="h-4 w-4" /> Chat History
            </button>
            <Link
              to="/trips"
              className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-muted hover:text-navy-700"
            >
              <Bookmark className="h-4 w-4" /> Saved
            </Link>
          </div>
        </header>

        {/* ---------------------------------------------------- chat body */}
        <div className="min-h-[26rem] flex-1 space-y-4">
          {showIntro && (
            <div className="card p-5">
              <div className="flex items-start gap-3.5">
                <IconTile icon={<Bot className="h-5 w-5" />} tone="saffron" size="lg" className="rounded-full" />
                <div className="min-w-0">
                  <p className="text-[1.125rem] font-bold text-ink">
                    Hello {firstName}! <span aria-hidden="true">👋</span>
                  </p>
                  <p className="mt-1 text-[0.9375rem] text-ink-muted">
                    I&apos;m your AI travel assistant. How can I help you today?
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_INTRO.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => void send(label)}
                    className="lift flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5
                               text-[0.8125rem] font-semibold text-ink transition-colors hover:border-navy-300"
                  >
                    <Icon className="h-4 w-4 text-navy-600" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'user' ? (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-card rounded-tr-sm bg-saffron-50 px-4 py-3 sm:max-w-[70%]">
                  <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">{m.text}</p>
                  <p className="tnum mt-1.5 flex items-center justify-end gap-1 text-[0.6875rem] text-ink-faint">
                    {clockLabel(m.timestamp)}
                    <CheckCheck className="h-3.5 w-3.5 text-info" aria-hidden="true" />
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-3"
              >
                <IconTile icon={<Bot className="h-4 w-4" />} tone="saffron" className="mt-0.5 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="card p-4">
                    <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-ink">{m.text}</p>

                    {m.results && m.results.length > 0 && (
                      <ResultTable rows={m.results} onSelect={onSelect} />
                    )}

                    {m.results && m.results.length > 0 && (
                      <div className="mt-4 border-t border-line pt-3">
                        <p className="mb-2 text-[0.75rem] font-semibold text-ink-faint">You can also ask me:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGGESTIONS.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => void send(s)}
                              className="rounded-full border border-line px-3 py-1.5 text-[0.75rem] font-medium
                                         text-ink-muted transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {m.engine && (
                    <p className="mt-1.5 pl-1 text-[0.6875rem] text-ink-faint">
                      {m.engine === 'groq' ? 'Answered by the language model' : 'Answered by the on-device engine'}
                    </p>
                  )}
                </div>
              </motion.div>
            ),
          )}

          {thinking && (
            <div className="flex gap-3">
              <IconTile icon={<Bot className="h-4 w-4" />} tone="saffron" className="mt-0.5 rounded-full" />
              <div className="card flex items-center gap-1.5 px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-pulse rounded-full bg-ink-faint"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* --------------------------------------------------- input bar */}
        <div className="sticky bottom-0 mt-5 bg-page pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="card flex items-end gap-2 p-2.5"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setAttached(f.name);
                  toast(`Attached ${f.name}`);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach a file"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-navy-50 hover:text-navy-700"
            >
              <Paperclip className="h-[1.125rem] w-[1.125rem]" />
            </button>

            <div className="min-w-0 flex-1">
              {attached && (
                <p className="mb-1 flex items-center gap-1.5 px-1 text-[0.75rem] text-ink-muted">
                  <FileText className="h-3.5 w-3.5" /> {attached}
                  <button
                    type="button"
                    onClick={() => setAttached(null)}
                    className="font-bold text-navy-600 hover:text-navy-700"
                  >
                    remove
                  </button>
                </p>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                aria-label="Ask me anything about trains"
                placeholder="Ask me anything about trains..."
                className="max-h-32 w-full resize-none bg-transparent px-1 py-2.5 text-[0.9375rem]
                           text-ink placeholder:text-ink-faint focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              variant="accent"
              disabled={!input.trim() || thinking}
              aria-label="Send"
              className="h-10 w-10 shrink-0 rounded-full !px-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {INPUT_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setInput(c.starter)}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5
                           text-[0.75rem] font-medium text-ink-muted transition-colors
                           hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700"
              >
                <Ticket className="h-3 w-3" aria-hidden="true" />
                {c.label}
              </button>
            ))}
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 pb-1 text-center text-[0.75rem] text-ink-faint">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            AI Assistant may make mistakes. Please verify important details on the official page.
          </p>
        </div>
      </div>

      {/* -------------------------------------------------- right sidebar */}
      <aside className="min-w-0 space-y-5">
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-[0.9375rem] font-bold text-ink">
            Assistant Tools
          </h2>
          <ul className="divide-y divide-line">
            {TOOLS.map((t) => (
              <li key={t.title}>
                <Link
                  to={t.to}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-navy-50"
                >
                  <IconTile icon={<t.icon className="h-4 w-4" />} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-bold text-ink">{t.title}</span>
                    <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">{t.body}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/tools"
            className="flex items-center justify-center gap-1.5 border-t border-line py-2.5
                       text-[0.8125rem] font-bold text-saffron-600 hover:text-saffron-700"
          >
            View all tools →
          </Link>
        </section>

        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 text-[0.9375rem] font-bold text-ink">
            Popular Questions
          </h2>
          <ul className="divide-y divide-line">
            {FAQS.slice(0, 5).map((f) => (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => void send(f.q)}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-navy-50"
                >
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" aria-hidden="true" />
                  <span className="text-[0.8125rem] leading-snug text-ink">{f.q}</span>
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/support"
            className="flex items-center justify-center gap-1.5 border-t border-line py-2.5
                       text-[0.8125rem] font-bold text-saffron-600 hover:text-saffron-700"
          >
            View all FAQs →
          </Link>
        </section>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------ result table */

/**
 * Train options render as a real table, not prose — the columns from the
 * reference, one "View Options" per row, and a availability pill that says
 * CONFIRMED / RAC / WAITLIST rather than a bare code.
 */
function ResultTable({
  rows,
  onSelect,
}: {
  rows: RankedTrain[];
  onSelect: (t: Train, c: TravelClass) => void;
}) {
  const { L } = useLocalized();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 3);

  const pill = (r: RankedTrain) => {
    const s = r.availability.state;
    if (s === 'available') return { tone: 'confirmed' as const, text: 'CONFIRMED' };
    if (s === 'rac') return { tone: 'attention' as const, text: 'RAC' };
    if (s === 'waitlist') return { tone: 'critical' as const, text: 'WAITLIST' };
    return { tone: 'neutral' as const, text: '—' };
  };

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[38rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-surface-sunk">
            {['Train', 'Departure', 'Arrival', 'Duration', 'Availability', 'Fare (₹)', 'View'].map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-faint"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="stagger">
          {visible.map((r) => {
            const p = pill(r);
            const from = getStation(r.train.from_station);
            return (
              <tr key={`${r.train.id}-${r.travel_class}`} className="border-b border-line last:border-0">
                <td className="px-3 py-3">
                  <span className="block text-[0.8125rem] font-bold text-ink">
                    {L(r.train.name)}{' '}
                    <span className="tnum font-semibold text-ink-muted">({r.train.number})</span>
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-ink-faint">
                    {L(from?.name)} · <span className="font-bold text-ink-muted">{r.travel_class}</span>
                  </span>
                </td>
                <td className="tnum px-3 py-3 text-[0.8125rem] font-semibold text-ink">
                  {r.train.departure_time}
                </td>
                <td className="tnum px-3 py-3 text-[0.8125rem] font-semibold text-ink">
                  {r.train.arrival_time}
                </td>
                <td className="px-3 py-3 text-[0.8125rem] text-ink-muted">
                  {formatDuration(r.train.duration_minutes)}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={p.tone}>{p.text}</Badge>
                  <span className="mt-1 block text-[0.6875rem] text-ink-faint">
                    {availabilityLabel(r.availability).headline}
                  </span>
                </td>
                <td className="tnum px-3 py-3 text-[0.8125rem] font-bold text-ink">{rupees(r.price)}</td>
                <td className="px-3 py-3">
                  <Button size="sm" onClick={() => onSelect(r.train, r.travel_class)}>
                    View Options
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length > 3 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={cx(
            'flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5',
            'text-[0.8125rem] font-bold text-navy-600 transition-colors hover:bg-navy-50',
          )}
        >
          See more trains <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

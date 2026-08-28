import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Cpu, RotateCcw, Server, Sparkles } from 'lucide-react';
import type { AgentTurn, ChatMessage, JourneyIntentEntities, RankedTrain, SearchQuery } from '@/types';
import { runAgentTurn } from '@/lib/agent';
import { bucketResults, rankTrains, smartAlternatives } from '@/engine/search';
import { canBoard } from '@/engine/availability';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { repo } from '@/lib/backend';
import { Badge, Button, Chip, cx } from '@/components/ui';
import { DotMatrix } from '@/components/motion/Microinteractions';
import { TrainCard } from '@/components/TrainCard';
import { getStation } from '@/data/stations';
import { formatDate, todayISO } from '@/lib/format';
import { randomId } from '@/lib/hash';

const EXAMPLES = [
  'Bangalore tomorrow morning, under ₹1000, comfortable',
  'Chennai to Coimbatore on Friday for 2 people',
  'I want to sleep on the way to Delhi',
  'kal subah Bangalore chahiye',
];

/**
 * The Journey Agent. Conversation and cards together, never a bare chat wall.
 * It prepares everything and stops at the payment gate — the amber "prepare"
 * level. Only the user can take the red "execute" step (master prompt §7).
 */
export function Agent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useSession((s) => s.user);
  const people = useSession((s) => s.people);
  const saveSearch = useSession((s) => s.saveSearch);
  const booking = useBooking();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [carried, setCarried] = useState<JourneyIntentEntities>({});
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);


  const preferences = user?.preferences;

  const push = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
    void repo.appendMessage(m).catch(() => undefined);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  // Conversation history is persisted (§5). Read it back so a reload — or any
  // remount — continues the thread instead of silently starting over.
  useEffect(() => {
    let cancelled = false;
    void repo
      .listMessages()
      .then((stored) => {
        if (cancelled || stored.length === 0) return;
        setMessages(stored);
        const last = [...stored].reverse().find((m) => m.entities);
        if (last?.entities) setCarried(last.entities);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Turn resolved entities into a real search against the data layer. */
  const searchFor = useCallback(
    (entities: JourneyIntentEntities): { query: SearchQuery; rows: RankedTrain[] } | null => {
      if (!entities.from || !entities.to || !entities.date) return null;
      const query: SearchQuery = {
        from: entities.from,
        to: entities.to,
        date: entities.date,
        travel_class: entities.travel_class,
        quota: entities.quota ?? 'General',
        passengers: entities.passengers ?? 1,
        budget: entities.budget,
        time_window: entities.time_window,
        priority: entities.priority ?? 'balanced',
      };
      return { query, rows: rankTrains(query, preferences) };
    },
    [preferences],
  );

  const respond = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: randomId('m'),
        role: 'user',
        text,
        timestamp: Date.now(),
      };
      push(userMsg);
      setThinking(true);

      try {
        const turn: AgentTurn = await runAgentTurn(text, {
          history: messages,
          carried,
          // Once a search exists, the model gets the verified candidates and may
          // only talk about those.
          candidates: booking.selection ? [booking.selection] : undefined,
        });

        setCarried(turn.entities);

        const found = searchFor(turn.entities);

        // Ask the single missing thing before searching — one question at a
        // time, never a form (master prompt §7.2).
        if (!found || turn.missing_field) {
          push({
            id: randomId('m'),
            role: 'agent',
            text: turn.response_text,
            timestamp: Date.now(),
            intent: turn.intent,
            entities: turn.entities,
            engine: turn.engine,
          });
          return;
        }

        const { query, rows } = found;
        booking.setQuery(query);
        void saveSearch({ from: query.from, to: query.to, date: query.date, class: query.travel_class });

        const boardable = rows.filter((r) => canBoard(r.availability));
        const buckets = bucketResults(rows, query);
        const fromName = getStation(query.from)?.name.en ?? query.from;
        const toName = getStation(query.to)?.name.en ?? query.to;

        // No dead ends. If nothing works, say what does (§7).
        if (rows.length === 0) {
          const alts = smartAlternatives(query);
          push({
            id: randomId('m'),
            role: 'agent',
            text:
              `Nothing runs ${fromName} to ${toName} on ${formatDate(query.date)}. ` +
              (alts.length
                ? `Here is what does work: ${alts.map((a) => `${a.label} — ${a.reason}`).join('; ')}.`
                : 'Try another day and I will look again.'),
            timestamp: Date.now(),
            intent: turn.intent,
            entities: turn.entities,
            engine: turn.engine,
          });
          return;
        }

        const best = buckets[0] ?? rows[0];
        const summary =
          turn.engine === 'groq' && turn.response_text && !turn.response_text.startsWith('Searching')
            ? turn.response_text
            : `${boardable.length > 0 ? boardable.length : rows.length} option${
                (boardable.length || rows.length) === 1 ? '' : 's'
              } for ${fromName} → ${toName} on ${formatDate(query.date)}. ` +
              `I would take the ${best.train.name.en} — ${
                (best.reasons[0] ?? 'it fits your request best').split(' — ')[0].toLowerCase()
              }.`;

        push({
          id: randomId('m'),
          role: 'agent',
          text: summary,
          timestamp: Date.now(),
          intent: turn.intent,
          entities: turn.entities,
          results: buckets,
          engine: turn.engine,
        });

        // Explainability trail — "why did it recommend this?" (§7, §11).
        void repo
          .logAudit({
            user_id: user?.uid ?? 'anonymous',
            action: 'agent_search',
            input_entities: turn.entities as Record<string, unknown>,
            reasoning: best.reasons.join(' · '),
            result: `${best.train.number} ${best.travel_class} ₹${best.price}`,
          })
          .catch(() => undefined);
      } finally {
        setThinking(false);
      }
    },
    [booking, carried, messages, push, saveSearch, searchFor, user],
  );

  // A question typed into the universal ask bar arrives here as ?q=
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const q = params.get('q');
    if (q) void respond(q);
  }, [params, respond]);

  /** Amber "prepare": select the train and pre-fill saved passengers. */
  const prepare = (row: RankedTrain) => {
    booking.select(row);
    const count = booking.query?.passengers ?? 1;
    const frequent = people.filter((p) => p.is_frequent);
    booking.setPassengers((frequent.length >= count ? frequent : people).slice(0, count));
    booking.markPrepared(true);
    navigate('/book/passengers');
  };

  const lastEngine = useMemo(
    () => [...messages].reverse().find((m) => m.engine)?.engine,
    [messages],
  );

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col lg:min-h-[calc(100dvh-8rem)]">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-tight">{t('agent.title')}</h1>
            <p className="mt-2 text-[0.9375rem] text-ink-muted">{t('agent.subtitle')}</p>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                setMessages([]);
                setCarried({});
                booking.reset();
                void repo.clearMessages().catch(() => undefined);
              }}
            >
              {t('agent.startOver')}
            </Button>
          )}
        </div>

        {/* Which engine answered, stated plainly rather than hidden. */}
        {lastEngine && (
          <div className="mt-4">
            <Badge tone="neutral">
              {lastEngine === 'groq' ? (
                <Server className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Cpu className="h-3 w-3" aria-hidden="true" />
              )}
              {lastEngine === 'groq' ? t('agent.engineGroq') : t('agent.engineRules')}
            </Badge>
          </div>
        )}
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-6">
        {messages.length === 0 && !thinking && (
          <div className="card p-6">
            <Sparkles className="h-5 w-5 text-teal-700" aria-hidden="true" />
            <p className="mt-4 font-display text-2xl leading-tight">
              Tell me where you want to go, and roughly when.
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              I will find the trains, explain why one fits, fill in your details, and stop before payment.
            </p>
            <p className="label mb-3 mt-6">{t('agent.examples')}</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <Chip key={ex} onClick={() => void respond(ex)}>
                  {ex}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={cx(m.role === 'user' ? 'flex justify-end' : '')}
            >
              {m.role === 'user' ? (
                <p className="max-w-[85%] rounded-finish rounded-br-md bg-teal-700 px-4 py-3 text-[0.9375rem] text-canvas">
                  {m.text}
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="max-w-[92%] rounded-finish rounded-bl-md border border-rule bg-canvas-raised px-4 py-3 text-[0.9375rem] leading-relaxed">
                    {m.text}
                  </p>

                  {m.results && m.results.length > 0 && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {m.results.map((row) => (
                          <TrainCard
                            key={`${row.train.id}-${row.travel_class}-${row.bucket}`}
                            row={row}
                            from={m.entities?.from ?? ''}
                            to={m.entities?.to ?? ''}
                            selected={
                              booking.selection?.train.id === row.train.id &&
                              booking.selection?.travel_class === row.travel_class
                            }
                            onSelect={() => prepare(row)}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Chip onClick={() => navigate('/search')}>
                          {t('results.seeAll', { count: rankTrains({
                            from: m.entities?.from ?? '',
                            to: m.entities?.to ?? '',
                            date: m.entities?.date ?? todayISO(),
                            quota: 'General',
                            passengers: 1,
                          }).length })}
                        </Chip>
                        <Chip onClick={() => void respond('only morning trains')}>only morning</Chip>
                        <Chip onClick={() => void respond('remove waitlisted')}>remove waitlisted</Chip>
                        <Chip onClick={() => void respond('which would you pick?')}>which would you pick?</Chip>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <div className="rounded-finish rounded-bl-md border border-rule bg-canvas-raised px-4 py-3.5">
            <DotMatrix label={t('agent.searching')} />
          </div>
        )}
      </div>

      {/* ---------------- composer ---------------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || thinking) return;
          setInput('');
          void respond(text);
        }}
        className="sticky bottom-0 border-t border-rule bg-canvas pb-2 pt-4"
      >
        <div className="flex items-end gap-2 rounded-finish border border-rule-strong bg-canvas-raised p-2 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/20">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder={t('agent.placeholder')}
            aria-label={t('agent.placeholder')}
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.9375rem] outline-none placeholder:text-ink-faint"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label={t('common.search')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-700 text-canvas transition-all hover:bg-teal-600 disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { ChevronDown, Mail, MessageSquare, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FAQS, SUPPORT_CHANNELS } from '@/data/catalog';
import { Button, IconTile, Input, PageHeader, cx, useToast } from '@/components/ui';

/** Support (addendum §5): FAQs, contact channels and a message form. */
export function Support() {
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(FAQS[0]?.q ?? null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Support" subtitle="Answers to the common questions, and a way to reach a person." />

      <Link
        to="/assistant"
        className="lift shine mb-6 flex items-center gap-3 rounded-card border border-saffron-200 bg-saffron-50 p-4"
      >
        <IconTile icon={<Sparkles className="h-5 w-5" />} tone="saffron" size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-bold text-saffron-700">Ask the Assistant first</span>
          <span className="mt-0.5 block text-[0.8125rem] text-saffron-600">
            It answers PNR, refund and Tatkal questions instantly, day or night.
          </span>
        </span>
      </Link>

      <section>
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Frequently asked</h2>
        <ul className="card divide-y divide-line">
          {FAQS.map((f) => {
            const isOpen = open === f.q;
            return (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.q)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-navy-50"
                >
                  <span className="text-[0.9375rem] font-semibold text-ink">{f.q}</span>
                  <ChevronDown
                    className={cx('h-4 w-4 shrink-0 text-ink-faint transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <p className="animate-rise-in px-4 pb-4 text-[0.875rem] leading-relaxed text-ink-muted">
                    {f.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Reach us</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SUPPORT_CHANNELS.map((c) => (
            <li key={c.id} className="card flex items-center gap-3 p-4">
              <IconTile
                icon={c.value.includes('@') ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              />
              <div className="min-w-0">
                <p className="tnum truncate text-[0.9375rem] font-bold text-ink">{c.value}</p>
                <p className="truncate text-[0.75rem] text-ink-muted">
                  {c.label} · {c.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Send us a message</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!subject.trim() || body.trim().length < 10) {
              toast('Add a subject and a little detail so we can help.');
              return;
            }
            setSubject('');
            setBody('');
            toast('Message sent — we usually reply within 48 hours.');
          }}
          className="card space-y-4 p-5"
        >
          <Input
            label="Subject"
            placeholder="What is this about?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div>
            <label htmlFor="sp-body" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
              Message
            </label>
            <textarea
              id="sp-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell us what happened, and include a PNR if it relates to a booking."
              className="w-full rounded-lg border border-line-strong bg-surface p-3.5 text-[0.9375rem] text-ink
                         placeholder:text-ink-faint focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Button type="submit" full size="lg" icon={<MessageSquare className="h-4 w-4" />}>
            Send message
          </Button>
        </form>
      </section>
    </div>
  );
}

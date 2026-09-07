import { useState } from 'react';
import { Clock, MapPin, Star } from 'lucide-react';
import { ACTIVITIES, type Activity } from '@/data/catalog';
import { Photo } from '@/components/art/Photo';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import { Badge, Button, Chip, PageHeader, Stepper } from '@/components/ui';

const CATEGORIES = ['All', ...Array.from(new Set(ACTIVITIES.map((a) => a.category)))];

/** Activities & Attractions (addendum §5): browse, then a mock reservation. */
export function Activities() {
  const [category, setCategory] = useState('All');
  const [people, setPeople] = useState(2);
  const [date, setDate] = useState(todayISO());
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const rows = category === 'All' ? ACTIVITIES : ACTIVITIES.filter((a) => a.category === category);

  function reserve(a: Activity) {
    const base = a.price * people;
    setDraft({
      category: 'activity',
      offerCategory: 'all',
      title: a.name,
      subtitle: `${a.city} · ${a.duration} · ${people} guest${people === 1 ? '' : 's'}`,
      date,
      lines: [
        { label: `Ticket × ${people}`, amount: base },
        { label: 'Booking fee', amount: 49 },
      ],
      details: {
        Experience: a.name,
        City: a.city,
        Duration: a.duration,
        Date: date,
        Guests: String(people),
      },
      successNote: 'Your experience is reserved',
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Activities & Attractions"
        subtitle="Things worth doing at the other end of the journey."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <input
            type="date"
            aria-label="Date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="tnum h-11 rounded-lg border border-line-strong bg-surface px-3 text-[0.875rem] text-ink
                       focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
          <div className="w-36">
            <Stepper value={people} onChange={setPeople} min={1} max={10} suffix="Guest" />
          </div>
        </div>
      </div>

      <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((a) => (
          <li key={a.id} className="lift card overflow-hidden">
            <div className="relative h-32">
              <Photo
                src={`/images/activities/${a.id}.jpg`}
                scene={a.scene}
                alt={a.name}
                className="absolute inset-0"
              />
              <span className="absolute left-3 top-3">
                <Badge tone="info">{a.category}</Badge>
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="text-[0.9375rem] font-bold leading-tight text-ink">{a.name}</p>
              <p className="mt-1.5 flex items-center gap-2 text-[0.75rem] text-ink-muted">
                <MapPin className="h-3 w-3" /> {a.city}
                <Clock className="ml-1 h-3 w-3" /> {a.duration}
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">{a.summary}</p>
              <div className="mt-4 flex items-end justify-between gap-2 pt-1">
                <div>
                  <p className="tnum text-[1rem] font-extrabold text-ink">{rupees(a.price)}</p>
                  <p className="flex items-center gap-1 text-[0.6875rem] text-ink-muted">
                    <Star className="h-3 w-3 fill-current text-saffron-500" /> {a.rating} · per person
                  </p>
                </div>
                <Button size="sm" onClick={() => reserve(a)}>
                  Reserve
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}

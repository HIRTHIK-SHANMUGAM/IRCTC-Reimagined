import { useMemo, useState } from 'react';
import { Building2, MapPin, Star, Wifi } from 'lucide-react';
import { HOTELS, type Hotel } from '@/data/catalog';
import { SceneArt } from '@/components/art/SceneArt';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Modal,
  PageHeader,
  Select,
  Stepper,
  cx,
} from '@/components/ui';

const CITIES = Array.from(new Set(HOTELS.map((h) => h.city))).sort();

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

/** Hotels (addendum §5): search, property list, room select, checkout. */
export function Hotels() {
  const [city, setCity] = useState('Chennai');
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDaysISO(todayISO(), 2));
  const [guests, setGuests] = useState(2);
  const [sort, setSort] = useState<'price' | 'rating'>('rating');
  const [detail, setDetail] = useState<Hotel | null>(null);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const nights = nightsBetween(checkIn, checkOut);

  const results = useMemo(() => {
    const rows = HOTELS.filter((h) => h.city === city);
    return [...rows].sort((a, b) =>
      sort === 'price' ? a.rooms[0].price - b.rooms[0].price : b.rating - a.rating,
    );
  }, [city, sort]);

  function bookRoom(hotel: Hotel, roomIndex: number) {
    const room = hotel.rooms[roomIndex];
    const stay = room.price * nights;
    setDraft({
      category: 'hotel',
      offerCategory: 'hotel',
      title: hotel.name,
      subtitle: `${room.type} · ${nights} night${nights === 1 ? '' : 's'} · ${guests} guest${guests === 1 ? '' : 's'}`,
      date: checkIn,
      lines: [
        { label: `${room.type} × ${nights} night${nights === 1 ? '' : 's'}`, amount: stay },
        { label: 'Taxes & fees', amount: Math.round(stay * 0.12) },
      ],
      details: {
        Property: hotel.name,
        Area: `${hotel.area}, ${hotel.city}`,
        Room: room.type,
        'Check-in': checkIn,
        'Check-out': checkOut,
        Guests: String(guests),
      },
      successNote: 'Your stay is booked',
    });
    setDetail(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Hotels" subtitle="IRCTC-listed stays near stations and city centres." />

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
        <Select label="City" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <div>
          <label htmlFor="ht-in" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            Check-in
          </label>
          <input
            id="ht-in"
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (e.target.value >= checkOut) setCheckOut(addDaysISO(e.target.value, 1));
            }}
            className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                       text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <div>
          <label htmlFor="ht-out" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            Check-out
          </label>
          <input
            id="ht-out"
            type="date"
            value={checkOut}
            min={addDaysISO(checkIn, 1)}
            onChange={(e) => setCheckOut(e.target.value)}
            className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                       text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <Stepper label="Guests" value={guests} onChange={setGuests} min={1} max={8} suffix="Guest" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={sort === 'rating'} onClick={() => setSort('rating')}>
          Top rated
        </Chip>
        <Chip active={sort === 'price'} onClick={() => setSort('price')}>
          Lowest price
        </Chip>
        <span className="ml-auto text-[0.8125rem] text-ink-muted">
          {results.length} stays · {nights} night{nights === 1 ? '' : 's'}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<Building2 className="h-5 w-5" />} title="No stays listed in this city yet" />
        </div>
      ) : (
        <ul className="stagger mt-4 grid gap-4 sm:grid-cols-2">
          {results.map((h) => (
            <li key={h.id} className="lift card overflow-hidden">
              <div className="relative h-36">
                <SceneArt scene={h.scene} className="absolute inset-0" />
                <span className="absolute left-3 top-3 rounded-md bg-white/95 px-2 py-1 text-[0.6875rem] font-bold text-navy-700">
                  <Star className="mr-1 inline h-3 w-3 fill-current text-saffron-500" />
                  {h.rating}
                </span>
              </div>
              <div className="p-4">
                <p className="truncate text-[0.9375rem] font-bold text-ink">{h.name}</p>
                <p className="mt-1 flex items-center gap-1 text-[0.75rem] text-ink-muted">
                  <MapPin className="h-3 w-3" aria-hidden="true" /> {h.area}, {h.city}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {h.amenities.slice(0, 3).map((a) => (
                    <Badge key={a} tone="neutral">
                      {a === 'Free Wi-Fi' && <Wifi className="h-3 w-3" />}
                      {a}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="tnum text-[1.0625rem] font-extrabold text-ink">
                      {rupees(h.rooms[0].price)}
                    </p>
                    <p className="text-[0.6875rem] text-ink-muted">per night · {h.reviews} reviews</p>
                  </div>
                  <Button size="sm" onClick={() => setDetail(h)}>
                    View rooms
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.name} wide>
        {detail && (
          <div>
            <p className="flex items-center gap-1 text-[0.8125rem] text-ink-muted">
              <MapPin className="h-3.5 w-3.5" /> {detail.area}, {detail.city} · {detail.rating} ★ (
              {detail.reviews} reviews)
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {detail.amenities.map((a) => (
                <Badge key={a} tone="neutral">
                  {a}
                </Badge>
              ))}
            </div>
            <ul className="mt-5 space-y-3">
              {detail.rooms.map((r, i) => (
                <li
                  key={r.type}
                  className={cx(
                    'flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-4',
                    r.left <= 1 && 'border-attention/30 bg-attention-soft/30',
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-bold text-ink">{r.type}</p>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                      Sleeps {r.capacity} · {r.left} room{r.left === 1 ? '' : 's'} left at this price
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="tnum text-[1rem] font-extrabold text-ink">{rupees(r.price)}</p>
                      <p className="text-[0.6875rem] text-ink-muted">per night</p>
                    </div>
                    <Button size="sm" onClick={() => bookRoom(detail, i)}>
                      Book
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}

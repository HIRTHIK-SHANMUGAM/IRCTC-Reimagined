import { useMemo, useState } from 'react';
import { Leaf, Minus, Plus, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { FOOD_VENDORS } from '@/data/catalog';
import { getStation } from '@/data/stations';
import { getTrain } from '@/data/trains';
import { useSession } from '@/store/session';
import { useLiveTrain } from '@/hooks/useLiveTrain';
import { useLocalized } from '@/hooks/useLocalized';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import { Alert, Badge, Button, Chip, EmptyState, PageHeader, cx } from '@/components/ui';

/**
 * Order Food on Train (addendum §5). Vendors are tied to stations along the
 * user's active journey, and the delivery ETA is read off the live train
 * position rather than invented.
 */
export function Food() {
  const { L } = useLocalized();
  const journeys = useSession((s) => s.journeys);

  const journey = useMemo(
    () =>
      [...journeys]
        .filter((j) => j.status !== 'cancelled' && j.journey_date >= todayISO())
        .sort((a, b) => a.journey_date.localeCompare(b.journey_date))[0],
    [journeys],
  );

  const train = journey ? getTrain(journey.train_id) : undefined;
  const live = useLiveTrain(train, journey?.journey_date ?? todayISO());

  const [vendorId, setVendorId] = useState(FOOD_VENDORS[0].id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [vegOnly, setVegOnly] = useState(false);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const vendor = FOOD_VENDORS.find((v) => v.id === vendorId)!;
  const items = vegOnly ? vendor.items.filter((i) => i.veg) : vendor.items;

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => {
      const item = FOOD_VENDORS.flatMap((v) => v.items).find((i) => i.id === id)!;
      return { label: `${item.name} × ${q}`, amount: item.price * q, id };
    });
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  /** Delivery lands at the vendor's station, at that stop's expected time. */
  const stop = live?.stops.find((s) => s.station === vendor.station);
  const eta = stop ? stop.expected : '—';

  function checkout() {
    if (subtotal < vendor.min_order) return;
    setDraft({
      category: 'food',
      offerCategory: 'all',
      title: `${vendor.name} · ${lines.length} item${lines.length === 1 ? '' : 's'}`,
      subtitle: journey
        ? `Delivery to seat on ${journey.train_number} at ${L(getStation(vendor.station)?.name)}`
        : `Pickup at ${L(getStation(vendor.station)?.name)}`,
      date: journey?.journey_date ?? todayISO(),
      time: eta,
      lines: [...lines.map(({ label, amount }) => ({ label, amount })), { label: 'Delivery charge', amount: 30 }],
      details: {
        Vendor: vendor.name,
        Station: `${L(getStation(vendor.station)?.name)} (${vendor.station})`,
        'Delivery at': eta,
        ...(journey
          ? {
              Train: `${journey.train_number}`,
              Coach: journey.passengers[0]?.coach ?? '—',
              Seat: journey.passengers[0]?.seat_number ?? '—',
            }
          : {}),
      },
      successNote: 'Your meal is on its way',
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Order Food on Train"
        subtitle="Hot meals delivered to your seat at a station along your route."
      />

      {journey ? (
        <Alert tone="info" icon={<UtensilsCrossed className="h-4 w-4" />} className="mb-5">
          Delivering to <strong>{L(journey.train_name)}</strong> ({journey.train_number}), coach{' '}
          <strong>{journey.passengers[0]?.coach ?? '—'}</strong>, seat{' '}
          <strong>{journey.passengers[0]?.seat_number ?? '—'}</strong>
          {stop && ` · arriving ${L(getStation(vendor.station)?.name)} around ${eta}`}.
        </Alert>
      ) : (
        <Alert tone="attention" className="mb-5">
          You have no upcoming journey, so this will be a station pickup order. Book a train and the
          delivery details fill in automatically.
        </Alert>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FOOD_VENDORS.map((v) => (
          <Chip key={v.id} active={vendorId === v.id} onClick={() => setVendorId(v.id)}>
            {v.name}
          </Chip>
        ))}
        <Chip active={vegOnly} onClick={() => setVegOnly((x) => !x)} icon={<Leaf className="h-3.5 w-3.5" />}>
          Veg only
        </Chip>
      </div>

      <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[0.9375rem] font-bold text-ink">{vendor.name}</p>
          <p className="mt-0.5 text-[0.75rem] text-ink-muted">
            {vendor.cuisine} · {L(getStation(vendor.station)?.name)} ({vendor.station}) · ★ {vendor.rating}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {vendor.veg_only && <Badge tone="confirmed">Pure veg</Badge>}
          <Badge tone="neutral">Min order {rupees(vendor.min_order)}</Badge>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Leaf className="h-5 w-5" />} title="No vegetarian items at this vendor" />
      ) : (
        <ul className="stagger space-y-3">
          {items.map((i) => {
            const qty = cart[i.id] ?? 0;
            return (
              <li key={i.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[0.9375rem] font-bold text-ink">
                    <span
                      className={cx(
                        'grid h-4 w-4 shrink-0 place-items-center rounded-sm border',
                        i.veg ? 'border-confirmed' : 'border-critical',
                      )}
                      aria-label={i.veg ? 'Vegetarian' : 'Non-vegetarian'}
                    >
                      <span
                        className={cx('h-2 w-2 rounded-full', i.veg ? 'bg-confirmed' : 'bg-critical')}
                      />
                    </span>
                    {i.name}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-ink-muted">{i.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="tnum text-[0.9375rem] font-bold text-ink">{rupees(i.price)}</p>
                  {qty === 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => setCart({ ...cart, [i.id]: 1 })}>
                      Add
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 rounded-lg border border-navy-600">
                      <button
                        type="button"
                        aria-label={`Remove one ${i.name}`}
                        onClick={() => setCart({ ...cart, [i.id]: qty - 1 })}
                        className="grid h-9 w-9 place-items-center text-navy-700 hover:bg-navy-50"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="tnum w-6 text-center text-[0.875rem] font-bold text-ink">{qty}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${i.name}`}
                        onClick={() => setCart({ ...cart, [i.id]: qty + 1 })}
                        className="grid h-9 w-9 place-items-center text-navy-700 hover:bg-navy-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {subtotal > 0 && (
        <div className="sticky bottom-4 mt-5">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="tnum text-[1rem] font-extrabold text-ink">{rupees(subtotal)}</p>
              <p className="text-[0.75rem] text-ink-muted">
                {subtotal < vendor.min_order
                  ? `Add ${rupees(vendor.min_order - subtotal)} more to reach the minimum`
                  : `Delivery around ${eta}`}
              </p>
            </div>
            <Button
              size="lg"
              disabled={subtotal < vendor.min_order}
              icon={<ShoppingCart className="h-4 w-4" />}
              onClick={checkout}
            >
              Checkout
            </Button>
          </div>
        </div>
      )}

      <Checkout
        draft={draft}
        open={draft !== null}
        onClose={() => {
          setDraft(null);
          setCart({});
        }}
      />
    </div>
  );
}

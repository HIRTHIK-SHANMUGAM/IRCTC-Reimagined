import { useMemo, useState } from 'react';
import { Armchair, Clock, Lock } from 'lucide-react';
import { LOUNGES } from '@/data/catalog';
import { getStation } from '@/data/stations';
import { useSession } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import { Alert, Badge, Button, Chip, PageHeader, cx } from '@/components/ui';

/**
 * Lounge Access (addendum §5). Eligibility is read off the user's own ticket
 * class, so an ineligible lounge says exactly why rather than just failing.
 */
export function Lounge() {
  const { L } = useLocalized();
  const journeys = useSession((s) => s.journeys);
  const [duration, setDuration] = useState<2 | 6>(2);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const journey = useMemo(
    () =>
      [...journeys]
        .filter((j) => j.status !== 'cancelled' && j.journey_date >= todayISO())
        .sort((a, b) => a.journey_date.localeCompare(b.journey_date))[0],
    [journeys],
  );

  const myClass = journey?.class;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Lounge Access"
        subtitle="Executive lounges at major stations — showers, a buffet and somewhere quiet to wait."
      />

      {journey ? (
        <Alert tone="info" className="mb-5">
          Eligibility is checked against your <strong>{journey.class}</strong> ticket on{' '}
          <strong>{journey.train_number}</strong> ({journey.journey_date}).
        </Alert>
      ) : (
        <Alert tone="attention" className="mb-5">
          You have no upcoming ticket, so every lounge below shows as pay-to-enter. Book a journey and
          your eligible lounges unlock automatically.
        </Alert>
      )}

      <div className="mb-4 flex gap-2">
        <Chip active={duration === 2} onClick={() => setDuration(2)}>
          2 hours
        </Chip>
        <Chip active={duration === 6} onClick={() => setDuration(6)}>
          6 hours
        </Chip>
      </div>

      <ul className="stagger space-y-3">
        {LOUNGES.map((lg) => {
          const price = duration === 2 ? lg.price_2h : lg.price_6h;
          const eligible = myClass ? lg.eligible_classes.includes(myClass) : false;
          return (
            <li
              key={lg.id}
              className={cx('lift card p-4 sm:p-5', eligible && 'border-confirmed/30')}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-bold text-ink">{lg.name}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                    {L(getStation(lg.station)?.name)} ({lg.station})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="neutral">
                      <Clock className="h-3 w-3" /> {lg.hours}
                    </Badge>
                    {eligible ? (
                      <Badge tone="confirmed">Included with your {myClass} ticket</Badge>
                    ) : (
                      <Badge tone="neutral">
                        <Lock className="h-3 w-3" /> {lg.eligible_classes.join(', ')} only
                      </Badge>
                    )}
                    {lg.amenities.map((a) => (
                      <Badge key={a} tone="neutral">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <div className="text-right">
                    <p className="tnum text-[1.0625rem] font-extrabold text-ink">
                      {eligible ? 'Free' : rupees(price)}
                    </p>
                    <p className="text-[0.6875rem] text-ink-muted">for {duration} hours</p>
                  </div>
                  <Button
                    icon={<Armchair className="h-4 w-4" />}
                    onClick={() =>
                      setDraft({
                        category: 'lounge',
                        offerCategory: 'all',
                        title: lg.name,
                        subtitle: `${duration}-hour slot at ${L(getStation(lg.station)?.name)}`,
                        date: journey?.journey_date ?? todayISO(),
                        lines: eligible
                          ? [{ label: `Included with ${myClass} ticket`, amount: 0 }]
                          : [{ label: `Lounge access (${duration}h)`, amount: price }],
                        details: {
                          Lounge: lg.name,
                          Station: `${L(getStation(lg.station)?.name)} (${lg.station})`,
                          Slot: `${duration} hours`,
                          Access: eligible ? `Complimentary with ${myClass}` : 'Paid entry',
                        },
                        successNote: 'Your lounge slot is reserved',
                      })
                    }
                  >
                    Reserve slot
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}

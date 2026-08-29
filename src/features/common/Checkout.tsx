import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Smartphone,
  Tag,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { Booking, BookingCategory, PaymentState } from '@/types';
import { applyOffer, type Offer } from '@/data/catalog';
import { useSession } from '@/store/session';
import { rupees } from '@/lib/format';
import { Alert, Badge, Button, Input, Modal, cx, useToast } from '@/components/ui';

export interface CheckoutDraft {
  category: BookingCategory;
  /** Which offer family this cart belongs to when a promo is applied. */
  offerCategory: Offer['category'];
  title: string;
  subtitle: string;
  date: string;
  time?: string;
  /** Fare lines shown in full before payment — no hidden charges (§trust). */
  lines: { label: string; amount: number }[];
  details: Record<string, string>;
  /** Copy for the confirmation screen, e.g. "Your cab is confirmed". */
  successNote: string;
}

const METHODS = [
  { id: 'wallet', label: 'IRCTC eWallet', icon: Wallet },
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', icon: Landmark },
];

/** Every state is named on screen — money is never in an unlabelled limbo. */
const STATE_COPY: Record<PaymentState, string> = {
  initiated: 'Starting payment',
  processing: 'Talking to your bank',
  received: 'Payment received',
  reserving: 'Reserving with the railway',
  confirmed: 'Confirmed',
  failed: 'Payment could not go through',
  refunding: 'Returning your money',
  refunded: 'Refunded in full',
};

function reference(prefix: string): string {
  return prefix + String(Math.floor(1e7 + Math.random() * 9e7));
}

/**
 * The shared checkout for every non-train product (addendum §5). Fare
 * breakdown, a promo field that actually changes the total, a wallet payment
 * that actually debits the persisted balance, then a visible payment state
 * machine and a real confirmation stored under the user.
 */
export function Checkout({
  draft,
  open,
  onClose,
}: {
  draft: CheckoutDraft | null;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();

  const wallet = useSession((s) => s.wallet);
  const addBooking = useSession((s) => s.addBooking);
  const payFromWallet = useSession((s) => s.payFromWallet);
  const creditWallet = useSession((s) => s.creditWallet);
  const notify = useSession((s) => s.notify);

  const [method, setMethod] = useState('upi');
  const [promo, setPromo] = useState('');
  const [applied, setApplied] = useState<{ discount: number; offer?: Offer; reason?: string } | null>(null);
  const [state, setState] = useState<PaymentState | null>(null);
  const [booked, setBooked] = useState<Booking | null>(null);

  const subtotal = useMemo(
    () => (draft?.lines ?? []).reduce((sum, l) => sum + l.amount, 0),
    [draft],
  );
  const discount = applied?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (!open) return;
    setState(null);
    setBooked(null);
    setPromo('');
    setApplied(null);
    setMethod('upi');
  }, [open, draft?.title]);

  if (!draft) return null;

  function applyPromo() {
    if (!draft) return;
    const res = applyOffer(promo, subtotal, draft.offerCategory);
    setApplied(res);
    if (res.discount > 0) toast(`${res.offer?.code} applied — ${rupees(res.discount)} off`);
  }

  async function pay() {
    if (!draft) return;
    setState('initiated');

    // Wallet is settled first so an insufficient balance fails before the
    // state machine pretends to have taken the money.
    if (method === 'wallet') {
      if (wallet.balance < total) {
        setState('failed');
        return;
      }
    }

    await wait(500);
    setState('processing');
    await wait(900);

    if (method === 'wallet') {
      const ok = await payFromWallet(total, draft.title, undefined);
      if (!ok) {
        setState('failed');
        return;
      }
    }

    setState('received');
    await wait(700);
    setState('reserving');
    await wait(900);

    const booking = await addBooking({
      category: draft.category,
      reference: reference(prefixFor(draft.category)),
      title: draft.title,
      subtitle: draft.subtitle,
      date: draft.date,
      time: draft.time,
      status: 'confirmed',
      total,
      details: {
        ...draft.details,
        Paid: rupees(total),
        Method: METHODS.find((m) => m.id === method)?.label ?? method,
        ...(applied?.offer ? { Offer: `${applied.offer.code} (−${rupees(discount)})` } : {}),
      },
      promo_code: applied?.offer?.code,
      refund_status: 'none',
    });

    // The wallet cashback offer credits back immediately, visibly.
    if (applied?.offer?.code === 'RIWALLET') {
      await creditWallet(discount, `Cashback · ${draft.title}`, booking.reference);
    }

    await notify({
      priority: 'important',
      type: 'chart_prepared',
      title: `${draft.title} confirmed`,
      body: `${draft.subtitle} · reference ${booking.reference}`,
    });

    setState('confirmed');
    setBooked(booking);
  }

  const busy = state !== null && state !== 'confirmed' && state !== 'failed';

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} title={booked ? undefined : 'Review & pay'} wide>
      {booked ? (
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-confirmed-soft">
            <CheckCircle2 className="h-8 w-8 text-confirmed" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[1.25rem] font-bold text-ink">{draft.successNote}</h2>
          <p className="mt-1.5 text-[0.875rem] text-ink-muted">{draft.subtitle}</p>

          <div className="mt-5 rounded-card border border-line bg-surface-sunk p-4 text-left">
            <p className="text-[0.6875rem] font-bold uppercase text-ink-faint">Booking reference</p>
            <p className="tnum mt-1 text-[1.125rem] font-extrabold tracking-wide text-navy-700">
              {booked.reference}
            </p>
            <dl className="mt-3 grid gap-x-4 gap-y-2 border-t border-line pt-3 sm:grid-cols-2">
              {Object.entries(booked.details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-[0.75rem] text-ink-muted">{k}</dt>
                  <dd className="tnum text-[0.75rem] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              full
              onClick={() => {
                onClose();
                navigate('/trips');
              }}
            >
              View in My Trips
            </Button>
            <Button variant="secondary" full onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-card border border-line p-4">
            <p className="text-[1rem] font-bold text-ink">{draft.title}</p>
            <p className="mt-0.5 text-[0.875rem] text-ink-muted">{draft.subtitle}</p>
            <p className="tnum mt-1.5 text-[0.8125rem] font-semibold text-ink-muted">
              {draft.date}
              {draft.time ? ` · ${draft.time}` : ''}
            </p>
          </div>

          {/* fare breakdown — everything, before payment */}
          <div>
            <h3 className="mb-2 text-[0.8125rem] font-bold text-ink">What you pay</h3>
            <dl className="rounded-card border border-line">
              {draft.lines.map((l) => (
                <div key={l.label} className="flex justify-between border-b border-line px-4 py-2.5 last:border-0">
                  <dt className="text-[0.875rem] text-ink-muted">{l.label}</dt>
                  <dd className="tnum text-[0.875rem] font-semibold text-ink">{rupees(l.amount)}</dd>
                </div>
              ))}
              {discount > 0 && (
                <div className="flex justify-between border-t border-line px-4 py-2.5">
                  <dt className="text-[0.875rem] font-medium text-confirmed">
                    Offer {applied?.offer?.code}
                  </dt>
                  <dd className="tnum text-[0.875rem] font-bold text-confirmed">−{rupees(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-line bg-surface-sunk px-4 py-3">
                <dt className="text-[0.9375rem] font-bold text-ink">Total</dt>
                <dd className="tnum text-[1.0625rem] font-extrabold text-ink">{rupees(total)}</dd>
              </div>
            </dl>
          </div>

          {/* promo */}
          <div>
            <div className="flex gap-2">
              <Input
                aria-label="Promo code"
                placeholder="Have a promo code?"
                value={promo}
                onChange={(e) => setPromo(e.target.value.toUpperCase())}
                lead={<Tag className="h-4 w-4" />}
              />
              <Button variant="secondary" onClick={applyPromo} disabled={!promo.trim()} className="shrink-0">
                Apply
              </Button>
            </div>
            {applied?.reason && (
              <p className="mt-1.5 text-[0.8125rem] text-attention">{applied.reason}</p>
            )}
            {discount > 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-confirmed">
                <BadgeCheck className="h-4 w-4" /> {rupees(discount)} off applied.
              </p>
            )}
          </div>

          {/* payment method */}
          <div>
            <h3 className="mb-2 text-[0.8125rem] font-bold text-ink">Pay with</h3>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => {
                const short = m.id === 'wallet' && wallet.balance < total;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={short}
                    onClick={() => setMethod(m.id)}
                    className={cx(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-3 text-left transition-colors',
                      method === m.id
                        ? 'border-navy-600 bg-navy-50'
                        : 'border-line hover:border-navy-300 hover:bg-navy-50',
                      short && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    <m.icon className="h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] font-semibold text-ink">
                        {m.label}
                      </span>
                      {m.id === 'wallet' && (
                        <span
                          className={cx(
                            'tnum mt-0.5 block text-[0.6875rem]',
                            short ? 'text-critical' : 'text-ink-muted',
                          )}
                        >
                          {short ? `Short by ${rupees(total - wallet.balance)}` : rupees(wallet.balance)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* payment state machine */}
          {state && state !== 'confirmed' && (
            <Alert
              tone={state === 'failed' ? 'critical' : 'info'}
              icon={
                state === 'failed' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin-slow" />
                )
              }
              title={STATE_COPY[state]}
            >
              {state === 'failed'
                ? method === 'wallet'
                  ? 'Your wallet balance is short. Top it up, or choose another method — nothing has been charged.'
                  : 'Nothing has been charged. Try again or use another method.'
                : 'Do not close this window. We will tell you the moment it is done.'}
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button full loading={busy} onClick={() => void pay()}>
              {state === 'failed' ? 'Try again' : `Pay ${rupees(total)}`}
            </Button>
          </div>

          <p className="text-center text-[0.75rem] text-ink-faint">
            Mock payment — no real money moves. Your wallet balance and booking are stored for real.
          </p>
        </div>
      )}
    </Modal>
  );
}

function prefixFor(c: BookingCategory): string {
  return (
    {
      train: 'PNR', flight: 'FL', bus: 'BUS', hotel: 'HTL', cab: 'CAB',
      package: 'PKG', activity: 'ACT', food: 'FD', retiring: 'RR', lounge: 'LG',
    }[c] ?? 'REF'
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Small helper so category screens can show a consistent "booked" pill. */
export function BookedBadge() {
  return <Badge tone="confirmed">Confirmed</Badge>;
}

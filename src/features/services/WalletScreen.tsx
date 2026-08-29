import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet as WalletIcon } from 'lucide-react';
import { useSession } from '@/store/session';
import { rupees } from '@/lib/format';
import { Button, Chip, EmptyState, Modal, PageHeader, cx, useToast } from '@/components/ui';

const TOP_UPS = [200, 500, 1000, 2000];

/**
 * IRCTC eWallet (addendum §5). Genuinely functional: the balance is persisted
 * per user, top-ups credit it, every mock booking paid from the wallet debits
 * it, and the ledger below is the real transaction history.
 */
export function WalletScreen() {
  const toast = useToast();
  const wallet = useSession((s) => s.wallet);
  const txns = useSession((s) => s.walletTxns);
  const topUpWallet = useSession((s) => s.topUpWallet);

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);

  async function addMoney() {
    setBusy(true);
    try {
      await topUpWallet(amount);
      toast(`${rupees(amount)} added to your wallet`);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const credited = txns.filter((t) => t.kind === 'credit').reduce((s, t) => s + t.amount, 0);
  const spent = txns.filter((t) => t.kind === 'debit').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="IRCTC eWallet"
        subtitle="Pay in one tap and get refunds back instantly, without waiting on a bank."
      />

      <div className="card overflow-hidden">
        <div className="bg-navy-700 p-6 text-white">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-white/80">
            <WalletIcon className="h-4 w-4" aria-hidden="true" /> Available balance
          </p>
          <p className="tnum mt-2 text-[2.25rem] font-extrabold leading-none">{rupees(wallet.balance)}</p>
          <Button variant="accent" className="mt-5" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Add Money
          </Button>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-line">
          <div className="p-4 text-center">
            <dt className="text-[0.6875rem] font-bold uppercase text-ink-faint">Total added</dt>
            <dd className="tnum mt-1 text-[1.0625rem] font-extrabold text-confirmed">{rupees(credited)}</dd>
          </div>
          <div className="p-4 text-center">
            <dt className="text-[0.6875rem] font-bold uppercase text-ink-faint">Total spent</dt>
            <dd className="tnum mt-1 text-[1.0625rem] font-extrabold text-ink">{rupees(spent)}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-7">
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Transaction history</h2>
        {txns.length === 0 ? (
          <EmptyState icon={<WalletIcon className="h-5 w-5" />} title="No transactions yet" />
        ) : (
          <ul className="card divide-y divide-line">
            {txns.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span
                  className={cx(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full',
                    t.kind === 'credit' ? 'bg-confirmed-soft text-confirmed' : 'bg-surface-tint text-ink-muted',
                  )}
                >
                  {t.kind === 'credit' ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold text-ink">{t.note}</p>
                  <p className="tnum mt-0.5 text-[0.75rem] text-ink-muted">
                    {new Date(t.created_at).toLocaleString()}
                    {t.booking_ref ? ` · ${t.booking_ref}` : ''}
                  </p>
                </div>
                <p
                  className={cx(
                    'tnum shrink-0 text-[0.9375rem] font-bold',
                    t.kind === 'credit' ? 'text-confirmed' : 'text-ink',
                  )}
                >
                  {t.kind === 'credit' ? '+' : '−'}
                  {rupees(t.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Add money to your wallet">
        <div className="flex flex-wrap gap-2">
          {TOP_UPS.map((a) => (
            <Chip key={a} active={amount === a} onClick={() => setAmount(a)}>
              {rupees(a)}
            </Chip>
          ))}
        </div>
        <div className="mt-4">
          <label htmlFor="wl-amt" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            Or enter an amount
          </label>
          <input
            id="wl-amt"
            type="number"
            min={50}
            max={20000}
            step={50}
            value={amount}
            onChange={(e) => setAmount(Math.max(50, Math.min(20000, Number(e.target.value) || 0)))}
            className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                       text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <Button full size="lg" className="mt-5" loading={busy} onClick={() => void addMoney()}>
          Add {rupees(amount)}
        </Button>
        <p className="mt-3 text-center text-[0.75rem] text-ink-faint">
          Mock top-up — no real payment is taken, but the balance is stored on your account.
        </p>
      </Modal>
    </div>
  );
}

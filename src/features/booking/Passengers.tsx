import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Plus, UserPlus } from 'lucide-react';
import type { Person } from '@/types';
import { useSession } from '@/store/session';
import { useBooking, type BerthPreference } from '@/store/booking';
import { Alert, Button, Chip, Input, Modal, SectionHeading, Select, cx } from '@/components/ui';
import { BookingSummary } from './BookingSummary';

const SEATING_CLASSES = new Set(['CC', 'EC', '2S']);

/**
 * "Who's travelling?" — saved people as tappable chips, not a form to fill in
 * each time. The ticket is issued in the passenger's own name (§6).
 */
export function Passengers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const people = useSession((s) => s.people);
  const addPerson = useSession((s) => s.addPerson);
  const booking = useBooking();
  const [adding, setAdding] = useState(false);

  if (!booking.selection || !booking.query) {
    navigate('/book');
    return null;
  }

  const seating = SEATING_CLASSES.has(booking.selection.travel_class);
  const required = booking.query.passengers;
  const chosen = booking.passengers;

  const berthOptions: { id: BerthPreference; label: string }[] = seating
    ? [
        { id: 'none', label: t('booking.noPreference') },
        { id: 'window', label: t('booking.window') },
      ]
    : [
        { id: 'none', label: t('booking.noPreference') },
        { id: 'lower', label: t('booking.lower') },
        { id: 'middle', label: t('booking.middle') },
        { id: 'upper', label: t('booking.upper') },
        { id: 'side_lower', label: t('booking.sideLower') },
      ];

  return (
    <div className="xl:grid xl:grid-cols-[1fr_20rem] xl:gap-8">
      <div className="space-y-8">
        <header>
          <h1 className="font-display text-3xl leading-tight">{t('booking.who')}</h1>
          <p className="mt-2 text-[0.9375rem] text-ink-muted">{t('booking.whoHelp')}</p>
        </header>

        {booking.preparedByAgent && (
          <Alert tone="info">{t('agent.prepared')}</Alert>
        )}

        <section>
          <SectionHeading>
            {chosen.length} / {required} {required === 1 ? t('common.traveller') : t('common.travellers')}
          </SectionHeading>

          <ul className="space-y-2">
            {people.map((p) => {
              const selected = chosen.some((x) => x.id === p.id);
              const full = chosen.length >= required && !selected;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={full}
                    onClick={() => booking.togglePassenger(p)}
                    aria-pressed={selected}
                    className={cx(
                      'card flex w-full items-center gap-4 p-4 text-left transition-colors',
                      selected ? 'border-teal-700 ring-1 ring-teal-700' : 'hover:border-rule-strong',
                      full && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    <span
                      className={cx(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-full font-medium',
                        selected ? 'bg-teal-700 text-canvas' : 'bg-canvas-sunk text-ink-muted',
                      )}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="label mt-0.5 block">
                        {p.age} · {p.gender} · {p.relation}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => setAdding(true)}
            icon={<UserPlus className="h-4 w-4" />}
          >
            {t('booking.addPerson')}
          </Button>
        </section>

        <section>
          <SectionHeading>{t('booking.berthPreference')}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {berthOptions.map((b) => (
              <Chip key={b.id} selected={booking.berth === b.id} onClick={() => booking.setBerth(b.id)}>
                {b.label}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-faint">
            A preference, not a guarantee — berths are allotted at chart preparation.
          </p>
        </section>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            {t('booking.back')}
          </Button>
          <Button
            disabled={chosen.length !== required}
            onClick={() => navigate('/book/review')}
            icon={<ArrowRight className="h-4 w-4" />}
          >
            {t('booking.continue')}
          </Button>
        </div>
      </div>

      <div className="mt-8 xl:mt-0">
        <BookingSummary />
      </div>

      <AddPersonModal open={adding} onClose={() => setAdding(false)} onAdd={addPerson} />
    </div>
  );
}

export function AddPersonModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (p: Omit<Person, 'id' | 'saved_at'>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('M');
  const [relation, setRelation] = useState('friend');
  const [aadhaar, setAadhaar] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    if (!name.trim()) return setError('Enter the name as printed on their ID.');
    const n = Number(age);
    if (!n || n < 1 || n > 120) return setError('Enter a valid age.');
    if (aadhaar.replace(/\D/g, '').length !== 12) return setError(t('auth.invalidAadhaar'));

    await onAdd({
      name: name.trim(),
      age: n,
      gender,
      // Tokenised on the way in; the raw number is never stored.
      aadhaar_ref: `aad_${aadhaar.replace(/\D/g, '').slice(-4).padStart(8, '0')}`,
      relation,
      is_frequent: false,
    });
    setName('');
    setAge('');
    setAadhaar('');
    setError(undefined);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('booking.addPerson')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} icon={<Plus className="h-4 w-4" />}>
            {t('common.add')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('auth.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('profile.age')}
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
          />
          <Select
            label={t('profile.gender')}
            value={gender}
            onChange={(e) => setGender(e.target.value as 'M' | 'F' | 'Other')}
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </Select>
        </div>
        <Input
          label={t('auth.aadhaarLabel')}
          help={t('auth.aadhaarHelp')}
          inputMode="numeric"
          value={aadhaar}
          className="tnum"
          onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
        />
        <Select
          label={t('profile.relation')}
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        >
          {['self', 'mother', 'father', 'spouse', 'sibling', 'child', 'friend', 'colleague'].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {error && <Alert tone="critical">{error}</Alert>}
      </div>
    </Modal>
  );
}

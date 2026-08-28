import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Eye, LogOut, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import type { AuditLog, DeparturePreference, TravelClass } from '@/types';
import { useSession } from '@/store/session';
import { useSettings } from '@/store/settings';
import { repo, backendKind } from '@/lib/backend';
import { enablePush, pushSupported } from '@/lib/messaging';
import { AddPersonModal } from '@/features/booking/Passengers';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import {
  Alert,
  Badge,
  Button,
  SectionHeading,
  Select,
  Toggle,
  cx,
} from '@/components/ui';
import { rupees } from '@/lib/format';

const CLASSES: TravelClass[] = ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S'];
const DEPARTURES: DeparturePreference[] = ['morning', 'afternoon', 'evening', 'night', 'any'];

/**
 * Profile & People. Personalisation is transparent and switchable — the user
 * can see exactly what is remembered and why a train was recommended (§8, §11).
 */
export function Profile() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const people = useSession((s) => s.people);
  const addPerson = useSession((s) => s.addPerson);
  const removePerson = useSession((s) => s.removePerson);
  const savePreferences = useSession((s) => s.savePreferences);
  const signOut = useSession((s) => s.signOut);
  const settings = useSettings();

  const [adding, setAdding] = useState(false);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [pushOn, setPushOn] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );

  useEffect(() => {
    void repo.listAudit(8).then(setAudit).catch(() => setAudit([]));
    void pushSupported().then(setPushAvailable);
  }, [user]);

  if (!user) return null;
  const prefs = user.preferences;

  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <h1 className="font-display text-4xl leading-tight">{t('profile.title')}</h1>
      </header>

      {/* ---- account ---- */}
      <section>
        <SectionHeading>{t('profile.account')}</SectionHeading>
        <div className="card p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-teal-700 text-xl font-medium text-canvas">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-medium">{user.name}</p>
              <p className="tnum label mt-1">{user.mobile}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
            <Badge tone="confirmed">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t('profile.aadhaarLinked')}
            </Badge>
            <Badge tone="neutral">{backendKind === 'firestore' ? 'Firestore' : 'Local store'}</Badge>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-ink-faint">
            Your Aadhaar is stored only as a one-way reference — {user.aadhaar_ref.slice(0, 12)}… — never as a
            number we can read back. It is what lets you recover this account if you lose everything else.
          </p>
        </div>
      </section>

      {/* ---- travel people ---- */}
      <section>
        <SectionHeading
          action={
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="label-ink transition-colors hover:text-ink"
            >
              {t('profile.addPerson')}
            </button>
          }
        >
          {t('profile.people')}
        </SectionHeading>
        <p className="mb-3 text-sm text-ink-muted">{t('profile.peopleHelp')}</p>

        <ul className="card divide-y divide-rule">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas-sunk font-medium text-ink-muted">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="label mt-0.5 block">
                  {p.age} · {p.gender} · {p.relation}
                </span>
              </span>
              {p.relation !== 'self' && (
                <button
                  type="button"
                  onClick={() => void removePerson(p.id)}
                  aria-label={`${t('common.remove')} ${p.name}`}
                  className="rounded-full p-2 text-ink-faint transition-colors hover:bg-critical-soft hover:text-critical"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        <Button
          variant="secondary"
          className="mt-3"
          onClick={() => setAdding(true)}
          icon={<UserPlus className="h-4 w-4" />}
        >
          {t('profile.addPerson')}
        </Button>
      </section>

      {/* ---- what we remember ---- */}
      <section>
        <SectionHeading>{t('profile.remembers')}</SectionHeading>
        <div className="card p-5">
          <p className="text-[0.9375rem] leading-relaxed">
            {t('profile.remembersBody', {
              departure: t(`common.${prefs.preferred_departure}`),
              class: t(`classes.${prefs.preferred_class}`),
            })}
          </p>

          <div className="mt-5 border-t border-rule pt-5">
            <Toggle
              label={t('profile.personalization')}
              help={
                prefs.personalization_enabled
                  ? t('profile.personalizationOn')
                  : t('profile.personalizationOff')
              }
              checked={prefs.personalization_enabled}
              onChange={(v) => void savePreferences({ personalization_enabled: v })}
            />
          </div>
        </div>
      </section>

      {/* ---- why a train was recommended ---- */}
      <section>
        <SectionHeading>{t('profile.whyRecommended')}</SectionHeading>
        {audit.length === 0 ? (
          <p className="text-sm text-ink-faint">{t('profile.noAudit')}</p>
        ) : (
          <ul className="card divide-y divide-rule">
            {audit.map((a) => (
              <li key={a.id} className="flex gap-3 p-4">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.result}</p>
                  <p className="mt-1 text-sm leading-snug text-ink-muted">{a.reasoning}</p>
                  <p className="label mt-1.5">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- preferences ---- */}
      <section>
        <SectionHeading>{t('profile.preferences')}</SectionHeading>
        <div className="card space-y-4 p-5">
          <Select
            label={t('profile.preferredClass')}
            value={prefs.preferred_class}
            onChange={(e) => void savePreferences({ preferred_class: e.target.value as TravelClass })}
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {t(`classes.${c}`)}
              </option>
            ))}
          </Select>

          <Select
            label={t('profile.preferredDeparture')}
            value={prefs.preferred_departure}
            onChange={(e) =>
              void savePreferences({ preferred_departure: e.target.value as DeparturePreference })
            }
          >
            {DEPARTURES.map((d) => (
              <option key={d} value={d}>
                {t(`common.${d}`)}
              </option>
            ))}
          </Select>

          <div>
            <label htmlFor="ri-max-budget" className="label-ink mb-2 block">
              {t('profile.maxBudget')} · <span className="tnum text-ink">{rupees(prefs.max_budget)}</span>
            </label>
            <input
              id="ri-max-budget"
              type="range"
              min={200}
              max={5000}
              step={100}
              value={prefs.max_budget}
              onChange={(e) => void savePreferences({ max_budget: Number(e.target.value) })}
              className="h-12 w-full accent-teal-700"
            />
          </div>

          <Select
            label={t('profile.comfortOverPrice')}
            value={prefs.comfort_over_price}
            onChange={(e) =>
              void savePreferences({
                comfort_over_price: e.target.value as 'always' | 'sometimes' | 'never',
              })
            }
          >
            <option value="always">Always</option>
            <option value="sometimes">Sometimes</option>
            <option value="never">Never</option>
          </Select>
        </div>
      </section>

      {/* ---- language ---- */}
      <section>
        <SectionHeading>{t('profile.language')}</SectionHeading>
        <div className="card flex items-center justify-between gap-4 p-5">
          <p className="text-sm text-ink-muted">
            Changes the interface and train and station names together, straight away.
          </p>
          <LanguageSwitch />
        </div>
      </section>

      {/* ---- push notifications ---- */}
      {pushAvailable && (
        <section>
          <SectionHeading>{t('notifications.title')}</SectionHeading>
          <div className="card p-5">
            <Toggle
              label="Alerts on this device"
              help="Platform changes, delays and arrival reminders reach you even when the tab is closed. We stay quiet during a journey except for what matters."
              checked={pushOn}
              onChange={async (v) => {
                if (!v) {
                  setPushOn(false);
                  return;
                }
                const token = await enablePush();
                setPushOn(Boolean(token));
              }}
            />
            {!pushOn && (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-faint">
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                In-app notifications always work. This adds them to your lock screen too.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ---- accessibility ---- */}
      <section>
        <SectionHeading>{t('profile.accessibility')}</SectionHeading>
        <div className="card space-y-5 p-5">
          <Toggle
            label={t('profile.largeText')}
            checked={settings.largeText}
            onChange={(v) => settings.set({ largeText: v })}
          />
          <div className="border-t border-rule pt-5">
            <Toggle
              label={t('profile.highContrast')}
              checked={settings.highContrast}
              onChange={(v) => settings.set({ highContrast: v })}
            />
          </div>
          <div className="border-t border-rule pt-5">
            <Toggle
              label={t('profile.elderMode')}
              help={t('profile.elderModeHelp')}
              checked={settings.elderMode}
              onChange={(v) => settings.set({ elderMode: v })}
            />
          </div>
        </div>
      </section>

      {backendKind === 'local' && (
        <Alert tone="info">
          No Firebase project is configured, so this session is persisting to the local adapter. Set the
          VITE_FIREBASE_* variables (or run the emulators) and every read and write moves to Firestore with
          no other change.
        </Alert>
      )}

      <section className={cx('border-t border-rule pt-6')}>
        <Button variant="secondary" onClick={() => void signOut()} icon={<LogOut className="h-4 w-4" />}>
          {t('profile.signOut')}
        </Button>
      </section>

      <AddPersonModal open={adding} onClose={() => setAdding(false)} onAdd={addPerson} />
    </div>
  );
}

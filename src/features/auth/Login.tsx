import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Phone,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { TrainHero } from '@/components/art/TrainHero';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { Alert, Button, CheckLine, Input, OtpInput, cx } from '@/components/ui';
import { useSession } from '@/store/session';
import { repo } from '@/lib/backend';
import { seedDemoAccount, DEMO_CREDENTIALS } from '@/data/demo';

type Step = 'identity' | 'code';

const TRUST = [
  { icon: ShieldCheck, title: 'Secure', body: '100% Safe & Secure' },
  { icon: Users, title: 'Trusted', body: 'By Millions Daily' },
  { icon: Ticket, title: 'Seamless', body: 'Booking Experience' },
];

/**
 * Login / Create Account (addendum §2). Aadhaar is the account and the mobile
 * number is only for updates (master prompt §6) — the number typed here is
 * hashed to a one-way reference before anything is persisted, so a raw Aadhaar
 * never reaches storage or the screen.
 */
export function Login() {
  const signIn = useSession((s) => s.signIn);
  const busy = useSession((s) => s.busy);

  const [step, setStep] = useState<Step>('identity');
  const [aadhaar, setAadhaar] = useState('');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [demoBusy, setDemoBusy] = useState(false);

  const aadhaarDigits = aadhaar.replace(/\D/g, '');
  const mobileDigits = mobile.replace(/\D/g, '');

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (aadhaarDigits.length !== 12) return setError('Enter all 12 digits of your Aadhaar number.');
    if (mobileDigits.length !== 10) return setError('Enter a 10-digit mobile number.');
    if (!name.trim()) return setError('Enter your name as it appears on Aadhaar.');
    const res = await repo.requestOtp(mobileDigits);
    setHint(res.hint);
    setStep('code');
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await signIn(mobileDigits, otp, aadhaarDigits, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
    }
  }

  async function onInstantDemo() {
    setDemoBusy(true);
    setError(undefined);
    try {
      await repo.requestOtp(DEMO_CREDENTIALS.mobile);
      await signIn(
        DEMO_CREDENTIALS.mobile,
        DEMO_CREDENTIALS.otp,
        DEMO_CREDENTIALS.aadhaar,
        DEMO_CREDENTIALS.name,
      );
      await seedDemoAccount();
      await useSession.getState().refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the demo.');
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-page lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ------------------------------------------------------ left: hero */}
      <div className="relative min-h-[46vh] overflow-hidden lg:min-h-dvh">
        <TrainHero className="absolute inset-0" />

        {/* light scrim so the navy headline stays readable over the scene */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/35 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/55 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-between p-6 lg:p-10">
          <div className="flex items-start justify-between gap-4">
            <Logo />
            <div className="lg:hidden">
              <LanguageSwitch compact />
            </div>
          </div>

          <motion.div
            className="max-w-lg py-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <h1 className="text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-navy-700 sm:text-[3.5rem]">
              Your Journey
              <br />
              <span className="text-saffron-500">Starts Here</span>
            </h1>
            <p className="mt-4 max-w-sm text-[1rem] font-medium leading-relaxed text-navy-800/80">
              Book tickets, plan journeys and travel across India with IRCTC.
            </p>
          </motion.div>

          {/* trust bar over the scene */}
          <div className="grid grid-cols-3 gap-2 rounded-card bg-navy-900/55 p-3 backdrop-blur-sm sm:gap-4 sm:p-4">
            {TRUST.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                </span>
                <span className="min-w-0 leading-none">
                  <span className="block text-[0.8125rem] font-bold text-white">{title}</span>
                  <span className="mt-1 block truncate text-[0.6875rem] text-white/75">{body}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- right: form */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8 lg:-ml-16 lg:py-12 lg:pr-12">
        <div className="w-full max-w-md">
          <div className="mb-4 hidden justify-end lg:flex">
            <LanguageSwitch />
          </div>

          <div className="rounded-card border border-line bg-surface p-6 shadow-panel sm:p-7">
            <AnimatePresence mode="wait">
              {step === 'identity' ? (
                <motion.form
                  key="identity"
                  onSubmit={onContinue}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy-50">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-navy-700" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" fill="currentColor" />
                        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
                      </svg>
                    </span>
                    <div>
                      <h2 className="text-[1.25rem] font-bold leading-tight text-ink">
                        Login / Create Account
                      </h2>
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">Using Aadhaar</p>
                    </div>
                  </div>

                  <Alert tone="info" icon={<ShieldCheck className="h-4 w-4" />} title="Your details are safe with us">
                    We use Aadhaar to provide you a seamless and secure booking experience.
                  </Alert>

                  <div>
                    <Input
                      label="Aadhaar Number"
                      inputMode="numeric"
                      autoComplete="off"
                      type={showAadhaar ? 'text' : 'password'}
                      placeholder="Enter your 12 digit Aadhaar number"
                      value={aadhaar}
                      maxLength={14}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setAadhaar(d.replace(/(\d{4})(?=\d)/g, '$1 ').trim());
                      }}
                      lead={<Fingerprint className="h-4 w-4 text-saffron-500" />}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowAadhaar((v) => !v)}
                          aria-label={showAadhaar ? 'Hide Aadhaar number' : 'Show Aadhaar number'}
                          className="text-ink-faint transition-colors hover:text-ink"
                        >
                          {showAadhaar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                      className="tnum"
                    />
                    <div className="mt-1.5">
                      <CheckLine>We will fetch your details securely from UIDAI</CheckLine>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <div className="flex h-12 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-surface-sunk px-3">
                        <Phone className="h-4 w-4 text-ink-faint" aria-hidden="true" />
                        <span className="tnum text-[0.9375rem] font-semibold text-ink">+91</span>
                      </div>
                      <input
                        inputMode="tel"
                        autoComplete="tel"
                        aria-label="Mobile number"
                        placeholder="Enter your mobile number"
                        value={mobile}
                        maxLength={10}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5
                                   text-[0.9375rem] text-ink placeholder:text-ink-faint transition-colors
                                   focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                      />
                    </div>
                  </div>

                  <Input
                    label="Full Name (as per Aadhaar)"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />

                  <Alert tone="accent" icon={<Fingerprint className="h-4 w-4" />} title="All other details will be fetched from Aadhaar">
                    Date of Birth, Gender, Address &amp; more
                  </Alert>

                  {error && <Alert tone="critical">{error}</Alert>}

                  <Button type="submit" size="lg" full icon={<Lock className="h-4 w-4" />}>
                    Continue Securely
                  </Button>

                  <p className="text-center text-[0.75rem] leading-relaxed text-ink-faint">
                    By continuing, you agree to our{' '}
                    <span className="font-semibold text-navy-600">Terms &amp; Conditions</span> &amp;{' '}
                    <span className="font-semibold text-navy-600">Privacy Policy</span>.
                  </p>
                </motion.form>
              ) : (
                <motion.form
                  key="code"
                  onSubmit={onVerify}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-4"
                >
                  <button
                    type="button"
                    onClick={() => setStep('identity')}
                    className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-muted transition-colors hover:text-navy-700"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>

                  <div>
                    <h2 className="text-[1.25rem] font-bold leading-tight text-ink">Verify your number</h2>
                    <p className="tnum mt-1 text-[0.875rem] text-ink-muted">
                      We sent a six-digit code to +91 {mobileDigits}.
                    </p>
                  </div>

                  <OtpInput label="Enter code" value={otp} onChange={setOtp} autoFocus />

                  {hint && (
                    <Alert tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
                      Demo code: <strong className="tnum">{hint}</strong> — no real SMS is sent.
                    </Alert>
                  )}

                  {error && <Alert tone="critical">{error}</Alert>}

                  <Button
                    type="submit"
                    size="lg"
                    full
                    loading={busy}
                    disabled={otp.length !== 6}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    Verify &amp; continue
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-faint">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <Button variant="secondary" size="lg" full loading={demoBusy} onClick={onInstantDemo}>
              Try the instant demo
            </Button>
            <p className="mt-2.5 text-center text-[0.75rem] text-ink-faint">
              Opens a seeded account — no Aadhaar, no code, nothing to type.
            </p>

            <p className={cx('mt-5 border-t border-line pt-4 text-center text-[0.8125rem] text-ink-muted')}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => document.getElementById('ri-aadhaar')?.focus()}
                className="font-bold text-navy-600 hover:text-navy-700"
              >
                Login with IRCTC user ID
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

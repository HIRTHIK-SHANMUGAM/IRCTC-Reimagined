import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Fingerprint, ShieldCheck, Smartphone } from 'lucide-react';
import { TrainScene } from '@/components/motion/TrainScene';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { Alert, Button, Input, OtpInput } from '@/components/ui';
import { useSession } from '@/store/session';
import { repo } from '@/lib/backend';
import { seedDemoAccount, DEMO_CREDENTIALS } from '@/data/demo';

type Step = 'identity' | 'code';

/**
 * The first screen. Aadhaar is the account; the mobile number is only for
 * updates (§6). Two fields, one question at a time, and the motion graphic
 * doing the work of a paragraph of marketing copy.
 */
export function SignIn() {
  const { t } = useTranslation();
  const signIn = useSession((s) => s.signIn);
  const busy = useSession((s) => s.busy);

  const [step, setStep] = useState<Step>('identity');
  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [demoBusy, setDemoBusy] = useState(false);

  const aadhaarDigits = aadhaar.replace(/\D/g, '');
  const mobileDigits = mobile.replace(/\D/g, '');

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (aadhaarDigits.length !== 12) return setError(t('auth.invalidAadhaar'));
    if (mobileDigits.length !== 10) return setError(t('auth.invalidMobile'));
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Left: the motion graphic. On mobile it becomes a band above the form.
          Three stacked zones — brand, headline, train — so the copy never
          overlaps the scene. The train takes the remaining flex space. */}
      <div className="relative flex min-h-[42vh] flex-col overflow-hidden border-b border-rule bg-canvas-sunk lg:min-h-dvh lg:border-b-0 lg:border-r">
        <div className="z-10 flex shrink-0 items-start justify-between p-6 lg:p-10">
          <div>
            <p className="font-display text-2xl leading-none">{t('brand')}</p>
            <p className="label mt-2">{t('tagline')}</p>
          </div>
          <div className="lg:hidden">
            <LanguageSwitch compact />
          </div>
        </div>

        <div className="z-10 hidden shrink-0 px-10 pb-4 lg:block">
          <motion.h1
            className="max-w-md font-display text-5xl leading-[1.06]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            {t('auth.headline')}
          </motion.h1>
          <motion.p
            className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
          >
            You should never have to understand Indian Railways in order to use Indian Railways.
          </motion.p>
        </div>

        <div className="relative min-h-[180px] flex-1">
          <TrainScene className="absolute inset-x-0 bottom-0 h-full" />
        </div>
      </div>

      {/* Right: the form. One decision at a time. */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 hidden justify-end lg:flex">
            <LanguageSwitch />
          </div>

          <h2 className="font-display text-3xl leading-tight lg:hidden">{t('auth.headline')}</h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">{t('auth.sub')}</p>

          <AnimatePresence mode="wait">
            {step === 'identity' ? (
              <motion.form
                key="identity"
                onSubmit={onSendCode}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 space-y-5"
              >
                <Input
                  label={t('auth.aadhaarLabel')}
                  help={t('auth.aadhaarHelp')}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="1234 5678 9012"
                  value={aadhaar}
                  maxLength={14}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setAadhaar(d.replace(/(\d{4})(?=\d)/g, '$1 ').trim());
                  }}
                  suffix={<Fingerprint className="h-4 w-4" aria-hidden="true" />}
                  className="tnum"
                />

                <Input
                  label={t('auth.mobileLabel')}
                  help={t('auth.mobileHelp')}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={mobile}
                  maxLength={11}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  suffix={<Smartphone className="h-4 w-4" aria-hidden="true" />}
                  className="tnum"
                />

                <Input
                  label={t('auth.nameLabel')}
                  help={t('auth.nameHelp')}
                  autoComplete="name"
                  placeholder="Ananya Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                {error && (
                  <Alert tone="critical">
                    {error}
                  </Alert>
                )}

                <Button type="submit" size="lg" full icon={<ArrowRight className="h-4 w-4" />}>
                  {t('auth.sendOtp')}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="code"
                onSubmit={onVerify}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 space-y-5"
              >
                <p className="text-sm text-ink-muted">
                  {t('auth.otpSentTo', { mobile: mobileDigits })}
                </p>

                <OtpInput label={t('auth.otpLabel')} value={otp} onChange={setOtp} autoFocus />

                {hint && (
                  <Alert tone="info" icon={<ShieldCheck className="h-4 w-4" />}>
                    {t('auth.demoHint', { code: hint })}
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
                  {t('auth.verify')}
                </Button>

                <Button type="button" variant="ghost" full onClick={() => setStep('identity')}>
                  {t('auth.back')}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-rule" />
            <span className="label">{t('common.or')}</span>
            <div className="h-px flex-1 bg-rule" />
          </div>

          <Button variant="secondary" size="lg" full loading={demoBusy} onClick={onInstantDemo}>
            {t('auth.instantDemo')}
          </Button>
          <p className="mt-3 text-center text-sm text-ink-faint">{t('auth.instantDemoHelp')}</p>

          <p className="mt-8 border-t border-rule pt-6 text-sm leading-relaxed text-ink-faint">
            {t('auth.forgot')}
          </p>
        </div>
      </div>
    </div>
  );
}

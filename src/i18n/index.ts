import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './resources';
import type { Locale, LocalizedText } from '@/types';

export const SUPPORTED_LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

/**
 * Location-aware defaults. We surface the local language *and* English as the
 * two prominent options — but the full list stays selectable, because a
 * location default must never restrict choice (master prompt §12).
 */
const REGION_LANGUAGE: Record<string, Locale> = {
  'Asia/Kolkata': 'hi',
  'Asia/Calcutta': 'hi',
};

const TAMIL_HINTS = ['ta-IN', 'ta'];

export function suggestedLocales(): Locale[] {
  const nav = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  let local: Locale | undefined;

  for (const tag of nav) {
    if (TAMIL_HINTS.some((t) => tag.toLowerCase().startsWith(t))) local = 'ta';
    else if (tag.toLowerCase().startsWith('hi')) local = 'hi';
    if (local) break;
  }

  if (!local) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      local = REGION_LANGUAGE[tz];
    } catch {
      /* ignore */
    }
  }

  // Local language first, English always alongside it.
  return local && local !== 'en' ? [local, 'en'] : ['en', 'hi'];
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: resources as unknown as Record<string, { translation: Record<string, unknown> }>,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'irctc-ri:locale',
      caches: ['localStorage'],
    },
  });

export function currentLocale(): Locale {
  const lng = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
  return (SUPPORTED_LOCALES.some((l) => l.code === lng) ? lng : 'en') as Locale;
}

export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

/**
 * Render a data-side language map. This is what makes a train or station name
 * switch language along with the UI, with no reload.
 */
export function localized(value: LocalizedText | string | undefined, locale?: Locale): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const l = locale ?? currentLocale();
  return value[l] || value.en || Object.values(value)[0] || '';
}

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { resources } from './resources';
import { uiResources } from './ui';
import type { Locale, LocalizedText } from '@/types';

export interface LanguageEntry {
  code: Locale;
  /** English name, for the secondary line in the picker. */
  label: string;
  /** The language's own name, in its own script. */
  native: string;
  /** Where it is most spoken — used to order the picker by the user's region. */
  regions: string[];
  rtl?: boolean;
}

/**
 * Every language the app is offered in. English stays first because it is the
 * shared fallback; the rest are ordered by number of speakers.
 */
export const SUPPORTED_LOCALES: LanguageEntry[] = [
  { code: 'en', label: 'English', native: 'English', regions: [] },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', regions: ['Delhi', 'Uttar Pradesh', 'Bihar', 'Madhya Pradesh', 'Rajasthan'] },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', regions: ['Tamil Nadu', 'Puducherry'] },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', regions: ['Andhra Pradesh', 'Telangana'] },
  { code: 'mr', label: 'Marathi', native: 'मराठी', regions: ['Maharashtra', 'Goa'] },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', regions: ['Karnataka'] },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', regions: ['Gujarat'] },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', regions: ['Kerala'] },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', regions: ['Odisha'] },
  { code: 'ur', label: 'Urdu', native: 'اردو', regions: ['Telangana', 'Uttar Pradesh', 'Bihar'], rtl: true },
  { code: 'raj', label: 'Rajasthani', native: 'राजस्थानी', regions: ['Rajasthan'] },
];

export const LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

export function localeEntry(code: Locale): LanguageEntry {
  return SUPPORTED_LOCALES.find((l) => l.code === code) ?? SUPPORTED_LOCALES[0];
}

export function isRtl(code: Locale): boolean {
  return Boolean(localeEntry(code).rtl);
}

/**
 * Location-aware defaults. We surface the local language *and* English as the
 * two prominent options — but the full list stays selectable, because a
 * location default must never restrict choice (master prompt §12).
 */
const TIMEZONE_LANGUAGE: Record<string, Locale> = {
  'Asia/Kolkata': 'hi',
  'Asia/Calcutta': 'hi',
};

/** Browser language tags map to our codes; Rajasthani has no standard tag. */
function fromTag(tag: string): Locale | undefined {
  const base = tag.toLowerCase().split('-')[0];
  const found = LOCALE_CODES.find((c) => c === base);
  if (found) return found;
  // Odia moved from 'or' to 'ory' in newer tags; both should resolve.
  if (base === 'ory') return 'or';
  return undefined;
}

export function suggestedLocales(): Locale[] {
  const nav = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  let local: Locale | undefined;

  for (const tag of nav) {
    const hit = fromTag(tag);
    if (hit && hit !== 'en') {
      local = hit;
      break;
    }
  }

  if (!local) {
    try {
      local = TIMEZONE_LANGUAGE[Intl.DateTimeFormat().resolvedOptions().timeZone];
    } catch {
      /* ignore — the picker still lists everything */
    }
  }

  // Local language first, English always alongside it.
  return local && local !== 'en' ? [local, 'en'] : ['en', 'hi'];
}

/**
 * The legacy resource file carries en/ta/hi for the original screens; the ui
 * table carries the shell and dashboard strings for all eleven. Merging keeps
 * both, and anything missing falls back to English.
 */
function mergedResources(): Record<string, { translation: Record<string, unknown> }> {
  const base = resources as unknown as Record<string, { translation: Record<string, unknown> }>;
  const extra = uiResources();
  const out: Record<string, { translation: Record<string, unknown> }> = {};

  for (const code of LOCALE_CODES) {
    out[code] = {
      translation: { ...(base[code]?.translation ?? {}), ...(extra[code]?.translation ?? {}) },
    };
  }
  return out;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: mergedResources(),
    fallbackLng: 'en',
    supportedLngs: LOCALE_CODES,
    // A language we have only partly translated shows English for the rest
    // rather than the raw key.
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'irctc-ri:locale',
      caches: ['localStorage'],
    },
  });

export function currentLocale(): Locale {
  const lng = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
  return (LOCALE_CODES.includes(lng as Locale) ? lng : 'en') as Locale;
}

export async function setLocale(locale: Locale): Promise<void> {
  await i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  // Urdu is right-to-left; the whole layout mirrors with it.
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
}

/**
 * Render a data-side language map. This is what makes a train or station name
 * switch language along with the UI, with no reload. Anything not yet
 * translated falls back to English rather than showing an empty string.
 */
export function localized(value: LocalizedText | string | undefined, locale?: Locale): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const l = locale ?? currentLocale();
  return value[l] || value.en || '';
}

export default i18n;

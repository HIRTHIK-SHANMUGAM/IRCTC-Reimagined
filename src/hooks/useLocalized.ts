import { useTranslation } from 'react-i18next';
import type { Locale, LocalizedText } from '@/types';
import { localized } from '@/i18n';

/** Renders language maps from the data layer against the active UI language. */
export function useLocalized(): {
  locale: Locale;
  L: (value: LocalizedText | string | undefined) => string;
} {
  const { i18n } = useTranslation();
  const locale = ((i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0] || 'en') as Locale;
  return { locale, L: (value) => localized(value, locale) };
}

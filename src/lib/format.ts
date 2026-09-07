import type { Locale } from '@/types';

export function rupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function timeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/** BCP-47 tags for date formatting. Rajasthani has no CLDR data, so it
 *  borrows Hindi's, which is the script it is written in. */
const DATE_LOCALE: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  or: 'or-IN',
  ur: 'ur-IN',
  raj: 'hi-IN',
};

export function formatDate(dateISO: string, locale: Locale = 'en'): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString(DATE_LOCALE[locale] ?? 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateLong(dateISO: string, locale: Locale = 'en'): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString(DATE_LOCALE[locale] ?? 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(dateISO: string): number {
  const target = new Date(`${dateISO}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** "in 3 days" / "tomorrow" / "today" — relative language beats a bare date. */
export function relativeDay(dateISO: string): string {
  const d = daysBetween(dateISO);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1 && d < 7) return `In ${d} days`;
  if (d < -1) return `${Math.abs(d)} days ago`;
  return formatDate(dateISO);
}

/** Add a day offset to an arrival time when the train runs past midnight. */
export function arrivalNote(departure: string, durationMinutes: number): string {
  const [h, m] = departure.split(':').map(Number);
  const days = Math.floor((h * 60 + m + durationMinutes) / 1440);
  return days > 0 ? `+${days}` : '';
}

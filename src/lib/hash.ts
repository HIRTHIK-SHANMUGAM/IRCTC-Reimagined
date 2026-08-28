/**
 * Tokenise an Aadhaar number. A raw number is never persisted or displayed —
 * only this reference (master prompt §6). Salted so the token is not a bare
 * digest of a 12-digit space.
 */
const SALT = 'irctc-ri:aadhaar:v1';

export async function aadhaarRef(raw: string): Promise<string> {
  const digits = raw.replace(/\D/g, '');
  const data = new TextEncoder().encode(`${SALT}|${digits}`);
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `aad_${hex.slice(0, 24)}`;
  }
  // Non-secure contexts only; still never stores the raw number.
  let h = 2166136261;
  for (let i = 0; i < data.length; i++) {
    h ^= data[i];
    h = Math.imul(h, 16777619);
  }
  return `aad_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/** Display form — last four digits only, the rest masked. */
export function maskAadhaar(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `•••• •••• ${digits.slice(-4)}`;
}

export function randomId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** PNR is a backend marker, not user memory (§6). Ten digits, like the real thing. */
export function generatePnr(): string {
  let out = '';
  for (let i = 0; i < 10; i++) out += Math.floor(Math.random() * 10);
  return out;
}

/**
 * Groq client. Runs ONLY inside Cloud Functions — the key is read from the
 * functions runtime environment and never reaches the browser (master prompt §2).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Every configured key, in the order they should be tried (addendum §4.4).
 *
 * Reads, in order:
 *   GROQ_API_KEYS   — comma-separated, the easiest way to add more
 *   GROQ_API_KEY_1..GROQ_API_KEY_5
 *   GROQ_API_KEY / GROQ_KEY — the original single-key names
 *
 * Adding another key is therefore a config change, never a code change.
 */
export function groqKeys(): string[] {
  const keys: string[] = [];
  const push = (v?: string) => {
    for (const k of (v ?? '').split(',').map((x) => x.trim())) {
      if (k && !keys.includes(k)) keys.push(k);
    }
  };

  push(process.env.GROQ_API_KEYS);
  for (let i = 1; i <= 5; i++) push(process.env[`GROQ_API_KEY_${i}`]);
  push(process.env.GROQ_API_KEY);
  push(process.env.GROQ_KEY);
  return keys;
}

export function groqKey(): string | undefined {
  return groqKeys()[0];
}

/** Auth and rate-limit failures are worth retrying on the next key. */
function shouldRotate(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return /Groq (401|403|429)/.test(m);
}

export function groqModel(): string {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Calls Groq, rotating to the next configured key when one is rejected or
 * rate-limited. Exhausting every key throws, and the caller falls through to
 * the deterministic engine.
 */
export async function callGroq(
  messages: GroqMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const keys = groqKeys();
  if (keys.length === 0) throw new Error('GROQ_API_KEY is not set');

  let lastError: unknown;
  for (let i = 0; i < keys.length; i++) {
    try {
      return await callGroqWithKey(keys[i], messages, opts);
    } catch (err) {
      lastError = err;
      // A timeout or a network fault is not a key problem — stop rotating.
      if (!shouldRotate(err) || i === keys.length - 1) throw err;
      console.warn(`Groq key ${i + 1}/${keys.length} rejected; trying the next one.`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Groq call failed');
}

async function callGroqWithKey(
  key: string,
  messages: GroqMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const controller = new AbortController();
  // Tatkal must feel instant; a slow model call falls back rather than blocking.
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModel(),
        messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens ?? 700,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timeout);
  }
}

/** Models wrap JSON in prose or fences often enough that this must be defensive. */
export function parseJsonLoose<T>(raw: string): T | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Groq client. Runs ONLY inside Cloud Functions — the key is read from the
 * functions runtime environment and never reaches the browser (master prompt §2).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function groqKey(): string | undefined {
  // functions/.env, or `firebase functions:config:set groq.key="..."`.
  return process.env.GROQ_API_KEY || process.env.GROQ_KEY;
}

export function groqModel(): string {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callGroq(
  messages: GroqMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const key = groqKey();
  if (!key) throw new Error('GROQ_API_KEY is not set');

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

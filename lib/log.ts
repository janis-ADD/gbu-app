/**
 * Whitelist-basierter Safe-Logger (gemäß DSGVO-/MVP-Sicherheitskonzept §6).
 * Nur folgende Keys werden geloggt — alles andere wird verworfen.
 * Insbesondere niemals: E-Mails, Passwörter, Prompts, Outputs, PII.
 */
const SAFE_KEYS = new Set([
  'action',
  'code',
  'request_id',
  'user_id',
  'tenant_id',
  'assessment_id',
  'duration_ms',
  'status',
  'http_code',
  'stage',
  'provider',
  'model',
  'confidence',
  'blocked_reason'
]);

export type SafeFields = Partial<Record<typeof SAFE_KEYS extends Set<infer K> ? K : never, string | number>>;

function strip(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SAFE_KEYS.has(k)) out[k] = v;
  }
  return out;
}

type Level = 'info' | 'warn' | 'error';

export function logSafe(
  action: string,
  fields: Record<string, unknown> = {},
  level: Level = 'info'
): void {
  const payload = {
    ts: new Date().toISOString(),
    action,
    ...strip(fields)
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Zentraler Env-Reader.
 *
 * Sicherheitsregel (Phase 2 §13 S9): Variablen ohne NEXT_PUBLIC_-Präfix
 * dürfen NIEMALS aus Client-Komponenten gelesen werden. Dieser Wrapper
 * ist server-only — der Import aus einer "use client"-Datei führt zu
 * einem Build-Fehler (geprüft via "next" Linting in CI, Phase 3 Schritt 8).
 *
 * Im Phase-3-Skelett liefern wir nur die Reader — Validation per zod
 * folgt mit Auth-Setup (Schritt 2).
 */

const required = (key: string, val: string | undefined): string => {
  if (!val) {
    throw new Error(
      `[env] Fehlende Pflicht-Variable: ${key}. ` +
        `In web/.env.local setzen (Vorlage: .env.example).`
    );
  }
  return val;
};

export const env = {
  // Public (im Client erlaubt)
  supabaseUrl: () =>
    required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),

  // Server-only
  supabaseServiceRoleKey: () =>
    required(
      'SUPABASE_SERVICE_ROLE_KEY',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  anthropicApiKey: () =>
    required('ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY),
  anthropicModel: () => process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7',
  anthropicModelFallback: () =>
    process.env.ANTHROPIC_MODEL_FALLBACK ?? 'claude-sonnet-4-6',

  // Feature-Flag
  moduleEnabled: () => process.env.RA_MODULE_ENABLED !== 'false'
};

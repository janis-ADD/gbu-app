/**
 * Default-Titel-Logik für Beurteilungen.
 *
 * ─── Doktrin ─────────────────────────────────────────────────────────
 * Eine Beurteilung darf NIE generisch heißen („Büroarbeitsplätze").
 * Sie braucht eine Identität, damit der Geschäftsführer auch bei 25
 * Beurteilungen in 5 Mappen weiß, welche welche ist.
 *
 * Format: `{scope.title} · {company_name}`
 *
 * Beispiele:
 *   - „Büroarbeitsplätze · Schmidt GmbH"
 *   - „Lager & Materialhandling · NordLogistik"
 *   - „Gebäudereinigung · Sauber24"
 *
 * Verboten:
 *   ❌ „Standardvorlage", „Template", „Default"
 *   ❌ Scope-Name alleine („Büroarbeitsplätze")
 */

const SEPARATOR = ' · ';
const MAX_TITLE = 80; // entspricht DB-Constraint + TitleEditSchema

/**
 * Baut den Default-Titel für eine neu angelegte Beurteilung.
 *
 * Wenn der Firmenname fehlt oder leer ist, fällt das System defensiv
 * auf den Scope-Titel zurück (statt einen kaputten Titel zu erzeugen).
 * Der Nutzer wird in Schritt 1 ohnehin aufgefordert, einen sprechenden
 * Namen zu vergeben.
 *
 * Lange Firmennamen werden so gekürzt, dass das Gesamtergebnis das
 * 80-Zeichen-Limit nicht reißt. Beim Kürzen wird das letzte Wort sauber
 * abgeschnitten (keine "…", weil das HTML-Pattern/Sanitizer es ablehnen
 * würde).
 */
export function buildDefaultGbuTitle(
  scopeTitle: string,
  companyName: string | null | undefined
): string {
  const company = (companyName ?? '').trim();
  if (!company) return scopeTitle;

  const full = `${scopeTitle}${SEPARATOR}${company}`;
  if (full.length <= MAX_TITLE) return full;

  // Platz für den Firmennamen nach Abzug von Scope-Titel und Separator
  const room = MAX_TITLE - scopeTitle.length - SEPARATOR.length;
  // Wenn nicht mal 4 Zeichen Platz sind, lassen wir den Firmenteil weg.
  if (room < 4) return scopeTitle;

  // Sauber an einer Wortgrenze kürzen
  const trimmed = company.slice(0, room);
  const lastSpace = trimmed.lastIndexOf(' ');
  const cut = lastSpace > 3 ? trimmed.slice(0, lastSpace) : trimmed;
  return `${scopeTitle}${SEPARATOR}${cut.trim()}`;
}

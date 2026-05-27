/**
 * Tätigkeits-Scopes für GBUs.
 *
 * Eine GBU bezieht sich IMMER auf einen klar abgegrenzten Tätigkeitsbereich
 * (gem. ArbSchG §5 — tätigkeitsbezogene Beurteilung). Pro Bundle gibt es
 * mehrere GBUs, jede mit einem eigenen Scope.
 *
 * Scopes sind:
 *  - "Bereiche" wie buero/lager/baustelle/werkstatt/aussendienst
 *  - "Quer-Themen" wie leitern-tritte/gefahrstoffe/psa/fahrzeuge
 *
 * Branche → Default-Scope-Set: was eine GBU-Mappe für diese Branche
 * typischerweise enthalten muss. Begründungen werden im UI gezeigt
 * (transparente Herleitung, keine Blackbox).
 */

export type Scope = {
  slug: string;
  title: string;
  icon: string;
  /** Kategorie für UI-Gruppierung */
  kind: 'bereich' | 'querthema';
  /** kurze Begründung, warum diese GBU für die Branche typisch ist */
  rationale: string;
  /** Default-Risiko-Slugs aus ra_risk_catalog */
  default_risk_slugs: string[];
};

export const SCOPES: Scope[] = [
  // ─── Räumliche Bereiche ──────────────────────────────────────────────
  { slug: 'buero',     title: 'Büroarbeitsplätze',         icon: '🏢', kind: 'bereich',
    rationale: 'Bildschirmarbeit, Ergonomie, Stolperstellen — gilt für nahezu jeden Betrieb.',
    default_risk_slugs: ['buero-bildschirm','brand-fluchtwege','erste-hilfe','elektrische-betriebsmittel'] },
  { slug: 'lager',     title: 'Lager & Materialhandling',  icon: '🚚', kind: 'bereich',
    rationale: 'Regalsysteme, Flurförderzeuge, Lasten, ggf. Gefahrstofflager.',
    default_risk_slugs: ['manuelles-heben-tragen','elektrische-betriebsmittel','brand-fluchtwege','leitern-tritte'] },
  { slug: 'baustelle', title: 'Baustellen',                icon: '🛠️', kind: 'bereich',
    rationale: 'Wechselnde Einsatzorte, Fremdfirmen, Absturz, Verkehrswege.',
    default_risk_slugs: ['leitern-tritte','elektrische-betriebsmittel','fremdfirmen','psa-schutzausruestung','laerm-staub-daempfe'] },
  { slug: 'werkstatt', title: 'Werkstatt / Maschinen',     icon: '🏭', kind: 'bereich',
    rationale: 'Handgeführte Geräte, ggf. CNC, Absauganlagen, Lärm/Staub.',
    default_risk_slugs: ['elektrische-betriebsmittel','laerm-staub-daempfe','psa-schutzausruestung','manuelles-heben-tragen'] },
  { slug: 'aussendienst', title: 'Außendienst / Kundeneinsatz', icon: '👷', kind: 'bereich',
    rationale: 'Alleinarbeit, wechselnde Bedingungen, Verkehr.',
    default_risk_slugs: ['alleinarbeit','transport-fahrzeuge','psychische-belastung'] },

  // ─── Quer-Themen (werden oft als eigene GBU geführt) ─────────────────
  { slug: 'gefahrstoffe',  title: 'Umgang mit Gefahrstoffen', icon: '🧪', kind: 'querthema',
    rationale: 'Farben, Lacke, Verdünner, Reinigungsmittel — Pflicht bei jeder Verarbeitung.',
    default_risk_slugs: ['gefahrstoffe','reinigungsmittel-chemikalien','laerm-staub-daempfe','psa-schutzausruestung'] },
  { slug: 'leitern-tritte', title: 'Leitern & Tritte',         icon: '🪜', kind: 'querthema',
    rationale: 'Eigene Beurteilung empfohlen wenn häufige Nutzung (Maler, Bau, Lager).',
    default_risk_slugs: ['leitern-tritte','psa-schutzausruestung'] },
  { slug: 'fahrzeuge',     title: 'Fahrzeuge & Transport',    icon: '🚐', kind: 'querthema',
    rationale: 'Firmenfahrzeuge, Ladungssicherung, Führerscheinkontrolle.',
    default_risk_slugs: ['transport-fahrzeuge','manuelles-heben-tragen'] },
  { slug: 'psa',           title: 'PSA-Konzept',              icon: '🦺', kind: 'querthema',
    rationale: 'Eigene Beurteilung der PSA-Bedarfe pro Tätigkeit.',
    default_risk_slugs: ['psa-schutzausruestung'] },
  { slug: 'psychische-belastung', title: 'Psychische Belastung', icon: '🧠', kind: 'querthema',
    rationale: 'Seit 2013 Pflicht: §5 ArbSchG nennt psychische Belastungen explizit.',
    default_risk_slugs: ['psychische-belastung'] },

  /* ─── Generischer Slot für eigene Arbeitsbereiche ────────────────────
   * scope_slug = 'eigener' wird zusammen mit einem User-definierten
   * `gbu.title` verwendet. Der Wizard zeigt alle Dimensionen, keine
   * Defaults — der User füllt frei. Die Engine arbeitet damit normal.
   */
  { slug: 'eigener', title: 'Eigener Arbeitsbereich', icon: '✏️', kind: 'bereich',
    rationale: 'Frei benannter Bereich (z. B. „Außendienst Ostsachsen", „Sanitärmontage"). Alle Tätigkeits-Dimensionen werden abgefragt.',
    default_risk_slugs: [] }
];

/**
 * Branche → typische Default-Scopes (für GBU-Skelett beim Bundle-Anlegen).
 * Jeder Eintrag mit kurzer Begründung — wird im UI sichtbar gemacht.
 */
type ScopeSuggestion = { slug: string; reason: string };
type IndustryScopes = Record<string, ScopeSuggestion[]>;

export const INDUSTRY_SCOPES: IndustryScopes = {
  maler: [
    { slug: 'buero',           reason: 'kleines Büro / Verwaltung im Malerbetrieb typisch' },
    { slug: 'lager',           reason: 'Lager für Farben, Lacke, Werkzeuge' },
    { slug: 'baustelle',       reason: 'Hauptarbeitsplatz Maler ist die Baustelle' },
    { slug: 'gefahrstoffe',    reason: 'Verarbeitung von Lacken/Lösungsmitteln Pflicht' },
    { slug: 'leitern-tritte',  reason: 'tägliche Nutzung von Leitern/Tritten' },
    { slug: 'fahrzeuge',       reason: 'Materialtransport zu wechselnden Baustellen' },
    { slug: 'psa',             reason: 'PSA-Konzept für Spritzarbeiten, Lärm, Staub' }
  ],
  bau: [
    { slug: 'buero',           reason: 'Baubetriebs-Verwaltung' },
    { slug: 'lager',           reason: 'Baustofflager' },
    { slug: 'baustelle',       reason: 'Hauptarbeitsplatz' },
    { slug: 'leitern-tritte',  reason: 'Höhenarbeiten' },
    { slug: 'fahrzeuge',       reason: 'Materialtransport, Baumaschinen' },
    { slug: 'gefahrstoffe',    reason: 'Mörtel, Klebstoffe, Lösemittel' },
    { slug: 'psa',             reason: 'Helm, Schuhe, Gehörschutz' }
  ],
  metall: [
    { slug: 'buero',     reason: 'Verwaltung' },
    { slug: 'werkstatt', reason: 'Holz- oder Metallverarbeitung' },
    { slug: 'lager',     reason: 'Material- und Fertigteillager' },
    { slug: 'gefahrstoffe', reason: 'Lacke, Klebstoffe, Kühlschmiermittel' },
    { slug: 'psa',       reason: 'Schutzbrille, Gehörschutz, Schnittschutz' }
  ],
  logistik: [
    { slug: 'buero',         reason: 'Disposition / Verwaltung' },
    { slug: 'lager',         reason: 'Kernbereich Logistik' },
    { slug: 'fahrzeuge',     reason: 'LKW / Transporter / Stapler' },
    { slug: 'aussendienst',  reason: 'Fahrertätigkeit, ggf. Alleinarbeit' }
  ],
  gastro: [
    { slug: 'buero',     reason: 'Verwaltung / Reservierung' },
    { slug: 'werkstatt', reason: 'Küche (Schneidewerkzeuge, Heißarbeit)' },
    { slug: 'lager',     reason: 'Lebensmittel- / Getränkelager' },
    { slug: 'gefahrstoffe', reason: 'Reinigungschemie, Spülmittel' }
  ],
  buero: [
    { slug: 'buero',              reason: 'Hauptarbeitsplatz' },
    { slug: 'psychische-belastung', reason: 'Bildschirmarbeit, Stressbelastung' }
  ],
  pflege: [
    { slug: 'buero',         reason: 'Verwaltung' },
    { slug: 'aussendienst',  reason: 'Pflege beim Klienten' },
    { slug: 'gefahrstoffe',  reason: 'Desinfektion, Medikamente' },
    { slug: 'psychische-belastung', reason: 'Pflegebelastung, Schicht' },
    { slug: 'psa',           reason: 'Handschuhe, Mund-Nasen-Schutz' }
  ],
  // Mischbetrieb: sinnvolles Grund-Set
  other: [
    { slug: 'buero',         reason: 'in nahezu jedem Betrieb vorhanden' },
    { slug: 'lager',         reason: 'Materiallager / Versand' },
    { slug: 'psychische-belastung', reason: 'seit 2013 Pflicht, ArbSchG §5' }
  ]
};

export function getScope(slug: string): Scope | undefined {
  return SCOPES.find((s) => s.slug === slug);
}

export function suggestScopesForIndustry(industry: string | undefined): ScopeSuggestion[] {
  if (!industry) return INDUSTRY_SCOPES.other!;
  return INDUSTRY_SCOPES[industry] ?? INDUSTRY_SCOPES.other!;
}

/**
 * Branchen-Fixtures — realistische Tag-Profile + erwartete Engine-Ableitung.
 *
 * v3 (Compliance Quality Sprint Iter 2, Migration 0014):
 *   - Neue Risiken: `laerm-exposition`, `verkehrswege-lager`,
 *     `homeoffice-ergonomie` (Test-Fixture spiegelt Production)
 *   - Neue Pflicht-Maßnahmen mit ArbMed-Vorsorge: `vorsorge-g20-laerm`,
 *     `vorsorge-g24-haut`, `verkehrswege-trennung-stapler`,
 *     `homeoffice-beurteilung`
 *   - Neue Plausibility-Warnings: aussenarbeit-uv, homeoffice-beurteilung,
 *     staub-arbeitsmedizinische-vorsorge, isocyanate-fachkunde,
 *     verkehrswege-trennung-pruefen
 *
 * Erwartungen pro Branche unten frisch durchgerechnet, weil das Triggern
 * neuer Risiken in vielen Fixtures Ketten-Effekte hat.
 */

import type { ActivityTags } from '@/lib/wizard/activities';

export type IndustryFixture = {
  slug: string;
  name: string;
  description: string;
  input_tags: ActivityTags;
  user_selected_risk_slugs?: string[];
  acknowledgements?: Record<string, { confirmed: boolean; note?: string }>;
  expected_risks: string[];
  expected_mandatory_measures: string[];
  expected_missing_controls: string[];
  expected_plausibility?: string[];
  expected_summary: {
    n_risks: number;
    n_mandatory_measures: number;
    n_missing_controls: number;
  };
};

/* ─── 1. Malerbetrieb ─────────────────────────────────────────────────
 * Fassade + Innenanstrich + Schleifen + Lacke.
 * Triggert in v3 zusätzlich:
 *   - laerm-exposition (tools=handgefuehrt)
 *   - hautkontakt-reizstoffe (farben_lacke)
 *
 * Plausibility v3:
 *   - aussenarbeit-uv-witterung-pruefen (mobility=baustelle + aussen)
 *   - staub-arbeitsmedizinische-vorsorge (staub_schleifen)
 *   - isocyanate-fachkunde-pruefen (farben_lacke + innen)
 */
export const malerFixture: IndustryFixture = {
  slug: 'maler',
  name: 'Malerbetrieb',
  description: 'Innen-/Außenanstrich, Fassadenarbeit mit Leitern, Schleifen vor Anstrich.',
  input_tags: {
    work_height: 'fassade-dach',
    mobility: 'baustelle',
    environment: ['innen', 'aussen', 'kunde'],
    tools: ['leitern', 'handgefuehrt'],
    hazardous_substances: ['farben_lacke', 'staub_schleifen'],
    workforce: [],
    psychological: []
  },
  expected_risks: [
    'absturz',
    'gefahrstoff-loesemittel',
    'staubexposition',
    'handwerkzeug-schnittverletzung',
    'hautkontakt-reizstoffe',
    'laerm-exposition'
  ],
  expected_mandatory_measures: [
    'psa-bereitstellen',
    'sdb-verfuegbar',
    'gefahrstoffverzeichnis',
    'atemschutz-bei-staub',
    'hautschutzplan',
    'vorsorge-g20-laerm',
    'vorsorge-g24-haut'
  ],
  expected_missing_controls: [],
  expected_plausibility: [
    'aussenarbeit-uv-witterung-pruefen',
    'staub-arbeitsmedizinische-vorsorge',
    'isocyanate-fachkunde-pruefen'
  ],
  expected_summary: { n_risks: 6, n_mandatory_measures: 7, n_missing_controls: 0 }
};

/* ─── 2. Gebäudereinigung ─────────────────────────────────────────────
 * Reinigung in Kundenobjekten, Reinigungschemie, Alleinarbeit, Zeitdruck.
 * v3: + hautkontakt → +vorsorge-g24-haut Pflicht
 *     + reinigungschemie-kontext-unklar bleibt (kein werkstatt/kunde-Match)
 *     Hinweis: environment=['kunde','innen'] enthält 'kunde' → kontext-unklar
 *     triggert NICHT (workforce=alleinarbeit OR environment=werkstatt/kunde).
 *     Bedingung: `!workforce.includes('alleinarbeit')` → workforce HAT
 *     alleinarbeit → Warning kommt NICHT.
 */
export const gebaeudereinigungFixture: IndustryFixture = {
  slug: 'gebaeudereinigung',
  name: 'Gebäudereinigung',
  description: 'Mobile Unterhaltsreinigung in Kundenobjekten, Reinigungschemie, Alleinarbeit.',
  input_tags: {
    work_height: 'bis-2m',
    mobility: 'aussendienst',
    environment: ['kunde', 'innen'],
    tools: ['handgefuehrt'],
    hazardous_substances: ['reinigung'],
    workforce: ['alleinarbeit'],
    psychological: ['zeitdruck']
  },
  expected_risks: [
    'gefahrstoff-loesemittel',
    'handwerkzeug-schnittverletzung',
    'alleinarbeit-notfall',
    'psychische-belastung-zeitdruck',
    'hautkontakt-reizstoffe',
    'laerm-exposition'
  ],
  expected_mandatory_measures: [
    'sdb-verfuegbar',
    'gefahrstoffverzeichnis',
    'alleinarbeit-erreichbar',
    'hautschutzplan',
    'vorsorge-g24-haut',
    'vorsorge-g20-laerm'
  ],
  expected_missing_controls: [],
  expected_summary: { n_risks: 6, n_mandatory_measures: 6, n_missing_controls: 0 }
};

/* ─── 3. Büro ─────────────────────────────────────────────────────────
 * Bildschirmarbeit im Innenraum, Zeitdruck.
 * v3: Bildschirm-Trigger erzeugt jetzt KEIN homeoffice-ergonomie (kein
 *     environment=homeoffice), aber bewegungsmangel-buero ist Production-
 *     spezifisch → Test-Fixture hat das nicht.
 *     bildschirm-ohne-innenraum triggert nicht (environment=innen).
 */
export const bueroFixture: IndustryFixture = {
  slug: 'buero',
  name: 'Büro',
  description: 'Reine Bildschirmarbeit, Innenraum, kein Außendienst.',
  input_tags: {
    mobility: 'stationaer',
    environment: ['innen'],
    tools: ['bildschirm'],
    hazardous_substances: ['keine'],
    workforce: [],
    psychological: ['zeitdruck']
  },
  expected_risks: ['bildschirmbelastung', 'psychische-belastung-zeitdruck'],
  expected_mandatory_measures: [],
  expected_missing_controls: [],
  expected_summary: { n_risks: 2, n_mandatory_measures: 0, n_missing_controls: 0 }
};

/* ─── 4. Lager ────────────────────────────────────────────────────────
 * Stapler-Betrieb in Lagerhalle, Schichtbetrieb.
 * v3: + laerm-exposition (flurfoerderzeuge + handgefuehrt + lager)
 *     + verkehrswege-lager (flurfoerderzeuge + lager)
 *     + Pflicht-Maßnahmen: vorsorge-g20-laerm, verkehrswege-trennung-stapler
 *     + Plausibility: verkehrswege-trennung-pruefen
 */
export const lagerFixture: IndustryFixture = {
  slug: 'lager',
  name: 'Lager / Logistik-Hub',
  description: 'Stapler-Einsatz in Lagerhalle, Schichtbetrieb möglich.',
  input_tags: {
    mobility: 'stationaer',
    environment: ['lager'],
    tools: ['flurfoerderzeuge', 'handgefuehrt'],
    hazardous_substances: ['keine'],
    workforce: ['schichtarbeit'],
    psychological: []
  },
  expected_risks: [
    'flurfoerderzeug-unfall',
    'handwerkzeug-schnittverletzung',
    'laerm-exposition',
    'verkehrswege-lager'
  ],
  expected_mandatory_measures: [
    'unterweisung-stapler',
    'vorsorge-g20-laerm',
    'verkehrswege-trennung-stapler'
  ],
  expected_missing_controls: [],
  expected_plausibility: [
    'schichtarbeit-ohne-belastungsanalyse',
    'verkehrswege-trennung-pruefen'
  ],
  expected_summary: { n_risks: 4, n_mandatory_measures: 3, n_missing_controls: 0 }
};

/* ─── 5. Elektriker ───────────────────────────────────────────────────
 * Baustellen, Höhenarbeit, Handwerkzeug. Keine Gefahrstoffe.
 * v3: + laerm-exposition (handgefuehrt) — Werkstatt-/Baustelle-Match
 *     fehlt im environment, ABER tools=handgefuehrt matched die
 *     tools-Bedingung allein.
 */
export const elektrikerFixture: IndustryFixture = {
  slug: 'elektriker',
  name: 'Elektrikerbetrieb',
  description: 'Wechselnde Baustellen, Installation/Reparatur, Höhenarbeit mit Leitern.',
  input_tags: {
    work_height: 'ueber-2m',
    mobility: 'baustelle',
    environment: ['kunde', 'innen', 'aussen'],
    tools: ['leitern', 'handgefuehrt'],
    hazardous_substances: ['keine'],
    workforce: [],
    psychological: []
  },
  expected_risks: [
    'absturz',
    'handwerkzeug-schnittverletzung',
    'laerm-exposition'
  ],
  expected_mandatory_measures: [
    'psa-bereitstellen',
    'vorsorge-g20-laerm'
  ],
  expected_missing_controls: [],
  expected_plausibility: ['aussenarbeit-uv-witterung-pruefen'],
  expected_summary: { n_risks: 3, n_mandatory_measures: 2, n_missing_controls: 0 }
};

/* ─── 6. Logistik (LKW-Fahrer) ────────────────────────────────────────
 * mobility=fahrzeuge → fahrzeuge-ohne-belastungsdoku triggert NICHT
 * (psychological=zeitdruck ist gesetzt). Hingegen triggert
 * laerm-exposition NICHT, weil environment=['kunde'] und tools=['fahrzeuge']
 * — der Trigger für laerm-exposition braucht tools cnc/handgefuehrt/
 * flurfoerderzeuge ODER environment werkstatt/baustelle/lager.
 */
export const logistikFixture: IndustryFixture = {
  slug: 'logistik',
  name: 'Logistik / Auslieferung',
  description: 'LKW-Tour, Alleinarbeit auf der Strecke, Kunde-Anlieferung.',
  input_tags: {
    mobility: 'fahrzeuge',
    environment: ['kunde'],
    tools: ['fahrzeuge'],
    hazardous_substances: ['keine'],
    workforce: ['alleinarbeit'],
    psychological: ['zeitdruck']
  },
  expected_risks: ['alleinarbeit-notfall', 'psychische-belastung-zeitdruck'],
  expected_mandatory_measures: ['alleinarbeit-erreichbar'],
  expected_missing_controls: [],
  expected_summary: { n_risks: 2, n_mandatory_measures: 1, n_missing_controls: 0 }
};

/* ─── 7. Zahnarztpraxis ───────────────────────────────────────────────
 * Bildschirm + Reinigungsmittel + Kundenkontakt + emotionale Belastung.
 * v3: + hautkontakt-reizstoffe + vorsorge-g24-haut (wie v2)
 *     + reinigungschemie-kontext-unklar (environment=innen, kein
 *       alleinarbeit, kein werkstatt/kunde)
 */
export const zahnarztFixture: IndustryFixture = {
  slug: 'zahnarzt',
  name: 'Zahnarztpraxis',
  description: 'Behandlung, Verwaltung am Bildschirm, Reinigungsmittel, Kundenkontakt.',
  input_tags: {
    mobility: 'stationaer',
    environment: ['innen'],
    tools: ['bildschirm', 'handgefuehrt'],
    hazardous_substances: ['reinigung'],
    workforce: ['kundenkontakt'],
    psychological: ['emotionale_belastung', 'verantwortung_personen']
  },
  expected_risks: [
    'gefahrstoff-loesemittel',
    'bildschirmbelastung',
    'psychische-belastung-zeitdruck',
    'handwerkzeug-schnittverletzung',
    'hautkontakt-reizstoffe',
    'laerm-exposition'
  ],
  expected_mandatory_measures: [
    'sdb-verfuegbar',
    'gefahrstoffverzeichnis',
    'hautschutzplan',
    'vorsorge-g24-haut',
    'vorsorge-g20-laerm'
  ],
  expected_missing_controls: [],
  expected_plausibility: ['reinigungschemie-kontext-unklar'],
  expected_summary: { n_risks: 6, n_mandatory_measures: 5, n_missing_controls: 0 }
};

export const ALL_INDUSTRY_FIXTURES: IndustryFixture[] = [
  malerFixture,
  gebaeudereinigungFixture,
  bueroFixture,
  lagerFixture,
  elektrikerFixture,
  logistikFixture,
  zahnarztFixture
];

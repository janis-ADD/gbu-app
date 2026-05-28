/**
 * Tätigkeitsdimensionen (strukturierte Tags) — Fundament der Ableitungs-Engine.
 *
 * Eine GBU wird NICHT mehr aus „Branche → Scope → Risiken" abgeleitet,
 * sondern aus konkreten Tätigkeitsmerkmalen. Die Tags hier sind die
 * einzigen erlaubten Werte — keine Freitext-Vermutung.
 *
 * Siehe Memory: taetigkeits-engine-doktrin.md
 */

/* ─── Dimension-Definitionen ─────────────────────────────────────────── */

export const WORK_HEIGHTS = [
  { value: 'keine',       label: 'Keine Höhenarbeit',       short: '0 m' },
  { value: 'bis-2m',      label: 'Bis 2 m (Tritt/Leiter)',  short: '≤ 2 m' },
  { value: 'ueber-2m',    label: 'Über 2 m (Leiter/Gerüst)',short: '> 2 m' },
  { value: 'fassade-dach',label: 'Fassade / Dach',           short: 'Fassade' }
] as const;
export type WorkHeight = (typeof WORK_HEIGHTS)[number]['value'];

export const MOBILITY = [
  { value: 'stationaer',  label: 'Stationär (eigener Betrieb)' },
  { value: 'baustelle',   label: 'Wechselnde Baustellen' },
  { value: 'aussendienst',label: 'Außendienst / Kundenort' },
  { value: 'fahrzeuge',   label: 'Mit Firmenfahrzeugen' }
] as const;
export type Mobility = (typeof MOBILITY)[number]['value'];

export const ENVIRONMENTS = [
  { value: 'innen',       label: 'Innenraum' },
  { value: 'aussen',      label: 'Außenbereich' },
  { value: 'kunde',       label: 'Kundenobjekt' },
  { value: 'homeoffice',  label: 'Homeoffice' },
  { value: 'werkstatt',   label: 'Werkstatt' },
  { value: 'lager',       label: 'Lager' }
] as const;
export type Environment = (typeof ENVIRONMENTS)[number]['value'];

export const TOOLS = [
  { value: 'handgefuehrt',     label: 'Handgeführte Geräte (Bohrer, Schleifer)' },
  { value: 'cnc',              label: 'Stationäre Maschinen / CNC' },
  { value: 'leitern',          label: 'Leitern / Tritte' },
  { value: 'geruest',          label: 'Gerüste' },
  { value: 'flurfoerderzeuge', label: 'Flurförderzeuge (Stapler etc.)' },
  { value: 'fahrzeuge',        label: 'Kraftfahrzeuge' },
  { value: 'bildschirm',       label: 'Bildschirmarbeitsplatz' }
] as const;
export type Tool = (typeof TOOLS)[number]['value'];

export const HAZARDOUS_SUBSTANCES = [
  { value: 'keine',           label: 'Keine Gefahrstoffe' },
  { value: 'farben_lacke',    label: 'Farben / Lacke / Lösemittel' },
  { value: 'reinigung',       label: 'Reinigungschemie' },
  { value: 'schmierstoffe',   label: 'Schmierstoffe / Öle' },
  { value: 'staub_schleifen', label: 'Staub aus Schleifen/Bohren' },
  { value: 'kuehlmittel',     label: 'Kühl-/Schneidmittel' }
] as const;
export type HazardousSubstance = (typeof HAZARDOUS_SUBSTANCES)[number]['value'];

export const WORKFORCE = [
  { value: 'azubis',          label: 'Auszubildende / Jugendliche' },
  { value: 'fremdfirmen',     label: 'Fremdfirmen vor Ort' },
  { value: 'leiharbeit',      label: 'Leiharbeit' },
  { value: 'alleinarbeit',    label: 'Alleinarbeit' },
  { value: 'schichtarbeit',   label: 'Schicht- / Nachtarbeit' },
  { value: 'kundenkontakt',   label: 'Kundenkontakt (Publikum)' }
] as const;
export type Workforce = (typeof WORKFORCE)[number]['value'];

export const PSYCHOLOGICAL = [
  { value: 'keine',                   label: 'Keine besondere Belastung' },
  { value: 'zeitdruck',               label: 'Hoher Zeitdruck' },
  { value: 'emotionale_belastung',    label: 'Emotionale Belastung (z. B. Pflege)' },
  { value: 'monotone',                label: 'Monotone Tätigkeiten' },
  { value: 'verantwortung_personen',  label: 'Verantwortung für andere Personen' }
] as const;
export type Psychological = (typeof PSYCHOLOGICAL)[number]['value'];

/* ─── Iteration 3 — Kontext-Dimensionen ─────────────────────────────────
 * Diese drei Dimensionen sind ADDITIV. Wenn sie nicht gesetzt sind,
 * verhält sich die Engine wie in Iteration 2 (likelihood-Multiplier = 1.0).
 *
 * Sie ermöglichen der Engine, zwischen z. B. „Maler streicht 3× pro Jahr
 * ein WC" und „Maler ist täglich auf Fassade mit 2K-Lack" zu unterscheiden.
 */

export const INTENSITIES = [
  { value: 'gelegentlich', label: 'Gelegentlich (weniger als 1× pro Woche)',  short: '< 1/W' },
  { value: 'regelmaessig', label: 'Regelmäßig (mehrmals pro Woche)',          short: 'mehrm./W' },
  { value: 'taeglich',     label: 'Täglich',                                  short: 'täglich' },
  { value: 'dauerhaft',    label: 'Dauerhaft (mehr als 50 % der Arbeitszeit)',short: 'dauerhaft' }
] as const;
export type Intensity = (typeof INTENSITIES)[number]['value'];

export const EXPOSURES = [
  { value: 'gering', label: 'Geringe Exposition (vereinzelt / kurze Kontaktzeiten)' },
  { value: 'mittel', label: 'Mittlere Exposition (regelmäßige, abgegrenzte Kontaktzeiten)' },
  { value: 'hoch',   label: 'Hohe Exposition (langanhaltend, viele Schritte/Mengen)' }
] as const;
export type Exposure = (typeof EXPOSURES)[number]['value'];

export const EXPOSED_PERSONS = [
  { value: '1',       label: 'Eine Person',           short: '1' },
  { value: '2-5',     label: '2 bis 5 Personen',      short: '2–5' },
  { value: '6-20',    label: '6 bis 20 Personen',     short: '6–20' },
  { value: '20_plus', label: 'Mehr als 20 Personen',  short: '20+' }
] as const;
export type ExposedPersonsBucket = (typeof EXPOSED_PERSONS)[number]['value'];

/* ─── Aggregierter Activity-Tag-Block (in ra_gbus.activities.tags) ──── */

export type ActivityTags = {
  work_height?: WorkHeight;
  mobility?: Mobility;
  environment?: Environment[];
  tools?: Tool[];
  hazardous_substances?: HazardousSubstance[];
  workforce?: Workforce[];
  psychological?: Psychological[];
  /* ─── Iteration 3 — Kontext-Dimensionen (alle optional) ───────────
   * Wenn ungesetzt: Engine verhält sich wie in Iteration 2 (Default-
   * Weighting 1.0). Wenn gesetzt: Likelihood + Priorität werden
   * angepasst, Plausibility-Hinweise präziser. */
  intensity?: Intensity;
  exposure?: Exposure;
  exposed_persons?: ExposedPersonsBucket;
};

/**
 * Welche Dimensionen sind pro Scope relevant?
 * Reduziert die Wizard-UI auf das Wesentliche pro Tätigkeitsbereich.
 * (Doktrin „60 Sekunden": nicht alle Dimensionen für jeden Scope fragen.)
 *
 * Hinweis: `intensity` und `exposure` werden in JEDEM Scope additiv
 * ergänzt — sie sind universell sinnvoll (Engine-Weighting). Aber sie
 * werden bewusst NACH den scope-spezifischen Tags gerendert, damit der
 * GF zuerst sieht, „worum geht es", und dann den Kontext schärft.
 *
 * Nicht enthalten (bewusst, Anti-SAP-Doktrin):
 *   exposed_persons, Schichtmodell, Dauer pro Tag, konkrete Stoffmengen.
 *   Diese Felder existieren in der Engine als ungesetzt = Faktor 1.0,
 *   können später schrittweise eingeführt werden.
 */
export const SCOPE_QUESTIONS: Record<string, Array<keyof ActivityTags>> = {
  buero:                ['environment', 'tools', 'workforce', 'psychological',          'intensity', 'exposure'],
  lager:                ['environment', 'tools', 'hazardous_substances', 'workforce',   'intensity', 'exposure'],
  baustelle:            ['work_height', 'tools', 'hazardous_substances', 'environment', 'workforce', 'intensity', 'exposure'],
  werkstatt:            ['tools', 'hazardous_substances', 'workforce', 'psychological', 'intensity', 'exposure'],
  aussendienst:         ['mobility', 'environment', 'workforce', 'psychological',       'intensity', 'exposure'],
  gefahrstoffe:         ['hazardous_substances', 'environment', 'tools',                'intensity', 'exposure'],
  'leitern-tritte':     ['work_height', 'tools', 'environment',                         'intensity', 'exposure'],
  fahrzeuge:            ['mobility', 'tools', 'workforce',                              'intensity', 'exposure'],
  psa:                  ['tools', 'hazardous_substances', 'work_height',                'intensity', 'exposure'],
  'psychische-belastung': ['psychological', 'workforce',                                'intensity', 'exposure'],
  // Eigener Arbeitsbereich → alle Dimensionen sichtbar
  eigener:              ['work_height', 'mobility', 'environment', 'tools',
                         'hazardous_substances', 'workforce', 'psychological',
                         'intensity', 'exposure']
};

/* ─── Smart-Defaults pro Scope ─────────────────────────────────────── */

export const SCOPE_DEFAULTS: Record<string, ActivityTags> = {
  buero:               { tools: ['bildschirm'], environment: ['innen'], psychological: ['keine'] },
  lager:               { tools: ['flurfoerderzeuge'], environment: ['lager'] },
  baustelle:           { work_height: 'ueber-2m', tools: ['leitern','handgefuehrt'], environment: ['aussen','kunde'] },
  werkstatt:           { tools: ['handgefuehrt'], environment: ['werkstatt'] },
  aussendienst:        { mobility: 'aussendienst', environment: ['kunde'], workforce: ['alleinarbeit'] },
  gefahrstoffe:        { hazardous_substances: ['farben_lacke'], environment: ['werkstatt','lager'] },
  'leitern-tritte':    { work_height: 'ueber-2m', tools: ['leitern'] },
  fahrzeuge:           { mobility: 'fahrzeuge', tools: ['fahrzeuge'] },
  psa:                 { tools: ['handgefuehrt'] },
  'psychische-belastung': { psychological: ['zeitdruck'] }
};

/* ─── Helfer: Tag-Label-Lookup für UI/Herleitung ──────────────────── */

const ALL_LABELS: Record<string, Record<string, string>> = {
  work_height: Object.fromEntries(WORK_HEIGHTS.map((x) => [x.value, x.label])),
  mobility:    Object.fromEntries(MOBILITY.map((x) => [x.value, x.label])),
  environment: Object.fromEntries(ENVIRONMENTS.map((x) => [x.value, x.label])),
  tools:       Object.fromEntries(TOOLS.map((x) => [x.value, x.label])),
  hazardous_substances: Object.fromEntries(HAZARDOUS_SUBSTANCES.map((x) => [x.value, x.label])),
  workforce:   Object.fromEntries(WORKFORCE.map((x) => [x.value, x.label])),
  psychological: Object.fromEntries(PSYCHOLOGICAL.map((x) => [x.value, x.label])),
  intensity:       Object.fromEntries(INTENSITIES.map((x) => [x.value, x.label])),
  exposure:        Object.fromEntries(EXPOSURES.map((x) => [x.value, x.label])),
  exposed_persons: Object.fromEntries(EXPOSED_PERSONS.map((x) => [x.value, x.label]))
};

export function labelForTag(dimension: string, value: string): string {
  return ALL_LABELS[dimension]?.[value] ?? value;
}

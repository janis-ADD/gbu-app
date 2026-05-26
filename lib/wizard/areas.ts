/**
 * Statische Arbeitsbereiche-Liste (klein, kontrollierbar).
 * In Phase 4 ggf. als DB-Tabelle, im MVP reicht ein hardcoded Set.
 * Slugs konsistent zu ra_risk_catalog.typical_areas.
 */
export type WorkArea = {
  slug: string;
  name: string;
  icon: string;
  hint: string;
};

export const WORK_AREAS: WorkArea[] = [
  { slug: 'buero',       name: 'Büro & Verwaltung',      icon: '🏢', hint: 'Bildschirmarbeitsplätze, Empfang, Besprechungsräume' },
  { slug: 'lager',       name: 'Lager & Logistik',        icon: '🚚', hint: 'Regale, Flurförderzeuge, Gefahrstoff-Lager' },
  { slug: 'baustelle',   name: 'Baustellen',              icon: '🛠️', hint: 'Wechselnde Einsatzorte, Fremdfirmen, Höhenarbeiten' },
  { slug: 'werkstatt',   name: 'Maschinen & Anlagen',     icon: '🏭', hint: 'CNC, handgeführte Geräte, Absauganlagen' },
  { slug: 'fahrzeuge',   name: 'Fahrzeuge & Außendienst', icon: '🚐', hint: 'Firmenfahrzeuge, Ladungssicherung, Führerschein' },
  { slug: 'aussendienst','name': 'Außendienst / Kundeneinsatz', icon: '👷', hint: 'Alleinarbeit, wechselnde Bedingungen' }
];

export function getWorkArea(slug: string): WorkArea | undefined {
  return WORK_AREAS.find((a) => a.slug === slug);
}

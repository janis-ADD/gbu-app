/**
 * Branchen-Optionen — geteilt zwischen Onboarding & Wizard Step 1.
 * Slug-basierte Werte (kein Freitext), damit BG-/Bereiche-Mapping
 * konsistent funktioniert.
 */
export const INDUSTRIES = [
  { value: 'maler',    label: 'Maler & Lackierer' },
  { value: 'bau',      label: 'Bauhandwerk' },
  { value: 'metall',   label: 'Holz & Metall' },
  { value: 'logistik', label: 'Logistik & Spedition' },
  { value: 'gastro',   label: 'Gastronomie & Lebensmittel' },
  { value: 'buero',    label: 'Verwaltung & Beratung' },
  { value: 'pflege',   label: 'Pflege & Gesundheit' },
  { value: 'other',    label: 'Andere / Mischbetrieb' }
] as const;

export type IndustrySlug = (typeof INDUSTRIES)[number]['value'];

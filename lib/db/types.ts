/**
 * Manuelle Row-Types — synchron zu web/db/migrations/*.sql halten.
 */

export type EmployeeBucket = '1' | '2-5' | '6-20' | '21-50' | '51-250' | '250+';

export type GermanState =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';

export const GERMAN_STATES: ReadonlyArray<{ code: GermanState; name: string }> = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' }
];

export type RaUserProfile = {
  user_id: string;
  tenant_id: string;
  display_name: string | null;
  company_name: string | null;
  industry: string | null;
  employee_bucket: EmployeeBucket | null;
  role_in_company: string | null;
  state: GermanState | null;
  accepted_terms_at: string;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RaPlan = {
  slug: 'free' | 'basic' | 'pro';
  name: string;
  tagline: string | null;
  max_releases: number | null;
  features: Record<string, unknown>;
  monthly_eur: number | null;
  yearly_eur: number | null;
  is_public: boolean;
  sort_order: number;
};

export type RaSubscription = {
  tenant_id: string;
  plan_slug: 'free' | 'basic' | 'pro';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_end: string | null;
  provider: 'stub' | 'stripe';
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  updated_at: string;
};

/* ─── Bundle/GBU-Architektur (Migration 0005) ────────────────────────── */

export type BundleStatus = 'in_setup' | 'active' | 'archived';

export type CompanyProfile = {
  company_name?: string;
  industry?: string;       // Slug aus INDUSTRIES
  street?: string;
  postal_code?: string;
  city?: string;
  employee_bucket?: EmployeeBucket;
  state?: GermanState;
  role_in_company?: string;
  short_description?: string;
};

export type BgAssignment = {
  confirmed_bg_slugs?: string[];
  state?: GermanState;
  unclear?: boolean;
  self_verified?: boolean;
  self_verified_at?: string;
};

export type RaBundle = {
  id: string;
  tenant_id: string;
  owner_user_id: string;
  title: string;
  status: BundleStatus;
  company_profile: CompanyProfile;
  bg_assignment: BgAssignment;
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GbuStatus = 'draft' | 'in_review' | 'released' | 'stale';

export type GbuActivities = {
  description?: string;
  // Strukturierte Tätigkeits-Tags — Fundament der Ableitungs-Engine
  // (siehe lib/wizard/activities.ts für die zulässigen Werte je Dimension)
  tags?: {
    work_height?: string;
    mobility?: string;
    environment?: string[];
    tools?: string[];
    hazardous_substances?: string[];
    workforce?: string[];
    psychological?: string[];
  };
  // Optional zusätzliche Tätigkeitsdetails pro Scope
  details?: Record<string, string>;
};

export type GbuHazards = {
  risk_slugs?: string[];
  custom_hazards?: Array<{ label: string; description?: string }>;
};

export type GbuMeasures = {
  measure_acknowledgements?: Record<string, {
    confirmed: boolean;            // ist umgesetzt
    note?: string;
    top_category?: 'technisch' | 'organisatorisch' | 'personenbezogen';
  }>;
};

export type GbuOpenItem = {
  id: string;
  category: 'fehlende-doku' | 'pruefung-faellig' | 'unklar';
  description: string;
  priority: 'low' | 'medium' | 'high';
  source_refs: string[];
  resolved?: boolean;
};

/** Anlässe, bei denen eine GBU bewusst überprüft werden soll (ArbSchG §3). */
export type ReviewTriggerEvent =
  | 'unfall'
  | 'neue-maschine'
  | 'neuer-gefahrstoff'
  | 'neue-taetigkeit'
  | 'gesetzesaenderung';

export const REVIEW_TRIGGER_EVENTS: ReadonlyArray<{ value: ReviewTriggerEvent; label: string; description: string }> = [
  { value: 'unfall',             label: 'Nach Unfall / Beinahe-Unfall', description: 'Vorfall im Tätigkeitsbereich, der eine Neubewertung verlangt.' },
  { value: 'neue-maschine',      label: 'Neue Maschine / Arbeitsmittel', description: 'Anschaffung oder größere Umrüstung eines Geräts.' },
  { value: 'neuer-gefahrstoff',  label: 'Neuer Gefahrstoff',             description: 'Einsatz eines bisher nicht verwendeten Stoffs.' },
  { value: 'neue-taetigkeit',    label: 'Neue Tätigkeit',                description: 'Erweiterung des Leistungsumfangs / neue Prozesse.' },
  { value: 'gesetzesaenderung',  label: 'Gesetzes- / Regeländerung',     description: 'Neue oder geänderte Vorschrift (DGUV, ArbSchG, GefStoffV …).' }
];

/** Erlaubte Standard-Intervalle. NULL = nur Datum, kein automatisches Intervall. */
export type ReviewIntervalMonths = 6 | 12 | 24;

export type RaGbu = {
  id: string;
  bundle_id: string;
  tenant_id: string;
  scope_slug: string;
  title: string;
  activities: GbuActivities;
  hazards: GbuHazards;
  measures: GbuMeasures;
  open_items: GbuOpenItem[];
  responsible_role: string | null;
  review_due_date: string | null;
  review_interval_months: ReviewIntervalMonths | null;
  review_trigger_events: ReviewTriggerEvent[];
  status: GbuStatus;
  current_step: 1 | 2 | 3 | 4 | 5;
  current_version: number;
  is_stale: boolean;
  stale_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RaGbuVersion = {
  id: string;
  gbu_id: string;
  bundle_id: string;
  tenant_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  released_by: string;
  released_at: string;
  release_notes: string | null;
  disclaimer_acknowledged: boolean;
  source_refs: string[];
};

/* ─── Stammdaten ────────────────────────────────────────────────────── */

export type RaBgCatalog = {
  slug: string;
  name: string;
  description: string | null;
  industries: string[];
  data_source: string;
  is_complete: boolean;
};

export type RaRiskCatalog = {
  slug: string;
  name: string;
  category: string;
  typical_areas: string[];
  source_ref_slugs: string[];
  data_source: string;
  /* Migration 0007 */
  trigger_conditions?: Record<string, string[]>;
  severity_default?: number | null;
  likelihood_default?: number | null;
  requires_betriebsanweisung?: boolean;
  requires_psa?: boolean;
  requires_unterweisung?: boolean;
};

export type RaMeasureCatalog = {
  slug: string;
  short_text: string;
  long_text: string;
  category: 'technisch' | 'organisatorisch' | 'personenbezogen';
  applies_to_risks: string[];
  source_ref_slugs: string[];
  confidence: 'high' | 'medium';
  data_source: string;
  /* Migration 0007 */
  is_mandatory_when?: {
    risks?: string[];
    any_substance?: boolean;
    work_height?: string[];
  };
};

export type RaLegalRef = {
  slug: string;
  kind: string;
  citation: string;
  title: string;
  url: string | null;
  bg_slug: string | null;
  reviewed_by: string;
  reviewed_at: string;
  data_source: string;
};

export type RaTrainingCatalog = {
  slug: string;
  name: string;
  related_risks: string[];
  memberspot_id: string | null;
  data_source: string;
};

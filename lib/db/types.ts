/**
 * Manuelle Row-Types für die wichtigsten Tabellen.
 * Bewusst ohne automatische Supabase-Generierung im MVP — kleines Set,
 * leicht synchron zu halten mit den SQL-Migrationen (web/db/migrations/).
 *
 * Bei Schema-Änderungen: hier ergänzen.
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

export type AssessmentStatus = 'draft' | 'in_review' | 'released' | 'archived';

export type RaAssessment = {
  id: string;
  tenant_id: string;
  owner_user_id: string;
  title: string;
  status: AssessmentStatus;
  current_step: 1 | 2 | 3 | 4 | 5 | 6;
  current_version: number;
  step1_company: Record<string, unknown>;
  step2_bg: Record<string, unknown>;
  step3_areas: Record<string, unknown>;
  step4_hazards: Record<string, unknown>;
  step5_measures: Record<string, unknown>;
  step6_review: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RaAssessmentVersion = {
  id: string;
  assessment_id: string;
  tenant_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  released_by: string;
  released_at: string;
  release_notes: string | null;
  disclaimer_acknowledged: boolean;
  source_refs: string[];
};

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

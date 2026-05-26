import { createClient } from '@/lib/supabase/server';
import type { RaAssessment } from '@/lib/db/types';

export type AssessmentRow = Pick<
  RaAssessment,
  'id' | 'title' | 'status' | 'current_step' | 'current_version' | 'updated_at' | 'created_at'
>;

export type AssessmentCounts = {
  total: number;
  draft: number;
  in_review: number;
  released: number;
  archived: number;
};

/**
 * Liste aller eigenen Assessments (RLS-isoliert).
 * Sortiert nach updated_at desc.
 */
export async function listMyAssessments(): Promise<AssessmentRow[]> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_assessments')
      .select('id, title, status, current_step, current_version, updated_at, created_at')
      .order('updated_at', { ascending: false });
    return (data ?? []) as AssessmentRow[];
  } catch {
    return [];
  }
}

/**
 * Aggregierte Counts pro Status. RLS-isoliert.
 */
export async function getMyAssessmentCounts(): Promise<AssessmentCounts> {
  const empty: AssessmentCounts = { total: 0, draft: 0, in_review: 0, released: 0, archived: 0 };
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_assessments')
      .select('status');
    const rows = (data ?? []) as Array<{ status: AssessmentRow['status'] }>;
    return rows.reduce<AssessmentCounts>(
      (acc, r) => {
        acc.total += 1;
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { ...empty }
    );
  } catch {
    return empty;
  }
}

/**
 * Holt ein einzelnes Assessment (mit Step-Daten). null bei RLS-Miss.
 */
export async function getAssessment(id: string): Promise<RaAssessment | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_assessments')
      .select('*')
      .eq('id', id)
      .maybeSingle<RaAssessment>();
    return data ?? null;
  } catch {
    return null;
  }
}

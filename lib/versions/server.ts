import { createClient } from '@/lib/supabase/server';
import type { RaAssessmentVersion } from '@/lib/db/types';

export async function getVersion(
  assessmentId: string,
  versionNumber: number
): Promise<RaAssessmentVersion | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('ra_assessment_versions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('version_number', versionNumber)
      .maybeSingle<RaAssessmentVersion>();
    return data ?? null;
  } catch {
    return null;
  }
}

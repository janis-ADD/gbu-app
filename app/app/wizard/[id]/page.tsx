import { redirect, notFound } from 'next/navigation';
import { getAssessment } from '@/lib/assessments/server';

// /app/wizard/[id] → redirect zum aktuellen Step
export default async function WizardIndex({
  params
}: {
  params: { id: string };
}) {
  const a = await getAssessment(params.id);
  if (!a) notFound();
  redirect(`/app/wizard/${a.id}/${a.current_step}`);
}

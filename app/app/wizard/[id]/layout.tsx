import { notFound } from 'next/navigation';
import { getAssessment } from '@/lib/assessments/server';
import { WizardSidebar } from '@/components/wizard/WizardSidebar';

/**
 * Wizard-Layout: lädt das Assessment einmal und stellt die Sidebar bereit.
 * Children = jeweilige Step-Page.
 */
export default async function WizardLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const assessment = await getAssessment(params.id);
  if (!assessment) notFound();

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>{assessment.title}</h1>
          <p>
            Schritt {assessment.current_step} von 6 ·{' '}
            <a href="/app/assessments" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              ‹ Alle Beurteilungen
            </a>
          </p>
        </div>
      </div>

      <div className="wizard-layout">
        <WizardSidebar
          assessmentId={assessment.id}
          currentStep={assessment.current_step}
          furthestStep={assessment.current_step}
        />
        <section className="wizard-main">{children}</section>
      </div>
    </main>
  );
}

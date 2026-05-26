'use client';

import Link from 'next/link';

const STEPS = [
  { n: 1, slug: 'unternehmen', title: 'Unternehmensdaten' },
  { n: 2, slug: 'bg',          title: 'Berufsgenossenschaft' },
  { n: 3, slug: 'bereiche',    title: 'Arbeitsbereiche' },
  { n: 4, slug: 'gefahren',    title: 'Gefahrenquellen' },
  { n: 5, slug: 'massnahmen',  title: 'Maßnahmen & Lücken' },
  { n: 6, slug: 'auswertung',  title: 'Auswertung & Export' }
] as const;

export function WizardSidebar({
  assessmentId,
  currentStep,
  furthestStep
}: {
  assessmentId: string;
  currentStep: number;
  furthestStep: number; // bisher erreichter Step (für Sprung-Freigabe)
}) {
  const pct = Math.round((currentStep / STEPS.length) * 100);
  return (
    <aside className="wizard-side">
      <div className="side-head">
        <div>
          <div className="side-title">Assistent</div>
          <div className="side-sub">Geführte Erstellung</div>
        </div>
        <span className="badge badge-blue">{currentStep}/6</span>
      </div>

      <div className="progress-wrap">
        <div className="progress" style={{ width: `${pct}%` }} />
      </div>

      <div>
        {STEPS.map((s) => {
          const reached = s.n <= furthestStep;
          const active = s.n === currentStep;
          const done = s.n < currentStep;
          const cls = `step-btn ${active ? 'active' : ''} ${done ? 'done' : ''}`;
          const inner = (
            <>
              <span className="step-no">{done ? '✓' : s.n}</span>
              <span>{s.title}</span>
            </>
          );
          return reached ? (
            <Link
              key={s.n}
              href={`/app/wizard/${assessmentId}/${s.n}`}
              className={cls}
              style={{ textDecoration: 'none' }}
            >
              {inner}
            </Link>
          ) : (
            <div key={s.n} className={cls} style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="ki-hint">
        <div className="ki-hint-title">🛡️ Konservative Logik</div>
        <p>
          Vorschläge stammen ausschließlich aus dem geprüften DGUV/BG/ASR-Quellenkatalog.
          Keine erfundenen Vorschriften.
        </p>
      </div>
    </aside>
  );
}

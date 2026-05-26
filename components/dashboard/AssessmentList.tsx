import Link from 'next/link';
import type { AssessmentRow } from '@/lib/assessments/server';

function statusBadge(status: AssessmentRow['status']) {
  switch (status) {
    case 'draft':
      return <span className="badge badge-gray">Entwurf</span>;
    case 'in_review':
      return <span className="badge badge-amber">In Bearbeitung</span>;
    case 'released':
      return <span className="badge badge-green">Freigegeben</span>;
    case 'archived':
      return <span className="badge badge-gray">Archiviert</span>;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function AssessmentList({
  items,
  emptyAction
}: {
  items: AssessmentRow[];
  emptyAction?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ borderRadius: 0, borderTop: '1px solid var(--border)' }}>
        <div className="empty-icon">🧠</div>
        <h2>Noch keine Beurteilung vorhanden</h2>
        <p>
          Starte jetzt deine erste KI-Gefährdungsbeurteilung — geführt in
          6 Schritten.
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      {items.map((a) => {
        const verLabel =
          a.current_version > 0 ? `v${a.current_version}` : 'v0 (Entwurf)';
        const verBadgeClass = a.current_version > 0 ? 'badge-blue' : 'badge-gray';
        const href =
          a.status === 'released'
            ? `/app/version/${a.id}/${a.current_version}`
            : `/app/wizard/${a.id}/${a.current_step}`;
        return (
          <div key={a.id} className="list-row">
            <div>
              <div className="list-title">{a.title}</div>
              <div className="list-meta">
                Zuletzt geändert {fmtDate(a.updated_at)}
              </div>
            </div>
            <div>{statusBadge(a.status)}</div>
            <div>
              <span className={`badge ${verBadgeClass}`}>{verLabel}</span>
            </div>
            <div>{fmtDate(a.updated_at)}</div>
            <div className="list-actions">
              <Link href={href} className="btn btn-secondary btn-sm">
                {a.status === 'released' ? 'Ansehen' : 'Fortsetzen ›'}
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}

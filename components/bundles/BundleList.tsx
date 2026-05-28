import Link from 'next/link';
import type { RaBundle } from '@/lib/db/types';

function statusBadge(s: RaBundle['status']) {
  if (s === 'in_setup') return <span className="badge badge-amber">Setup</span>;
  if (s === 'archived') return <span className="badge badge-gray">Archiviert</span>;
  return <span className="badge badge-green">Aktiv</span>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export function BundleList({
  items,
  emptyAction
}: {
  items: RaBundle[];
  emptyAction?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state" style={{ borderRadius: 0, borderTop: '1px solid var(--border)' }}>
        <div className="empty-icon">📁</div>
        <h2>Legen Sie Ihre erste Compliance-Mappe an</h2>
        <p>
          In einer Mappe bündeln Sie alle Gefährdungsbeurteilungen eines Betriebs.
          Sie hinterlegen Ihre Stammdaten einmal — die einzelnen tätigkeitsbezogenen
          Beurteilungen entstehen darunter, jede mit nachvollziehbarer Quellenlage
          und revisionssicherem Snapshot.
        </p>
        {emptyAction}
      </div>
    );
  }
  return (
    <>
      {items.map((b) => {
        const company = (b.company_profile as { company_name?: string });
        return (
          <div key={b.id} className="list-row">
            <div>
              <div className="list-title">{b.title}</div>
              <div className="list-meta">
                {company.company_name ?? '—'} · zuletzt {fmt(b.updated_at)}
              </div>
            </div>
            <div>{statusBadge(b.status)}</div>
            <div />
            <div>{fmt(b.updated_at)}</div>
            <div className="list-actions">
              <Link href={`/app/bundles/${b.id}`} className="btn btn-secondary btn-sm">
                Öffnen ›
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );
}

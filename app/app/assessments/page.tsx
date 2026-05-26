import Link from 'next/link';
import { QuotaCard } from '@/components/dashboard/QuotaCard';
import { AssessmentList } from '@/components/dashboard/AssessmentList';
import { getCurrentQuota } from '@/lib/quota/server';
import { listMyAssessments } from '@/lib/assessments/server';

const STATUS_FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'draft', label: 'Entwurf' },
  { value: 'in_review', label: 'In Bearbeitung' },
  { value: 'released', label: 'Freigegeben' },
  { value: 'archived', label: 'Archiviert' }
] as const;

export default async function AssessmentsPage({
  searchParams
}: {
  searchParams: { status?: string; error?: string };
}) {
  const [quota, all] = await Promise.all([getCurrentQuota(), listMyAssessments()]);

  const active = (searchParams.status ?? 'all') as (typeof STATUS_FILTERS)[number]['value'];
  const items = active === 'all' ? all : all.filter((a) => a.status === active);

  return (
    <main className="content">
      {searchParams.error ? (
        <div className="alert-banner is-error">
          <span className="alert-banner-icon">⛔</span>
          <div className="alert-banner-text">
            {searchParams.error === 'service_unavailable'
              ? 'Der Dienst ist gerade nicht erreichbar. Bitte später erneut versuchen.'
              : 'Beurteilung konnte nicht angelegt werden. Bitte später erneut versuchen.'}
          </div>
        </div>
      ) : null}

      <div className="content-head">
        <div>
          <h1>Meine Beurteilungen</h1>
          <p>Alle Gefährdungsbeurteilungen in deinem Account.</p>
        </div>
        <Link href="/app/assessments/new" className="btn btn-primary btn-lg">
          ＋ Neue Beurteilung starten
        </Link>
      </div>

      <QuotaCard quota={quota} />

      <div className="list-toolbar">
        <div className="filter-row">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={
                f.value === 'all' ? '/app/assessments' : `/app/assessments?status=${f.value}`
              }
              className={`filter-chip ${active === f.value ? 'active' : ''}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="list-card">
        <div className="list-head">
          <span>Titel</span>
          <span>Status</span>
          <span>Version</span>
          <span>Geändert</span>
          <span />
        </div>
        <AssessmentList
          items={items}
          emptyAction={
            <Link href="/app/assessments/new" className="btn btn-primary btn-lg">
              ＋ Erste Beurteilung starten
            </Link>
          }
        />
      </section>
    </main>
  );
}

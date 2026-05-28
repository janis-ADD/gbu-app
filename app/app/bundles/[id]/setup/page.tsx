import { notFound } from 'next/navigation';
import { getBundle } from '@/lib/bundles/server';
import { listBgCatalog } from '@/lib/catalogs/server';
import { suggestBgCandidatesWithScore } from '@/lib/wizard/derive';
import type { GermanState, BgAssignment, CompanyProfile } from '@/lib/db/types';
import { CompanyForm } from '@/components/bundles/CompanyForm';
import { BgForm } from '@/components/bundles/BgForm';

export default async function BundleSetupPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { step?: string };
}) {
  const bundle = await getBundle(params.id);
  if (!bundle) notFound();
  const subStep = searchParams.step === 'bg' ? 'bg' : 'company';

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>{bundle.title}</h1>
          <p>
            Setup {subStep === 'company' ? '1' : '2'} / 2 ·{' '}
            <a href="/app/bundles" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              ‹ Alle Mappen
            </a>
          </p>
        </div>
      </div>

      <div className="alert-banner is-info">
        <span className="alert-banner-icon">ℹ️</span>
        <div className="alert-banner-text">
          <strong>Schritt {subStep === 'company' ? '1' : '2'}:</strong>{' '}
          {subStep === 'company'
            ? 'Unternehmensdaten (gelten für alle GBUs dieser Mappe).'
            : 'Berufsgenossenschaft auswählen + Eigenklärung bestätigen.'}
        </div>
      </div>

      {subStep === 'company' ? (
        <CompanyForm
          bundleId={bundle.id}
          initial={(bundle.company_profile ?? {}) as CompanyProfile}
        />
      ) : (
        <BgSection bundle={bundle} />
      )}
    </main>
  );
}

async function BgSection({ bundle }: { bundle: Awaited<ReturnType<typeof getBundle>> }) {
  if (!bundle) return null;
  const bgCatalog = await listBgCatalog();
  const company = (bundle.company_profile ?? {}) as CompanyProfile;
  const bg = (bundle.bg_assignment ?? {}) as BgAssignment;
  const candidates = suggestBgCandidatesWithScore(
    company.industry,
    company.short_description,
    bgCatalog
  );

  return (
    <BgForm
      bundleId={bundle.id}
      candidates={candidates}
      bgCatalog={bgCatalog}
      selected={bg.confirmed_bg_slugs ?? []}
      state={(bg.state ?? company.state ?? null) as GermanState | null}
      unclear={!!bg.unclear}
    />
  );
}

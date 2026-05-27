import { notFound } from 'next/navigation';
import { getBundle } from '@/lib/bundles/server';
import { listBgCatalog } from '@/lib/catalogs/server';
import { suggestBgCandidatesWithScore } from '@/lib/wizard/derive';
import type { GermanState, BgAssignment, CompanyProfile } from '@/lib/db/types';
import { CompanyForm } from '@/components/bundles/CompanyForm';
import { BgForm } from '@/components/bundles/BgForm';

// TEMP DEBUG (Real User Validation Sprint): erzwingt dynamisches Rendern
// pro Request — verhindert, dass die Setup-Page versehentlich statisch
// gerendert wird (mit potenziell leerem Catalog-Snapshot).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Sichtbarer Build-Marker für den Banner unten (siehe BgSection).
const DEBUG_BUILD_MARKER = 'ux-rvs-bgcatalog-bypass';

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

  // TEMP DEBUG: sichtbarer Diagnose-Banner für den Real-User-Validation-Test.
  // Zeigt direkt im UI: wieviele BGs der Server geladen hat + welche Industry
  // gerade gefiltert wird. So braucht es keine Function-Logs.
  return (
    <>
      <div className="alert-banner" style={{
        marginBottom: 16,
        borderLeft: '3px solid var(--petrol, #1B6CA8)'
      }}>
        <span className="alert-banner-icon" aria-hidden="true">🔍</span>
        <div className="alert-banner-text" style={{ flex: 1 }}>
          <strong>BG-Catalog Diagnose (temp.)</strong>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, fontFamily: 'ui-monospace, monospace' }}>
            <div>bgCatalog.length = <strong>{bgCatalog.length}</strong></div>
            <div>industry-filter = <strong>{company.industry ? `"${company.industry}"` : '(leer)'}</strong></div>
            <div>candidates.length = <strong>{candidates.length}</strong></div>
            <div>first-3-slugs = <strong>[{bgCatalog.slice(0, 3).map((b) => b.slug).join(', ')}]</strong></div>
          </div>
          <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            build: {DEBUG_BUILD_MARKER}
          </div>
        </div>
      </div>
      <BgForm
        bundleId={bundle.id}
        candidates={candidates}
        bgCatalog={bgCatalog}
        selected={bg.confirmed_bg_slugs ?? []}
        state={(bg.state ?? company.state ?? null) as GermanState | null}
        unclear={!!bg.unclear}
      />
    </>
  );
}

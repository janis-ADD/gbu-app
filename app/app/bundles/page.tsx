import { QuotaCard } from '@/components/dashboard/QuotaCard';
import { BundleList } from '@/components/bundles/BundleList';
import { getCurrentQuota } from '@/lib/quota/server';
import { listMyBundles } from '@/lib/bundles/server';
import { createBundleAction } from '@/app/actions/bundles';

/**
 * TEMP DEBUG-MARKER (Real User Validation Sprint).
 * Sichtbar im Banner, wenn ?error=… in der URL ist. Anhand dieses
 * Strings erkennt der Tester eindeutig, ob der neue Code im Deploy
 * Preview läuft (statt fälschlich Production zu testen).
 */
const DEBUG_BUILD_MARKER = 'ux-rvs-04fd50e+debug-redirect';

export default async function BundlesPage({
  searchParams
}: {
  searchParams: { error?: string; debug?: string };
}) {
  const [quota, items] = await Promise.all([getCurrentQuota(), listMyBundles()]);

  return (
    <main className="content">
      {searchParams.error ? (
        <div className="alert-banner is-error">
          <span className="alert-banner-icon">⛔</span>
          <div className="alert-banner-text" style={{ flex: 1 }}>
            <strong>Mappe konnte nicht erstellt werden.</strong>{' '}
            Bitte später erneut versuchen.
            {searchParams.debug ? (
              <details style={{ marginTop: 10 }} open>
                <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  Technischer Hinweis (temp. Debug)
                </summary>
                <pre style={{
                  marginTop: 8, padding: '10px 12px',
                  background: 'var(--off, #f7f9fc)',
                  border: '1px solid var(--border, #d6e4f0)',
                  borderRadius: 6,
                  fontSize: 12, lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  color: 'var(--text-2)'
                }}>{searchParams.debug}</pre>
              </details>
            ) : null}
            <div style={{ marginTop: 8, fontSize: 10.5, color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              build: {DEBUG_BUILD_MARKER}
            </div>
          </div>
        </div>
      ) : null}

      <div className="content-head">
        <div>
          <h1>Compliance-Mappen</h1>
          <p>Eine Mappe je Betrieb — gebündelt mit allen Gefährdungsbeurteilungen, die nach ArbSchG §5 &amp; §6 dokumentiert werden müssen.</p>
        </div>
        <form action={createBundleAction}>
          <button type="submit" className="btn btn-primary btn-lg">
            ＋ Neue Mappe anlegen
          </button>
        </form>
      </div>

      <QuotaCard quota={quota} />

      <section className="list-card">
        <div className="list-head">
          <span>Mappe</span><span>Status</span><span /><span>Geändert</span><span />
        </div>
        <BundleList
          items={items}
          emptyAction={
            <form action={createBundleAction}>
              <button type="submit" className="btn btn-primary btn-lg">
                ＋ Erste Mappe anlegen
              </button>
            </form>
          }
        />
      </section>
    </main>
  );
}

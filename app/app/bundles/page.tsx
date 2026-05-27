import { QuotaCard } from '@/components/dashboard/QuotaCard';
import { BundleList } from '@/components/bundles/BundleList';
import { getCurrentQuota } from '@/lib/quota/server';
import { listMyBundles } from '@/lib/bundles/server';
import { createBundleAction } from '@/app/actions/bundles';

export default async function BundlesPage({
  searchParams
}: {
  searchParams: { error?: string };
}) {
  const [quota, items] = await Promise.all([getCurrentQuota(), listMyBundles()]);

  return (
    <main className="content">
      {searchParams.error ? (
        <div className="alert-banner is-error">
          <span className="alert-banner-icon">⛔</span>
          <div className="alert-banner-text">
            Mappe konnte nicht erstellt werden. Bitte später erneut versuchen.
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

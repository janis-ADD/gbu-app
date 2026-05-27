import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getBundle, getBundleStats } from '@/lib/bundles/server';
import { listGbusForBundle } from '@/lib/gbus/server';
import { getCurrentQuota } from '@/lib/quota/server';
import {
  createGbuAction,
  deleteGbuAction
} from '@/app/actions/gbus';
import {
  seedGbusFromIndustryAction,
  archiveBundleAction
} from '@/app/actions/bundles';
import { SCOPES, suggestScopesForIndustry, getScope } from '@/lib/wizard/scopes';
import { industryLabel } from '@/lib/wizard/industries';
import { ConfirmActionButton } from '@/components/common/ConfirmActionButton';
import type { CompanyProfile, BgAssignment } from '@/lib/db/types';

const ACTION_ERROR_MESSAGES: Record<string, string> = {
  blocked_free_released: 'Freigegebene Gefährdungsbeurteilungen können im Free-Plan nicht gelöscht werden — sonst ließe sich das 3-GBU-Limit umgehen. Upgrade auf Basic, um GBUs zu entfernen.',
  not_found: 'Gefährdungsbeurteilung nicht gefunden oder bereits gelöscht.',
  service_unavailable: 'Aktion aktuell nicht möglich — bitte in einem Moment erneut versuchen.',
  title_too_short: 'Bitte mindestens 3 Zeichen für den Namen des Arbeitsbereichs angeben.',
  create_failed: 'Anlegen fehlgeschlagen — bitte Eingaben prüfen und erneut versuchen.',
  auth: 'Sitzung abgelaufen — bitte neu anmelden.'
};

export default async function BundleDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { error?: string; notice?: string };
}) {
  const bundle = await getBundle(params.id);
  if (!bundle) notFound();

  // Wenn Setup nicht abgeschlossen → weiter zum Setup
  if (!bundle.setup_completed_at) {
    redirect(`/app/bundles/${bundle.id}/setup`);
  }

  const [stats, gbus, quota] = await Promise.all([
    getBundleStats(bundle.id),
    listGbusForBundle(bundle.id),
    getCurrentQuota()
  ]);
  const planSlug = quota?.plan_slug ?? 'free';
  const actionError = searchParams?.error ? ACTION_ERROR_MESSAGES[searchParams.error] : null;
  const actionNotice = searchParams?.notice === 'gbu_deleted' ? 'Gefährdungsbeurteilung gelöscht.' : null;

  const company = (bundle.company_profile ?? {}) as CompanyProfile;
  const bg = (bundle.bg_assignment ?? {}) as BgAssignment;
  const usedScopes = new Set(gbus.map((g) => g.scope_slug));
  const suggestions = suggestScopesForIndustry(company.industry).filter(
    (s) => !usedScopes.has(s.slug)
  );

  return (
    <main className="content">
      <div className="content-head">
        <div>
          <h1>{bundle.title}</h1>
          <p>
            {company.company_name ?? '—'} ·{' '}
            <a href="/app/bundles" style={{ color: 'var(--petrol)', fontWeight: 600 }}>
              ‹ Alle Mappen
            </a>
          </p>
        </div>
        <ConfirmActionButton
          triggerLabel={<>🗄&nbsp;Mappe archivieren</>}
          triggerClassName="btn btn-ghost btn-sm"
          triggerTitle="Mappe archivieren — verschwindet aus der aktiven Liste, Daten bleiben erhalten."
          title={`Mappe „${bundle.title}" archivieren?`}
          description={<>Diese Mappe wird aus Ihrer aktiven Übersicht entfernt. Alle enthaltenen Gefährdungsbeurteilungen und ihre freigegebenen Versionen bleiben unveränderlich gespeichert.</>}
          audit={<><strong>Audit-Hinweis:</strong> Eine Archivierung ist keine Löschung. Sämtliche Snapshots, Hashes und Audit-Events bleiben für Nachweiszwecke vollständig erhalten.</>}
          confirmLabel="Mappe archivieren"
          tone="primary"
          action={archiveBundleAction.bind(null, bundle.id)}
        />
      </div>

      {actionError ? (
        <div className="alert-banner is-error">
          <span className="alert-banner-icon">⛔</span>
          <div className="alert-banner-text">{actionError}</div>
        </div>
      ) : null}
      {actionNotice ? (
        <div className="alert-banner is-success">
          <span className="alert-banner-icon">✅</span>
          <div className="alert-banner-text">{actionNotice}</div>
        </div>
      ) : null}

      {/* Bundle-Kopf */}
      <section className="account-section">
        <h2>Stammdaten dieser Mappe</h2>
        <div className="section-sub">
          Diese Angaben gelten für alle Gefährdungsbeurteilungen, die in dieser Mappe liegen.{' '}
          <Link href={`/app/bundles/${bundle.id}/setup`} style={{ color: 'var(--petrol)' }}>
            Bearbeiten ›
          </Link>
        </div>
        <div className="data-box">
          <div><strong>Unternehmen:</strong> {company.company_name ?? '—'} · {industryLabel(company.industry)}</div>
          <div><strong>Standort:</strong> {[company.postal_code, company.city].filter(Boolean).join(' ') || '—'} ({company.state ?? '—'})</div>
          <div><strong>Mitarbeitende:</strong> {company.employee_bucket ?? '—'}</div>
          <div>
            <strong>Vom Betrieb bestätigte Zuständigkeit:</strong>{' '}
            {bg.unclear ? 'noch zu klären' :
              bg.confirmed_bg_slugs?.join(', ') || '—'}
            {bg.self_verified_at ? (
              <em style={{ color: 'var(--text-3)' }}>
                {' · Eigenklärung dokumentiert am '}
                {new Date(bg.self_verified_at).toLocaleDateString('de-DE')}
              </em>
            ) : null}
          </div>
        </div>
      </section>

      {/* GBU-Statistik */}
      <section className="kpi-grid" style={{ marginTop: '1.5rem' }}>
        <div className="kpi-card k-blue">
          <div className="kpi-label">Beurteilungen gesamt</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">in dieser Mappe</div>
        </div>
        <div className="kpi-card k-amber">
          <div className="kpi-label">In Bearbeitung</div>
          <div className="kpi-value">{stats.draft}</div>
          <div className="kpi-sub">Entwurf oder Prüfung</div>
        </div>
        <div className="kpi-card k-green">
          <div className="kpi-label">Freigegeben</div>
          <div className="kpi-value">{stats.released}</div>
          <div className="kpi-sub">aktive Versionen</div>
        </div>
        <div className="kpi-card k-red">
          <div className="kpi-label">Aktualisierung nötig</div>
          <div className="kpi-value">{stats.stale}</div>
          <div className="kpi-sub">Stammdaten haben sich geändert</div>
        </div>
      </section>

      {/* Vorschläge bei leerer Mappe */}
      {gbus.length === 0 && suggestions.length > 0 ? (
        <section className="quota-card" style={{ marginTop: '1.5rem' }}>
          <div className="quota-icon">🧠</div>
          <div className="quota-body">
            <div className="quota-title">Schnellstart: {suggestions.length} typische GBUs für deine Branche</div>
            <div className="quota-desc">
              Wir legen die fachlich üblichen GBUs als Skelett an — du füllst sie nacheinander aus.
              Jede mit klarer Begründung, warum sie für deine Branche relevant ist.
            </div>
          </div>
          <form action={seedGbusFromIndustryAction.bind(null, bundle.id)}>
            <button type="submit" className="btn btn-primary">＋ Skelett anlegen</button>
          </form>
        </section>
      ) : null}

      {/* GBU-Liste */}
      <section className="list-card" style={{ marginTop: '1.5rem' }}>
        <div className="list-head">
          <span>Gefährdungsbeurteilung (Scope)</span>
          <span>Status</span>
          <span>Version</span>
          <span>Geändert</span>
          <span />
        </div>
        {gbus.length === 0 ? (
          <div className="empty-state" style={{ borderRadius: 0, borderTop: '1px solid var(--border)' }}>
            <div className="empty-icon">📋</div>
            <h2>Noch keine Gefährdungsbeurteilung in dieser Mappe</h2>
            <p>Wähle unten einen Arbeitsbereich aus, lege einen eigenen an oder nutze das Schnellstart-Skelett.</p>
          </div>
        ) : (
          gbus.map((g) => {
            const scope = getScope(g.scope_slug);
            const verLabel = g.current_version > 0 ? `v${g.current_version}` : '—';
            const stale = g.is_stale;
            const isCustom = g.scope_slug === 'eigener';
            const areaLabel = isCustom ? 'Eigener Arbeitsbereich' : (scope?.title ?? 'Arbeitsbereich');

            // Fälligkeit der nächsten Wirksamkeitsprüfung — nur bei freigegebenen
            // GBUs (sonst irreführend für Entwürfe)
            let dueBadge: React.ReactNode = null;
            if (g.status === 'released' && g.review_due_date) {
              const days = Math.ceil(
                (new Date(g.review_due_date).getTime() - Date.now()) / 86_400_000
              );
              if (days < 0) {
                dueBadge = <span className="badge badge-red" style={{ marginLeft: 6 }} title={`Fällig seit ${-days} Tagen`}>überfällig</span>;
              } else if (days <= 30) {
                dueBadge = <span className="badge badge-amber" style={{ marginLeft: 6 }} title={`Fällig in ${days} Tagen`}>bald fällig</span>;
              } else if (days <= 90) {
                dueBadge = <span className="badge badge-blue" style={{ marginLeft: 6 }} title={`Fällig am ${new Date(g.review_due_date).toLocaleDateString('de-DE')}`}>{`in ${days} T.`}</span>;
              }
            }
            // Untertitel: bevorzugt eine kurze Tätigkeitsbeschreibung; sonst
            // — nur wenn der Titel den Scope-Namen nicht ohnehin enthält —
            // das Arbeitsbereich-Label als Hilfsorientierung.
            const desc = ((g.activities as { description?: string } | undefined)?.description ?? '').trim();
            const shortDesc = desc.length > 90 ? `${desc.slice(0, 87).trim()}…` : desc;
            const titleHasScope = scope ? g.title.includes(scope.title) : false;
            const subtitle = shortDesc
              ? shortDesc
              : (!titleHasScope ? `Arbeitsbereich: ${areaLabel}` : '');
            return (
              <div key={g.id} className="list-row">
                <div>
                  <div className="list-title">
                    {scope?.icon ?? '📋'} {g.title}
                    {stale ? (
                      <span className="badge badge-amber" style={{ marginLeft: 8 }}>
                        veraltet
                      </span>
                    ) : null}
                    {dueBadge}
                  </div>
                  {subtitle ? (
                    <div className="list-meta">{subtitle}</div>
                  ) : null}
                </div>
                <div>
                  {g.status === 'released' ? (
                    <span className="badge badge-green">Freigegeben</span>
                  ) : g.status === 'in_review' ? (
                    <span className="badge badge-amber">In Prüfung</span>
                  ) : (
                    <span className="badge badge-gray">Entwurf</span>
                  )}
                </div>
                <div>
                  <span className={`badge ${g.current_version > 0 ? 'badge-blue' : 'badge-gray'}`}>
                    {verLabel}
                  </span>
                </div>
                <div>
                  {new Date(g.updated_at).toLocaleDateString('de-DE')}
                </div>
                <div className="list-actions">
                  {g.status === 'released' && !stale ? (
                    <Link
                      href={`/app/bundles/${bundle.id}/gbu/${g.id}/v/${g.current_version}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Ansehen
                    </Link>
                  ) : (
                    <Link
                      href={`/app/bundles/${bundle.id}/gbu/${g.id}/${g.current_step}`}
                      className="btn btn-secondary btn-sm"
                    >
                      {stale ? 'Aktualisieren' : 'Fortsetzen ›'}
                    </Link>
                  )}
                  {/* Delete: Drafts immer; Released nur ab Basic-Plan (Paywall-Schutz) */}
                  {(() => {
                    const isReleased = g.status === 'released';
                    const canDelete = !isReleased || planSlug !== 'free';
                    if (!canDelete) {
                      return (
                        <span
                          className="btn btn-ghost btn-sm"
                          title="Freigegebene Beurteilungen zählen im Free-Plan dauerhaft zum 3-GBU-Limit. Upgrade auf Basic, um Beurteilungen zu löschen."
                          style={{ opacity: .4, cursor: 'not-allowed' }}
                        >
                          🔒 Löschen
                        </span>
                      );
                    }
                    return (
                      <ConfirmActionButton
                        triggerLabel={<><span>🗑</span>&nbsp;Löschen</>}
                        triggerClassName="btn btn-ghost btn-sm"
                        triggerStyle={{ color: 'var(--red)' }}
                        triggerTitle={isReleased
                          ? 'Beurteilung entfernen — freigegebene Versionen bleiben für Audit erhalten.'
                          : 'Entwurf löschen.'}
                        title={isReleased
                          ? `Beurteilung „${g.title}" entfernen?`
                          : `Entwurf „${g.title}" löschen?`}
                        description={isReleased
                          ? <>Diese Gefährdungsbeurteilung wird aus Ihrer Mappe entfernt. <strong>Bereits freigegebene Versionen bleiben unveränderlich gespeichert</strong> und sind weiterhin über ihre Versions-ID auffindbar.</>
                          : <>Dieser Entwurf wird dauerhaft entfernt. Es liegt noch keine freigegebene Version vor, daher gibt es keine archivierten Snapshots.</>}
                        audit={isReleased ? (
                          <>
                            <strong>Audit-Hinweis:</strong> Die kryptografisch eingefrorenen
                            Versionen bleiben für Prüfungs- und Nachweiszwecke vollständig
                            erhalten. Gelöscht wird nur der aktive Eintrag in dieser Mappe.
                          </>
                        ) : null}
                        confirmLabel={isReleased ? 'Beurteilung entfernen' : 'Entwurf löschen'}
                        tone="danger"
                        action={deleteGbuAction.bind(null, bundle.id, g.id)}
                      />
                    );
                  })()}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Neue GBU hinzufügen — vordefinierte Arbeitsbereiche */}
      <section className="account-section" style={{ marginTop: '1.5rem' }}>
        <h2>Arbeitsbereich hinzufügen</h2>
        <div className="section-sub">
          Wähle einen typischen Bereich aus oder lege weiter unten einen eigenen an.
          Bereiche, die bereits in dieser Mappe existieren, sind ausgeblendet.
        </div>
        <div className="area-grid">
          {SCOPES.filter((s) => s.slug !== 'eigener' && !usedScopes.has(s.slug)).map((s) => {
            const isSuggested = suggestions.find((x) => x.slug === s.slug);
            return (
              <form key={s.slug} action={createGbuAction}>
                <input type="hidden" name="bundle_id" value={bundle.id} />
                <input type="hidden" name="scope_slug" value={s.slug} />
                <button type="submit" className="area-card area-card--fixed">
                  <div className="area-top">
                    <div className="area-ico">{s.icon}</div>
                    {isSuggested ? (
                      <span className="conf-badge conf-medium">empfohlen</span>
                    ) : null}
                  </div>
                  <div className="area-title">{s.title}</div>
                  <div className="area-text">
                    {isSuggested?.reason ?? s.rationale}
                  </div>
                </button>
              </form>
            );
          })}
        </div>

        {/* Eigener Arbeitsbereich */}
        <div className="custom-area-block">
          <div className="custom-area-block-head">
            <div className="custom-area-block-ico">✏️</div>
            <div>
              <div className="custom-area-block-title">Eigenen Arbeitsbereich anlegen</div>
              <div className="custom-area-block-sub">
                Für spezielle Tätigkeiten, die nicht durch die typischen Bereiche abgedeckt werden
                (z.&nbsp;B. „Sanitärmontage", „Inventur Außenlager").
              </div>
            </div>
          </div>
          <form action={createGbuAction} className="custom-area-form">
            <input type="hidden" name="bundle_id" value={bundle.id} />
            <input type="hidden" name="scope_slug" value="eigener" />
            <input
              type="text"
              name="custom_title"
              required
              minLength={3}
              maxLength={80}
              pattern="[A-Za-z0-9äöüÄÖÜß \-.,/&()]{3,80}"
              placeholder="z. B. Sanitärmontage im Kundenobjekt"
              className="custom-area-input"
              aria-label="Name des Arbeitsbereichs"
            />
            <button type="submit" className="btn btn-primary">
              Arbeitsbereich anlegen
            </button>
          </form>
          <div className="custom-area-hint">
            3–80 Zeichen · Buchstaben, Ziffern, Leerzeichen und <code>- . , / &amp; ( )</code> erlaubt.
            Keine Personennamen, keine sensiblen Daten.
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import type { Quota } from '@/lib/quota/server';

export function QuotaCard({ quota }: { quota: Quota | null }) {
  if (!quota) return null;

  if (quota.is_unlimited) {
    return (
      <div className="quota-card">
        <div className="quota-icon">⭐</div>
        <div className="quota-body">
          <div className="quota-title">{quota.plan_name}-Plan aktiv</div>
          <div className="quota-desc">
            Unbegrenzte Beurteilungen freigeben. Vielen Dank, dass du SU24 nutzt!
          </div>
        </div>
        <Link href="/app/account" className="btn btn-secondary">
          Plan verwalten
        </Link>
      </div>
    );
  }

  const pct = quota.max ? Math.min(100, (quota.used / quota.max) * 100) : 0;
  const exhausted = quota.is_exhausted;

  return (
    <div className="quota-card">
      <div className="quota-icon">{exhausted ? '🔒' : '🧠'}</div>
      <div className="quota-body">
        <div className="quota-title">
          {quota.plan_name}-Plan · {quota.used} von {quota.max} Releases verbraucht
        </div>
        <div className="quota-desc">
          {exhausted
            ? 'Dein Free-Limit ist erreicht. Du kannst weiter Entwürfe bearbeiten — für eine weitere Freigabe ist ein Upgrade nötig.'
            : 'Im Free-Plan kannst du eine Gefährdungsbeurteilung freigeben und als PDF exportieren.'}
        </div>
        <div className="quota-progress-wrap">
          <div
            className={`quota-progress ${exhausted ? 'is-full' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Link href="/app/upgrade" className="btn btn-primary">
        {exhausted ? 'Jetzt upgraden' : 'Plan ansehen'}
      </Link>
    </div>
  );
}

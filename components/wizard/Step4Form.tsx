'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { saveStep4 } from '@/app/actions/wizard';
import { WIZARD_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import type { RaRiskCatalog } from '@/lib/db/types';

export function Step4Form({
  assessmentId,
  suggestedRisks,
  allRisks,
  selected
}: {
  assessmentId: string;
  suggestedRisks: RaRiskCatalog[];
  allRisks: RaRiskCatalog[];
  selected: string[];
}) {
  const [state, formAction] = useFormState(
    saveStep4.bind(null, assessmentId),
    WIZARD_INITIAL
  );
  const fbState: AuthState = { ok: state.ok, error: state.error };

  // Default: alle vorgeschlagenen Risiken angekreuzt
  const initialSet = new Set(
    selected.length > 0 ? selected : suggestedRisks.map((r) => r.slug)
  );
  const [sel, setSel] = useState<Set<string>>(initialSet);
  const [showMore, setShowMore] = useState(false);

  const suggestedSet = new Set(suggestedRisks.map((r) => r.slug));
  const others = allRisks.filter((r) => !suggestedSet.has(r.slug));

  const toggle = (slug: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const acceptAll = () => {
    const next = new Set(sel);
    suggestedRisks.forEach((r) => next.add(r.slug));
    setSel(next);
  };
  const clearAll = () => setSel(new Set());

  return (
    <form action={formAction}>
      <FormFeedback state={fbState} />

      <div className="alert-banner is-info" style={{ marginBottom: 16, marginTop: 0 }}>
        <span className="alert-banner-icon">✨</span>
        <div className="alert-banner-text">
          <strong>{suggestedRisks.length} Risiken vorausgewählt</strong> —
          aus deinen Arbeitsbereichen abgeleitet. Behalten oder einzeln ab/an.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={acceptAll}>
          ✓ Alle übernehmen
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
          ✗ Alle abwählen
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>
          {sel.size} ausgewählt
        </span>
      </div>

      <div className="risk-grid" style={{ marginBottom: 16 }}>
        {suggestedRisks.map((r) => (
          <label key={r.slug} className={`risk-btn ${sel.has(r.slug) ? 'active' : ''}`}>
            <input
              type="checkbox"
              name="risk_slug"
              value={r.slug}
              checked={sel.has(r.slug)}
              onChange={() => toggle(r.slug)}
            />
            {r.name}
          </label>
        ))}
      </div>

      {others.length > 0 && !showMore && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowMore(true)}
        >
          + Weitere Risiken anzeigen ({others.length})
        </button>
      )}
      {showMore && others.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-3)', margin: '12px 0 8px' }}>
            Weitere Risiken (optional, nicht typisch für deine Bereiche)
          </div>
          <div className="risk-grid">
            {others.map((r) => (
              <label key={r.slug} className={`risk-btn ${sel.has(r.slug) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  name="risk_slug"
                  value={r.slug}
                  checked={sel.has(r.slug)}
                  onChange={() => toggle(r.slug)}
                />
                {r.name}
              </label>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/wizard/${assessmentId}/3`}>‹ Zurück</a>
        <SubmitButton pendingLabel="Speichere …">Weiter ›</SubmitButton>
      </div>
    </form>
  );
}

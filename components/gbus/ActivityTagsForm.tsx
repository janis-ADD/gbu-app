'use client';

import { useFormState } from 'react-dom';
import { saveGbuStep1 } from '@/app/actions/gbus';
import { WIZARD_INITIAL, type AuthState } from '@/lib/forms/states';
import { SubmitButton } from '@/components/auth/SubmitButton';
import { FormFeedback } from '@/components/auth/FormFeedback';
import {
  WORK_HEIGHTS, MOBILITY, ENVIRONMENTS, TOOLS,
  HAZARDOUS_SUBSTANCES, WORKFORCE, PSYCHOLOGICAL,
  INTENSITIES, EXPOSURES,
  type ActivityTags, type Intensity, type Exposure
} from '@/lib/wizard/activities';
import { COPY } from '@/lib/copy/microcopy';

/**
 * Step 1: Tätigkeits-Tags strukturiert erfassen.
 *
 * Welche Dimensionen relevant sind, kommt aus SCOPE_QUESTIONS (Server).
 * Defaults werden vorab gesetzt (60-s-Doktrin), Nutzer:in klickt durch.
 *
 * Sonderfall „intensity"/"exposure": werden in einer eigenen GuidedContext-
 * Sektion am Ende dargestellt — als geführte Fragen mit Beispiel, NICHT
 * als rohe Dropdowns. Phase-1-Doktrin: Guided Input statt SAP-Maske.
 */
export function ActivityTagsForm({
  bundleId, gbuId,
  title,
  isCustomScope,
  description,
  tags,
  dimensions
}: {
  bundleId: string;
  gbuId: string;
  title: string;
  isCustomScope: boolean;
  description: string;
  tags: ActivityTags;
  dimensions: Array<keyof ActivityTags>;
}) {
  const [state, action] = useFormState(
    saveGbuStep1.bind(null, bundleId, gbuId), WIZARD_INITIAL
  );
  const fb: AuthState = { ok: state.ok, error: state.error };

  const showIntensity = dimensions.includes('intensity');
  const showExposure  = dimensions.includes('exposure');
  const showContext   = showIntensity || showExposure;

  return (
    <form action={action}>
      <FormFeedback state={fb} />

      <div className="safety-hint">
        <span className="safety-ico">🛡️</span>
        <div>
          <strong>{COPY.safetyHints.step1.strong}</strong>{' '}
          {COPY.safetyHints.step1.body}
        </div>
      </div>

      <div className="field wide" style={{ marginBottom: 18 }}>
        <label>
          Beurteilung benennen
          {isCustomScope ? <span className="req"> *</span> : null}
          {!isCustomScope ? (
            <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>
              (empfohlen: konkretisieren)
            </span>
          ) : null}
        </label>
        <input
          name="title"
          type="text"
          defaultValue={title}
          required={isCustomScope}
          minLength={3}
          maxLength={80}
          pattern="[A-Za-z0-9äöüÄÖÜß ·\-.,/&()]{3,80}"
          placeholder="z. B. Werkstatt Standort Nord oder Büro Verwaltung"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-1)'
          }}
        />
        <div className="field-hint">
          Ein sprechender Name hilft Ihnen, später schnell die richtige Beurteilung
          wiederzufinden — z. B. „Werkstatt Standort Nord" oder „Anstrich Innenräume".
          Keine Personennamen, keine sensiblen Daten.
        </div>
      </div>

      <div className="field wide" style={{ marginBottom: 18 }}>
        <label>Tätigkeit kurz beschreiben (optional)</label>
        <textarea
          name="description"
          defaultValue={description}
          placeholder="z. B. Anstrich Innenräume mit Farben/Lacken, gelegentlich Fassadenarbeit mit Leitern."
          rows={2}
        />
      </div>

      {dimensions.includes('work_height') && (
        <RadioDim
          name="work_height"
          label="Arbeit in der Höhe"
          options={WORK_HEIGHTS}
          value={tags.work_height ?? ''}
        />
      )}
      {dimensions.includes('mobility') && (
        <RadioDim
          name="mobility"
          label="Mobilität / Einsatzort"
          options={MOBILITY}
          value={tags.mobility ?? ''}
        />
      )}
      {dimensions.includes('environment') && (
        <MultiDim
          name="environment"
          label="Umgebung (Mehrfachauswahl)"
          options={ENVIRONMENTS}
          values={tags.environment ?? []}
        />
      )}
      {dimensions.includes('tools') && (
        <MultiDim
          name="tools"
          label="Eingesetzte Werkzeuge / Arbeitsmittel"
          options={TOOLS}
          values={tags.tools ?? []}
        />
      )}
      {dimensions.includes('hazardous_substances') && (
        <MultiDim
          name="hazardous_substances"
          label="Gefahrstoffe in dieser Tätigkeit"
          options={HAZARDOUS_SUBSTANCES}
          values={tags.hazardous_substances ?? []}
        />
      )}
      {dimensions.includes('workforce') && (
        <MultiDim
          name="workforce"
          label="Personalkonstellation"
          options={WORKFORCE}
          values={tags.workforce ?? []}
        />
      )}
      {dimensions.includes('psychological') && (
        <MultiDim
          name="psychological"
          label="Psychische Belastungsfaktoren (ArbSchG §5 seit 2013)"
          options={PSYCHOLOGICAL}
          values={tags.psychological ?? []}
        />
      )}

      {showContext && (
        <GuidedContextSection
          showIntensity={showIntensity}
          showExposure={showExposure}
          intensity={tags.intensity}
          exposure={tags.exposure}
        />
      )}

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn btn-secondary" href={`/app/bundles/${bundleId}`}>‹ Zurück zur Mappe</a>
        <SubmitButton pendingLabel="Speichere …">Weiter zur Risiko-Ableitung ›</SubmitButton>
      </div>
    </form>
  );
}

/* ─── Guided Context: intensity + exposure als geführte Fragen ────── */

type IntensityOption = { value: Intensity; title: string; example: string };
type ExposureOption  = { value: Exposure;  title: string; example: string };

const INTENSITY_QUESTIONS: IntensityOption[] = [
  {
    value: 'gelegentlich',
    title: 'Gelegentlich',
    example: 'Seltener als einmal pro Woche — z. B. nur bei einzelnen Aufträgen.'
  },
  {
    value: 'regelmaessig',
    title: 'Regelmäßig',
    example: 'Mehrmals pro Woche, aber nicht jeden Arbeitstag.'
  },
  {
    value: 'taeglich',
    title: 'Täglich',
    example: 'Gehört zum normalen Arbeitsalltag.'
  },
  {
    value: 'dauerhaft',
    title: 'Dauerhaft',
    example: 'Mehr als die Hälfte der Arbeitszeit — z. B. die Haupttätigkeit.'
  }
];

const EXPOSURE_QUESTIONS: ExposureOption[] = [
  {
    value: 'gering',
    title: 'Gering',
    example: 'Kurze Kontakte, kleine Mengen — z. B. punktuelle Arbeitsschritte.'
  },
  {
    value: 'mittel',
    title: 'Mittel',
    example: 'Regelmäßige, abgegrenzte Kontaktzeiten innerhalb eines Arbeitsschritts.'
  },
  {
    value: 'hoch',
    title: 'Hoch',
    example: 'Langanhaltend, größere Mengen, mehrere Schritte hintereinander.'
  }
];

function GuidedContextSection({
  showIntensity, showExposure, intensity, exposure
}: {
  showIntensity: boolean;
  showExposure: boolean;
  intensity?: Intensity;
  exposure?: Exposure;
}) {
  return (
    <div className="guided-context" style={{
      marginTop: 28,
      padding: '18px 18px 6px',
      background: 'var(--blue-bg, #f0f7ff)',
      borderRadius: 12,
      border: '1px solid var(--blue-border, #d6e4f0)'
    }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--petrol, #1B6CA8)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          Kontext zur Tätigkeit
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--text-1)' }}>
            {COPY.safetyHints.activityTagsContext.strong}
          </strong>{' '}
          {COPY.safetyHints.activityTagsContext.body}
        </div>
      </div>

      {showIntensity && (
        <GuidedQuestion
          name="intensity"
          question="Wie häufig wird diese Tätigkeit ausgeführt?"
          help="Damit lässt sich einordnen, ob es sich um eine seltene Sonderarbeit oder eine alltägliche Tätigkeit handelt — die Bewertung wird entsprechend justiert."
          options={INTENSITY_QUESTIONS}
          value={intensity ?? ''}
        />
      )}

      {showExposure && (
        <GuidedQuestion
          name="exposure"
          question="Wie stark ist der Kontakt zu den genannten Belastungen?"
          help="Z. B. Gefahrstoffe, Lärm, Hitze, Heben & Tragen. Wenn keine Belastung vorliegt, lassen Sie das Feld leer."
          options={EXPOSURE_QUESTIONS}
          value={exposure ?? ''}
        />
      )}

      <div style={{
        marginTop: 6, padding: '8px 0', fontSize: 11.5,
        color: 'var(--text-3)', lineHeight: 1.5, textAlign: 'left'
      }}>
        {COPY.trust.canBeEditedLater} {COPY.trust.derivationBasis}
      </div>
    </div>
  );
}

function GuidedQuestion<T extends string>({
  name, question, help, options, value
}: {
  name: string;
  question: string;
  help: string;
  options: ReadonlyArray<{ value: T; title: string; example: string }>;
  value: string;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
      <legend style={{ padding: 0, marginBottom: 4, fontSize: 14, fontWeight: 650, color: 'var(--text-1)' }}>
        {question}
      </legend>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.55 }}>
        {help}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 8
      }}>
        {options.map((o) => {
          const isActive = value === o.value;
          return (
            <label
              key={o.value}
              className={`guided-card ${isActive ? 'is-active' : ''}`}
              style={{
                display: 'block',
                padding: '11px 13px',
                borderRadius: 10,
                border: `1px solid ${isActive ? 'var(--petrol, #1B6CA8)' : 'var(--border, #d6e4f0)'}`,
                background: isActive ? 'var(--petrol, #1B6CA8)' : '#fff',
                color: isActive ? '#fff' : 'var(--text-1)',
                cursor: 'pointer',
                transition: 'all 120ms ease'
              }}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                defaultChecked={isActive}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>{o.title}</div>
              <div style={{
                fontSize: 11.5,
                lineHeight: 1.5,
                color: isActive ? 'rgba(255,255,255,0.78)' : 'var(--text-3)'
              }}>
                {o.example}
              </div>
            </label>
          );
        })}
        <label
          className={`guided-card ${!value ? 'is-active' : ''}`}
          style={{
            display: 'block',
            padding: '11px 13px',
            borderRadius: 10,
            border: `1px dashed ${!value ? 'var(--petrol, #1B6CA8)' : 'var(--border, #d6e4f0)'}`,
            background: !value ? 'rgba(27,108,168,0.06)' : '#fff',
            color: !value ? 'var(--petrol, #1B6CA8)' : 'var(--text-3)',
            cursor: 'pointer',
            transition: 'all 120ms ease'
          }}
        >
          <input
            type="radio"
            name={name}
            value=""
            defaultChecked={!value}
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Noch nicht sicher</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
            Lasse das Feld leer — Sie können es später ergänzen.
          </div>
        </label>
      </div>
    </fieldset>
  );
}

/* ─── kleine Helfer-Atome ──────────────────────────────────────────── */
function RadioDim({
  name, label, options, value
}: {
  name: string; label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {options.map((o) => (
          <label key={o.value} className={`risk-btn ${value === o.value ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
            <input type="radio" name={name} value={o.value} defaultChecked={value === o.value} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function MultiDim({
  name, label, options, values
}: {
  name: string; label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  values: string[];
}) {
  const set = new Set(values);
  return (
    <div className="field" style={{ marginBottom: 14 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {options.map((o) => (
          <label key={o.value} className={`risk-btn ${set.has(o.value) ? 'active' : ''}`} style={{ cursor: 'pointer' }}>
            <input type="checkbox" name={name} value={o.value} defaultChecked={set.has(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Suppress unused import warning — Intensity/Exposure types used as generics above
export type _GuidedTypeRef = Intensity | Exposure;

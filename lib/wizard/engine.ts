/**
 * Deterministische Ableitungs-Engine.
 *
 * Input:  Activity-Tags einer GBU
 * Output: getriggerte Risiken (mit Begründungen) + empfohlene Maßnahmen
 *         (mit Pflicht-Markierung) + Missing-Controls + Plausibilitäts-Warnungen
 *
 * Reines In-Memory-Matching gegen die kuratierten Stammdaten — keine KI.
 * Siehe Memory: taetigkeits-engine-doktrin.md
 *
 * ─── Compliance-Doktrin ──────────────────────────────────────────────
 * Eine veröffentlichte GBU ist ein UNVERÄNDERLICHES Artefakt. Die Engine
 * wird zur Release-Zeit EINMAL ausgeführt, das vollständige Ergebnis wird
 * serialisiert und in ra_gbu_versions.snapshot eingefroren. Die Version-
 * Page liest ausschließlich aus dem Snapshot — niemals neu derivieren.
 *
 * ENGINE_VERSION muss bei jeder bedeutsamen Änderung der Ableitungslogik
 * erhöht werden (SemVer). Diese Version wird im Snapshot mitgespeichert,
 * damit reproduzierbar bleibt, mit welcher Engine-Version eine Version
 * erstellt wurde.
 */

import { createHash } from 'node:crypto';
import { labelForTag, type ActivityTags, type Intensity, type Exposure, type ExposedPersonsBucket } from './activities';
import { stableStringify } from './stable-stringify';
import type { RaRiskCatalog, RaMeasureCatalog, RaLegalRef } from '@/lib/db/types';

/** SemVer der Ableitungs-Engine (TypeScript-Algorithmus in deriveGbu). */
export const ENGINE_VERSION = '1.1.0';

/** Aktuelles Schema der Engine-Snapshot-Struktur. Bei breaking changes bumpen.
 *  v2 (Iteration 1+2+3): DerivedRisk und DerivedMeasure tragen ADDITIVE
 *  optionale Felder (adjusted_likelihood, weighting_applied, obligation_type,
 *  priority, urgency). Alte v2-Snapshots ohne diese Felder bleiben gültig. */
export const ENGINE_SNAPSHOT_SCHEMA_VERSION = 2;

export type TriggerReason = {
  dimension: keyof ActivityTags;
  value: string;
  label: string; // menschen-lesbar, z.B. "Höhe: über 2 m"
};

export type DerivedRisk = {
  risk: RaRiskCatalog;
  triggers: TriggerReason[];
  is_mandatory: boolean;          // mindestens ein Pflicht-Trigger (z.B. Gefahrstoff)
  severity: number;
  likelihood: number;
  /* ─── Iteration 3 (additiv, optional) ───────────────────────────── */
  /** likelihood VOR dem Exposure-/Intensitäts-Weighting (= Catalog-Default) */
  base_likelihood?: number;
  /** Ob ein Weighting durch Kontext-Tags (intensity/exposure) angewendet wurde */
  weighting_applied?: boolean;
};

/**
 * Abstufung der Verbindlichkeit einer Maßnahme.
 *   hinweis     — niedrigste Stufe, informativer Hinweis
 *   empfehlung  — fachlich empfohlen, keine harte Verpflichtung
 *   angebot     — Angebotsvorsorge im ArbMedVV-Sinn ODER
 *                  Pflicht mit geringer Exposition (downgegradet)
 *   pflicht     — Pflichtvorsorge oder gesetzliche Pflicht
 *
 * Wir geben bewusst KEINE medizinische Beratung — nur die formale
 * Verpflichtungs-Stufe nach gängiger ArbSchG/ArbMedVV-Terminologie.
 */
export type ObligationType = 'hinweis' | 'empfehlung' | 'angebot' | 'pflicht';

/**
 * Bearbeitungs-Priorität für Maßnahmen.
 *   sofort        — unmittelbar zu prüfen (Pflicht + hohes Risiko)
 *   kurzfristig   — innerhalb 30 Tagen
 *   mittelfristig — innerhalb 3 Monaten
 *   langfristig   — innerhalb 12 Monaten
 *
 * Bestimmt durch Obligation-Type + Risk-Score + Anzahl exponierter
 * Personen. Geschäftsführer-tauglich, kein medizinisches Urteil.
 */
export type Priority = 'sofort' | 'kurzfristig' | 'mittelfristig' | 'langfristig';

/**
 * Dringlichkeit aus Audit-Sicht (visuelles Sortier-Signal für PDF/UI).
 *   kritisch — Pflicht-Vorsorge oder hohes Risiko unzureichend adressiert
 *   hoch     — Pflicht-Maßnahme, Standard-Priorität
 *   mittel   — empfohlen, Score ≥ 12
 *   niedrig  — Hinweis, niedrige Exposition
 */
export type Urgency = 'kritisch' | 'hoch' | 'mittel' | 'niedrig';

export type DerivedMeasure = {
  measure: RaMeasureCatalog;
  for_risks: string[];
  is_mandatory: boolean;
  mandatory_reason: string | null;
  /* ─── Iteration 3 (additiv, optional) ───────────────────────────── */
  obligation_type?: ObligationType;
  priority?: Priority;
  urgency?: Urgency;
};

export type MissingControl = {
  code: 'betriebsanweisung' | 'psa-konzept' | 'unterweisung' | 'gefahrstoffverzeichnis' | 'notsignal-alleinarbeit';
  message: string;
  legal_basis: string;            // §, DGUV-Nr.
  suggested_action: string;
};

export type PlausibilityWarning = {
  code: string;
  message: string;
};

export type DerivationResult = {
  risks: DerivedRisk[];
  measures: DerivedMeasure[];
  missing_controls: MissingControl[];
  plausibility: PlausibilityWarning[];
  summary: {
    n_risks: number;
    n_mandatory_measures: number;
    n_missing_controls: number;
  };
};

/* ─── Helpers ──────────────────────────────────────────────────────── */

function dimensionValues(tags: ActivityTags, dim: keyof ActivityTags): string[] {
  const v = tags[dim];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function matchesAny(
  conditions: Record<string, string[]> | undefined,
  tags: ActivityTags
): TriggerReason[] {
  if (!conditions) return [];
  const reasons: TriggerReason[] = [];
  for (const [dim, accepted] of Object.entries(conditions)) {
    const actual = dimensionValues(tags, dim as keyof ActivityTags);
    for (const val of actual) {
      if (accepted.includes(val)) {
        reasons.push({
          dimension: dim as keyof ActivityTags,
          value: val,
          label: `${humanDimension(dim)}: ${labelForTag(dim, val)}`
        });
      }
    }
  }
  return reasons;
}

function humanDimension(dim: string): string {
  switch (dim) {
    case 'work_height':           return 'Höhe';
    case 'mobility':              return 'Mobilität';
    case 'environment':           return 'Umgebung';
    case 'tools':                 return 'Werkzeuge';
    case 'hazardous_substances':  return 'Gefahrstoffe';
    case 'workforce':             return 'Personal';
    case 'psychological':         return 'Belastung';
    default:                      return dim;
  }
}

function hasAnyHazardousSubstance(tags: ActivityTags): boolean {
  const subs = tags.hazardous_substances ?? [];
  return subs.some((s) => s !== 'keine');
}

/* ─── Iteration 3 — Weighting & Priorisierung ────────────────────────
 * Konservative Multiplikatoren. Wenn intensity/exposure NICHT gesetzt
 * sind, ist der kombinierte Multiplikator 1.0 → Verhalten identisch
 * zu Iteration 2 (Backward-Compat).
 */

const INTENSITY_FACTOR: Record<Intensity, number> = {
  gelegentlich: 0.6,
  regelmaessig: 0.85,
  taeglich:     1.0,
  dauerhaft:    1.15
};

const EXPOSURE_FACTOR: Record<Exposure, number> = {
  gering: 0.7,
  mittel: 1.0,
  hoch:   1.2
};

/**
 * Passt die Likelihood eines Risikos an Kontext-Tags an. Severity bleibt
 * unberührt — eine schwere Verletzung ist eine schwere Verletzung, auch
 * wenn sie selten passiert. Aber die WAHRSCHEINLICHKEIT des Eintretens
 * pro Zeitintervall skaliert mit Häufigkeit + Expositionsmenge.
 *
 * Ergebnis ist auf [1, 5] geclampt und gerundet, damit das Score-Modell
 * (severity × likelihood ∈ [1..25]) intakt bleibt.
 */
export function weightLikelihood(baseLikelihood: number, tags: ActivityTags): {
  adjusted: number;
  applied: boolean;
} {
  const intFactor = tags.intensity ? INTENSITY_FACTOR[tags.intensity] : 1.0;
  const expFactor = tags.exposure  ? EXPOSURE_FACTOR[tags.exposure]   : 1.0;
  const applied = !!(tags.intensity || tags.exposure);
  if (!applied) return { adjusted: baseLikelihood, applied: false };
  const raw = baseLikelihood * intFactor * expFactor;
  const clamped = Math.max(1, Math.min(5, Math.round(raw)));
  return { adjusted: clamped, applied: true };
}

/**
 * Bestimmt den ObligationType einer Maßnahme aus Mandatory-Flag und
 * Kontext (Exposition + Intensität). Konservative Logik:
 *   - is_mandatory + exposure=hoch        → 'pflicht'
 *   - is_mandatory + standard             → 'pflicht'
 *   - is_mandatory + exposure=gering + intensity=gelegentlich → 'angebot'
 *     (z. B. seltene Tätigkeit mit niedriger Exposition — Angebotsvorsorge
 *      statt Pflichtvorsorge)
 *   - nicht-mandatory + confidence=high   → 'empfehlung'
 *   - nicht-mandatory + confidence=medium → 'hinweis'
 *
 * Wir bleiben bewusst defensiv: lieber „Angebot" als „nichts".
 */
export function determineObligationType(
  measure: RaMeasureCatalog,
  isMandatory: boolean,
  tags: ActivityTags
): ObligationType {
  if (isMandatory) {
    // Downgrade-Bedingung: gelegentlich + geringe Exposition
    if (tags.intensity === 'gelegentlich' && tags.exposure === 'gering') {
      return 'angebot';
    }
    return 'pflicht';
  }
  if (measure.confidence === 'high') return 'empfehlung';
  return 'hinweis';
}

/**
 * Bestimmt Priority + Urgency aus ObligationType + Risk-Score-Kontext +
 * Anzahl exponierter Personen.
 *
 * Personen-Modifier: ab 20+ Beschäftigten wird jede Maßnahme um eine
 * Stufe hochgesetzt (mehr Betroffene = mehr Audit-Sichtbarkeit).
 */
export function determinePriority(
  obligation: ObligationType,
  maxRiskScore: number,
  exposedPersons: ExposedPersonsBucket | undefined
): { priority: Priority; urgency: Urgency } {
  let priority: Priority;
  let urgency: Urgency;

  if (obligation === 'pflicht' && maxRiskScore >= 16) {
    priority = 'sofort';      urgency = 'kritisch';
  } else if (obligation === 'pflicht') {
    priority = 'kurzfristig'; urgency = 'hoch';
  } else if (obligation === 'angebot') {
    priority = 'kurzfristig'; urgency = 'hoch';
  } else if (obligation === 'empfehlung' && maxRiskScore >= 12) {
    priority = 'mittelfristig'; urgency = 'mittel';
  } else if (obligation === 'empfehlung') {
    priority = 'langfristig'; urgency = 'niedrig';
  } else {
    priority = 'langfristig'; urgency = 'niedrig';
  }

  // Personen-Modifier: 20+ → eine Stufe hochsetzen, max bis 'sofort'
  if (exposedPersons === '20_plus') {
    if (priority === 'langfristig')   { priority = 'mittelfristig'; urgency = 'mittel'; }
    else if (priority === 'mittelfristig') { priority = 'kurzfristig'; urgency = 'hoch'; }
    else if (priority === 'kurzfristig')   { priority = 'sofort';     urgency = 'kritisch'; }
  }
  return { priority, urgency };
}

/* ─── Engine ───────────────────────────────────────────────────────── */

export function deriveGbu(
  tags: ActivityTags,
  riskCatalog: RaRiskCatalog[],
  measureCatalog: RaMeasureCatalog[]
): DerivationResult {

  /* 1. Risiken triggern + Likelihood gewichten ------------------------ */
  const derivedRisks: DerivedRisk[] = [];
  for (const risk of riskCatalog) {
    const triggers = matchesAny(risk.trigger_conditions, tags);
    if (triggers.length === 0) continue;
    const severity = risk.severity_default ?? 3;
    const baseLikelihood = risk.likelihood_default ?? 3;
    const weighting = weightLikelihood(baseLikelihood, tags);
    derivedRisks.push({
      risk,
      triggers,
      is_mandatory: !!(risk.requires_betriebsanweisung || risk.requires_psa),
      severity,
      likelihood: weighting.adjusted,
      ...(weighting.applied ? {
        base_likelihood: baseLikelihood,
        weighting_applied: true
      } : {})
    });
  }
  // Sortierung: höhere Schwere×Wahrscheinlichkeit zuerst
  derivedRisks.sort((a, b) => (b.severity * b.likelihood) - (a.severity * a.likelihood));

  // Höchster Risk-Score wird für die Priorisierung gebraucht
  const maxRiskScore = derivedRisks.length === 0 ? 0
    : Math.max(...derivedRisks.map((r) => r.severity * r.likelihood));

  const riskSlugs = new Set(derivedRisks.map((r) => r.risk.slug));

  /* 2. Maßnahmen ableiten --------------------------------------------- */
  const derivedMeasures: DerivedMeasure[] = [];
  const anySubstance = hasAnyHazardousSubstance(tags);

  for (const m of measureCatalog) {
    // welche Risiken deckt diese Maßnahme ab?
    const forRisks = m.applies_to_risks.filter((s) => riskSlugs.has(s));
    if (forRisks.length === 0) continue;

    // Pflicht-Check
    let isMandatory = false;
    let reason: string | null = null;
    const cond = m.is_mandatory_when;
    if (cond) {
      if (cond.any_substance && anySubstance) {
        isMandatory = true;
        reason = 'GefStoffV — bei Einsatz von Gefahrstoffen';
      } else if (cond.risks?.some((r) => riskSlugs.has(r))) {
        const matched = cond.risks.filter((r) => riskSlugs.has(r));
        isMandatory = true;
        reason = `Pflicht-Maßnahme für Risiko(en): ${matched.join(', ')}`;
      } else if (cond.work_height?.length) {
        const heights = dimensionValues(tags, 'work_height');
        if (cond.work_height.some((h) => heights.includes(h))) {
          isMandatory = true;
          reason = `Pflicht ab Höhe ${cond.work_height.join('/')}`;
        }
      }
    }

    const obligation_type = determineObligationType(m, isMandatory, tags);
    const { priority, urgency } = determinePriority(obligation_type, maxRiskScore, tags.exposed_persons);
    derivedMeasures.push({
      measure: m,
      for_risks: forRisks,
      is_mandatory: isMandatory,
      mandatory_reason: reason,
      obligation_type,
      priority,
      urgency
    });
  }
  // Sortierung: Pflicht zuerst, dann TOP (technisch>org>persönlich)
  const topRank = (c: string) =>
    c === 'technisch' ? 0 : c === 'organisatorisch' ? 1 : 2;
  derivedMeasures.sort((a, b) => {
    if (a.is_mandatory !== b.is_mandatory) return a.is_mandatory ? -1 : 1;
    return topRank(a.measure.category) - topRank(b.measure.category);
  });

  /* 3. Missing Controls — fachliche Pflichten ohne explizite Maßnahme  */
  const missing: MissingControl[] = [];

  if (anySubstance) {
    // Pflicht: Betriebsanweisung + Gefahrstoffverzeichnis
    const hasBa = derivedMeasures.some((m) => m.measure.slug === 'sdb-verfuegbar' && m.is_mandatory);
    const hasVz = derivedMeasures.some((m) => m.measure.slug === 'gefahrstoffverzeichnis' && m.is_mandatory);
    if (!hasBa) missing.push({
      code: 'betriebsanweisung',
      message: 'Betriebsanweisung für eingesetzte Gefahrstoffe nicht im Maßnahmen-Set.',
      legal_basis: 'GefStoffV §14',
      suggested_action: 'SDB des Lieferanten als Grundlage nutzen, Betriebsanweisung erstellen.'
    });
    if (!hasVz) missing.push({
      code: 'gefahrstoffverzeichnis',
      message: 'Gefahrstoffverzeichnis nicht im Maßnahmen-Set.',
      legal_basis: 'GefStoffV §6',
      suggested_action: 'Verzeichnis aller eingesetzten Gefahrstoffe führen, jährlich prüfen.'
    });
  }

  const heights = dimensionValues(tags, 'work_height');
  if (heights.includes('ueber-2m') || heights.includes('fassade-dach')) {
    const hasPsa = derivedMeasures.some((m) => m.measure.slug === 'psa-bereitstellen' && m.is_mandatory);
    if (!hasPsa) missing.push({
      code: 'psa-konzept',
      message: 'PSA-Konzept (insbesondere PSAgA) bei Arbeiten >2 m nicht erkennbar.',
      legal_basis: 'BetrSichV / DGUV-V1',
      suggested_action: 'PSA gegen Absturz (Auffanggurt) bereitstellen + Unterweisung.'
    });
  }

  const workforce = dimensionValues(tags, 'workforce');
  if (workforce.includes('alleinarbeit')) {
    const hasNotsignal = derivedMeasures.some((m) => m.measure.slug === 'alleinarbeit-erreichbar' && m.is_mandatory);
    if (!hasNotsignal) missing.push({
      code: 'notsignal-alleinarbeit',
      message: 'Erreichbarkeit bei Alleinarbeit nicht im Maßnahmen-Set.',
      legal_basis: 'DGUV-V1',
      suggested_action: 'Personen-Notsignal-System oder regelmäßige Check-ins einrichten.'
    });
  }

  /* 4. Plausibilitäts-Warnungen --------------------------------------- */
  const warnings: PlausibilityWarning[] = [];

  // Bildschirm-Tool aber keine plausible Innen-/Homeoffice-Umgebung.
  // (Hinweis: 'buero' ist KEIN gültiger environment-Tag; die Tag-Werte
  //  sind innen/aussen/kunde/homeoffice/werkstatt/lager. Plausibel sind
  //  innen + homeoffice; alles andere sollte erklärt werden.)
  if (
    dimensionValues(tags, 'tools').includes('bildschirm') &&
    !dimensionValues(tags, 'environment').some((e) => ['innen','homeoffice'].includes(e))
  ) {
    warnings.push({
      code: 'bildschirm-ohne-innenraum',
      message: 'Bildschirmarbeit angegeben, aber keine Innenraum- oder Homeoffice-Umgebung. Bitte präzisieren (z. B. Außendienst mit Tablet).'
    });
  }

  // Höhe >2m aber keine Leitern/Gerüst
  if (
    (heights.includes('ueber-2m') || heights.includes('fassade-dach')) &&
    !dimensionValues(tags, 'tools').some((t) => ['leitern','geruest'].includes(t))
  ) {
    warnings.push({
      code: 'hoehe-ohne-arbeitsmittel',
      message: 'Arbeit >2 m angegeben, aber keine Leiter/Gerüst als Arbeitsmittel. Welches Mittel wird genutzt?'
    });
  }

  // Fremdfirmen aber keine Baustelle/Werkstatt-Umgebung
  if (
    workforce.includes('fremdfirmen') &&
    !dimensionValues(tags, 'environment').some((e) => ['baustelle','werkstatt','lager'].includes(e))
  ) {
    warnings.push({
      code: 'fremdfirmen-umgebung-unklar',
      message: 'Fremdfirmen angegeben — Einsatzort bitte präzisieren (Baustelle/Werkstatt/Lager).'
    });
  }

  // Schichtarbeit ohne dokumentierte psychische Belastungsanalyse
  if (
    workforce.includes('schichtarbeit') &&
    dimensionValues(tags, 'psychological').every((p) => p === 'keine' || !p)
  ) {
    warnings.push({
      code: 'schichtarbeit-ohne-belastungsanalyse',
      message: 'Schicht- oder Nachtarbeit angegeben, aber keine psychischen Belastungsfaktoren dokumentiert. Eine spezifische Beurteilung gem. ArbSchG §5 wird empfohlen.'
    });
  }

  // Reinigungschemie ohne explizit angegebenen Hautkontakt-Risiko-Hinweis
  // (Reinigungschemie → in 97 % der Fälle Hautkontakt → triggert ohnehin
  //  hautkontakt-reizstoffe. Diese Warnung erscheint nur wenn der User
  //  Reinigungsmittel hat ohne weitere Schutzangaben.)
  if (
    dimensionValues(tags, 'hazardous_substances').includes('reinigung') &&
    !workforce.includes('alleinarbeit') &&
    !dimensionValues(tags, 'environment').some((e) => ['werkstatt','kunde'].includes(e))
  ) {
    warnings.push({
      code: 'reinigungschemie-kontext-unklar',
      message: 'Reinigungschemie angegeben — Einsatzbereich (Werkstatt, Kundenobjekt) und Kontaktintensität bitte präzisieren, damit der Hautschutzplan tätigkeitsbezogen erstellt werden kann.'
    });
  }

  // Fahrzeuge im Einsatz, aber keine Fahrer-bezogenen Belastungen dokumentiert
  if (
    (dimensionValues(tags, 'tools').includes('fahrzeuge') ||
     dimensionValues(tags, 'mobility').some((m) => m === 'fahrzeuge')) &&
    dimensionValues(tags, 'psychological').every((p) => p === 'keine' || !p)
  ) {
    warnings.push({
      code: 'fahrzeuge-ohne-belastungsdoku',
      message: 'Fahrzeugeinsatz angegeben — Belastungen aus dem Fahrbetrieb (Zeitdruck, Verantwortung für Personen/Ladung) werden bei Bedarf in Schritt „Psychische Belastung" ergänzt.'
    });
  }

  // Außenarbeit ohne UV-/Witterungs-Kontext (Phase 5)
  if (
    (dimensionValues(tags, 'mobility').includes('aussendienst') ||
     dimensionValues(tags, 'mobility').includes('baustelle')) &&
    dimensionValues(tags, 'environment').includes('aussen')
  ) {
    warnings.push({
      code: 'aussenarbeit-uv-witterung-pruefen',
      message: 'Außenarbeit angegeben — UV-Schutz (textil + Sonnencreme LSF ≥30), Hitze-Pausenregelung ab 30 °C und Trinkwasser-Bereitstellung bitte prüfen (ArbSchG §3).'
    });
  }

  // Homeoffice ohne ergonomische Beurteilung (Phase 5)
  if (dimensionValues(tags, 'environment').includes('homeoffice')) {
    warnings.push({
      code: 'homeoffice-beurteilung-erforderlich',
      message: 'Homeoffice / Telearbeit angegeben — schriftliche Beurteilung des Telearbeitsplatzes nach ArbStättV §1 ist Pflicht. Selbst-Checkliste reicht in der Regel aus (DGUV Information 215-441).'
    });
  }

  // Stäube + keine Atemschutz-Hinweise (Phase 5: Vorsorge-Hinweis)
  if (
    dimensionValues(tags, 'hazardous_substances').includes('staub_schleifen')
  ) {
    warnings.push({
      code: 'staub-arbeitsmedizinische-vorsorge',
      message: 'Schleif- oder mineralischer Staub angegeben — arbeitsmedizinische Vorsorge G26 (Atemschutz, falls Tragezeit >30 min/Schicht) und ggf. G44 (Hartholzstaub) prüfen.'
    });
  }

  // 2K-Lacke / Isocyanat-Hinweis bei Maler-Profil (Phase 5)
  if (
    dimensionValues(tags, 'hazardous_substances').includes('farben_lacke') &&
    dimensionValues(tags, 'environment').some((e) => ['werkstatt','innen'].includes(e))
  ) {
    warnings.push({
      code: 'isocyanate-fachkunde-pruefen',
      message: 'Lackverarbeitung in Innenräumen angegeben — bei 2K-Polyurethan-Lacken oder PUR-Schäumen ist Fachkunde nach TRGS 430 (Isocyanate) und ein geschlossenes System bzw. Absauganlage Pflicht. Substitution prüfen.'
    });
  }

  // Stapler-Einsatz im Lager (Phase 5)
  if (
    dimensionValues(tags, 'tools').includes('flurfoerderzeuge') &&
    dimensionValues(tags, 'environment').includes('lager')
  ) {
    warnings.push({
      code: 'verkehrswege-trennung-pruefen',
      message: 'Flurförderzeug-Einsatz im Lager angegeben — Trennung von Fußgänger- und Stapler-Verkehrswegen baulich oder durch Bodenmarkierung sicherstellen (DGUV V68 §12).'
    });
  }

  /* ─── Iteration 3 (v4-Plausibility): kontextsensitive Warnungen ─── */

  // Hohe Exposition gegen Gefahrstoffe ohne dokumentierte Vorsorge-Maßnahme
  if (
    tags.exposure === 'hoch' &&
    anySubstance
  ) {
    warnings.push({
      code: 'hohe-exposition-ohne-vorsorge',
      message: 'Hohe Exposition gegenüber Gefahrstoffen angegeben — arbeitsmedizinische Vorsorge (G24 bei Hautkontakt, G26 bei Atemschutz) wird in diesem Kontext zur Pflichtvorsorge. Bitte Vorsorge-Angebot durch Betriebsarzt verifizieren.'
    });
  }

  // Viele Beschäftigte ohne explizit kommunizierte Maßnahmen-Priorisierung
  if (
    tags.exposed_persons === '20_plus' &&
    derivedRisks.length >= 3
  ) {
    warnings.push({
      code: 'viele-personen-priorisierung-pruefen',
      message: 'Mehr als 20 betroffene Beschäftigte und ≥3 erkannte Gefährdungen — Reihenfolge der Maßnahmen-Umsetzung priorisieren (sofort/kurzfristig/mittelfristig) und kommunizieren. Eine Sicherheitsfachkraft (Sifa, DGUV V2) ist ggf. einzubeziehen.'
    });
  }

  // Tägliche Gefahrstoffarbeit ohne Substitutions-Prüfung dokumentiert
  if (
    (tags.intensity === 'taeglich' || tags.intensity === 'dauerhaft') &&
    anySubstance
  ) {
    warnings.push({
      code: 'taegliche-gefahrstoffe-substitution-pruefen',
      message: 'Täglicher oder dauerhafter Gefahrstoffeinsatz angegeben — Substitutionsprüfung gem. GefStoffV §6 (Ersatz durch weniger gefährlichen Stoff) ist verpflichtend zu dokumentieren, auch wenn das Ergebnis „keine Substitution möglich" lautet.'
    });
  }

  // Tägliche Bildschirmarbeit ohne ergonomische Bewertung explizit hinterlegt
  if (
    (tags.intensity === 'taeglich' || tags.intensity === 'dauerhaft') &&
    dimensionValues(tags, 'tools').includes('bildschirm')
  ) {
    warnings.push({
      code: 'taegliche-bildschirmarbeit-g37-pruefen',
      message: 'Tägliche oder dauerhafte Bildschirmarbeit angegeben — arbeitsmedizinische Angebotsvorsorge G37 (Bildschirm/Augen) und schriftliche Beurteilung des Bildschirmarbeitsplatzes nach ArbStättV Anh. 6 sind erforderlich.'
    });
  }

  // Dauerhafte Außenarbeit ohne dokumentierten Hitzeschutz
  if (
    tags.intensity === 'dauerhaft' &&
    dimensionValues(tags, 'environment').includes('aussen')
  ) {
    warnings.push({
      code: 'dauerhafte-aussenarbeit-hitzeschutz-pruefen',
      message: 'Dauerhafte Außenarbeit angegeben — ab Lufttemperatur 30 °C sind Hitzeschutz-Maßnahmen (verkürzte Pausen-Intervalle, Trinkwasser ≥0,3 l/h pro Person, UV-Schutz UPF 30+) einzuplanen. Bei extremer Hitze: Arbeitszeitverlagerung in kühlere Tageszeiten prüfen.'
    });
  }

  return {
    risks: derivedRisks,
    measures: derivedMeasures,
    missing_controls: missing,
    plausibility: warnings,
    summary: {
      n_risks: derivedRisks.length,
      n_mandatory_measures: derivedMeasures.filter((m) => m.is_mandatory).length,
      n_missing_controls: missing.length
    }
  };
}

/* ─── Release-Mindestprüfung ───────────────────────────────────────── */

export type MandatoryCheckResult = {
  passed: boolean;
  unfulfilled_mandatory: Array<{ slug: string; short_text: string; reason: string }>;
};

export function checkMandatoryCompletion(
  derivation: DerivationResult,
  acknowledgements: Record<string, { confirmed: boolean }>
): MandatoryCheckResult {
  const unfulfilled = derivation.measures
    .filter((m) => m.is_mandatory)
    .filter((m) => !acknowledgements[m.measure.slug]?.confirmed)
    .map((m) => ({
      slug: m.measure.slug,
      short_text: m.measure.short_text,
      reason: m.mandatory_reason ?? 'Pflicht-Maßnahme'
    }));
  return { passed: unfulfilled.length === 0, unfulfilled_mandatory: unfulfilled };
}

/* ─── Snapshot-Freeze (Compliance) ────────────────────────────────────
 * Schema v1. Das vollständige Engine-Ergebnis einer Release wird
 * serialisiert und in ra_gbu_versions.snapshot eingefroren. NIE neu
 * berechnen. Die Stammdaten-Auszüge (Risk/Measure/Legal-Ref) sind
 * inline enthalten, damit spätere Katalog-Änderungen die Anzeige
 * nicht verändern.
 */

export type SeveritySummary = {
  severity: number;
  likelihood: number;
  score: number;
};

/**
 * Versioniertes Snapshot-Schema. **v2** trägt den selbst-verifizierenden
 * `snapshot_hash` als Pflichtfeld — damit ist der DB-Record nicht mehr
 * die einzige Wahrheit, sondern der Hash bestätigt die Integrität.
 *
 * v1 (ohne Hash) wird über `isEngineSnapshotV2()` als nicht-verifizierbar
 * erkannt und über den Legacy-Pfad rekonstruiert.
 */
export type EngineSnapshotV2 = {
  schema_version: 2;
  engine_version: string;

  /**
   * Integritäts-Hash. SHA-256-Hex über alle Inhaltsfelder dieses Snapshots
   * AUSSER `snapshot_hash` und `generated_at`. Self-verifizierend:
   *   verifySnapshotIntegrity(snap).ok === true  ↔  Inhalt unverändert.
   */
  snapshot_hash: string;
  catalog_hash: string;       // sha256-Hex (ohne Prefix)
  catalog_size: { risks: number; measures: number };
  /** ISO-8601. Aus Hash AUSGENOMMEN — gleicher Input = gleicher Hash. */
  generated_at: string;

  /** Aktive Risiko-Auswahl (User-bestätigt), falls vom UI eingeschränkt */
  user_selected_risk_slugs: string[];
  /** Vollständige Engine-Eingabe (Tag-Set zur Release-Zeit) */
  input_tags: ActivityTags;

  /** Vollständige Engine-Ausgabe — inline, kein Lookup nötig zum Anzeigen */
  derived_risks: DerivedRisk[];
  derived_measures: DerivedMeasure[];
  missing_controls: MissingControl[];
  plausibility: PlausibilityWarning[];

  /** Aggregierte Indexe für schnelle Anzeige / Audit */
  trigger_map: Record<string, TriggerReason[]>;
  mandatory_reasons: Record<string, string | null>;
  severity_scores: Record<string, SeveritySummary>;

  /** Vom Snapshot referenzierte Legal-Refs (Anzeige-fix einfrieren) */
  legal_refs: Record<string, Pick<RaLegalRef, 'slug' | 'citation' | 'title' | 'url' | 'kind'>>;

  /** Bestätigungs-Status der Maßnahmen zur Release-Zeit */
  measure_acknowledgements: Record<string, { confirmed: boolean; note?: string | null }>;

  summary: DerivationResult['summary'];
};

/** Backward-compat alias (Vorgänger-Typname). Inhalt = V2. */
export type EngineSnapshotV1 = EngineSnapshotV2;

/** Feldnamen, die beim Hash-Bilden AUSGESCHLOSSEN werden. */
const SNAPSHOT_HASH_EXCLUDED_KEYS = new Set<string>([
  'snapshot_hash',  // self-reference
  'generated_at'    // Zeitstempel — soll Hash nicht beeinflussen
]);

/**
 * Stable SHA-256 Hex über den Snapshot-Inhalt.
 *
 * - Ausgeschlossen: `snapshot_hash` (self-ref), `generated_at` (Metadatum)
 * - Serializer: `stableStringify` — deterministische Key-Order, kein -0,
 *   keine undefined-Drift, keine NaN/Infinity.
 *
 * Konsequenz: zwei semantisch identische Snapshots haben denselben Hash,
 * auch wenn sie zu verschiedenen Zeitpunkten gebaut wurden. Das ist
 * gewollt — Reproduzierbarkeit > Build-Zeitpunkt-Identität.
 */
export function computeSnapshotHash(snap: EngineSnapshotV2): string {
  const filtered: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(snap)) {
    if (!SNAPSHOT_HASH_EXCLUDED_KEYS.has(k)) filtered[k] = v;
  }
  const payload = stableStringify(filtered);
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export type SnapshotVerification = {
  ok: boolean;
  expected: string;
  actual: string;
  reason?: 'mismatch' | 'no_hash' | 'unknown_schema';
};

/**
 * Verifiziert, dass ein gespeicherter Snapshot bit-genau dem entspricht,
 * was zur Release-Zeit gehasht wurde. Wenn `ok === false`, wurde der
 * DB-Record nachträglich manipuliert (oder die Serialisierung ist
 * inkompatibel — beides ist ein Audit-Alarm).
 */
export function verifySnapshotIntegrity(snap: unknown): SnapshotVerification {
  if (!isEngineSnapshotV2(snap)) {
    return {
      ok: false,
      expected: '',
      actual: '',
      reason: 'unknown_schema'
    };
  }
  const actual = snap.snapshot_hash;
  if (!actual) {
    return { ok: false, expected: '', actual: '', reason: 'no_hash' };
  }
  const expected = computeSnapshotHash(snap);
  return {
    ok: expected === actual,
    expected,
    actual,
    reason: expected === actual ? undefined : 'mismatch'
  };
}

/**
 * Berechnet einen stabilen SHA-256-Hash über die für die Engine relevanten
 * Stammdaten. Nutzt `stableStringify` statt blindem `JSON.stringify`, damit
 * Key-Order und undefined-Behandlung garantiert deterministisch sind.
 * Vorgriff auf #61 — sobald eine echte `catalog_version`-Tabelle existiert,
 * kann diese Funktion durch deren Wert ersetzt werden.
 */
export function computeCatalogHash(
  riskCatalog: RaRiskCatalog[],
  measureCatalog: RaMeasureCatalog[]
): string {
  const sortedRisks = [...riskCatalog]
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      trigger_conditions: normalizeRecord(r.trigger_conditions ?? {}),
      severity_default: r.severity_default ?? null,
      likelihood_default: r.likelihood_default ?? null,
      requires_betriebsanweisung: r.requires_betriebsanweisung ?? false,
      requires_psa: r.requires_psa ?? false,
      requires_unterweisung: r.requires_unterweisung ?? false,
      source_ref_slugs: [...r.source_ref_slugs].sort()
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const sortedMeasures = [...measureCatalog]
    .map((m) => ({
      slug: m.slug,
      short_text: m.short_text,
      category: m.category,
      applies_to_risks: [...m.applies_to_risks].sort(),
      source_ref_slugs: [...m.source_ref_slugs].sort(),
      is_mandatory_when: m.is_mandatory_when
        ? {
            risks: m.is_mandatory_when.risks ? [...m.is_mandatory_when.risks].sort() : null,
            any_substance: m.is_mandatory_when.any_substance ?? null,
            work_height: m.is_mandatory_when.work_height ? [...m.is_mandatory_when.work_height].sort() : null
          }
        : null
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const payload = stableStringify({ risks: sortedRisks, measures: sortedMeasures });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function normalizeRecord(rec: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of Object.keys(rec).sort()) {
    out[key] = [...rec[key]!].sort();
  }
  return out;
}

/**
 * Baut den vollständigen Engine-Snapshot aus aktuellen Tags + Stammdaten.
 * Dies ist der EINZIGE Pfad, über den ein Snapshot bei Release entstehen
 * darf. Der Snapshot ist self-contained — Anzeige braucht keinen Lookup
 * mehr gegen den Katalog.
 *
 * @param userSelectedRiskSlugs  optional vom User in Step 2 reduziert.
 *        Wenn leer/undefined: alle aus deriveGbu().risks werden übernommen.
 */
export function buildEngineSnapshot(
  tags: ActivityTags,
  riskCatalog: RaRiskCatalog[],
  measureCatalog: RaMeasureCatalog[],
  legalRefs: RaLegalRef[],
  acknowledgements: Record<string, { confirmed: boolean; note?: string }>,
  userSelectedRiskSlugs?: string[]
): EngineSnapshotV2 {
  const derivation = deriveGbu(tags, riskCatalog, measureCatalog);

  // Falls der User in Step 2 die Risiko-Auswahl reduziert hat, gilt diese
  // als Grundlage für derived_risks/measures im Snapshot — alles andere
  // wird gefiltert. Wenn keine Auswahl: alle Engine-Risiken.
  const selectedSet = userSelectedRiskSlugs && userSelectedRiskSlugs.length > 0
    ? new Set(userSelectedRiskSlugs)
    : new Set(derivation.risks.map((r) => r.risk.slug));

  const filteredRisks = derivation.risks.filter((r) => selectedSet.has(r.risk.slug));
  const filteredMeasures = derivation.measures.filter((m) =>
    m.for_risks.some((s) => selectedSet.has(s))
  );

  // Trigger-Map + Mandatory-Reasons + Severity-Scores als O(1)-Indexe
  const trigger_map: Record<string, TriggerReason[]> = {};
  const severity_scores: Record<string, SeveritySummary> = {};
  for (const r of filteredRisks) {
    trigger_map[r.risk.slug] = r.triggers;
    severity_scores[r.risk.slug] = {
      severity: r.severity,
      likelihood: r.likelihood,
      score: r.severity * r.likelihood
    };
  }

  const mandatory_reasons: Record<string, string | null> = {};
  for (const m of filteredMeasures) {
    mandatory_reasons[m.measure.slug] = m.mandatory_reason;
  }

  // Legal-Refs einfrieren — nur die, die von gewählten Maßnahmen
  // tatsächlich referenziert werden. Sonst bläht das Artefakt auf.
  const usedSlugs = new Set<string>();
  filteredMeasures.forEach((m) => m.measure.source_ref_slugs.forEach((s) => usedSlugs.add(s)));
  filteredRisks.forEach((r) => r.risk.source_ref_slugs.forEach((s) => usedSlugs.add(s)));
  const legal_refs: EngineSnapshotV1['legal_refs'] = {};
  for (const ref of legalRefs) {
    if (usedSlugs.has(ref.slug)) {
      legal_refs[ref.slug] = {
        slug: ref.slug,
        citation: ref.citation,
        title: ref.title,
        url: ref.url,
        kind: ref.kind
      };
    }
  }

  // Acknowledgements normalisieren (note → string|null)
  const normalizedAck: EngineSnapshotV1['measure_acknowledgements'] = {};
  for (const [slug, ack] of Object.entries(acknowledgements)) {
    normalizedAck[slug] = {
      confirmed: !!ack.confirmed,
      note: ack.note ?? null
    };
  }

  // Filtered missing_controls / plausibility behalten — sie hängen am
  // gesamten Tag-Profil, nicht an der Risiko-Auswahl.
  const snap: EngineSnapshotV2 = {
    schema_version: ENGINE_SNAPSHOT_SCHEMA_VERSION as 2,
    engine_version: ENGINE_VERSION,
    snapshot_hash: '',                      // wird unten gesetzt
    catalog_hash: computeCatalogHash(riskCatalog, measureCatalog),
    catalog_size: { risks: riskCatalog.length, measures: measureCatalog.length },
    generated_at: new Date().toISOString(),

    user_selected_risk_slugs: Array.from(selectedSet).sort(),
    input_tags: tags,

    derived_risks: filteredRisks,
    derived_measures: filteredMeasures,
    missing_controls: derivation.missing_controls,
    plausibility: derivation.plausibility,

    trigger_map,
    mandatory_reasons,
    severity_scores,

    legal_refs,
    measure_acknowledgements: normalizedAck,

    summary: {
      n_risks: filteredRisks.length,
      n_mandatory_measures: filteredMeasures.filter((m) => m.is_mandatory).length,
      n_missing_controls: derivation.missing_controls.length
    }
  };
  // Hash wird über alle Inhaltsfelder gebildet (ohne snapshot_hash + generated_at)
  snap.snapshot_hash = computeSnapshotHash(snap);
  return snap;
}

/**
 * Type-Guard: prüft, ob ein gespeicherter Snapshot dem aktuellen Schema (v2)
 * folgt. Wenn false: über den Legacy-Fallback rekonstruieren + UI-Warnung.
 *
 * Streng: `snapshot_hash` MUSS vorhanden sein. Ein v1-Snapshot ohne Hash
 * würde hier durchfallen — bewusste Architektur-Entscheidung, weil ohne
 * Hash keine Integritäts-Garantie möglich ist.
 */
export function isEngineSnapshotV2(x: unknown): x is EngineSnapshotV2 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.schema_version === 2
    && typeof o.engine_version === 'string'
    && typeof o.snapshot_hash === 'string'
    && (o.snapshot_hash as string).length === 64
    && typeof o.catalog_hash === 'string'
    && Array.isArray(o.derived_risks)
    && Array.isArray(o.derived_measures);
}

/** Backward-compat alias. */
export const isEngineSnapshotV1 = isEngineSnapshotV2;

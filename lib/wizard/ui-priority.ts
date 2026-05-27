/**
 * UI-Priorisierung — übersetzt die technischen Engine-Felder
 * (priority / urgency / obligation_type) in drei geschäftsführer-taugliche
 * UI-Gruppen.
 *
 * ─── Doktrin ─────────────────────────────────────────────────────────
 * Die Engine bleibt technisch korrekt (Pflicht / Angebot / Empfehlung /
 * Hinweis + sofort / kurzfristig / mittelfristig / langfristig + kritisch /
 * hoch / mittel / niedrig). Die UI abstrahiert psychologisch.
 *
 * Geschäftsführer sehen keine "Gefahrstufen" oder "Verstöße" — sondern
 * einen ruhigen, priorisierten Handlungsleitfaden.
 *
 * Diese Datei ist eine REINE Render-Hilfe. Sie verändert weder die
 * Engine noch den Snapshot. Sie kann jederzeit aus jedem Snapshot
 * (alt oder neu) aufgerufen werden — fehlen die optionalen Engine-
 * Felder (Legacy-Snapshots), greift ein konservativer Fallback.
 */

import type { DerivedMeasure, ObligationType, Priority, Urgency } from './engine';

/* ─── UI-Gruppen ─────────────────────────────────────────────────────── */

export type UiGroup =
  | 'jetzt_wichtig'
  | 'als_naechstes_sinnvoll'
  | 'spaeter_optimierbar';

export const UI_GROUP_LABELS: Record<UiGroup, string> = {
  jetzt_wichtig:          'Jetzt wichtig',
  als_naechstes_sinnvoll: 'Als Nächstes sinnvoll',
  spaeter_optimierbar:    'Später optimierbar'
};

export const UI_GROUP_DESCRIPTIONS: Record<UiGroup, string> = {
  jetzt_wichtig:
    'Diese Punkte sollten zuerst geprüft werden — sie sind aus den Angaben verpflichtend abgeleitet oder betreffen ein zentrales Risiko.',
  als_naechstes_sinnvoll:
    'Diese Punkte gehören in die nächste Planungsrunde. Sie senken das Restrisiko spürbar, sind aber zeitlich entlastet.',
  spaeter_optimierbar:
    'Diese Punkte sind ergänzende Empfehlungen. Sie können später in einer ruhigen Phase eingeplant werden.'
};

/** Reihenfolge der Gruppen im Render. */
export const UI_GROUP_ORDER: readonly UiGroup[] = [
  'jetzt_wichtig',
  'als_naechstes_sinnvoll',
  'spaeter_optimierbar'
] as const;

/* ─── Mapping-Regeln ─────────────────────────────────────────────────── */

/**
 * Bildet eine einzelne Maßnahme auf eine UI-Gruppe ab.
 *
 * Regeln (in Reihenfolge der Auswertung — first-match):
 *
 *  1. „Jetzt wichtig" wenn:
 *       priority === 'sofort'  ODER
 *       urgency === 'kritisch' ODER
 *       (obligation_type === 'pflicht' UND urgency === 'hoch')
 *
 *  2. „Als Nächstes sinnvoll" wenn:
 *       priority ∈ {'kurzfristig', 'mittelfristig'} ODER
 *       urgency ∈ {'hoch', 'mittel'}
 *
 *  3. „Später optimierbar" wenn:
 *       priority === 'langfristig' ODER
 *       obligation_type === 'hinweis' ODER
 *       urgency === 'niedrig'
 *
 *  Fallback (z. B. Legacy-Snapshot ohne Iteration-3-Felder):
 *    - is_mandatory === true  → „Jetzt wichtig"
 *    - sonst                  → „Als Nächstes sinnvoll"
 *      (defensiv: lieber sichtbar als versteckt)
 */
export function mapMeasureToUiGroup(d: DerivedMeasure): UiGroup {
  const { priority, urgency, obligation_type, is_mandatory } = d;

  // Regel 1 — Jetzt wichtig
  if (priority === 'sofort') return 'jetzt_wichtig';
  if (urgency === 'kritisch') return 'jetzt_wichtig';
  if (obligation_type === 'pflicht' && urgency === 'hoch') return 'jetzt_wichtig';

  // Regel 2 — Als Nächstes sinnvoll
  if (priority === 'kurzfristig' || priority === 'mittelfristig') return 'als_naechstes_sinnvoll';
  if (urgency === 'hoch' || urgency === 'mittel') return 'als_naechstes_sinnvoll';

  // Regel 3 — Später optimierbar
  if (priority === 'langfristig') return 'spaeter_optimierbar';
  if (obligation_type === 'hinweis') return 'spaeter_optimierbar';
  if (urgency === 'niedrig') return 'spaeter_optimierbar';

  // Fallback für Legacy-Snapshots ohne Iteration-3-Felder
  return is_mandatory ? 'jetzt_wichtig' : 'als_naechstes_sinnvoll';
}

/* ─── Intra-Group Sort ───────────────────────────────────────────────── */

const OBLIGATION_RANK: Record<ObligationType, number> = {
  pflicht:    0,
  angebot:    1,
  empfehlung: 2,
  hinweis:    3
};

const URGENCY_RANK: Record<Urgency, number> = {
  kritisch: 0,
  hoch:     1,
  mittel:   2,
  niedrig:  3
};

/**
 * Score-Surrogat aus der Maßnahme. Höher = wichtiger.
 * Wenn die Engine `for_risks` mit mehreren Risiken liefert, gewichten
 * wir das als breiterer Adressbereich → leichter Score-Bonus.
 */
function scoreFor(d: DerivedMeasure): number {
  const breadth = Math.min(d.for_risks.length, 5);
  return breadth;
}

/**
 * Sortiert eine Maßnahmen-Liste für die UI. Innerhalb jeder Gruppe gilt:
 *   1. Obligation-Type:  Pflicht → Angebot → Empfehlung → Hinweis
 *   2. Urgency:          kritisch → hoch → mittel → niedrig
 *   3. Score-Breadth:    breitere Wirkung zuerst
 *   4. Stable-Tiebreak:  alphabetisch nach short_text (Determinismus)
 *
 * Hinweis: Sortier-Begründung darf in der UI NICHT erscheinen — sie ist
 * Implementierungsdetail. Der GF sieht nur die fertige Reihenfolge.
 */
export function sortMeasuresWithinGroup(measures: DerivedMeasure[]): DerivedMeasure[] {
  return [...measures].sort((a, b) => {
    const oa = OBLIGATION_RANK[a.obligation_type ?? (a.is_mandatory ? 'pflicht' : 'empfehlung')];
    const ob = OBLIGATION_RANK[b.obligation_type ?? (b.is_mandatory ? 'pflicht' : 'empfehlung')];
    if (oa !== ob) return oa - ob;

    const ua = URGENCY_RANK[a.urgency ?? 'mittel'];
    const ub = URGENCY_RANK[b.urgency ?? 'mittel'];
    if (ua !== ub) return ua - ub;

    const sb = scoreFor(b) - scoreFor(a);
    if (sb !== 0) return sb;

    return a.measure.short_text.localeCompare(b.measure.short_text, 'de');
  });
}

/* ─── Gruppierung ────────────────────────────────────────────────────── */

export type UiGroupedMeasures = Record<UiGroup, DerivedMeasure[]>;

/**
 * Gruppiert + sortiert. Leere Gruppen bleiben als leere Arrays erhalten —
 * die UI entscheidet, ob sie leere Sektionen ausblendet oder einen
 * Empty-State zeigt.
 */
export function sortMeasuresForUi(measures: DerivedMeasure[]): UiGroupedMeasures {
  const groups: UiGroupedMeasures = {
    jetzt_wichtig: [],
    als_naechstes_sinnvoll: [],
    spaeter_optimierbar: []
  };
  for (const d of measures) {
    groups[mapMeasureToUiGroup(d)].push(d);
  }
  for (const k of UI_GROUP_ORDER) {
    groups[k] = sortMeasuresWithinGroup(groups[k]);
  }
  return groups;
}

/* ─── Ruhige Summary-Sätze ───────────────────────────────────────────── */

export type UiMeasureSummary = {
  /** Ein bis drei kurze, ruhige Sätze für den oberen Bereich der Maßnahmen-Sektion. */
  sentences: string[];
  /** Zahlen pro Gruppe — für Badges, ohne Wertung. */
  counts: Record<UiGroup, number>;
};

/**
 * Erzeugt eine ruhige Textzusammenfassung. Keine Panik, keine Bewertung.
 * Beispiele:
 *  - „3 Punkte sollten zeitnah geprüft werden."
 *  - „4 weitere Maßnahmen können in der nächsten Planungsrunde berücksichtigt werden."
 *  - „2 ergänzende Empfehlungen sind später einplanbar."
 *  - „Aktuell sind keine Punkte sofort prüfungsbedürftig."
 */
export function buildUiMeasureSummary(measures: DerivedMeasure[]): UiMeasureSummary {
  const groups = sortMeasuresForUi(measures);
  const counts: Record<UiGroup, number> = {
    jetzt_wichtig: groups.jetzt_wichtig.length,
    als_naechstes_sinnvoll: groups.als_naechstes_sinnvoll.length,
    spaeter_optimierbar: groups.spaeter_optimierbar.length
  };

  const sentences: string[] = [];

  // Satz 1 — „Jetzt wichtig"
  if (counts.jetzt_wichtig === 0) {
    sentences.push('Aktuell sind keine Punkte sofort prüfungsbedürftig.');
  } else if (counts.jetzt_wichtig === 1) {
    sentences.push('1 Punkt sollte zeitnah geprüft werden.');
  } else {
    sentences.push(`${counts.jetzt_wichtig} Punkte sollten zeitnah geprüft werden.`);
  }

  // Satz 2 — „Als Nächstes sinnvoll"
  if (counts.als_naechstes_sinnvoll === 1) {
    sentences.push('1 weitere Maßnahme passt gut in die nächste Planungsrunde.');
  } else if (counts.als_naechstes_sinnvoll > 1) {
    sentences.push(
      `${counts.als_naechstes_sinnvoll} weitere Maßnahmen können in der nächsten Planungsrunde berücksichtigt werden.`
    );
  }

  // Satz 3 — „Später optimierbar"
  if (counts.spaeter_optimierbar === 1) {
    sentences.push('1 ergänzende Empfehlung ist später einplanbar.');
  } else if (counts.spaeter_optimierbar > 1) {
    sentences.push(`${counts.spaeter_optimierbar} ergänzende Empfehlungen sind später einplanbar.`);
  }

  // Fallback: gar nichts da
  if (measures.length === 0) {
    return {
      sentences: ['Für diese Tätigkeit wurden keine spezifischen Maßnahmen abgeleitet.'],
      counts
    };
  }

  return { sentences, counts };
}

/* ─── Snapshot-kompatibler Render-Helper ─────────────────────────────── */

/**
 * Variante für die Version-Page: nimmt die Snapshot-Repräsentation einer
 * Maßnahme (gleicher Shape wie DerivedMeasure, nur unveränderlich) und
 * mappt sie auf eine UI-Gruppe. Identisch zu mapMeasureToUiGroup — separater
 * Export macht die Aufruf-Intention an Snapshots aber lesbar.
 */
export const mapSnapshotMeasureToUiGroup = mapMeasureToUiGroup;

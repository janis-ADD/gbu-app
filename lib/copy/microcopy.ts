/**
 * Microcopy — zentrale, ruhige UI-Texte für den Wizard und die Version-Page.
 *
 * ─── Doktrin ─────────────────────────────────────────────────────────
 * Der GF-Nutzer ist Laie in Arbeitssicherheit, aber Profi in seinem
 * Betrieb. Texte sollen:
 *
 *   • ruhig sein                — keine Ausrufezeichen-Stapel
 *   • führend sein              — sagen, was als Nächstes zu tun ist
 *   • erklärend sein            — bei Fachbegriffen kurze Übersetzung
 *   • Verantwortung respektieren — keine Belehrung
 *
 * Verboten (Liste pflegen, wenn etwas neu auffällt):
 *   ❌ kritisch · hochriskant · Verstoß · Alarm · Gefahrstufe
 *   ❌ Sie müssen / Sie dürfen nicht
 *   ❌ Pflicht-Lücken erkannt (Behörden-Sound)
 *   ❌ ⛔ 🚨 als reines Dekor
 *
 * Bevorzugt:
 *   ✓ „Hier besteht typischerweise zusätzlicher Prüfbedarf."
 *   ✓ „Empfohlen vor Veröffentlichung."
 *   ✓ „Kann später jederzeit ergänzt werden."
 *   ✓ „Basis: typische Anforderungen nach DGUV-Regelwerk."
 *   ✓ „Die finale Verantwortung bleibt beim Unternehmen."
 */

export const COPY = {
  /* ─── Wizard-Step-Headlines (Lead-Texte) ──────────────────────── */
  steps: {
    1: {
      title: 'Tätigkeitsprofil',
      lead: 'Beschreiben Sie kurz die Tätigkeit. Aus Ihren Angaben leitet das System die relevanten Risiken und Pflichtmaßnahmen ab — Schritt für Schritt nachvollziehbar.'
    },
    2: {
      title: 'Abgeleitete Gefährdungen',
      lead: 'Diese Risiken ergeben sich typischerweise aus Ihrem Profil. Jede Ableitung ist mit dem auslösenden Tag begründet — Sie können sie prüfen und anpassen.'
    },
    3: {
      title: 'Handlungsleitfaden',
      lead: 'Vorgeschlagene Maßnahmen, sortiert nach Bedeutung für Ihren Betrieb. Pflicht-Punkte sind klar markiert.'
    },
    4: {
      title: 'Verantwortliche Rolle & Wiedervorlage',
      lead: 'Wer ist intern verantwortlich, und wann ist die Wirksamkeit zu prüfen? Diese Angaben dokumentieren die Sorgfalt nach ArbSchG §6.'
    },
    5: {
      title: 'Freigabe & Snapshot',
      lead: 'Mit der Freigabe wird der Stand revisionssicher eingefroren. Sie können jederzeit eine neue Version anlegen.'
    }
  },

  /* ─── Schutz-Hinweis am oberen Rand jeder Seite ───────────────── */
  safetyHints: {
    step1: {
      strong: 'Tätigkeitsbezogene Beurteilung (ArbSchG §5):',
      body:
        'Aus Ihren Angaben leitet das System Gefährdungen und passende Pflichtmaßnahmen ab. Jeder Vorschlag ist mit Quelle nachvollziehbar — Sie behalten die Entscheidung.'
    },
    step3: {
      strong: 'Sortiert nach Bedeutung:',
      body:
        'Die Vorschläge sind in drei Gruppen geordnet — von „Jetzt wichtig" bis „Später optimierbar". Pflicht-Punkte sind sichtbar markiert. Häkchen = bei Ihnen bereits umgesetzt.'
    },
    step4: {
      strong: 'Dokumentation (ArbSchG §6):',
      body:
        'Geben Sie eine verantwortliche Rolle an (kein Personenname) und das Datum der nächsten Wirksamkeitsprüfung. Beides erscheint im Snapshot.'
    },
    activityTagsContext: {
      strong: 'Ein paar zusätzliche Angaben helfen — sind aber freiwillig.',
      body:
        'Häufigkeit und Expositionsstärke schärfen die Empfehlungen. Wenn Sie sich nicht sicher sind, lassen Sie das Feld leer — das System bleibt dann konservativ.'
    }
  },

  /* ─── Vertrauens-Hinweise (Phase 4) — kurze Quasi-Captions ──── */
  trust: {
    derivationBasis:
      'Basis: typische Anforderungen nach DGUV-Regelwerk und ArbSchG.',
    finalResponsibility:
      'Die finale fachliche Verantwortung bleibt beim Unternehmen.',
    canBeEditedLater:
      'Die Angaben können später jederzeit ergänzt oder korrigiert werden.',
    snapshotImmutable:
      'Nach der Freigabe ist die Version unveränderlich. Korrekturen erscheinen als neue Version.',
    notMedicalAdvice:
      'Diese Beurteilung ist ein strukturierter Entwurf. Sie ersetzt nicht die fachkundige Prüfung durch Arbeitgeber, verantwortliche Person oder Fachkraft für Arbeitssicherheit.'
  },

  /* ─── Unfälle der bisherigen Sprache — bewusst entschärft ─────── */
  panels: {
    missingControls: {
      title: 'Hier besteht typischerweise zusätzlicher Prüfbedarf',
      intro:
        'Aus Ihrem Profil ergeben sich Bereiche, in denen erfahrungsgemäß eine klare Regelung erwartet wird. Empfohlen vor der Freigabe — Sie können aber trotzdem freigeben, der Hinweis wird im Snapshot mit dokumentiert.'
    },
    plausibility: {
      title: 'Plausibilitäts-Hinweise',
      intro:
        'Diese Punkte sind kein Fehler — sondern Stellen, die wir Ihnen zur kurzen Prüfung empfehlen.'
    },
    unfulfilledMandatory: {
      title: 'Diese Pflicht-Punkte sind noch nicht als umgesetzt markiert',
      intro:
        'Sie können trotzdem freigeben — der Status wird im Snapshot dokumentiert. Empfohlen: vorher kurz prüfen, ob die Umsetzung im Betrieb tatsächlich aussteht oder nur das Häkchen fehlt.'
    },
    /* Ein kombinierter Pre-Release-Check (ersetzt mehrere übereinander­
     * gestapelte Warn-Banner durch eine einzige ruhige Box). */
    preReleaseCheck: {
      title: 'Vor der Freigabe bitte kurz prüfen:',
      intro:
        'Sie können trotzdem freigeben — die Hinweise werden im Snapshot mit dokumentiert.',
      itemMandatory: (n: number) =>
        n === 1
          ? '1 Pflichtmaßnahme ist noch nicht als umgesetzt markiert.'
          : `${n} Pflichtmaßnahmen sind noch nicht als umgesetzt markiert.`,
      itemMissing: (n: number) =>
        n === 1
          ? '1 Punkt zur kurzen Prüfung empfohlen.'
          : `${n} Punkte zur kurzen Prüfung empfohlen.`,
      itemFreePlanLast:
        'Im Free-Plan zählen freigegebene Beurteilungen dauerhaft zum enthaltenen Kontingent.'
    }
  },

  /* ─── Freigabe-Disclaimer (ruhiger Ton) ───────────────────────── */
  release: {
    disclaimer:
      'Ich bestätige, dass die Angaben nach bestem Wissen geprüft sind und diese Beurteilung vor Verwendung im Betrieb fachlich freigegeben wird. Die Katalog-Vorschläge sind ein strukturierter Entwurf und ersetzen keine Fachkraft für Arbeitssicherheit.',
    submitLabel: 'Beurteilung freigeben',
    submitPending: 'Wird freigegeben …',
    alreadyReleasedTitle: 'Bereits freigegeben',
    alreadyReleasedOpenLink: 'Version öffnen →'
  },

  /* ─── Leere Zustände ─────────────────────────────────────────── */
  empty: {
    measures:
      'Für diese Risiko-Kombination liegen aktuell keine Standardmaßnahmen im Katalog vor. Bitte fachlich aus BG-/DGUV-Quellen ergänzen.',
    risks:
      'Aus den aktuellen Tags wurden keine Risiken abgeleitet. Wenn das nicht zur Tätigkeit passt, prüfen Sie bitte die Angaben in Schritt 1.'
  },

  /* ─── Bestätigungen ──────────────────────────────────────────── */
  confirm: {
    released: (v: number) => `Version v${v} freigegeben.`,
    saved: 'Gespeichert.'
  },

  /* ─── Explainability — Phase „Explainable Compliance UX" ────────
   * Diese Texte sind die Begleit-Sätze, die unter Risiken, Maßnahmen
   * und Gruppen erscheinen. Sie sollen erklären, WARUM etwas in der
   * Liste steht — ohne Engine-Vokabular und ohne Zahlen.
   */
  explainability: {
    /* Gruppen-Kontext für „Jetzt wichtig" / „Als Nächstes sinnvoll" /
     * „Später optimierbar". Wird unterhalb der UI_GROUP_DESCRIPTIONS
     * gerendert und ergänzt diese um den „warum"-Aspekt. */
    groupContext: {
      jetzt_wichtig:
        'Diese Punkte sollten zuerst geprüft werden, weil sie typischerweise direkten Einfluss auf Sicherheit und Nachweispflichten haben.',
      als_naechstes_sinnvoll:
        'Diese Maßnahmen helfen, den Arbeitsschutz spürbar zu verbessern. Sie sind nicht akut, lassen sich aber gut in die nächste Planungsrunde einplanen.',
      spaeter_optimierbar:
        'Diese Empfehlungen sind ergänzend. Sie können in einer ruhigen Phase eingeplant werden — ohne unmittelbaren Handlungsdruck.'
    },

    /* Vertrauens-Sätze, die an strategischen Stellen auftauchen.
     * Bewusst kurz und nicht juristisch. */
    basis: 'Die Bewertung basiert auf Ihren Angaben und typischen Anforderungen nach DGUV-Regelwerk und ArbSchG.',
    canAdjust: 'Die Angaben können später jederzeit ergänzt oder angepasst werden.',
    finalResponsibility: 'Die finale fachliche Verantwortung bleibt beim Unternehmen.',

    /* Einleitungen für die PDF-Sektionen — ein Satz pro Kapitel. */
    pdf: {
      risksIntro:
        'Aus den dokumentierten Tätigkeitsangaben ergeben sich die folgenden Gefährdungen. Jede Karte zeigt, welche Ihrer Angaben sie ausgelöst hat.',
      measuresIntro:
        'Die Maßnahmen sind nach Bedeutung geordnet — von „Jetzt wichtig" bis „Später optimierbar". Innerhalb jeder Gruppe stehen Pflicht-Punkte oben.',
      openIssuesIntro:
        'Diese Punkte sind in der Beurteilung noch nicht abschließend abgebildet und werden Ihnen zur Kenntnis gegeben. Sie können im laufenden Betrieb ergänzt werden.'
    },

    /* Headline der „Warum erscheint das?"-Zeile unter Maßnahmen. */
    whyMeasureLabel: 'Warum erscheint diese Maßnahme?',
    whyRiskLabel: 'Warum wurde dieses Risiko erkannt?'
  }
} as const;

/* ─── Hilfsfunktionen für Übersetzung von Engine-Enums in UI-Worte ── */

import type { ObligationType } from '@/lib/wizard/engine';

/**
 * Ruhige UI-Bezeichnung für den Obligation-Type. KEIN „Pflicht-Lücke",
 * KEIN „Verstoß". Die Worte selbst bleiben verständlich, aber neutral.
 */
export const OBLIGATION_UI_LABELS: Record<ObligationType, string> = {
  pflicht:    'Pflicht',
  angebot:    'Angebot',
  empfehlung: 'Empfehlung',
  hinweis:    'Hinweis'
};

/**
 * Knappe Caption für ein Obligation-Badge — erklärt den Begriff in einem
 * Satz, ohne zu bewerten.
 */
export const OBLIGATION_UI_CAPTIONS: Record<ObligationType, string> = {
  pflicht:    'Gesetzlich oder normativ verpflichtend.',
  angebot:    'Anzubieten — Annahme freiwillig (ArbMedVV-Sinn).',
  empfehlung: 'Fachlich empfohlen, keine harte Verpflichtung.',
  hinweis:    'Hinweis zur Orientierung, optional.'
};

import type {
  RaBgCatalog,
  RaMeasureCatalog,
  RaRiskCatalog,
  RaTrainingCatalog
} from '@/lib/db/types';

/**
 * Branche → typische Arbeitsbereiche (Vorauswahl).
 * Deterministisches Mapping — sichtbar im UI mit Quelle "Branchentyp".
 */
const INDUSTRY_AREAS: Record<string, string[]> = {
  maler:    ['buero', 'lager', 'baustelle', 'fahrzeuge'],
  bau:      ['baustelle', 'lager', 'fahrzeuge'],
  metall:   ['werkstatt', 'lager', 'buero'],
  logistik: ['lager', 'fahrzeuge', 'buero'],
  gastro:   ['werkstatt', 'lager', 'buero'],
  buero:    ['buero'],
  pflege:   ['buero', 'aussendienst'],
  // "Mischbetrieb / Andere" — sinnvolle Defaults für die meisten KMU
  other:    ['buero', 'lager']
};

export function suggestAreasForIndustry(industry: string | undefined): string[] {
  if (!industry) return ['buero', 'lager'];
  return INDUSTRY_AREAS[industry] ?? ['buero', 'lager'];
}

/**
 * Deterministische "Curated-RAG"-Logik (kein KI-Call).
 * Aus Step-Inputs werden Vorschläge abgeleitet, indem die Stammdaten
 * gefiltert werden. Sicher, reproduzierbar, kostenlos.
 *
 * Spätere Phase 4 kann optional eine KI-"Polish"-Stage davorhängen,
 * die nur aus diesem Set selektiert (siehe Doktrin).
 */

/**
 * Branche → typische BG-**Kandidaten** (Multi).
 *
 * KEINE Empfehlung, nur Vorauswahl-Hinweis ("könnte relevant sein").
 * Der Betrieb muss die Zuständigkeit verbindlich selbst klären.
 * Siehe Memory: bg-zustaendigkeit-doktrin.md
 */
export function suggestBgCandidates(
  industry: string | undefined,
  bgCatalog: RaBgCatalog[]
): RaBgCatalog[] {
  if (!industry) return [];
  const ind = industry.toLowerCase().trim();
  return bgCatalog.filter((bg) => bg.industries.some((i) => ind.includes(i)));
}

/** Bereiche → typische Risiken (Match via typical_areas[]). */
export function suggestRisksForAreas(
  areaSlugs: string[],
  riskCatalog: RaRiskCatalog[]
): RaRiskCatalog[] {
  if (!areaSlugs.length) return [];
  const set = new Set(areaSlugs);
  return riskCatalog.filter((r) => r.typical_areas.some((a) => set.has(a)));
}

/** Risiken → empfohlene Maßnahmen (Match via applies_to_risks[]). */
export function suggestMeasuresForRisks(
  riskSlugs: string[],
  measureCatalog: RaMeasureCatalog[]
): RaMeasureCatalog[] {
  if (!riskSlugs.length) return [];
  const set = new Set(riskSlugs);
  return measureCatalog.filter((m) =>
    m.applies_to_risks.some((r) => set.has(r))
  );
}

/** Risiken → empfohlene Unterweisungen (Match via related_risks[]). */
export function suggestTrainingsForRisks(
  riskSlugs: string[],
  trainingCatalog: RaTrainingCatalog[]
): RaTrainingCatalog[] {
  const set = new Set(riskSlugs);
  // Allgemeine Arbeitssicherheit ist Default, wenn überhaupt Risiken da sind.
  const general = trainingCatalog.find(
    (t) => t.slug === 'allgemeine-arbeitssicherheit'
  );
  const matched = trainingCatalog.filter(
    (t) => t.slug !== 'allgemeine-arbeitssicherheit' &&
      t.related_risks.some((r) => set.has(r))
  );
  return general ? [general, ...matched] : matched;
}

/** Confidence-Heuristik pro Maßnahme: mind. 2 Quellen → high, sonst medium */
export function confidenceFor(measure: RaMeasureCatalog): 'high' | 'medium' {
  return measure.source_ref_slugs.length >= 2 ? 'high' : 'medium';
}

/** Lückenanalyse — offene Prüfpunkte aus den gewählten Bereichen heraus. */
export type OpenItem = {
  id: string;
  category: 'fehlende-doku' | 'pruefung-faellig' | 'unklar';
  description: string;
  priority: 'low' | 'medium' | 'high';
  source_refs: string[];
};

export function deriveOpenItems(
  areaSlugs: string[],
  riskSlugs: string[]
): OpenItem[] {
  const items: OpenItem[] = [];
  const r = new Set(riskSlugs);
  const a = new Set(areaSlugs);

  if (r.has('gefahrstoffe') || a.has('lager')) {
    items.push({
      id: 'sdb-check',
      category: 'fehlende-doku',
      description: 'Sicherheitsdatenblätter aller eingesetzten Gefahrstoffe vorhanden und aktuell?',
      priority: 'high',
      source_refs: ['gefstoffv', 'trgs-510']
    });
  }
  if (r.has('leitern-tritte') || a.has('baustelle')) {
    items.push({
      id: 'leiter-pruef',
      category: 'pruefung-faellig',
      description: 'Jährliche Leiterprüfung durch befähigte Person dokumentiert?',
      priority: 'medium',
      source_refs: ['dguv-i-208-016', 'bg-bau-b198']
    });
  }
  if (r.has('elektrische-betriebsmittel')) {
    items.push({
      id: 'dguv-v3',
      category: 'pruefung-faellig',
      description: 'DGUV V3 Prüfung der elektrischen Betriebsmittel aktuell?',
      priority: 'medium',
      source_refs: ['dguv-v3']
    });
  }
  if (r.has('transport-fahrzeuge') || a.has('fahrzeuge')) {
    items.push({
      id: 'fuehrerschein',
      category: 'fehlende-doku',
      description: 'Führerscheinkontrolle aller Fahrzeugnutzer regelmäßig dokumentiert?',
      priority: 'medium',
      source_refs: ['stvo']
    });
  }
  if (r.has('brand-fluchtwege')) {
    items.push({
      id: 'feuerloescher',
      category: 'pruefung-faellig',
      description: 'Feuerlöscher innerhalb der letzten 2 Jahre geprüft?',
      priority: 'high',
      source_refs: ['asr-a2-2']
    });
  }
  if (r.has('erste-hilfe')) {
    items.push({
      id: 'ersthelfer',
      category: 'fehlende-doku',
      description: 'Anzahl Ersthelfer ausreichend, letzte Fortbildung < 2 Jahre?',
      priority: 'medium',
      source_refs: ['arbschg', 'dguv-v1']
    });
  }
  return items;
}

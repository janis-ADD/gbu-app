/**
 * Explainability-Helper — übersetzt Engine-Outputs in menschliche Sprache.
 *
 * ─── Doktrin ─────────────────────────────────────────────────────────
 * Diese Datei ist eine REINE Render-Hilfe. Sie nimmt das, was die Engine
 * deterministisch produziert hat (TriggerReason, DerivedRisk, DerivedMeasure,
 * ActivityTags), und übersetzt es in einen ruhigen, vollständigen Satz, den
 * ein Geschäftsführer ohne Vorwissen versteht.
 *
 * Sie verändert NICHTS am Snapshot, am Hashing, am Determinismus.
 * Sie erzeugt KEINE neuen Daten — sie verbalisiert existierende.
 *
 * Verboten:
 *   ❌ „Trigger" / „Engine" / „Snapshot" / „Score" im sichtbaren Text
 *   ❌ „getriggert" / „matched" / „evaluiert"
 *   ❌ Zahlen aus dem Severity-Likelihood-Modell (n/5, n/25)
 *
 * Bevorzugt:
 *   ✓ „Erkannt aufgrund Ihrer Angaben zu …"
 *   ✓ „Diese Maßnahme adressiert das Risiko „X"."
 *   ✓ „Die Bewertung berücksichtigt Ihre Angaben zu Häufigkeit und Belastung."
 */

import type { ActivityTags, Intensity, Exposure } from './activities';
import type { DerivedRisk, DerivedMeasure, TriggerReason } from './engine';

/* ─── Lookup: (Dimension, Wert) → menschliche Phrase ─────────────────
 * Die Engine schreibt im TriggerReason ein "label" wie "Höhe: über 2 m".
 * Diese Tabelle macht daraus einen Satz-fähigen Ausdruck wie
 * "Arbeiten in mehr als 2 m Höhe".
 *
 * Fehlt ein Eintrag, fällt humanizeTrigger() auf das Engine-Label zurück.
 * Die Tabelle ist additiv — neue Tags brechen die Funktion nicht.
 */
const HUMAN_PHRASES: Record<string, Record<string, string>> = {
  work_height: {
    'keine':        'keine Arbeiten in der Höhe',
    'bis-2m':       'Arbeiten bis 2 m Höhe (Tritt oder kurze Leiter)',
    'ueber-2m':     'Arbeiten in mehr als 2 m Höhe',
    'fassade-dach': 'Arbeiten an Fassade oder Dach'
  },
  mobility: {
    'stationaer':  'überwiegend stationäre Tätigkeit',
    'baustelle':   'Einsatz auf wechselnden Baustellen',
    'aussendienst':'Außendienst beim Kunden',
    'fahrzeuge':   'Tätigkeit mit Firmenfahrzeugen'
  },
  environment: {
    'innen':      'Tätigkeit in Innenräumen',
    'aussen':     'Tätigkeit im Außenbereich',
    'kunde':      'Tätigkeit beim Kunden',
    'homeoffice': 'Tätigkeit im Homeoffice',
    'werkstatt':  'Tätigkeit in der Werkstatt',
    'lager':      'Tätigkeit im Lager'
  },
  tools: {
    'handgefuehrt':     'Einsatz handgeführter Geräte wie Bohrer oder Schleifer',
    'cnc':              'Einsatz stationärer Maschinen (z. B. CNC)',
    'leitern':          'Einsatz von Leitern oder Tritten',
    'geruest':          'Arbeit auf Gerüsten',
    'flurfoerderzeuge': 'Bedienen von Flurförderzeugen wie Staplern',
    'fahrzeuge':        'Bedienen von Kraftfahrzeugen',
    'bildschirm':       'regelmäßige Bildschirmarbeit'
  },
  hazardous_substances: {
    'keine':           'kein Umgang mit Gefahrstoffen',
    'farben_lacke':    'Umgang mit Farben, Lacken oder Lösemitteln',
    'reinigung':       'Umgang mit Reinigungschemie',
    'schmierstoffe':   'Umgang mit Schmierstoffen oder Ölen',
    'staub_schleifen': 'Staubentwicklung beim Schleifen oder Bohren',
    'kuehlmittel':     'Umgang mit Kühl- oder Schneidmitteln'
  },
  workforce: {
    'azubis':        'Beschäftigung von Auszubildenden oder Jugendlichen',
    'fremdfirmen':   'Fremdfirmen vor Ort',
    'leiharbeit':    'Einsatz von Leiharbeit',
    'alleinarbeit':  'Alleinarbeit',
    'schichtarbeit': 'Schicht- oder Nachtarbeit',
    'kundenkontakt': 'direkter Kundenkontakt'
  },
  psychological: {
    'keine':                  'keine besondere psychische Belastung',
    'zeitdruck':              'hoher Zeitdruck',
    'emotionale_belastung':   'emotional belastende Situationen (z. B. in der Pflege)',
    'monotone':               'monotone Tätigkeitsabläufe',
    'verantwortung_personen': 'Verantwortung für andere Personen'
  },
  intensity: {
    'gelegentlich': 'gelegentliche Ausführung',
    'regelmaessig': 'regelmäßige Ausführung',
    'taeglich':     'tägliche Ausführung',
    'dauerhaft':    'dauerhafte Ausführung'
  },
  exposure: {
    'gering': 'geringe Belastung',
    'mittel': 'mittlere Belastung',
    'hoch':   'hohe Belastung'
  }
};

/* ─── humanizeTrigger ────────────────────────────────────────────────
 * Macht aus einer TriggerReason eine satzfähige Phrase.
 * Fallback: das ursprüngliche Engine-Label.
 */
export function humanizeTrigger(t: TriggerReason): string {
  return HUMAN_PHRASES[t.dimension]?.[t.value] ?? t.label;
}

/* ─── deutsche Aufzählung mit "und" ─────────────────────────────────── */
function joinGerman(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} und ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
}

/* ─── explainRiskTriggers ────────────────────────────────────────────
 * Vollständiger erklärender Satz für eine Risiko-Karte.
 * Beispiel:
 *   "Erkannt aufgrund Ihrer Angaben zu Arbeiten in mehr als 2 m Höhe
 *    und Einsatz von Leitern oder Tritten."
 *
 * Doppelte Phrasen werden entfernt (z. B. wenn dieselbe Dimension
 * mehrfach getriggert hat, der Satz aber identisch wäre).
 */
export function explainRiskTriggers(d: DerivedRisk): string {
  if (d.triggers.length === 0) {
    return 'Erkannt als typischerweise relevantes Risiko für die ausgewählte Tätigkeit.';
  }
  const phrases = Array.from(new Set(d.triggers.map(humanizeTrigger)));
  return `Erkannt aufgrund Ihrer Angaben zu ${joinGerman(phrases)}.`;
}

/* ─── explainMeasureBasis ────────────────────────────────────────────
 * Erklärender Satz für eine Maßnahme — kombiniert:
 *   1. Welches Risiko sie adressiert
 *   2. Falls Pflicht: Begründung (mandatory_reason aus Engine)
 *   3. Falls obligation_type=angebot durch geringe Exposition: Hinweis
 *
 * Erwartet die Risiko-Slugs in `for_risks`. Wenn der Aufrufer einen
 * Slug→Name-Lookup übergibt, werden Namen statt Slugs verwendet.
 */
export function explainMeasureBasis(
  d: DerivedMeasure,
  riskNamesBySlug?: Record<string, string>
): string {
  const parts: string[] = [];

  // Adressiert welches Risiko?
  if (d.for_risks.length > 0) {
    const names = d.for_risks.map((slug) => riskNamesBySlug?.[slug] ?? slug);
    if (names.length === 1) {
      parts.push(`Diese Maßnahme adressiert das Risiko „${names[0]}".`);
    } else {
      parts.push(`Diese Maßnahme adressiert die Risiken ${joinGerman(names.map((n) => `„${n}"`))}.`);
    }
  }

  // Pflicht-Begründung. Wenn die Engine als Pflicht-Grund nur
  // ein Maschinen-Metadaten-Stub liefert (z. B.
  // „Pflicht-Maßnahme für Risiko(en): leitern-tritte"), bringt
  // das im Print-Text keinen Mehrwert — wir lassen den „weil"-
  // Satz dann weg, statt eine kaputte Grammatik zu drucken.
  const isReasonHumanText =
    !!d.mandatory_reason &&
    !/^Pflicht-Maßnahme für Risiko\(en\):/i.test(d.mandatory_reason);
  if (d.is_mandatory && d.mandatory_reason && isReasonHumanText) {
    parts.push(`Sie ist verpflichtend, weil ${lowerFirst(d.mandatory_reason)}`);
  } else if (d.is_mandatory) {
    parts.push('Sie ist verpflichtend nach den unten genannten Quellen.');
  } else if (d.obligation_type === 'angebot') {
    parts.push(
      'Sie wird als Angebot eingestuft, weil die Tätigkeit nur gelegentlich und in geringer Belastung ausgeführt wird.'
    );
  } else if (d.obligation_type === 'empfehlung') {
    parts.push('Sie ist eine fachliche Empfehlung — keine harte Pflicht.');
  } else if (d.obligation_type === 'hinweis') {
    parts.push('Sie ist ein ergänzender Hinweis zur Orientierung.');
  }

  return parts.join(' ');
}

/* ─── explainWeighting ───────────────────────────────────────────────
 * Wenn `intensity` und/oder `exposure` gesetzt sind, hat die Engine das
 * Likelihood-Modell justiert. Dieser Satz erklärt das — ohne Zahlen,
 * ohne Engine-Vokabular.
 *
 * Liefert `null`, wenn keine Kontext-Tags gesetzt sind — die UI kann
 * den Hinweis dann komplett weglassen.
 */
export function explainWeighting(tags: ActivityTags): string | null {
  const i = tags.intensity;
  const e = tags.exposure;
  if (!i && !e) return null;

  const bits: string[] = [];
  if (i) bits.push(`„${INTENSITY_PROSE[i]}"`);
  if (e) bits.push(`„${EXPOSURE_PROSE[e]}"`);

  if (bits.length === 1) {
    return `Die Bewertung berücksichtigt Ihre Angabe zu ${bits[0]}.`;
  }
  return `Die Bewertung berücksichtigt Ihre Angaben zu ${joinGerman(bits)}.`;
}

const INTENSITY_PROSE: Record<Intensity, string> = {
  gelegentlich: 'gelegentlich',
  regelmaessig: 'regelmäßig',
  taeglich:     'täglich',
  dauerhaft:    'dauerhaft'
};

const EXPOSURE_PROSE: Record<Exposure, string> = {
  gering: 'geringe Belastung',
  mittel: 'mittlere Belastung',
  hoch:   'hohe Belastung'
};

/* ─── Qualitative Score-Labels (statt n/5) ──────────────────────────
 * Die Engine liefert severity/likelihood als Zahlen 1–5. Sichtbar
 * machen wir nur die Qualität.
 */
export function qualitativeSeverity(severity: number): string {
  if (severity >= 5) return 'sehr hoch';
  if (severity >= 4) return 'hoch';
  if (severity >= 3) return 'mittel';
  if (severity >= 2) return 'gering';
  return 'sehr gering';
}

export function qualitativeLikelihood(likelihood: number): string {
  if (likelihood >= 5) return 'sehr häufig';
  if (likelihood >= 4) return 'häufig';
  if (likelihood >= 3) return 'gelegentlich';
  if (likelihood >= 2) return 'selten';
  return 'sehr selten';
}

/* ─── Util ───────────────────────────────────────────────────────────── */
function lowerFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

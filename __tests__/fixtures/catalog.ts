/**
 * Test-Catalog — kleine, deterministische Stammdaten-Fixture (v2).
 *
 * Diese Fixture wird in ALLEN Engine-Tests verwendet. Sie ist absichtlich
 * vom DB-Seed entkoppelt: ein Update der produktiven Stammdaten darf
 * keinen Test brechen, sonst verliert das Test-System seinen Wert als
 * Regressionsschutz.
 *
 * v2 (Compliance Quality Sprint, Migration 0013):
 *   - Schärfere Maßnahmen-Formulierungen (DGUV-konforme Sprache)
 *   - Neue Risiken (absturz-hoehenarbeit, hautkontakt-reizstoffe)
 *   - Neue Maßnahmen (psaga, hautschutzplan)
 *   - Vorhandene Test-Slugs bleiben kompatibel — die Branchen-Fixtures
 *     müssen die neuen Risk-Slugs allerdings explizit erwähnen, sonst
 *     bricht das `expected_risks`-Assert.
 *
 * Engine-Pfad-Abdeckung:
 *   - Trigger via work_height / tools / hazardous_substances / environment /
 *     workforce / psychological
 *   - Mandatory via any_substance / risks-Liste / work_height
 *   - Missing-Controls (alle 4 Pfade)
 *   - Plausibility (alle 5 Pfade)
 */

import type {
  RaRiskCatalog,
  RaMeasureCatalog,
  RaLegalRef
} from '@/lib/db/types';

export const TEST_RISKS: RaRiskCatalog[] = [
  {
    slug: 'absturz',
    name: 'Absturz aus Höhe',
    category: 'mechanisch',
    typical_areas: ['baustelle', 'fassade'],
    source_ref_slugs: ['betrsichv-3', 'dguv-v1', 'rab-32'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      work_height: ['ueber-2m', 'fassade-dach']
    },
    severity_default: 5,
    likelihood_default: 3,
    requires_betriebsanweisung: false,
    requires_psa: true,
    requires_unterweisung: true
  },
  {
    slug: 'gefahrstoff-loesemittel',
    name: 'Exposition gegenüber Lösemitteln',
    category: 'chemisch',
    typical_areas: ['werkstatt'],
    source_ref_slugs: ['gefstoffv-6', 'gefstoffv-14'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      hazardous_substances: ['farben_lacke', 'reinigung', 'schmierstoffe', 'kuehlmittel']
    },
    severity_default: 4,
    likelihood_default: 3,
    requires_betriebsanweisung: true,
    requires_psa: true,
    requires_unterweisung: true
  },
  {
    slug: 'staubexposition',
    name: 'Staubexposition (lungengängig)',
    category: 'chemisch',
    typical_areas: ['werkstatt', 'baustelle'],
    source_ref_slugs: ['gefstoffv-6', 'dguv-r-201'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      hazardous_substances: ['staub_schleifen']
    },
    severity_default: 3,
    likelihood_default: 4,
    requires_betriebsanweisung: true,
    requires_psa: true,
    requires_unterweisung: false
  },
  {
    slug: 'bildschirmbelastung',
    name: 'Belastung durch Bildschirmarbeit',
    category: 'ergonomisch',
    typical_areas: ['buero'],
    source_ref_slugs: ['arbstaettv-6', 'arbmedvv-g37'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      tools: ['bildschirm']
    },
    severity_default: 2,
    likelihood_default: 4,
    requires_betriebsanweisung: false,
    requires_psa: false,
    requires_unterweisung: true
  },
  {
    slug: 'flurfoerderzeug-unfall',
    name: 'Unfall mit Flurförderzeug',
    category: 'mechanisch',
    typical_areas: ['lager'],
    source_ref_slugs: ['dguv-v68'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      tools: ['flurfoerderzeuge']
    },
    severity_default: 5,
    likelihood_default: 2,
    requires_betriebsanweisung: true,
    requires_psa: false,
    requires_unterweisung: true
  },
  {
    slug: 'alleinarbeit-notfall',
    name: 'Notfallbewältigung bei Alleinarbeit',
    category: 'organisatorisch',
    typical_areas: ['baustelle', 'aussendienst'],
    source_ref_slugs: ['dguv-v1', 'dguv-r-112-139'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      workforce: ['alleinarbeit']
    },
    severity_default: 4,
    likelihood_default: 2,
    requires_betriebsanweisung: false,
    requires_psa: false,
    requires_unterweisung: true
  },
  {
    slug: 'psychische-belastung-zeitdruck',
    name: 'Psychische Belastung (Zeitdruck, Verantwortung)',
    category: 'psychosozial',
    typical_areas: ['buero'],
    source_ref_slugs: ['arbschg-5'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      psychological: ['zeitdruck', 'emotionale_belastung']
    },
    severity_default: 3,
    likelihood_default: 3,
    requires_betriebsanweisung: false,
    requires_psa: false,
    requires_unterweisung: false
  },
  {
    slug: 'handwerkzeug-schnittverletzung',
    name: 'Schnitt- und Quetschverletzungen durch Handwerkzeuge',
    category: 'mechanisch',
    typical_areas: ['werkstatt', 'baustelle'],
    source_ref_slugs: ['betrsichv-3', 'dguv-v1'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      tools: ['handgefuehrt']
    },
    severity_default: 3,
    likelihood_default: 3,
    requires_betriebsanweisung: false,
    requires_psa: true,
    requires_unterweisung: true
  },
  // ─── NEU in v2 (Migration 0013) ────────────────────────────────────────
  {
    slug: 'hautkontakt-reizstoffe',
    name: 'Hautkontakt mit reizenden Stoffen',
    category: 'chemisch',
    typical_areas: ['werkstatt', 'kunde'],
    source_ref_slugs: ['trgs-401', 'dguv-i-203-080'],
    data_source: 'fixture-v2',
    trigger_conditions: {
      hazardous_substances: ['farben_lacke', 'reinigung', 'schmierstoffe', 'kuehlmittel']
    },
    severity_default: 3,
    likelihood_default: 4,
    requires_betriebsanweisung: true,
    requires_psa: true,
    requires_unterweisung: true
  },
  // ─── NEU in v3 (Migration 0014, Risiko-Splitting + Branchen) ───────────
  {
    slug: 'laerm-exposition',
    name: 'Lärmexposition über Tages-Lärmexpositionspegel',
    category: 'physikalisch',
    typical_areas: ['werkstatt', 'baustelle', 'lager'],
    source_ref_slugs: ['laermvibrarbschv', 'arbmedvv-g20'],
    data_source: 'fixture-v3',
    trigger_conditions: {
      tools: ['cnc', 'handgefuehrt', 'flurfoerderzeuge'],
      environment: ['werkstatt', 'baustelle', 'lager']
    },
    severity_default: 3,
    likelihood_default: 3,
    requires_betriebsanweisung: false,
    requires_psa: true,
    requires_unterweisung: true
  },
  {
    slug: 'verkehrswege-lager',
    name: 'Verkehrswege-Konflikt Fußgänger / Stapler',
    category: 'mechanisch',
    typical_areas: ['lager'],
    source_ref_slugs: ['dguv-v68-§12'],
    data_source: 'fixture-v3',
    trigger_conditions: {
      tools: ['flurfoerderzeuge'],
      environment: ['lager']
    },
    severity_default: 5,
    likelihood_default: 3,
    requires_betriebsanweisung: false,
    requires_psa: true,
    requires_unterweisung: true
  },
  {
    slug: 'homeoffice-ergonomie',
    name: 'Telearbeitsplatz Homeoffice (Ergonomie + Belastung)',
    category: 'ergonomisch',
    typical_areas: ['homeoffice'],
    source_ref_slugs: ['arbstaettv-1'],
    data_source: 'fixture-v3',
    trigger_conditions: {
      environment: ['homeoffice']
    },
    severity_default: 2,
    likelihood_default: 4,
    requires_betriebsanweisung: false,
    requires_psa: false,
    requires_unterweisung: true
  }
];

export const TEST_MEASURES: RaMeasureCatalog[] = [
  /* ─── Technisch (T) ──────────────────────────────────────────────── */
  {
    slug: 'absturzsicherung-geruest',
    short_text: 'Gerüst statt Leiter ab 2 m Standhöhe (kollektive Absturzsicherung)',
    long_text: 'Bei dauerhaften Arbeiten über 2 m wird ein normgerechtes Gerüst (DIN EN 12810/12811) statt einer Leiter eingesetzt. TOP-Prinzip: kollektive Sicherung (Gerüst, Geländer) hat Vorrang vor individueller (PSAgA). Aufbau, Veränderung und Abbau nur durch befähigte Person mit Aufbau- und Verwendungsanleitung des Herstellers.',
    category: 'technisch',
    applies_to_risks: ['absturz'],
    source_ref_slugs: ['betrsichv-3', 'rab-32'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: undefined
  },
  {
    slug: 'staubabsaugung-am-werkzeug',
    short_text: 'Staubabsaugung direkt am Werkzeug (Klasse M oder H)',
    long_text: 'Schleif-, Bohr- und Trennarbeiten werden mit integrierter oder direkt aufgesetzter Absaugung der Klasse M (allgemein) oder H (krebserzeugend, Quarz) betrieben. Reinigung im Auffangbehälter ohne Aufwirbeln. Nachweis im Audit: Inventar mit Filterklassen-Zuordnung.',
    category: 'technisch',
    applies_to_risks: ['staubexposition'],
    source_ref_slugs: ['gefstoffv-6'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: undefined
  },
  {
    slug: 'bildschirm-ergonomie',
    short_text: 'Ergonomischer Bildschirmarbeitsplatz nach ArbStättV Anh. 6 + G37-Vorsorge',
    long_text: 'Höhenverstellbarer Stuhl mit Lordosenstütze, Bildschirm in Augenhöhe (Sehabstand 50–70 cm), blendfreie Beleuchtung ≥500 Lux am Arbeitsplatz. Allen Bildschirmbeschäftigten wird die arbeitsmedizinische Angebotsvorsorge G37 gem. ArbMedVV vor Aufnahme und in regelmäßigen Abständen angeboten.',
    category: 'organisatorisch',
    applies_to_risks: ['bildschirmbelastung'],
    source_ref_slugs: ['arbstaettv-6', 'arbmedvv-g37'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: undefined
  },

  /* ─── Organisatorisch (O) ─────────────────────────────────────────── */
  {
    slug: 'sdb-verfuegbar',
    short_text: 'Sicherheitsdatenblätter aktuell und am Verwendungsort zugänglich',
    long_text: 'Für jeden eingesetzten Gefahrstoff liegt ein aktuelles Sicherheitsdatenblatt (max. 3 Jahre alt) in deutscher Sprache vor und ist am Verwendungsort zugänglich. Daraus wird eine Betriebsanweisung gem. GefStoffV §14 in mitarbeiterverständlicher Sprache abgeleitet.',
    category: 'organisatorisch',
    applies_to_risks: ['gefahrstoff-loesemittel', 'staubexposition'],
    source_ref_slugs: ['gefstoffv-14'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { any_substance: true }
  },
  {
    slug: 'gefahrstoffverzeichnis',
    short_text: 'Gefahrstoffverzeichnis nach GefStoffV §6 — jährliche Aktualisierung',
    long_text: 'Verzeichnis aller eingesetzten Gefahrstoffe mit Bezeichnung, CLP-Einstufung, Mengen, Verwendungsbereichen und SDB-Verweis. Mindestens jährlich auf Vollständigkeit geprüft.',
    category: 'organisatorisch',
    applies_to_risks: ['gefahrstoff-loesemittel', 'staubexposition'],
    source_ref_slugs: ['gefstoffv-6'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { any_substance: true }
  },
  {
    slug: 'unterweisung-stapler',
    short_text: 'Staplerschein + jährliche Unterweisung nach DGUV V68',
    long_text: 'Nur ausgebildete Beschäftigte mit gültigem Befähigungsnachweis und jährlicher Unterweisung führen Flurförderzeuge. Schriftliche Beauftragung durch den Unternehmer.',
    category: 'organisatorisch',
    applies_to_risks: ['flurfoerderzeug-unfall'],
    source_ref_slugs: ['dguv-v68'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { risks: ['flurfoerderzeug-unfall'] }
  },
  {
    slug: 'alleinarbeit-erreichbar',
    short_text: 'Personen-Notsignal-Anlage (PNA) oder Check-in-Verfahren',
    long_text: 'Bei Alleinarbeit mit erhöhter Gefährdung: PNA-11 Gerät gem. DGUV Regel 112-139 (Lage-, Verlust-, Ruhe-Alarm). Bei niedriger Gefährdung: schriftliches Check-in-Verfahren mit definierten Intervallen und Eskalationskette.',
    category: 'organisatorisch',
    applies_to_risks: ['alleinarbeit-notfall'],
    source_ref_slugs: ['dguv-v1', 'dguv-r-112-139'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { risks: ['alleinarbeit-notfall'] }
  },
  {
    slug: 'gefaehrdungsbeurteilung-psyche',
    short_text: 'Psychische Belastung systematisch beurteilen (GDA-Leitlinie)',
    long_text: 'Erfassung gem. ArbSchG §5 entlang der 5 Merkmalsbereiche der GDA-Leitlinie. Maßnahmen werden abgeleitet und nach 1–2 Jahren auf Wirksamkeit geprüft.',
    category: 'organisatorisch',
    applies_to_risks: ['psychische-belastung-zeitdruck'],
    source_ref_slugs: ['arbschg-5'],
    confidence: 'medium',
    data_source: 'fixture-v2',
    is_mandatory_when: undefined
  },

  /* ─── Personenbezogen (P) ─────────────────────────────────────────── */
  {
    slug: 'psa-bereitstellen',
    short_text: 'PSA gegen Absturz (PSAgA) ab 2 m Höhe — Auffanggurt + Anschlagpunkte',
    long_text: 'Bei Arbeiten über 2 m wird PSA gegen Absturz nach RAB 32 bereitgestellt: Auffanggurt Klasse A, Verbindungsmittel mit Falldämpfer, Anschlagpunkte ≥10 kN. Jährliche Sachkundeprüfung der PSAgA und jährliche praktische Unterweisung der Träger.',
    category: 'personenbezogen',
    applies_to_risks: ['absturz'],
    source_ref_slugs: ['dguv-v1', 'betrsichv-3', 'rab-32'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { work_height: ['ueber-2m', 'fassade-dach'] }
  },
  {
    slug: 'atemschutz-bei-staub',
    short_text: 'Atemschutz nach Expositionsklasse (FFP2 / FFP3 bei Quarz)',
    long_text: 'Bei sichtbarer Staubentwicklung mindestens FFP2; bei krebserzeugenden Stäuben (Quarz, Holzstäube) FFP3. Tragezeitbegrenzung gem. DGUV Regel 112-190 beachten.',
    category: 'personenbezogen',
    applies_to_risks: ['staubexposition'],
    source_ref_slugs: ['dguv-r-201'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { risks: ['staubexposition'] }
  },
  {
    slug: 'schnittschutz-handschuhe',
    short_text: 'Schnittschutzhandschuhe nach EN 388, mind. Cut-Level B',
    long_text: 'Stufe je nach Schärfe und Tätigkeit; Mindestanforderung Cut-Level B (EN 388:2016). Eignung für Stoff und Tätigkeit dokumentiert.',
    category: 'personenbezogen',
    applies_to_risks: ['handwerkzeug-schnittverletzung'],
    source_ref_slugs: ['dguv-v1'],
    confidence: 'medium',
    data_source: 'fixture-v2',
    is_mandatory_when: undefined
  },
  // ─── NEU in v2 (Migration 0013) ────────────────────────────────────────
  {
    slug: 'hautschutzplan',
    short_text: 'Hautschutzplan (Schutz–Reinigung–Pflege) nach TRGS 401',
    long_text: 'Bei Hautkontakt mit feuchten, reizenden oder fett-/öllösenden Stoffen wird ein dreistufiger Hautschutzplan am Waschplatz ausgehangen: (1) Schutz vor der Tätigkeit, (2) schonende Reinigung, (3) Pflege nach Schichtende. Schutzhandschuhe Cat. III bei Chemikalien mit Permeations-Datenblatt.',
    category: 'personenbezogen',
    applies_to_risks: ['hautkontakt-reizstoffe', 'gefahrstoff-loesemittel'],
    source_ref_slugs: ['trgs-401', 'dguv-i-203-080'],
    confidence: 'high',
    data_source: 'fixture-v2',
    is_mandatory_when: { risks: ['hautkontakt-reizstoffe'] }
  },
  // ─── NEU in v3 (Migration 0014, ArbMed-Vorsorge + Branchen) ────────────
  {
    slug: 'vorsorge-g20-laerm',
    short_text: 'Pflichtvorsorge G20 (Lärm) ab 85 dB(A) Tages-Lärmexpositionspegel',
    long_text: 'Beschäftigten mit ≥85 dB(A) Tages-Lärmexpositionspegel wird die arbeitsmedizinische Pflichtvorsorge G20 nach ArbMedVV angeboten. Erstvorsorge vor Aufnahme, danach Nachuntersuchung im ersten Jahr und alle 36 Monate. Nachweis im Audit: Vorsorgekartei beim Betriebsarzt.',
    category: 'organisatorisch',
    applies_to_risks: ['laerm-exposition'],
    source_ref_slugs: ['arbmedvv-g20', 'laermvibrarbschv'],
    confidence: 'high',
    data_source: 'fixture-v3',
    is_mandatory_when: { risks: ['laerm-exposition'] }
  },
  {
    slug: 'vorsorge-g24-haut',
    short_text: 'Pflichtvorsorge G24 (Haut) bei Feuchtarbeit > 4 h/Schicht',
    long_text: 'Bei Feuchtarbeit von mehr als 4 Stunden je Schicht oder regelmäßigem Hautkontakt mit Reizstoffen: arbeitsmedizinische Pflichtvorsorge G24 nach ArbMedVV. Nachweis im Audit: Tätigkeits-Zeitanalyse, Vorsorge-Bescheinigung.',
    category: 'organisatorisch',
    applies_to_risks: ['hautkontakt-reizstoffe'],
    source_ref_slugs: ['arbmedvv-g24', 'trgs-401'],
    confidence: 'high',
    data_source: 'fixture-v3',
    is_mandatory_when: { risks: ['hautkontakt-reizstoffe'] }
  },
  {
    slug: 'verkehrswege-trennung-stapler',
    short_text: 'Fußgänger- und Stapler-Verkehrswege baulich oder markiert getrennt',
    long_text: 'DGUV V68 §12: Trennung baulich (Geländer, Schutzbügel) oder durch mindestens 75 cm breite gelbe Bodenmarkierung. Sichtbeschränkte Querungen mit Konvex-Spiegel. Nachweis im Audit: Verkehrswege-Plan, Begehung mit Mängelliste.',
    category: 'technisch',
    applies_to_risks: ['verkehrswege-lager'],
    source_ref_slugs: ['dguv-v68-§12'],
    confidence: 'high',
    data_source: 'fixture-v3',
    is_mandatory_when: { risks: ['verkehrswege-lager'] }
  },
  {
    slug: 'homeoffice-beurteilung',
    short_text: 'Schriftliche Beurteilung des Telearbeitsplatzes (ArbStättV §1)',
    long_text: 'Vor Aufnahme der Telearbeit wird der Homeoffice-Arbeitsplatz schriftlich beurteilt: Bildschirm-Position, Stuhl, Tisch, Beleuchtung ≥500 Lux, Raumklima. Selbst-Checkliste nach DGUV I 215-441 reicht. Nachweis im Audit: Selbst-Beurteilungsbogen je Beschäftigtem.',
    category: 'organisatorisch',
    applies_to_risks: ['homeoffice-ergonomie'],
    source_ref_slugs: ['arbstaettv-1'],
    confidence: 'high',
    data_source: 'fixture-v3',
    is_mandatory_when: { risks: ['homeoffice-ergonomie'] }
  }
];

export const TEST_LEGAL_REFS: RaLegalRef[] = [
  { slug: 'arbschg-5',     kind: 'gesetz',    citation: 'ArbSchG §5',      title: 'Beurteilung der Arbeitsbedingungen',           url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'arbstaettv-6',  kind: 'verordnung',citation: 'ArbStättV §6',    title: 'Bildschirmarbeitsplätze',                       url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'arbmedvv-g37',  kind: 'gesetz',    citation: 'ArbMedVV G37',    title: 'Angebotsvorsorge Bildschirmarbeit',             url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'betrsichv-3',   kind: 'verordnung',citation: 'BetrSichV §3',    title: 'Gefährdungsbeurteilung Arbeitsmittel',          url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'gefstoffv-6',   kind: 'verordnung',citation: 'GefStoffV §6',    title: 'Informationsermittlung + Gefahrstoffverzeichnis',url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'gefstoffv-14',  kind: 'verordnung',citation: 'GefStoffV §14',   title: 'Betriebsanweisung + Unterweisung',              url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'trgs-401',      kind: 'technische-regel', citation: 'TRGS 401', title: 'Gefährdung durch Hautkontakt',                  url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'rab-32',        kind: 'technische-regel', citation: 'RAB 32',   title: 'PSA gegen Absturz auf Baustellen',              url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'dguv-v1',       kind: 'dguv',      citation: 'DGUV V1',         title: 'Grundsätze der Prävention',                     url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'dguv-v68',      kind: 'dguv',      citation: 'DGUV V68',        title: 'Flurförderzeuge',                               url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'dguv-r-201',    kind: 'dguv',      citation: 'DGUV R 201-007',  title: 'Quarzhaltiger Staub — Schutzmaßnahmen',         url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'dguv-r-112-139',kind: 'dguv',      citation: 'DGUV R 112-139',  title: 'Personen-Notsignal-Anlagen (PNA-11)',           url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  { slug: 'dguv-i-203-080',kind: 'dguv',      citation: 'DGUV I 203-080',  title: 'Hautschutz in feuchtem Milieu',                 url: null, bg_slug: null, reviewed_by: 'fixture-v2', reviewed_at: '2026-05-27', data_source: 'fixture-v2' },
  // ─── v3 (Migration 0014) ─────────────────────────────────────────────
  { slug: 'arbmedvv-g20',   kind: 'gesetz',    citation: 'ArbMedVV G20',    title: 'Lärm — Pflicht-/Angebotsvorsorge',              url: null, bg_slug: null, reviewed_by: 'fixture-v3', reviewed_at: '2026-05-27', data_source: 'fixture-v3' },
  { slug: 'arbmedvv-g24',   kind: 'gesetz',    citation: 'ArbMedVV G24',    title: 'Hauterkrankungen — Pflichtvorsorge',            url: null, bg_slug: null, reviewed_by: 'fixture-v3', reviewed_at: '2026-05-27', data_source: 'fixture-v3' },
  { slug: 'laermvibrarbschv',kind:'verordnung',citation: 'LärmVibrationsArbSchV', title: 'Lärm- und Vibrations-Arbeitsschutzverordnung', url: null, bg_slug: null, reviewed_by: 'fixture-v3', reviewed_at: '2026-05-27', data_source: 'fixture-v3' },
  { slug: 'dguv-v68-§12',   kind: 'dguv',      citation: 'DGUV V68 §12',    title: 'Trennung Fußgänger- und FFZ-Verkehrswege',      url: null, bg_slug: null, reviewed_by: 'fixture-v3', reviewed_at: '2026-05-27', data_source: 'fixture-v3' },
  { slug: 'arbstaettv-1',   kind: 'verordnung',citation: 'ArbStättV §1',    title: 'Geltungsbereich Telearbeit',                    url: null, bg_slug: null, reviewed_by: 'fixture-v3', reviewed_at: '2026-05-27', data_source: 'fixture-v3' }
];

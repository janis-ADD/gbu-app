-- =============================================================================
-- Migration 0013 — Compliance Quality Sprint (fachliche Schärfung v2)
-- =============================================================================
-- Ziel: Risk- und Measure-Katalog auf das Sprachniveau einer Fachkraft für
-- Arbeitssicherheit / DGUV-Audit heben. Keine Schema-Änderung, keine
-- Engine-Anpassung — nur Stammdaten-Qualität.
--
-- Bezugsnormen, die hier konkret zitiert werden:
--   ArbSchG §5, §6
--   BetrSichV §3, §14, Anhang 1
--   GefStoffV §6, §14
--   TRGS 401 (Gefährdung durch Hautkontakt)
--   TRGS 510 (Lagerung Gefahrstoffe)
--   LärmVibrationsArbSchV §6, §7, §8
--   ArbMedVV (G25 / G37 / G42 — arbeitsmedizinische Vorsorge)
--   DGUV Vorschrift 1, 3, 38, 70
--   DGUV Regel 108-007 (Lagereinrichtungen / Regale)
--   DGUV Information 208-016, 215-410, 212-016
--   ASR A1.7, A2.2, A3.5, A3.6
--   RAB 32 (PSAgA Anschlagpunkte)
--
-- Doktrin: konservativ. Lieber eine Pflicht-Maßnahme zu viel als zu wenig.
-- Sprachstil: prüfbare Verben, konkrete Intervalle, Norm-Bezug in long_text.
-- =============================================================================

-- ─── PHASE 1: Bestehende Risiko-Beschreibungen schärfen ────────────────────
-- (Name + typical_areas + source_refs werden hier explizit aktualisiert,
--  trigger_conditions bleiben unverändert — siehe Migration 0008.)

update ra_risk_catalog set
  name = 'Absturz von Leitern und Tritten',
  source_ref_slugs = array['dguv-i-208-016','bg-bau-b198','betrsichv','trbs-2121-2']
where slug = 'leitern-tritte';

update ra_risk_catalog set
  name = 'Gesundheitsgefährdung durch Gefahrstoffe',
  source_ref_slugs = array['gefstoffv','trgs-510','trgs-401','dguv-i-212-016']
where slug = 'gefahrstoffe';

update ra_risk_catalog set
  name = 'Elektrischer Schlag / Lichtbogen bei Betriebsmitteln',
  source_ref_slugs = array['dguv-v3','betrsichv','trbs-1201']
where slug = 'elektrische-betriebsmittel';

update ra_risk_catalog set
  name = 'Lärm-, Staub- und Dampfexposition am Arbeitsplatz',
  source_ref_slugs = array['gefstoffv','laermvibrarbschv','dguv-i-212-016']
where slug = 'laerm-staub-daempfe';

update ra_risk_catalog set
  name = 'Notfallbewältigung bei Alleinarbeit',
  source_ref_slugs = array['arbschg','dguv-v1','dguv-r-112-139']
where slug = 'alleinarbeit';

update ra_risk_catalog set
  name = 'Verkehrs- und Transportunfälle',
  source_ref_slugs = array['stvo','dguv-v70','dguv-v1']
where slug = 'transport-fahrzeuge';

update ra_risk_catalog set
  name = 'Manuelles Heben, Tragen und Ziehen von Lasten',
  source_ref_slugs = array['lasthandhabv','arbschg','dguv-i-208-033']
where slug = 'manuelles-heben-tragen';

update ra_risk_catalog set
  name = 'Brand- und Evakuierungsrisiko',
  source_ref_slugs = array['asr-a2-2','arbschg','dguv-i-205-001']
where slug = 'brand-fluchtwege';

update ra_risk_catalog set
  name = 'Bildschirm- und Büroarbeitsplatz (Ergonomie + Augen)',
  source_ref_slugs = array['arbstaettv-6','arbmedvv-g37','arbschg']
where slug = 'buero-bildschirm';

update ra_risk_catalog set
  name = 'Psychische Belastung (Zeitdruck, Verantwortung, Schichtarbeit)',
  source_ref_slugs = array['arbschg','dguv-i-206-007']
where slug = 'psychische-belastung';

update ra_risk_catalog set
  name = 'Koordinationsrisiken bei Fremdfirmen-Einsatz',
  source_ref_slugs = array['arbschg','dguv-v1','baustellv']
where slug = 'fremdfirmen';

update ra_risk_catalog set
  name = 'Kontakt mit Reinigungs- und Desinfektionsmitteln',
  source_ref_slugs = array['gefstoffv','trgs-401','dguv-i-203-080']
where slug = 'reinigungsmittel-chemikalien';

-- ─── PHASE 2: Neue Legal-Refs (Norm-Bezüge die in 0013 zitiert werden) ──────
insert into ra_legal_refs (slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source) values
  ('trbs-2121-2',     'technische-regel', 'TRBS 2121 Teil 2',        'Gefährdungen bei der Verwendung von Leitern',                                       'https://www.baua.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('trbs-1201',       'technische-regel', 'TRBS 1201',                'Prüfungen und Kontrollen von Arbeitsmitteln',                                      'https://www.baua.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('trgs-401',        'technische-regel', 'TRGS 401',                 'Gefährdung durch Hautkontakt — Ermittlung, Beurteilung, Maßnahmen',                'https://www.baua.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('laermvibrarbschv','verordnung',       'LärmVibrationsArbSchV',    'Lärm- und Vibrations-Arbeitsschutzverordnung',                                     'https://www.gesetze-im-internet.de/l_rmvibrationsarbschv/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('arbmedvv-g37',    'gesetz',           'ArbMedVV Anhang Teil 4',   'Bildschirmarbeitsplätze — Angebotsvorsorge G37',                                   'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('arbmedvv-g25',    'gesetz',           'ArbMedVV Anhang Teil 4',   'Fahr-, Steuer- und Überwachungstätigkeiten — Angebotsvorsorge G25',                'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('arbmedvv-g42',    'gesetz',           'ArbMedVV Anhang Teil 2',   'Tätigkeiten mit biologischen Arbeitsstoffen — Angebotsvorsorge G42',               'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-v3-§6',      'dguv-vorschrift',  'DGUV V3 §6',               'Arbeiten an unter Spannung stehenden Teilen — 5 Sicherheitsregeln',                'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-v70',        'dguv-vorschrift',  'DGUV V70',                 'Fahrzeuge — Betrieb und Wartung',                                                  'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-r-108-007',  'dguv-regel',       'DGUV Regel 108-007',       'Lagereinrichtungen und -geräte (Regalprüfung)',                                    'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-r-112-139',  'dguv-regel',       'DGUV Regel 112-139',       'Einsatz von Personen-Notsignal-Anlagen (PNA-11)',                                  'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-i-203-080',  'dguv-information', 'DGUV Information 203-080', 'Hautschutz bei Tätigkeiten in feuchtem Milieu',                                    'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-i-205-001',  'dguv-information', 'DGUV Information 205-001', 'Betrieblicher Brandschutz in der Praxis',                                          'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-i-208-033',  'dguv-information', 'DGUV Information 208-033', 'Belastungen für Rücken und Gelenke — manuelle Lastenhandhabung',                   'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-i-215-410',  'dguv-information', 'DGUV Information 215-410', 'Bildschirm- und Büroarbeitsplätze — Leitfaden für die Gestaltung',                 'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('dguv-i-206-007',  'dguv-information', 'DGUV Information 206-007', 'So geht es! — psychische Belastung am Arbeitsplatz',                                'https://publikationen.dguv.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('rab-32',          'technische-regel', 'RAB 32',                   'Regeln zum Arbeitsschutz auf Baustellen — Persönliche Schutzausrüstung gegen Absturz', 'https://www.baua.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('asr-a3-5',        'asr',              'ASR A3.5',                 'Raumtemperatur (Technische Regeln für Arbeitsstätten)',                            'https://www.baua.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('asr-a3-6',        'asr',              'ASR A3.6',                 'Lüftung (Technische Regeln für Arbeitsstätten)',                                   'https://www.baua.de/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('arbstaettv-6',    'verordnung',       'ArbStättV Anhang 6',       'Anforderungen an Bildschirmarbeitsplätze',                                         'https://www.gesetze-im-internet.de/arbst_ttv_2004/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2'),
  ('baustellv',       'verordnung',       'BaustellV',                'Baustellenverordnung',                                                              'https://www.gesetze-im-internet.de/baustellv/', null, 'curated-v2', '2026-05-27', 'curated-mini-set-v2')
on conflict (slug) do update set
  citation     = excluded.citation,
  title        = excluded.title,
  url          = excluded.url,
  reviewed_by  = excluded.reviewed_by,
  reviewed_at  = excluded.reviewed_at,
  data_source  = excluded.data_source;

-- ─── PHASE 3: Neue Risiken ──────────────────────────────────────────────────

insert into ra_risk_catalog (slug, name, category, typical_areas, source_ref_slugs, data_source, trigger_conditions, severity_default, likelihood_default, requires_betriebsanweisung, requires_psa, requires_unterweisung) values
  ('absturz-hoehenarbeit',
   'Absturz bei Höhenarbeit (Gerüst, Dach, Fassade)',
   'mechanisch',
   array['baustelle','fassade','dach'],
   array['betrsichv','rab-32','dguv-v1','dguv-i-208-016'],
   'curated-mini-set-v2',
   '{"work_height":["ueber-2m","fassade-dach"]}'::jsonb,
   5, 3, false, true, true),

  ('arbeiten-unter-spannung',
   'Arbeiten an unter Spannung stehenden Anlagen',
   'elektrisch',
   array['baustelle','werkstatt'],
   array['dguv-v3','dguv-v3-§6'],
   'curated-mini-set-v2',
   '{"tools":["handgefuehrt","cnc"],"environment":["werkstatt","baustelle"]}'::jsonb,
   5, 2, true, true, true),

  ('hautkontakt-reizstoffe',
   'Hautkontakt mit reizenden oder allergisierenden Stoffen',
   'chemisch',
   array['werkstatt','kunde','lager'],
   array['trgs-401','dguv-i-203-080','gefstoffv'],
   'curated-mini-set-v2',
   '{"hazardous_substances":["farben_lacke","reinigung","schmierstoffe","kuehlmittel"]}'::jsonb,
   3, 4, true, true, true),

  ('regalsystem-standfestigkeit',
   'Standfestigkeit und Belastbarkeit von Lagerregalen',
   'mechanisch',
   array['lager'],
   array['dguv-r-108-007','betrsichv'],
   'curated-mini-set-v2',
   '{"environment":["lager"]}'::jsonb,
   4, 2, false, false, true),

  ('uv-witterung-aussenarbeit',
   'UV-Strahlung, Hitze und Witterungseinflüsse im Außenbereich',
   'physikalisch',
   array['baustelle','aussendienst'],
   array['arbschg','dguv-i-208-016'],
   'curated-mini-set-v2',
   '{"environment":["aussen"],"mobility":["baustelle","aussendienst"]}'::jsonb,
   3, 3, false, true, true)

on conflict (slug) do update set
  name                          = excluded.name,
  category                      = excluded.category,
  typical_areas                 = excluded.typical_areas,
  source_ref_slugs              = excluded.source_ref_slugs,
  data_source                   = excluded.data_source,
  trigger_conditions            = excluded.trigger_conditions,
  severity_default              = excluded.severity_default,
  likelihood_default            = excluded.likelihood_default,
  requires_betriebsanweisung    = excluded.requires_betriebsanweisung,
  requires_psa                  = excluded.requires_psa,
  requires_unterweisung         = excluded.requires_unterweisung;

-- ─── PHASE 4: Bestehende Maßnahmen-Texte schärfen ──────────────────────────
-- Vorher: Floskeln. Nachher: prüfbar (WER, WAS, IN WELCHEM INTERVALL,
-- WORAN ERKENNBAR IM AUDIT).

update ra_measure_catalog set
  short_text = 'Jährliche Prüfung der Leitern durch befähigte Person',
  long_text  = 'Alle Leitern und Tritte werden mindestens einmal jährlich durch eine befähigte Person (TRBS 1203, z. B. unterwiesener Mitarbeiter mit Prüf-Schulung) auf mechanische Festigkeit, Spreizsicherung, Rutschsicherheit der Füße und Lesbarkeit der Kennzeichnung geprüft. Prüfprotokoll mit Datum, Prüfer-Name und Mängelbefund wird mindestens 2 Jahre archiviert. Nachweis im Audit: aktuelles Prüfprotokoll je Leiter, schriftliche Bestellung der befähigten Person.',
  source_ref_slugs = array['dguv-i-208-016','bg-bau-b198','trbs-2121-2','trbs-1201'],
  category = 'organisatorisch'
where slug = 'leiterpruefung-jaehrlich';

update ra_measure_catalog set
  short_text = 'Sichtprüfung vor jedem Einsatz, Mängelmeldung dokumentiert',
  long_text  = 'Vor jedem Einsatz wird die Leiter durch den Nutzer auf erkennbare Mängel (verbogene Holme, gebrochene Sprossen, fehlende Spreizsicherung, defekte Füße) sichtgeprüft. Mängel-Leitern werden sofort außer Betrieb genommen, gekennzeichnet („gesperrt") und dem Verantwortlichen gemeldet. Nachweis im Audit: schriftliche Unterweisung der Nutzer, Mängelliste mit Datum.',
  source_ref_slugs = array['dguv-i-208-016','betrsichv','trbs-2121-2']
where slug = 'leiter-sichtpruefung';

update ra_measure_catalog set
  short_text = 'Sicherheitsdatenblätter aktuell und zugänglich am Einsatzort',
  long_text  = 'Für jeden eingesetzten Gefahrstoff liegt ein vom Lieferanten erstelltes Sicherheitsdatenblatt (SDB) in deutscher Sprache vor, in der jeweils aktuellen Fassung (max. 3 Jahre alt oder bei Stoff-Änderung neu). Das SDB ist am Verwendungsort zugänglich (Ordner oder digital). Auf seiner Grundlage wird eine Betriebsanweisung gem. GefStoffV §14 in mitarbeiterverständlicher Sprache erstellt. Nachweis im Audit: SDB-Sammlung, datierte Betriebsanweisungen, Aushang am Arbeitsplatz.',
  source_ref_slugs = array['gefstoffv','trgs-510']
where slug = 'sdb-verfuegbar';

update ra_measure_catalog set
  short_text = 'Gefahrstoffverzeichnis nach GefStoffV §6 — jährliche Aktualisierung',
  long_text  = 'Ein vollständiges Gefahrstoffverzeichnis wird geführt mit: Bezeichnung des Stoffs, Einstufung gem. CLP, eingesetzten Mengen, Verwendungsbereichen und Verweis auf das jeweilige Sicherheitsdatenblatt. Mindestens einmal jährlich wird das Verzeichnis auf Vollständigkeit geprüft (neue Stoffe ergänzt, ausgelaufene gestrichen). Nachweis im Audit: aktuelles Verzeichnis mit Versionsdatum und Verantwortlichem.',
  source_ref_slugs = array['gefstoffv','trgs-510']
where slug = 'gefahrstoffverzeichnis';

update ra_measure_catalog set
  short_text = 'PSA tätigkeitsbezogen, kostenfrei, mit dokumentierter Tragepflicht',
  long_text  = 'Persönliche Schutzausrüstung (PSA) wird tätigkeitsbezogen ermittelt (Schutzbrille, Atemschutz nach Stoff-Klasse, Schutzhandschuhe Cat. I/II/III nach Gefährdung, Sicherheitsschuhe S1-S5) und den Beschäftigten kostenfrei bereitgestellt (ArbSchG §3). Die Tragepflicht ist in einer schriftlichen Anweisung geregelt, die Eignung der PSA für die konkrete Tätigkeit ist dokumentiert. Nachweis im Audit: PSA-Stammblatt je Beschäftigtem, Tragepflicht-Aushang, Bestätigung der ersten Einweisung.',
  source_ref_slugs = array['dguv-i-212-016','arbschg'],
  category = 'personenbezogen'
where slug = 'psa-bereitstellen';

update ra_measure_catalog set
  short_text = 'DGUV V3-Prüfung elektrischer Betriebsmittel im festgelegten Intervall',
  long_text  = 'Alle ortsveränderlichen und ortsfesten elektrischen Betriebsmittel werden gem. DGUV V3 in den nach TRBS 1201 / DGUV Information 203-072 festgelegten Intervallen (i. d. R. 6–24 Monate je nach Einsatzbereich) durch eine Elektrofachkraft (EFK) oder elektrotechnisch unterwiesene Person (EuP) unter Leitung einer EFK geprüft. Jedes Gerät trägt eine sichtbare Prüfplakette mit Datum und Prüfer. Nachweis im Audit: Prüfbuch oder digitales Prüfregister, schriftliche Bestellung der EFK.',
  source_ref_slugs = array['dguv-v3','betrsichv','trbs-1201']
where slug = 'dguv-v3-pruefung';

update ra_measure_catalog set
  short_text = 'Tägliche Sichtprüfung elektrischer Geräte (Anschluss, Kabel, Gehäuse)',
  long_text  = 'Vor jedem Arbeitsbeginn prüft der Nutzer Anschlussleitung, Stecker, Gehäuse und Bedienelemente auf sichtbare Schäden (Quetschstellen, freiliegende Adern, lockere Schraubverbindungen, Hitzespuren). Defekte Geräte werden sofort außer Betrieb genommen, gekennzeichnet und der zuständigen Elektrofachkraft zugeführt. Nachweis im Audit: schriftliche Unterweisung der Nutzer, Mängelmeldungsweg.',
  source_ref_slugs = array['dguv-v3','betrsichv']
where slug = 'sichtpruefung-geraete';

update ra_measure_catalog set
  short_text = 'Führerscheinkontrolle halbjährlich mit Datum dokumentieren',
  long_text  = 'Bei allen Beschäftigten, die ein Firmenfahrzeug führen, wird die Fahrerlaubnis im Original mindestens halbjährlich gesichtet. Datum, Prüfer und Klassen werden in einem Fahrerlaubnis-Verzeichnis dokumentiert. Bei Verlust der Fahrerlaubnis ist die sofortige Meldepflicht durch den Beschäftigten geregelt (Halterhaftung §31 StVZO). Nachweis im Audit: aktuelles Verzeichnis, Unterzeichnung der Meldepflicht.',
  source_ref_slugs = array['stvo','dguv-v70']
where slug = 'fuehrerscheinkontrolle';

update ra_measure_catalog set
  short_text = 'Unterweisung Ladungssicherung nach VDI 2700 mit jährlicher Auffrischung',
  long_text  = 'Beschäftigte mit Be- und Entladetätigkeit werden gem. VDI 2700 / DIN EN 12195-1 zur Ladungssicherung unterwiesen (Reibwerte, Zurrkräfte, Anschlagpunkte, Lastverteilung). Geeignete Sicherungsmittel (Spanngurte mit gültigem Prüfetikett, Antirutschmatten, Trennwände) werden bereitgestellt. Wiederholung jährlich. Nachweis im Audit: Unterweisungsnachweise mit Unterschriften, Inventar der Sicherungsmittel mit Prüfdaten.',
  source_ref_slugs = array['stvo','dguv-v70','dguv-v1'],
  category = 'organisatorisch'
where slug = 'ladungssicherung-schulung';

update ra_measure_catalog set
  short_text = 'Flucht- und Rettungswege freihalten, beschildern, monatlich kontrollieren',
  long_text  = 'Flucht- und Rettungswege sind frei von Hindernissen (auch keine temporäre Lagerung), gut beleuchtet (auch bei Stromausfall durch Sicherheitsbeleuchtung gem. ASR A3.4/3) und mit ASR A1.3-konformen Rettungszeichen ausgeschildert. Eine monatliche Sichtkontrolle durch den Brandschutzbeauftragten oder eine benannte Person ist eingerichtet. Nachweis im Audit: Flucht- und Rettungsplan im Aushang, monatliche Begehungs-Checkliste.',
  source_ref_slugs = array['asr-a2-2','arbschg','dguv-i-205-001']
where slug = 'fluchtwege-freihalten';

update ra_measure_catalog set
  short_text = 'Feuerlöscher: Prüfung alle 2 Jahre, Anzahl gem. ASR A2.2 Tabelle',
  long_text  = 'Anzahl und Verteilung der Feuerlöscher entsprechen den Löschmittel-Einheiten (LE) gem. ASR A2.2 (orientiert an Grundfläche und Brandgefährdung). Jeder Feuerlöscher wird alle 2 Jahre durch eine sachkundige Person (z. B. nach DIN 14406-4) geprüft, die Prüfplakette zeigt das nächste Prüfdatum. Standorte sind mit ASR A1.3-Brandschutzzeichen markiert. Nachweis im Audit: LE-Berechnung, Prüfplaketten, Wartungsvertrag.',
  source_ref_slugs = array['asr-a2-2','dguv-i-205-001']
where slug = 'feuerloescher-pruefen';

update ra_measure_catalog set
  short_text = 'Ersthelfer benennen (DGUV V1 §26): 5 % bei Büro, 10 % sonst',
  long_text  = 'Mindestanzahl betrieblicher Ersthelfer wird festgelegt: 5 % der Beschäftigten in Verwaltungs- und Handelsbetrieben, 10 % in sonstigen Betrieben (DGUV Vorschrift 1 §26). Ersthelfer absolvieren eine Erste-Hilfe-Grundausbildung (9 Unterrichtseinheiten) und werden alle 2 Jahre durch eine 9-UE-Auffrischung fortgebildet. Nachweis im Audit: Bestellung der Ersthelfer mit Datum, aktuelle Ausbildungs-/Fortbildungsnachweise.',
  source_ref_slugs = array['arbschg','dguv-v1']
where slug = 'ersthelfer-benennen';

update ra_measure_catalog set
  short_text = 'Verbandbuch nach DGUV Information 204-021 mindestens 5 Jahre aufbewahren',
  long_text  = 'Jede Erste-Hilfe-Leistung wird unverzüglich im Verbandbuch (oder elektronisch gleichwertig) dokumentiert: Datum, Zeit, Ort, Unfallhergang, Art der Verletzung, durchgeführte Maßnahmen, Name des Ersthelfers. Die Eintragungen werden 5 Jahre aufbewahrt — auch bei vermeintlich unerheblichen Vorfällen, weil sie als Nachweis für spätere Berufskrankheits-Anerkennung dienen können. Nachweis im Audit: Verbandbuch am Erste-Hilfe-Material, Aufbewahrungsdauer eingehalten.',
  source_ref_slugs = array['dguv-v1']
where slug = 'verbandbuch-fuehren';

update ra_measure_catalog set
  short_text = 'Transporthilfen bereitstellen, Lastgrenzen nach LasthandhabV einhalten',
  long_text  = 'Für Lastenhandhabung werden geeignete Transporthilfen (Sackkarre, Hubwagen, Hebebühne, Saugheber) bereitgestellt. Manuelle Hebevorgänge werden nach den Schwellenwerten der LasthandhabV / DGUV Information 208-033 organisiert (Männer >25 kg, Frauen >15 kg möglichst zu zweit; Heben in Rumpfneigung vermeiden). Eine Rückenschule oder gleichwertige Unterweisung wird angeboten. Nachweis im Audit: Inventar Transporthilfen, Unterweisungsnachweis Heben/Tragen.',
  source_ref_slugs = array['lasthandhabv','dguv-i-208-033','arbschg']
where slug = 'transporthilfen-nutzen';

update ra_measure_catalog set
  short_text = 'Bildschirmarbeitsplatz nach ArbStättV Anh. 6 + G37-Angebotsvorsorge',
  long_text  = 'Bildschirmarbeitsplätze werden gem. ArbStättV Anhang 6 eingerichtet: höhenverstellbarer Stuhl mit Lordosenstütze, Bildschirm in Augenhöhe und ca. 50-70 cm Sehabstand, blendfreie Beleuchtung (>500 Lux am Arbeitsplatz). Allen Bildschirmbeschäftigten wird die arbeitsmedizinische Angebotsvorsorge G37 (Bildschirmarbeit, Augenuntersuchung) gem. ArbMedVV vor Aufnahme der Tätigkeit und danach in regelmäßigen Abständen angeboten. Nachweis im Audit: Begehungsprotokoll, dokumentiertes G37-Angebot, ggf. Sehhilfe für Bildschirmarbeit als Kostenträger Arbeitgeber.',
  source_ref_slugs = array['arbstaettv-6','arbmedvv-g37','dguv-i-215-410'],
  category = 'organisatorisch'
where slug = 'ergonomie-buero';

update ra_measure_catalog set
  short_text = 'Staubabsaugung am Werkzeug + Atemschutz nach Expositionsklasse',
  long_text  = 'Bei staub- und dampfintensiven Tätigkeiten wird das Werkzeug mit integrierter oder direkt aufgesetzter Absaugung betrieben (Klasse M oder H je nach Staubart, insbesondere bei Quarzstaub). Reicht die Absaugung nicht, wird ergänzend Atemschutz nach Expositionsklasse bereitgestellt: FFP2 für mineralische Stäube ohne CMR-Wirkung, FFP3 bei Quarz, Asbest-Verdacht oder krebserzeugenden Stoffen. Tragezeitbegrenzung gem. DGUV Regel 112-190 ist berücksichtigt. Nachweis im Audit: Absaug-Inventar, Filterklassen-Doku, Atemschutz-Plan.',
  source_ref_slugs = array['gefstoffv','dguv-i-212-016','laermvibrarbschv']
where slug = 'absaugung-am-geraet';

update ra_measure_catalog set
  short_text = 'Gefahrstoff-Lagerung nach TRGS 510 mit Auffangwanne und Zugangsregelung',
  long_text  = 'Gefahrstoffe werden gemäß TRGS 510 gelagert: getrennt nach Lagerklassen (LGK 3 entzündbare Flüssigkeiten, LGK 6.1 toxische Stoffe, LGK 8 ätzende Stoffe — niemals zusammen), in dichten Behältern, auf Auffangwannen (Volumen mindestens 10 % der Gesamtmenge oder Volumen des größten Gebindes). Zugang nur für unterwiesene Personen, Lager abschließbar oder gegen Wegnahme gesichert. Maximalmengen je Lagerklasse beachten. Nachweis im Audit: Lagerplan mit Klassen-Zuordnung, Auffangwanne-Inventar, Zugangsregelung.',
  source_ref_slugs = array['trgs-510','gefstoffv']
where slug = 'lagerordnung-gefahrstoffe';

update ra_measure_catalog set
  short_text = 'Fremdfirmen-Koordinator nach BaustellV §3, Sicherheitsplan',
  long_text  = 'Bei Einsatz von Fremdfirmen wird ein Koordinator nach BaustellV §3 (auf Baustellen) oder nach DGUV Vorschrift 1 §6 (sonstige Arbeitsstätten) schriftlich bestellt. Vor Arbeitsbeginn werden gegenseitige Gefährdungen ermittelt und ein Sicherheits- und Gesundheitsschutzplan (SiGePlan) erstellt. Eine Eingangs-Unterweisung der Fremdfirmen-Mitarbeiter zu hausinternen Regeln (Fluchtwege, Notruf, Verbote) ist Pflicht. Nachweis im Audit: Bestellung Koordinator, SiGePlan, Eingangs-Unterweisungs-Nachweise.',
  source_ref_slugs = array['arbschg','dguv-v1','baustellv']
where slug = 'koordinator-fremdfirmen';

update ra_measure_catalog set
  short_text = 'Personen-Notsignal-Anlage (PNA) oder schriftliches Check-in-Verfahren',
  long_text  = 'Bei Alleinarbeit mit erhöhter Gefährdung (Höhe, Gefahrstoffe, körperliche Belastung) wird eine Personen-Notsignal-Anlage gem. DGUV Regel 112-139 eingesetzt: PNA-11 Geräte mit Lage-, Verlust-, Ruhe- und Willens-Alarm. Bei niedrigerer Gefährdung genügt ein schriftliches Check-in-Verfahren (Anruf zu Beginn/Ende, festgelegte Intervalle, Eskalationskette bei ausbleibendem Check-in). Nachweis im Audit: PNA-Funktionsprüfung-Doku oder Check-in-Protokoll.',
  source_ref_slugs = array['dguv-r-112-139','arbschg','dguv-v1']
where slug = 'alleinarbeit-erreichbar';

update ra_measure_catalog set
  short_text = 'Psychische Belastung systematisch beurteilen (GDA-Leitlinie)',
  long_text  = 'Die psychische Belastung wird gem. ArbSchG §5 als eigener Beurteilungsschritt erfasst — entweder über standardisierte Befragung (z. B. COPSOQ, KFZA) oder strukturiertes Beobachtungsinterview entlang der 5 Merkmalsbereiche der GDA-Leitlinie (Arbeitsinhalt, Arbeitsorganisation, Soziale Beziehungen, Arbeitsumgebung, neue Arbeitsformen). Bei festgestellten Belastungen werden konkrete Maßnahmen abgeleitet und nach 1-2 Jahren auf Wirksamkeit geprüft. Nachweis im Audit: Beurteilungs-Methodik, Ergebnis-Protokoll, Maßnahmen-Liste mit Wirksamkeitsprüfung.',
  source_ref_slugs = array['arbschg','dguv-i-206-007'],
  category = 'organisatorisch'
where slug = 'belastungs-screening';

-- ─── PHASE 5: Neue Maßnahmen — branchen- und risikospezifisch ──────────────

insert into ra_measure_catalog (slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source, is_mandatory_when) values
  ('psaga-anschlagpunkte',
   'PSA gegen Absturz (PSAgA) mit geprüften Anschlagpunkten',
   'Bei Arbeiten mit Absturzgefahr über 2 m (oder bei besonderen Gefährdungen darunter) wird PSA gegen Absturz gem. RAB 32 bereitgestellt: Auffanggurt (Klasse A), Verbindungsmittel mit Falldämpfer, Anschlagpunkte mit Tragfähigkeit ≥10 kN. Jeder PSAgA-Träger wird jährlich theoretisch und praktisch unterwiesen (DGUV Grundsatz 312-906), die Ausrüstung wird jährlich durch sachkundige Person geprüft. Vorrang bleibt die kollektive Absturzsicherung (Gerüst, Geländer). Nachweis im Audit: PSAgA-Inventar mit Prüfplaketten, jährliche Unterweisungsnachweise mit praktischer Übung.',
   'personenbezogen',
   array['absturz-hoehenarbeit','leitern-tritte'],
   array['rab-32','dguv-i-212-016','betrsichv'],
   'high', 'curated-mini-set-v2',
   '{"work_height":["ueber-2m","fassade-dach"]}'::jsonb),

  ('fuenf-sicherheitsregeln',
   '5 Sicherheitsregeln bei Elektroarbeiten (DGUV V3 §6)',
   'Vor Beginn jeder Arbeit an elektrischen Anlagen werden in fester Reihenfolge angewendet: (1) Freischalten, (2) gegen Wiedereinschalten sichern, (3) Spannungsfreiheit feststellen, (4) Erden und kurzschließen, (5) benachbarte unter Spannung stehende Teile abdecken oder abschranken. Die Reihenfolge ist nicht verhandelbar. Arbeiten unter Spannung sind nur durch geschulte Elektrofachkraft und nur in Ausnahmefällen zulässig (DGUV V3 §8). Nachweis im Audit: Bestellung EFK, dokumentierte Unterweisung der 5 Regeln, Arbeitsanweisung-Vorlagen.',
   'organisatorisch',
   array['arbeiten-unter-spannung','elektrische-betriebsmittel'],
   array['dguv-v3','dguv-v3-§6'],
   'high', 'curated-mini-set-v2',
   '{"risks":["arbeiten-unter-spannung"]}'::jsonb),

  ('efk-bestellt',
   'Elektrofachkraft (EFK) oder EuP schriftlich bestellt',
   'Für alle Arbeiten an elektrischen Anlagen wird eine Elektrofachkraft (EFK) gem. DGUV Vorschrift 3 §2 schriftlich bestellt. Sind nur Standard-Schalthandlungen erforderlich, kann eine elektrotechnisch unterwiesene Person (EuP) unter Leitung und Aufsicht einer EFK eingesetzt werden. Die Bestellung ist schriftlich, mit klarer Aufgabenbeschreibung und gültiger Qualifikations-Nachweis (Gesellen- bzw. Meisterbrief, Studium oder gleichwertige Ausbildung). Nachweis im Audit: Bestellungsurkunde, Qualifikationsnachweis.',
   'organisatorisch',
   array['arbeiten-unter-spannung','elektrische-betriebsmittel'],
   array['dguv-v3','dguv-v3-§6'],
   'high', 'curated-mini-set-v2',
   '{"risks":["arbeiten-unter-spannung"]}'::jsonb),

  ('hautschutzplan',
   'Hautschutzplan (Schutz–Reinigung–Pflege) nach TRGS 401',
   'Bei Hautkontakt mit feuchten, reizenden, allergisierenden oder fett-/öllösenden Stoffen (Reinigungsmittel, Schmierstoffe, Farben, Lacke) wird ein dreistufiger Hautschutzplan erstellt und am Waschplatz ausgehangen: (1) Schutz vor der Tätigkeit (Schutzcreme spezifisch für Belastungsart), (2) schonende Reinigung mit pH-neutralem Produkt, (3) Pflege nach Schichtende (rückfettende Creme). Schutzhandschuhe Cat. III bei Chemikalien, Cat. II bei Reinigungschemie, mit Permeations-Datenblatt-Prüfung. Nachweis im Audit: Plan am Waschplatz, Bestand der drei Produkte, Eignungsprüfung der Handschuhe für den Stoff.',
   'personenbezogen',
   array['hautkontakt-reizstoffe','reinigungsmittel-chemikalien','gefahrstoffe'],
   array['trgs-401','dguv-i-203-080','gefstoffv'],
   'high', 'curated-mini-set-v2',
   '{"risks":["hautkontakt-reizstoffe","reinigungsmittel-chemikalien"]}'::jsonb),

  ('regalpruefung-jaehrlich',
   'Jährliche Inspektion der Lagerregale gem. DGUV Regel 108-007',
   'Alle Lagerregale (Palettenregale, Kragarmregale, Fachbodenregale) werden mindestens jährlich durch eine sachkundige Person (Schulungsnachweis nach DIN EN 15635) auf Standsicherheit, Verformungen (verbogene Stützen, durchgebogene Traversen), korrekte Beschilderung der zulässigen Fach- und Feldlast sowie auf Vollständigkeit der Sicherungselemente (Anfahrschutz, Durchschubsicherung) geprüft. Festgestellte Beschädigungen werden nach DIN EN 15635 in Risikoklassen (grün/gelb/rot) bewertet und entsprechend instandgesetzt. Nachweis im Audit: Inspektions-Protokoll, Mängelbeseitigungs-Dokumentation, Lastangaben sichtbar an jedem Regal.',
   'organisatorisch',
   array['regalsystem-standfestigkeit','manuelles-heben-tragen'],
   array['dguv-r-108-007','betrsichv'],
   'high', 'curated-mini-set-v2',
   '{"risks":["regalsystem-standfestigkeit"]}'::jsonb),

  ('laerm-mess-gehoerschutz',
   'Lärmmessung + Gehörschutz ab 80 dB(A) (LärmVibrationsArbSchV)',
   'Bei Tätigkeiten mit Lärmexposition wird der Tages-Lärmexpositionspegel ermittelt (Messung oder Herleitung nach Stand der Technik). Ab 80 dB(A) Tages-Lärmexpositionspegel oder 135 dB(C) Spitzenschalldruckpegel ist Gehörschutz bereitzustellen und arbeitsmedizinische Angebotsvorsorge G20 anzubieten; ab 85 dB(A) ist das Tragen Pflicht und ein Lärmminderungsprogramm zu erstellen. Nachweis im Audit: Mess- oder Herleitungsprotokoll, Gehörschutz-Inventar, ggf. Lärmminderungsprogramm.',
   'organisatorisch',
   array['laerm-staub-daempfe'],
   array['laermvibrarbschv','dguv-i-212-016'],
   'high', 'curated-mini-set-v2',
   '{"risks":["laerm-staub-daempfe"]}'::jsonb),

  ('g25-fahrer-vorsorge',
   'Arbeitsmedizinische Angebotsvorsorge G25 für Fahrer',
   'Beschäftigten mit Fahr-, Steuer- und Überwachungstätigkeit (Berufskraftfahrer, Stapler-Fahrer) wird die arbeitsmedizinische Angebotsvorsorge G25 nach ArbMedVV vor Aufnahme der Tätigkeit und in regelmäßigen Abständen (i. d. R. alle 36 Monate) angeboten. Die Vorsorge ist freiwillig; das Angebot ist Pflicht des Arbeitgebers. Bei Tauglichkeitszweifeln (z. B. nach Unfall, Erkrankung) wird die Pflichtuntersuchung nach FeV/BKrFQG-Anforderungen geprüft. Nachweis im Audit: dokumentiertes Vorsorgeangebot je Beschäftigtem, Vorsorgekartei beim Betriebsarzt.',
   'organisatorisch',
   array['transport-fahrzeuge'],
   array['arbmedvv-g25','dguv-v70'],
   'medium', 'curated-mini-set-v2',
   '{"risks":["transport-fahrzeuge"]}'::jsonb),

  ('uv-witterungsschutz',
   'UV- und Witterungsschutz für Außenarbeit (textil + Sonnencreme + Pausenregel)',
   'Beschäftigte im Außenbereich werden durch arbeitstextile Maßnahmen (langärmlige UV-Schutzbekleidung UPF 30+, breitkrempige Kopfbedeckung) und ergänzend Sonnencreme mit LSF ≥30 vor solarer UV-Strahlung geschützt. Bei Hitze ab 30 °C werden Pausen verkürzt, Trinkwasser kostenfrei bereitgestellt (mindestens 0,3 l/h pro Person), schwere körperliche Arbeit auf kühlere Tageszeiten verschoben. Nachweis im Audit: PSA-Inventar UV-Schutz, Trinkwasser-Bereitstellung, Hitze-Arbeitszeit-Anweisung.',
   'personenbezogen',
   array['uv-witterung-aussenarbeit'],
   array['arbschg','dguv-i-208-016'],
   'medium', 'curated-mini-set-v2',
   '{"risks":["uv-witterung-aussenarbeit"]}'::jsonb),

  ('raumklima-lueftung',
   'Raumklima nach ASR A3.5 und Lüftungskonzept nach ASR A3.6',
   'In Innenräumen wird die Lufttemperatur gem. ASR A3.5 abhängig von der Arbeitsschwere und Körperhaltung gehalten (sitzende Tätigkeit: +20 °C; mittlere Belastung: +17 °C). Bei Außentemperaturen >26 °C werden zusätzliche Maßnahmen (Sonnenschutz, Lüftung, ggf. Klimatisierung) ergriffen. Die Raumlüftung erfolgt gem. ASR A3.6 — bei nicht ausreichender natürlicher Lüftung mit mechanischer Lüftung (Außenluftrate je nach Personenzahl und Tätigkeit). Nachweis im Audit: Raumklima-Messprotokoll (stichprobenartig), Lüftungskonzept.',
   'technisch',
   array['buero-bildschirm','brand-fluchtwege'],
   array['asr-a3-5','asr-a3-6','arbstaettv-6'],
   'medium', 'curated-mini-set-v2',
   '{"risks":["buero-bildschirm"]}'::jsonb)

on conflict (slug) do update set
  short_text       = excluded.short_text,
  long_text        = excluded.long_text,
  category         = excluded.category,
  applies_to_risks = excluded.applies_to_risks,
  source_ref_slugs = excluded.source_ref_slugs,
  confidence       = excluded.confidence,
  data_source      = excluded.data_source,
  is_mandatory_when= excluded.is_mandatory_when;

-- =============================================================================
-- Hinweis: catalog_hash der Engine ändert sich durch diese Migration. Alle
-- ab jetzt freigegebenen GBU-Snapshots tragen den neuen Hash. Bereits
-- eingefrorene Versionen bleiben unverändert (append-only, ihr alter Hash
-- ist Teil ihres Snapshots).
-- =============================================================================

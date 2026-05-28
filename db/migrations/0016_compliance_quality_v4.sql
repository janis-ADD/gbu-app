-- =============================================================================
-- Migration 0016 — Compliance Quality Sprint v4 (Market-Readiness)
-- =============================================================================
-- Konservative, additive Catalog-Erweiterung für den ersten Markt-Release.
-- Schließt fachliche Lücken, die im Branchen-Audit identifiziert wurden:
--
--   * Hand-Arm-Vibration (Bauhandwerk, Maler-Schleifarbeit, KFZ-Werkstatt)
--   * Lithium-Ionen-Akku-Brandgefahr (alle Branchen mit Akku-Werkzeugen)
--   * Gefahrgut-Transport ADR (Logistik, Speditionen, Maler mit Fahrzeug-Lager)
--   * G25 Pflichtvorsorge für Fahr/Steuer-Tätigkeiten (FFZ-Fahrer, KFZ)
--   * G37 Angebotsvorsorge für Bildschirm-Arbeitsplätze (Büro, Hybrid)
--   * Schärfung der trigger_conditions für: psychische-belastung,
--     absturz-hoehenarbeit, biologische-arbeitsstoffe
--
-- Doktrin v4: ausschließlich additiv, idempotent (on conflict do update).
-- Kein Schema-Change, keine Engine-Berührung, keine bestehende Zeile
-- destruktiv überschrieben. catalog_hash wird sich ändern → bestehende
-- ra_gbu_versions bleiben unverändert (Snapshots sind eingefroren), nur
-- neue Releases tragen den neuen Hash.
--
-- Bezugsnormen (alle in 0016 zitiert):
--   ArbMedVV Anh. Teil 4 (G25 Fahr-/Steuer-/Überwachungstätigkeiten)
--   ArbMedVV Anh. Teil 4 (G37 Bildschirmarbeitsplätze)
--   LärmVibrArbSchV §6 (Vibrationsexposition)
--   DGUV Information 209-023 (Hand-Arm-Vibration)
--   DGUV Information 205-026 (Brandschutz bei Lithium-Ionen-Energiespeichern)
--   DGUV Information 208-019 (Sicherer Einsatz von Flurförderzeugen)
--   ADR — Europäisches Übereinkommen über die internationale Beförderung
--         gefährlicher Güter auf der Straße
--   GefahrgutVO Straße (GGVSEB)
-- =============================================================================


-- ─── PHASE 1: neue Legal-Refs ──────────────────────────────────────────────

insert into ra_legal_refs (slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source) values
  ('arbmedvv-g25',     'gesetz',           'ArbMedVV Anh. Teil 4', 'Fahr-, Steuer- und Überwachungstätigkeiten — Angebotsvorsorge G25',                 'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4'),
  ('arbmedvv-g37',     'gesetz',           'ArbMedVV Anh. Teil 4', 'Bildschirm-Arbeitsplätze — Angebotsvorsorge G37',                                   'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4'),
  ('dguv-i-209-023',   'dguv-information', 'DGUV Information 209-023', 'Vibrationsbelastung am Arbeitsplatz — Hand-Arm-Vibration',                       'https://publikationen.dguv.de/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4'),
  ('dguv-i-205-026',   'dguv-information', 'DGUV Information 205-026', 'Brandschutz bei Lithium-Ionen-Energiespeichern',                                  'https://publikationen.dguv.de/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4'),
  ('dguv-i-208-019',   'dguv-information', 'DGUV Information 208-019', 'Sicherer Einsatz von Flurförderzeugen',                                           'https://publikationen.dguv.de/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4'),
  ('adr',              'verordnung',       'ADR',                  'Europäisches Übereinkommen über die internationale Beförderung gefährlicher Güter auf der Straße', 'https://www.bmdv.bund.de/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4'),
  ('ggvseb',           'verordnung',       'GGVSEB',               'Gefahrgutverordnung Straße, Eisenbahn und Binnenschiff',                              'https://www.gesetze-im-internet.de/ggvseb/', null, 'curated-v4', '2026-05-28', 'curated-mini-set-v4')

on conflict (slug) do update set
  citation     = excluded.citation,
  title        = excluded.title,
  url          = excluded.url,
  reviewed_by  = excluded.reviewed_by,
  reviewed_at  = excluded.reviewed_at,
  data_source  = excluded.data_source;


-- ─── PHASE 2: neue Risiken ─────────────────────────────────────────────────

insert into ra_risk_catalog (slug, name, category, typical_areas, source_ref_slugs, data_source, trigger_conditions, severity_default, likelihood_default, requires_betriebsanweisung, requires_psa, requires_unterweisung) values

  -- Hand-Arm-Vibration (Bauhandwerk, Maler-Schleifen, KFZ-Werkstatt) ----
  ('vibration-handarm',
   'Hand-Arm-Vibrationsbelastung an handgeführten Geräten',
   'physikalisch',
   array['werkstatt','baustelle'],
   array['laermvibrarbschv','dguv-i-209-023'],
   'curated-mini-set-v4',
   '{"tools":["handgefuehrt"]}'::jsonb,
   3, 3, true, true, true),

  -- Lithium-Ionen-Akku-Brandgefahr (Werkzeug-Akkus, Lager) -------------
  ('li-ion-brand',
   'Brand- und Explosionsgefahr durch Lithium-Ionen-Akkus',
   'physikalisch',
   array['werkstatt','lager','baustelle'],
   array['dguv-i-205-026','betrsichv'],
   'curated-mini-set-v4',
   '{"tools":["handgefuehrt"],"environment":["werkstatt","lager"]}'::jsonb,
   4, 2, true, false, true),

  -- Gefahrgut-Transport (ADR) ------------------------------------------
  ('gefahrgut-transport',
   'Gefahrgut-Transport gemäß ADR / GGVSEB',
   'organisatorisch',
   array['lager'],
   array['adr','ggvseb','gefstoffv'],
   'curated-mini-set-v4',
   '{"tools":["fahrzeuge"],"hazardous_substances":["farben_lacke","schmierstoffe","kuehlmittel"]}'::jsonb,
   4, 2, true, false, true)

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


-- ─── PHASE 3: trigger_conditions-Schärfungen für bestehende Risiken ───────

-- psychische-belastung: explizit auf psychological-Tags zielen (statt nur
-- workforce). So triggert das Risiko sofort, wenn zeitdruck, monotone oder
-- emotionale_belastung im Tag-Set erscheinen.
update ra_risk_catalog set
  trigger_conditions = '{"psychological":["zeitdruck","emotionale_belastung","monotone","verantwortung_personen"],"workforce":["alleinarbeit","schichtarbeit","kundenkontakt"]}'::jsonb
where slug = 'psychische-belastung';

-- absturz-hoehenarbeit: zusätzlich auch bei Leitern + Außendienst triggern
-- (Fensterputzer, Außendienst-Techniker, Dachdecker-Außen).
update ra_risk_catalog set
  trigger_conditions = '{"work_height":["ueber-2m","fassade-dach"],"tools":["leitern","geruest"],"mobility":["baustelle","aussendienst"]}'::jsonb
where slug = 'absturz-hoehenarbeit';

-- biologische-arbeitsstoffe: zusätzlich bei Reinigungschemie + Kundenobjekt
-- (Sanitärreinigung in Hotels, Pflegeheimen, Kliniken).
update ra_risk_catalog set
  trigger_conditions = '{"hazardous_substances":["reinigung"],"environment":["kunde"],"workforce":["alleinarbeit","kundenkontakt"]}'::jsonb
where slug = 'biologische-arbeitsstoffe';


-- ─── PHASE 4: neue Maßnahmen (Pflicht-/Angebots-Vorsorgen + organisatorische) ─

insert into ra_measure_catalog (slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source, is_mandatory_when) values

  ('vorsorge-g25-fahrer',
   'Pflichtvorsorge G25 für Fahr-, Steuer- und Überwachungstätigkeiten',
   'Beschäftigten mit Tätigkeiten, die hohe Anforderungen an Aufmerksamkeit, Reaktionsvermögen und Sehleistung stellen — insbesondere Fahrer:innen von Flurförderzeugen, Kran-Bediener:innen, Berufsfahrer:innen — wird die arbeitsmedizinische Pflichtvorsorge G25 nach ArbMedVV vor Aufnahme der Tätigkeit angeboten, danach im Regelfall alle 36 Monate (verkürzt bei über 50-Jährigen oder Auffälligkeiten). Die G25-Bescheinigung ist Voraussetzung der Tätigkeitsausübung. Nachweis im Audit: G25-Tauglichkeits-Bescheinigung je Beschäftigtem in der Personalakte, Wiederholungs-Termine im Vorsorge-Kalender.',
   'organisatorisch',
   array['transport-fahrzeuge'],
   array['arbmedvv-g25','dguv-i-208-019'],
   'high', 'curated-mini-set-v4',
   '{"risks":["transport-fahrzeuge"]}'::jsonb),

  ('vorsorge-g37-bildschirm',
   'Angebotsvorsorge G37 bei Bildschirm-Arbeitsplatz',
   'Beschäftigten mit überwiegender Bildschirm-Tätigkeit (i. d. R. > 4 Stunden/Tag) wird die arbeitsmedizinische Angebotsvorsorge G37 nach ArbMedVV regelmäßig angeboten — vor Aufnahme, danach alle 36–60 Monate. Inhalt: Sehtest, Befragung zu Beschwerden, ggf. arbeitsmedizinische Beratung zu Bildschirmbrille (deren Kosten der Arbeitgeber trägt, wenn das normale Sehvermögen nicht ausreicht). Nachweis im Audit: Angebots-Dokumentation, Vorsorge-Bescheinigungen für teilnehmende Beschäftigte, Beschaffungsnachweis für Bildschirmbrillen.',
   'organisatorisch',
   array['buero-bildschirm'],
   array['arbmedvv-g37','arbschg'],
   'high', 'curated-mini-set-v4',
   '{"risks":["buero-bildschirm"]}'::jsonb),

  ('ffz-fahrerlaubnis',
   'Schriftliche Beauftragung und Schulung Flurförderzeug-Fahrer:innen',
   'Flurförderzeuge (Stapler, Hubwagen mit Bedienstand, Schubmaststapler) dürfen ausschließlich von Beschäftigten bedient werden, die: 1) das 18. Lebensjahr vollendet haben (DGUV V68 §7), 2) eine Ausbildung nach DGUV Grundsatz 308-001 absolviert haben (Theorie + Praxis + jährliche Unterweisung), 3) körperlich/geistig geeignet sind (G25-Pflichtvorsorge, siehe separate Maßnahme), 4) eine schriftliche Beauftragung des Unternehmers vorliegen haben. Nachweis im Audit: FFZ-Ausweis je Bediener, jährliche Unterweisungs-Dokumentation, schriftliche Beauftragung mit Datum und Unterschrift.',
   'organisatorisch',
   array['transport-fahrzeuge','verkehrswege-lager','belade-entlade-quetschung'],
   array['dguv-i-208-019','betrsichv'],
   'high', 'curated-mini-set-v4',
   '{"risks":["transport-fahrzeuge"]}'::jsonb),

  ('li-ion-lagerkonzept',
   'Brandschutz-Konzept für die Lagerung von Lithium-Ionen-Akkus',
   'Für die Lagerung und das Laden von Lithium-Ionen-Akkus (Werkzeug-Akkus, Ersatzbatterien, defekte/aufgeblähte Zellen) ist ein schriftliches Konzept zu erstellen: 1) räumliche Trennung von brennbaren Materialien (Mindestabstand 2,5 m oder F30-Trennwand), 2) Lade-Stellen mit Brandmelder und nicht-brennbarer Unterlage, 3) Sonder-Sammelbehälter für defekte/aufgeblähte Akkus (Vermiculit-gefüllt, gekennzeichnet), 4) Verbot von paralleler Tiefentladung und Überladung, 5) Feuerlöscher Klasse D oder spezieller Lithium-Akku-Löschspray verfügbar. Nachweis im Audit: schriftliches Konzept, Begehungs-Fotos, Sammelbehälter vorhanden, Unterweisungs-Dokumentation.',
   'organisatorisch',
   array['li-ion-brand','brand-fluchtwege'],
   array['dguv-i-205-026','betrsichv'],
   'high', 'curated-mini-set-v4',
   '{"risks":["li-ion-brand"]}'::jsonb),

  ('adr-beauftragter',
   'Bestellung Gefahrgutbeauftragte:r ab Mengenschwelle (ADR)',
   'Wer Gefahrgut nach ADR transportiert, befördern lässt oder verlädt, muss ab bestimmten Mengen-Schwellen (siehe ADR 1.8.3 + GbV §2) schriftlich eine:n Gefahrgutbeauftragte:n bestellen. Aufgaben: Überwachung der Vorschriften, jährlicher Bericht, Unfall-Meldepflicht. Kleinmengen-Befreiungen (Klein-, Begrenzte-, Freigestellte Mengen) sind möglich und können in vielen handwerklichen Anwendungen greifen — die Befreiung ist aber dokumentiert nachzuweisen. Nachweis im Audit: Bestellungs-Urkunde Gefahrgutbeauftragte:r ODER schriftlicher Befreiungs-Nachweis mit Mengen-Berechnung, ADR-Schulung für Fahrer:innen alle 5 Jahre, Sendungs-Dokumentation.',
   'organisatorisch',
   array['gefahrgut-transport'],
   array['adr','ggvseb'],
   'high', 'curated-mini-set-v4',
   '{"risks":["gefahrgut-transport"]}'::jsonb),

  ('vibration-mess-substitution',
   'Vibrations-Expositionsbewertung + Werkzeug-Substitution',
   'Bei dauerhaftem Einsatz handgeführter Geräte (Bohrhämmer, Schlagschrauber, Schleifgeräte, Vibrationsplatten) ist die Vibrations-Exposition nach LärmVibrArbSchV §3 zu beurteilen. Bei Überschreitung des Auslösewerts (Hand-Arm 2,5 m/s² A(8)) sind Schutzmaßnahmen zwingend: 1) vibrationsarmes Werkzeug beschaffen (Substitution gem. STOP-Prinzip), 2) Tagesexposition organisatorisch begrenzen (Schichtwechsel, Pausen), 3) Antivibrations-Handschuhe ergänzend, 4) Beschäftigte unterweisen. Bei Expositions-Grenzwert (5,0 m/s² A(8)) sind sofortige Maßnahmen Pflicht. Nachweis im Audit: Hersteller-Datenblätter Vibrations-Kennwerte, Berechnung Tages-Exposition pro Tätigkeit, Beschaffungsplan, Unterweisungs-Dokumentation.',
   'technisch',
   array['vibration-handarm'],
   array['laermvibrarbschv','dguv-i-209-023'],
   'high', 'curated-mini-set-v4',
   '{"risks":["vibration-handarm"]}'::jsonb)

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
-- Hinweis zur Wirkung auf catalog_hash:
--
-- Diese Migration ergänzt 7 Legal-Refs, 3 Risiken, 6 Maßnahmen und schärft
-- 3 bestehende trigger_conditions. Der Catalog-Hash (lib/wizard/engine.ts:
-- buildCatalogHash) ändert sich deterministisch. Bereits eingefrorene
-- ra_gbu_versions tragen weiterhin den alten Hash — sie sind unveränderlich
-- (DB-Trigger aus Migration 0010). Neue Releases ab Apply-Zeitpunkt tragen
-- den neuen Hash.
--
-- Empfohlene Post-Apply-Schritte:
--   1. SELECT count(*) FROM ra_risk_catalog;     -- Erwartung: bisher + 3
--   2. SELECT count(*) FROM ra_measure_catalog;  -- Erwartung: bisher + 6
--   3. SELECT count(*) FROM ra_legal_refs;       -- Erwartung: bisher + 7
--   4. notify pgrst, 'reload schema';            -- PostgREST-Cache-Reload
--   5. Wizard-Smoke-Test: neue GBU mit branche=transport + tools=fahrzeuge
--      sollte ohne weitere Eingaben das Risiko "gefahrgut-transport"
--      auslösen, sobald Tags farben_lacke/schmierstoffe/kuehlmittel
--      ausgewählt werden.
-- =============================================================================

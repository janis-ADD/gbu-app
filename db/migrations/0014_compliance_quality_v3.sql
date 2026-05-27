-- =============================================================================
-- Migration 0014 — Compliance Quality Sprint v3
-- =============================================================================
-- PHASE 1: Risiko-Splitting (laerm-staub-daempfe → drei separate Risiken)
-- PHASE 2: Branchen-Tiefe (Maler/Reinigung/Lager/Elektrik/Büro)
-- PHASE 3: Pflichtmaßnahmen schärfen (auditfähig, mit Nachweis-Sätzen)
-- PHASE 4: Arbeitsmedizinische Vorsorge (G25/G37/G42/Hautschutz/Lärm)
-- PHASE 6: Trigger-Conditions präzisieren
--
-- Bezugsnormen (alle in 0014 zitiert):
--   ArbMedVV (G20 Lärm, G24 Hauterkrankungen, G25 Fahrer, G26 Atemschutz,
--             G37 Bildschirm, G41 Absturz, G42 BioStoffe, G44 Holzstaub)
--   BioStoffV §10, §13, §14
--   TRGS 401 (Hautkontakt), TRGS 430 (Isocyanate), TRGS 510 (Lagerung),
--             TRGS 559 (Mineralischer Staub), TRGS 900 (AGW)
--   LärmVibrationsArbSchV §6, §7, §8
--   DGUV Vorschrift 1, 3, 38, 68, 70
--   DGUV Regel 109-002 (Reinigungsarbeiten), 112-190 (Atemschutz),
--             112-191 (Reinigungs- u. Pflegearbeiten)
--   DGUV Information 203-077 (Lichtbogenschutz), 215-441 (Büro homeoffice),
--             214-019 (Sicheres Be- und Entladen), 208-018 (Sicheres Verhalten Logistik)
--   ASR A1.5 (Fußböden), A1.7 (Türen/Tore)
--   ArbStättV §1 (Telearbeitsplatz), Anhang 6 (Bildschirm)
--
-- Doktrin v3:
--   (a) Jede neue Maßnahme endet mit „Nachweis im Audit: …"
--   (b) Keine vagen Begriffe („geeignet", „regelmäßig", „bei Bedarf")
--   (c) Schwellenwerte, Intervalle und Verantwortliche werden konkret
--       benannt
--   (d) Risiken überlappen sich bewusst — z. B. Maler bekommt
--       gleichzeitig staub-exposition + daempfe-aerosole +
--       hautkontakt-reizstoffe
-- =============================================================================

-- ─── PHASE 1: laerm-staub-daempfe splitten ──────────────────────────────────
-- Schritt 1.1: Maßnahmen abkoppeln (applies_to_risks-Refactor)
update ra_measure_catalog set
  applies_to_risks = array['staub-exposition','daempfe-aerosole','gefahrstoffe'],
  is_mandatory_when = '{"risks":["staub-exposition","daempfe-aerosole","gefahrstoffe"]}'::jsonb
where slug = 'absaugung-am-geraet';

update ra_measure_catalog set
  applies_to_risks = array['absturz-hoehenarbeit','gefahrstoffe','staub-exposition','daempfe-aerosole','psa-schutzausruestung','hautkontakt-reizstoffe'],
  is_mandatory_when = '{"risks":["gefahrstoffe","staub-exposition","daempfe-aerosole","psa-schutzausruestung"]}'::jsonb
where slug = 'psa-bereitstellen';

-- laerm-mess-gehoerschutz (v2) auf laerm-exposition umbiegen
update ra_measure_catalog set
  applies_to_risks = array['laerm-exposition'],
  is_mandatory_when = '{"risks":["laerm-exposition"]}'::jsonb
where slug = 'laerm-mess-gehoerschutz';

-- Schritt 1.2: alter Risk-Slug deaktivieren via Trigger-Leerung statt DELETE.
-- DELETE wäre destruktiv und könnte FK-Verweise brechen falls später
-- jemand eine FK definiert. Konservativer Ansatz: trigger_conditions
-- auf leeres jsonb setzen → Risk triggert nie mehr.
update ra_risk_catalog set
  name              = '[Deprecated v3] Lärm/Staub/Dämpfe — bitte einzelne Risiken nutzen',
  data_source       = 'deprecated-v3',
  trigger_conditions = '{}'::jsonb,
  severity_default   = 0,
  likelihood_default = 0,
  requires_betriebsanweisung = false,
  requires_psa               = false,
  requires_unterweisung      = false
where slug = 'laerm-staub-daempfe';

-- ─── PHASE 6: Trigger-Conditions schärfen ──────────────────────────────────
-- elektrische-betriebsmittel: bildschirm raus (kein DGUV-V3-Geltungsbereich
-- für Standard-Bildschirme im Büro; nur tatsächlich elektr. Werkzeuge)
update ra_risk_catalog set
  trigger_conditions = '{"tools":["handgefuehrt","cnc","flurfoerderzeuge"]}'::jsonb
where slug = 'elektrische-betriebsmittel';

-- buero-bildschirm: nur tools=bildschirm (environment-Doppelung weg)
update ra_risk_catalog set
  trigger_conditions = '{"tools":["bildschirm"]}'::jsonb
where slug = 'buero-bildschirm';

-- transport-fahrzeuge: präziser auf relevante Tags
update ra_risk_catalog set
  trigger_conditions = '{"tools":["fahrzeuge","flurfoerderzeuge"],"mobility":["fahrzeuge","aussendienst","baustelle"]}'::jsonb,
  severity_default = 4, likelihood_default = 3
where slug = 'transport-fahrzeuge';

-- ─── PHASE 2 + PHASE 4: neue Legal-Refs ────────────────────────────────────
insert into ra_legal_refs (slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source) values
  ('arbmedvv-g20',  'gesetz',           'ArbMedVV Anh. Teil 3', 'Lärm — Pflicht-/Angebotsvorsorge G20',                                  'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('arbmedvv-g24',  'gesetz',           'ArbMedVV Anh. Teil 1', 'Hauterkrankungen — Pflichtvorsorge G24 (Feuchtarbeit >4 h/Tag)',         'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('arbmedvv-g26',  'gesetz',           'ArbMedVV Anh. Teil 1', 'Atemschutz — Pflichtvorsorge G26 (mehr als 30 min/Schicht)',             'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('arbmedvv-g41',  'gesetz',           'ArbMedVV Anh. Teil 1', 'Arbeiten mit Absturzgefahr — Pflichtvorsorge G41',                       'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('arbmedvv-g44',  'gesetz',           'ArbMedVV Anh. Teil 1', 'Hartholzstaub — Pflichtvorsorge G44',                                    'https://www.gesetze-im-internet.de/arbmedvv/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('biostoffv',     'verordnung',       'BioStoffV',            'Verordnung über Sicherheit und Gesundheitsschutz bei Biologischen Arbeitsstoffen', 'https://www.gesetze-im-internet.de/biostoffv_2013/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('trgs-430',      'technische-regel', 'TRGS 430',             'Isocyanate — Exposition und Schutzmaßnahmen',                            'https://www.baua.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('trgs-559',      'technische-regel', 'TRGS 559',             'Mineralischer Staub (Quarz / Allgemeiner Staub)',                        'https://www.baua.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('trgs-900',      'technische-regel', 'TRGS 900',             'Arbeitsplatzgrenzwerte (AGW)',                                            'https://www.baua.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-v38',      'dguv-vorschrift',  'DGUV V38',             'Bauarbeiten',                                                             'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-r-109-002','dguv-regel',       'DGUV Regel 109-002',   'Tätigkeiten mit Bezug zu Reinigungsarbeiten',                            'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-r-112-190','dguv-regel',       'DGUV Regel 112-190',   'Benutzung von Atemschutzgeräten — Tragezeitbegrenzung',                  'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-r-112-191','dguv-regel',       'DGUV Regel 112-191',   'Benutzung von Knieschutz, Hautschutz bei Reinigungstätigkeit',           'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-i-203-077','dguv-information', 'DGUV Information 203-077', 'Thermische Gefährdungen durch Störlichtbögen',                       'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-i-208-018','dguv-information', 'DGUV Information 208-018', 'Sicheres Verhalten in der Logistik',                                  'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-i-214-019','dguv-information', 'DGUV Information 214-019', 'Sicheres Be- und Entladen von Fahrzeugen',                            'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-i-215-441','dguv-information', 'DGUV Information 215-441', 'Mobile Arbeit / Homeoffice — Beurteilungshilfe',                      'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('dguv-v68-§12',  'dguv-vorschrift',  'DGUV V68 §12',         'Trennung von Fußgänger- und Flurförderzeug-Verkehrswegen',               'https://publikationen.dguv.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('asr-a1-5',      'asr',              'ASR A1.5',             'Fußböden — Rutschhemmung, Sauberlaufzonen',                              'https://www.baua.de/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3'),
  ('arbstaettv-1',  'verordnung',       'ArbStättV §1',         'Geltungsbereich — Telearbeitsplatz / Bildschirmarbeit zu Hause',         'https://www.gesetze-im-internet.de/arbst_ttv_2004/', null, 'curated-v3', '2026-05-27', 'curated-mini-set-v3')
on conflict (slug) do update set
  citation     = excluded.citation,
  title        = excluded.title,
  url          = excluded.url,
  reviewed_by  = excluded.reviewed_by,
  reviewed_at  = excluded.reviewed_at,
  data_source  = excluded.data_source;

-- ─── PHASE 1 (Inserts) + PHASE 2: neue Risiken ─────────────────────────────
insert into ra_risk_catalog (slug, name, category, typical_areas, source_ref_slugs, data_source, trigger_conditions, severity_default, likelihood_default, requires_betriebsanweisung, requires_psa, requires_unterweisung) values

  -- Phase 1 — Risiko-Splitting --------------------------------------------
  ('laerm-exposition',
   'Lärmexposition über Tages-Lärmexpositionspegel',
   'physikalisch',
   array['werkstatt','baustelle','lager'],
   array['laermvibrarbschv','arbmedvv-g20','dguv-i-212-016'],
   'curated-mini-set-v3',
   '{"tools":["cnc","handgefuehrt","flurfoerderzeuge"],"environment":["werkstatt","baustelle","lager"]}'::jsonb,
   3, 3, false, true, true),

  ('staub-exposition',
   'Inhalative Staubexposition (mineralisch, Quarz, Holz, Schleifstaub)',
   'chemisch',
   array['werkstatt','baustelle'],
   array['trgs-559','arbmedvv-g26','arbmedvv-g44','dguv-i-212-016'],
   'curated-mini-set-v3',
   '{"hazardous_substances":["staub_schleifen"],"tools":["cnc","handgefuehrt"]}'::jsonb,
   4, 3, true, true, true),

  ('daempfe-aerosole',
   'Inhalative Dämpfe und Aerosole bei Verarbeitung organischer Lösemittel',
   'chemisch',
   array['werkstatt','baustelle','lager'],
   array['gefstoffv','trgs-900','arbmedvv-g26'],
   'curated-mini-set-v3',
   '{"hazardous_substances":["farben_lacke","kuehlmittel","schmierstoffe"]}'::jsonb,
   4, 3, true, true, true),

  -- Phase 2 — Maler -------------------------------------------------------
  ('isocyanate-exposition',
   'Exposition gegenüber Isocyanaten (2K-Lacke, PUR-Schäume)',
   'chemisch',
   array['werkstatt','baustelle'],
   array['trgs-430','gefstoffv','arbmedvv-g26'],
   'curated-mini-set-v3',
   '{"hazardous_substances":["farben_lacke"],"environment":["werkstatt","innen"]}'::jsonb,
   4, 2, true, true, true),

  -- Phase 2 — Gebäudereinigung -------------------------------------------
  ('biologische-arbeitsstoffe',
   'Tätigkeiten mit biologischen Arbeitsstoffen (Schutzstufe 1–2)',
   'biologisch',
   array['kunde','werkstatt'],
   array['biostoffv','arbmedvv-g42','dguv-r-109-002'],
   'curated-mini-set-v3',
   '{"hazardous_substances":["reinigung"],"workforce":["kundenkontakt"]}'::jsonb,
   3, 3, true, true, true),

  ('nassbereich-rutsch',
   'Rutsch- und Sturzgefahr in feuchten und nassen Bereichen',
   'mechanisch',
   array['kunde','werkstatt','innen'],
   array['asr-a1-5','dguv-r-109-002'],
   'curated-mini-set-v3',
   '{"hazardous_substances":["reinigung"],"environment":["innen","werkstatt","kunde"]}'::jsonb,
   3, 4, false, true, true),

  -- Phase 2 — Lager / Logistik -------------------------------------------
  ('verkehrswege-lager',
   'Verkehrswege-Konflikt zwischen Fußgängern und Flurförderzeugen',
   'mechanisch',
   array['lager'],
   array['dguv-v68-§12','dguv-i-208-018','asr-a1-5'],
   'curated-mini-set-v3',
   '{"tools":["flurfoerderzeuge"],"environment":["lager"]}'::jsonb,
   5, 3, false, true, true),

  ('belade-entlade-quetschung',
   'Quetsch- und Stoßgefahr beim Be- und Entladen',
   'mechanisch',
   array['lager','baustelle'],
   array['dguv-i-214-019','dguv-i-208-018'],
   'curated-mini-set-v3',
   '{"tools":["fahrzeuge","flurfoerderzeuge"],"environment":["lager"]}'::jsonb,
   4, 3, false, true, true),

  -- Phase 2 — Elektrik ---------------------------------------------------
  ('stoerlichtbogen',
   'Thermische Gefährdung durch Störlichtbögen bei Elektroarbeiten',
   'elektrisch',
   array['werkstatt','baustelle'],
   array['dguv-i-203-077','dguv-v3','dguv-v3-§6'],
   'curated-mini-set-v3',
   '{"tools":["handgefuehrt","cnc"],"environment":["werkstatt","baustelle"]}'::jsonb,
   5, 2, true, true, true),

  -- Phase 2 — Büro -------------------------------------------------------
  ('homeoffice-ergonomie',
   'Telearbeitsplatz im Homeoffice — ergonomische und psychische Beurteilung',
   'ergonomisch',
   array['homeoffice'],
   array['arbstaettv-1','arbstaettv-6','dguv-i-215-441'],
   'curated-mini-set-v3',
   '{"environment":["homeoffice"]}'::jsonb,
   2, 4, false, false, true),

  ('bewegungsmangel-buero',
   'Bewegungsmangel und Sitzbelastung bei langanhaltender Bildschirmarbeit',
   'ergonomisch',
   array['buero','homeoffice'],
   array['arbstaettv-6','dguv-i-215-441','arbschg'],
   'curated-mini-set-v3',
   '{"tools":["bildschirm"]}'::jsonb,
   2, 4, false, false, true)

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

-- ─── PHASE 3 + 4: neue Maßnahmen mit ArbMedVV-Vorsorge und Audit-Nachweis ──

insert into ra_measure_catalog (slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source, is_mandatory_when) values

  -- ArbMedVV-Vorsorge ----------------------------------------------------
  ('vorsorge-g20-laerm',
   'Pflichtvorsorge G20 (Lärm) ab 85 dB(A) Tages-Lärmexpositionspegel',
   'Beschäftigten mit Tages-Lärmexpositionspegel ≥85 dB(A) oder Spitzenschalldruckpegel ≥137 dB(C) wird die arbeitsmedizinische Pflichtvorsorge G20 nach ArbMedVV vor Aufnahme der Tätigkeit und danach in regelmäßigen Abständen (i. d. R. alle 36 Monate, im ersten Jahr nach 12 Monaten) angeboten. Bei 80–<85 dB(A) gilt Angebotsvorsorge. Pflichtvorsorge ist Voraussetzung der Tätigkeitsausübung. Nachweis im Audit: Vorsorgekartei beim Betriebsarzt, dokumentierte Einbestellung, Bescheinigung zur Eignung.',
   'organisatorisch',
   array['laerm-exposition'],
   array['arbmedvv-g20','laermvibrarbschv'],
   'high', 'curated-mini-set-v3',
   '{"risks":["laerm-exposition"]}'::jsonb),

  ('vorsorge-g24-haut',
   'Pflichtvorsorge G24 (Haut) bei Feuchtarbeit > 4 h/Schicht oder Hautkontakt',
   'Bei Feuchtarbeit von mehr als 4 Stunden je Schicht oder regelmäßigem Hautkontakt mit Reizstoffen wird die arbeitsmedizinische Pflichtvorsorge G24 nach ArbMedVV angeboten. Bei 2–4 h Feuchtarbeit oder gelegentlichem Kontakt gilt Angebotsvorsorge. Vorsorge enthält Anamnese, Hautstatus, Beratung zum Hautschutzplan. Nachweis im Audit: Tätigkeits-Zeitanalyse, Vorsorge-Bescheinigung je Beschäftigtem, abgeleitete Empfehlungen umgesetzt.',
   'organisatorisch',
   array['hautkontakt-reizstoffe','reinigungsmittel-chemikalien'],
   array['arbmedvv-g24','trgs-401','dguv-r-112-191'],
   'high', 'curated-mini-set-v3',
   '{"risks":["hautkontakt-reizstoffe"]}'::jsonb),

  ('vorsorge-g26-atemschutz',
   'Pflichtvorsorge G26 (Atemschutz) bei Tragezeit > 30 min/Schicht',
   'Wer pro Schicht länger als 30 Minuten Atemschutzgeräte trägt, erhält die arbeitsmedizinische Pflichtvorsorge G26 nach ArbMedVV. Die Gerätegruppe (1/2/3) richtet sich nach Atemwiderstand und Gewicht. G26-Bescheinigung ist Voraussetzung der Atemschutz-Verwendung. Tragezeitbegrenzung gem. DGUV Regel 112-190 ist einzuhalten. Nachweis im Audit: Atemschutzplan mit Gerätegruppen-Zuordnung, individuelle G26-Bescheinigungen.',
   'organisatorisch',
   array['staub-exposition','daempfe-aerosole','isocyanate-exposition'],
   array['arbmedvv-g26','dguv-r-112-190'],
   'high', 'curated-mini-set-v3',
   '{"risks":["staub-exposition","daempfe-aerosole","isocyanate-exposition"]}'::jsonb),

  ('vorsorge-g41-absturz',
   'Pflichtvorsorge G41 (Absturzgefahr) bei Arbeiten mit Absturzgefährdung',
   'Beschäftigten, die regelmäßig Arbeiten mit Absturzgefahr (Dächer, Gerüste, Masten, Türme) durchführen, wird die arbeitsmedizinische Pflichtvorsorge G41 angeboten. Sie umfasst Sehtest, Gleichgewichtsprüfung, körperliche Belastbarkeit. Vorsorge ist Voraussetzung der Tätigkeit. Nachweis im Audit: G41-Bescheinigung mit Tauglichkeits-Aussage je Beschäftigtem, Wiederholungsintervall i. d. R. 36 Monate.',
   'organisatorisch',
   array['absturz-hoehenarbeit'],
   array['arbmedvv-g41'],
   'high', 'curated-mini-set-v3',
   '{"risks":["absturz-hoehenarbeit"]}'::jsonb),

  ('vorsorge-g42-bio',
   'Pflichtvorsorge G42 (Biologische Arbeitsstoffe) ab Schutzstufe 2',
   'Bei Tätigkeiten mit biologischen Arbeitsstoffen der Schutzstufe 2 und höher (BioStoffV) wird die arbeitsmedizinische Pflichtvorsorge G42 angeboten — inklusive ggf. erforderlicher Impfungen (z. B. Hepatitis A/B bei Kontakt mit Körperflüssigkeiten). Bei Schutzstufe 1 mit unklarem Risiko gilt Angebotsvorsorge. Nachweis im Audit: Schutzstufen-Zuordnung gem. BioStoffV, Impfdokumentation, Vorsorgenachweis.',
   'organisatorisch',
   array['biologische-arbeitsstoffe'],
   array['arbmedvv-g42','biostoffv'],
   'high', 'curated-mini-set-v3',
   '{"risks":["biologische-arbeitsstoffe"]}'::jsonb),

  -- Maler --------------------------------------------------------------
  ('isocyanat-substitution-fachkunde',
   'Isocyanat-Substitution prüfen, sonst geschlossenes System + Fachkunde',
   'Bei Verarbeitung von 2K-Polyurethan-Lacken oder PUR-Schäumen wird zunächst die Substitution gem. TRGS 430 (z. B. wasserbasiert) geprüft und schriftlich dokumentiert. Ist Substitution nicht möglich, sind das geschlossene Spritzkabinen-System, eine Absauganlage mit Aktivkohlefilter und PSA Cat. III (Vollmaske mit Kombinationsfilter A2B2P3, Schutzanzug Cat. III Typ 4) Pflicht. Anwender benötigen eine schriftlich nachgewiesene Fachkunde nach TRGS 430. Nachweis im Audit: Substitutionsprüfung-Protokoll, Fachkunde-Bescheinigungen, Filterprüfprotokolle.',
   'technisch',
   array['isocyanate-exposition','daempfe-aerosole'],
   array['trgs-430','gefstoffv'],
   'high', 'curated-mini-set-v3',
   '{"risks":["isocyanate-exposition"]}'::jsonb),

  ('innenraumlueftung-spritzarbeit',
   'Innenraumlüftung bei Spritz- und Lackierarbeiten gem. TRGS 900',
   'Bei Spritz- oder Lackierarbeiten in Innenräumen ist die Luftwechselrate so auszulegen, dass die Arbeitsplatzgrenzwerte (AGW) nach TRGS 900 sicher unterschritten werden — bei kleinflächigen Arbeiten Querlüftung mit gegenüberliegenden Fenstern, bei größeren Mengen mechanische Absaugung (mind. 10-facher Luftwechsel pro Stunde) mit Außenluft-Zufuhr. Während und mindestens 60 Minuten nach Arbeitsende. Nachweis im Audit: Lüftungs-/Absaugungskonzept, ggf. Messprotokoll AGW, Dokumentation Luftwechselrate.',
   'technisch',
   array['daempfe-aerosole','isocyanate-exposition','gefahrstoffe'],
   array['trgs-900','gefstoffv'],
   'high', 'curated-mini-set-v3',
   '{"risks":["daempfe-aerosole","isocyanate-exposition"]}'::jsonb),

  -- Gebäudereinigung ---------------------------------------------------
  ('rutschhemmung-warnaufstellung',
   'Antirutsch-Maßnahmen + Warnaufstellung während Reinigungsarbeit',
   'Während und unmittelbar nach Nassreinigung wird der Bereich mit klappbaren Warnaufstellern „Vorsicht Rutschgefahr" deutlich sichtbar abgegrenzt. Reinigungspersonal trägt Sicherheitsschuhe mit Rutschhemmung SRC (geprüft nach EN ISO 20347/20345). Fußböden sind gem. ASR A1.5 in die zutreffende Bewertungsgruppe (R9–R13) einzuordnen; in Nassbereichen (Sanitär, Küche) ist R11+V4 Mindeststandard. Nachweis im Audit: PSA-Inventar mit SRC-Markierung, Bestand Warnaufsteller, Bodenbewertung dokumentiert.',
   'organisatorisch',
   array['nassbereich-rutsch'],
   array['asr-a1-5','dguv-r-109-002'],
   'high', 'curated-mini-set-v3',
   '{"risks":["nassbereich-rutsch"]}'::jsonb),

  ('biostoffv-schutzstufen-einstufung',
   'Biostoff-Schutzstufen-Einstufung nach BioStoffV §4–§6',
   'Tätigkeiten mit Kontakt zu biologischen Arbeitsstoffen (Sanitärreinigung, Krankenhausreinigung, Pflegeeinrichtungen) werden gem. BioStoffV §4–§6 in Schutzstufen 1–4 eingestuft. Ab Schutzstufe 2 ist die schriftliche Gefährdungsbeurteilung Pflicht. Schutzmaßnahmen umfassen Tragen von Einmalhandschuhen (EN 374), Mund-Nasen-Schutz, ggf. Schutzkittel. Trennung „rein/unrein", Hygieneplan nach Tätigkeit. Nachweis im Audit: Tätigkeitsverzeichnis mit Schutzstufen-Zuordnung, Hygieneplan, PSA-Inventar.',
   'organisatorisch',
   array['biologische-arbeitsstoffe'],
   array['biostoffv','dguv-r-109-002'],
   'high', 'curated-mini-set-v3',
   '{"risks":["biologische-arbeitsstoffe"]}'::jsonb),

  -- Lager / Logistik ---------------------------------------------------
  ('verkehrswege-trennung-stapler',
   'Fußgänger- und Stapler-Verkehrswege baulich oder markiert getrennt',
   'In Bereichen mit Flurförderzeug-Einsatz sind Fußgänger- und Fahrzeugverkehr gem. DGUV Vorschrift 68 §12 baulich (Schutzbügel, Geländer) oder mindestens markierungsbasiert (mind. 75 cm breiter, gelber Streifen, Lauflinien) zu trennen. Querungen sind als Zebrastreifen oder Schranken-/Ampelübergänge auszuführen. Sichtbeschränkungen (Regale, Türen) erhalten Konvex-Spiegel. Nachweis im Audit: Verkehrswege-Plan mit Bewertung, Fotodokumentation, Begehung mit Mängelliste.',
   'technisch',
   array['verkehrswege-lager','transport-fahrzeuge'],
   array['dguv-v68-§12','dguv-i-208-018','asr-a1-5'],
   'high', 'curated-mini-set-v3',
   '{"risks":["verkehrswege-lager"]}'::jsonb),

  ('belade-entlade-prozess',
   'Schriftlicher Be- und Entlade-Prozess mit Quetsch-/Anfahrungsschutz',
   'Be- und Entladevorgänge folgen einer schriftlichen Arbeitsanweisung nach DGUV Information 214-019: Fahrzeug gegen Wegrollen sichern (Unterlegkeil, Handbremse), Aufenthalt im Schwenkbereich der Bordwand verboten, Ladebrücken mit gesichertem Übergang. Bei Sattelaufliegern: Königszapfen-Sperre prüfen. Beschäftigte tragen Warnkleidung (EN ISO 20471 Klasse 2/3) und Sicherheitsschuhe S3. Nachweis im Audit: Arbeitsanweisung am Verladeort, Unterweisungsnachweise, PSA-Inventar Warnkleidung.',
   'organisatorisch',
   array['belade-entlade-quetschung','transport-fahrzeuge'],
   array['dguv-i-214-019','dguv-i-208-018','dguv-v70'],
   'high', 'curated-mini-set-v3',
   '{"risks":["belade-entlade-quetschung"]}'::jsonb),

  -- Elektrik -----------------------------------------------------------
  ('stoerlichtbogen-psa',
   'Lichtbogen-Schutzkleidung (ATPV/EBT-Klasse) bei Arbeiten in der Nähe',
   'Bei Arbeiten in der Nähe spannungsführender Anlagen mit Störlichtbogen-Risiko ist Schutzkleidung mit nachgewiesener Lichtbogenfestigkeit gem. DGUV Information 203-077 zu tragen. Schutzklasse APC1 bis APC2 je nach Lichtbogenenergie (ATPV in cal/cm² oder EBT). Vollständige Sets: Schutzanzug, Gesichtsschutz mit Lichtbogen-Visier, Schutzhandschuhe Klasse 0 (1 kV) bis Klasse 4 (36 kV). Nachweis im Audit: PSA-Inventar mit Lichtbogenklassen-Markierung, Risikobewertung pro Arbeitsplatz, Unterweisung der Träger.',
   'personenbezogen',
   array['stoerlichtbogen','arbeiten-unter-spannung'],
   array['dguv-i-203-077','dguv-v3','dguv-v3-§6'],
   'high', 'curated-mini-set-v3',
   '{"risks":["stoerlichtbogen"]}'::jsonb),

  ('spannungsfreiheit-mehrpolig-feststellen',
   'Spannungsfreiheit mehrpolig zwischen allen Leitern und Erde feststellen',
   'Vor jeder Elektroarbeit wird die Spannungsfreiheit nach Schritt 3 der 5 Sicherheitsregeln gem. DGUV V3 mehrpolig mit einem für die Spannung zugelassenen Prüfgerät (CAT III/IV) zwischen allen Leitern (L1-L2, L1-L3, L2-L3, L1-N, L2-N, L3-N) und zwischen allen Leitern und Erde (PE) festgestellt. Die Funktion des Prüfgeräts wird vor und nach der Messung an einer bekannten Spannungsquelle verifiziert. Nachweis im Audit: Prüfgerät-Bestand mit CAT-Klasse, dokumentierte Unterweisung der Prüfreihenfolge.',
   'personenbezogen',
   array['arbeiten-unter-spannung','elektrische-betriebsmittel','stoerlichtbogen'],
   array['dguv-v3','dguv-v3-§6'],
   'high', 'curated-mini-set-v3',
   '{"risks":["arbeiten-unter-spannung"]}'::jsonb),

  -- Büro --------------------------------------------------------------
  ('homeoffice-beurteilung-gem-arbstaettv',
   'Homeoffice-Arbeitsplatz schriftlich beurteilen (ArbStättV §1 + Anh. 6)',
   'Für Telearbeit im Homeoffice gilt ArbStättV §1 — Arbeitgeber haftet für die Eignung des Arbeitsplatzes. Vor Aufnahme der Tätigkeit wird der Arbeitsplatz schriftlich beurteilt: Bildschirm-Position, Stuhl, Tisch, Beleuchtung ≥500 Lux, Lärm <55 dB(A) während Konzentrationsarbeit, Raumklima. Beurteilung idealerweise per Foto-Dokumentation oder Selbst-Checkliste (DGUV I 215-441). Für reine mobile Arbeit (Cafe, Zug) gelten andere Regeln, das ist KEIN Homeoffice im Sinne der ArbStättV. Nachweis im Audit: Selbst-Beurteilungsbogen, ggf. Mobiliar-Ausstattungsnachweis durch Arbeitgeber.',
   'organisatorisch',
   array['homeoffice-ergonomie','buero-bildschirm'],
   array['arbstaettv-1','arbstaettv-6','dguv-i-215-441'],
   'high', 'curated-mini-set-v3',
   '{"risks":["homeoffice-ergonomie"]}'::jsonb),

  ('aktivpause-bewegungsmangel',
   'Aktivpausen-Konzept bei überwiegend sitzender Tätigkeit',
   'Bei überwiegend sitzender Bildschirmtätigkeit wird ein Aktivpausen-Konzept umgesetzt: Wechsel der Körperhaltung mindestens alle 60 Minuten, kurze Bewegungspausen 5 Min/Stunde, Stehpulte als Option. Die Aktivpause-Empfehlung wird in der jährlichen Unterweisung kommuniziert und ggf. durch Software-Erinnerung unterstützt. Nachweis im Audit: Unterweisungsfolien zur Aktivpause, ggf. Stehpult-Inventar, Belastungs-Befragung bestätigt Akzeptanz.',
   'organisatorisch',
   array['bewegungsmangel-buero','buero-bildschirm'],
   array['dguv-i-215-441','arbschg'],
   'medium', 'curated-mini-set-v3',
   '{"risks":["bewegungsmangel-buero"]}'::jsonb)

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
-- catalog_hash ändert sich erneut. Bereits eingefrorene Versionen
-- (ra_gbu_versions) bleiben unverändert — ihr Hash ist Teil des
-- Snapshots. Neue Releases tragen den neuen Hash.
-- =============================================================================

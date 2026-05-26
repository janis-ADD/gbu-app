-- =============================================================================
-- SU24 — GBU-App — Seed: kuratierter Mini-Katalog v1
-- =============================================================================
-- Bewusst klein gehalten gemäß Doktrin (ki-architektur-prinzipien.md).
-- Datenquelle: 'curated-mini-set-v1' — nicht erschöpfend, Fachredaktion empfohlen.
-- =============================================================================

-- ─── Plans ───────────────────────────────────────────────────────────────────
insert into ra_plans (slug, name, tagline, max_releases, monthly_eur, yearly_eur, sort_order, features) values
  ('free',  'Free',  'Eine freigegebene Gefährdungsbeurteilung — kostenlos.', 1,    0,   0,   1, '{}'::jsonb),
  ('basic', 'Basic', 'Für aktive Einzelbetriebe mit regelmäßiger Pflege.',     null, 19,  190, 2, '{"featured": true}'::jsonb),
  ('pro',   'Pro',   'Mit Unterweisungs-Aktivierung & Compliance-Reporting.',   null, 49,  490, 3, '{}'::jsonb)
on conflict (slug) do nothing;

-- ─── Berufsgenossenschaften ──────────────────────────────────────────────────
insert into ra_bg_catalog (slug, name, description, industries, data_source, is_complete) values
  ('bg-bau',     'BG BAU',     'Berufsgenossenschaft der Bauwirtschaft',                            array['maler','lackierer','bau','handwerk','dachdecker','gipser'], 'curated-mini-set-v1', false),
  ('bg-verkehr', 'BG Verkehr', 'Berufsgenossenschaft für Transport und Verkehrswirtschaft',         array['logistik','spedition','transport','fahrer'],                'curated-mini-set-v1', false),
  ('bgn',        'BGN',        'Berufsgenossenschaft Nahrungsmittel und Gastgewerbe',                array['gastro','lebensmittel','baeckerei'],                        'curated-mini-set-v1', false),
  ('vbg',        'VBG',        'Verwaltungs-Berufsgenossenschaft',                                   array['buero','verwaltung','beratung','it'],                       'curated-mini-set-v1', false),
  ('bgw',        'BGW',        'Berufsgenossenschaft für Gesundheitsdienst und Wohlfahrtspflege',    array['pflege','arzt','sozial'],                                   'curated-mini-set-v1', false),
  ('bghm',       'BGHM',       'Berufsgenossenschaft Holz und Metall',                               array['holz','metall','maschinenbau','schreiner','tischler'],      'curated-mini-set-v1', false)
on conflict (slug) do nothing;

-- ─── Quellen-Katalog ─────────────────────────────────────────────────────────
insert into ra_legal_refs (slug, kind, citation, title, url, bg_slug, reviewed_by, reviewed_at, data_source) values
  ('dguv-v1',         'dguv-vorschrift',  'DGUV Vorschrift 1',          'Grundsätze der Prävention',                                            'https://publikationen.dguv.de/', null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('dguv-v3',         'dguv-vorschrift',  'DGUV Vorschrift 3',          'Elektrische Anlagen und Betriebsmittel',                               'https://publikationen.dguv.de/', null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('dguv-i-208-016',  'dguv-information', 'DGUV Information 208-016',   'Handlungsanleitung für den Umgang mit Leitern und Tritten',            'https://publikationen.dguv.de/', null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('dguv-i-208-005',  'dguv-information', 'DGUV Information 208-005',   'Treppen — sicher begehen',                                              'https://publikationen.dguv.de/', null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('dguv-i-212-016',  'dguv-information', 'DGUV Information 212-016',   'Benutzung von persönlicher Schutzausrüstung',                          'https://publikationen.dguv.de/', null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('asr-a1-7',        'asr',              'ASR A1.7',                   'Türen und Tore (Technische Regeln für Arbeitsstätten)',                'https://www.baua.de/',           null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('asr-a2-2',        'asr',              'ASR A2.2',                   'Maßnahmen gegen Brände',                                                'https://www.baua.de/',           null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('trgs-510',        'technische-regel', 'TRGS 510',                   'Lagerung von Gefahrstoffen in ortsbeweglichen Behältern',              'https://www.baua.de/',           null,    'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('gefstoffv',       'verordnung',       'GefStoffV',                  'Verordnung zum Schutz vor Gefahrstoffen (Gefahrstoffverordnung)',      'https://www.gesetze-im-internet.de/gefstoffv_2010/', null, 'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('betrsichv',       'verordnung',       'BetrSichV',                  'Betriebssicherheitsverordnung',                                         'https://www.gesetze-im-internet.de/betrsichv_2015/', null, 'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('arbschg',         'gesetz',           'ArbSchG',                    'Arbeitsschutzgesetz',                                                   'https://www.gesetze-im-internet.de/arbschg/',        null, 'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('bg-bau-b198',     'bg-schrift',       'BG BAU Bausteine B 198',     'Leitern und Tritte',                                                    'https://www.bgbau.de/',                              'bg-bau', 'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('stvo',            'gesetz',           'StVO',                       'Straßenverkehrs-Ordnung',                                               'https://www.gesetze-im-internet.de/stvo_2013/',      null, 'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1'),
  ('lasthandhabv',    'verordnung',       'LasthandhabV',               'Lastenhandhabungsverordnung',                                           'https://www.gesetze-im-internet.de/lasthandhabv/',   null, 'DEMO-Redaktion', '2026-01-15', 'curated-mini-set-v1')
on conflict (slug) do nothing;

-- ─── Risiko-Katalog ──────────────────────────────────────────────────────────
insert into ra_risk_catalog (slug, name, category, typical_areas, source_ref_slugs, data_source) values
  ('leitern-tritte',             'Leitern & Tritte',                       'mechanisch',     array['baustelle','lager','werkstatt'],         array['dguv-i-208-016','bg-bau-b198','betrsichv'], 'curated-mini-set-v1'),
  ('gefahrstoffe',               'Gefahrstoffe (Farben, Lacke, Verdünner)', 'chemisch',       array['lager','werkstatt','baustelle'],         array['gefstoffv','trgs-510','dguv-i-212-016'],    'curated-mini-set-v1'),
  ('elektrische-betriebsmittel', 'Elektrische Betriebsmittel',              'elektrisch',     array['werkstatt','baustelle','buero'],         array['dguv-v3','betrsichv'],                       'curated-mini-set-v1'),
  ('psa-schutzausruestung',      'PSA / Persönliche Schutzausrüstung',     'organisatorisch', array['werkstatt','baustelle','lager'],         array['dguv-i-212-016','arbschg'],                  'curated-mini-set-v1'),
  ('alleinarbeit',               'Alleinarbeit',                            'organisatorisch', array['aussendienst','baustelle'],              array['arbschg','dguv-v1'],                         'curated-mini-set-v1'),
  ('transport-fahrzeuge',        'Transport & Fahrzeuge',                   'verkehr',         array['fahrzeuge','aussendienst'],              array['stvo','dguv-v1'],                            'curated-mini-set-v1'),
  ('reinigungsmittel-chemikalien','Reinigungsmittel / Chemikalien',          'chemisch',       array['buero','lager','werkstatt'],             array['gefstoffv','trgs-510'],                      'curated-mini-set-v1'),
  ('laerm-staub-daempfe',        'Lärm / Staub / Dämpfe',                  'physikalisch',    array['werkstatt','baustelle'],                 array['gefstoffv','dguv-i-212-016'],                'curated-mini-set-v1'),
  ('psychische-belastung',       'Psychische Belastung',                    'psychisch',       array['buero','aussendienst'],                  array['arbschg'],                                   'curated-mini-set-v1'),
  ('brand-fluchtwege',           'Brand- und Fluchtwege',                   'brand',           array['buero','lager','werkstatt'],             array['asr-a2-2','arbschg'],                        'curated-mini-set-v1'),
  ('erste-hilfe',                'Erste Hilfe',                              'organisatorisch', array['buero','lager','werkstatt','baustelle'], array['arbschg','dguv-v1'],                         'curated-mini-set-v1'),
  ('manuelles-heben-tragen',     'Manuelles Heben & Tragen',                 'ergonomisch',     array['lager','baustelle'],                     array['lasthandhabv','arbschg'],                    'curated-mini-set-v1'),
  ('fremdfirmen',                'Fremdfirmen / Subunternehmer',             'organisatorisch', array['baustelle'],                             array['arbschg','dguv-v1'],                         'curated-mini-set-v1'),
  ('buero-bildschirm',           'Büro- und Bildschirmarbeitsplatz',         'ergonomisch',     array['buero'],                                 array['asr-a1-7','arbschg'],                        'curated-mini-set-v1')
on conflict (slug) do nothing;

-- ─── Maßnahmen-Katalog (typische Standardmaßnahmen) ─────────────────────────
insert into ra_measure_catalog (slug, short_text, long_text, category, applies_to_risks, source_ref_slugs, confidence, data_source) values
  ('leiterpruefung-jaehrlich',  'Jährliche Leiterprüfung dokumentieren',
   'Leitern und Tritte werden mindestens jährlich durch eine befähigte Person geprüft. Prüfprotokoll wird abgelegt und ist einsehbar.',
   'organisatorisch', array['leitern-tritte'], array['dguv-i-208-016','bg-bau-b198'], 'high', 'curated-mini-set-v1'),
  ('leiter-sichtpruefung',      'Sichtprüfung vor jeder Nutzung',
   'Vor jedem Einsatz wird die Leiter visuell auf Beschädigungen geprüft. Beschädigte Leitern werden sofort außer Betrieb genommen.',
   'personenbezogen', array['leitern-tritte'], array['dguv-i-208-016','betrsichv'], 'high', 'curated-mini-set-v1'),
  ('sdb-verfuegbar',            'Sicherheitsdatenblätter verfügbar halten',
   'Für alle eingesetzten Gefahrstoffe liegen aktuelle Sicherheitsdatenblätter vor und sind den Beschäftigten zugänglich.',
   'organisatorisch', array['gefahrstoffe','reinigungsmittel-chemikalien'], array['gefstoffv','trgs-510'], 'high', 'curated-mini-set-v1'),
  ('gefahrstoffverzeichnis',    'Gefahrstoffverzeichnis führen',
   'Ein aktuelles Gefahrstoffverzeichnis wird gepflegt und mindestens jährlich überprüft.',
   'organisatorisch', array['gefahrstoffe'], array['gefstoffv','trgs-510'], 'high', 'curated-mini-set-v1'),
  ('psa-bereitstellen',         'Geeignete PSA bereitstellen',
   'Persönliche Schutzausrüstung (Handschuhe, Schutzbrille, ggf. Atemschutz) wird tätigkeitsbezogen bereitgestellt und Tragepflicht ist geregelt.',
   'technisch', array['gefahrstoffe','psa-schutzausruestung','laerm-staub-daempfe'], array['dguv-i-212-016','arbschg'], 'high', 'curated-mini-set-v1'),
  ('dguv-v3-pruefung',          'DGUV V3 Prüfung dokumentieren',
   'Elektrische Betriebsmittel werden gemäß DGUV Vorschrift 3 in festgelegten Intervallen geprüft. Prüfplakette und Prüfprotokoll sind vorhanden.',
   'organisatorisch', array['elektrische-betriebsmittel'], array['dguv-v3','betrsichv'], 'high', 'curated-mini-set-v1'),
  ('sichtpruefung-geraete',     'Sichtprüfung vor jeder Nutzung (elektr. Geräte)',
   'Vor jedem Einsatz wird das elektrische Gerät auf sichtbare Mängel (Kabel, Stecker, Gehäuse) geprüft.',
   'personenbezogen', array['elektrische-betriebsmittel'], array['dguv-v3'], 'high', 'curated-mini-set-v1'),
  ('fuehrerscheinkontrolle',    'Führerscheinkontrolle dokumentieren',
   'Fahrerlaubnis aller Fahrzeugnutzer wird mindestens halbjährlich kontrolliert und das Datum dokumentiert.',
   'organisatorisch', array['transport-fahrzeuge'], array['stvo'], 'high', 'curated-mini-set-v1'),
  ('ladungssicherung-schulung', 'Ladungssicherung schulen',
   'Beschäftigte werden zur ordnungsgemäßen Ladungssicherung unterwiesen. Geeignete Mittel (Spanngurte etc.) werden bereitgestellt.',
   'personenbezogen', array['transport-fahrzeuge'], array['stvo','dguv-v1'], 'high', 'curated-mini-set-v1'),
  ('fluchtwege-freihalten',     'Flucht- und Rettungswege freihalten',
   'Flucht- und Rettungswege sind dauerhaft freigehalten, beleuchtet und gekennzeichnet.',
   'organisatorisch', array['brand-fluchtwege'], array['asr-a2-2','arbschg'], 'high', 'curated-mini-set-v1'),
  ('feuerloescher-pruefen',     'Feuerlöscher prüfen lassen',
   'Feuerlöscher werden alle 2 Jahre durch sachkundige Person geprüft. Prüfdatum sichtbar.',
   'organisatorisch', array['brand-fluchtwege'], array['asr-a2-2'], 'high', 'curated-mini-set-v1'),
  ('ersthelfer-benennen',       'Ersthelfer benennen und fortbilden',
   'Ausreichend viele Ersthelfer sind benannt und werden alle 2 Jahre fortgebildet.',
   'organisatorisch', array['erste-hilfe'], array['arbschg','dguv-v1'], 'high', 'curated-mini-set-v1'),
  ('verbandbuch-fuehren',       'Verbandbuch führen',
   'Alle Erste-Hilfe-Leistungen werden im Verbandbuch dokumentiert.',
   'organisatorisch', array['erste-hilfe'], array['dguv-v1'], 'high', 'curated-mini-set-v1'),
  ('transporthilfen-nutzen',    'Transporthilfen nutzen, schwere Lasten teilen',
   'Für schwere Lasten werden Transporthilfen (Sackkarre, Hubwagen) bereitgestellt. Lasten über 25 kg möglichst zu zweit.',
   'technisch', array['manuelles-heben-tragen'], array['lasthandhabv','arbschg'], 'high', 'curated-mini-set-v1'),
  ('ergonomie-buero',           'Bildschirmarbeitsplatz ergonomisch einrichten',
   'Bildschirm, Tastatur, Stuhl und Beleuchtung werden ergonomisch konfiguriert. Regelmäßige Pausen sind vorgesehen.',
   'organisatorisch', array['buero-bildschirm'], array['asr-a1-7','arbschg'], 'medium', 'curated-mini-set-v1'),
  ('absaugung-am-geraet',       'Absaugung am Gerät einsetzen',
   'Bei staubintensiven Arbeiten werden Geräte mit integrierter Absaugung verwendet. FFP2/FFP3-Atemschutz wird ergänzend bereitgestellt.',
   'technisch', array['laerm-staub-daempfe','gefahrstoffe'], array['gefstoffv','dguv-i-212-016'], 'high', 'curated-mini-set-v1'),
  ('lagerordnung-gefahrstoffe', 'Lagerordnung für Gefahrstoffe',
   'Gefahrstoffe werden gemäß TRGS 510 gelagert: getrennt nach Gefahrenklassen, mit Auffangwanne, ausschließlich für unterwiesene Personen zugänglich.',
   'organisatorisch', array['gefahrstoffe'], array['trgs-510','gefstoffv'], 'high', 'curated-mini-set-v1'),
  ('koordinator-fremdfirmen',   'Koordinator für Fremdfirmen benennen',
   'Bei gleichzeitigem Einsatz mehrerer Firmen wird ein Koordinator benannt, der gegenseitige Gefährdungen abstimmt.',
   'organisatorisch', array['fremdfirmen'], array['arbschg','dguv-v1'], 'high', 'curated-mini-set-v1'),
  ('alleinarbeit-erreichbar',   'Erreichbarkeit bei Alleinarbeit sicherstellen',
   'Bei Alleinarbeit wird die Erreichbarkeit (z. B. Personen-Notsignal-System oder regelmäßige Check-ins) sichergestellt.',
   'organisatorisch', array['alleinarbeit'], array['arbschg','dguv-v1'], 'high', 'curated-mini-set-v1'),
  ('belastungs-screening',      'Psychische Belastung erfassen',
   'Psychische Belastungen werden in der Gefährdungsbeurteilung erfasst und durch organisatorische Maßnahmen (Pausen, Ansprechpartner) reduziert.',
   'organisatorisch', array['psychische-belastung'], array['arbschg'], 'medium', 'curated-mini-set-v1')
on conflict (slug) do nothing;

-- ─── Unterweisungs-Katalog ──────────────────────────────────────────────────
insert into ra_training_catalog (slug, name, related_risks, data_source) values
  ('allgemeine-arbeitssicherheit', 'Allgemeine Arbeitssicherheit',  array[]::text[],                                                  'curated-mini-set-v1'),
  ('leitern-tritte',               'Leitern & Tritte',              array['leitern-tritte'],                                          'curated-mini-set-v1'),
  ('gefahrstoffe',                 'Gefahrstoffe',                  array['gefahrstoffe','reinigungsmittel-chemikalien'],             'curated-mini-set-v1'),
  ('psa',                          'Persönliche Schutzausrüstung', array['psa-schutzausruestung'],                                   'curated-mini-set-v1'),
  ('brandschutz',                  'Brandschutz',                   array['brand-fluchtwege'],                                        'curated-mini-set-v1'),
  ('elektrische-betriebsmittel',   'Elektrische Betriebsmittel',    array['elektrische-betriebsmittel'],                              'curated-mini-set-v1'),
  ('fahrzeuge-ladungssicherung',   'Fahrzeuge & Ladungssicherung',  array['transport-fahrzeuge'],                                     'curated-mini-set-v1'),
  ('erste-hilfe',                  'Erste Hilfe',                   array['erste-hilfe'],                                             'curated-mini-set-v1'),
  ('heben-tragen',                 'Heben & Tragen',                array['manuelles-heben-tragen'],                                  'curated-mini-set-v1'),
  ('baustellenverhalten',          'Baustellenverhalten',           array['fremdfirmen','leitern-tritte'],                            'curated-mini-set-v1')
on conflict (slug) do nothing;

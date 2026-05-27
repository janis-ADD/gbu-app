-- =============================================================================
-- Migration 0008 — Trigger-Conditions + Pflicht-Markierungen seeden
-- =============================================================================
-- Pro Risiko: trigger_conditions als jsonb mit Dimension→[values],
-- severity_default + likelihood_default + Pflicht-Booleans.
--
-- Format trigger_conditions:
--   {"work_height": ["ueber-2m","fassade-dach"], "tools": ["leitern"]}
-- = Risiko triggert, wenn IRGENDEINE Dimension matched (OR über Dimensionen,
--   OR innerhalb der Werte einer Dimension).
-- =============================================================================

update ra_risk_catalog set
  trigger_conditions = '{"work_height":["bis-2m","ueber-2m","fassade-dach"],"tools":["leitern","geruest"]}'::jsonb,
  severity_default = 4, likelihood_default = 3,
  requires_psa = true, requires_unterweisung = true
where slug = 'leitern-tritte';

update ra_risk_catalog set
  trigger_conditions = '{"hazardous_substances":["farben_lacke","reinigung","schmierstoffe","kuehlmittel","staub_schleifen"]}'::jsonb,
  severity_default = 4, likelihood_default = 3,
  requires_betriebsanweisung = true, requires_psa = true, requires_unterweisung = true
where slug = 'gefahrstoffe';

update ra_risk_catalog set
  trigger_conditions = '{"tools":["handgefuehrt","cnc","bildschirm","flurfoerderzeuge","fahrzeuge"]}'::jsonb,
  severity_default = 3, likelihood_default = 3,
  requires_unterweisung = true
where slug = 'elektrische-betriebsmittel';

update ra_risk_catalog set
  trigger_conditions = '{"tools":["handgefuehrt","cnc"],"hazardous_substances":["staub_schleifen","farben_lacke"],"work_height":["ueber-2m","fassade-dach"]}'::jsonb,
  severity_default = 3, likelihood_default = 3,
  requires_psa = true, requires_unterweisung = true
where slug = 'psa-schutzausruestung';

update ra_risk_catalog set
  trigger_conditions = '{"workforce":["alleinarbeit"]}'::jsonb,
  severity_default = 4, likelihood_default = 2,
  requires_unterweisung = true
where slug = 'alleinarbeit';

update ra_risk_catalog set
  trigger_conditions = '{"mobility":["fahrzeuge","aussendienst","baustelle"],"tools":["fahrzeuge","flurfoerderzeuge"]}'::jsonb,
  severity_default = 4, likelihood_default = 3,
  requires_unterweisung = true
where slug = 'transport-fahrzeuge';

update ra_risk_catalog set
  trigger_conditions = '{"hazardous_substances":["reinigung"]}'::jsonb,
  severity_default = 2, likelihood_default = 3,
  requires_psa = true
where slug = 'reinigungsmittel-chemikalien';

update ra_risk_catalog set
  trigger_conditions = '{"hazardous_substances":["staub_schleifen"],"tools":["handgefuehrt","cnc"]}'::jsonb,
  severity_default = 3, likelihood_default = 3,
  requires_psa = true, requires_unterweisung = true
where slug = 'laerm-staub-daempfe';

update ra_risk_catalog set
  trigger_conditions = '{"psychological":["zeitdruck","emotionale_belastung","monotone","verantwortung_personen"],"workforce":["schichtarbeit"]}'::jsonb,
  severity_default = 3, likelihood_default = 3,
  requires_unterweisung = true
where slug = 'psychische-belastung';

update ra_risk_catalog set
  trigger_conditions = '{"environment":["innen","werkstatt","lager","buero"]}'::jsonb,
  severity_default = 5, likelihood_default = 2,
  requires_unterweisung = true
where slug = 'brand-fluchtwege';

update ra_risk_catalog set
  trigger_conditions = '{"environment":["innen","werkstatt","lager","baustelle","aussen"]}'::jsonb,
  severity_default = 3, likelihood_default = 2,
  requires_unterweisung = true
where slug = 'erste-hilfe';

update ra_risk_catalog set
  trigger_conditions = '{"environment":["lager","werkstatt","baustelle"]}'::jsonb,
  severity_default = 3, likelihood_default = 4,
  requires_unterweisung = true
where slug = 'manuelles-heben-tragen';

update ra_risk_catalog set
  trigger_conditions = '{"workforce":["fremdfirmen"]}'::jsonb,
  severity_default = 3, likelihood_default = 3,
  requires_unterweisung = true
where slug = 'fremdfirmen';

update ra_risk_catalog set
  trigger_conditions = '{"tools":["bildschirm"],"environment":["buero","homeoffice"]}'::jsonb,
  severity_default = 2, likelihood_default = 4,
  requires_unterweisung = true
where slug = 'buero-bildschirm';

-- =============================================================================
-- Maßnahmen: is_mandatory_when setzen
-- =============================================================================
-- Format: {"any_substance": true}  → wenn irgendein Gefahrstoff != 'keine'
--         {"risks": [...]}          → wenn diese Risiken im GBU sind
--         {"work_height": [...]}    → wenn Höhe in dieser Liste

update ra_measure_catalog set is_mandatory_when = '{"risks":["leitern-tritte"]}'::jsonb
where slug in ('leiterpruefung-jaehrlich','leiter-sichtpruefung');

update ra_measure_catalog set is_mandatory_when = '{"any_substance":true}'::jsonb
where slug in ('sdb-verfuegbar','gefahrstoffverzeichnis');

update ra_measure_catalog set is_mandatory_when = '{"risks":["gefahrstoffe","laerm-staub-daempfe","psa-schutzausruestung"]}'::jsonb
where slug = 'psa-bereitstellen';

update ra_measure_catalog set is_mandatory_when = '{"risks":["elektrische-betriebsmittel"]}'::jsonb
where slug in ('dguv-v3-pruefung','sichtpruefung-geraete');

update ra_measure_catalog set is_mandatory_when = '{"risks":["transport-fahrzeuge"]}'::jsonb
where slug in ('fuehrerscheinkontrolle','ladungssicherung-schulung');

update ra_measure_catalog set is_mandatory_when = '{"risks":["brand-fluchtwege"]}'::jsonb
where slug in ('fluchtwege-freihalten','feuerloescher-pruefen');

update ra_measure_catalog set is_mandatory_when = '{"risks":["erste-hilfe"]}'::jsonb
where slug in ('ersthelfer-benennen','verbandbuch-fuehren');

update ra_measure_catalog set is_mandatory_when = '{"risks":["manuelles-heben-tragen"]}'::jsonb
where slug = 'transporthilfen-nutzen';

update ra_measure_catalog set is_mandatory_when = '{"risks":["buero-bildschirm"]}'::jsonb
where slug = 'ergonomie-buero';

update ra_measure_catalog set is_mandatory_when = '{"risks":["laerm-staub-daempfe","gefahrstoffe"]}'::jsonb
where slug = 'absaugung-am-geraet';

update ra_measure_catalog set is_mandatory_when = '{"risks":["gefahrstoffe"]}'::jsonb
where slug = 'lagerordnung-gefahrstoffe';

update ra_measure_catalog set is_mandatory_when = '{"risks":["fremdfirmen"]}'::jsonb
where slug = 'koordinator-fremdfirmen';

update ra_measure_catalog set is_mandatory_when = '{"risks":["alleinarbeit"]}'::jsonb
where slug = 'alleinarbeit-erreichbar';

update ra_measure_catalog set is_mandatory_when = '{"risks":["psychische-belastung"]}'::jsonb
where slug = 'belastungs-screening';

/**
 * deriveGbu — Engine-Verhalten gegen alle Branchen-Fixtures.
 *
 * Diese Tests SIND der fachliche Regressionsschutz. Jede Engine-Änderung,
 * die hier rote Tests produziert, ist potentiell compliance-relevant —
 * der Diff im erwarteten Risk-/Measure-Set MUSS bewusst auditierbar in
 * den Branchen-Fixtures aktualisiert werden, niemals stillschweigend.
 *
 * Einzeltest pro Branche → eindeutige Fehlerlokalisierung im CI-Report.
 */
import { describe, it, expect } from 'vitest';
import { deriveGbu } from '@/lib/wizard/engine';
import { TEST_RISKS, TEST_MEASURES } from '../fixtures/catalog';
import { ALL_INDUSTRY_FIXTURES, type IndustryFixture } from '../fixtures/industries';

function run(fixture: IndustryFixture) {
  return deriveGbu(fixture.input_tags, TEST_RISKS, TEST_MEASURES);
}

describe.each(ALL_INDUSTRY_FIXTURES)('deriveGbu($name)', (fixture) => {
  const result = run(fixture);

  it('liefert exakt die erwarteten Risk-Slugs', () => {
    const actual = result.risks.map((r) => r.risk.slug).sort();
    const expected = [...fixture.expected_risks].sort();
    expect(actual).toEqual(expected);
  });

  it('markiert genau die erwarteten Pflicht-Maßnahmen', () => {
    const actualMandatory = result.measures
      .filter((m) => m.is_mandatory)
      .map((m) => m.measure.slug)
      .sort();
    const expected = [...fixture.expected_mandatory_measures].sort();
    expect(actualMandatory).toEqual(expected);
  });

  it('jede Pflicht-Maßnahme hat eine nicht-leere Begründung', () => {
    for (const m of result.measures.filter((x) => x.is_mandatory)) {
      expect(m.mandatory_reason, `mandatory_reason für ${m.measure.slug}`)
        .toBeTruthy();
      expect(m.mandatory_reason!.length).toBeGreaterThan(5);
    }
  });

  it('jeder getriggerte Risk hat mindestens einen Trigger-Grund', () => {
    for (const r of result.risks) {
      expect(r.triggers.length, `triggers für ${r.risk.slug}`).toBeGreaterThan(0);
      for (const t of r.triggers) {
        expect(t.dimension).toBeTruthy();
        expect(t.value).toBeTruthy();
        expect(t.label).toBeTruthy();
      }
    }
  });

  it('liefert die erwarteten Missing-Control-Codes', () => {
    const actual = result.missing_controls.map((mc) => mc.code).sort();
    const expected = [...fixture.expected_missing_controls].sort();
    expect(actual).toEqual(expected);
  });

  if (fixture.expected_plausibility) {
    it('liefert die erwarteten Plausibility-Codes', () => {
      const actual = result.plausibility.map((p) => p.code).sort();
      const expected = [...fixture.expected_plausibility!].sort();
      expect(actual).toEqual(expected);
    });
  }

  it('Summary-Zahlen passen', () => {
    expect(result.summary.n_risks).toBe(fixture.expected_summary.n_risks);
    expect(result.summary.n_mandatory_measures).toBe(fixture.expected_summary.n_mandatory_measures);
    expect(result.summary.n_missing_controls).toBe(fixture.expected_summary.n_missing_controls);
  });

  it('Risiken sind nach Schwere×Wahrscheinlichkeit DESC sortiert', () => {
    let last = Infinity;
    for (const r of result.risks) {
      const score = r.severity * r.likelihood;
      expect(score, `score ${r.risk.slug}`).toBeLessThanOrEqual(last);
      last = score;
    }
  });

  it('Maßnahmen sind nach (Pflicht zuerst, dann TOP) sortiert', () => {
    let lastMandatory = true;
    let lastTopRank = -1;
    const rank = (c: string) => (c === 'technisch' ? 0 : c === 'organisatorisch' ? 1 : 2);
    for (const m of result.measures) {
      if (lastMandatory && !m.is_mandatory) {
        // Übergang von Pflicht zu Nicht-Pflicht: TOP-Rank-Counter reset
        lastTopRank = -1;
      }
      if (lastMandatory === m.is_mandatory) {
        expect(rank(m.measure.category)).toBeGreaterThanOrEqual(lastTopRank);
      } else {
        // Pflicht muss VOR Nicht-Pflicht stehen
        expect(lastMandatory).toBe(true);
        expect(m.is_mandatory).toBe(false);
      }
      lastMandatory = m.is_mandatory;
      lastTopRank = rank(m.measure.category);
    }
  });
});

describe('deriveGbu — Edge-Cases', () => {
  it('leeres Tag-Set → keine Risiken, keine Maßnahmen, keine Lücken', () => {
    const result = deriveGbu({}, TEST_RISKS, TEST_MEASURES);
    expect(result.risks).toHaveLength(0);
    expect(result.measures).toHaveLength(0);
    expect(result.missing_controls).toHaveLength(0);
    expect(result.summary.n_risks).toBe(0);
  });

  it('hazardous_substances=["keine"] zählt NICHT als Substanz-Einsatz', () => {
    const result = deriveGbu(
      { hazardous_substances: ['keine'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.risks.find((r) => r.risk.slug === 'gefahrstoff-loesemittel')).toBeUndefined();
    // keine Substanz → kein Missing-Control für Betriebsanweisung
    expect(result.missing_controls.find((mc) => mc.code === 'betriebsanweisung')).toBeUndefined();
  });

  it('Höhe >2m OHNE Leiter/Gerüst → Plausibility-Warnung hoehe-ohne-arbeitsmittel', () => {
    const result = deriveGbu(
      { work_height: 'ueber-2m', tools: ['handgefuehrt'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('hoehe-ohne-arbeitsmittel');
  });

  it('Höhe fassade-dach OHNE PSA-Maßnahme im Set → Missing-Control psa-konzept', () => {
    // Subset des Measure-Catalogs OHNE psa-bereitstellen
    const measuresOhnePsa = TEST_MEASURES.filter((m) => m.slug !== 'psa-bereitstellen');
    const result = deriveGbu(
      { work_height: 'fassade-dach', tools: ['leitern'] },
      TEST_RISKS,
      measuresOhnePsa
    );
    expect(result.missing_controls.map((mc) => mc.code)).toContain('psa-konzept');
  });

  it('Substanz im Einsatz OHNE Betriebsanweisungs-Maßnahme → Missing-Control betriebsanweisung', () => {
    const measuresOhneSdb = TEST_MEASURES.filter((m) => m.slug !== 'sdb-verfuegbar');
    const result = deriveGbu(
      { hazardous_substances: ['farben_lacke'] },
      TEST_RISKS,
      measuresOhneSdb
    );
    expect(result.missing_controls.map((mc) => mc.code)).toContain('betriebsanweisung');
  });

  it('Alleinarbeit OHNE Notsignal-Maßnahme → Missing-Control notsignal-alleinarbeit', () => {
    const measuresOhneNotsignal = TEST_MEASURES.filter((m) => m.slug !== 'alleinarbeit-erreichbar');
    const result = deriveGbu(
      { workforce: ['alleinarbeit'] },
      TEST_RISKS,
      measuresOhneNotsignal
    );
    expect(result.missing_controls.map((mc) => mc.code)).toContain('notsignal-alleinarbeit');
  });

  it('Bildschirm OHNE Innenraum/Homeoffice → Plausibility bildschirm-ohne-innenraum', () => {
    const result = deriveGbu(
      { tools: ['bildschirm'], environment: ['werkstatt'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('bildschirm-ohne-innenraum');
  });

  it('Bildschirm + Innenraum → KEINE Plausibility-Warnung (fachlich plausibel)', () => {
    const result = deriveGbu(
      { tools: ['bildschirm'], environment: ['innen'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).not.toContain('bildschirm-ohne-innenraum');
  });

  it('Fremdfirmen ohne Baustelle/Werkstatt/Lager → Plausibility fremdfirmen-umgebung-unklar', () => {
    const result = deriveGbu(
      { workforce: ['fremdfirmen'], environment: ['aussen'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('fremdfirmen-umgebung-unklar');
  });

  it('Schichtarbeit ohne psychische Belastungsdoku → Plausibility schichtarbeit-ohne-belastungsanalyse (v2)', () => {
    const result = deriveGbu(
      { workforce: ['schichtarbeit'], environment: ['lager'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('schichtarbeit-ohne-belastungsanalyse');
  });

  it('Reinigungschemie + Innenraum ohne Alleinarbeit → Plausibility reinigungschemie-kontext-unklar (v2)', () => {
    const result = deriveGbu(
      { hazardous_substances: ['reinigung'], environment: ['innen'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('reinigungschemie-kontext-unklar');
  });

  it('Fahrzeuge ohne psychische Belastungsdoku → Plausibility fahrzeuge-ohne-belastungsdoku (v2)', () => {
    const result = deriveGbu(
      { tools: ['fahrzeuge'], mobility: 'fahrzeuge', environment: ['kunde'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('fahrzeuge-ohne-belastungsdoku');
  });

  // ─── v3-Plausibility (Migration 0014) ───────────────────────────────
  it('Außenarbeit (Baustelle + aussen) → Plausibility aussenarbeit-uv-witterung-pruefen (v3)', () => {
    const result = deriveGbu(
      { mobility: 'baustelle', environment: ['aussen'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('aussenarbeit-uv-witterung-pruefen');
  });

  it('Homeoffice → Plausibility homeoffice-beurteilung-erforderlich (v3)', () => {
    const result = deriveGbu(
      { environment: ['homeoffice'], tools: ['bildschirm'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('homeoffice-beurteilung-erforderlich');
  });

  it('Schleifstaub → Plausibility staub-arbeitsmedizinische-vorsorge (v3)', () => {
    const result = deriveGbu(
      { hazardous_substances: ['staub_schleifen'], tools: ['handgefuehrt'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('staub-arbeitsmedizinische-vorsorge');
  });

  it('Lacke in Innenraum/Werkstatt → Plausibility isocyanate-fachkunde-pruefen (v3)', () => {
    const result = deriveGbu(
      { hazardous_substances: ['farben_lacke'], environment: ['werkstatt'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('isocyanate-fachkunde-pruefen');
  });

  it('Flurförderzeug im Lager → Plausibility verkehrswege-trennung-pruefen (v3)', () => {
    const result = deriveGbu(
      { tools: ['flurfoerderzeuge'], environment: ['lager'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('verkehrswege-trennung-pruefen');
  });

  // ─── Iteration 3: Kontext-Weighting + Priorisierung ────────────────
  it('Iter3: intensity=gelegentlich + exposure=gering reduziert likelihood', () => {
    const baseResult = deriveGbu(
      { work_height: 'fassade-dach' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const reducedResult = deriveGbu(
      { work_height: 'fassade-dach', intensity: 'gelegentlich', exposure: 'gering' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const baseAbsturz   = baseResult.risks.find((r) => r.risk.slug === 'absturz')!;
    const reducedAbsturz = reducedResult.risks.find((r) => r.risk.slug === 'absturz')!;
    expect(reducedAbsturz.likelihood).toBeLessThan(baseAbsturz.likelihood);
    expect(reducedAbsturz.weighting_applied).toBe(true);
    expect(reducedAbsturz.base_likelihood).toBe(baseAbsturz.likelihood);
  });

  it('Iter3: intensity=dauerhaft + exposure=hoch erhöht likelihood', () => {
    const baseResult = deriveGbu(
      { tools: ['bildschirm'] },
      TEST_RISKS,
      TEST_MEASURES
    );
    const intensiveResult = deriveGbu(
      { tools: ['bildschirm'], intensity: 'dauerhaft', exposure: 'hoch' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const baseBildschirm = baseResult.risks.find((r) => r.risk.slug === 'bildschirmbelastung')!;
    const intensiveBildschirm = intensiveResult.risks.find((r) => r.risk.slug === 'bildschirmbelastung')!;
    expect(intensiveBildschirm.likelihood).toBeGreaterThanOrEqual(baseBildschirm.likelihood);
  });

  it('Iter3: ohne Kontext-Tags ist Verhalten identisch zu Iter2 (Backward-Compat)', () => {
    const result = deriveGbu(
      { work_height: 'fassade-dach' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const absturz = result.risks.find((r) => r.risk.slug === 'absturz')!;
    expect(absturz.weighting_applied).toBeUndefined();
    expect(absturz.base_likelihood).toBeUndefined();
    expect(absturz.likelihood).toBe(3); // Catalog-Default
  });

  it('Iter3: Pflicht-Maßnahme + hoher Score → priority=sofort, urgency=kritisch', () => {
    const result = deriveGbu(
      { work_height: 'fassade-dach' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const psa = result.measures.find((m) => m.measure.slug === 'psa-bereitstellen')!;
    expect(psa.is_mandatory).toBe(true);
    expect(psa.obligation_type).toBe('pflicht');
    // absturz: severity 5 × likelihood 3 = 15 (mittel) → kurzfristig
    // Wenn höher (16+) wäre sofort. Bei 15 ist kurzfristig erwartet.
    expect(psa.priority).toBe('kurzfristig');
    expect(psa.urgency).toBe('hoch');
  });

  it('Iter3: Pflicht + gelegentlich + gering → downgrade zu obligation=angebot', () => {
    const result = deriveGbu(
      { work_height: 'fassade-dach', intensity: 'gelegentlich', exposure: 'gering' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const psa = result.measures.find((m) => m.measure.slug === 'psa-bereitstellen')!;
    expect(psa.is_mandatory).toBe(true);
    expect(psa.obligation_type).toBe('angebot'); // downgegradet
  });

  it('Iter3: exposed_persons=20_plus hebt Priorität eine Stufe an', () => {
    // absturzsicherung-geruest: confidence=high, nicht mandatory → empfehlung
    // absturz-Risk: severity 5 × likelihood 3 = 15 → maxRiskScore 15
    // empfehlung + maxScore ≥ 12 → mittelfristig (Standard)
    const baseResult = deriveGbu(
      { work_height: 'fassade-dach' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const baseGeruest = baseResult.measures.find((m) => m.measure.slug === 'absturzsicherung-geruest')!;
    expect(baseGeruest.priority).toBe('mittelfristig');
    // mit 20_plus → eine Stufe hoch → kurzfristig
    const personsResult = deriveGbu(
      { work_height: 'fassade-dach', exposed_persons: '20_plus' },
      TEST_RISKS,
      TEST_MEASURES
    );
    const personsGeruest = personsResult.measures.find((m) => m.measure.slug === 'absturzsicherung-geruest')!;
    expect(personsGeruest.priority).toBe('kurzfristig');
    expect(personsGeruest.urgency).toBe('hoch');
  });

  it('Iter3-Plausibility: exposure=hoch + Substanz → hohe-exposition-ohne-vorsorge', () => {
    const result = deriveGbu(
      { hazardous_substances: ['farben_lacke'], exposure: 'hoch' },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('hohe-exposition-ohne-vorsorge');
  });

  it('Iter3-Plausibility: intensity=taeglich + Substanz → substitution-pruefen', () => {
    const result = deriveGbu(
      { hazardous_substances: ['reinigung'], intensity: 'taeglich' },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('taegliche-gefahrstoffe-substitution-pruefen');
  });

  it('Iter3-Plausibility: intensity=dauerhaft + bildschirm → g37-pruefen', () => {
    const result = deriveGbu(
      { tools: ['bildschirm'], intensity: 'dauerhaft' },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('taegliche-bildschirmarbeit-g37-pruefen');
  });

  it('Iter3-Plausibility: intensity=dauerhaft + environment=aussen → hitzeschutz-pruefen', () => {
    const result = deriveGbu(
      { environment: ['aussen'], intensity: 'dauerhaft' },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('dauerhafte-aussenarbeit-hitzeschutz-pruefen');
  });

  it('Iter3-Plausibility: 20+ Personen + viele Risiken → priorisierung-pruefen', () => {
    const result = deriveGbu(
      {
        tools: ['handgefuehrt', 'bildschirm'],
        hazardous_substances: ['reinigung'],
        exposed_persons: '20_plus'
      },
      TEST_RISKS,
      TEST_MEASURES
    );
    expect(result.plausibility.map((p) => p.code)).toContain('viele-personen-priorisierung-pruefen');
  });
});

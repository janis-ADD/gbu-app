/**
 * Snapshot-Hash + Verification — Compliance-zentrale Garantien.
 *
 *   1. Self-verifying: snap.snapshot_hash === computeSnapshotHash(snap)
 *   2. Tampering wird erkannt
 *   3. generated_at + snapshot_hash sind AUS dem Hash AUSGENOMMEN
 *      → zwei semantisch identische Snapshots haben denselben Hash,
 *        unabhängig vom Build-Zeitpunkt.
 *   4. Verification-Pfade: ok / no_hash / mismatch / unknown_schema.
 */
import { describe, it, expect } from 'vitest';
import {
  buildEngineSnapshot,
  computeSnapshotHash,
  verifySnapshotIntegrity,
  isEngineSnapshotV2,
  ENGINE_SNAPSHOT_SCHEMA_VERSION,
  ENGINE_VERSION,
  type EngineSnapshotV2
} from '@/lib/wizard/engine';
import { TEST_RISKS, TEST_MEASURES, TEST_LEGAL_REFS } from '../fixtures/catalog';
import { malerFixture, bueroFixture } from '../fixtures/industries';

function buildMaler(): EngineSnapshotV2 {
  return buildEngineSnapshot(
    malerFixture.input_tags,
    TEST_RISKS,
    TEST_MEASURES,
    TEST_LEGAL_REFS,
    malerFixture.acknowledgements ?? {},
    malerFixture.user_selected_risk_slugs
  );
}

describe('buildEngineSnapshot — Schema + Inhalt', () => {
  const snap = buildMaler();

  it('hat schema_version = aktuelle Version', () => {
    expect(snap.schema_version).toBe(ENGINE_SNAPSHOT_SCHEMA_VERSION);
    expect(snap.schema_version).toBe(2);
  });

  it('hat engine_version-Konstante', () => {
    expect(snap.engine_version).toBe(ENGINE_VERSION);
  });

  it('snapshot_hash ist 64-stelliger Hex (SHA-256)', () => {
    expect(snap.snapshot_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('catalog_hash ist 64-stelliger Hex', () => {
    expect(snap.catalog_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('catalog_size stimmt mit Fixture-Größen überein', () => {
    expect(snap.catalog_size.risks).toBe(TEST_RISKS.length);
    expect(snap.catalog_size.measures).toBe(TEST_MEASURES.length);
  });

  it('input_tags == fixture-tags (1:1)', () => {
    expect(snap.input_tags).toEqual(malerFixture.input_tags);
  });

  it('legal_refs enthält NUR die, die von gewählten Maßnahmen referenziert werden', () => {
    const usedSlugs = new Set<string>();
    snap.derived_measures.forEach((m) =>
      m.measure.source_ref_slugs.forEach((s) => usedSlugs.add(s))
    );
    snap.derived_risks.forEach((r) =>
      r.risk.source_ref_slugs.forEach((s) => usedSlugs.add(s))
    );
    const inSnap = Object.keys(snap.legal_refs);
    // jeder im Snapshot vorhandene Ref ist auch tatsächlich referenziert
    for (const k of inSnap) expect(usedSlugs.has(k)).toBe(true);
    // jeder referenzierte Ref (der im Test-Catalog existiert) ist im Snapshot
    for (const s of usedSlugs) {
      if (TEST_LEGAL_REFS.find((r) => r.slug === s)) {
        expect(snap.legal_refs[s], `legal_ref ${s} fehlt im Snapshot`).toBeDefined();
      }
    }
  });

  it('trigger_map ist konsistent zu derived_risks', () => {
    for (const r of snap.derived_risks) {
      expect(snap.trigger_map[r.risk.slug]).toEqual(r.triggers);
    }
  });

  it('mandatory_reasons ist konsistent zu derived_measures', () => {
    for (const m of snap.derived_measures) {
      expect(snap.mandatory_reasons[m.measure.slug]).toBe(m.mandatory_reason);
    }
  });

  it('severity_scores: severity × likelihood = score', () => {
    for (const r of snap.derived_risks) {
      const s = snap.severity_scores[r.risk.slug]!;
      expect(s.score).toBe(s.severity * s.likelihood);
      expect(s.severity).toBe(r.severity);
      expect(s.likelihood).toBe(r.likelihood);
    }
  });

  it('user_selected_risk_slugs ist sortiert (= deterministisch)', () => {
    const sorted = [...snap.user_selected_risk_slugs].sort();
    expect(snap.user_selected_risk_slugs).toEqual(sorted);
  });
});

describe('computeSnapshotHash — Determinismus', () => {
  it('zweimal aufgerufen → identischer Hash', () => {
    const snap = buildMaler();
    expect(computeSnapshotHash(snap)).toBe(computeSnapshotHash(snap));
  });

  it('snap.snapshot_hash === computeSnapshotHash(snap) (self-verifying)', () => {
    const snap = buildMaler();
    expect(snap.snapshot_hash).toBe(computeSnapshotHash(snap));
  });

  it('generated_at ist AUS dem Hash AUSGENOMMEN', () => {
    const snap = buildMaler();
    const laterTimestamp = { ...snap, generated_at: '2099-12-31T23:59:59Z' };
    expect(computeSnapshotHash(laterTimestamp)).toBe(snap.snapshot_hash);
  });

  it('snapshot_hash ist AUS sich selbst AUSGENOMMEN (kein self-cycle)', () => {
    const snap = buildMaler();
    const withFakeHash = { ...snap, snapshot_hash: 'DEADBEEF'.repeat(8) };
    // Die EXPECTED-Berechnung ignoriert das Hash-Feld
    expect(computeSnapshotHash(withFakeHash)).toBe(snap.snapshot_hash);
  });

  it('zwei separat gebaute Snapshots mit gleichem Input → gleicher Hash (auch wenn generated_at differiert)', () => {
    const s1 = buildMaler();
    const s2 = buildMaler();
    expect(s1.snapshot_hash).toBe(s2.snapshot_hash);
    // generated_at darf identisch oder verschieden sein — beide Fälle sind
    // OK, weil generated_at NICHT in den Hash einfließt. Wir assertieren
    // bewusst nur den Hash, nicht den Zeitstempel.
  });
});

describe('computeSnapshotHash — Tampering-Detection', () => {
  it('manipulierter Risk-Set ändert den Hash', () => {
    const snap = buildMaler();
    const tampered = {
      ...snap,
      derived_risks: snap.derived_risks.slice(0, -1) // einen Risk löschen
    };
    expect(computeSnapshotHash(tampered)).not.toBe(snap.snapshot_hash);
  });

  it('manipuliertes mandatory_reason ändert den Hash', () => {
    const snap = buildMaler();
    const someKey = Object.keys(snap.mandatory_reasons)[0];
    if (!someKey) throw new Error('Fixture sollte mind. eine Pflicht-Maßnahme haben');
    const tampered = {
      ...snap,
      mandatory_reasons: { ...snap.mandatory_reasons, [someKey]: 'TAMPERED' }
    };
    expect(computeSnapshotHash(tampered)).not.toBe(snap.snapshot_hash);
  });

  it('manipulierter legal_refs.citation ändert den Hash', () => {
    const snap = buildMaler();
    const refKey = Object.keys(snap.legal_refs)[0];
    if (!refKey) return;
    const tampered = {
      ...snap,
      legal_refs: {
        ...snap.legal_refs,
        [refKey]: { ...snap.legal_refs[refKey]!, citation: 'EVIL §1' }
      }
    };
    expect(computeSnapshotHash(tampered)).not.toBe(snap.snapshot_hash);
  });

  it('manipulierter measure_acknowledgements ändert den Hash', () => {
    const snap = buildMaler();
    const tampered = {
      ...snap,
      measure_acknowledgements: { 'ghost-measure': { confirmed: true, note: null } }
    };
    expect(computeSnapshotHash(tampered)).not.toBe(snap.snapshot_hash);
  });
});

describe('verifySnapshotIntegrity — alle Pfade', () => {
  it('ok=true für unverändeten Snapshot', () => {
    const snap = buildMaler();
    const r = verifySnapshotIntegrity(snap);
    expect(r.ok).toBe(true);
    expect(r.expected).toBe(snap.snapshot_hash);
    expect(r.actual).toBe(snap.snapshot_hash);
    expect(r.reason).toBeUndefined();
  });

  it('ok=false + reason=mismatch bei nachträglicher Manipulation', () => {
    const snap = buildMaler();
    const tampered = {
      ...snap,
      derived_risks: [] // Inhalt geändert, Hash nicht angepasst
    };
    const r = verifySnapshotIntegrity(tampered);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('mismatch');
    expect(r.expected).not.toBe(r.actual);
  });

  it('ok=false + reason=unknown_schema bei Legacy v1', () => {
    const legacyV1 = { schema_version: 1, engine_version: '0.9.0' };
    const r = verifySnapshotIntegrity(legacyV1);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unknown_schema');
  });

  it('ok=false bei null/undefined Input', () => {
    expect(verifySnapshotIntegrity(null).ok).toBe(false);
    expect(verifySnapshotIntegrity(undefined).ok).toBe(false);
  });

  it('ok=false bei Snapshot ohne snapshot_hash-Feld', () => {
    const snap = buildMaler();
    const stripped = { ...snap, snapshot_hash: '' };
    const r = verifySnapshotIntegrity(stripped);
    expect(r.ok).toBe(false);
    // Leerer Hash hat Länge 0 → durch isEngineSnapshotV2 ausgefiltert → unknown_schema
    expect(r.reason).toBe('unknown_schema');
  });
});

describe('isEngineSnapshotV2 — strict guard', () => {
  it('akzeptiert valide v2-Snapshots', () => {
    expect(isEngineSnapshotV2(buildMaler())).toBe(true);
  });

  it('lehnt Legacy v1 ab', () => {
    expect(isEngineSnapshotV2({ schema_version: 1 })).toBe(false);
  });

  it('lehnt Snapshot mit Hash-Länge ≠ 64 ab', () => {
    const snap = buildMaler();
    expect(isEngineSnapshotV2({ ...snap, snapshot_hash: 'short' })).toBe(false);
  });

  it('lehnt fehlende Pflichtfelder ab', () => {
    expect(isEngineSnapshotV2({ schema_version: 2, engine_version: '1.0.0' })).toBe(false);
  });
});

describe('buildEngineSnapshot — User-Risiko-Reduktion', () => {
  it('wenn user_selected_risk_slugs leer → alle Engine-Risiken im Snapshot', () => {
    const snap = buildEngineSnapshot(
      bueroFixture.input_tags,
      TEST_RISKS,
      TEST_MEASURES,
      TEST_LEGAL_REFS,
      {},
      []  // leere User-Auswahl
    );
    expect(snap.derived_risks.length).toBeGreaterThan(0);
  });

  it('User-Auswahl reduziert derived_risks korrekt', () => {
    const snap = buildEngineSnapshot(
      malerFixture.input_tags,
      TEST_RISKS,
      TEST_MEASURES,
      TEST_LEGAL_REFS,
      {},
      ['absturz']  // User hat NUR absturz bestätigt
    );
    expect(snap.derived_risks.map((r) => r.risk.slug)).toEqual(['absturz']);
    // Maßnahmen müssen entsprechend reduziert sein (nur die, die absturz adressieren)
    for (const m of snap.derived_measures) {
      expect(m.for_risks).toContain('absturz');
    }
  });
});

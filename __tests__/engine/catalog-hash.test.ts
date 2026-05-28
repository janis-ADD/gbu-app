/**
 * Catalog-Hash-Determinismus.
 *
 * Garantien:
 *   - Identische Inhalte → identischer Hash, unabhängig von Array-Reihenfolge
 *   - Jede semantische Änderung an Stammdaten → anderer Hash
 *   - Reine Display-Felder (z. B. typical_areas auf Risk) sind NICHT im Hash
 *     (siehe computeCatalogHash-Implementierung — nur die für die Ableitung
 *     relevanten Felder)
 */
import { describe, it, expect } from 'vitest';
import { computeCatalogHash } from '@/lib/wizard/engine';
import { TEST_RISKS, TEST_MEASURES } from '../fixtures/catalog';

describe('computeCatalogHash', () => {
  it('ist deterministisch bei wiederholtem Aufruf', () => {
    const h1 = computeCatalogHash(TEST_RISKS, TEST_MEASURES);
    const h2 = computeCatalogHash(TEST_RISKS, TEST_MEASURES);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('ist unabhängig von Risk-Array-Reihenfolge', () => {
    const shuffled = [...TEST_RISKS].reverse();
    const h1 = computeCatalogHash(TEST_RISKS, TEST_MEASURES);
    const h2 = computeCatalogHash(shuffled, TEST_MEASURES);
    expect(h1).toBe(h2);
  });

  it('ist unabhängig von Measure-Array-Reihenfolge', () => {
    const shuffled = [...TEST_MEASURES].reverse();
    const h1 = computeCatalogHash(TEST_RISKS, TEST_MEASURES);
    const h2 = computeCatalogHash(TEST_RISKS, shuffled);
    expect(h1).toBe(h2);
  });

  it('ändert sich, wenn ein Risk-Slug verändert wird', () => {
    const tampered = TEST_RISKS.map((r, i) =>
      i === 0 ? { ...r, slug: 'absturz-evil' } : r
    );
    expect(computeCatalogHash(tampered, TEST_MEASURES))
      .not.toBe(computeCatalogHash(TEST_RISKS, TEST_MEASURES));
  });

  it('ändert sich, wenn trigger_conditions verändert werden', () => {
    const tampered = TEST_RISKS.map((r) =>
      r.slug === 'absturz'
        ? { ...r, trigger_conditions: { work_height: ['bis-2m'] } }
        : r
    );
    expect(computeCatalogHash(tampered, TEST_MEASURES))
      .not.toBe(computeCatalogHash(TEST_RISKS, TEST_MEASURES));
  });

  it('ändert sich, wenn is_mandatory_when verändert wird', () => {
    const tampered = TEST_MEASURES.map((m) =>
      m.slug === 'psa-bereitstellen'
        ? { ...m, is_mandatory_when: { work_height: ['bis-2m'] } }
        : m
    );
    expect(computeCatalogHash(TEST_RISKS, tampered))
      .not.toBe(computeCatalogHash(TEST_RISKS, TEST_MEASURES));
  });

  it('ist unabhängig von source_ref_slugs-Reihenfolge innerhalb eines Risks', () => {
    const reordered = TEST_RISKS.map((r) =>
      r.slug === 'absturz'
        ? { ...r, source_ref_slugs: [...r.source_ref_slugs].reverse() }
        : r
    );
    expect(computeCatalogHash(reordered, TEST_MEASURES))
      .toBe(computeCatalogHash(TEST_RISKS, TEST_MEASURES));
  });

  it('ist unabhängig von typical_areas (Display-Feld, NICHT im Hash)', () => {
    const altered = TEST_RISKS.map((r) =>
      r.slug === 'absturz'
        ? { ...r, typical_areas: ['cluster-x'] }
        : r
    );
    expect(computeCatalogHash(altered, TEST_MEASURES))
      .toBe(computeCatalogHash(TEST_RISKS, TEST_MEASURES));
  });
});

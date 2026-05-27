/**
 * Stable-Stringify-Tests — die ZENTRALE Drift-Sicherung.
 *
 * Wenn diese Tests grün sind, ist garantiert:
 *   - keine Hash-Drift durch Key-Order
 *   - keine Hash-Drift durch -0
 *   - keine Hash-Drift durch undefined vs. fehlendes Feld
 *   - Array-Reihenfolge bleibt semantisch erhalten (= sie IST Information)
 *
 * Wenn diese Tests rot sind, ist das eine CRITICAL-Regression — alle
 * Snapshot-Hashes der Produktion wären inkompatibel.
 */
import { describe, it, expect } from 'vitest';
import { stableStringify } from '@/lib/wizard/stable-stringify';

describe('stableStringify — Key-Order-Invarianz', () => {
  it('flache Objekte: gleicher Output unabhängig von Insertion-Order', () => {
    const a = { a: 1, b: 2, c: 3 };
    const b = { c: 3, b: 2, a: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('verschachtelte Objekte: tief sortiert', () => {
    const a = { outer: { z: 1, a: 2 }, root: 'x' };
    const b = { root: 'x', outer: { a: 2, z: 1 } };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('Records mit ähnlichen Schlüsseln werden korrekt sortiert', () => {
    const out = stableStringify({ ab: 1, a: 2, abc: 3, aa: 4 });
    expect(out).toBe('{"a":2,"aa":4,"ab":1,"abc":3}');
  });
});

describe('stableStringify — Array-Verhalten', () => {
  it('Array-Reihenfolge wird NICHT verändert (Reihenfolge = Information)', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(stableStringify([3, 2, 1])).toBe('[3,2,1]');
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });

  it('leere Arrays bleiben leer', () => {
    expect(stableStringify([])).toBe('[]');
  });

  it('Arrays mit Objekten — Reihenfolge bleibt, Objekt-Keys werden sortiert', () => {
    const result = stableStringify([{ z: 1, a: 2 }, { b: 3 }]);
    expect(result).toBe('[{"a":2,"z":1},{"b":3}]');
  });
});

describe('stableStringify — Primitive-Normalisierung', () => {
  it('-0 wird zu 0 (statt "-0")', () => {
    expect(stableStringify(-0)).toBe('0');
    expect(stableStringify(0)).toBe('0');
  });

  it('NaN wirft (würde sonst still verschwinden)', () => {
    expect(() => stableStringify(NaN)).toThrow(/non-finite/);
  });

  it('Infinity wirft', () => {
    expect(() => stableStringify(Infinity)).toThrow(/non-finite/);
    expect(() => stableStringify(-Infinity)).toThrow(/non-finite/);
  });

  it('Booleans/Strings korrekt', () => {
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(false)).toBe('false');
    expect(stableStringify('hello')).toBe('"hello"');
    expect(stableStringify('"escape"')).toBe('"\\"escape\\""');
  });

  it('null wird zu "null"', () => {
    expect(stableStringify(null)).toBe('null');
  });
});

describe('stableStringify — undefined-Behandlung', () => {
  it('Top-Level undefined → "null"', () => {
    expect(stableStringify(undefined)).toBe('null');
  });

  it('Objekt-Feld mit undefined wird AUSGELASSEN (= identisch zu fehlendem Feld)', () => {
    const withUndef = { a: 1, b: undefined };
    const without   = { a: 1 };
    expect(stableStringify(withUndef)).toBe(stableStringify(without));
    expect(stableStringify(withUndef)).toBe('{"a":1}');
  });

  it('Array mit undefined → "null" (positional, da Index Information ist)', () => {
    expect(stableStringify([1, undefined, 3])).toBe('[1,null,3]');
  });
});

describe('stableStringify — Verbotene Typen', () => {
  it('Function wirft', () => {
    expect(() => stableStringify(() => 1)).toThrow(/unsupported/);
  });

  it('Symbol wirft', () => {
    expect(() => stableStringify(Symbol('x'))).toThrow(/unsupported/);
  });
});

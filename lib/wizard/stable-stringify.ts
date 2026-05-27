/**
 * Stable JSON-Serializer für Hash-Bildung.
 *
 * `JSON.stringify` ist NICHT deterministisch:
 *   - Object-Keys werden in Insertion-Order serialisiert (Hash-Drift)
 *   - `undefined` wird verschluckt (im Array: `null`)
 *   - `-0` wird zu `"0"`
 *   - keine Behandlung von NaN/Infinity
 *
 * Diese Funktion löst genau diese Drift-Quellen:
 *
 *   - Object-Keys: alphabetisch sortiert (rekursiv)
 *   - `undefined`: wird zu `null` (semantische Gleichheit erzwingen)
 *   - Numbers: NaN/Infinity → Fehler (nicht still verlieren),
 *              -0 → 0, sonst JSON-Roundtrip
 *   - Arrays: Reihenfolge BLEIBT (Reihenfolge ist Information).
 *             Wo "Set"-Semantik gilt, muss der Aufrufer vorab sortieren.
 *   - Booleans/Strings: explizit
 *   - Funktionen/Symbole: Fehler (sollten in Snapshots nie auftauchen)
 *
 * Output ist UTF-8-stabil und damit für SHA-256 verlässlich.
 *
 * Die Implementierung ist bewusst dependency-free (keine `safe-stable-
 * stringify`-Lib) — die Surface ist klein und für unseren Use-Case
 * vollständig kontrollierbar.
 */
export function stableStringify(value: unknown): string {
  return serialize(value);
}

function serialize(value: unknown): string {
  // null / undefined → 'null' (Gleichbehandlung)
  if (value === null || value === undefined) return 'null';

  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`stableStringify: non-finite number (${value}) not serializable`);
    }
    if (Object.is(value, -0)) return '0';
    return JSON.stringify(value);
  }

  if (typeof value === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '[' + value.map(serialize).join(',') + ']';
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    if (keys.length === 0) return '{}';
    const parts: string[] = [];
    for (const k of keys) {
      const v = obj[k];
      // Konsistent mit JSON.stringify: top-level undefined-Werte werden
      // ausgelassen (nicht als "null" emittiert). Damit erzeugen optionale
      // Felder, die nie gesetzt waren, keine Phantom-Differenz vs. Snapshots,
      // bei denen das Feld gar nicht existierte.
      if (v === undefined) continue;
      parts.push(JSON.stringify(k) + ':' + serialize(v));
    }
    return '{' + parts.join(',') + '}';
  }

  throw new Error(`stableStringify: unsupported type "${typeof value}"`);
}

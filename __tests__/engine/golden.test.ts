/**
 * Golden-Master-Tests — bit-genauer Regressionsschutz.
 *
 * Pro Branchen-Fixture wird ein vollständiger Engine-Snapshot gebaut.
 * Sein `snapshot_hash` (deterministisch, ohne generated_at) wird mit dem
 * gespeicherten Golden-Hash verglichen.
 *
 * Erstmaliger Lauf:
 *   `UPDATE_GOLDEN=1 npm run test:update-golden`  ← schreibt das golden.json
 *
 * Spätere Läufe vergleichen 1:1. Ändert sich ein Hash, ist das ein
 * EXPLIZITER fachlicher Eingriff — Entwickler MUSS den neuen Golden-Wert
 * bewusst committen und im Commit-Message dokumentieren WARUM.
 *
 * Zusätzlich: vollständiges Snapshot-Objekt als Vitest-Snapshot (toMatchSnapshot)
 * — der Diff bei Tests-Update zeigt im Detail, WAS sich verändert hat.
 * `generated_at` wird vorher genullt (sonst wäre der Snapshot nie stabil).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  buildEngineSnapshot,
  computeSnapshotHash,
  verifySnapshotIntegrity,
  type EngineSnapshotV2
} from '@/lib/wizard/engine';
import { TEST_RISKS, TEST_MEASURES, TEST_LEGAL_REFS } from '../fixtures/catalog';
import { ALL_INDUSTRY_FIXTURES, type IndustryFixture } from '../fixtures/industries';

const GOLDEN_DIR  = path.join(__dirname, '__golden__');
const GOLDEN_FILE = path.join(GOLDEN_DIR, 'industry-hashes.json');
const UPDATE      = process.env.UPDATE_GOLDEN === '1';

type GoldenRecord = {
  slug: string;
  snapshot_hash: string;
  catalog_hash: string;
  summary: EngineSnapshotV2['summary'];
  /** kurze Inhalts-Indizes — bei Hash-Mismatch hilft das beim Diagnostizieren */
  risks: string[];
  mandatory_measures: string[];
};
type GoldenFile = { generated_at: string; engine_version: string; records: GoldenRecord[] };

function readGolden(): GoldenFile | null {
  if (!existsSync(GOLDEN_FILE)) return null;
  return JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')) as GoldenFile;
}

function writeGolden(records: GoldenRecord[], engineVersion: string): void {
  if (!existsSync(GOLDEN_DIR)) mkdirSync(GOLDEN_DIR, { recursive: true });
  const file: GoldenFile = {
    generated_at: new Date().toISOString(),
    engine_version: engineVersion,
    records
  };
  writeFileSync(GOLDEN_FILE, JSON.stringify(file, null, 2) + '\n', 'utf8');
}

function buildFixtureSnapshot(fix: IndustryFixture): EngineSnapshotV2 {
  return buildEngineSnapshot(
    fix.input_tags,
    TEST_RISKS,
    TEST_MEASURES,
    TEST_LEGAL_REFS,
    fix.acknowledgements ?? {},
    fix.user_selected_risk_slugs
  );
}

/* ─── UPDATE-Modus: Golden-File neu schreiben ──────────────────────── */
if (UPDATE) {
  describe('Golden-Master UPDATE', () => {
    it('schreibt industry-hashes.json neu', () => {
      const records: GoldenRecord[] = ALL_INDUSTRY_FIXTURES.map((fix) => {
        const snap = buildFixtureSnapshot(fix);
        return {
          slug: fix.slug,
          snapshot_hash: snap.snapshot_hash,
          catalog_hash: snap.catalog_hash,
          summary: snap.summary,
          risks: snap.derived_risks.map((r) => r.risk.slug).sort(),
          mandatory_measures: snap.derived_measures
            .filter((m) => m.is_mandatory)
            .map((m) => m.measure.slug)
            .sort()
        };
      });
      const someEngineVersion = buildFixtureSnapshot(ALL_INDUSTRY_FIXTURES[0]!).engine_version;
      writeGolden(records, someEngineVersion);
      expect(records.length).toBe(ALL_INDUSTRY_FIXTURES.length);
    });
  });
}

/* ─── VERIFY-Modus: gegen gespeicherte Goldens vergleichen ──────────── */
describe.skipIf(UPDATE)('Golden-Master VERIFY', () => {
  const golden = readGolden();

  if (!golden) {
    it('Golden-File existiert', () => {
      throw new Error(
        `Kein Golden-File gefunden unter ${GOLDEN_FILE}.\n` +
        `Erstmalig erzeugen mit: UPDATE_GOLDEN=1 npm run test:update-golden`
      );
    });
    return;
  }

  describe.each(ALL_INDUSTRY_FIXTURES)('$name', (fix) => {
    const snap = buildFixtureSnapshot(fix);
    const goldRec = golden.records.find((r) => r.slug === fix.slug);

    it('Golden-Record existiert für diese Branche', () => {
      expect(goldRec, `Kein Golden-Eintrag für '${fix.slug}' — UPDATE_GOLDEN=1 ausführen`).toBeDefined();
    });

    if (!goldRec) return;

    it('snapshot_hash matched Golden', () => {
      expect(snap.snapshot_hash).toBe(goldRec.snapshot_hash);
    });

    it('catalog_hash matched Golden', () => {
      expect(snap.catalog_hash).toBe(goldRec.catalog_hash);
    });

    it('Risk-Set matched Golden', () => {
      const actual = snap.derived_risks.map((r) => r.risk.slug).sort();
      expect(actual).toEqual(goldRec.risks);
    });

    it('Mandatory-Measure-Set matched Golden', () => {
      const actual = snap.derived_measures
        .filter((m) => m.is_mandatory)
        .map((m) => m.measure.slug)
        .sort();
      expect(actual).toEqual(goldRec.mandatory_measures);
    });

    it('Summary matched Golden', () => {
      expect(snap.summary).toEqual(goldRec.summary);
    });

    it('Self-Verifying: snapshot_hash === computeSnapshotHash(snap)', () => {
      expect(computeSnapshotHash(snap)).toBe(snap.snapshot_hash);
      expect(verifySnapshotIntegrity(snap).ok).toBe(true);
    });
  });
});

/* ─── Vitest-Snapshot der vollen Engine-Ausgabe pro Branche ──────────
 * Bei Hash-Mismatch zeigt der `--update`-Diff im PR-Review GENAU, was
 * sich verändert hat — das ist das Audit-Material für den Reviewer.
 */
describe('Vitest-Snapshots (Diff-Hilfe bei Engine-Änderungen)', () => {
  it.each(ALL_INDUSTRY_FIXTURES)('$name — voller Engine-Snapshot', (fix) => {
    const snap = buildFixtureSnapshot(fix);
    // generated_at + snapshot_hash sind variabel/abhängig — wir nullen sie
    // für den Vitest-Snapshot, weil hier der INHALT geprüft wird, nicht
    // die kryptografische Integrität (die macht der Golden-Hash oben).
    const stable = { ...snap, generated_at: '<EXCLUDED>', snapshot_hash: '<COMPUTED>' };
    expect(stable).toMatchSnapshot();
  });
});

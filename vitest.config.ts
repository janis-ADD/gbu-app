import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Vitest-Konfiguration — fokussiert auf Engine/Snapshot/Hash-Tests.
 *
 * Bewusst KEIN jsdom: die Engine ist pure Node-Logik (createHash aus
 * node:crypto). React-Component-Tests sind nicht Teil dieses Sicherheits-
 * netzes — sie würden einen DOM-Layer brauchen und Compliance nicht
 * stärken.
 *
 * Coverage-Default ist v8 — schnell und Native-Node.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // Snapshot-Pfade neben den Tests halten (Default).
    // Snapshot-Header für Vitest-Updates klar machen.
    snapshotFormat: {
      printBasicPrototype: false
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/wizard/**/*.ts'],
      exclude: ['lib/wizard/activities.ts'] // reine Konstanten
    }
  }
});

import type { ReactNode } from 'react';

/**
 * Wiederverwendbarer Vertrauens-Hinweis pro Wizard-Step.
 */
export function SafetyHint({ children }: { children: ReactNode }) {
  return (
    <div className="safety-hint">
      <span className="safety-ico">🛡️</span>
      <div>{children}</div>
    </div>
  );
}

export function HumanLoopNote() {
  return <span className="human-loop-note">KI unterstützt — Mensch prüft</span>;
}

'use client';

import { useRef, useState, type ReactNode } from 'react';

/**
 * Enterprise-Confirmation für destruktive Aktionen.
 *
 * Statt `window.confirm()`: ein ruhiger, professioneller Dialog mit
 * - klarem Titel (was passiert)
 * - sachlichem Begründungstext (warum / Konsequenzen)
 * - optionalem Audit-Hinweis (z. B. „Versionen bleiben erhalten")
 * - zwei klar unterscheidbaren Aktionen (Abbrechen sekundär, Bestätigen primär)
 *
 * Nutzt native <dialog> — kein Modal-Bibliotheks-Overhead, kein Focus-Trap
 * selbstgebaut, A11y kommt vom Browser. Funktioniert in Chrome/Firefox/Safari
 * seit ~2022.
 *
 * Der eigentliche Submit (Server Action) passiert in einer geschachtelten
 * `<form>` — daher kann der Parent diesen Button wie einen normalen
 * Submit-Trigger einsetzen, ohne die Action umzubauen.
 */
export type ConfirmActionButtonProps = {
  /** Trigger-Label (was am sichtbaren Button steht) */
  triggerLabel: ReactNode;
  /** Optionaler Titel-Tooltip am Trigger */
  triggerTitle?: string;
  /** className am Trigger */
  triggerClassName?: string;
  /** Inline-Style am Trigger */
  triggerStyle?: React.CSSProperties;
  /** Modal-Titel */
  title: string;
  /** Erklärungstext (kann ReactNode für Hervorhebungen) */
  description: ReactNode;
  /** Sekundärer Hinweis-Block (z. B. „Versionen bleiben für Audit erhalten") */
  audit?: ReactNode;
  /** Label des Bestätigungs-Buttons */
  confirmLabel: string;
  /** Optionales Token, das exakt eingetippt werden muss (extra Schutz) */
  confirmToken?: string;
  /** Tonalität — bestimmt Farbe des Confirm-Buttons */
  tone?: 'danger' | 'primary';
  /** Server-Action die ausgeführt wird */
  action: (formData: FormData) => Promise<void> | void;
};

export function ConfirmActionButton({
  triggerLabel,
  triggerTitle,
  triggerClassName = 'btn btn-ghost btn-sm',
  triggerStyle,
  title,
  description,
  audit,
  confirmLabel,
  confirmToken,
  tone = 'danger',
  action
}: ConfirmActionButtonProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [typed, setTyped] = useState('');

  function open() {
    setTyped('');
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
    setTyped('');
  }

  const tokenOk = !confirmToken || typed.trim() === confirmToken;
  const confirmClass = tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary';

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        style={triggerStyle}
        title={triggerTitle}
        onClick={open}
      >
        {triggerLabel}
      </button>

      <dialog ref={dialogRef} className="confirm-dialog" onClose={() => setTyped('')}>
        <div className="confirm-dialog-body">
          <div className="confirm-dialog-head">
            <div className={`confirm-dialog-ico confirm-dialog-ico--${tone}`}>
              {tone === 'danger' ? '⚠' : 'ⓘ'}
            </div>
            <div>
              <h2 className="confirm-dialog-title">{title}</h2>
              <div className="confirm-dialog-desc">{description}</div>
            </div>
          </div>

          {audit ? (
            <div className="confirm-dialog-audit">{audit}</div>
          ) : null}

          {confirmToken ? (
            <div className="confirm-dialog-token">
              <label>
                Zum Bestätigen bitte <strong>{confirmToken}</strong> eintippen:
              </label>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="confirm-dialog-token-input"
                placeholder={confirmToken}
              />
            </div>
          ) : null}

          <div className="confirm-dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={close}>
              Abbrechen
            </button>
            <form action={action}>
              <button
                type="submit"
                className={confirmClass}
                disabled={!tokenOk}
              >
                {confirmLabel}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

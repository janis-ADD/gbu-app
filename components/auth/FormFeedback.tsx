import type { AuthState } from '@/lib/forms/states';

/**
 * Wiederverwendbares Feedback-Element für Auth-Forms.
 * Bewusst keine Client-Komponente — wird aus State gerendert,
 * den useFormState (im Parent-Client) liefert.
 */
export function FormFeedback({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <div
        className="alert-banner is-error"
        style={{ marginBottom: 14, marginTop: 0 }}
      >
        <span className="alert-banner-icon">⛔</span>
        <div className="alert-banner-text">{state.error}</div>
      </div>
    );
  }
  if (state.info) {
    return (
      <div
        className="alert-banner is-success"
        style={{ marginBottom: 14, marginTop: 0 }}
      >
        <span className="alert-banner-icon">✅</span>
        <div className="alert-banner-text">{state.info}</div>
      </div>
    );
  }
  return null;
}

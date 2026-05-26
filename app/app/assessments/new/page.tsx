import { createAssessmentAction } from '@/app/actions/assessments';

/**
 * Auto-Submit-Page: erstellt sofort ein leeres Assessment beim Aufruf
 * und leitet in den Wizard. Falls JS deaktiviert / Form-Submit nötig:
 * sichtbarer Fallback-Button.
 */
export default function NewAssessmentPage() {
  return (
    <main className="content">
      <div className="auth-card" style={{ margin: '40px auto', maxWidth: 480, textAlign: 'center' }}>
        <h1>Neue Beurteilung wird angelegt …</h1>
        <p className="auth-sub" style={{ marginBottom: 18 }}>
          Falls die Weiterleitung nicht automatisch erfolgt, klicke hier:
        </p>
        <form action={createAssessmentAction}>
          <button type="submit" className="btn btn-primary btn-block btn-lg">
            ＋ Neue Beurteilung erstellen
          </button>
        </form>
      </div>
      {/* Auto-Submit per kleinem Script — JS-only Verbesserung */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded',function(){
              var f=document.querySelector('form');
              if(f) f.requestSubmit();
            });
          `
        }}
      />
    </main>
  );
}

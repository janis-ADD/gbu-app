# SU24 — GBU-App (Customer)

Eigenständige SaaS-App für KI-gestützte Gefährdungsbeurteilungen.
Next.js 14 App-Router · TypeScript strict · Tailwind · Supabase + RLS.

Verbindliche UX-Referenz: die HTML-Mockups im Root (`/index.html`,
`/wizard.html`, `/version.html`, `/styleguide.html`, `/landing.html`,
`/register.html`, `/login.html`, `/onboarding.html`, `/upgrade.html`,
`/account.html`). Diese App übersetzt das Mockup 1:1 in React.

## Dev-Setup

```bash
cd web
cp .env.example .env.local   # Werte eintragen
npm install
npm run dev                  # http://localhost:3000
```

## Skripte

| Skript | Zweck |
|---|---|
| `npm run dev` | Dev-Server (Hot Reload) |
| `npm run build` | Production-Build |
| `npm run start` | Production-Server (nach build) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript-Check (kein Emit) |

## Architektur-Doktrin

Siehe `~/.claude/projects/.../memory/`:
- `fachliche-leitplanke-doktrin.md` — KI muss konservativ, quellenbasiert, mehrfach-validiert sein
- `ki-architektur-prinzipien.md` — Curated-RAG, Sanitizer, UI-Konsequenzen

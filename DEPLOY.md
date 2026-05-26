# SU24 GBU-App — Netlify Deployment

## Voraussetzungen

- [x] Supabase-Projekt aktiv: `yiplmfqhcizyquwhkxpy`
- [x] DB-Migrationen 0001-0004 eingespielt
- [x] Anon Key + Site URL gesetzt
- [ ] Netlify-Account
- [ ] GitHub-Repo mit diesem Code (oder Netlify-CLI für Direkt-Deploy)

## Schritt-für-Schritt

### 1. Code ins Git-Repo

```bash
cd "/Users/janis/Claude/SU24-KI Beurteilung - PROTO"
git init  # falls noch nicht
git add web/ assets/ *.html
git commit -m "feat: GBU-App MVP — 60s-Wizard, BG-Doktrin, Tracking"
git remote add origin git@github.com:<dein-handle>/su24-gbu-app.git
git push -u origin main
```

### 2. Netlify-Projekt anlegen

1. https://app.netlify.com → **Add new site → Import from Git**
2. GitHub-Repo wählen
3. Settings übernehmen (kommen aus `web/netlify.toml`):
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `.next`

### 3. Environment Variables setzen

In Netlify-Dashboard → **Site settings → Environment variables**:

| Key | Wert | Wo bekommen? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yiplmfqhcizyquwhkxpy.supabase.co` | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` | Supabase Settings → API |
| `NEXT_PUBLIC_SITE_URL` | `https://<dein-subdomain>.netlify.app` (vorerst) oder Custom-Domain | nach erstem Deploy |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` | Google Analytics 4 → Verwaltung → Datenstreams |
| `NEXT_PUBLIC_META_PIXEL_ID` | `1234567890` | Meta Events Manager → Pixel-ID |
| `RA_MODULE_ENABLED` | `true` | — |

### 4. Supabase Auth-URLs auf Production setzen

Wenn der erste Deploy läuft und du eine `*.netlify.app`-URL hast:

https://supabase.com/dashboard/project/yiplmfqhcizyquwhkxpy/auth/url-configuration

- **Site URL:** `https://<dein-subdomain>.netlify.app`
- **Redirect URLs:**
  - `https://<dein-subdomain>.netlify.app/auth/callback`
  - `https://<dein-subdomain>.netlify.app/**`
  - `http://localhost:3000/**` (für Dev)

### 5. Custom Domain (später)

- In Netlify → Domain settings → Add custom domain
- DNS-Einträge gemäß Netlify-Anweisung setzen
- HTTPS wird automatisch via Let's Encrypt

### 6. Nach dem Deploy — Sanity-Check

- [ ] Landing → Register → E-Mail → Bestätigungs-Link → Onboarding → Dashboard
- [ ] Wizard durchklicken (Maler als Branche): BG BAU vorausgewählt + Eigenklärung
- [ ] Release: Version v1 mit Quellen-Verzeichnis + Print-PDF
- [ ] Cookie-Banner erscheint, Accept → GA + Meta laden
- [ ] In Browser-DevTools → Network: `gtag/js` + `fbevents.js` werden geladen
- [ ] GA4 Realtime / Meta Events Manager: erste `PageView` + `CompleteRegistration` sichtbar

### 7. Wichtige Hinweise

- **noindex** ist via `netlify.toml` Header gesetzt (X-Robots-Tag) — vor Marketing-LP-Anschluss raus
- Free-Tier von Netlify reicht für MVP locker
- Supabase Free-Tier hat 500 MB DB + 50k MAU — für Beta-Phase OK

## Bekannte Limitierungen

- Bestätigungs-Mails laufen über Supabase-Default-Templates (Resend-Integration kommt nach erstem Live-Test)
- Plan-Wechsel = Stub (Stripe-Anbindung folgt)
- PDF-Export = Browser-Print (puppeteer-PDF kommt mit Pro-Plan)
- Kein Hard-Delete-Job aktiv (Soft-Delete reicht für Beta)

## Rollback

Netlify behält jeden Deploy als Snapshot:
- Dashboard → Deploys → letzten guten Deploy → **Publish deploy**
- Sekundenrollback ohne Git-History

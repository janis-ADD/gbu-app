# Server-PDF — Architekturnotiz (vorbereitend, NICHT implementiert)

> **Stand:** Browser-Print bleibt der Default-Pfad. Diese Notiz beschreibt
> die Ziel-Architektur für serverseitiges PDF, damit ein späteres Add-on
> ohne Refactor möglich ist.

## Warum überhaupt Server-PDF

Aktuell rendert der Browser via `window.print()` die Version-Page. Vorteil:
keine Server-Last, kein Headless-Browser-Deployment, kein Font-Embedding.
Nachteile, die wir für *Enterprise-Pitch-Level* lösen müssen:

1. **TOC-Seitenzahlen sind leer** — `target-counter()` ist in Chrome
   instabil bei dynamischen Anker-Zielen
2. **Browser-Header/Footer** kommt zusätzlich, wenn der User im Print-Dialog
   „Kopf-/Fußzeilen" aktiviert hat → Doppelung
3. **Font-Rendering** unterscheidet sich zwischen Chrome / Firefox / Safari
   — kein bit-genaues PDF
4. **Logo-Embedding** funktioniert mit `next/image` im Print suboptimal
5. **PDF-Datei mit Hash** statt nur Print-Auslösung — für E-Mail-Anhang,
   Document-Management-Integration

## Ziel-Architektur

```
[Version-Page (React, /v/[n])]                 ← Browser-Anzeige bleibt
                │
                ├── Print-Stylesheet           ← bleibt für lokales Drucken
                │
                └── PDF-Route /api/v/[id]/pdf  ← NEU
                          │
                          ▼
                  Server-Action mit Puppeteer
                          │
                          ▼
                  pdfBuffer → Stream / Download
                          │
                          ▼
                  optional: zusätzlich SHA256(pdfBuffer)
                  → ra_gbu_versions.pdf_hash speichern
```

## Komponenten

### 1. `app/api/v/[gbuId]/[v]/pdf/route.ts` — neuer API-Endpoint

```ts
import { NextRequest, NextResponse } from 'next/server';
import { renderVersionPdf } from '@/lib/pdf/renderVersionPdf';

export async function GET(
  _req: NextRequest,
  { params }: { params: { gbuId: string; v: string } }
) {
  // 1. RLS-konforme Server-Auth-Prüfung — gleiche Logik wie die HTML-Page
  // 2. PDF generieren
  const buffer = await renderVersionPdf(params.gbuId, parseInt(params.v, 10));
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="GBU-v${params.v}.pdf"`,
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}
```

### 2. `lib/pdf/renderVersionPdf.ts` — Puppeteer-Wrapper

```ts
import puppeteer, { type Browser } from 'puppeteer';

let _browser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;
  _browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  return _browser;
}

export async function renderVersionPdf(gbuId: string, v: number): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Server-Side-Token weiterleiten (Cookies + Service-Role oder Session-Bridge)
    const url = `${process.env.INTERNAL_APP_BASE_URL}/app/bundles/_/gbu/${gbuId}/v/${v}?pdf=1`;
    await page.goto(url, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      // Header/Footer-Templates aus dem CSS — keine doppelte Definition
      margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });
  } finally {
    await page.close();
  }
}
```

### 3. Version-Page-Anpassung (minimal-invasiv)

- `searchParams.pdf === '1'` setzt einen `data-pdf-mode`-Attribut auf
  `<body>` — Print-CSS bleibt unverändert, weil schon perfekt
- Header/Footer-Sidebar werden via CSS `[data-pdf-mode] .sidebar { display: none }`
  ausgeblendet (gibt's schon via `@media print`)
- PrintButton wird durch einen direkten Download-Link ersetzt:
  `<a href="/api/v/{gbuId}/{v}/pdf" download>PDF herunterladen</a>`

### 4. Authentifizierung im Headless-Browser

Drei Optionen, sortiert nach Aufwand:

**A) Service-Role Session-Bridge** (empfohlen für MVP+1)
- API-Route liest die User-Session
- Erzeugt einen kurzlebigen signierten Token (`jose`, 60s)
- Puppeteer ruft die Page mit `?_pdf_token=...` auf
- Middleware akzeptiert Token nur für `pdf=1`-Requests
- **Vorteil:** kein Cookie-Sharing, kein Service-Role im Browser

**B) Cookie-Forwarding**
- Page-API ruft `page.setCookie(...)` mit User-Cookies
- Funktioniert, ist aber security-sensibel

**C) Public-PDF mit Versions-ID + signiertem Hash**
- `pdf?sig=...` mit HMAC über `version_id`
- Page rendert ohne Login
- **Vorteil:** PDF teilbar via Link
- **Nachteil:** Snapshot ist nicht mehr per-Tenant geschützt

### 5. Deployment-Hinweis

Vercel/Netlify-Functions haben keinen vorinstallierten Chromium. Optionen:

- **`@sparticuz/chromium-min`** + `puppeteer-core` — passt in Lambda-Layer
  (~50 MB statt 200 MB)
- **Dedizierter Render/Fly.io-Container** für PDF-Service — sauberer aber
  separater Deploy
- **Browserless.io** als Managed Service — am schnellsten am Start

Für MVP+1 empfehle ich `@sparticuz/chromium-min` direkt in der Next-API-Route
auf Netlify-Functions.

### 6. Was sich am Code AKTUELL ändern darf (Vorbereitung)

- **Nichts** — die Print-CSS und Version-Page sind bereits so strukturiert,
  dass Puppeteer sie 1:1 als PDF rendert
- Eine spätere Migration `0013_pdf_hash.sql` würde `ra_gbu_versions.pdf_hash`
  (text, nullable) hinzufügen — die Server-Action füllt das beim ersten
  Render und gibt danach den gecachten Hash zurück

### 7. Schätzung

- API-Route + Puppeteer-Wrapper: 4–6 Std
- Session-Bridge (`jose`-Token): 2 Std
- Sparticuz-Chromium-Setup auf Netlify: 1–2 Std (Trial-and-Error)
- PDF-Hash-Migration + Caching: 1 Std

**Gesamt: ~1 Arbeitstag**, frühestens sinnvoll wenn Browser-Print
nachweislich an Grenzen stößt (Logo-Render, TOC-Seitenzahlen,
Cross-Browser-Fonts).

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

/**
 * Globale Middleware:
 *  - aktualisiert Supabase-Session-Cookies bei jedem Request
 *  - schützt /app/* (nur eingeloggte User)
 *  - leitet eingeloggte User von /login & /register weg
 *
 * Onboarding-Gate (Profil-Check) liegt absichtlich NICHT hier, sondern
 * in app/app/layout.tsx — dort steht ein vollwertiger Supabase-Server-Client
 * mit korrekter RLS-Authentifizierung zur Verfügung.
 */
export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAppRoute = pathname.startsWith('/app');
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot' ||
    pathname === '/verify';

  if (isAppRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/app/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};

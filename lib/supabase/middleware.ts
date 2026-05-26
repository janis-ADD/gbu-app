import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Aktualisiert die Supabase-Session pro Request (Cookie-Refresh)
 * und gibt die Response zurück. Zentral genutzt von web/middleware.ts.
 *
 * Auth-Gate-Logik (welche Route ist public, welche braucht Login)
 * liegt absichtlich in web/middleware.ts, nicht hier — damit dieses
 * Modul ausschließlich für Cookie-/Session-Mechanik zuständig ist.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: { id: string; email?: string } | null;
}> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // ENV nicht gesetzt → kein Crash, App rendert ohne Auth.
    // In Production muss die ENV gesetzt sein (Deploy-Check).
    return { response, user: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: '', ...options });
      }
    }
  });

  // Wichtig: getUser() triggert ggf. Cookie-Refresh.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return {
    response,
    user: user ? { id: user.id, email: user.email ?? undefined } : null
  };
}

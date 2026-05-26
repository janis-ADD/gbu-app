import { createClient } from '@/lib/supabase/server';
import type { RaUserProfile } from '@/lib/db/types';

/**
 * Liest das Profil des eingeloggten Users.
 * Liefert null, wenn nicht eingeloggt ODER kein Profil-Row existiert
 * (sollte durch ra_handle_new_user-Trigger nie passieren, aber defensiv).
 */
export async function getCurrentProfile(): Promise<{
  user: { id: string; email: string | null };
  profile: RaUserProfile | null;
} | null> {
  try {
    const supabase = createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return null;

    const { data: profile } = await supabase
      .from('ra_user_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle<RaUserProfile>();

    return {
      user: { id: userData.user.id, email: userData.user.email ?? null },
      profile: profile ?? null
    };
  } catch {
    return null;
  }
}

/**
 * Helper für das Middleware/Route-Gate.
 * Liefert true, wenn der User onboarded ist.
 */
export function isOnboarded(profile: RaUserProfile | null): boolean {
  return !!profile?.onboarding_completed_at;
}

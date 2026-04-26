import type { User } from '@supabase/supabase-js';

type AuthLikeUser = Pick<User, 'id' | 'email' | 'phone' | 'app_metadata'>;

function decodeBase64UrlJson<T>(segment: string): T | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function decodeSupabaseJwtRole(jwt: string | null | undefined): string | null {
  if (!jwt) return null;
  const [, payload] = jwt.split('.');
  if (!payload) return null;
  const parsed = decodeBase64UrlJson<{ role?: unknown }>(payload);
  return typeof parsed?.role === 'string' ? parsed.role : null;
}

export function browserSupabaseKeyUsesServiceRole(jwt: string | null | undefined): boolean {
  return decodeSupabaseJwtRole(jwt) === 'service_role';
}

export function hasSupabaseAdminClaim(user: Pick<AuthLikeUser, 'app_metadata'> | null | undefined): boolean {
  const claim = user?.app_metadata?.is_admin;
  return claim === true || claim === 'true';
}

export function describeAdminPrincipal(user: AuthLikeUser | null | undefined): string {
  if (!user) return 'unknown principal';
  if (typeof user.email === 'string' && user.email.trim()) return user.email;
  if (typeof user.phone === 'string' && user.phone.trim()) return user.phone;
  return `user ${user.id}`;
}

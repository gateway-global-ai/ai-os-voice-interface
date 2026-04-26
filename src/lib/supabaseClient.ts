/**
 * Browser-side Supabase clients.
 * Auth/common client: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
 * AI OS data client: AI_OS_SUPABASE_URL + AI_OS_SUPABASE_PUBLIC_KEY.
 *
 * These clients are only safe authority boundaries when browser keys are anon/publishable
 * keys and the database enforces RLS. Never expose service-role keys in browser code.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { browserSupabaseKeyUsesServiceRole, decodeSupabaseJwtRole } from './adminAuthority';
import type { Database } from './supabaseTypes';

type ViteSupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  AI_OS_SUPABASE_URL?: string;
  AI_OS_SUPABASE_PUBLIC_KEY?: string;
};

const viteEnv = ((import.meta as ImportMeta & { env?: ViteSupabaseEnv }).env ?? {}) as ViteSupabaseEnv;
const supabaseUrl = viteEnv.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY ?? '';
const aiOsSupabaseUrl = viteEnv.AI_OS_SUPABASE_URL ?? '';
const aiOsSupabasePublicKey = viteEnv.AI_OS_SUPABASE_PUBLIC_KEY ?? '';
export const browserSupabaseKeyRole = decodeSupabaseJwtRole(supabaseAnonKey);
export const browserSupabaseUsesServiceRoleKey = browserSupabaseKeyUsesServiceRole(supabaseAnonKey);
export const browserAiOsSupabaseKeyRole = decodeSupabaseJwtRole(aiOsSupabasePublicKey);
export const browserAiOsSupabaseUsesServiceRoleKey = browserSupabaseKeyUsesServiceRole(aiOsSupabasePublicKey);
const authBrowserClientSafe = Boolean(supabaseUrl && supabaseAnonKey && !browserSupabaseUsesServiceRoleKey);
const aiOsBrowserClientSafe = Boolean(aiOsSupabaseUrl && aiOsSupabasePublicKey && !browserAiOsSupabaseUsesServiceRoleKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[supabaseClient] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Auth/common Supabase sync will be disabled.');
}

if (browserSupabaseUsesServiceRoleKey) {
  console.error(
    '[supabaseClient] VITE_SUPABASE_ANON_KEY decodes to service_role. Auth/common browser Supabase client is disabled until this is replaced with the project anon/publishable key.',
  );
}

if (!aiOsSupabaseUrl || !aiOsSupabasePublicKey) {
  console.warn('[supabaseClient] AI_OS_SUPABASE_URL or AI_OS_SUPABASE_PUBLIC_KEY is not set. AI OS data sync will only fall back to the auth/common client when that browser client is RLS-safe.');
}

if (browserAiOsSupabaseUsesServiceRoleKey) {
  console.error(
    '[supabaseClient] AI_OS_SUPABASE_PUBLIC_KEY decodes to service_role. AI OS browser Supabase client is disabled until this is replaced with the project anon/publishable key.',
  );
}

export const supabase = authBrowserClientSafe
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

export const aiOsSupabase = aiOsBrowserClientSafe
  ? createClient<Database>(aiOsSupabaseUrl, aiOsSupabasePublicKey)
  : authBrowserClientSafe
    ? supabase
    : null;

export const isSupabaseAvailable = supabase !== null;
export const isAiOsSupabaseAvailable = aiOsSupabase !== null;

/**
 * Server-side Supabase admin client.
 * Uses the AI OS service role key — bypasses all RLS policies.
 * NEVER import this in browser/Vite code; only use in server/ or scripts/.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabaseTypes';

const supabaseUrl = process.env.AI_OS_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.AI_OS_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[supabaseAdmin] AI_OS_SUPABASE_URL or AI_OS_SUPABASE_SECRET_KEY is not set.');
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

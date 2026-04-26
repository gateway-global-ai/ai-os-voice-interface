import Stripe from 'npm:stripe@^17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const aiOsSupabaseUrl = Deno.env.get('AI_OS_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL');
  const aiOsServiceRoleKey = Deno.env.get('AI_OS_SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authSupabaseUrl = Deno.env.get('SUPABASE_URL') ?? aiOsSupabaseUrl;
  const authServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? aiOsServiceRoleKey;
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

  if (!stripeKey || !aiOsSupabaseUrl || !aiOsServiceRoleKey || !authSupabaseUrl || !authServiceRoleKey) {
    return json({ error: 'blocked_missing_server_secrets' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'auth_required' }, 401);

  const userClient = createClient(authSupabaseUrl, authServiceRoleKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(aiOsSupabaseUrl, aiOsServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: 'auth_required' }, 401);

  const payload = await req.json().catch(() => ({}));
  const programSlug = typeof payload.program_slug === 'string' ? payload.program_slug : 'vibe-coding-university';

  const { data: program, error: programError } = await adminClient
    .from('university_programs')
    .select('program_slug,title,stripe_price_lookup_key')
    .eq('program_slug', programSlug)
    .single();
  if (programError || !program) return json({ error: 'program_not_found' }, 404);

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
  const lookupKey = program.stripe_price_lookup_key;
  if (!lookupKey) return json({ error: 'blocked_missing_price_lookup_key' }, 400);

  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const price = prices.data[0];
  if (!price) return json({ error: 'stripe_price_not_found', lookup_key: lookupKey }, 404);

  const { data: existingCustomer } = await adminClient
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('owner_auth_id', userData.user.id)
    .maybeSingle();

  let customerId = existingCustomer?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.user.email ?? undefined,
      metadata: { owner_auth_id: userData.user.id, program_slug: programSlug },
    });
    customerId = customer.id;
    const { error: customerUpsertError } = await adminClient.from('stripe_customers').upsert({
      owner_auth_id: userData.user.id,
      stripe_customer_id: customerId,
      email: userData.user.email ?? null,
    });
    if (customerUpsertError) return json({ error: 'customer_upsert_failed', detail: customerUpsertError.message }, 500);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userData.user.id,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${appUrl}?vcu_checkout=success`,
    cancel_url: `${appUrl}?vcu_checkout=cancelled`,
    metadata: { owner_auth_id: userData.user.id, program_slug: programSlug },
    subscription_data: { metadata: { owner_auth_id: userData.user.id, program_slug: programSlug } },
  });

  return json({ url: session.url, session_id: session.id });
});

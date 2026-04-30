import Stripe from 'npm:stripe@^17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function accessStatusForStripe(status: string): string {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  return 'unverified';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('AI_OS_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL');
  const serviceRoleKey =
    Deno.env.get('AI_OS_SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('AI_OS_SUPABASE_SECRET_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return json({ error: 'blocked_missing_server_secrets' }, 500);
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'missing_stripe_signature' }, 400);

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return json({ error: 'invalid_signature', detail: message }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: eventInsertError } = await adminClient.from('stripe_billing_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload_summary: { livemode: event.livemode, created: event.created },
  });
  if (eventInsertError) {
    if (eventInsertError.code === '23505') return json({ received: true, duplicate: true });
    return json({ error: 'event_log_failed', detail: eventInsertError.message }, 500);
  }

  if (event.type.startsWith('customer.subscription.')) {
    const subscription = event.data.object as Stripe.Subscription;
    const ownerAuthId = subscription.metadata.owner_auth_id;
    const programSlug = subscription.metadata.program_slug ?? 'vibe-coding-university';
    const item = subscription.items.data[0];

    if (!ownerAuthId) return json({ error: 'blocked_missing_owner_auth_id' }, 400);

    const { error: subError } = await adminClient.from('stripe_subscriptions').upsert({
      stripe_subscription_id: subscription.id,
      owner_auth_id: ownerAuthId,
      program_slug: programSlug,
      stripe_customer_id: String(subscription.customer),
      stripe_price_id: item?.price?.id ?? null,
      status: subscription.status,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
    if (subError) return json({ error: 'subscription_upsert_failed', detail: subError.message }, 500);

    const { error: enrollmentError } = await adminClient.from('university_enrollments').upsert({
      owner_auth_id: ownerAuthId,
      program_slug: programSlug,
      access_status: accessStatusForStripe(subscription.status),
      access_source: 'stripe',
      stripe_subscription_id: subscription.id,
      evidence: {
        stripe_event_id: event.id,
        stripe_event_type: event.type,
        status: subscription.status,
      },
    }, { onConflict: 'owner_auth_id,program_slug' });
    if (enrollmentError) return json({ error: 'enrollment_upsert_failed', detail: enrollmentError.message }, 500);
  }

  return json({ received: true });
});

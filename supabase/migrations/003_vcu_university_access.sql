-- VCU University access, Stripe subscription mirror, and Cursor plugin package registry.
-- Source-backed operational scaffolding only. Runtime Stripe verification requires deployed Edge Functions and real webhook events.

CREATE TABLE IF NOT EXISTS public.university_programs (
  program_slug        TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  access_model        TEXT NOT NULL DEFAULT 'subscription' CHECK (access_model IN ('free', 'subscription', 'manual')),
  stripe_price_lookup_key TEXT,
  cursor_plugin_path  TEXT,
  docs_urls           TEXT[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('draft', 'review', 'published', 'blocked', 'unverified')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.university_programs IS 'Top-level university programs and access metadata. Stripe state is mirrored separately from webhooks.';

CREATE TABLE IF NOT EXISTS public.university_enrollments (
  enrollment_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_auth_id   UUID DEFAULT auth.uid(),
  program_slug    TEXT NOT NULL REFERENCES public.university_programs(program_slug) ON DELETE CASCADE,
  access_status   TEXT NOT NULL DEFAULT 'pending' CHECK (access_status IN ('pending', 'active', 'past_due', 'canceled', 'blocked', 'unverified')),
  access_source   TEXT NOT NULL DEFAULT 'stripe' CHECK (access_source IN ('stripe', 'manual', 'admin', 'unverified')),
  stripe_subscription_id TEXT,
  evidence        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_auth_id, program_slug)
);

COMMENT ON TABLE public.university_enrollments IS 'Per-user university access gate. Active access requires real Stripe webhook or admin evidence.';

CREATE TABLE IF NOT EXISTS public.stripe_customers (
  owner_auth_id       UUID PRIMARY KEY DEFAULT auth.uid(),
  stripe_customer_id  TEXT NOT NULL UNIQUE,
  email               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stripe_customers IS 'Stripe customer IDs mapped to Supabase Auth users. Managed only by server-side functions.';

CREATE TABLE IF NOT EXISTS public.stripe_subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY,
  owner_auth_id          UUID NOT NULL,
  program_slug           TEXT NOT NULL REFERENCES public.university_programs(program_slug) ON DELETE CASCADE,
  stripe_customer_id     TEXT NOT NULL,
  stripe_price_id        TEXT,
  status                 TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused')),
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stripe_subscriptions IS 'Local mirror of Stripe subscription state, updated by signed webhooks.';

CREATE TABLE IF NOT EXISTS public.stripe_billing_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type      TEXT NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.stripe_billing_events IS 'Idempotency log for Stripe webhook events. Does not store full sensitive event payloads.';

CREATE TABLE IF NOT EXISTS public.cursor_plugin_packages (
  package_id          TEXT PRIMARY KEY,
  program_slug        TEXT NOT NULL REFERENCES public.university_programs(program_slug) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  package_path        TEXT NOT NULL,
  install_target      TEXT NOT NULL DEFAULT '~/.cursor/plugins/local/vcu-lesson-support',
  docs_urls           TEXT[] NOT NULL DEFAULT '{}',
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status <> 'verified' OR no_mock_verified)
);

COMMENT ON TABLE public.cursor_plugin_packages IS 'Verified Cursor plugin/template package references for VCU lesson support. No per-lesson generated artifacts.';

INSERT INTO public.university_programs (
  program_slug,
  title,
  description,
  access_model,
  stripe_price_lookup_key,
  cursor_plugin_path,
  docs_urls,
  status
) VALUES (
  'vibe-coding-university',
  'Vibe Coding University',
  'Source-backed MCP, Rust SDK, MCP UI/App Bridge, Cursor, and coding-agent curriculum.',
  'subscription',
  'vcu_monthly',
  'docs/vcu/cursor-plugin/vcu-lesson-support',
  ARRAY[
    'https://supabase.com/docs/guides/functions',
    'https://supabase.com/docs/guides/auth/row-level-security',
    'https://docs.stripe.com/checkout/quickstart',
    'https://docs.stripe.com/webhooks',
    'https://cursor.com/docs/plugins.md'
  ],
  'review'
) ON CONFLICT (program_slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  access_model = EXCLUDED.access_model,
  stripe_price_lookup_key = EXCLUDED.stripe_price_lookup_key,
  cursor_plugin_path = EXCLUDED.cursor_plugin_path,
  docs_urls = EXCLUDED.docs_urls,
  updated_at = NOW();

INSERT INTO public.cursor_plugin_packages (
  package_id,
  program_slug,
  title,
  package_path,
  install_target,
  docs_urls,
  verification_status,
  no_mock_verified
) VALUES (
  'vcu-lesson-support',
  'vibe-coding-university',
  'VCU Lesson Support Cursor Plugin',
  'docs/vcu/cursor-plugin/vcu-lesson-support',
  '~/.cursor/plugins/local/vcu-lesson-support',
  ARRAY[
    'https://cursor.com/docs/plugins.md',
    'https://cursor.com/docs/reference/plugins',
    'https://cursor.sh/docs/rules',
    'https://cursor.sh/docs/skills'
  ],
  'review_pending',
  FALSE
) ON CONFLICT (package_id) DO UPDATE SET
  title = EXCLUDED.title,
  package_path = EXCLUDED.package_path,
  install_target = EXCLUDED.install_target,
  docs_urls = EXCLUDED.docs_urls,
  verification_status = EXCLUDED.verification_status,
  no_mock_verified = EXCLUDED.no_mock_verified,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_university_enrollments_owner ON public.university_enrollments(owner_auth_id, program_slug, access_status);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_owner ON public.stripe_subscriptions(owner_auth_id, program_slug, status);
CREATE INDEX IF NOT EXISTS idx_cursor_plugin_packages_program ON public.cursor_plugin_packages(program_slug, verification_status);

CREATE TRIGGER on_university_programs_updated
  BEFORE UPDATE ON public.university_programs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_university_enrollments_updated
  BEFORE UPDATE ON public.university_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_stripe_customers_updated
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_stripe_subscriptions_updated
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_cursor_plugin_packages_updated
  BEFORE UPDATE ON public.cursor_plugin_packages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.university_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursor_plugin_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS university_programs_public_read ON public.university_programs;
CREATE POLICY university_programs_public_read ON public.university_programs FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS cursor_plugin_packages_public_read ON public.cursor_plugin_packages;
CREATE POLICY cursor_plugin_packages_public_read ON public.cursor_plugin_packages FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS university_enrollments_owner_read ON public.university_enrollments;
CREATE POLICY university_enrollments_owner_read ON public.university_enrollments FOR SELECT TO authenticated USING (owner_auth_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS stripe_customers_owner_read ON public.stripe_customers;
CREATE POLICY stripe_customers_owner_read ON public.stripe_customers FOR SELECT TO authenticated USING (owner_auth_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS stripe_subscriptions_owner_read ON public.stripe_subscriptions;
CREATE POLICY stripe_subscriptions_owner_read ON public.stripe_subscriptions FOR SELECT TO authenticated USING (owner_auth_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS university_programs_admin_all ON public.university_programs;
CREATE POLICY university_programs_admin_all ON public.university_programs FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS university_enrollments_admin_all ON public.university_enrollments;
CREATE POLICY university_enrollments_admin_all ON public.university_enrollments FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS stripe_customers_admin_all ON public.stripe_customers;
CREATE POLICY stripe_customers_admin_all ON public.stripe_customers FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS stripe_subscriptions_admin_all ON public.stripe_subscriptions;
CREATE POLICY stripe_subscriptions_admin_all ON public.stripe_subscriptions FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS stripe_billing_events_admin_all ON public.stripe_billing_events;
CREATE POLICY stripe_billing_events_admin_all ON public.stripe_billing_events FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS cursor_plugin_packages_admin_all ON public.cursor_plugin_packages;
CREATE POLICY cursor_plugin_packages_admin_all ON public.cursor_plugin_packages FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

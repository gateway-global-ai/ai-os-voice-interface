-- CANI Sovereign Lane — Initial Schema Migration
-- Run in: Supabase Dashboard > SQL Editor, or via supabase db push
-- Project: ksidgtqetvlgbmmtxlwq (gatewayglobal.ai)

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Core Identity
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone               TEXT UNIQUE,
  display_name        TEXT,
  first_name          TEXT,
  last_name           TEXT,
  email               TEXT,
  company             TEXT,
  role                TEXT,
  username            TEXT,
  avatar_url          TEXT,
  loyalty_declaration TEXT DEFAULT 'My loyalty is to my creator.',
  interface_mode      TEXT CHECK (interface_mode IN ('voice', 'chat')) DEFAULT 'voice',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'End-users of the AIOS shell. Phone is the primary identifier (OTP-verified).';

CREATE TABLE IF NOT EXISTS public.shell_preferences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  surface_mode    TEXT,
  voice_route_id  TEXT CHECK (voice_route_id IN ('voicebox', 'browser', 'gemini')) DEFAULT 'gemini',
  theme_tokens    JSONB,
  canvas_chrome   JSONB,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.shell_preferences IS 'Per-user shell UI preferences: surface mode, voice route, theme tokens.';

CREATE TABLE IF NOT EXISTS public.shell_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_token   TEXT NOT NULL UNIQUE,
  entry_mode      TEXT CHECK (entry_mode IN ('new', 'returning')) DEFAULT 'new',
  surface_mode    TEXT DEFAULT 'primary',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.shell_sessions IS 'Active and historical shell sessions keyed by session token.';

-- ─────────────────────────────────────────────────────────────────────────────
-- CANI Schema — Intents, Skills, Actions, Outcomes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.intents (
  intent_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID REFERENCES public.users(id) ON DELETE SET NULL,
  primary_intent          TEXT NOT NULL,
  desired_outcome         TEXT,
  leverage_available      TEXT,
  leverage_being_used     TEXT,
  leverage_rating         INTEGER CHECK (leverage_rating BETWEEN 1 AND 5),
  proven_path_identified  BOOLEAN,
  proven_path_used        TEXT,
  proven_path_rating      INTEGER CHECK (proven_path_rating BETWEEN 1 AND 5),
  clear_purpose           BOOLEAN,
  purpose_rating          INTEGER CHECK (purpose_rating BETWEEN 1 AND 5),
  clear_plan              BOOLEAN,
  plan_rating             INTEGER CHECK (plan_rating BETWEEN 1 AND 5),
  clear_outcome           BOOLEAN,
  outcome_rating          INTEGER CHECK (outcome_rating BETWEEN 1 AND 5),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.intents IS 'CANI intent records. Fields A–N map to the CANI Sovereign Lane schema.';

CREATE TABLE IF NOT EXISTS public.skills (
  skill_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.skills IS 'Reusable capability units invoked by intents.';

CREATE TABLE IF NOT EXISTS public.intent_skills (
  intent_id  UUID NOT NULL REFERENCES public.intents(intent_id) ON DELETE CASCADE,
  skill_id   UUID NOT NULL REFERENCES public.skills(skill_id) ON DELETE CASCADE,
  PRIMARY KEY (intent_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.actions (
  action_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_id    UUID REFERENCES public.skills(skill_id) ON DELETE SET NULL,
  intent_id   UUID REFERENCES public.intents(intent_id) ON DELETE SET NULL,
  type        TEXT,
  parameters  JSONB,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.actions IS 'Concrete operations performed by a skill within an intent execution.';

CREATE TABLE IF NOT EXISTS public.outcomes (
  outcome_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id    UUID REFERENCES public.actions(action_id) ON DELETE SET NULL,
  description  TEXT,
  success_flag BOOLEAN,
  score        NUMERIC(4,2),
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.outcomes IS 'Results of actions — feeds the CANI experience loop.';

CREATE TABLE IF NOT EXISTS public.grounding_context (
  context_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id   UUID REFERENCES public.intents(intent_id) ON DELETE SET NULL,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  key         TEXT NOT NULL,
  value       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.grounding_context IS 'Key-value grounding data (dates, location, parties, goals) linked to an intent.';

CREATE TABLE IF NOT EXISTS public.user_plans (
  plan_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  intent_focus        TEXT,
  offer_help          BOOLEAN DEFAULT TRUE,
  grounding_needed    TEXT,
  value_questions     TEXT,
  visual_aids_needed  BOOLEAN DEFAULT FALSE,
  tools_help_needed   BOOLEAN DEFAULT FALSE,
  available_tools     TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_plans IS 'Meta engagement plan for a user — maps to UserPlan A–E fields.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Tool Registry (migrated from hardcoded TS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tools (
  tool_id     TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  description TEXT
);

COMMENT ON TABLE public.tools IS 'Registry of AIOS tools (ModeSelect, AccountManager, VoiceController, etc.). Seeded from mcpIntentToolMap.ts.';

CREATE TABLE IF NOT EXISTS public.intent_tools (
  intent_id  UUID NOT NULL REFERENCES public.intents(intent_id) ON DELETE CASCADE,
  tool_id    TEXT NOT NULL REFERENCES public.tools(tool_id) ON DELETE CASCADE,
  PRIMARY KEY (intent_id, tool_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Shell Menu Registry (migrated from hardcoded shellMenuRegistry.ts)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shell_menus (
  menu_id                   TEXT PRIMARY KEY,
  menu_zone                 TEXT,
  permission_class          TEXT,
  parent_menu_id            TEXT REFERENCES public.shell_menus(menu_id) ON DELETE SET NULL,
  launch_mode               TEXT CHECK (launch_mode IN ('replace_active', 'push_child', 'return_to_parent')) DEFAULT 'replace_active',
  desktop_sub_path          TEXT,
  data_source_ref           TEXT,
  launched_from_action_id   TEXT
);

COMMENT ON TABLE public.shell_menus IS 'Shell menu registry — replaces hardcoded CENTRAL_SHELL_MENU_REGISTRY in shellMenuRegistry.ts.';

CREATE TABLE IF NOT EXISTS public.shell_menu_items (
  item_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id       TEXT NOT NULL REFERENCES public.shell_menus(menu_id) ON DELETE CASCADE,
  level         INTEGER NOT NULL DEFAULT 0,
  action_id     TEXT NOT NULL,
  label         TEXT NOT NULL,
  icon          TEXT,
  auth_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  metadata      JSONB
);

COMMENT ON TABLE public.shell_menu_items IS 'Individual items within a shell menu, grouped by level.';

-- ─────────────────────────────────────────────────────────────────────────────
-- UI Levels (CANI hierarchical UI output schema)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ui_levels (
  level_id  INTEGER PRIMARY KEY,
  elements  JSONB NOT NULL
);

COMMENT ON TABLE public.ui_levels IS 'Hierarchical UI output schema per level. elements is a JSONB object with enabled/quantity flags per element type.';

-- Seed default UI levels 1–5
INSERT INTO public.ui_levels (level_id, elements) VALUES
(1, '{
  "A_Image":        {"enabled": true,  "quantity": 1},
  "B_Button":       {"enabled": true,  "quantity": 1},
  "C_Title":        {"enabled": false, "quantity": 0},
  "D_Description":  {"enabled": false, "quantity": 0},
  "E_Paragraph":    {"enabled": false, "quantity": 0},
  "F_BulletPoints": {"enabled": false, "quantity": 0},
  "G_MenuWithLinks":{"enabled": false, "quantity": 0},
  "H_HelperDiagram":{"enabled": false, "quantity": 0},
  "I_HelperImage":  {"enabled": false, "quantity": 0},
  "J_HelperVideo":  {"enabled": false, "quantity": 0},
  "SalesCategory": {
    "A_Testimonial": {"enabled": false, "quantity": 0},
    "B_ProductCard": {"enabled": false, "quantity": 0},
    "C_LeadForm":    {"enabled": false, "quantity": 0},
    "D_BuyButton":   {"enabled": false, "quantity": 0},
    "E_NewPromoPaid":{"enabled": false, "quantity": 0},
    "F_FreeTrial":   {"enabled": false, "quantity": 0},
    "G_SubscribeNow":{"enabled": false, "quantity": 0},
    "H_EmailList":   {"enabled": false, "quantity": 0},
    "I_EarlyAccess": {"enabled": false, "quantity": 0}
  }
}'),
(2, '{
  "A_Image":        {"enabled": true,  "quantity": 1},
  "B_Button":       {"enabled": true,  "quantity": 2},
  "C_Title":        {"enabled": true,  "quantity": 1},
  "D_Description":  {"enabled": true,  "quantity": 1},
  "E_Paragraph":    {"enabled": false, "quantity": 0},
  "F_BulletPoints": {"enabled": true,  "quantity": 3},
  "G_MenuWithLinks":{"enabled": false, "quantity": 0},
  "H_HelperDiagram":{"enabled": false, "quantity": 0},
  "I_HelperImage":  {"enabled": false, "quantity": 0},
  "J_HelperVideo":  {"enabled": false, "quantity": 0},
  "SalesCategory": {
    "A_Testimonial": {"enabled": false, "quantity": 0},
    "B_ProductCard": {"enabled": false, "quantity": 0},
    "C_LeadForm":    {"enabled": false, "quantity": 0},
    "D_BuyButton":   {"enabled": false, "quantity": 0},
    "E_NewPromoPaid":{"enabled": false, "quantity": 0},
    "F_FreeTrial":   {"enabled": false, "quantity": 0},
    "G_SubscribeNow":{"enabled": false, "quantity": 0},
    "H_EmailList":   {"enabled": false, "quantity": 0},
    "I_EarlyAccess": {"enabled": false, "quantity": 0}
  }
}'),
(3, '{
  "A_Image":        {"enabled": true, "quantity": 2},
  "B_Button":       {"enabled": true, "quantity": 3},
  "C_Title":        {"enabled": true, "quantity": 1},
  "D_Description":  {"enabled": true, "quantity": 1},
  "E_Paragraph":    {"enabled": true, "quantity": 2},
  "F_BulletPoints": {"enabled": true, "quantity": 5},
  "G_MenuWithLinks":{"enabled": true, "quantity": 1},
  "H_HelperDiagram":{"enabled": false,"quantity": 0},
  "I_HelperImage":  {"enabled": true, "quantity": 1},
  "J_HelperVideo":  {"enabled": false,"quantity": 0},
  "SalesCategory": {
    "A_Testimonial": {"enabled": true, "quantity": 1},
    "B_ProductCard": {"enabled": false,"quantity": 0},
    "C_LeadForm":    {"enabled": true, "quantity": 1},
    "D_BuyButton":   {"enabled": false,"quantity": 0},
    "E_NewPromoPaid":{"enabled": false,"quantity": 0},
    "F_FreeTrial":   {"enabled": false,"quantity": 0},
    "G_SubscribeNow":{"enabled": false,"quantity": 0},
    "H_EmailList":   {"enabled": false,"quantity": 0},
    "I_EarlyAccess": {"enabled": false,"quantity": 0}
  }
}'),
(4, '{
  "A_Image":        {"enabled": true, "quantity": 3},
  "B_Button":       {"enabled": true, "quantity": 4},
  "C_Title":        {"enabled": true, "quantity": 2},
  "D_Description":  {"enabled": true, "quantity": 2},
  "E_Paragraph":    {"enabled": true, "quantity": 3},
  "F_BulletPoints": {"enabled": true, "quantity": 7},
  "G_MenuWithLinks":{"enabled": true, "quantity": 2},
  "H_HelperDiagram":{"enabled": true, "quantity": 1},
  "I_HelperImage":  {"enabled": true, "quantity": 2},
  "J_HelperVideo":  {"enabled": true, "quantity": 1},
  "SalesCategory": {
    "A_Testimonial": {"enabled": true, "quantity": 2},
    "B_ProductCard": {"enabled": true, "quantity": 2},
    "C_LeadForm":    {"enabled": true, "quantity": 1},
    "D_BuyButton":   {"enabled": true, "quantity": 1},
    "E_NewPromoPaid":{"enabled": true, "quantity": 1},
    "F_FreeTrial":   {"enabled": false,"quantity": 0},
    "G_SubscribeNow":{"enabled": false,"quantity": 0},
    "H_EmailList":   {"enabled": true, "quantity": 1},
    "I_EarlyAccess": {"enabled": false,"quantity": 0}
  }
}'),
(5, '{
  "A_Image":        {"enabled": true, "quantity": 4},
  "B_Button":       {"enabled": true, "quantity": 5},
  "C_Title":        {"enabled": true, "quantity": 3},
  "D_Description":  {"enabled": true, "quantity": 3},
  "E_Paragraph":    {"enabled": true, "quantity": 5},
  "F_BulletPoints": {"enabled": true, "quantity": 10},
  "G_MenuWithLinks":{"enabled": true, "quantity": 3},
  "H_HelperDiagram":{"enabled": true, "quantity": 2},
  "I_HelperImage":  {"enabled": true, "quantity": 3},
  "J_HelperVideo":  {"enabled": true, "quantity": 2},
  "SalesCategory": {
    "A_Testimonial": {"enabled": true, "quantity": 3},
    "B_ProductCard": {"enabled": true, "quantity": 4},
    "C_LeadForm":    {"enabled": true, "quantity": 1},
    "D_BuyButton":   {"enabled": true, "quantity": 2},
    "E_NewPromoPaid":{"enabled": true, "quantity": 2},
    "F_FreeTrial":   {"enabled": true, "quantity": 1},
    "G_SubscribeNow":{"enabled": true, "quantity": 1},
    "H_EmailList":   {"enabled": true, "quantity": 1},
    "I_EarlyAccess": {"enabled": true, "quantity": 1}
  }
}')
ON CONFLICT (level_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Content Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  entry_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger     TEXT,
  content     TEXT NOT NULL,
  category    TEXT,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.knowledge_base IS 'Knowledge base entries — seeded from SeedData.ts and lessons.ts.';

CREATE TABLE IF NOT EXISTS public.podcast_episodes (
  episode_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  description       TEXT,
  audio_url         TEXT,
  transcript_url    TEXT,
  cover_url         TEXT,
  published_at      TIMESTAMPTZ,
  duration_seconds  INTEGER,
  slug              TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.podcast_episodes IS 'Podcast library — seeded from podcastEpisodes.ts and library.json.';

CREATE TABLE IF NOT EXISTS public.referral_codes (
  code        TEXT PRIMARY KEY,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  uses_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.referral_codes IS 'Referral access codes — seeded from referralAccess.ts DEFAULT_REFERRAL_CODES.';

CREATE TABLE IF NOT EXISTS public.session_knowledge_inputs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id      UUID REFERENCES public.shell_sessions(id) ON DELETE SET NULL,
  declared_name   TEXT NOT NULL,
  source_class    TEXT NOT NULL DEFAULT 'operator_upload',
  content_summary TEXT,
  content_type    TEXT NOT NULL DEFAULT 'other',
  raw_text        TEXT NOT NULL,
  declared_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.session_knowledge_inputs IS 'Session-scoped operator_upload knowledge inputs (AMD-2026-015-ADD-001).';

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_intents_user_id ON public.intents(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_intent_id ON public.actions(intent_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_action_id ON public.outcomes(action_id);
CREATE INDEX IF NOT EXISTS idx_grounding_intent ON public.grounding_context(intent_id);
CREATE INDEX IF NOT EXISTS idx_grounding_user ON public.grounding_context(user_id);
CREATE INDEX IF NOT EXISTS idx_shell_menu_items_menu ON public.shell_menu_items(menu_id, level, sort_order);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_trigger ON public.knowledge_base(trigger);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_session_ki_user ON public.session_knowledge_inputs(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_shell_preferences_updated
  BEFORE UPDATE ON public.shell_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_user_plans_updated
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_knowledge_base_updated
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — admin boundary posture
-- `/admin` now requires a real Supabase Auth session with `app_metadata.is_admin = true`.
-- Browser code must use the project anon/publishable key so these policies are actually enforced.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, FALSE);
$$;

CREATE OR REPLACE FUNCTION public.admin_access_probe()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT private.is_admin();
$$;

GRANT EXECUTE ON FUNCTION public.admin_access_probe() TO anon, authenticated;

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shell_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shell_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tools_admin_all ON public.tools;
CREATE POLICY tools_admin_all
ON public.tools
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS shell_menus_public_read ON public.shell_menus;
CREATE POLICY shell_menus_public_read
ON public.shell_menus
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS shell_menus_admin_insert ON public.shell_menus;
CREATE POLICY shell_menus_admin_insert
ON public.shell_menus
FOR INSERT
TO authenticated
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS shell_menus_admin_update ON public.shell_menus;
CREATE POLICY shell_menus_admin_update
ON public.shell_menus
FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS shell_menus_admin_delete ON public.shell_menus;
CREATE POLICY shell_menus_admin_delete
ON public.shell_menus
FOR DELETE
TO authenticated
USING (private.is_admin());

DROP POLICY IF EXISTS shell_menu_items_public_read ON public.shell_menu_items;
CREATE POLICY shell_menu_items_public_read
ON public.shell_menu_items
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS shell_menu_items_admin_insert ON public.shell_menu_items;
CREATE POLICY shell_menu_items_admin_insert
ON public.shell_menu_items
FOR INSERT
TO authenticated
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS shell_menu_items_admin_update ON public.shell_menu_items;
CREATE POLICY shell_menu_items_admin_update
ON public.shell_menu_items
FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS shell_menu_items_admin_delete ON public.shell_menu_items;
CREATE POLICY shell_menu_items_admin_delete
ON public.shell_menu_items
FOR DELETE
TO authenticated
USING (private.is_admin());

DROP POLICY IF EXISTS knowledge_base_admin_all ON public.knowledge_base;
CREATE POLICY knowledge_base_admin_all
ON public.knowledge_base
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS referral_codes_admin_all ON public.referral_codes;
CREATE POLICY referral_codes_admin_all
ON public.referral_codes
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

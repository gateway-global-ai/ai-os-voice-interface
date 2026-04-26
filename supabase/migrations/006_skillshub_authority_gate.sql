-- Skillshub authority gate: tap discovery, allowed-tools metadata, and shell intent permission profiles.
-- Source: https://crates.io/crates/skillshub and https://github.com/EYH0602/skillshub

CREATE TABLE IF NOT EXISTS public.skillshub_protocols (
  protocol_id          TEXT PRIMARY KEY,
  source_id            TEXT REFERENCES public.external_skill_sources(source_id) ON DELETE SET NULL,
  tool_name            TEXT NOT NULL DEFAULT 'skillshub',
  crate_name           TEXT NOT NULL DEFAULT 'skillshub',
  crate_version        TEXT NOT NULL,
  crate_url            TEXT NOT NULL,
  docs_url             TEXT NOT NULL,
  repository_url       TEXT,
  install_command      TEXT NOT NULL,
  registry_path        TEXT NOT NULL DEFAULT '~/.skillshub/skills',
  database_path        TEXT NOT NULL DEFAULT '~/.skillshub/db.json',
  command_catalog      JSONB NOT NULL DEFAULT '[]'::jsonb,
  supported_agents     JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependency_catalog   JSONB NOT NULL DEFAULT '[]'::jsonb,
  skill_format_schema  JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status <> 'verified' OR no_mock_verified)
);

COMMENT ON TABLE public.skillshub_protocols IS 'Source-backed skillshub CLI protocol metadata for tap discovery, skill linking, agent detection, and allowed-tools authority metadata.';

CREATE TABLE IF NOT EXISTS public.skill_taps (
  tap_id               TEXT PRIMARY KEY,
  protocol_id          TEXT NOT NULL REFERENCES public.skillshub_protocols(protocol_id) ON DELETE CASCADE,
  source_id            TEXT REFERENCES public.external_skill_sources(source_id) ON DELETE SET NULL,
  tap_ref              TEXT NOT NULL,
  repository_url       TEXT NOT NULL,
  branch               TEXT,
  discovery_command    TEXT NOT NULL,
  install_command      TEXT,
  link_command         TEXT NOT NULL DEFAULT 'skillshub link',
  available_count      INTEGER,
  installed_count      INTEGER,
  tap_metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status  TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  deployment_status    TEXT NOT NULL DEFAULT 'available' CHECK (deployment_status IN ('available', 'linked', 'installed', 'blocked', 'unverified')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(protocol_id, tap_ref)
);

COMMENT ON TABLE public.skill_taps IS 'skillshub tap registry rows. Counts are null until real skillshub command evidence records discovery/install state.';

CREATE TABLE IF NOT EXISTS public.skill_allowed_tools (
  allowed_tool_id      TEXT PRIMARY KEY,
  protocol_id          TEXT NOT NULL REFERENCES public.skillshub_protocols(protocol_id) ON DELETE CASCADE,
  tap_id               TEXT REFERENCES public.skill_taps(tap_id) ON DELETE SET NULL,
  cursor_skill_id      TEXT REFERENCES public.cursor_skill_registry(cursor_skill_id) ON DELETE SET NULL,
  skill_source_ref     TEXT NOT NULL,
  skill_name           TEXT NOT NULL,
  allowed_tool         TEXT NOT NULL,
  tool_class           TEXT NOT NULL CHECK (tool_class IN ('read', 'write', 'execute', 'network', 'browser', 'database', 'shell', 'mcp', 'unknown')),
  authority_level      TEXT NOT NULL DEFAULT 'least_privilege' CHECK (authority_level IN ('read_only', 'least_privilege', 'developer', 'operator', 'blocked')),
  evidence_source      TEXT NOT NULL DEFAULT 'SKILL.md allowed-tools',
  verification_status  TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(protocol_id, skill_source_ref, allowed_tool)
);

COMMENT ON TABLE public.skill_allowed_tools IS 'Normalized SKILL.md allowed-tools metadata used by AI OS to limit tool authority during intent loops.';

CREATE TABLE IF NOT EXISTS public.intent_permission_profiles (
  profile_id                 TEXT PRIMARY KEY,
  shell_state                TEXT NOT NULL,
  role                       TEXT NOT NULL,
  scope                      TEXT NOT NULL,
  authority_level            TEXT NOT NULL CHECK (authority_level IN ('guest', 'primary', 'developer', 'operator', 'blocked')),
  desktop_sub_path           TEXT,
  allowed_skill_patterns     TEXT[] NOT NULL DEFAULT '{}',
  allowed_tool_classes       TEXT[] NOT NULL DEFAULT '{}',
  denied_tool_classes        TEXT[] NOT NULL DEFAULT '{}',
  system_prompt_requirements TEXT[] NOT NULL DEFAULT '{}',
  evidence_required          TEXT NOT NULL,
  verification_status        TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.intent_permission_profiles IS 'Role-journey shell state profiles mapping shell state to bounded skills, allowed tool classes, denied tool classes, and escalation evidence.';

CREATE TABLE IF NOT EXISTS public.skill_authority_evidence (
  evidence_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           TEXT REFERENCES public.intent_permission_profiles(profile_id) ON DELETE SET NULL,
  protocol_id          TEXT REFERENCES public.skillshub_protocols(protocol_id) ON DELETE SET NULL,
  tap_id               TEXT REFERENCES public.skill_taps(tap_id) ON DELETE SET NULL,
  cursor_skill_id      TEXT REFERENCES public.cursor_skill_registry(cursor_skill_id) ON DELETE SET NULL,
  owner_auth_id        UUID,
  intent_id            TEXT,
  requested_skill      TEXT,
  requested_tool       TEXT,
  decision             TEXT NOT NULL CHECK (decision IN ('allowed', 'denied', 'blocked', 'unverified')),
  reason               TEXT NOT NULL,
  command              TEXT,
  exit_code            INTEGER,
  output_summary       TEXT NOT NULL DEFAULT '',
  recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.skill_authority_evidence IS 'Real authorization and command evidence for skillshub-managed skill/tool authority decisions. Do not store secrets or full private logs.';

ALTER TABLE public.cursor_action_registry DROP CONSTRAINT IF EXISTS cursor_action_registry_action_type_check;
ALTER TABLE public.cursor_action_registry
  ADD CONSTRAINT cursor_action_registry_action_type_check
  CHECK (action_type IN (
    'install_skill',
    'install_phase',
    'run_review',
    'check_dependencies',
    'open_resource',
    'verify_install',
    'skills_init',
    'skills_list',
    'skills_push',
    'skills_validate',
    'skills_render',
    'skills_import',
    'skills_sync',
    'skillshub_install',
    'skillshub_tap_add',
    'skillshub_install_skill',
    'skillshub_link',
    'skillshub_agents',
    'skillshub_info',
    'skillshub_doctor',
    'skillshub_external_scan',
    'skillshub_search',
    'skillshub_update'
  ));

CREATE INDEX IF NOT EXISTS idx_skillshub_protocols_crate ON public.skillshub_protocols(crate_name, crate_version);
CREATE INDEX IF NOT EXISTS idx_skill_taps_protocol ON public.skill_taps(protocol_id, deployment_status);
CREATE INDEX IF NOT EXISTS idx_skill_allowed_tools_skill ON public.skill_allowed_tools(skill_source_ref, tool_class, authority_level);
CREATE INDEX IF NOT EXISTS idx_intent_permission_profiles_state ON public.intent_permission_profiles(shell_state, role, authority_level);
CREATE INDEX IF NOT EXISTS idx_skill_authority_evidence_profile ON public.skill_authority_evidence(profile_id, decision, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_authority_evidence_skill ON public.skill_authority_evidence(requested_skill, requested_tool, recorded_at DESC);

CREATE TRIGGER on_skillshub_protocols_updated BEFORE UPDATE ON public.skillshub_protocols FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_skill_taps_updated BEFORE UPDATE ON public.skill_taps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_skill_allowed_tools_updated BEFORE UPDATE ON public.skill_allowed_tools FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_intent_permission_profiles_updated BEFORE UPDATE ON public.intent_permission_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.skillshub_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_taps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_allowed_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_authority_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skillshub_protocols_public_read ON public.skillshub_protocols;
CREATE POLICY skillshub_protocols_public_read ON public.skillshub_protocols FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS skill_taps_public_read ON public.skill_taps;
CREATE POLICY skill_taps_public_read ON public.skill_taps FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS skill_allowed_tools_public_read ON public.skill_allowed_tools;
CREATE POLICY skill_allowed_tools_public_read ON public.skill_allowed_tools FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS intent_permission_profiles_public_read ON public.intent_permission_profiles;
CREATE POLICY intent_permission_profiles_public_read ON public.intent_permission_profiles FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS skillshub_protocols_admin_all ON public.skillshub_protocols;
CREATE POLICY skillshub_protocols_admin_all ON public.skillshub_protocols FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS skill_taps_admin_all ON public.skill_taps;
CREATE POLICY skill_taps_admin_all ON public.skill_taps FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS skill_allowed_tools_admin_all ON public.skill_allowed_tools;
CREATE POLICY skill_allowed_tools_admin_all ON public.skill_allowed_tools FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS intent_permission_profiles_admin_all ON public.intent_permission_profiles;
CREATE POLICY intent_permission_profiles_admin_all ON public.intent_permission_profiles FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS skill_authority_evidence_owner_read ON public.skill_authority_evidence;
CREATE POLICY skill_authority_evidence_owner_read ON public.skill_authority_evidence FOR SELECT TO authenticated USING (owner_auth_id IS NULL OR owner_auth_id = auth.uid());
DROP POLICY IF EXISTS skill_authority_evidence_admin_all ON public.skill_authority_evidence;
CREATE POLICY skill_authority_evidence_admin_all ON public.skill_authority_evidence FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

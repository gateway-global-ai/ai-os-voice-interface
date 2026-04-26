-- Native Rust skills CLI protocol for deploying and validating agent skills.
-- Source: https://crates.io/crates/skills and https://docs.rs/skills/latest/skills/

CREATE TABLE IF NOT EXISTS public.native_skill_protocols (
  protocol_id          TEXT PRIMARY KEY,
  tool_name            TEXT NOT NULL,
  crate_name           TEXT NOT NULL,
  crate_version        TEXT NOT NULL,
  crate_url            TEXT NOT NULL,
  docs_url             TEXT NOT NULL,
  repository_url       TEXT,
  config_path          TEXT NOT NULL,
  install_command      TEXT NOT NULL,
  init_command         TEXT NOT NULL,
  list_command         TEXT NOT NULL,
  push_command         TEXT NOT NULL,
  validate_command     TEXT NOT NULL,
  render_command       TEXT NOT NULL,
  supported_tools      JSONB NOT NULL DEFAULT '[]'::jsonb,
  command_catalog      JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependency_catalog   JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status <> 'verified' OR no_mock_verified)
);

COMMENT ON TABLE public.native_skill_protocols IS 'Native tool protocols used to install, validate, list, and push skills into coding agents. The Rust skills CLI is the source of truth for deployed skill state.';

CREATE TABLE IF NOT EXISTS public.native_skill_deployment_evidence (
  evidence_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id          TEXT NOT NULL REFERENCES public.native_skill_protocols(protocol_id) ON DELETE CASCADE,
  cursor_skill_id      TEXT REFERENCES public.cursor_skill_registry(cursor_skill_id) ON DELETE SET NULL,
  action_id            TEXT REFERENCES public.cursor_action_registry(cursor_action_id) ON DELETE SET NULL,
  owner_auth_id        UUID,
  target_project_path  TEXT,
  command              TEXT NOT NULL,
  exit_code            INTEGER,
  output_summary       TEXT NOT NULL DEFAULT '',
  evidence_status      TEXT NOT NULL DEFAULT 'unverified' CHECK (evidence_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  recorded_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.native_skill_deployment_evidence IS 'Real command evidence for native skills CLI operations. Avoid storing secrets or full local logs.';

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
    'skills_sync'
  ));

CREATE INDEX IF NOT EXISTS idx_native_skill_protocols_crate ON public.native_skill_protocols(crate_name, crate_version);
CREATE INDEX IF NOT EXISTS idx_native_skill_evidence_protocol ON public.native_skill_deployment_evidence(protocol_id, evidence_status, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_native_skill_evidence_cursor_skill ON public.native_skill_deployment_evidence(cursor_skill_id, recorded_at DESC);

CREATE TRIGGER on_native_skill_protocols_updated BEFORE UPDATE ON public.native_skill_protocols FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.native_skill_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_skill_deployment_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS native_skill_protocols_public_read ON public.native_skill_protocols;
CREATE POLICY native_skill_protocols_public_read ON public.native_skill_protocols FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS native_skill_protocols_admin_all ON public.native_skill_protocols;
CREATE POLICY native_skill_protocols_admin_all ON public.native_skill_protocols FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS native_skill_deployment_evidence_owner_read ON public.native_skill_deployment_evidence;
CREATE POLICY native_skill_deployment_evidence_owner_read ON public.native_skill_deployment_evidence FOR SELECT TO authenticated USING (owner_auth_id IS NULL OR owner_auth_id = auth.uid());

DROP POLICY IF EXISTS native_skill_deployment_evidence_admin_all ON public.native_skill_deployment_evidence;
CREATE POLICY native_skill_deployment_evidence_admin_all ON public.native_skill_deployment_evidence FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

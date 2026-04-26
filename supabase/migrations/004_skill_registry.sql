-- AI OS Skill Registry — external proven skill/rule libraries and deployable Cursor capability catalog.
-- Source-backed registry only. Deployment requires separate real install evidence.

CREATE TABLE IF NOT EXISTS public.external_skill_sources (
  source_id             TEXT PRIMARY KEY,
  source_name           TEXT NOT NULL,
  source_url            TEXT NOT NULL,
  repository_url        TEXT,
  skill_manifest_url    TEXT,
  license               TEXT,
  description           TEXT NOT NULL,
  install_command       TEXT,
  manual_install        JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status   TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status <> 'verified' OR no_mock_verified)
);

COMMENT ON TABLE public.external_skill_sources IS 'External source-backed skill/rule repositories that AI OS can search and deploy from. Does not imply install success.';

CREATE TABLE IF NOT EXISTS public.external_skill_categories (
  category_id           TEXT PRIMARY KEY,
  source_id             TEXT NOT NULL REFERENCES public.external_skill_sources(source_id) ON DELETE CASCADE,
  priority              INTEGER NOT NULL,
  phase                 INTEGER NOT NULL,
  category_name         TEXT NOT NULL,
  impact                TEXT NOT NULL,
  prefix                TEXT NOT NULL,
  expected_rule_count   INTEGER NOT NULL,
  summary               TEXT NOT NULL DEFAULT '',
  deployment_guidance   TEXT NOT NULL DEFAULT '',
  verification_status   TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, priority),
  UNIQUE(source_id, prefix)
);

COMMENT ON TABLE public.external_skill_categories IS 'Ordered categories from source skill manifests. Phase preserves recommended sequential deployment order.';

CREATE TABLE IF NOT EXISTS public.external_skill_rules (
  rule_id               TEXT PRIMARY KEY,
  source_id             TEXT NOT NULL REFERENCES public.external_skill_sources(source_id) ON DELETE CASCADE,
  category_id           TEXT NOT NULL REFERENCES public.external_skill_categories(category_id) ON DELETE CASCADE,
  rule_slug             TEXT NOT NULL,
  title                 TEXT NOT NULL,
  summary               TEXT NOT NULL,
  rule_path             TEXT NOT NULL,
  source_url            TEXT NOT NULL,
  raw_url               TEXT NOT NULL,
  source_sha            TEXT,
  source_size_bytes     INTEGER,
  priority              INTEGER NOT NULL,
  phase                 INTEGER NOT NULL,
  deployment_status     TEXT NOT NULL DEFAULT 'available' CHECK (deployment_status IN ('available', 'queued', 'installed', 'blocked', 'unverified')),
  verification_status   TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  dependency_hints      TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, rule_slug)
);

COMMENT ON TABLE public.external_skill_rules IS 'Searchable source-backed individual skill/rule records. Installation status is tracked separately from availability.';

CREATE TABLE IF NOT EXISTS public.skill_dependency_requirements (
  dependency_id         TEXT PRIMARY KEY,
  source_id             TEXT NOT NULL REFERENCES public.external_skill_sources(source_id) ON DELETE CASCADE,
  rule_id               TEXT REFERENCES public.external_skill_rules(rule_id) ON DELETE CASCADE,
  category_id           TEXT REFERENCES public.external_skill_categories(category_id) ON DELETE CASCADE,
  dependency_name       TEXT NOT NULL,
  dependency_type       TEXT NOT NULL CHECK (dependency_type IN ('cargo_crate', 'cargo_tool', 'runtime', 'ci_tool', 'editor_feature', 'unknown')),
  required_for          TEXT NOT NULL,
  verification_command  TEXT,
  verification_status   TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.skill_dependency_requirements IS 'Dependency hints that must be checked before deploying or applying a skill/rule.';

CREATE TABLE IF NOT EXISTS public.skill_deployment_phases (
  phase_id              TEXT PRIMARY KEY,
  source_id             TEXT NOT NULL REFERENCES public.external_skill_sources(source_id) ON DELETE CASCADE,
  phase                 INTEGER NOT NULL,
  title                 TEXT NOT NULL,
  category_ids          TEXT[] NOT NULL DEFAULT '{}',
  rule_count            INTEGER NOT NULL DEFAULT 0,
  purpose               TEXT NOT NULL,
  prerequisite_phase    INTEGER,
  deployment_status     TEXT NOT NULL DEFAULT 'available' CHECK (deployment_status IN ('available', 'queued', 'installed', 'blocked', 'unverified')),
  verification_status   TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, phase)
);

COMMENT ON TABLE public.skill_deployment_phases IS 'Sequential deploy phases for proven skill libraries. Prevents random unordered deployment.';

CREATE TABLE IF NOT EXISTS public.cursor_skill_registry (
  cursor_skill_id       TEXT PRIMARY KEY,
  source_id             TEXT REFERENCES public.external_skill_sources(source_id) ON DELETE SET NULL,
  source_category_id    TEXT REFERENCES public.external_skill_categories(category_id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  description           TEXT NOT NULL,
  install_mode          TEXT NOT NULL DEFAULT 'reference' CHECK (install_mode IN ('reference', 'copy', 'clone', 'plugin', 'command')),
  install_target        TEXT NOT NULL DEFAULT '.cursor/skills',
  install_command       TEXT,
  required_dependencies TEXT[] NOT NULL DEFAULT '{}',
  deployment_phase      INTEGER,
  deployment_status     TEXT NOT NULL DEFAULT 'available' CHECK (deployment_status IN ('available', 'queued', 'installed', 'blocked', 'unverified')),
  verification_status   TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cursor_skill_registry IS 'Cursor-installable skills or skill groups derived from internal or external sources.';

CREATE TABLE IF NOT EXISTS public.cursor_action_registry (
  cursor_action_id      TEXT PRIMARY KEY,
  source_id             TEXT REFERENCES public.external_skill_sources(source_id) ON DELETE CASCADE,
  cursor_skill_id       TEXT REFERENCES public.cursor_skill_registry(cursor_skill_id) ON DELETE SET NULL,
  action_name           TEXT NOT NULL,
  action_type           TEXT NOT NULL CHECK (action_type IN ('install_skill', 'install_phase', 'run_review', 'check_dependencies', 'open_resource', 'verify_install')),
  shell_action_id       TEXT,
  command_template      TEXT NOT NULL DEFAULT '',
  required_inputs       TEXT[] NOT NULL DEFAULT '{}',
  required_dependencies TEXT[] NOT NULL DEFAULT '{}',
  output_contract       TEXT NOT NULL,
  verification_status   TEXT NOT NULL DEFAULT 'review_pending' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cursor_action_registry IS 'Programmatic Cursor actions the AI OS shell or voice agent can offer after dependency checks.';

CREATE INDEX IF NOT EXISTS idx_external_skill_rules_source_phase ON public.external_skill_rules(source_id, phase, priority);
CREATE INDEX IF NOT EXISTS idx_external_skill_rules_category ON public.external_skill_rules(category_id, priority);
CREATE INDEX IF NOT EXISTS idx_external_skill_rules_summary ON public.external_skill_rules USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));
CREATE INDEX IF NOT EXISTS idx_skill_dependency_rule ON public.skill_dependency_requirements(rule_id, dependency_type);
CREATE INDEX IF NOT EXISTS idx_cursor_skill_registry_phase ON public.cursor_skill_registry(source_id, deployment_phase, deployment_status);
CREATE INDEX IF NOT EXISTS idx_cursor_action_registry_skill ON public.cursor_action_registry(source_id, cursor_skill_id, action_type);

CREATE TRIGGER on_external_skill_sources_updated BEFORE UPDATE ON public.external_skill_sources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_external_skill_categories_updated BEFORE UPDATE ON public.external_skill_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_external_skill_rules_updated BEFORE UPDATE ON public.external_skill_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_skill_dependency_requirements_updated BEFORE UPDATE ON public.skill_dependency_requirements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_skill_deployment_phases_updated BEFORE UPDATE ON public.skill_deployment_phases FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_cursor_skill_registry_updated BEFORE UPDATE ON public.cursor_skill_registry FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_cursor_action_registry_updated BEFORE UPDATE ON public.cursor_action_registry FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.external_skill_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_skill_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_dependency_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_deployment_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursor_skill_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursor_action_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS external_skill_sources_public_read ON public.external_skill_sources;
CREATE POLICY external_skill_sources_public_read ON public.external_skill_sources FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS external_skill_categories_public_read ON public.external_skill_categories;
CREATE POLICY external_skill_categories_public_read ON public.external_skill_categories FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS external_skill_rules_public_read ON public.external_skill_rules;
CREATE POLICY external_skill_rules_public_read ON public.external_skill_rules FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS skill_dependency_requirements_public_read ON public.skill_dependency_requirements;
CREATE POLICY skill_dependency_requirements_public_read ON public.skill_dependency_requirements FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS skill_deployment_phases_public_read ON public.skill_deployment_phases;
CREATE POLICY skill_deployment_phases_public_read ON public.skill_deployment_phases FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cursor_skill_registry_public_read ON public.cursor_skill_registry;
CREATE POLICY cursor_skill_registry_public_read ON public.cursor_skill_registry FOR SELECT TO anon, authenticated USING (TRUE);
DROP POLICY IF EXISTS cursor_action_registry_public_read ON public.cursor_action_registry;
CREATE POLICY cursor_action_registry_public_read ON public.cursor_action_registry FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS external_skill_sources_admin_all ON public.external_skill_sources;
CREATE POLICY external_skill_sources_admin_all ON public.external_skill_sources FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS external_skill_categories_admin_all ON public.external_skill_categories;
CREATE POLICY external_skill_categories_admin_all ON public.external_skill_categories FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS external_skill_rules_admin_all ON public.external_skill_rules;
CREATE POLICY external_skill_rules_admin_all ON public.external_skill_rules FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS skill_dependency_requirements_admin_all ON public.skill_dependency_requirements;
CREATE POLICY skill_dependency_requirements_admin_all ON public.skill_dependency_requirements FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS skill_deployment_phases_admin_all ON public.skill_deployment_phases;
CREATE POLICY skill_deployment_phases_admin_all ON public.skill_deployment_phases FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS cursor_skill_registry_admin_all ON public.cursor_skill_registry;
CREATE POLICY cursor_skill_registry_admin_all ON public.cursor_skill_registry FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
DROP POLICY IF EXISTS cursor_action_registry_admin_all ON public.cursor_action_registry;
CREATE POLICY cursor_action_registry_admin_all ON public.cursor_action_registry FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

-- Vibe Coding University — MCP curriculum, agent skills, and project/task state.
-- This migration is intentionally source-backed: rows seeded later must stay
-- draft/review until real install, test, and triangulation evidence exists.

CREATE TABLE IF NOT EXISTS public.university_courses (
  course_id       TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  level           TEXT NOT NULL CHECK (level IN ('foundation', 'intermediate', 'advanced', 'final_project')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'blocked', 'unverified')),
  final_project   BOOLEAN NOT NULL DEFAULT FALSE,
  docs_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.university_courses IS 'Source-backed Vibe Coding University courses. Public rows may be review-only; published requires evidence.';

CREATE TABLE IF NOT EXISTS public.university_lessons (
  lesson_id             TEXT PRIMARY KEY,
  course_id             TEXT NOT NULL REFERENCES public.university_courses(course_id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  summary               TEXT NOT NULL,
  docs_url              TEXT NOT NULL,
  docs_urls             TEXT[] NOT NULL DEFAULT '{}',
  learning_outcomes     TEXT[] NOT NULL DEFAULT '{}',
  prerequisites         TEXT[] NOT NULL DEFAULT '{}',
  install_steps         JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_steps            JSONB NOT NULL DEFAULT '[]'::jsonb,
  example_project       JSONB NOT NULL DEFAULT '{}'::jsonb,
  aptitude_test         JSONB NOT NULL DEFAULT '{}'::jsonb,
  multimodal_assets     JSONB NOT NULL DEFAULT '{}'::jsonb,
  cursor_rule_path      TEXT NOT NULL,
  cursor_skill_path     TEXT NOT NULL,
  agent_prompt_path     TEXT NOT NULL,
  verification_status   TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  install_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  test_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  triangulation_status  TEXT NOT NULL DEFAULT 'not_started' CHECK (triangulation_status IN ('not_started', 'round_1', 'revision', 'round_2', 'passed', 'blocked')),
  no_mock_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  publish_status        TEXT NOT NULL DEFAULT 'draft' CHECK (publish_status IN ('draft', 'review', 'published', 'blocked', 'unverified')),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (publish_status <> 'published' OR (verification_status = 'verified' AND install_verified AND test_verified AND triangulation_status = 'passed' AND no_mock_verified))
);

COMMENT ON TABLE public.university_lessons IS 'Canonical VCU lesson records. The CHECK constraint blocks publishing without real evidence.';

CREATE TABLE IF NOT EXISTS public.university_lesson_artifacts (
  artifact_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id       TEXT NOT NULL REFERENCES public.university_lessons(lesson_id) ON DELETE CASCADE,
  artifact_type   TEXT NOT NULL CHECK (artifact_type IN ('docs', 'cursor_rule', 'cursor_skill', 'agent_prompt', 'video', 'transcript', 'visual_aid', 'install_log', 'test_log', 'triangulation_review', 'supabase_payload')),
  title           TEXT NOT NULL,
  uri             TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  evidence        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.university_lesson_artifacts IS 'First-class evidence and artifact links for each VCU lesson.';

CREATE TABLE IF NOT EXISTS public.vcu_behavior_artifacts (
  artifact_id          TEXT PRIMARY KEY,
  artifact_scope       TEXT NOT NULL DEFAULT 'global' CHECK (artifact_scope IN ('global', 'lesson_target')),
  artifact_type        TEXT NOT NULL CHECK (artifact_type IN ('cursor_rule', 'cursor_skill', 'agent_prompt', 'docs_registry', 'schema', 'seed_importer')),
  title                TEXT NOT NULL,
  uri                  TEXT NOT NULL,
  description          TEXT NOT NULL,
  docs_urls            TEXT[] NOT NULL DEFAULT '{}',
  lesson_bindings      TEXT[] NOT NULL DEFAULT '{}',
  content_hash         TEXT,
  file_exists          BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_status       TEXT NOT NULL DEFAULT 'unverified' CHECK (no_mock_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  reviewer_notes       TEXT NOT NULL DEFAULT '',
  usage_constraints    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (verification_status <> 'verified' OR (file_exists AND content_hash IS NOT NULL AND no_mock_status = 'verified'))
);

COMMENT ON TABLE public.vcu_behavior_artifacts IS 'Global VCU Cursor rules, skills, prompts, docs registries, schemas, and seed/importer references with hashes and no-mock review state. Does not store private prompt contents or secrets.';

CREATE TABLE IF NOT EXISTS public.agent_skills (
  agent_skill_id       TEXT PRIMARY KEY,
  skill_id             UUID REFERENCES public.skills(skill_id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  description          TEXT NOT NULL,
  trigger_terms        TEXT[] NOT NULL DEFAULT '{}',
  docs_urls            TEXT[] NOT NULL DEFAULT '{}',
  cursor_rule_paths    TEXT[] NOT NULL DEFAULT '{}',
  cursor_skill_path    TEXT NOT NULL,
  agent_prompt_path    TEXT NOT NULL,
  tool_ids             TEXT[] NOT NULL DEFAULT '{}',
  resource_refs        JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  no_mock_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agent_skills IS 'Durable VCU agent skills with docs, tools, resources, and no-mock verification state.';

CREATE TABLE IF NOT EXISTS public.mcp_sdk_registry (
  registry_id          TEXT PRIMARY KEY,
  source_name          TEXT NOT NULL,
  source_url           TEXT NOT NULL,
  sdk_language         TEXT,
  protocol_version     TEXT,
  capability_type      TEXT NOT NULL CHECK (capability_type IN ('tool', 'resource', 'prompt', 'client', 'server', 'app', 'schema', 'bridge', 'ui')),
  capability_name      TEXT NOT NULL,
  schema_ref           TEXT,
  docs_summary         TEXT NOT NULL,
  verification_status  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'review_pending', 'blocked', 'unverified')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mcp_sdk_registry IS 'Source registry for MCP SDK tools, resources, prompts, apps, clients, servers, and schema capabilities.';

CREATE TABLE IF NOT EXISTS public.projects (
  project_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_auth_id   UUID DEFAULT auth.uid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  source_lesson_id TEXT REFERENCES public.university_lessons(lesson_id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'blocked', 'completed', 'archived')),
  acceptance_gate JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.projects IS 'Gemini Voice AI project state for assigning work to coding agents.';

CREATE TABLE IF NOT EXISTS public.project_tasks (
  task_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES public.projects(project_id) ON DELETE CASCADE,
  assigned_agent       TEXT NOT NULL DEFAULT 'rust-coding-agent',
  source_lesson_id     TEXT REFERENCES public.university_lessons(lesson_id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  instructions         TEXT NOT NULL,
  docs_urls            TEXT[] NOT NULL DEFAULT '{}',
  tool_refs            JSONB NOT NULL DEFAULT '[]'::jsonb,
  resource_refs        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status               TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'blocked', 'review', 'completed', 'rejected')),
  no_mock_required     BOOLEAN NOT NULL DEFAULT TRUE,
  no_mock_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  evidence             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status <> 'completed' OR no_mock_verified)
);

COMMENT ON TABLE public.project_tasks IS 'Real coding-agent tasks with source docs, tools/resources, evidence, and no-mock completion gate.';

CREATE INDEX IF NOT EXISTS idx_university_lessons_course ON public.university_lessons(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_university_lessons_publish ON public.university_lessons(publish_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_university_artifacts_lesson ON public.university_lesson_artifacts(lesson_id, artifact_type);
CREATE INDEX IF NOT EXISTS idx_vcu_behavior_artifacts_scope ON public.vcu_behavior_artifacts(artifact_scope, artifact_type, verification_status);
CREATE INDEX IF NOT EXISTS idx_agent_skills_enabled ON public.agent_skills(enabled, verification_status);
CREATE INDEX IF NOT EXISTS idx_mcp_sdk_registry_capability ON public.mcp_sdk_registry(capability_type, capability_name);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_auth_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id, status, updated_at);

CREATE TRIGGER on_university_courses_updated
  BEFORE UPDATE ON public.university_courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_university_lessons_updated
  BEFORE UPDATE ON public.university_lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_agent_skills_updated
  BEFORE UPDATE ON public.agent_skills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_vcu_behavior_artifacts_updated
  BEFORE UPDATE ON public.vcu_behavior_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_mcp_sdk_registry_updated
  BEFORE UPDATE ON public.mcp_sdk_registry
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_project_tasks_updated
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.university_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_lesson_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vcu_behavior_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_sdk_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS university_courses_public_read ON public.university_courses;
CREATE POLICY university_courses_public_read
ON public.university_courses
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS university_lessons_public_read ON public.university_lessons;
CREATE POLICY university_lessons_public_read
ON public.university_lessons
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS university_lesson_artifacts_public_read ON public.university_lesson_artifacts;
CREATE POLICY university_lesson_artifacts_public_read
ON public.university_lesson_artifacts
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS vcu_behavior_artifacts_public_read ON public.vcu_behavior_artifacts;
CREATE POLICY vcu_behavior_artifacts_public_read
ON public.vcu_behavior_artifacts
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS agent_skills_public_read ON public.agent_skills;
CREATE POLICY agent_skills_public_read
ON public.agent_skills
FOR SELECT
TO anon, authenticated
USING (enabled = TRUE);

DROP POLICY IF EXISTS mcp_sdk_registry_public_read ON public.mcp_sdk_registry;
CREATE POLICY mcp_sdk_registry_public_read
ON public.mcp_sdk_registry
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS projects_owner_all ON public.projects;
CREATE POLICY projects_owner_all
ON public.projects
FOR ALL
TO authenticated
USING (owner_auth_id = auth.uid() OR private.is_admin())
WITH CHECK (owner_auth_id = auth.uid() OR private.is_admin());

DROP POLICY IF EXISTS project_tasks_owner_all ON public.project_tasks;
CREATE POLICY project_tasks_owner_all
ON public.project_tasks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.project_id = project_tasks.project_id
      AND (p.owner_auth_id = auth.uid() OR private.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.project_id = project_tasks.project_id
      AND (p.owner_auth_id = auth.uid() OR private.is_admin())
  )
);

DROP POLICY IF EXISTS university_courses_admin_all ON public.university_courses;
CREATE POLICY university_courses_admin_all ON public.university_courses FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS university_lessons_admin_all ON public.university_lessons;
CREATE POLICY university_lessons_admin_all ON public.university_lessons FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS university_lesson_artifacts_admin_all ON public.university_lesson_artifacts;
CREATE POLICY university_lesson_artifacts_admin_all ON public.university_lesson_artifacts FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS vcu_behavior_artifacts_admin_all ON public.vcu_behavior_artifacts;
CREATE POLICY vcu_behavior_artifacts_admin_all ON public.vcu_behavior_artifacts FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS agent_skills_admin_all ON public.agent_skills;
CREATE POLICY agent_skills_admin_all ON public.agent_skills FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS mcp_sdk_registry_admin_all ON public.mcp_sdk_registry;
CREATE POLICY mcp_sdk_registry_admin_all ON public.mcp_sdk_registry FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

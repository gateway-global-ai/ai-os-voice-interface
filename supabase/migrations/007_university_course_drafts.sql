-- Course Creator — source-backed draft assembly for VCU (book, audio, voice, assets, capstone).
-- RLS: admin only. Publishes into canonical `university_courses` / `university_lessons` via review pipeline.

CREATE TABLE IF NOT EXISTS public.university_course_drafts (
  draft_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_slug          TEXT NOT NULL DEFAULT 'vibe-coding-university'
    REFERENCES public.university_programs(program_slug) ON DELETE RESTRICT,
  working_title         TEXT NOT NULL DEFAULT '',
  knowledge_text        TEXT NOT NULL DEFAULT '',
  guidance              JSONB NOT NULL DEFAULT '{}'::jsonb,
  blueprint             JSONB NOT NULL DEFAULT '{}'::jsonb,
  professor_user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  linked_course_id      TEXT REFERENCES public.university_courses(course_id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'archived')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.university_course_drafts IS
  'Operator-assembled VCU course drafts. Upload knowledge + blueprint; promote to `university_courses` only after no-mock review.';

CREATE INDEX IF NOT EXISTS idx_university_course_drafts_program
  ON public.university_course_drafts (program_slug);

CREATE INDEX IF NOT EXISTS idx_university_course_drafts_status
  ON public.university_course_drafts (status, updated_at DESC);

CREATE TRIGGER on_university_course_drafts_updated
  BEFORE UPDATE ON public.university_course_drafts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.university_course_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS university_course_drafts_admin_all ON public.university_course_drafts;
CREATE POLICY university_course_drafts_admin_all
  ON public.university_course_drafts
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { aiOsSupabase, supabase } from '../../lib/supabaseClient';
import type { Database } from '../../lib/supabaseTypes';

type CourseRow = Database['public']['Tables']['university_courses']['Row'];
type LessonRow = Database['public']['Tables']['university_lessons']['Row'];
type ProgramRow = Database['public']['Tables']['university_programs']['Row'];
type EnrollmentRow = Database['public']['Tables']['university_enrollments']['Row'];
type SubscriptionRow = Database['public']['Tables']['stripe_subscriptions']['Row'];
type SkillSourceRow = Database['public']['Tables']['external_skill_sources']['Row'];
type SkillCategoryRow = Database['public']['Tables']['external_skill_categories']['Row'];
type SkillRuleRow = Database['public']['Tables']['external_skill_rules']['Row'];
type SkillPhaseRow = Database['public']['Tables']['skill_deployment_phases']['Row'];
type CursorSkillRow = Database['public']['Tables']['cursor_skill_registry']['Row'];
type NativeSkillProtocolRow = Database['public']['Tables']['native_skill_protocols']['Row'];
type SkillshubProtocolRow = Database['public']['Tables']['skillshub_protocols']['Row'];
type SkillTapRow = Database['public']['Tables']['skill_taps']['Row'];
type SkillAllowedToolRow = Database['public']['Tables']['skill_allowed_tools']['Row'];
type IntentPermissionProfileRow = Database['public']['Tables']['intent_permission_profiles']['Row'];

export type VcuUniversityView = 'intro' | 'coursework' | 'lab' | 'cursor' | 'skills' | 'access';

interface LessonViewModel extends LessonRow {
  courseTitle: string;
}

type AccessState = {
  program: ProgramRow | null;
  enrollment: EnrollmentRow | null;
  subscription: SubscriptionRow | null;
  userId: string | null;
  loading: boolean;
  error: string | null;
};

const VCU_PROGRAM_SLUG = 'vibe-coding-university';
const CURSOR_PLUGIN_PACKAGE_PATH = 'docs/vcu/cursor-plugin/vcu-lesson-support';

const VIEW_LABELS: Record<VcuUniversityView, string> = {
  intro: 'Introduction',
  coursework: 'Coursework',
  lab: 'Vibe Code Lab',
  cursor: 'Cursor Instructions',
  skills: 'Skill Registry',
  access: 'Registration and Payment',
};

function asTextList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        border: '1px solid var(--panel-border)',
        borderRadius: '999px',
        color: 'var(--panel-text-muted)',
        fontSize: '0.72rem',
        padding: '0.12rem 0.5rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
  );
}

function PanelCard({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid var(--panel-border)',
        borderRadius: '0.75rem',
        background: 'var(--panel-bg)',
        padding: '1rem',
      }}
    >
      {children}
    </section>
  );
}

function panelButtonStyle(active = false): CSSProperties {
  return {
    background: active ? 'var(--panel-bg-hover)' : 'var(--panel-surface)',
    border: `1px solid ${active ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
    borderRadius: '0.6rem',
    color: 'var(--panel-text)',
    cursor: 'pointer',
    padding: '0.65rem',
    textAlign: 'left',
  };
}

function hasActiveAccess(access: AccessState): boolean {
  if (access.enrollment?.access_status === 'active') return true;
  return access.subscription?.status === 'active' || access.subscription?.status === 'trialing';
}

export function VibeCodingUniversityPanel({ initialView = 'intro' }: { initialView?: VcuUniversityView }) {
  const [activeView, setActiveView] = useState<VcuUniversityView>(initialView);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillSources, setSkillSources] = useState<SkillSourceRow[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategoryRow[]>([]);
  const [skillRules, setSkillRules] = useState<SkillRuleRow[]>([]);
  const [skillPhases, setSkillPhases] = useState<SkillPhaseRow[]>([]);
  const [cursorSkills, setCursorSkills] = useState<CursorSkillRow[]>([]);
  const [nativeSkillProtocols, setNativeSkillProtocols] = useState<NativeSkillProtocolRow[]>([]);
  const [skillshubProtocols, setSkillshubProtocols] = useState<SkillshubProtocolRow[]>([]);
  const [skillTaps, setSkillTaps] = useState<SkillTapRow[]>([]);
  const [skillAllowedTools, setSkillAllowedTools] = useState<SkillAllowedToolRow[]>([]);
  const [intentPermissionProfiles, setIntentPermissionProfiles] = useState<IntentPermissionProfileRow[]>([]);
  const [selectedSkillCategoryId, setSelectedSkillCategoryId] = useState<string | null>(null);
  const [skillRegistryLoading, setSkillRegistryLoading] = useState(false);
  const [skillRegistryError, setSkillRegistryError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [access, setAccess] = useState<AccessState>({
    program: null,
    enrollment: null,
    subscription: null,
    userId: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const loadUniversity = useCallback(async () => {
    if (!aiOsSupabase) {
      setError('Supabase is not configured. VCU lessons require real database rows; no mock lessons are shown.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [courseResult, lessonResult] = await Promise.all([
        aiOsSupabase.from('university_courses').select('*').order('sort_order'),
        aiOsSupabase.from('university_lessons').select('*').order('sort_order'),
      ]);

      if (courseResult.error) throw courseResult.error;
      if (lessonResult.error) throw lessonResult.error;

      const nextCourses = (courseResult.data ?? []) as CourseRow[];
      const nextLessons = (lessonResult.data ?? []) as LessonRow[];
      setCourses(nextCourses);
      setLessons(nextLessons);
      setSelectedLessonId((current) => current ?? nextLessons[0]?.lesson_id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAccess = useCallback(async () => {
    if (!aiOsSupabase) {
      setAccess((current) => ({
        ...current,
        loading: false,
        error: 'Supabase is not configured. Registration and payment state is unverified.',
      }));
      return;
    }

    setAccess((current) => ({ ...current, loading: true, error: null }));
    try {
      const userResult = supabase
        ? await supabase.auth.getUser()
        : { data: { user: null }, error: null };
      const userId = userResult.data.user?.id ?? null;
      const programResult = await aiOsSupabase
        .from('university_programs')
        .select('*')
        .eq('program_slug', VCU_PROGRAM_SLUG)
        .maybeSingle();

      if (programResult.error) throw programResult.error;

      if (!userId) {
        setAccess({
          program: (programResult.data ?? null) as ProgramRow | null,
          enrollment: null,
          subscription: null,
          userId: null,
          loading: false,
          error: 'No Supabase Auth user is active. Verify/sign in before Stripe checkout can create paid access.',
        });
        return;
      }

      const [enrollmentResult, subscriptionResult] = await Promise.all([
        aiOsSupabase
          .from('university_enrollments')
          .select('*')
          .eq('owner_auth_id', userId)
          .eq('program_slug', VCU_PROGRAM_SLUG)
          .maybeSingle(),
        aiOsSupabase
          .from('stripe_subscriptions')
          .select('*')
          .eq('owner_auth_id', userId)
          .eq('program_slug', VCU_PROGRAM_SLUG)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (enrollmentResult.error) throw enrollmentResult.error;
      if (subscriptionResult.error) throw subscriptionResult.error;

      setAccess({
        program: (programResult.data ?? null) as ProgramRow | null,
        enrollment: (enrollmentResult.data ?? null) as EnrollmentRow | null,
        subscription: (subscriptionResult.data ?? null) as SubscriptionRow | null,
        userId,
        loading: false,
        error: null,
      });
    } catch (cause) {
      setAccess((current) => ({
        ...current,
        loading: false,
        error: cause instanceof Error ? cause.message : String(cause),
      }));
    }
  }, []);

  const loadSkillRegistry = useCallback(async () => {
    if (!aiOsSupabase) {
      setSkillRegistryError('Supabase is not configured. Skill registry rows require the real AI OS data project.');
      return;
    }

    setSkillRegistryLoading(true);
    setSkillRegistryError(null);
    try {
      const [
        sourceResult,
        categoryResult,
        ruleResult,
        phaseResult,
        cursorSkillResult,
        nativeProtocolResult,
        skillshubProtocolResult,
        tapResult,
        allowedToolResult,
        permissionProfileResult,
      ] = await Promise.all([
        aiOsSupabase.from('external_skill_sources').select('*').order('source_name'),
        aiOsSupabase.from('external_skill_categories').select('*').order('priority'),
        aiOsSupabase.from('external_skill_rules').select('*').order('phase').order('priority'),
        aiOsSupabase.from('skill_deployment_phases').select('*').order('phase'),
        aiOsSupabase.from('cursor_skill_registry').select('*').order('deployment_phase'),
        aiOsSupabase.from('native_skill_protocols').select('*').order('tool_name'),
        aiOsSupabase.from('skillshub_protocols').select('*').order('tool_name'),
        aiOsSupabase.from('skill_taps').select('*').order('tap_ref'),
        aiOsSupabase.from('skill_allowed_tools').select('*').order('skill_name'),
        aiOsSupabase.from('intent_permission_profiles').select('*').order('profile_id'),
      ]);

      if (sourceResult.error) throw sourceResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (ruleResult.error) throw ruleResult.error;
      if (phaseResult.error) throw phaseResult.error;
      if (cursorSkillResult.error) throw cursorSkillResult.error;
      if (nativeProtocolResult.error) throw nativeProtocolResult.error;
      if (skillshubProtocolResult.error) throw skillshubProtocolResult.error;
      if (tapResult.error) throw tapResult.error;
      if (allowedToolResult.error) throw allowedToolResult.error;
      if (permissionProfileResult.error) throw permissionProfileResult.error;

      const nextCategories = (categoryResult.data ?? []) as SkillCategoryRow[];
      setSkillSources((sourceResult.data ?? []) as SkillSourceRow[]);
      setSkillCategories(nextCategories);
      setSkillRules((ruleResult.data ?? []) as SkillRuleRow[]);
      setSkillPhases((phaseResult.data ?? []) as SkillPhaseRow[]);
      setCursorSkills((cursorSkillResult.data ?? []) as CursorSkillRow[]);
      setNativeSkillProtocols((nativeProtocolResult.data ?? []) as NativeSkillProtocolRow[]);
      setSkillshubProtocols((skillshubProtocolResult.data ?? []) as SkillshubProtocolRow[]);
      setSkillTaps((tapResult.data ?? []) as SkillTapRow[]);
      setSkillAllowedTools((allowedToolResult.data ?? []) as SkillAllowedToolRow[]);
      setIntentPermissionProfiles((permissionProfileResult.data ?? []) as IntentPermissionProfileRow[]);
      setSelectedSkillCategoryId((current) => current ?? nextCategories[0]?.category_id ?? null);
    } catch (cause) {
      setSkillRegistryError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSkillRegistryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUniversity();
    void loadAccess();
    void loadSkillRegistry();
  }, [loadAccess, loadSkillRegistry, loadUniversity]);

  const lessonsByCourse = useMemo(() => {
    const map = new Map<string, LessonRow[]>();
    for (const lesson of lessons) {
      const group = map.get(lesson.course_id) ?? [];
      group.push(lesson);
      map.set(lesson.course_id, group);
    }
    return map;
  }, [lessons]);

  const lessonViewModels = useMemo<LessonViewModel[]>(() => {
    const courseTitleById = new Map(courses.map((course) => [course.course_id, course.title]));
    return lessons.map((lesson) => ({
      ...lesson,
      courseTitle: courseTitleById.get(lesson.course_id) ?? lesson.course_id,
    }));
  }, [courses, lessons]);

  const selectedLesson = lessonViewModels.find((lesson) => lesson.lesson_id === selectedLessonId) ?? lessonViewModels[0] ?? null;
  const accessActive = hasActiveAccess(access);
  const selectedSkillCategory = skillCategories.find((category) => category.category_id === selectedSkillCategoryId) ?? skillCategories[0] ?? null;
  const selectedSkillRules = selectedSkillCategory
    ? skillRules.filter((rule) => rule.category_id === selectedSkillCategory.category_id)
    : [];

  const startCheckout = useCallback(async () => {
    if (!aiOsSupabase) {
      setCheckoutError('Supabase is not configured. Stripe checkout cannot start.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const authSession = supabase ? await supabase.auth.getSession() : null;
      const accessToken = authSession?.data.session?.access_token;
      const { data, error: invokeError } = await aiOsSupabase.functions.invoke('vcu-create-checkout-session', {
        body: { program_slug: VCU_PROGRAM_SLUG },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (invokeError) throw invokeError;
      const url = typeof data === 'object' && data && 'url' in data ? String(data.url) : '';
      if (!url) throw new Error('Checkout function did not return a Stripe URL.');
      window.location.assign(url);
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const renderIntro = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Program Introduction</h3>
        <p style={{ color: 'var(--panel-text-muted)', marginBottom: 0 }}>
          Vibe Coding University is the Supabase-backed MCP curriculum for learning source-backed Cursor, Rust SDK,
          MCP UI, App Bridge, and coding-agent workflows. Lessons stay in review until real install, test,
          triangulation, and no-mock evidence exists.
        </p>
      </PanelCard>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Intent Loop Entry</h3>
        <p style={{ color: 'var(--panel-text-muted)', marginBottom: 0 }}>
          Use the shell menu to move from introduction to coursework, lab execution, Cursor instructions, or access.
          Each path maps to the existing AI OS desktop sub-paths instead of bypassing the governed shell.
        </p>
      </PanelCard>
    </div>
  );

  const renderCoursework = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(14rem, 0.8fr) minmax(0, 1.2fr)', gap: '1rem', minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {error && (
          <PanelCard>
            <p style={{ color: 'var(--panel-text)', margin: 0 }}>{error}</p>
          </PanelCard>
        )}
        {!loading && !error && courses.length === 0 && (
          <p style={{ color: 'var(--panel-text-muted)', fontSize: '0.85rem' }}>
            No VCU course rows were returned. Run the VCU migration and seed importer; this panel will not render mock lessons.
          </p>
        )}
        {courses.map((course) => (
          <section key={course.course_id}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.85rem', margin: 0 }}>{course.title}</h3>
              <StatusBadge label={course.status} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(lessonsByCourse.get(course.course_id) ?? []).map((lesson) => (
                <button
                  type="button"
                  key={lesson.lesson_id}
                  onClick={() => setSelectedLessonId(lesson.lesson_id)}
                  style={panelButtonStyle(selectedLessonId === lesson.lesson_id)}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{lesson.title}</div>
                  <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                    {lesson.publish_status} / {lesson.verification_status}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div>{renderLessonDetail()}</div>
    </div>
  );

  const renderLessonDetail = () => {
    if (!selectedLesson) {
      return <p style={{ color: 'var(--panel-text-muted)' }}>Select a real Supabase lesson row to view its source-backed manifest.</p>;
    }
    return (
      <article style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.78rem' }}>{selectedLesson.courseTitle}</div>
          <h2 style={{ color: 'var(--panel-heading)', margin: '0.25rem 0 0', fontSize: '1.35rem' }}>{selectedLesson.title}</h2>
          <p style={{ color: 'var(--panel-text-muted)', margin: '0.5rem 0 0' }}>{selectedLesson.summary}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <StatusBadge label={`publish: ${selectedLesson.publish_status}`} />
          <StatusBadge label={`verify: ${selectedLesson.verification_status}`} />
          <StatusBadge label={`triangulation: ${selectedLesson.triangulation_status}`} />
          <StatusBadge label={selectedLesson.no_mock_verified ? 'no-mock passed' : 'no-mock pending'} />
        </div>
        <PanelCard>
          <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: 0 }}>Primary Docs</h3>
          <button
            type="button"
            onClick={() => window.open(selectedLesson.docs_url, '_blank', 'noopener,noreferrer')}
            style={{ background: 'transparent', border: 'none', color: 'var(--panel-accent-text)', cursor: 'pointer', padding: '0.5rem 0 0', textAlign: 'left' }}
          >
            {selectedLesson.docs_url}
          </button>
        </PanelCard>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.75rem' }}>
          <PanelCard>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: 0 }}>Learning Outcomes</h3>
            <ul style={{ color: 'var(--panel-text-muted)', paddingLeft: '1.2rem', marginBottom: 0 }}>
              {asTextList(selectedLesson.learning_outcomes).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </PanelCard>
          <PanelCard>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: 0 }}>Required Artifacts</h3>
            <ul style={{ color: 'var(--panel-text-muted)', paddingLeft: '1.2rem', marginBottom: 0 }}>
              <li>{selectedLesson.cursor_rule_path}</li>
              <li>{selectedLesson.cursor_skill_path}</li>
              <li>{selectedLesson.agent_prompt_path}</li>
            </ul>
          </PanelCard>
        </section>
        <PanelCard>
          <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: 0 }}>No-Mock Acceptance</h3>
          <p style={{ color: 'var(--panel-text-muted)', marginBottom: 0 }}>
            This row cannot become published until real install logs, real test logs, triangulation review evidence,
            and no-mock verification are attached. The database constraint blocks premature publish state.
          </p>
        </PanelCard>
      </article>
    );
  };

  const renderLab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Vibe Code Lab</h3>
        <p style={{ color: 'var(--panel-text-muted)' }}>
          The lab is the desktop entry for running lesson work. It shows the selected lesson, its source docs,
          required Cursor artifacts, and the commands/evidence that must be produced before acceptance.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <StatusBadge label={accessActive ? 'access active' : 'access pending'} />
          <StatusBadge label="no mock evidence" />
          <StatusBadge label="real command output required" />
        </div>
      </PanelCard>
      {renderLessonDetail()}
    </div>
  );

  const renderCursor = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Cursor Lesson Support</h3>
        <p style={{ color: 'var(--panel-text-muted)' }}>
          Use the self-managed Cursor plugin package when Cursor struggles to follow lesson instructions. The package
          copies a proven file structure with rules, skills, commands, and agent prompts instead of asking the agent to
          recreate them from memory.
        </p>
        <p style={{ color: 'var(--panel-text-muted)', marginBottom: 0 }}>
          Verified package path: <code>{CURSOR_PLUGIN_PACKAGE_PATH}</code>
        </p>
      </PanelCard>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Local Install Method</h3>
        <ol style={{ color: 'var(--panel-text-muted)', paddingLeft: '1.25rem', marginBottom: 0 }}>
          <li>Copy the package folder into <code>~/.cursor/plugins/local/vcu-lesson-support</code>.</li>
          <li>Restart Cursor or run Developer: Reload Window.</li>
          <li>Open Cursor Settings and confirm the VCU rules, skills, commands, and agents are visible.</li>
          <li>Use the lesson command only after reading the source docs and no-mock acceptance gate.</li>
        </ol>
      </PanelCard>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Primary Cursor Docs</h3>
        <ul style={{ color: 'var(--panel-text-muted)', paddingLeft: '1.2rem', marginBottom: 0 }}>
          <li>Plugins: https://cursor.com/docs/plugins.md</li>
          <li>Plugin reference: https://cursor.com/docs/reference/plugins</li>
          <li>Rules and AGENTS.md: https://cursor.sh/docs/rules</li>
          <li>Skills: https://cursor.sh/docs/skills</li>
        </ul>
      </PanelCard>
    </div>
  );

  const renderSkillRegistry = () => {
    const rustSkillsSource = skillSources.find((source) => source.source_id === 'leonardomso-rust-skills') ?? skillSources[0] ?? null;
    const totalRules = skillRules.length;
    const totalCursorSkills = cursorSkills.length;
    const highlightedCategories = skillCategories.filter((category) =>
      ['Project Structure', 'Clippy & Linting', 'Anti-patterns'].includes(category.category_name),
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <PanelCard>
          <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Source-Backed Skill Registry</h3>
          <p style={{ color: 'var(--panel-text-muted)' }}>
            AI OS stores proven external skill libraries as searchable registry rows before any Cursor deployment.
            The Rust registry is imported from <code>leonardomso/rust-skills</code>, preserving the upstream category order
            so the agent can deploy phases sequentially instead of randomly installing rule sets.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <StatusBadge label={`${skillSources.length} sources`} />
            <StatusBadge label={`${skillCategories.length} categories`} />
            <StatusBadge label={`${totalRules} rules`} />
            <StatusBadge label={`${skillPhases.length} phases`} />
            <StatusBadge label={`${totalCursorSkills} cursor skills`} />
            <StatusBadge label={`${nativeSkillProtocols.length} native protocols`} />
            <StatusBadge label={`${skillshubProtocols.length} skillshub protocols`} />
            <StatusBadge label={`${skillTaps.length} taps`} />
            <StatusBadge label={`${skillAllowedTools.length} allowed tools`} />
            <StatusBadge label={`${intentPermissionProfiles.length} permission profiles`} />
          </div>
        </PanelCard>

        {skillRegistryError && (
          <PanelCard>
            <p style={{ color: 'var(--panel-text)', margin: 0 }}>{skillRegistryError}</p>
          </PanelCard>
        )}

        {rustSkillsSource && (
          <PanelCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>{rustSkillsSource.source_name}</h3>
                <p style={{ color: 'var(--panel-text-muted)' }}>{rustSkillsSource.description}</p>
                <button
                  type="button"
                  onClick={() => window.open(rustSkillsSource.source_url, '_blank', 'noopener,noreferrer')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--panel-accent-text)', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                >
                  {rustSkillsSource.source_url}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                <StatusBadge label={rustSkillsSource.verification_status} />
                <StatusBadge label={rustSkillsSource.no_mock_verified ? 'no-mock verified' : 'install evidence pending'} />
              </div>
            </div>
          </PanelCard>
        )}

        {nativeSkillProtocols.map((protocol) => (
          <div key={protocol.protocol_id}>
            <PanelCard>
              <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>
                Native Protocol: {protocol.tool_name}
              </h3>
              <p style={{ color: 'var(--panel-text-muted)' }}>
                Rust deployed skill state should be checked through <code>{protocol.config_path}</code> and real
                <code> {protocol.list_command}</code> output. AI OS records the protocol and evidence; it does not
                mark a skill installed just because it is available in the registry.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: '0.5rem' }}>
                {[protocol.install_command, protocol.init_command, protocol.list_command, protocol.push_command, protocol.validate_command].map((command) => (
                  <code
                    key={command}
                    style={{
                      background: 'var(--panel-surface)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '0.5rem',
                      color: 'var(--panel-text)',
                      padding: '0.5rem',
                    }}
                  >
                    {command}
                  </code>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                <StatusBadge label={`crate ${protocol.crate_version}`} />
                <StatusBadge label={protocol.verification_status} />
                <StatusBadge label={protocol.no_mock_verified ? 'no-mock verified' : 'command evidence pending'} />
              </div>
            </PanelCard>
          </div>
        ))}

        {skillshubProtocols.map((protocol) => (
          <div key={protocol.protocol_id}>
            <PanelCard>
              <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>
                Skillshub Protocol: {protocol.tool_name}
              </h3>
              <p style={{ color: 'var(--panel-text-muted)' }}>
                <code>skillshub</code> handles taps, discovery, agent linking, and SKILL.md <code>allowed-tools</code>
                metadata. AI OS uses that metadata as an intent permission gate before exposing skill tools.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '0.5rem' }}>
                {[protocol.install_command, 'skillshub tap add <owner/repo>', 'skillshub install <owner/repo/skill>', 'skillshub link', 'skillshub agents', 'skillshub doctor'].map((command) => (
                  <code
                    key={command}
                    style={{
                      background: 'var(--panel-surface)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '0.5rem',
                      color: 'var(--panel-text)',
                      padding: '0.5rem',
                    }}
                  >
                    {command}
                  </code>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.75rem' }}>
                <StatusBadge label={`crate ${protocol.crate_version}`} />
                <StatusBadge label={protocol.verification_status} />
                <StatusBadge label={protocol.no_mock_verified ? 'no-mock verified' : 'link evidence pending'} />
              </div>
            </PanelCard>
          </div>
        ))}

        {skillTaps.length > 0 && (
          <PanelCard>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Tap Discovery</h3>
            <p style={{ color: 'var(--panel-text-muted)' }}>
              Taps are listed as available resources only. Installed/linked state must come from real <code>skillshub</code> output.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.5rem' }}>
              {skillTaps.map((tap) => (
                <button
                  type="button"
                  key={tap.tap_id}
                  onClick={() => window.open(tap.repository_url, '_blank', 'noopener,noreferrer')}
                  style={panelButtonStyle(false)}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{tap.tap_ref}</div>
                  <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                    {tap.deployment_status} / {tap.verification_status}
                  </div>
                </button>
              ))}
            </div>
          </PanelCard>
        )}

        {intentPermissionProfiles.length > 0 && (
          <PanelCard>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Intent Permission Profiles</h3>
            <p style={{ color: 'var(--panel-text-muted)' }}>
              Shell state maps to role, scope, allowed skill patterns, and denied tool classes.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '0.5rem' }}>
              {intentPermissionProfiles.map((profile) => (
                <div
                  key={profile.profile_id}
                  style={{
                    background: 'var(--panel-surface)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '0.6rem',
                    padding: '0.65rem',
                  }}
                >
                  <div style={{ color: 'var(--panel-heading)', fontSize: '0.82rem', fontWeight: 600 }}>{profile.shell_state}</div>
                  <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>{profile.role}</div>
                  <div style={{ color: 'var(--panel-accent-text)', fontSize: '0.72rem', marginTop: '0.35rem' }}>
                    Allows: {profile.allowed_tool_classes.join(', ') || 'none'}
                  </div>
                  {profile.denied_tool_classes.length > 0 && (
                    <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                      Denies: {profile.denied_tool_classes.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </PanelCard>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '0.75rem' }}>
          {highlightedCategories.map((category) => (
            <div key={category.category_id}>
              <PanelCard>
                <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: 0 }}>{category.category_name}</h3>
                <p style={{ color: 'var(--panel-text-muted)' }}>{category.summary || category.deployment_guidance}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <StatusBadge label={`phase ${category.phase}`} />
                  <StatusBadge label={`${category.expected_rule_count} rules`} />
                  <StatusBadge label={category.impact} />
                </div>
              </PanelCard>
            </div>
          ))}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(13rem, 0.75fr) minmax(0, 1.25fr)', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: 0 }}>Deployment Phases</h3>
            {skillCategories.map((category) => (
              <button
                key={category.category_id}
                type="button"
                onClick={() => setSelectedSkillCategoryId(category.category_id)}
                style={panelButtonStyle(selectedSkillCategory?.category_id === category.category_id)}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Phase {category.phase}: {category.category_name}
                </div>
                <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  {category.expected_rule_count} rules / {category.impact}
                </div>
              </button>
            ))}
          </div>

          <PanelCard>
            {selectedSkillCategory ? (
              <>
                <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>
                  {selectedSkillCategory.category_name}
                </h3>
                <p style={{ color: 'var(--panel-text-muted)' }}>{selectedSkillCategory.deployment_guidance}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedSkillRules.map((rule) => (
                    <button
                      key={rule.rule_id}
                      type="button"
                      onClick={() => window.open(rule.source_url, '_blank', 'noopener,noreferrer')}
                      style={panelButtonStyle(false)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{rule.rule_slug}</span>
                        <span style={{ color: 'var(--panel-text-muted)', fontSize: '0.72rem' }}>{rule.verification_status}</span>
                      </div>
                      <div style={{ color: 'var(--panel-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {rule.summary}
                      </div>
                      {rule.dependency_hints.length > 0 && (
                        <div style={{ color: 'var(--panel-accent-text)', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                          Dependencies: {rule.dependency_hints.join(', ')}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--panel-text-muted)', margin: 0 }}>
                No skill registry rows were returned. Run the registry migration and source importer; this panel does not render placeholder skills.
              </p>
            )}
          </PanelCard>
        </div>

        {skillRegistryLoading && (
          <p style={{ color: 'var(--panel-text-muted)', margin: 0 }}>Loading skill registry from Supabase.</p>
        )}
      </div>
    );
  };

  const renderAccess = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Registration and Payment</h3>
        <p style={{ color: 'var(--panel-text-muted)' }}>
          VCU access is backed by Supabase enrollment and Stripe subscription state. Stripe secrets must live in
          Supabase Edge Function secrets or server env only; browser code uses the anon key and RLS.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <StatusBadge label={access.userId ? 'signed in' : 'auth required'} />
          <StatusBadge label={accessActive ? 'access active' : 'access pending'} />
          <StatusBadge label={access.subscription?.status ?? 'stripe unverified'} />
        </div>
      </PanelCard>
      {(access.error || checkoutError) && (
        <PanelCard>
          <p style={{ color: 'var(--panel-text)', margin: 0 }}>{checkoutError ?? access.error}</p>
        </PanelCard>
      )}
      <PanelCard>
        <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Program</h3>
        <p style={{ color: 'var(--panel-text-muted)' }}>
          {access.program?.title ?? 'Vibe Coding University program row is not loaded. Run the access migration and seed.'}
        </p>
        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={checkoutLoading || access.loading || !access.userId}
          style={{
            background: 'var(--panel-accent-bg)',
            border: '1px solid var(--panel-accent-border)',
            borderRadius: '0.6rem',
            color: 'var(--panel-accent-text)',
            cursor: checkoutLoading || access.loading || !access.userId ? 'not-allowed' : 'pointer',
            opacity: checkoutLoading || access.loading || !access.userId ? 0.6 : 1,
            padding: '0.65rem 0.9rem',
          }}
        >
          {checkoutLoading ? 'Starting checkout' : 'Start Stripe checkout'}
        </button>
      </PanelCard>
    </div>
  );

  const renderMain = () => {
    switch (activeView) {
      case 'intro':
        return renderIntro();
      case 'coursework':
        return renderCoursework();
      case 'lab':
        return renderLab();
      case 'cursor':
        return renderCursor();
      case 'skills':
        return renderSkillRegistry();
      case 'access':
        return renderAccess();
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(13rem, 0.42fr) minmax(0, 1.58fr)', minHeight: '100%', color: 'var(--panel-text)' }}>
      <aside
        style={{
          borderRight: '1px solid var(--panel-border)',
          background: 'var(--panel-bg)',
          padding: '1rem',
          overflow: 'auto',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ color: 'var(--panel-heading)', fontSize: '1rem', margin: 0 }}>Vibe Coding University</h2>
          <p style={{ color: 'var(--panel-text-muted)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
            Supabase menu, lesson, lab, Cursor, and access control surface.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1rem' }}>
          {(Object.keys(VIEW_LABELS) as VcuUniversityView[]).map((view) => (
            <button key={view} type="button" onClick={() => setActiveView(view)} style={panelButtonStyle(activeView === view)}>
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => { void loadUniversity(); void loadAccess(); void loadSkillRegistry(); }}
          style={{
            background: 'var(--panel-surface)',
            border: '1px solid var(--panel-border)',
            borderRadius: '0.5rem',
            color: 'var(--panel-text)',
            cursor: 'pointer',
            padding: '0.35rem 0.6rem',
            width: '100%',
          }}
        >
          {loading || access.loading || skillRegistryLoading ? 'Loading' : 'Refresh Supabase state'}
        </button>
      </aside>

      <main style={{ padding: '1.25rem', overflow: 'auto' }}>
        {renderMain()}
      </main>
    </div>
  );
}

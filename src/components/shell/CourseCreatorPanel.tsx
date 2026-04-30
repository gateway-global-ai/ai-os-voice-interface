/**
 * Course Creator — admin-only VCU draft editor: knowledge ingest, guide, blueprint,
 * professor/author assignment. Persists to `university_course_drafts`.
 * Rust `skills` CLI: store paths in capstone/lesson notes; run validate/push in CI or locally (no-mock).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties, ChangeEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { aiOsSupabase, supabase } from '../../lib/supabaseClient';
import { geminiGenerateText } from '../../api/geminiGateway';
import type { Database } from '../../lib/supabaseTypes';
import { AIOS_OPERATOR_TOKEN_KEY, restoreOperatorToken } from '../../core/io/checkmeClient';
import { readOnboardingProfile } from '../../onboarding/onboardingState';
import {
  defaultCourseBlueprint,
  defaultCourseGuidance,
  parseCourseBlueprintJson,
  parseCourseGuidanceJson,
  type BookChapter,
  type CourseCreatorBlueprint,
  type CourseGuidance,
  type ExampleItem,
} from '../../shell/courseCreatorBlueprint';
import {
  INTRO_VIBE_CODING_DRAFT_ID,
  INTRO_VIBE_CODING_KNOWLEDGE_REL_PATH,
} from '../../vcu/courseCreatorSeeds';

type DraftRow = Database['public']['Tables']['university_course_drafts']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type CourseRef = { course_id: string; title: string };

const VCU_PROGRAM = 'vibe-coding-university';
const MAX_KB_FOR_GEMINI = 14_000;

function readOperatorToken(): string | null {
  try {
    return localStorage.getItem(AIOS_OPERATOR_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function courseCreatorApi<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/__course_creator_api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Course Creator API failed (${response.status})`);
  }
  return data as T;
}

function userLabel(u: UserRow): string {
  return (
    u.display_name?.trim() ||
    u.email?.trim() ||
    u.username?.trim() ||
    (u.phone ? u.phone : '') ||
    u.id.slice(0, 8)
  );
}

function tryParseModelJsonString(raw: string): unknown {
  let t = raw.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) t = m[1]!.trim();
  return JSON.parse(t) as unknown;
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: '4rem',
  background: 'var(--panel-input-bg)',
  border: '1px solid var(--panel-input-border)',
  borderRadius: '0.5rem',
  color: 'var(--panel-text)',
  fontSize: '0.8rem',
  padding: '0.5rem',
};

const labelStyle: CSSProperties = {
  color: 'var(--panel-text-muted)',
  fontSize: '0.7rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  display: 'block',
};

const panelCard: CSSProperties = {
  border: '1px solid var(--panel-border)',
  borderRadius: '0.75rem',
  background: 'var(--panel-bg)',
  padding: '0.75rem',
  marginBottom: '0.75rem',
};

function ChaptersBlock({
  label,
  chapters,
  onChange,
}: {
  label: string;
  chapters: BookChapter[];
  onChange: (next: BookChapter[]) => void;
}) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <span style={{ ...labelStyle, textTransform: 'none' as const }}>{label}</span>
      {chapters.map((ch, i) => (
        <div
          key={`${i}-${ch.title}`}
          style={{ marginBottom: '0.5rem', borderLeft: '2px solid var(--panel-accent-border)', paddingLeft: '0.5rem' }}
        >
          <input
            value={ch.title}
            onChange={(e) => {
              const n = chapters.slice();
              n[i] = { ...n[i]!, title: e.target.value };
              onChange(n);
            }}
            placeholder="Chapter title"
            className="mb-1 w-full rounded border px-2 py-1 text-sm"
            style={{ ...inputStyle, minHeight: '2rem' }}
          />
          <textarea
            value={ch.content}
            onChange={(e) => {
              const n = chapters.slice();
              n[i] = { ...n[i]!, content: e.target.value };
              onChange(n);
            }}
            placeholder="Content outline or script"
            style={{ ...inputStyle, minHeight: '4rem' }}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...chapters, { title: `Chapter ${chapters.length + 1}`, content: '' }])}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' }}
        >
          Add chapter
        </button>
        {chapters.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(chapters.slice(0, -1))}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' }}
          >
            Remove last
          </button>
        )}
      </div>
    </div>
  );
}

function ExamplesList({
  items,
  onChange,
}: {
  items: ExampleItem[];
  onChange: (next: ExampleItem[]) => void;
}) {
  return (
    <div>
      {items.map((ex, i) => (
        <div
          key={`${i}-${ex.label}`}
          style={{ marginBottom: '0.5rem', border: '1px solid var(--panel-border)', borderRadius: '0.5rem', padding: '0.5rem' }}
        >
          <input
            value={ex.label}
            onChange={(e) => {
              const n = items.slice();
              n[i] = { ...n[i]!, label: e.target.value };
              onChange(n);
            }}
            placeholder="Example name"
            style={{ ...inputStyle, minHeight: '2rem', marginBottom: '0.25rem' }}
          />
          <textarea
            value={ex.body}
            onChange={(e) => {
              const n = items.slice();
              n[i] = { ...n[i]!, body: e.target.value };
              onChange(n);
            }}
            placeholder="Description, repo, or play instructions"
            style={{ ...inputStyle, minHeight: '3rem' }}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...items, { label: `Example ${items.length + 1}`, body: '' }])}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' }}
        >
          Add example
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(items.slice(0, -1))}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' }}
          >
            Remove last
          </button>
        )}
      </div>
    </div>
  );
}

export function CourseCreatorPanel() {
  const [operatorToken, setOperatorToken] = useState<string | null>(() => readOperatorToken());
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [genBusy, setGenBusy] = useState(false);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [workingTitle, setWorkingTitle] = useState('');
  const [knowledgeText, setKnowledgeText] = useState('');
  const [guidance, setGuidance] = useState<CourseGuidance>(defaultCourseGuidance);
  const [blueprint, setBlueprint] = useState<CourseCreatorBlueprint>(defaultCourseBlueprint);
  const [status, setStatus] = useState<'draft' | 'review' | 'archived'>('draft');
  const [professorId, setProfessorId] = useState<string>('');
  const [authorId, setAuthorId] = useState<string>('');
  const [linkedCourseId, setLinkedCourseId] = useState<string>('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [courseRefs, setCourseRefs] = useState<CourseRef[]>([]);

  const dataClient = aiOsSupabase ?? supabase;
  const userClient = supabase;

  useEffect(() => {
    if (operatorToken) return;
    const phone = readOnboardingProfile()?.phone_number?.trim();
    if (!phone) return;
    let cancelled = false;
    void restoreOperatorToken(phone).then((token) => {
      if (!cancelled && token) {
        setOperatorToken(token);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [operatorToken]);

  const probe = useCallback(async () => {
    if (operatorToken) {
      try {
        await courseCreatorApi<{ ok: boolean }>(operatorToken, '/access');
        setAdmin(true);
        return;
      } catch {
        setAdmin(false);
        return;
      }
    }
    if (!dataClient) {
      setAdmin(false);
      return;
    }
    const { data, error } = await dataClient.rpc('admin_access_probe');
    if (error) {
      setAdmin(false);
      return;
    }
    setAdmin(data === true);
  }, [dataClient, operatorToken]);

  useEffect(() => {
    void probe();
  }, [probe]);

  const loadUsers = useCallback(async () => {
    if (operatorToken) {
      const data = await courseCreatorApi<{ users: UserRow[] }>(operatorToken, '/users');
      setUsers(data.users ?? []);
      return;
    }
    if (!userClient) return;
    const { data, error } = await userClient
      .from('users')
      .select('*')
      .order('display_name', { ascending: true })
      .limit(200);
    if (error) return;
    setUsers((data as UserRow[]) ?? []);
  }, [operatorToken, userClient]);

  const loadCourses = useCallback(async () => {
    if (operatorToken) {
      const data = await courseCreatorApi<{ courses: CourseRef[] }>(operatorToken, '/courses');
      setCourseRefs(data.courses ?? []);
      return;
    }
    if (!dataClient) return;
    const { data, error } = await dataClient
      .from('university_courses')
      .select('course_id, title')
      .order('sort_order', { ascending: true });
    if (error) return;
    setCourseRefs((data as CourseRef[]) ?? []);
  }, [dataClient, operatorToken]);

  const loadDrafts = useCallback(async () => {
    if ((!dataClient && !operatorToken) || !admin) return;
    setLoadErr(null);
    if (operatorToken) {
      try {
        const data = await courseCreatorApi<{ drafts: DraftRow[] }>(operatorToken, '/drafts');
        setDrafts(data.drafts ?? []);
      } catch (error) {
        setLoadErr(error instanceof Error ? error.message : String(error));
      }
      return;
    }
    const { data, error } = await dataClient
      .from('university_course_drafts')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      setLoadErr(error.message);
      return;
    }
    setDrafts((data as DraftRow[]) ?? []);
  }, [dataClient, admin, operatorToken]);

  useEffect(() => {
    if (admin) {
      void loadDrafts();
      void loadUsers();
      void loadCourses();
    }
  }, [admin, loadDrafts, loadUsers, loadCourses]);

  const currentDraft = useMemo(() => drafts.find((d) => d.draft_id === draftId) ?? null, [drafts, draftId]);

  const applyDraft = useCallback((row: DraftRow) => {
    setDraftId(row.draft_id);
    setWorkingTitle(row.working_title);
    setKnowledgeText(row.knowledge_text);
    setGuidance(parseCourseGuidanceJson(row.guidance as unknown));
    setBlueprint(parseCourseBlueprintJson(row.blueprint as unknown));
    setStatus(row.status);
    setProfessorId(row.professor_user_id ?? '');
    setAuthorId(row.author_user_id ?? '');
    setLinkedCourseId(row.linked_course_id ?? '');
  }, []);

  const saveDraft = useCallback(async () => {
    if ((!dataClient && !operatorToken) || !admin || !draftId) return;
    setSaveMsg(null);
    setSaving(true);
    const payload: Database['public']['Tables']['university_course_drafts']['Update'] = {
      working_title: workingTitle,
      knowledge_text: knowledgeText,
      guidance: guidance as unknown as Record<string, unknown>,
      blueprint: blueprint as unknown as Record<string, unknown>,
      status,
      professor_user_id: professorId || null,
      author_user_id: authorId || null,
      linked_course_id: linkedCourseId || null,
    };
    try {
      if (operatorToken) {
        await courseCreatorApi<{ draft: DraftRow }>(operatorToken, `/drafts/${draftId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else if (dataClient) {
        const { error } = await dataClient.from('university_course_drafts').update(payload as never).eq('draft_id', draftId);
        if (error) throw error;
      }
    } catch (error) {
      setSaving(false);
      setSaveMsg(error instanceof Error ? error.message : String(error));
      return;
    }
    setSaving(false);
    setSaveMsg('Saved.');
    void loadDrafts();
  }, [
    dataClient,
    admin,
    draftId,
    workingTitle,
    knowledgeText,
    guidance,
    blueprint,
    status,
    professorId,
    authorId,
    linkedCourseId,
    loadDrafts,
    operatorToken,
  ]);

  const newDraft = useCallback(async () => {
    if ((!dataClient && !operatorToken) || !admin) return;
    setLoadErr(null);
    const payload = {
        program_slug: VCU_PROGRAM,
        working_title: 'New course',
        knowledge_text: '',
        guidance: defaultCourseGuidance() as unknown as Record<string, unknown>,
        blueprint: defaultCourseBlueprint() as unknown as Record<string, unknown>,
        status: 'draft',
      };
    let row: DraftRow;
    try {
      if (operatorToken) {
        const response = await courseCreatorApi<{ draft: DraftRow }>(operatorToken, '/drafts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        row = response.draft;
      } else if (dataClient) {
        const { data, error } = await dataClient
          .from('university_course_drafts')
          .insert(payload as never)
          .select('*')
          .single();
        if (error) throw error;
        row = data as DraftRow;
      } else {
        return;
      }
    } catch (error) {
      setLoadErr(error instanceof Error ? error.message : String(error));
      return;
    }
    setDrafts((d) => [row, ...d]);
    applyDraft(row);
  }, [dataClient, admin, applyDraft, operatorToken]);

  const deleteDraft = useCallback(async () => {
    if ((!dataClient && !operatorToken) || !admin || !draftId) return;
    if (!window.confirm('Delete this draft?')) return;
    try {
      if (operatorToken) {
        await courseCreatorApi<{ ok: boolean }>(operatorToken, `/drafts/${draftId}`, { method: 'DELETE' });
      } else if (dataClient) {
        const { error } = await dataClient.from('university_course_drafts').delete().eq('draft_id', draftId);
        if (error) throw error;
      }
    } catch (error) {
      setLoadErr(error instanceof Error ? error.message : String(error));
      return;
    }
    setDrafts((d) => d.filter((x) => x.draft_id !== draftId));
    setDraftId(null);
    setWorkingTitle('');
    setKnowledgeText('');
    setGuidance(defaultCourseGuidance());
    setBlueprint(defaultCourseBlueprint());
  }, [dataClient, admin, draftId, operatorToken]);

  const onFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const text = typeof r.result === 'string' ? r.result : '';
      setKnowledgeText((k) => `${k}\n\n--- ${f.name} ---\n\n${text}`);
    };
    r.readAsText(f);
  }, []);

  const generateGuidance = useCallback(async () => {
    if (!knowledgeText.trim()) return;
    setGenBusy(true);
    setSaveMsg(null);
    const slice = knowledgeText.length > MAX_KB_FOR_GEMINI ? knowledgeText.slice(0, MAX_KB_FOR_GEMINI) : knowledgeText;
    try {
      const raw = await geminiGenerateText({
        model: 'gemini-2.0-flash',
        temperature: 0.2,
        maxOutputTokens: 2_048,
        userText: `You are assisting with Vibe Coding University curriculum design. From the source material, emit ONLY valid minified JSON with this shape (no markdown fences):
{
  "courseName": "short title for the course",
  "chapterTitles": ["7 to 12 chapter titles in teaching order"],
  "capstoneSummary": "1 paragraph: what students build at the end using skills from the course",
  "tableOfContents": "markdown list mirroring the chapter titles"
}
Source material:\n\n${slice}`,
      });
      setGuidance(parseCourseGuidanceJson(tryParseModelJsonString(raw)));
    } catch (c) {
      setSaveMsg(c instanceof Error ? c.message : String(c));
    } finally {
      setGenBusy(false);
    }
  }, [knowledgeText]);

  if (admin === null) {
    return <p className="p-4 text-sm" style={{ color: 'var(--panel-text-muted)' }}>Checking access…</p>;
  }
  if (!dataClient && !operatorToken) {
    return <p className="p-4 text-sm" style={{ color: 'var(--panel-text)' }}>Course Creator requires an operator session and database connection.</p>;
  }
  if (!admin) {
    return (
      <p className="p-4 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
        Course Creator is restricted to phone-verified operator accounts with admin access. Sign in with an operator phone number, then re-open this app.
      </p>
    );
  }

  return (
    <div className="p-3 text-sm" style={{ color: 'var(--panel-text)' }}>
      <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--panel-heading)' }}>Course Creator</h2>
      {draftId === INTRO_VIBE_CODING_DRAFT_ID && (
        <p className="mb-2 rounded border px-2 py-1.5 text-xs" style={{ borderColor: 'var(--panel-accent-border)', color: 'var(--panel-text-muted)' }}>
          First course knowledge is sourced from the repo file{' '}
          <code style={{ color: 'var(--panel-accent-text)' }}>{INTRO_VIBE_CODING_KNOWLEDGE_REL_PATH}</code> (re-import with{' '}
          <code>scripts/seed-supabase.ts</code>).
        </p>
      )}
      <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
        Ingest source material, draft the curriculum structure, assign professor and author, and save to
        <code className="mx-1" style={{ color: 'var(--panel-accent-text)' }}>university_course_drafts</code>.
        Publishing to <code>university_courses</code> is a separate review and no-mock step.
      </p>

      {loadErr && (
        <div className="mb-2 rounded border px-2 py-1 text-xs" style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-heading)' }}>{loadErr}</div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={newDraft}
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{ background: 'var(--panel-accent-bg)', border: '1px solid var(--panel-accent-border)', color: 'var(--panel-accent-text)' }}
        >
          New draft
        </button>
        {drafts.length > 0 && (
          <select
            className="rounded border px-2 py-1 text-xs"
            style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)', color: 'var(--panel-text)', maxWidth: '18rem' }}
            value={draftId ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) {
                setDraftId(null);
                return;
              }
              const d = drafts.find((x) => x.draft_id === id);
              if (d) applyDraft(d);
            }}
          >
            <option value="">Select draft…</option>
            {drafts.map((d) => (
              <option key={d.draft_id} value={d.draft_id}>
                {d.working_title || d.draft_id}
              </option>
            ))}
          </select>
        )}
      </div>

      {!currentDraft && (
        <p style={{ color: 'var(--panel-text-muted)' }}>Create a draft to begin, or run migration 007 to enable <code>university_course_drafts</code>.</p>
      )}

      {currentDraft && (
        <div>
          <div style={panelCard}>
            <label style={labelStyle}>Working title</label>
            <input
              value={workingTitle}
              onChange={(e) => setWorkingTitle(e.target.value)}
              style={{ ...inputStyle, minHeight: '2rem' }}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label style={labelStyle}>Professor (users)</label>
                <select
                  value={professorId}
                  onChange={(e) => setProfessorId(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                  style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)', color: 'var(--panel-text)' }}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Author (users)</label>
                <select
                  value={authorId}
                  onChange={(e) => setAuthorId(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                  style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)', color: 'var(--panel-text)' }}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label style={labelStyle}>Link to existing university course (optional)</label>
              <select
                value={linkedCourseId}
                onChange={(e) => setLinkedCourseId(e.target.value)}
                className="w-full rounded border px-2 py-1"
                style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)', color: 'var(--panel-text)' }}
              >
                <option value="">None</option>
                {courseRefs.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2">
              <label style={labelStyle}>Draft status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'review' | 'archived')}
                className="w-full max-w-xs rounded border px-2 py-1"
                style={{ background: 'var(--panel-surface)', borderColor: 'var(--panel-border)', color: 'var(--panel-text)' }}
              >
                <option value="draft">draft</option>
                <option value="review">review</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <div style={panelCard}>
            <span className="mb-1 block" style={labelStyle}>1. Source knowledge base (paste and/or upload)</span>
            <textarea
              value={knowledgeText}
              onChange={(e) => setKnowledgeText(e.target.value)}
              style={{ ...inputStyle, minHeight: '8rem' }}
            />
            <div className="mt-1 flex items-center gap-2">
              <input type="file" onChange={onFile} className="text-xs" style={{ color: 'var(--panel-text-muted)' }} accept=".md,.txt,.text,.markdown" />
            </div>
          </div>

          <div style={panelCard}>
            <span className="mb-1 block" style={labelStyle}>2. Course guide (summary; uses Gemini; draft until you publish through review)</span>
            <div className="mb-1 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={genBusy || !knowledgeText.trim()}
                onClick={generateGuidance}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text)' }}
              >
                {genBusy ? 'Generating…' : 'Summarize: name, chapters, capstone, TOC from knowledge'}
              </button>
            </div>
            <label style={labelStyle}>Course name</label>
            <input
              value={guidance.courseName}
              onChange={(e) => setGuidance((g) => ({ ...g, courseName: e.target.value }))}
              style={{ ...inputStyle, minHeight: '2rem' }}
            />
            <label className="mt-1" style={labelStyle}>Table of contents</label>
            <textarea
              value={guidance.tableOfContents}
              onChange={(e) => setGuidance((g) => ({ ...g, tableOfContents: e.target.value }))}
              style={{ ...inputStyle, minHeight: '4rem' }}
            />
            <label className="mt-1" style={labelStyle}>Chapter list (one per line, or from generator)</label>
            <textarea
              value={guidance.chapterTitles.join('\n')}
              onChange={(e) => setGuidance((g) => ({ ...g, chapterTitles: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) }))}
              style={{ ...inputStyle, minHeight: '4rem' }}
            />
            <label className="mt-1" style={labelStyle}>Capstone (summary)</label>
            <textarea
              value={guidance.capstoneSummary}
              onChange={(e) => setGuidance((g) => ({ ...g, capstoneSummary: e.target.value }))}
              style={{ ...inputStyle, minHeight: '4rem' }}
            />
          </div>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>1. Introduction — table of contents</summary>
            <div className="mt-2">
              <textarea
                value={blueprint.introduction.tableOfContents}
                onChange={(e) => setBlueprint((b) => ({ ...b, introduction: { tableOfContents: e.target.value } }))}
                style={{ ...inputStyle, minHeight: '5rem' }}
                placeholder="Student-facing table of contents"
              />
            </div>
          </details>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>2. Lesson (book, audio, voice — chapters each)</summary>
            <ChaptersBlock
              label="Book"
              chapters={blueprint.lesson.book.chapters}
              onChange={(c) => setBlueprint((b) => ({ ...b, lesson: { ...b.lesson, book: { chapters: c } } }))}
            />
            <ChaptersBlock
              label="Audio"
              chapters={blueprint.lesson.audio.chapters}
              onChange={(c) => setBlueprint((b) => ({ ...b, lesson: { ...b.lesson, audio: { chapters: c } } }))}
            />
            <ChaptersBlock
              label="Voice (voice / narration)"
              chapters={blueprint.lesson.voice.chapters}
              onChange={(c) => setBlueprint((b) => ({ ...b, lesson: { ...b.lesson, voice: { chapters: c } } }))}
            />
          </details>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>3. Examples</summary>
            <div className="mt-2">
              <ExamplesList
                items={blueprint.examples}
                onChange={(e) => setBlueprint((b) => ({ ...b, examples: e }))}
              />
            </div>
          </details>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>4. Interactive experiment (Vibe Coder workflow)</summary>
            <textarea
              value={blueprint.interactiveExperiment.instructions}
              onChange={(e) => setBlueprint((b) => ({ ...b, interactiveExperiment: { instructions: e.target.value } }))}
              placeholder="Work with Vibe Coder: analyze examples and codebase, improve, verify, test"
              style={{ ...inputStyle, minHeight: '5rem' }}
            />
          </details>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>5. Assets (files, external URLs, IDE)</summary>
            <label style={labelStyle} className="mt-1">File library (one per line: label TAB uri TAB notes)</label>
            <textarea
              value={blueprint.assets.fileLibrary
                .map((x) => [x.label, x.uri, x.notes].join('\t'))
                .join('\n')}
              onChange={(e) => {
                setBlueprint((b) => ({
                  ...b,
                  assets: {
                    ...b.assets,
                    fileLibrary: e.target.value
                      .split('\n')
                      .map((L) => {
                        const p = L.split('\t');
                        return {
                          label: (p[0] ?? '').trim(),
                          uri: (p[1] ?? '').trim(),
                          notes: (p[2] ?? '').trim(),
                        };
                      })
                      .filter((r) => r.label || r.uri),
                  },
                }));
              }}
              style={{ ...inputStyle, minHeight: '3rem' }}
            />
            <label className="mt-2" style={labelStyle}>External URLs (one per line: title | url)</label>
            <textarea
              value={blueprint.assets.externalUrls.map((x) => `${x.label}\t${x.url}`).join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n');
                setBlueprint((b) => ({
                  ...b,
                  assets: {
                    ...b.assets,
                    externalUrls: lines
                      .map((L) => {
                        const [label, url] = L.split('\t');
                        return { label: (label ?? '').trim(), url: (url ?? '').trim(), notes: '' };
                      })
                      .filter((r) => r.label || r.url),
                  },
                }));
              }}
              style={{ ...inputStyle, minHeight: '3rem' }}
            />
            <label className="mt-1" style={labelStyle}>IDE integrations</label>
            <textarea
              value={blueprint.assets.ideIntegrations.map((x) => `${x.label}: ${x.notes}`).join('\n')}
              onChange={(e) => {
                const lines = e.target.value.split('\n');
                setBlueprint((b) => ({
                  ...b,
                  assets: {
                    ...b.assets,
                    ideIntegrations: lines
                      .filter((l) => l.trim())
                      .map((l) => {
                        const c = l.indexOf(':');
                        if (c === -1) return { label: l.trim(), notes: '' };
                        return { label: l.slice(0, c).trim(), notes: l.slice(c + 1).trim() };
                      }),
                  },
                }));
              }}
              style={{ ...inputStyle, minHeight: '3rem' }}
            />
          </details>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>6. Lesson discussion</summary>
            <input
              value={blueprint.lessonDiscussion.prompt}
              onChange={(e) => setBlueprint((b) => ({ ...b, lessonDiscussion: { ...b.lessonDiscussion, prompt: e.target.value } }))}
              placeholder="Discussion prompt"
              style={{ ...inputStyle, minHeight: '2rem' }}
            />
            <textarea
              className="mt-1"
              value={blueprint.lessonDiscussion.notes}
              onChange={(e) => setBlueprint((b) => ({ ...b, lessonDiscussion: { ...b.lessonDiscussion, notes: e.target.value } }))}
              placeholder="Facilitator / forum notes"
              style={{ ...inputStyle, minHeight: '3rem' }}
            />
          </details>

          <details className="mb-2" open>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--panel-heading)' }}>7. Capstone (app + skills + publish)</summary>
            <textarea
              value={blueprint.capstone.summary}
              onChange={(e) => setBlueprint((b) => ({ ...b, capstone: { ...b.capstone, summary: e.target.value } }))}
              placeholder="Build a new app using course skills; verify, test, publish to marketplace"
              style={{ ...inputStyle, minHeight: '3rem' }}
            />
            <label className="mt-1" style={labelStyle}>Skills to apply (Rust / Cursor skills paths, references)</label>
            <textarea
              value={blueprint.capstone.skillsToApply}
              onChange={(e) => setBlueprint((b) => ({ ...b, capstone: { ...b.capstone, skillsToApply: e.target.value } }))}
              style={{ ...inputStyle, minHeight: '2.5rem' }}
            />
            <label className="mt-1" style={labelStyle}>Verification and testing</label>
            <textarea
              value={blueprint.capstone.verificationSteps}
              onChange={(e) => setBlueprint((b) => ({ ...b, capstone: { ...b.capstone, verificationSteps: e.target.value } }))}
              style={{ ...inputStyle, minHeight: '2.5rem' }}
            />
            <label className="mt-1" style={labelStyle}>Marketplace / publish</label>
            <textarea
              value={blueprint.capstone.marketplaceNotes}
              onChange={(e) => setBlueprint((b) => ({ ...b, capstone: { ...b.capstone, marketplaceNotes: e.target.value } }))}
              style={{ ...inputStyle, minHeight: '2.5rem' }}
            />
          </details>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={saveDraft}
              className="rounded-lg px-4 py-1.5 text-sm font-medium"
              style={{ background: 'var(--panel-accent-bg)', border: '1px solid var(--panel-accent-border)', color: 'var(--panel-accent-text)' }}
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={deleteDraft}
              className="rounded border px-2 py-1.5 text-xs"
              style={{ borderColor: 'var(--panel-border)', color: 'var(--panel-text-muted)' }}
            >
              Delete draft
            </button>
            {saveMsg && <span className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>{saveMsg}</span>}
            {currentDraft && (
              <span className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>Updated {new Date(currentDraft.updated_at).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

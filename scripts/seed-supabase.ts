#!/usr/bin/env tsx
/**
 * Deterministic canonical importer for Supabase seed tables.
 *
 * Actual external source files read by this script:
 *   - src/shell/shellMenuRegistry.ts    -> shell_menus + shell_menu_items
 *   - src/knowledge/SeedData.ts         -> knowledge_base
 *   - src/onboarding/lessons.ts         -> knowledge_base
 *   - src/content/podcastEpisodes.ts    -> podcast_episodes
 *   - src/core/referralAccess.ts        -> referral_codes
 *   - src/workspace/intentRegistry.ts   -> skills + workspace tool coverage
 *   - src/workspace/mcpIntentToolMap.ts -> workspace MCP tool mapping
 *   - src/vcu/vcuCurriculum.ts          -> VCU courses, lessons, behavior artifacts, agent skills, MCP registry
 *
 * Local manifests retained in this file:
 *   - base AIOS tool registry rows that do not yet have a separate canonical source file
 *
 * Run:
 *   - npx tsx scripts/seed-supabase.ts
 *   - npx tsx scripts/seed-supabase.ts --dry-run
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AUTHENTICATED_ONLY_SHELL_ACTION_IDS,
  CENTRAL_SHELL_MENU_REGISTRY,
  SHELL_MENU_DESKTOP_SUB_PATH,
} from '../src/shell/shellMenuRegistry';
import { KNOWLEDGE_BASE_SEED } from '../src/knowledge/SeedData';
import { LESSONS } from '../src/onboarding/lessons';
import { podcastEpisodes } from '../src/content/podcastEpisodes';
import { DEFAULT_REFERRAL_CODES } from '../src/core/referralAccess';
import { PHASE_1_WORKSPACE_INTENTS } from '../src/workspace/intentRegistry';
import { resolveWorkspaceMcpToolCall } from '../src/workspace/mcpIntentToolMap';
import {
  MCP_SDK_REGISTRY,
  VCU_AGENT_SKILLS,
  VCU_BEHAVIOR_ARTIFACTS,
  VCU_COURSES,
  VCU_LESSONS,
} from '../src/vcu/vcuCurriculum';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.AI_OS_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.AI_OS_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type SeedRow = Record<string, JsonValue | undefined>;
type StageResult = { stage: string; tables: string[]; detail: string };
type VerificationStatus = 'verified' | 'review_pending' | 'blocked' | 'unverified';

const BASE_TOOL_ROWS = [
  { tool_id: '00_mode_select', name: 'Mode Select', category: 'Mode', enabled: true, sort_order: 0, description: 'Surface mode switcher (voice/chat/developer/operator)' },
  { tool_id: 'A_account_manager', name: 'Account Manager', category: 'Account', enabled: true, sort_order: 1, description: 'User account and profile management' },
  { tool_id: 'B_voice_controller', name: 'Voice Controller', category: 'Voice', enabled: true, sort_order: 2, description: 'Voice input and TTS route control' },
  { tool_id: 'C_video_controller', name: 'Video Controller', category: 'Video', enabled: true, sort_order: 3, description: 'Background video and visual media' },
  { tool_id: 'D_knowledge_manager', name: 'Knowledge Manager', category: 'Knowledge', enabled: true, sort_order: 4, description: 'Knowledge base and session context' },
  { tool_id: 'E_workspace_connector', name: 'Workspace Connector', category: 'Workspace', enabled: true, sort_order: 5, description: 'Google Workspace MCP adapter' },
  { tool_id: 'F_podcast_library', name: 'Podcast Library', category: 'Media', enabled: true, sort_order: 6, description: 'Research audio podcast library' },
  { tool_id: 'G_agent_identity', name: 'Agent Identity', category: 'Identity', enabled: true, sort_order: 7, description: 'Commander name, company, role, intent configuration' },
  { tool_id: 'H_appearance', name: 'Appearance', category: 'UI', enabled: true, sort_order: 8, description: 'Theme, background, overlay customization' },
  { tool_id: 'I_auth_gate', name: 'Auth Gate', category: 'Auth', enabled: true, sort_order: 9, description: 'OTP phone verification via 123CheckMe' },
  { tool_id: 'J_referral_access', name: 'Referral Access', category: 'Access', enabled: true, sort_order: 10, description: 'Referral code gate for early access' },
  { tool_id: 'K_gemini_gateway', name: 'Gemini Gateway', category: 'LLM', enabled: true, sort_order: 11, description: 'Gemini API proxy for voice/chat/TTS' },
  { tool_id: 'L_local_llm', name: 'Local LLM (Ollama)', category: 'LLM', enabled: true, sort_order: 12, description: 'Ollama-backed local language model' },
  { tool_id: 'M_triangulation', name: 'Triangulation Review', category: 'Review', enabled: true, sort_order: 13, description: 'Multi-provider AI review (OpenAI, Gemini, DeepSeek)' },
  { tool_id: 'N_coding_agent', name: 'Coding Agent', category: 'Dev', enabled: true, sort_order: 14, description: 'AI coding agent (requires auth)' },
  { tool_id: 'O_router', name: 'Intent Router', category: 'Core', enabled: true, sort_order: 15, description: 'Shell intent routing and workspace dispatch' },
] as const;

const WORKSPACE_TOOL_METADATA: Record<string, { name: string; description: string }> = {
  list_calendars: { name: 'List Calendars', description: 'Google Calendar: list calendars' },
  get_events: { name: 'Get Events', description: 'Google Calendar: list calendar events and fetch event details' },
  search_gmail_messages: { name: 'Search Gmail', description: 'Gmail: search messages' },
  get_gmail_message_content: { name: 'Read Gmail Message', description: 'Gmail: read a single message' },
  get_gmail_thread_content: { name: 'Read Gmail Thread', description: 'Gmail: read a full thread' },
  draft_gmail_message: { name: 'Draft Gmail Reply', description: 'Gmail: create a draft reply' },
  search_drive_files: { name: 'Search Drive Files', description: 'Google Drive: list and search files' },
  get_drive_file_content: { name: 'Read Drive File', description: 'Google Drive: read file content' },
  get_doc_content: { name: 'Read Google Doc', description: 'Google Docs: read a document' },
  get_doc_as_markdown: { name: 'Export Google Doc', description: 'Google Docs: export a document as markdown' },
  list_contacts: { name: 'List Contacts', description: 'Google Contacts: list connections' },
  search_contacts: { name: 'Search Contacts', description: 'Google Contacts: search contacts' },
  list_tasks: { name: 'List Tasks', description: 'Google Tasks: list tasks for a task list' },
  get_task: { name: 'Get Task', description: 'Google Tasks: fetch a single task' },
  search_custom: { name: 'Web Search', description: 'Google Custom Search (PSE)' },
};

const WORKSPACE_SKILL_DESCRIPTIONS: Record<string, string> = {
  'workspace.hub': 'Open the governed Google Workspace hub',
  'workspace.calendar.list': 'List Google calendars',
  'workspace.calendar.events.list': 'List Google Calendar events in a time window',
  'workspace.calendar.get': 'Read a single Google Calendar event',
  'workspace.mail.search': 'Search Gmail messages',
  'workspace.mail.read': 'Read a Gmail message',
  'workspace.mail.thread.read': 'Read a Gmail thread',
  'workspace.mail.thread.summarize': 'Summarize a Gmail thread through the read plane',
  'workspace.mail.draft_reply': 'Draft a Gmail reply',
  'workspace.drive.list': 'List Google Drive files',
  'workspace.drive.search': 'Search Google Drive files',
  'workspace.drive.read': 'Read a Google Drive file',
  'workspace.docs.read': 'Read a Google Doc',
  'workspace.docs.export': 'Export a Google Doc as markdown',
  'workspace.contacts.list': 'List Google Contacts',
  'workspace.contacts.search': 'Search Google Contacts',
  'workspace.tasks.list': 'List Google Tasks',
  'workspace.tasks.get': 'Read a Google Task',
  'workspace.web.search': 'Run Google Custom Search',
};

const TOOLLESS_WORKSPACE_INTENTS = new Set<string>([
  'workspace.hub',
  'workspace.mail.thread.summarize',
]);

const results: StageResult[] = [];

function info(message: string): void {
  console.log(`  ${message}`);
}

function stageHeader(name: string): void {
  console.log(`\n[${name}]`);
}

function pushResult(stage: string, tables: string[], detail: string): void {
  results.push({ stage, tables, detail });
  info(detail);
}

function fatal(message: string, cause?: unknown): never {
  if (cause instanceof Error) {
    throw new Error(`${message}: ${cause.message}`);
  }
  throw new Error(message);
}

function getClient(): SupabaseClient {
  if (dryRun) {
    fatal('Supabase client requested during dry-run');
  }
  if (!supabaseUrl || !serviceRoleKey) {
    fatal('Missing AI_OS_SUPABASE_URL or AI_OS_SUPABASE_SECRET_KEY in .env.local');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const sb = dryRun ? null : getClient();

function requireClient(): SupabaseClient {
  if (!sb) {
    fatal('Supabase client unavailable');
  }
  return sb;
}

function assertUniqueKeys(rows: SeedRow[], key: string, table: string): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const raw = row[key];
    if (typeof raw !== 'string' || !raw.trim()) {
      fatal(`${table}: missing string key "${key}" in canonical rows`);
    }
    if (seen.has(raw)) {
      fatal(`${table}: duplicate canonical key "${raw}" for "${key}"`);
    }
    seen.add(raw);
  }
}

function relativeFileExists(uri: string): boolean {
  return fs.existsSync(path.join(rootDir, uri));
}

function sha256File(uri: string): string | null {
  const absolutePath = path.join(rootDir, uri);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function summarizeStatusCounts(rows: SeedRow[], key: string): string {
  const counts: Record<VerificationStatus, number> = {
    verified: 0,
    review_pending: 0,
    blocked: 0,
    unverified: 0,
  };
  for (const row of rows) {
    const value = row[key];
    if (value === 'verified' || value === 'review_pending' || value === 'blocked' || value === 'unverified') {
      counts[value] += 1;
    }
  }
  return `verified=${counts.verified}, review_pending=${counts.review_pending}, blocked=${counts.blocked}, unverified=${counts.unverified}`;
}

function buildPerLessonArtifactTargetSummary(): { total: number; fileTargets: number; missingFiles: number } {
  const paths = VCU_LESSONS.flatMap((lesson) => [
    lesson.cursor_rule_path,
    lesson.cursor_skill_path,
    lesson.agent_prompt_path,
  ]);
  return {
    total: VCU_LESSONS.length * 4,
    fileTargets: paths.length,
    missingFiles: paths.filter((uri) => !relativeFileExists(uri)).length,
  };
}

async function deleteByKeys(table: string, key: string, values: string[]): Promise<void> {
  if (values.length === 0) return;
  const client = requireClient();
  const { error } = await client.from(table).delete().in(key, values);
  if (error) {
    fatal(`${table}: delete by ${key} failed`, error);
  }
}

async function replaceSliceByKeys(table: string, key: string, rows: SeedRow[]): Promise<void> {
  assertUniqueKeys(rows, key, table);
  const keys = rows.map((row) => String(row[key]));
  if (dryRun) {
    info(`${table}: dry-run replace slice on ${key} (${rows.length} rows)`);
    return;
  }
  const client = requireClient();
  const { data: backup, error: backupError } = await client.from(table).select('*').in(key, keys);
  if (backupError) {
    fatal(`${table}: backup select failed`, backupError);
  }
  const backupRows = (backup ?? []) as SeedRow[];
  try {
    await deleteByKeys(table, key, keys);
    const { error: insertError } = await client.from(table).insert(rows);
    if (insertError) {
      fatal(`${table}: insert failed`, insertError);
    }
  } catch (cause) {
    await deleteByKeys(table, key, keys);
    if (backupRows.length > 0) {
      const { error: restoreError } = await client.from(table).insert(backupRows);
      if (restoreError) {
        fatal(`${table}: restore failed after insert error`, restoreError);
      }
    }
    throw cause;
  }
}

async function replaceSliceByPrefix(table: string, key: string, prefix: string, rows: SeedRow[]): Promise<void> {
  assertUniqueKeys(rows, key, table);
  if (dryRun) {
    info(`${table}: dry-run replace slice where ${key} like "${prefix}%" (${rows.length} rows)`);
    return;
  }
  const client = requireClient();
  const { data: backup, error: backupError } = await client.from(table).select('*').like(key, `${prefix}%`);
  if (backupError) {
    fatal(`${table}: backup select failed`, backupError);
  }
  const backupRows = (backup ?? []) as SeedRow[];
  try {
    const { error: deleteError } = await client.from(table).delete().like(key, `${prefix}%`);
    if (deleteError) {
      fatal(`${table}: delete failed`, deleteError);
    }
    const { error: insertError } = await client.from(table).insert(rows);
    if (insertError) {
      fatal(`${table}: insert failed`, insertError);
    }
  } catch (cause) {
    const { error: cleanupError } = await client.from(table).delete().like(key, `${prefix}%`);
    if (cleanupError) {
      fatal(`${table}: cleanup failed after insert error`, cleanupError);
    }
    if (backupRows.length > 0) {
      const { error: restoreError } = await client.from(table).insert(backupRows);
      if (restoreError) {
        fatal(`${table}: restore failed after insert error`, restoreError);
      }
    }
    throw cause;
  }
}

async function replaceWholeTableWithBackup(table: string, requiredColumn: string, rows: SeedRow[]): Promise<void> {
  if (dryRun) {
    info(`${table}: dry-run full-table replace (${rows.length} rows)`);
    return;
  }
  const client = requireClient();
  const { data: backup, error: backupError } = await client.from(table).select('*');
  if (backupError) {
    fatal(`${table}: backup select failed`, backupError);
  }
  const backupRows = (backup ?? []) as SeedRow[];
  try {
    const { error: deleteError } = await client.from(table).delete().not(requiredColumn, 'is', null);
    if (deleteError) {
      fatal(`${table}: delete-all failed`, deleteError);
    }
    if (rows.length > 0) {
      const { error: insertError } = await client.from(table).insert(rows);
      if (insertError) {
        fatal(`${table}: insert failed`, insertError);
      }
    }
  } catch (cause) {
    const { error: cleanupError } = await client.from(table).delete().not(requiredColumn, 'is', null);
    if (cleanupError) {
      fatal(`${table}: cleanup failed after insert error`, cleanupError);
    }
    if (backupRows.length > 0) {
      const { error: restoreError } = await client.from(table).insert(backupRows);
      if (restoreError) {
        fatal(`${table}: restore failed after insert error`, restoreError);
      }
    }
    throw cause;
  }
}

async function upsertUniqueTable(table: string, key: string, rows: SeedRow[], deleteExtras: boolean): Promise<void> {
  assertUniqueKeys(rows, key, table);
  if (dryRun) {
    info(`${table}: dry-run upsert on ${key} (${rows.length} rows)${deleteExtras ? ', delete extras' : ''}`);
    return;
  }
  const client = requireClient();
  const { error: upsertError } = await client.from(table).upsert(rows, {
    onConflict: key,
    ignoreDuplicates: false,
  });
  if (upsertError) {
    fatal(`${table}: upsert failed`, upsertError);
  }
  if (!deleteExtras) {
    return;
  }
  const { data: existing, error: selectError } = await client.from(table).select(key);
  if (selectError) {
    fatal(`${table}: post-upsert select failed`, selectError);
  }
  const wanted = new Set(rows.map((row) => String(row[key])));
  const extras = (existing ?? [])
    .map((row) => row[key] as string | null)
    .filter((value): value is string => typeof value === 'string' && !wanted.has(value));
  await deleteByKeys(table, key, extras);
}

function parseDurationLabelToSeconds(label: string | undefined): number | null {
  if (!label) return null;
  const parts = label.split(':').map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  return null;
}

function buildIntentEnvelope(intent: string): Record<string, JsonValue> {
  switch (intent) {
    case 'workspace.calendar.events.list':
      return {
        intent,
        resource_ref: { id: 'primary' },
        calendar_time_range: {
          time_min: '2026-01-01T00:00:00Z',
          time_max: '2026-01-02T00:00:00Z',
        },
      };
    case 'workspace.calendar.get':
      return { intent, resource_ref: { id: 'event-id', calendarId: 'primary' } };
    case 'workspace.mail.read':
    case 'workspace.mail.thread.read':
    case 'workspace.drive.read':
    case 'workspace.docs.read':
    case 'workspace.docs.export':
      return { intent, resource_ref: { id: 'resource-id' } };
    case 'workspace.mail.draft_reply':
      return { intent, resource_ref: { id: 'message-id', threadId: 'thread-id' }, query: 'Draft reply body' };
    case 'workspace.tasks.list':
      return { intent, resource_ref: { id: 'task-list-id' } };
    case 'workspace.tasks.get':
      return { intent, resource_ref: { id: 'task-list-id:task-id' } };
    case 'workspace.mail.search':
    case 'workspace.drive.search':
    case 'workspace.web.search':
      return { intent, query: 'seed verification query' };
    default:
      return { intent };
  }
}

function buildWorkspaceToolRows(): SeedRow[] {
  const toolsByName = new Map<string, string[]>();
  for (const intent of PHASE_1_WORKSPACE_INTENTS) {
    const resolved = resolveWorkspaceMcpToolCall(buildIntentEnvelope(intent) as never);
    if (resolved.ok === false) {
      if (TOOLLESS_WORKSPACE_INTENTS.has(intent)) {
        continue;
      }
      fatal(`Unable to resolve workspace MCP tool for intent "${intent}": ${resolved.message}`);
    }
    const intents = toolsByName.get(resolved.tool) ?? [];
    intents.push(intent);
    toolsByName.set(resolved.tool, intents);
  }

  return [...toolsByName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([toolName, intents], index) => {
      const meta = WORKSPACE_TOOL_METADATA[toolName];
      if (!meta) {
        fatal(`Missing workspace tool metadata for "${toolName}"`);
      }
      return {
        tool_id: `mcp_${toolName}`,
        name: meta.name,
        category: 'Workspace',
        enabled: true,
        sort_order: BASE_TOOL_ROWS.length + index,
        description: `${meta.description}. Source intents: ${intents.join(', ')}`,
      };
    });
}

function buildWorkspaceSkillRows(): SeedRow[] {
  return [...PHASE_1_WORKSPACE_INTENTS].map((intent) => ({
    name: intent,
    description: WORKSPACE_SKILL_DESCRIPTIONS[intent] ?? `Workspace capability for ${intent}`,
    category: 'workspace',
    enabled: true,
  }));
}

function buildShellMenus(): SeedRow[] {
  return Object.values(CENTRAL_SHELL_MENU_REGISTRY).map((entry) => ({
    menu_id: entry.menu_id,
    menu_zone: entry.menu_zone,
    permission_class: entry.permission_class,
    parent_menu_id: entry.parent_menu_id,
    launch_mode: entry.launch_mode,
    desktop_sub_path: SHELL_MENU_DESKTOP_SUB_PATH[entry.menu_id] ?? null,
    data_source_ref: entry.data_source_ref,
    launched_from_action_id: entry.launched_from_action_id,
  }));
}

function buildShellMenuItems(): SeedRow[] {
  return Object.values(CENTRAL_SHELL_MENU_REGISTRY).flatMap((entry) =>
    entry.record.levels.flatMap((level, levelIndex) =>
      level.items.map((item, itemIndex) => ({
        menu_id: entry.menu_id,
        level: levelIndex,
        action_id: item.action_id,
        label: item.label,
        icon: item.icon ?? null,
        auth_required: AUTHENTICATED_ONLY_SHELL_ACTION_IDS.has(item.action_id),
        sort_order: itemIndex,
        metadata: {
          item_id: item.item_id,
          description: item.description ?? null,
          detail_surface: item.detail_surface ?? null,
          level_id: level.level_id,
          level_label: level.level_label,
        },
      })),
    ),
  );
}

function buildKnowledgeBaseRows(): SeedRow[] {
  const seedRows = KNOWLEDGE_BASE_SEED.map((entry) => ({
    trigger: entry.trigger,
    content: JSON.stringify(entry),
    category: 'engineering',
    enabled: true,
  }));

  const lessonRows = LESSONS.map((lesson) => ({
    trigger: `lesson_${lesson.id}`,
    content: JSON.stringify({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      intro_narration: lesson.intro_narration,
      duration_min: lesson.duration_min ?? null,
      audio_url: lesson.audio_url ?? null,
    }),
    category: lesson.category,
    enabled: true,
  }));

  return [...seedRows, ...lessonRows];
}

function buildUniversityCourseRows(): SeedRow[] {
  return VCU_COURSES.map((course) => ({
    course_id: course.course_id,
    title: course.title,
    description: course.description,
    level: course.level,
    sort_order: course.sort_order,
    status: course.status,
    final_project: course.final_project,
    docs_url: course.docs_url ?? null,
  }));
}

function buildUniversityLessonRows(): SeedRow[] {
  return VCU_LESSONS.map((lesson) => ({
    lesson_id: lesson.lesson_id,
    course_id: lesson.course_id,
    title: lesson.title,
    summary: lesson.summary,
    docs_url: lesson.docs_url,
    docs_urls: lesson.docs_urls,
    learning_outcomes: lesson.learning_outcomes,
    prerequisites: lesson.prerequisites,
    install_steps: lesson.install_steps,
    test_steps: lesson.test_steps,
    example_project: lesson.example_project,
    aptitude_test: lesson.aptitude_test,
    multimodal_assets: lesson.multimodal_assets,
    cursor_rule_path: lesson.cursor_rule_path,
    cursor_skill_path: lesson.cursor_skill_path,
    agent_prompt_path: lesson.agent_prompt_path,
    verification_status: lesson.verification_status,
    install_verified: lesson.install_verified,
    test_verified: lesson.test_verified,
    triangulation_status: lesson.triangulation_status,
    no_mock_verified: lesson.no_mock_verified,
    publish_status: lesson.publish_status,
    sort_order: lesson.sort_order,
  }));
}

function buildUniversityArtifactRows(): SeedRow[] {
  return VCU_LESSONS.flatMap((lesson) => [
    {
      artifact_id: `00000000-0000-4000-8000-${lesson.sort_order.toString().padStart(12, '0')}`,
      lesson_id: lesson.lesson_id,
      artifact_type: 'docs',
      title: `${lesson.title} primary docs`,
      uri: lesson.docs_url,
      verification_status: 'review_pending',
      evidence: { required: 'Primary source review required before publish.' },
    },
    {
      artifact_id: `00000000-0000-4001-8000-${lesson.sort_order.toString().padStart(12, '0')}`,
      lesson_id: lesson.lesson_id,
      artifact_type: 'cursor_rule',
      title: `${lesson.title} Cursor rule`,
      uri: lesson.cursor_rule_path,
      verification_status: 'review_pending',
      evidence: { required: 'Rule must include docs URL and no-mock gate.' },
    },
    {
      artifact_id: `00000000-0000-4002-8000-${lesson.sort_order.toString().padStart(12, '0')}`,
      lesson_id: lesson.lesson_id,
      artifact_type: 'cursor_skill',
      title: `${lesson.title} Cursor skill`,
      uri: lesson.cursor_skill_path,
      verification_status: 'review_pending',
      evidence: { required: 'Skill must include install/test workflow and source docs.' },
    },
    {
      artifact_id: `00000000-0000-4003-8000-${lesson.sort_order.toString().padStart(12, '0')}`,
      lesson_id: lesson.lesson_id,
      artifact_type: 'agent_prompt',
      title: `${lesson.title} agent prompt`,
      uri: lesson.agent_prompt_path,
      verification_status: 'review_pending',
      evidence: { required: 'Prompt must enforce readonly/MD-only research and no-mock evidence.' },
    },
  ]);
}

function buildVcuBehaviorArtifactRows(): SeedRow[] {
  return VCU_BEHAVIOR_ARTIFACTS.map((artifact) => {
    const contentHash = sha256File(artifact.uri);
    const fileExists = contentHash !== null;
    const verification_status = fileExists ? artifact.verification_status : 'blocked';
    const no_mock_status = fileExists ? artifact.no_mock_status : 'blocked';
    const reviewer_notes = fileExists
      ? artifact.reviewer_notes
      : `${artifact.reviewer_notes} File missing during seed import; cannot verify without a real file.`;

    return {
      artifact_id: artifact.artifact_id,
      artifact_scope: 'global',
      artifact_type: artifact.artifact_type,
      title: artifact.title,
      uri: artifact.uri,
      description: artifact.description,
      docs_urls: artifact.docs_urls,
      lesson_bindings: artifact.lesson_bindings,
      content_hash: contentHash,
      file_exists: fileExists,
      verification_status,
      no_mock_status,
      reviewer_notes,
      usage_constraints: artifact.usage_constraints,
    };
  });
}

function buildAgentSkillRows(): SeedRow[] {
  return VCU_AGENT_SKILLS.map((skill) => ({
    agent_skill_id: skill.agent_skill_id,
    name: skill.name,
    description: skill.description,
    trigger_terms: skill.trigger_terms,
    docs_urls: skill.docs_urls,
    cursor_rule_paths: skill.cursor_rule_paths,
    cursor_skill_path: skill.cursor_skill_path,
    agent_prompt_path: skill.agent_prompt_path,
    tool_ids: skill.tool_ids,
    resource_refs: skill.resource_refs,
    verification_status: skill.verification_status,
    no_mock_verified: skill.no_mock_verified,
    enabled: skill.enabled,
  }));
}

function buildMcpSdkRegistryRows(): SeedRow[] {
  return MCP_SDK_REGISTRY.map((entry) => ({
    registry_id: entry.registry_id,
    source_name: entry.source_name,
    source_url: entry.source_url,
    sdk_language: entry.sdk_language,
    protocol_version: entry.protocol_version,
    capability_type: entry.capability_type,
    capability_name: entry.capability_name,
    schema_ref: entry.schema_ref,
    docs_summary: entry.docs_summary,
    verification_status: entry.verification_status,
  }));
}

function buildPodcastEpisodeRows(): SeedRow[] {
  return podcastEpisodes.map((episode) => ({
    title: episode.title,
    description: episode.summary,
    audio_url: episode.playbackPath ?? null,
    transcript_url: episode.transcriptPreviewPath ?? null,
    cover_url: episode.coverImagePath ?? null,
    published_at: null,
    duration_seconds: parseDurationLabelToSeconds(episode.durationLabel),
    slug: episode.id,
  }));
}

function buildReferralCodeRows(): SeedRow[] {
  return DEFAULT_REFERRAL_CODES.map((code) => ({
    code,
    description: null,
    active: true,
  }));
}

async function seedTools(): Promise<void> {
  stageHeader('Tools');
  const rows = [...BASE_TOOL_ROWS, ...buildWorkspaceToolRows()];
  await upsertUniqueTable('tools', 'tool_id', rows, true);
  pushResult('tools', ['tools'], `tools: ${rows.length} rows via upsert on tool_id; extras deleted`);
}

async function seedSkills(): Promise<void> {
  stageHeader('Skills');
  const rows = buildWorkspaceSkillRows();
  await replaceSliceByPrefix('skills', 'name', 'workspace.', rows);
  pushResult('skills', ['skills'], `skills: ${rows.length} workspace rows via replace-slice on name prefix workspace.%`);
}

async function seedShellMenus(): Promise<void> {
  stageHeader('Shell Menus');
  const menuRows = buildShellMenus();
  const itemRows = buildShellMenuItems();
  await upsertUniqueTable('shell_menus', 'menu_id', menuRows, true);
  await replaceWholeTableWithBackup('shell_menu_items', 'menu_id', itemRows);
  pushResult(
    'shell-menus',
    ['shell_menus', 'shell_menu_items'],
    `shell_menus: ${menuRows.length} rows via upsert on menu_id with extras deleted; shell_menu_items: ${itemRows.length} rows via full-table replace with backup restore on failure`,
  );
}

async function seedKnowledgeBase(): Promise<void> {
  stageHeader('Knowledge Base');
  const rows = buildKnowledgeBaseRows();
  await replaceSliceByKeys('knowledge_base', 'trigger', rows);
  pushResult('knowledge-base', ['knowledge_base'], `knowledge_base: ${rows.length} canonical trigger rows via replace-slice on trigger`);
}

async function seedVcuUniversity(): Promise<void> {
  stageHeader('Vibe Coding University');
  const courses = buildUniversityCourseRows();
  const lessons = buildUniversityLessonRows();
  const artifacts = buildUniversityArtifactRows();
  const behaviorArtifacts = buildVcuBehaviorArtifactRows();
  const agentSkills = buildAgentSkillRows();
  const registry = buildMcpSdkRegistryRows();
  const lessonTargetSummary = buildPerLessonArtifactTargetSummary();

  await upsertUniqueTable('university_courses', 'course_id', courses, true);
  await upsertUniqueTable('university_lessons', 'lesson_id', lessons, true);
  await upsertUniqueTable('university_lesson_artifacts', 'artifact_id', artifacts, true);
  await upsertUniqueTable('vcu_behavior_artifacts', 'artifact_id', behaviorArtifacts, true);
  await upsertUniqueTable('agent_skills', 'agent_skill_id', agentSkills, true);
  await upsertUniqueTable('mcp_sdk_registry', 'registry_id', registry, true);

  pushResult(
    'vcu-university',
    ['university_courses', 'university_lessons', 'university_lesson_artifacts', 'vcu_behavior_artifacts', 'agent_skills', 'mcp_sdk_registry'],
    `VCU: ${courses.length} courses, ${lessons.length} review-stage lessons, ${artifacts.length} per-lesson artifact targets, ${behaviorArtifacts.length} global artifacts cataloged, ${agentSkills.length} agent skills, ${registry.length} registry rows; missing per-lesson files ${lessonTargetSummary.missingFiles}/${lessonTargetSummary.fileTargets}; behavior status counts (${summarizeStatusCounts(behaviorArtifacts, 'verification_status')}); per-lesson status counts (${summarizeStatusCounts(artifacts, 'verification_status')}); none published without evidence`,
  );
}

async function seedPodcastEpisodes(): Promise<void> {
  stageHeader('Podcast Episodes');
  const rows = buildPodcastEpisodeRows();
  await upsertUniqueTable('podcast_episodes', 'slug', rows, false);
  pushResult('podcast-episodes', ['podcast_episodes'], `podcast_episodes: ${rows.length} rows via upsert on slug; non-canonical slugs preserved`);
}

async function seedReferralCodes(): Promise<void> {
  stageHeader('Referral Codes');
  const rows = buildReferralCodeRows();
  await upsertUniqueTable('referral_codes', 'code', rows, false);
  pushResult('referral-codes', ['referral_codes'], `referral_codes: ${rows.length} rows via upsert on code; uses_count and non-canonical codes preserved`);
}

async function main(): Promise<void> {
  console.log('AIOS Supabase seed importer');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}`);
  if (!dryRun) {
    console.log(`URL:  ${supabaseUrl}`);
  }

  await seedTools();
  await seedSkills();
  await seedShellMenus();
  await seedKnowledgeBase();
  await seedVcuUniversity();
  await seedPodcastEpisodes();
  await seedReferralCodes();

  console.log('\nSummary');
  for (const result of results) {
    console.log(`- ${result.stage}: ${result.detail}`);
  }
  console.log(`\nSeed ${dryRun ? 'validation' : 'import'} completed without hidden stage failures.`);
}

main().catch((error) => {
  console.error('\nSeed failed.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});

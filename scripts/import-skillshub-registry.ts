#!/usr/bin/env tsx
/**
 * Source-backed importer for the Rust `skillshub` CLI authority/discovery protocol.
 *
 * Sources read by this script:
 * - https://crates.io/api/v1/crates/skillshub
 * - https://crates.io/api/v1/crates/skillshub/{version}/dependencies
 * - https://raw.githubusercontent.com/EYH0602/skillshub/main/README.md
 *
 * This registers protocol, tap, allowed-tools, permission profile, Cursor skill,
 * and shell action rows. It does not claim install/link state without command evidence.
 */

import * as dotenv from 'dotenv';
import { createHash } from 'crypto';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.AI_OS_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey =
  process.env.AI_OS_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.AI_OS_SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  '';

const SOURCE_ID = 'eyh0602-skillshub';
const PROTOCOL_ID = 'rust-skillshub';
const CURSOR_SKILL_ID = 'skillshub-authority-manager';
const CRATE_URL = 'https://crates.io/crates/skillshub';
const README_URL = 'https://raw.githubusercontent.com/EYH0602/skillshub/main/README.md';
const REPOSITORY_URL = 'https://github.com/EYH0602/skillshub';
const DOCS_URL = 'https://docs.rs/skillshub/latest/skillshub/';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Row = Record<string, JsonValue | undefined>;

type CratesIoResponse = {
  crate: {
    name: string;
    max_version: string;
    description: string | null;
    repository: string | null;
    documentation: string | null;
    homepage: string | null;
    license: string | null;
    downloads: number;
    recent_downloads: number | null;
    updated_at: string;
    created_at: string;
  };
};

type CrateDependency = {
  crate_id: string;
  req: string;
  kind: string;
  optional: boolean;
  default_features: boolean;
};

type CrateDependenciesResponse = { dependencies: CrateDependency[] };

function getClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing AI_OS_SUPABASE_URL or AI_OS_SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': 'ai-os-skillshub-importer' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': 'ai-os-skillshub-importer' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function upsertRows(client: SupabaseClient, table: string, rows: Row[], onConflict: string): Promise<void> {
  if (dryRun) {
    console.log(`  ${table}: dry-run upsert ${rows.length} rows`);
    return;
  }
  const { error } = await client.from(table).upsert(rows as never[], { onConflict });
  if (error) throw new Error(`${table}: upsert failed: ${error.message}`);
}

function commandCatalog(): Row[] {
  return [
    { command: 'cargo install skillshub', purpose: 'Install the skillshub CLI from crates.io.' },
    { command: 'skillshub tap add <owner/repo>', purpose: 'Add a GitHub repository tap and discover SKILL.md folders.' },
    { command: 'skillshub install <owner/repo/skill>', purpose: 'Install a tap skill into ~/.skillshub/skills.' },
    { command: 'skillshub link', purpose: 'Symlink installed skills into detected agent skill directories.' },
    { command: 'skillshub agents', purpose: 'Show detected coding agents and skill target paths.' },
    { command: 'skillshub info <owner/repo/skill>', purpose: 'Show SKILL.md metadata including license, author, version, and allowed tools.' },
    { command: 'skillshub doctor', purpose: 'Check git, tap clones, installed skills, and orphan clones.' },
    { command: 'skillshub external scan', purpose: 'Discover externally installed skills in agent directories.' },
    { command: 'skillshub search <query>', purpose: 'Search available and installed skills.' },
    { command: 'skillshub update [SKILL]', purpose: 'Update installed skills to current source revisions.' },
  ];
}

function supportedAgents(): Row[] {
  return [
    ['Claude', '~/.claude', '~/.claude/skills'],
    ['Codex', '~/.codex', '~/.codex/skills'],
    ['OpenCode', '~/.opencode', '~/.opencode/skills'],
    ['Aider', '~/.aider', '~/.aider/skills'],
    ['Cursor', '~/.cursor', '~/.cursor/skills'],
    ['Continue', '~/.continue', '~/.continue/skills'],
    ['Trae', '~/.trae', '~/.trae/skills'],
    ['Kimi', '~/.kimi', '~/.kimi/skills'],
    ['Kiro', '~/.kiro', '~/.kiro/steering'],
    ['Gemini', '~/.gemini', '~/.gemini/skills'],
    ['Copilot', '~/.copilot', '~/.copilot/skills'],
    ['Cline', '~/.cline', '~/.cline/skills'],
  ].map(([agent, directory, skillsPath]) => ({ agent, directory, skills_path: skillsPath }));
}

function permissionProfiles(): Row[] {
  return [
    {
      profile_id: 'shell-guest-readonly',
      shell_state: 'guest',
      role: 'visitor',
      scope: 'public learning and account entry only',
      authority_level: 'guest',
      desktop_sub_path: null,
      allowed_skill_patterns: ['public.*', 'vcu.intro'],
      allowed_tool_classes: ['read'],
      denied_tool_classes: ['write', 'execute', 'database', 'shell', 'network', 'browser', 'mcp'],
      system_prompt_requirements: ['must disclose platform loyalty', 'must not claim user account authority'],
      evidence_required: 'Account verification or explicit shell transition before privileged skills are exposed.',
      verification_status: 'review_pending',
    },
    {
      profile_id: 'shell-primary-user',
      shell_state: 'primary',
      role: 'authenticated_user',
      scope: 'ordinary user-facing shell actions',
      authority_level: 'primary',
      desktop_sub_path: null,
      allowed_skill_patterns: ['workspace.read.*', 'vcu.*', 'skill.registry.read'],
      allowed_tool_classes: ['read', 'browser'],
      denied_tool_classes: ['database', 'shell', 'execute', 'mcp'],
      system_prompt_requirements: ['must act in signed-in user interest', 'must disclose bounded shell state'],
      evidence_required: 'Authenticated shell session and skill-specific allowed-tools metadata.',
      verification_status: 'review_pending',
    },
    {
      profile_id: 'shell-developer-bounded',
      shell_state: 'developer',
      role: 'developer_operator',
      scope: 'code review, local validation, and approved skill installation planning',
      authority_level: 'developer',
      desktop_sub_path: 'CODING',
      allowed_skill_patterns: ['rust.*', 'skillshub.*', 'skills.*', 'cursor.*'],
      allowed_tool_classes: ['read', 'write', 'execute', 'shell', 'network'],
      denied_tool_classes: ['database'],
      system_prompt_requirements: ['must match developer role', 'must use least privilege', 'must dry-run before write-capable skill deployment when available'],
      evidence_required: 'Interim developer authority plus real command output for any install/link/validation claim.',
      verification_status: 'review_pending',
    },
    {
      profile_id: 'shell-operator-governed',
      shell_state: 'operator',
      role: 'operator',
      scope: 'diagnostics, registry administration, and approved deployment evidence',
      authority_level: 'operator',
      desktop_sub_path: 'SYSTEM_SETTINGS',
      allowed_skill_patterns: ['admin.*', 'skillshub.*', 'skills.*', 'supabase.registry.*'],
      allowed_tool_classes: ['read', 'write', 'execute', 'shell', 'database', 'network', 'mcp'],
      denied_tool_classes: [],
      system_prompt_requirements: ['must match operator role', 'must record evidence', 'must not store secrets in public rows'],
      evidence_required: 'Operator authority and real command/database evidence; destructive actions require explicit user approval.',
      verification_status: 'review_pending',
    },
    {
      profile_id: 'shell-skill-registry',
      shell_state: 'skill_registry',
      role: 'skill_curator',
      scope: 'discover, inspect, validate, and link skills by allowed-tools metadata',
      authority_level: 'developer',
      desktop_sub_path: 'LEARNING',
      allowed_skill_patterns: ['skillshub.*', 'skills.*', 'rust-skills.*'],
      allowed_tool_classes: ['read', 'network', 'shell'],
      denied_tool_classes: ['database'],
      system_prompt_requirements: ['must check allowed-tools before granting access', 'must not claim install/link state without command evidence'],
      evidence_required: 'skillshub info/list/agents/link output or blocked/unverified status.',
      verification_status: 'review_pending',
    },
  ];
}

function inferToolClass(tool: string): string {
  const t = tool.toLowerCase();
  if (['readfile', 'glob', 'rg', 'semanticsearch'].includes(t)) return 'read';
  if (['applypatch', 'editnotebook', 'delete'].includes(t)) return 'write';
  if (['shell'].includes(t)) return 'shell';
  if (['webfetch', 'websearch'].includes(t)) return 'network';
  if (t.includes('mcp')) return 'mcp';
  return 'unknown';
}

function allowedToolRows(): Row[] {
  const tools = ['ReadFile', 'Glob', 'rg', 'WebFetch', 'WebSearch', 'Shell'];
  return tools.map((tool) => ({
    allowed_tool_id: `${PROTOCOL_ID}-${CURSOR_SKILL_ID}-${tool.toLowerCase()}`,
    protocol_id: PROTOCOL_ID,
    tap_id: null,
    cursor_skill_id: CURSOR_SKILL_ID,
    skill_source_ref: '.cursor/skills/skillshub-authority-manager/SKILL.md',
    skill_name: 'skillshub-authority-manager',
    allowed_tool: tool,
    tool_class: inferToolClass(tool),
    authority_level: tool === 'Shell' ? 'developer' : 'least_privilege',
    evidence_source: 'local SKILL.md allowed-tools and skillshub allowed-tools schema',
    verification_status: 'review_pending',
  }));
}

async function main(): Promise<void> {
  console.log('Skillshub authority registry importer');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}`);

  const crateResult = await fetchJson<CratesIoResponse>('https://crates.io/api/v1/crates/skillshub');
  const version = crateResult.crate.max_version;
  const [dependencyResult, readme] = await Promise.all([
    fetchJson<CrateDependenciesResponse>(`https://crates.io/api/v1/crates/skillshub/${version}/dependencies`),
    fetchText(README_URL),
  ]);
  for (const requiredSnippet of ['skillshub tap add', 'allowed-tools', 'skillshub link', 'skillshub agents']) {
    if (!readme.includes(requiredSnippet)) throw new Error(`README missing expected source snippet: ${requiredSnippet}`);
  }
  const readmeSha256 = createHash('sha256').update(readme).digest('hex');
  const dependencies = dependencyResult.dependencies.map((dependency) => ({
    crate: dependency.crate_id,
    version_req: dependency.req,
    kind: dependency.kind,
    optional: dependency.optional,
    default_features: dependency.default_features,
  }));

  const sourceRows: Row[] = [{
    source_id: SOURCE_ID,
    source_name: 'EYH0602/skillshub',
    source_url: CRATE_URL,
    repository_url: crateResult.crate.repository ?? REPOSITORY_URL,
    skill_manifest_url: README_URL,
    license: crateResult.crate.license,
    description: crateResult.crate.description ?? 'A package manager for AI coding agent skills.',
    install_command: 'cargo install skillshub',
    manual_install: {
      cargo: 'cargo install skillshub',
      tap_add: 'skillshub tap add <owner/repo>',
      install: 'skillshub install <owner/repo/skill>',
      link: 'skillshub link',
      agents: 'skillshub agents',
    },
    source_metadata: {
      crate_version: version,
      downloads: crateResult.crate.downloads,
      recent_downloads: crateResult.crate.recent_downloads,
      updated_at: crateResult.crate.updated_at,
      readme_url: README_URL,
      readme_sha256: readmeSha256,
      dependency_count: dependencies.length,
    },
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  const protocolRows: Row[] = [{
    protocol_id: PROTOCOL_ID,
    source_id: SOURCE_ID,
    tool_name: 'skillshub',
    crate_name: 'skillshub',
    crate_version: version,
    crate_url: CRATE_URL,
    docs_url: DOCS_URL,
    repository_url: crateResult.crate.repository ?? REPOSITORY_URL,
    install_command: 'cargo install skillshub',
    registry_path: '~/.skillshub/skills',
    database_path: '~/.skillshub/db.json',
    command_catalog: commandCatalog(),
    supported_agents: supportedAgents(),
    dependency_catalog: dependencies as unknown as Row[],
    skill_format_schema: {
      required: ['name'],
      optional: ['description', 'allowed-tools', 'license', 'metadata.author', 'metadata.version'],
      directories: ['scripts', 'references'],
    },
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  const tapRows: Row[] = [
    ['eyh0602-skillshub-default', 'EYH0602/skillshub', 'https://github.com/EYH0602/skillshub', 'skillshub tap add EYH0602/skillshub'],
    ['anthropics-skills', 'anthropics/skills', 'https://github.com/anthropics/skills', 'skillshub tap add anthropics/skills'],
    ['vercel-labs-agent-skills', 'vercel-labs/agent-skills', 'https://github.com/vercel-labs/agent-skills', 'skillshub tap add vercel-labs/agent-skills'],
    ['leonardomso-rust-skills', 'leonardomso/rust-skills', 'https://github.com/leonardomso/rust-skills', 'skillshub tap add leonardomso/rust-skills'],
  ].map(([tapId, tapRef, repositoryUrl, discoveryCommand]) => ({
    tap_id: tapId,
    protocol_id: PROTOCOL_ID,
    source_id: SOURCE_ID,
    tap_ref: tapRef,
    repository_url: repositoryUrl,
    branch: null,
    discovery_command: discoveryCommand,
    install_command: `skillshub tap add ${tapRef} --install`,
    link_command: 'skillshub link',
    available_count: null,
    installed_count: null,
    tap_metadata: { source: README_URL, status_note: 'Counts require real skillshub tap command evidence.' },
    verification_status: 'review_pending',
    deployment_status: 'available',
  }));

  const cursorSkillRows: Row[] = [{
    cursor_skill_id: CURSOR_SKILL_ID,
    source_id: SOURCE_ID,
    source_category_id: null,
    name: 'Skillshub Authority Manager',
    description: 'Discovers skill taps, inspects SKILL.md allowed-tools metadata, links skills to detected agents, and enforces AI OS role/scope/tool authority before exposing skills.',
    install_mode: 'command',
    install_target: '~/.skillshub and detected agent skill directories',
    install_command: 'cargo install skillshub && skillshub doctor && skillshub agents',
    required_dependencies: ['rustc', 'cargo', 'git', 'skillshub'],
    deployment_phase: 0,
    deployment_status: 'available',
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  const actionRows: Row[] = [
    ['install', 'skillshub_install', 'cargo install skillshub', [], ['rustc', 'cargo'], 'Return cargo install command, exit code, installed skillshub version/help output, and stderr/stdout summary.'],
    ['tap-add', 'skillshub_tap_add', 'skillshub tap add <owner/repo>', ['tap_ref'], ['skillshub', 'git'], 'Return tap ref, command, exit code, and discovery output summary.'],
    ['install-skill', 'skillshub_install_skill', 'skillshub install <owner/repo/skill>', ['skill_ref'], ['skillshub', 'git'], 'Return skill ref, command, exit code, installed revision if available, and blocked/unverified status.'],
    ['link', 'skillshub_link', 'skillshub link', [], ['skillshub'], 'Return detected agent link output and symlink summary; destructive cleanup requires separate approval.'],
    ['agents', 'skillshub_agents', 'skillshub agents', [], ['skillshub'], 'Return detected agents and skill paths.'],
    ['info', 'skillshub_info', 'skillshub info <owner/repo/skill>', ['skill_ref'], ['skillshub'], 'Return SKILL.md metadata including allowed-tools, license, author, and version.'],
    ['doctor', 'skillshub_doctor', 'skillshub doctor', [], ['skillshub', 'git'], 'Return diagnostics for git, taps, installed skills, and orphan clones.'],
    ['external-scan', 'skillshub_external_scan', 'skillshub external scan', [], ['skillshub'], 'Return discovered external skills without deleting or linking anything.'],
    ['search', 'skillshub_search', 'skillshub search <query>', ['query'], ['skillshub'], 'Return matched available/installed skills and source taps.'],
  ].map(([suffix, actionType, command, inputs, deps, outputContract]) => ({
    cursor_action_id: `${SOURCE_ID}-${suffix}`,
    source_id: SOURCE_ID,
    cursor_skill_id: CURSOR_SKILL_ID,
    action_name: `skillshub ${suffix}`,
    action_type: actionType,
    shell_action_id: 'open_skill_registry',
    command_template: command,
    required_inputs: inputs,
    required_dependencies: deps,
    output_contract: outputContract,
    verification_status: 'review_pending',
  }));

  const profiles = permissionProfiles();
  const toolRows = allowedToolRows();

  if (dryRun) {
    console.log(`  crate version: ${version}`);
    console.log(`  dependencies: ${dependencies.length}`);
    console.log(`  README sha256: ${readmeSha256}`);
    console.log(`  external_skill_sources: ${sourceRows.length}`);
    console.log(`  skillshub_protocols: ${protocolRows.length}`);
    console.log(`  skill_taps: ${tapRows.length}`);
    console.log(`  skill_allowed_tools: ${toolRows.length}`);
    console.log(`  intent_permission_profiles: ${profiles.length}`);
    console.log(`  cursor_skill_registry: ${cursorSkillRows.length}`);
    console.log(`  cursor_action_registry: ${actionRows.length}`);
    return;
  }

  const client = getClient();
  await upsertRows(client, 'external_skill_sources', sourceRows, 'source_id');
  await upsertRows(client, 'skillshub_protocols', protocolRows, 'protocol_id');
  await upsertRows(client, 'skill_taps', tapRows, 'tap_id');
  await upsertRows(client, 'cursor_skill_registry', cursorSkillRows, 'cursor_skill_id');
  await upsertRows(client, 'skill_allowed_tools', toolRows, 'allowed_tool_id');
  await upsertRows(client, 'intent_permission_profiles', profiles, 'profile_id');
  await upsertRows(client, 'cursor_action_registry', actionRows, 'cursor_action_id');

  console.log(`  upserted external_skill_sources: ${sourceRows.length}`);
  console.log(`  upserted skillshub_protocols: ${protocolRows.length}`);
  console.log(`  upserted skill_taps: ${tapRows.length}`);
  console.log(`  upserted skill_allowed_tools: ${toolRows.length}`);
  console.log(`  upserted intent_permission_profiles: ${profiles.length}`);
  console.log(`  upserted cursor_skill_registry: ${cursorSkillRows.length}`);
  console.log(`  upserted cursor_action_registry: ${actionRows.length}`);
  console.log('Skillshub authority registry import completed without hidden stage failures.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

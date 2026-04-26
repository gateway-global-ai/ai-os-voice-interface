#!/usr/bin/env tsx
/**
 * Source-backed importer for the Rust `skills` CLI protocol.
 *
 * Sources read by this script:
 * - https://crates.io/api/v1/crates/skills
 * - https://crates.io/api/v1/crates/skills/{version}/dependencies
 * - https://docs.rs/skills/latest/skills/
 *
 * This registers the protocol and AI OS Cursor actions. It does not claim the
 * CLI is installed for a user until real command evidence is recorded.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

const supabaseUrl = process.env.AI_OS_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.AI_OS_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const SOURCE_ID = 'cortesi-skills-cli';
const PROTOCOL_ID = 'rust-skills-cli';
const CURSOR_SKILL_ID = 'rust-native-skills-manager';
const CRATE_URL = 'https://crates.io/crates/skills';
const DOCS_URL = 'https://docs.rs/skills/latest/skills/';

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

type CrateDependenciesResponse = {
  dependencies: CrateDependency[];
};

function getClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing AI_OS_SUPABASE_URL or AI_OS_SUPABASE_SECRET_KEY in .env.local');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': 'ai-os-native-skills-importer' } });
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
    { command: 'cargo install skills', purpose: 'Install the native Rust skills CLI from crates.io.', required_before: ['skills init', 'skills list', 'skills push', 'skills validate'] },
    { command: 'skills init', purpose: 'Set up ~/.skills.toml as the native source configuration.', required_before: ['skills list', 'skills push'] },
    { command: 'skills list', aliases: ['skills ls', 'skills status'], purpose: 'Show all skills and sync/deployment status.' },
    { command: 'skills push [SKILLS...]', purpose: 'Push source skills to configured tools such as Claude Code and Codex.' },
    { command: 'skills pull [SKILL]', purpose: 'Pull edits from tool directories back to source.' },
    { command: 'skills sync [SKILLS...]', purpose: 'Two-way sync based on timestamps.' },
    { command: 'skills diff [SKILL]', purpose: 'Show differences between source and installed skill copies.' },
    { command: 'skills validate [SKILL]', purpose: 'Check skill structure and MiniJinja template syntax before deployment.' },
    { command: 'skills render --tool <tool>', purpose: 'Preview rendered output for a target tool before pushing.' },
    { command: 'skills import <source>', purpose: 'Import skills from ZIP, URL, or GitHub.' },
  ];
}

async function main(): Promise<void> {
  console.log('Native Rust skills CLI protocol importer');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}`);

  const crateResult = await fetchJson<CratesIoResponse>('https://crates.io/api/v1/crates/skills');
  const version = crateResult.crate.max_version;
  const dependencyResult = await fetchJson<CrateDependenciesResponse>(`https://crates.io/api/v1/crates/skills/${version}/dependencies`);
  const dependencies = dependencyResult.dependencies.map((dependency) => ({
    crate: dependency.crate_id,
    version_req: dependency.req,
    kind: dependency.kind,
    optional: dependency.optional,
    default_features: dependency.default_features,
  }));

  const sourceRows: Row[] = [{
    source_id: SOURCE_ID,
    source_name: 'cortesi/skills CLI',
    source_url: CRATE_URL,
    repository_url: crateResult.crate.repository,
    skill_manifest_url: DOCS_URL,
    license: crateResult.crate.license,
    description: crateResult.crate.description ?? 'Native Rust CLI for managing AI coding assistant skills from one source.',
    install_command: 'cargo install skills',
    manual_install: {
      init: 'skills init',
      list: 'skills list',
      push: 'skills push',
      validate: 'skills validate [SKILL]',
    },
    source_metadata: {
      crate_version: version,
      downloads: crateResult.crate.downloads,
      recent_downloads: crateResult.crate.recent_downloads,
      updated_at: crateResult.crate.updated_at,
      docs_url: DOCS_URL,
      dependency_count: dependencies.length,
    },
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  const protocolRows: Row[] = [{
    protocol_id: PROTOCOL_ID,
    tool_name: 'skills',
    crate_name: 'skills',
    crate_version: version,
    crate_url: CRATE_URL,
    docs_url: DOCS_URL,
    repository_url: crateResult.crate.repository,
    config_path: '~/.skills.toml',
    install_command: 'cargo install skills',
    init_command: 'skills init',
    list_command: 'skills list',
    push_command: 'skills push',
    validate_command: 'skills validate [SKILL]',
    render_command: 'skills render --tool <tool> [SKILL]',
    supported_tools: [
      { tool: 'claude', directory: '~/.claude/skills/', docs: 'https://docs.anthropic.com/en/docs/claude-code/skills' },
      { tool: 'codex', directory: '~/.codex/skills/', docs: 'https://github.com/openai/codex/blob/main/docs/skills.md' },
    ],
    command_catalog: commandCatalog(),
    dependency_catalog: dependencies as unknown as Row[],
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  const cursorSkillRows: Row[] = [{
    cursor_skill_id: CURSOR_SKILL_ID,
    source_id: SOURCE_ID,
    source_category_id: null,
    name: 'Rust Native Skills Manager',
    description: 'Installs, initializes, validates, lists, pushes, imports, renders, and syncs skills through the Rust skills CLI protocol.',
    install_mode: 'command',
    install_target: '~/.skills.toml and configured tool skill directories',
    install_command: 'cargo install skills && skills init && skills list',
    required_dependencies: ['rustc', 'cargo', 'skills'],
    deployment_phase: 0,
    deployment_status: 'available',
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  const actionRows: Row[] = [
    ['install', 'install_skill', 'cargo install skills', ['rustc', 'cargo'], 'Return cargo install command, exit code, installed skills version, and stderr/stdout summary.'],
    ['init', 'skills_init', 'skills init', ['skills'], 'Return command, cwd/home context, exit code, and whether ~/.skills.toml exists after init.'],
    ['list', 'skills_list', 'skills list', ['skills'], 'Return command, exit code, and the real skill list/status output summary.'],
    ['push', 'skills_push', 'skills push --dry-run', ['skills'], 'Return dry-run push output first; require explicit approval before non-dry-run push.'],
    ['validate', 'skills_validate', 'skills validate [SKILL]', ['skills'], 'Return command, target skill, exit code, validation errors, and no-mock status.'],
    ['render', 'skills_render', 'skills render --tool codex [SKILL]', ['skills'], 'Return rendered target preview and command evidence before push.'],
    ['import', 'skills_import', 'skills import <source>', ['skills'], 'Return import source, command evidence, validation result, and source URL.'],
    ['sync', 'skills_sync', 'skills sync --dry-run', ['skills'], 'Return dry-run sync output and conflict status before any write.'],
  ].map(([suffix, actionType, command, deps, outputContract]) => ({
    cursor_action_id: `${SOURCE_ID}-${suffix}`,
    source_id: SOURCE_ID,
    cursor_skill_id: CURSOR_SKILL_ID,
    action_name: `Native skills ${suffix}`,
    action_type: actionType,
    shell_action_id: 'open_skill_registry',
    command_template: command,
    required_inputs: suffix === 'install' || suffix === 'init' || suffix === 'list' ? [] : ['target_skill_or_source'],
    required_dependencies: deps,
    output_contract: outputContract,
    verification_status: 'review_pending',
  }));

  if (dryRun) {
    console.log(`  crate version: ${version}`);
    console.log(`  dependencies: ${dependencies.length}`);
    console.log(`  external_skill_sources: ${sourceRows.length}`);
    console.log(`  native_skill_protocols: ${protocolRows.length}`);
    console.log(`  cursor_skill_registry: ${cursorSkillRows.length}`);
    console.log(`  cursor_action_registry: ${actionRows.length}`);
    return;
  }

  const client = getClient();
  await upsertRows(client, 'external_skill_sources', sourceRows, 'source_id');
  await upsertRows(client, 'native_skill_protocols', protocolRows, 'protocol_id');
  await upsertRows(client, 'cursor_skill_registry', cursorSkillRows, 'cursor_skill_id');
  await upsertRows(client, 'cursor_action_registry', actionRows, 'cursor_action_id');

  console.log(`  upserted external_skill_sources: ${sourceRows.length}`);
  console.log(`  upserted native_skill_protocols: ${protocolRows.length}`);
  console.log(`  upserted cursor_skill_registry: ${cursorSkillRows.length}`);
  console.log(`  upserted cursor_action_registry: ${actionRows.length}`);
  console.log('Native Rust skills CLI protocol import completed without hidden stage failures.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Source-backed importer for leonardomso/rust-skills.
 *
 * Sources read by this script:
 * - https://raw.githubusercontent.com/leonardomso/rust-skills/master/SKILL.md
 * - https://raw.githubusercontent.com/leonardomso/rust-skills/master/README.md
 * - https://api.github.com/repos/leonardomso/rust-skills/contents/rules?ref=master
 *
 * No mock rows: if upstream cannot be read or parsed, the script fails.
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
const serviceRoleKey = process.env.AI_OS_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const SOURCE_ID = 'leonardomso-rust-skills';
const REPOSITORY_URL = 'https://github.com/leonardomso/rust-skills';
const SKILL_MANIFEST_URL = 'https://raw.githubusercontent.com/leonardomso/rust-skills/master/SKILL.md';
const README_URL = 'https://raw.githubusercontent.com/leonardomso/rust-skills/master/README.md';
const RULES_API_URL = 'https://api.github.com/repos/leonardomso/rust-skills/contents/rules?ref=master';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Row = Record<string, JsonValue | undefined>;

type Category = {
  category_id: string;
  source_id: string;
  priority: number;
  phase: number;
  category_name: string;
  impact: string;
  prefix: string;
  expected_rule_count: number;
  summary: string;
  deployment_guidance: string;
  verification_status: string;
};

type Rule = {
  rule_id: string;
  source_id: string;
  category_id: string;
  rule_slug: string;
  title: string;
  summary: string;
  rule_path: string;
  source_url: string;
  raw_url: string;
  source_sha: string | null;
  source_size_bytes: number | null;
  priority: number;
  phase: number;
  deployment_status: string;
  verification_status: string;
  dependency_hints: string[];
};

type GitHubRuleFile = {
  name: string;
  path: string;
  sha: string;
  size: number;
  html_url: string;
  download_url: string;
  type: string;
};

function getClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing AI_OS_SUPABASE_URL or AI_OS_SUPABASE_SECRET_KEY in .env.local');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'User-Agent': 'ai-os-vcu-importer' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': 'ai-os-vcu-importer' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseCategories(skillText: string, readmeText: string): Category[] {
  const readmeSummaries = new Map<string, string>();
  for (const line of readmeText.split('\n')) {
    const match = line.match(/^\| \*\*(.+?)\*\* \| (\d+) \| (.+?) \|$/);
    if (match) readmeSummaries.set(match[1].trim(), match[3].trim());
  }

  const categories: Category[] = [];
  for (const line of skillText.split('\n')) {
    const match = line.match(/^\| (\d+) \| (.+?) \| (.+?) \| `([^`]+)` \| (\d+) \|$/);
    if (!match) continue;
    const priority = Number(match[1]);
    const categoryName = match[2].trim();
    const prefix = match[4].trim().replace(/-$/, '');
    const summary = readmeSummaries.get(categoryName)
      ?? readmeSummaries.get(categoryName.replace('Optimization', ''))
      ?? '';
    categories.push({
      category_id: `${SOURCE_ID}-${slugifyCategory(categoryName)}`,
      source_id: SOURCE_ID,
      priority,
      phase: priority,
      category_name: categoryName,
      impact: match[3].trim(),
      prefix,
      expected_rule_count: Number(match[5]),
      summary,
      deployment_guidance: `Deploy after phases ${priority > 1 ? `1-${priority - 1}` : 'none'}; apply ${match[3].trim()} ${categoryName} rules in source priority order.`,
      verification_status: 'review_pending',
    });
  }
  if (categories.length !== 14) throw new Error(`Expected 14 categories, parsed ${categories.length}`);
  return categories;
}

function dependencyHints(slug: string, summary: string): string[] {
  const text = `${slug} ${summary}`.toLowerCase();
  const hints = new Set<string>();
  const addIf = (needle: string, dependency: string) => { if (text.includes(needle)) hints.add(dependency); };
  addIf('thiserror', 'thiserror');
  addIf('anyhow', 'anyhow');
  addIf('tokio', 'tokio');
  addIf('cancellationtoken', 'tokio-util');
  addIf('smallvec', 'smallvec');
  addIf('arrayvec', 'arrayvec');
  addIf('thinvec', 'thin-vec');
  addIf('bytes', 'bytes');
  addIf('compactstring', 'compact_str');
  addIf('proptest', 'proptest');
  addIf('mockall', 'mockall');
  addIf('criterion', 'criterion');
  addIf('clippy', 'cargo clippy');
  addIf('rustfmt', 'cargo fmt');
  if (slug.startsWith('lint-')) hints.add('cargo clippy');
  return Array.from(hints).sort();
}

function parseRules(skillText: string, categories: Category[], githubFiles: GitHubRuleFile[]): Rule[] {
  const categoryByPriority = new Map(categories.map((category) => [category.priority, category]));
  const fileByPath = new Map(githubFiles.filter((file) => file.type === 'file').map((file) => [file.path, file]));
  const rules: Rule[] = [];
  let currentPriority = 0;
  for (const line of skillText.split('\n')) {
    const heading = line.match(/^### (\d+)\. (.+?) \((.+?)\)$/);
    if (heading) {
      currentPriority = Number(heading[1]);
      continue;
    }
    const ruleMatch = line.match(/^- \[`([^`]+)`\]\((rules\/[^)]+\.md)\) - (.+)$/);
    if (!ruleMatch) continue;
    const category = categoryByPriority.get(currentPriority);
    if (!category) throw new Error(`Rule before category: ${line}`);
    const rulePath = ruleMatch[2];
    const file = fileByPath.get(rulePath);
    if (!file) throw new Error(`Rule path missing from GitHub API listing: ${rulePath}`);
    const slug = ruleMatch[1];
    const summary = ruleMatch[3].trim();
    rules.push({
      rule_id: `${SOURCE_ID}-${slug}`,
      source_id: SOURCE_ID,
      category_id: category.category_id,
      rule_slug: slug,
      title: slug,
      summary,
      rule_path: rulePath,
      source_url: file.html_url,
      raw_url: file.download_url,
      source_sha: file.sha,
      source_size_bytes: file.size,
      priority: rules.filter((rule) => rule.category_id === category.category_id).length + 1,
      phase: category.phase,
      deployment_status: 'available',
      verification_status: 'review_pending',
      dependency_hints: dependencyHints(slug, summary),
    });
  }
  if (rules.length !== 179) throw new Error(`Expected 179 rules, parsed ${rules.length}`);
  for (const category of categories) {
    const actual = rules.filter((rule) => rule.category_id === category.category_id).length;
    if (actual !== category.expected_rule_count) {
      throw new Error(`${category.category_name}: expected ${category.expected_rule_count}, parsed ${actual}`);
    }
  }
  return rules;
}

function buildDependencyRows(rules: Rule[], categories: Category[]): Row[] {
  const rows: Row[] = [];
  for (const rule of rules) {
    for (const dependency of rule.dependency_hints) {
      const dependencyType = dependency.startsWith('cargo ') ? 'cargo_tool' : 'cargo_crate';
      rows.push({
        dependency_id: `${rule.rule_id}-${dependency.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        source_id: SOURCE_ID,
        rule_id: rule.rule_id,
        category_id: rule.category_id,
        dependency_name: dependency,
        dependency_type: dependencyType,
        required_for: rule.rule_slug,
        verification_command: dependency === 'cargo clippy'
          ? 'cargo clippy --version'
          : dependency === 'cargo fmt'
            ? 'cargo fmt --version'
            : null,
        verification_status: 'unverified',
      });
    }
  }
  for (const category of categories) {
    if (category.prefix === 'lint') {
      rows.push({
        dependency_id: `${category.category_id}-rustfmt`,
        source_id: SOURCE_ID,
        rule_id: null,
        category_id: category.category_id,
        dependency_name: 'cargo fmt',
        dependency_type: 'cargo_tool',
        required_for: category.category_name,
        verification_command: 'cargo fmt --version',
        verification_status: 'unverified',
      });
    }
  }
  const unique = new Map(rows.map((row) => [String(row.dependency_id), row]));
  return Array.from(unique.values());
}

function buildPhaseRows(categories: Category[], rules: Rule[]): Row[] {
  return categories.map((category) => ({
    phase_id: `${SOURCE_ID}-phase-${category.phase}`,
    source_id: SOURCE_ID,
    phase: category.phase,
    title: `Phase ${category.phase}: ${category.category_name}`,
    category_ids: [category.category_id],
    rule_count: rules.filter((rule) => rule.category_id === category.category_id).length,
    purpose: `${category.impact} ${category.category_name} deployment group. ${category.summary}`,
    prerequisite_phase: category.phase > 1 ? category.phase - 1 : null,
    deployment_status: 'available',
    verification_status: 'review_pending',
  }));
}

function buildCursorSkillRows(categories: Category[]): Row[] {
  return [
    {
      cursor_skill_id: `${SOURCE_ID}-root`,
      source_id: SOURCE_ID,
      source_category_id: null,
      name: 'rust-skills',
      description: 'Root Cursor skill package for the full leonardomso/rust-skills library. Install only after reviewing phase requirements.',
      install_mode: 'clone',
      install_target: '.cursor/skills/rust-skills',
      install_command: 'git clone https://github.com/leonardomso/rust-skills.git .cursor/skills/rust-skills',
      required_dependencies: ['git'],
      deployment_phase: 0,
      deployment_status: 'available',
      verification_status: 'review_pending',
      no_mock_verified: false,
    },
    ...categories.map((category) => ({
      cursor_skill_id: `${SOURCE_ID}-${category.prefix}`,
      source_id: SOURCE_ID,
      source_category_id: category.category_id,
      name: `rust-skills-${category.prefix}`,
      description: `${category.category_name} rule group from leonardomso/rust-skills. ${category.summary}`,
      install_mode: 'reference',
      install_target: '.cursor/skills/rust-skills',
      install_command: null,
      required_dependencies: category.prefix === 'lint' ? ['cargo clippy', 'cargo fmt'] : [],
      deployment_phase: category.phase,
      deployment_status: 'available',
      verification_status: 'review_pending',
      no_mock_verified: false,
    })),
  ];
}

function buildCursorActionRows(categories: Category[]): Row[] {
  const rootSkillId = `${SOURCE_ID}-root`;
  return [
    {
      cursor_action_id: `${SOURCE_ID}-install-root`,
      source_id: SOURCE_ID,
      cursor_skill_id: rootSkillId,
      action_name: 'Install full rust-skills package',
      action_type: 'install_skill',
      shell_action_id: 'open_skill_registry',
      command_template: 'git clone https://github.com/leonardomso/rust-skills.git .cursor/skills/rust-skills',
      required_inputs: ['target_project_root'],
      required_dependencies: ['git'],
      output_contract: 'Return command, cwd, exit code, stdout/stderr summary, and verify .cursor/skills/rust-skills/SKILL.md exists.',
      verification_status: 'review_pending',
    },
    {
      cursor_action_id: `${SOURCE_ID}-check-dependencies`,
      source_id: SOURCE_ID,
      cursor_skill_id: rootSkillId,
      action_name: 'Check Rust skill dependencies',
      action_type: 'check_dependencies',
      shell_action_id: 'open_skill_registry',
      command_template: 'rustc --version && cargo --version && git --version',
      required_inputs: ['target_project_root'],
      required_dependencies: ['rustc', 'cargo', 'git'],
      output_contract: 'Return command, cwd, exit code, detected versions, and blocked/unverified dependencies.',
      verification_status: 'review_pending',
    },
    ...categories.map((category) => ({
      cursor_action_id: `${SOURCE_ID}-install-phase-${category.phase}`,
      source_id: SOURCE_ID,
      cursor_skill_id: `${SOURCE_ID}-${category.prefix}`,
      action_name: `Install/reference phase ${category.phase}: ${category.category_name}`,
      action_type: 'install_phase',
      shell_action_id: 'open_skill_registry',
      command_template: '/rust-skills ' + category.category_name,
      required_inputs: ['target_project_root', 'phase_confirmation'],
      required_dependencies: category.prefix === 'lint' ? ['cargo clippy', 'cargo fmt'] : ['rustc', 'cargo'],
      output_contract: 'Return selected phase, rules applied, source URLs, dependency checks, and blocked/unverified items.',
      verification_status: 'review_pending',
    })),
  ];
}

async function deleteSourceRows(client: SupabaseClient, table: string): Promise<void> {
  if (dryRun) {
    console.log(`  ${table}: dry-run delete source slice`);
    return;
  }
  const { error: deleteError } = await client.from(table).delete().eq('source_id', SOURCE_ID);
  if (deleteError) throw new Error(`${table}: delete source slice failed: ${deleteError.message}`);
}

async function insertRows(client: SupabaseClient, table: string, rows: Row[]): Promise<void> {
  if (dryRun) {
    console.log(`  ${table}: dry-run insert (${rows.length} rows)`);
    return;
  }
  if (rows.length === 0) return;
  const { error: insertError } = await client.from(table).insert(rows as never[]);
  if (insertError) throw new Error(`${table}: insert failed: ${insertError.message}`);
}

async function main(): Promise<void> {
  console.log('Rust skills registry importer');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}`);

  const [skillText, readmeText, githubFiles] = await Promise.all([
    fetchText(SKILL_MANIFEST_URL),
    fetchText(README_URL),
    fetchJson<GitHubRuleFile[]>(RULES_API_URL),
  ]);

  const categories = parseCategories(skillText, readmeText);
  const rules = parseRules(skillText, categories, githubFiles);
  const dependencyRows = buildDependencyRows(rules, categories);
  const phaseRows = buildPhaseRows(categories, rules);
  const cursorSkillRows = buildCursorSkillRows(categories);
  const cursorActionRows = buildCursorActionRows(categories);
  const manifestHash = createHash('sha256').update(skillText).digest('hex');

  const sourceRows: Row[] = [{
    source_id: SOURCE_ID,
    source_name: 'leonardomso/rust-skills',
    source_url: REPOSITORY_URL,
    repository_url: REPOSITORY_URL,
    skill_manifest_url: SKILL_MANIFEST_URL,
    license: 'MIT',
    description: 'Comprehensive Rust coding guidelines with 179 rules across 14 categories for AI coding agents.',
    install_command: 'npx add-skill leonardomso/rust-skills',
    manual_install: {
      cursor: 'git clone https://github.com/leonardomso/rust-skills.git .cursor/skills/rust-skills',
      agents_md: 'curl -o AGENTS.md https://raw.githubusercontent.com/leonardomso/rust-skills/master/SKILL.md',
    },
    source_metadata: {
      manifest_sha256: manifestHash,
      expected_rule_count: 179,
      parsed_rule_count: rules.length,
      parsed_category_count: categories.length,
      readme_url: README_URL,
      rules_api_url: RULES_API_URL,
    },
    verification_status: 'review_pending',
    no_mock_verified: false,
  }];

  if (dryRun) {
    console.log(`  source rows: ${sourceRows.length}`);
    console.log(`  categories: ${categories.length}`);
    console.log(`  rules: ${rules.length}`);
    console.log(`  dependency requirements: ${dependencyRows.length}`);
    console.log(`  deployment phases: ${phaseRows.length}`);
    console.log(`  cursor skills: ${cursorSkillRows.length}`);
    console.log(`  cursor actions: ${cursorActionRows.length}`);
    return;
  }

  const client = getClient();
  for (const table of [
    'cursor_action_registry',
    'cursor_skill_registry',
    'skill_deployment_phases',
    'skill_dependency_requirements',
    'external_skill_rules',
    'external_skill_categories',
    'external_skill_sources',
  ]) {
    await deleteSourceRows(client, table);
  }

  await insertRows(client, 'external_skill_sources', sourceRows);
  await insertRows(client, 'external_skill_categories', categories as unknown as Row[]);
  await insertRows(client, 'external_skill_rules', rules as unknown as Row[]);
  await insertRows(client, 'skill_dependency_requirements', dependencyRows);
  await insertRows(client, 'skill_deployment_phases', phaseRows);
  await insertRows(client, 'cursor_skill_registry', cursorSkillRows);
  await insertRows(client, 'cursor_action_registry', cursorActionRows);

  console.log(`  inserted source rows: ${sourceRows.length}`);
  console.log(`  inserted categories: ${categories.length}`);
  console.log(`  inserted rules: ${rules.length}`);
  console.log(`  inserted dependency requirements: ${dependencyRows.length}`);
  console.log(`  inserted deployment phases: ${phaseRows.length}`);
  console.log(`  inserted cursor skills: ${cursorSkillRows.length}`);
  console.log(`  inserted cursor actions: ${cursorActionRows.length}`);
  console.log('Rust skills registry import completed without hidden stage failures.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

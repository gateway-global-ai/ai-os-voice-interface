/**
 * Writes CENTRAL_SHELL_MENU_REGISTRY to src-tauri/resources/shell_menu_registry.json
 * for SQLite seeding and resolve_intent_menu. Re-run after registry edits.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENTRAL_SHELL_MENU_REGISTRY } from '../src/shell/shellMenuRegistry';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../src-tauri/resources/shell_menu_registry.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(CENTRAL_SHELL_MENU_REGISTRY, null, 2), 'utf8');
console.log('Wrote', out);

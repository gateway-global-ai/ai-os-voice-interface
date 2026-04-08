/**
 * Ensures **src/core** does not import React/UI (AIOS-ADR-001).
 * @license SPDX-License-Identifier: Apache-2.0
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = join(__dirname, '.');

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walkTsFiles(p));
    } else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) {
      out.push(p);
    }
  }
  return out;
}

const FORBIDDEN = [
  /from\s+['"]react['"]/,
  /from\s+['"]react-dom/,
  /from\s+['"]motion/,
  /from\s+['"]lucide-react/,
  /from\s+['"]\.\.\/components\//,
  /from\s+['"]\.\/components\//,
];

describe('src/core import boundary', () => {
  it('no core source file imports React or UI packages', () => {
    const files = walkTsFiles(CORE_ROOT);
    assert.ok(files.length > 0, 'expected src/core/**/*.ts files');
    const violations: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pat of FORBIDDEN) {
        if (pat.test(text)) {
          violations.push(`${file}: matches ${pat}`);
        }
      }
    }
    assert.deepEqual(violations, []);
  });
});

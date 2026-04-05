/**
 * Contract tests for Gmail MCP → MailSearchRow normalization (silent shape drift = trust failures).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  mailSearchRowsHaveClickTargets,
  normalizeMailSearchRows,
  unwrapMailSearchPayload,
} from './mailSearchRows';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(__dirname, '__fixtures__', 'mcp-gmail-search');

function loadFixture(name: string): unknown {
  const path = join(fixtureDir, name);
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('unwrapMailSearchPayload', () => {
  it('unwraps JSON-RPC result envelope', () => {
    const data = loadFixture('mcp-jsonrpc-result-wrap.json');
    const u = unwrapMailSearchPayload(data);
    assert.equal((u as { messages?: unknown[] }).messages?.length, 2);
  });

  it('chains result.data when present', () => {
    const data = loadFixture('double-wrap-data.json');
    const u = unwrapMailSearchPayload(data);
    assert.equal((u as { messages?: unknown[] }).messages?.length, 1);
  });

  it('leaves bare API shape unchanged', () => {
    const data = loadFixture('gmail-api-list-minimal.json');
    assert.deepEqual(unwrapMailSearchPayload(data), data);
  });
});

describe('normalizeMailSearchRows', () => {
  it('extracts minimal Gmail list ids (id + threadId)', () => {
    const rows = normalizeMailSearchRows(loadFixture('gmail-api-list-minimal.json'));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].messageId, '18c5f2a1b3d4e5f6');
    assert.equal(rows[0].threadId, '18c5f2a1b3d4e5f7');
    assert.ok(mailSearchRowsHaveClickTargets(rows));
  });

  it('unwraps MCP result wrapper before extraction', () => {
    const rows = normalizeMailSearchRows(loadFixture('mcp-jsonrpc-result-wrap.json'));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].messageId, 'wrap-msg-1');
  });

  it('flattens thread → messages with metadata', () => {
    const rows = normalizeMailSearchRows(loadFixture('gmail-thread-nested.json'));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].messageId, 'nested-msg-1');
    assert.equal(rows[0].threadId, 'thread-nested-1');
    assert.equal(rows[0].snippet, 'Please review the attached doc');
    assert.equal(rows[0].unread, true);
    assert.ok(rows[0].date);
  });

  it('does not treat bare thread stubs as message ids', () => {
    const rows = normalizeMailSearchRows(loadFixture('bare-thread-only.json'));
    assert.equal(rows.length, 0);
    assert.equal(mailSearchRowsHaveClickTargets(rows), false);
  });

  it('maps subject and nested sender', () => {
    const rows = normalizeMailSearchRows(loadFixture('messages-rich-headers.json'));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].subject, 'Q4 review');
    assert.ok(rows[0].from?.includes('Alex Kim'));
    assert.ok(rows[0].from?.includes('alex@example.com'));
  });

  it('returns empty for non-object payloads', () => {
    assert.deepEqual(normalizeMailSearchRows(null), []);
    assert.deepEqual(normalizeMailSearchRows('text blob'), []);
  });

  it('dedupes by message id', () => {
    const data = {
      messages: [
        { id: 'dup', threadId: 't1', snippet: 'a' },
        { id: 'dup', threadId: 't1', subject: 'merged' },
      ],
    };
    const rows = normalizeMailSearchRows(data);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].subject, 'merged');
    assert.equal(rows[0].snippet, 'a');
  });
});

/**
 * Operator-gated admin knowledgebase and asset filesystem API.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { verifyOperatorToken } from './operatorAuthority';

export type AdminKnowledgebaseKind = 'knowledge' | 'asset' | 'media';

export type AdminKnowledgebaseItem = {
  id: string;
  title: string;
  kind: AdminKnowledgebaseKind;
  mimeType: string;
  sizeBytes: number;
  originalFileName: string;
  storedRelativePath: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  tags: string[];
  notes?: string;
};

type AdminKnowledgebaseRequest = IncomingMessage & { body?: unknown };

const INDEX_DIR = '.index';
const INDEX_FILE = 'items.json';
const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBearer(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}

function apiPath(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://local.invalid');
  return url.pathname.replace(/^\/__admin_knowledgebase_api/, '') || '/';
}

function categoryDir(kind: AdminKnowledgebaseKind): string {
  if (kind === 'knowledge') return 'knowledge';
  if (kind === 'media') return 'media';
  return 'assets';
}

function normalizeKind(input: string | undefined, fileName = ''): AdminKnowledgebaseKind {
  if (input === 'knowledge' || input === 'asset' || input === 'media') return input;
  const ext = extname(fileName).toLowerCase();
  if (['.md', '.txt', '.pdf', '.html', '.json'].includes(ext)) return 'knowledge';
  if (['.mp3', '.wav', '.m4a', '.mp4', '.webm'].includes(ext)) return 'media';
  return 'asset';
}

function inferMime(fileName: string, fallback = 'application/octet-stream'): string {
  return MIME_BY_EXT[extname(fileName).toLowerCase()] ?? fallback;
}

function safeDecodeHeader(value: string | string[] | undefined, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function sanitizeFileName(input: string): string {
  const name = basename(input).replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, ' ').trim();
  return name || `upload-${Date.now()}`;
}

function titleFromFileName(fileName: string): string {
  return sanitizeFileName(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeRelative(root: string, target: string): string {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(target);
  const rel = relative(resolvedRoot, resolvedTarget);
  if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`) || resolve(resolvedRoot, rel) !== resolvedTarget) {
    throw new Error('admin_knowledgebase_path_escape');
  }
  return rel.split(sep).join('/');
}

function itemPath(root: string, item: AdminKnowledgebaseItem): string {
  const target = resolve(root, item.storedRelativePath);
  safeRelative(root, target);
  return target;
}

function defaultStorageRoot(): string {
  return resolve(process.cwd(), '..', 'data', 'www.gatewayglobal.ai', 'admin-knowledgebase');
}

export function getAdminKnowledgebaseRoot(env: Record<string, string> = process.env as Record<string, string>): string {
  return resolve(env.AIOS_ADMIN_KB_ROOT || defaultStorageRoot());
}

async function ensureStorage(root: string): Promise<void> {
  await mkdir(join(root, INDEX_DIR), { recursive: true });
  await mkdir(join(root, 'knowledge'), { recursive: true });
  await mkdir(join(root, 'assets'), { recursive: true });
  await mkdir(join(root, 'media'), { recursive: true });
  await mkdir(join(root, '.tmp'), { recursive: true });
}

async function loadIndex(root: string): Promise<AdminKnowledgebaseItem[]> {
  await ensureStorage(root);
  try {
    const raw = await readFile(join(root, INDEX_DIR, INDEX_FILE), 'utf8');
    const parsed = JSON.parse(raw) as AdminKnowledgebaseItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function saveIndex(root: string, items: AdminKnowledgebaseItem[]): Promise<void> {
  await ensureStorage(root);
  const indexPath = join(root, INDEX_DIR, INDEX_FILE);
  const tempPath = join(root, INDEX_DIR, `${INDEX_FILE}.${process.pid}.${Date.now()}.tmp`);
  const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await writeFile(tempPath, JSON.stringify(sorted, null, 2), 'utf8');
  await rename(tempPath, indexPath);
}

export async function listAdminKnowledgebaseItems(
  env: Record<string, string> = process.env as Record<string, string>,
): Promise<AdminKnowledgebaseItem[]> {
  return loadIndex(getAdminKnowledgebaseRoot(env));
}

export async function importAdminKnowledgebaseFile(
  sourcePath: string,
  options: {
    env?: Record<string, string>;
    kind?: AdminKnowledgebaseKind;
    source?: string;
    title?: string;
    tags?: string[];
    notes?: string;
  } = {},
): Promise<AdminKnowledgebaseItem> {
  const env = options.env ?? (process.env as Record<string, string>);
  const root = getAdminKnowledgebaseRoot(env);
  await ensureStorage(root);

  const sourceStats = await stat(sourcePath);
  if (!sourceStats.isFile()) throw new Error('admin_knowledgebase_import_source_not_file');

  const originalFileName = sanitizeFileName(basename(sourcePath));
  const kind = options.kind ?? normalizeKind(undefined, originalFileName);
  const id = randomUUID();
  const ext = extname(originalFileName).toLowerCase();
  const storedRelativePath = `${categoryDir(kind)}/${id}${ext || '.bin'}`;
  const targetPath = resolve(root, storedRelativePath);
  safeRelative(root, targetPath);
  await copyFile(sourcePath, targetPath);

  const now = new Date().toISOString();
  const item: AdminKnowledgebaseItem = {
    id,
    title: options.title?.trim() || titleFromFileName(originalFileName),
    kind,
    mimeType: inferMime(originalFileName),
    sizeBytes: sourceStats.size,
    originalFileName,
    storedRelativePath,
    createdAt: now,
    updatedAt: now,
    source: options.source,
    tags: options.tags ?? [],
    notes: options.notes,
  };

  const items = await loadIndex(root);
  await saveIndex(root, [item, ...items.filter((existing) => existing.id !== item.id)]);
  return item;
}

async function streamUploadToItem(env: Record<string, string>, req: IncomingMessage): Promise<AdminKnowledgebaseItem> {
  const root = getAdminKnowledgebaseRoot(env);
  await ensureStorage(root);

  const originalFileName = sanitizeFileName(safeDecodeHeader(req.headers['x-aios-file-name'], `upload-${Date.now()}`));
  const kind = normalizeKind(safeDecodeHeader(req.headers['x-aios-kind'], ''), originalFileName);
  const id = randomUUID();
  const ext = extname(originalFileName).toLowerCase();
  const storedRelativePath = `${categoryDir(kind)}/${id}${ext || '.bin'}`;
  const targetPath = resolve(root, storedRelativePath);
  const tempPath = resolve(root, '.tmp', `${id}.upload`);
  safeRelative(root, targetPath);
  safeRelative(root, tempPath);

  let sizeBytes = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      sizeBytes += Buffer.byteLength(chunk);
      if (sizeBytes > MAX_UPLOAD_BYTES) {
        callback(new Error('admin_knowledgebase_upload_too_large'));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(req, counter, createWriteStream(tempPath, { flags: 'wx' }));
    await rename(tempPath, targetPath);
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }

  const now = new Date().toISOString();
  const contentType = typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : undefined;
  const item: AdminKnowledgebaseItem = {
    id,
    title: titleFromFileName(originalFileName),
    kind,
    mimeType: inferMime(originalFileName, contentType || 'application/octet-stream'),
    sizeBytes,
    originalFileName,
    storedRelativePath,
    createdAt: now,
    updatedAt: now,
    source: 'aios-upload',
    tags: [],
  };
  const items = await loadIndex(root);
  await saveIndex(root, [item, ...items]);
  return item;
}

function contentDispositionFileName(fileName: string): string {
  return sanitizeFileName(fileName).replace(/"/g, '\\"');
}

export async function handleAdminKnowledgebaseApi(
  env: Record<string, string>,
  req: AdminKnowledgebaseRequest,
  res: ServerResponse,
): Promise<void> {
  const token = verifyOperatorToken(env, readBearer(req));
  if (token.ok !== true) {
    sendJson(res, 403, { error: token.reason });
    return;
  }

  const method = req.method ?? 'GET';
  const path = apiPath(req);
  const root = getAdminKnowledgebaseRoot(env);

  try {
    if (method === 'GET' && path === '/items') {
      const items = await loadIndex(root);
      sendJson(res, 200, { root, items });
      return;
    }

    if (method === 'POST' && path === '/items/upload') {
      const item = await streamUploadToItem(env, req);
      sendJson(res, 201, { item });
      return;
    }

    const itemMatch = /^\/items\/([0-9a-f-]+)(\/content)?$/i.exec(path);
    if (itemMatch && method === 'GET') {
      const [, id, contentSuffix] = itemMatch;
      const items = await loadIndex(root);
      const item = items.find((candidate) => candidate.id === id);
      if (!item) {
        sendJson(res, 404, { error: 'admin_knowledgebase_item_not_found' });
        return;
      }

      if (!contentSuffix) {
        sendJson(res, 200, { item });
        return;
      }

      const targetPath = itemPath(root, item);
      const itemStats = await stat(targetPath);
      res.statusCode = 200;
      res.setHeader('Content-Type', item.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', String(itemStats.size));
      res.setHeader('Content-Disposition', `inline; filename="${contentDispositionFileName(item.originalFileName)}"`);
      createReadStream(targetPath).pipe(res);
      return;
    }

    sendJson(res, 404, { error: 'admin_knowledgebase_api_not_found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'admin_knowledgebase_upload_too_large' ? 413 : 500;
    sendJson(res, status, { error: message });
  }
}

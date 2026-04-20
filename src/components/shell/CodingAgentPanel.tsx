/**
 * Coding agent hub: MCP project records live in SQLite (Tauri); browser dev shows read-only notice.
 */

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { Code2, FolderOpen, Play, Trash2 } from 'lucide-react';
import type { CodingAgentProjectRecord } from '../../codingAgent/CodingAgentProjectRecord';
import { SovereignTitle, SovereignDescription } from '../../ui-core';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const DOCS_URL =
  'https://github.com/rust-mcp-stack/rust-mcp-sdk/blob/main/docs/getting-started-mcp-server.md';

export function CodingAgentPanel({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<CodingAgentProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauri) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await invoke<CodingAgentProjectRecord[]>('list_coding_agent_projects');
      setProjects(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pickParent = async () => {
    if (!isTauri) return;
    setError(null);
    try {
      const p = await invoke<string | null>('pick_coding_agent_parent_folder');
      setParentPath(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const createProject = async () => {
    if (!isTauri) return;
    const name = newName.trim();
    if (!name) {
      setError('Enter a project display name.');
      return;
    }
    setBusy('create');
    setError(null);
    try {
      await invoke('create_coding_agent_project', {
        displayName: name,
        parentPath: parentPath,
      });
      setNewName('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const deleteProject = async (p: CodingAgentProjectRecord) => {
    if (!isTauri) return;
    const ok = window.confirm(`Remove "${p.displayName}" from the registry?`);
    if (!ok) return;
    const removeFiles = window.confirm(
      'Click OK to also delete the project folder from disk. Cancel keeps files and only removes the registry entry.',
    );
    setBusy(`delete:${p.id}`);
    setError(null);
    try {
      await invoke('delete_coding_agent_project', { id: p.id, removeFiles });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const buildRelease = async (p: CodingAgentProjectRecord) => {
    if (!isTauri) return;
    setBusy(`build:${p.id}`);
    setError(null);
    try {
      const exePath = await invoke<string>('build_coding_agent_project_release', { id: p.id });
      window.alert(`Release build OK:\n${exePath}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const launchInspector = async (p: CodingAgentProjectRecord) => {
    if (!isTauri) return;
    setBusy(`inspector:${p.id}`);
    setError(null);
    try {
      await invoke('open_mcp_inspector_for_project', { id: p.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const inputStyle = {
    background: 'var(--panel-input-bg)',
    border: '1px solid var(--panel-input-border)',
    color: 'var(--panel-text)',
  } as const;

  const btnBase =
    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const btnGhostStyle = {
    borderColor: 'var(--panel-border)',
    background: 'var(--panel-bg-hover)',
    color: 'var(--panel-text)',
  } as const;
  const btnPrimaryStyle = {
    borderColor: 'var(--panel-accent-border)',
    background: 'var(--panel-accent-bg)',
    color: 'var(--panel-accent-text)',
  } as const;

  return (
    <div
      className="mx-auto flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-xl"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        color: 'var(--panel-text)',
      }}
    >
      <div
        className="flex items-start justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--panel-border)' }}
      >
        <div>
          <SovereignTitle className="flex items-center gap-2 text-lg">
            <Code2 className="h-5 w-5" style={{ color: 'var(--panel-accent-text)' }} aria-hidden />
            Coding agent
          </SovereignTitle>
          <SovereignDescription className="mt-1 text-sm">
            Projects are stored in your local AI OS database (not hardcoded). Use Rust + Node (npx) on your PATH.
          </SovereignDescription>
        </div>
        <button type="button" className={btnBase} onClick={onClose} style={btnGhostStyle}>
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {!isTauri && (
          <p className="mb-4 text-sm" style={{ color: 'var(--panel-text-muted)' }}>
            Run the Tauri desktop app to create MCP projects and open the inspector. Browser dev mode has no SQLite
            backing.
          </p>
        )}

        {error && (
          <div
            className="mb-4 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--panel-accent-border)',
              background: 'var(--panel-surface)',
              color: 'var(--panel-text)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
            Getting started
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: 'var(--panel-text-muted)' }}>
            <li>Create a project (runs <code className="text-xs">cargo new</code> on your machine).</li>
            <li>Build a release binary, then open the MCP Inspector (uses <code className="text-xs">npx</code>).</li>
            <li>
              Follow the{' '}
              <button
                type="button"
                className="underline"
                style={{ color: 'var(--panel-accent-text)' }}
                onClick={() => {
                  void open(DOCS_URL);
                }}
              >
                Rust MCP SDK getting started
              </button>{' '}
              guide to add tools to the generated crate.
            </li>
          </ol>
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
            New project
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                Display name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My MCP server"
                disabled={!isTauri || busy !== null}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              className={btnBase}
              onClick={() => void pickParent()}
              disabled={!isTauri || busy !== null}
              style={btnGhostStyle}
            >
              <FolderOpen className="mr-2 inline h-4 w-4" aria-hidden />
              Parent folder
            </button>
            <button
              type="button"
              className={btnBase}
              onClick={() => void createProject()}
              disabled={!isTauri || busy !== null}
              style={btnPrimaryStyle}
            >
              Create
            </button>
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            {parentPath
              ? `Parent: ${parentPath}`
              : 'Default parent: app data / coding_agent_projects (optional: choose a parent folder).'}
          </p>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
              Your projects
            </h3>
            <button type="button" className={btnBase} onClick={() => void refresh()} style={btnGhostStyle}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {projects.length === 0 && !loading && (
            <p className="text-sm" style={{ color: 'var(--panel-text-muted)' }}>
              No projects yet. Create one above.
            </p>
          )}
          <ul className="space-y-2">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: 'var(--panel-border)', background: 'var(--panel-surface)' }}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.displayName}</div>
                  <div className="truncate text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                    {p.packageName} · {p.rootPath}
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnBase}
                    onClick={() => void buildRelease(p)}
                    disabled={busy !== null}
                    style={btnGhostStyle}
                  >
                    <Play className="mr-1 inline h-3 w-3" aria-hidden />
                    Build release
                  </button>
                  <button
                    type="button"
                    className={btnBase}
                    onClick={() => void launchInspector(p)}
                    disabled={busy !== null}
                    style={btnPrimaryStyle}
                  >
                    MCP Inspector
                  </button>
                  <button
                    type="button"
                    className={btnBase}
                    onClick={() => void deleteProject(p)}
                    disabled={busy !== null}
                    style={btnGhostStyle}
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" aria-hidden />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

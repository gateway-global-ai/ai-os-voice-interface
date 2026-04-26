/**
 * Tool Registry Panel — Enable/disable and view all registered tools.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable,
  AdminButton, Badge, EmptyState,
  confirmAdminDestructiveAction, formatAdminMutationError,
} from './adminShared';

interface ToolRow {
  tool_id: string;
  name: string;
  category: string | null;
  enabled: boolean;
  sort_order: number;
  description: string | null;
}

export function ToolRegistryPanel() {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchTools = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('tools')
        .select('*')
        .order('sort_order');
      if (e) throw e;
      setTools((data as ToolRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTools(); }, [fetchTools]);

  const toggleTool = async (tool: ToolRow) => {
    if (!supabase) return;
    const nextState = !tool.enabled;
    if (
      !confirmAdminDestructiveAction(
        `${nextState ? 'Enable' : 'Disable'} tool "${tool.name}"?`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const { error: e } = await supabase
        .from('tools')
        .update({ enabled: nextState } as never)
        .eq('tool_id', tool.tool_id);
      if (e) throw e;
      setTools((prev) => prev.map((t) => t.tool_id === tool.tool_id ? { ...t, enabled: nextState } : t));
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, `Unable to ${nextState ? 'enable' : 'disable'} "${tool.name}".`));
    }
  };

  const filtered = tools.filter((t) =>
    !filter || t.name.toLowerCase().includes(filter.toLowerCase()) || (t.category ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  const categories = Array.from(new Set(tools.map((t) => t.category ?? 'Uncategorized')));

  const cols = [
    { key: 'sort_order', header: '#',        width: '3rem' },
    { key: 'name',       header: 'Name',     render: (r: ToolRow) => <strong>{r.name}</strong> },
    { key: 'tool_id',    header: 'Tool ID',  render: (r: ToolRow) => <code style={{ fontSize: '0.7rem' }}>{r.tool_id}</code> },
    { key: 'category',   header: 'Category', render: (r: ToolRow) => <Badge label={r.category ?? 'none'} color="gray" /> },
    { key: 'description',header: 'Description', render: (r: ToolRow) => <span style={{ color: 'var(--panel-text-muted)' }}>{r.description ?? '—'}</span> },
    { key: 'enabled',    header: 'Status',   render: (r: ToolRow) => <Badge label={r.enabled ? 'Enabled' : 'Disabled'} color={r.enabled ? 'green' : 'red'} /> },
  ];

  return (
    <AdminSection
      title="Tool Registry"
      subtitle={`${tools.filter((t) => t.enabled).length} / ${tools.length} tools enabled across ${categories.length} categories.`}
    >
      {error && <ErrorBox message={error} />}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {categories.slice(0, 6).map((cat) => {
          const catTools = tools.filter((t) => (t.category ?? 'Uncategorized') === cat);
          const enabled = catTools.filter((t) => t.enabled).length;
          return (
            <div key={cat}>
              <Card style={{ padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--panel-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{enabled}/{catTools.length}</div>
              </Card>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or category…"
          style={{
            background: 'var(--panel-input-bg)', border: '1px solid var(--panel-input-border)',
            borderRadius: '0.375rem', color: 'var(--panel-text)', padding: '0.35rem 0.625rem',
            fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', width: '16rem',
          }}
        />
        <AdminButton onClick={() => void fetchTools()}>Refresh</AdminButton>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && filtered.length === 0 && <EmptyState message="No tools found. Run the seed script to populate the tools registry." />}
      {!loading && filtered.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            cols={cols as unknown as Parameters<typeof DataTable>[0]['cols']}
            rows={filtered as unknown as Record<string, unknown>[]}
            getRowKey={(r) => (r as unknown as ToolRow).tool_id}
            onEdit={(r) => void toggleTool(r as unknown as ToolRow)}
            editLabel="Toggle"
          />
        </Card>
      )}
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--panel-text-muted)' }}>
        Click Edit to toggle enabled/disabled state.
      </p>
    </AdminSection>
  );
}

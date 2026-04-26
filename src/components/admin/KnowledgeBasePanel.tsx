/**
 * Knowledge Base Panel — Edit knowledge_base entries, toggle enabled/disabled.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable,
  AdminButton, AdminInput, AdminTextarea, Badge, EmptyState,
  confirmAdminDestructiveAction, formatAdminMutationError,
} from './adminShared';

interface KBRow {
  entry_id: string;
  trigger: string | null;
  content: string;
  category: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function KnowledgeBasePanel() {
  const [entries, setEntries] = useState<KBRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<Partial<KBRow> | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [filter, setFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('category')
        .order('updated_at', { ascending: false });
      if (e) throw e;
      setEntries((data as KBRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchEntries(); }, [fetchEntries]);

  const saveEntry = async () => {
    if (!supabase || !editEntry) return;
    setError(null);
    setSaveMsg('Saving…');
    try {
      if (editEntry.entry_id) {
        const { error: e } = await supabase
          .from('knowledge_base')
          .update({ trigger: editEntry.trigger ?? null, content: editEntry.content!, category: editEntry.category ?? null, enabled: !!editEntry.enabled } as never)
          .eq('entry_id', editEntry.entry_id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from('knowledge_base')
          .insert({ trigger: editEntry.trigger ?? null, content: editEntry.content!, category: editEntry.category ?? null, enabled: !!editEntry.enabled } as never);
        if (e) throw e;
      }
      setSaveMsg('Saved ✓');
      setEditEntry(null);
      await fetchEntries();
    } catch (e: unknown) {
      setSaveMsg('');
      setError(formatAdminMutationError(e, 'Unable to save knowledge base entry.'));
    }
  };

  const deleteEntry = async (entry: KBRow) => {
    if (!supabase || !confirmAdminDestructiveAction(`Delete entry "${entry.trigger ?? entry.entry_id}"?`)) return;
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('knowledge_base').delete().eq('entry_id', entry.entry_id);
      if (deleteError) throw deleteError;
      await fetchEntries();
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, `Unable to delete "${entry.trigger ?? entry.entry_id}".`));
    }
  };

  const categories = Array.from(new Set(entries.map((e) => e.category ?? 'uncategorized')));
  const filtered = entries.filter((e) =>
    (!filter || (e.trigger ?? '').toLowerCase().includes(filter.toLowerCase()) || e.content.toLowerCase().includes(filter.toLowerCase())) &&
    (!catFilter || (e.category ?? 'uncategorized') === catFilter),
  );

  const cols = [
    { key: 'category', header: 'Category', render: (r: KBRow) => <Badge label={r.category ?? 'uncategorized'} color="gray" /> },
    { key: 'trigger',  header: 'Trigger',  render: (r: KBRow) => r.trigger ? <code style={{ fontSize: '0.75rem' }}>{r.trigger}</code> : <span style={{ color: 'var(--panel-text-muted)' }}>—</span> },
    { key: 'content',  header: 'Content',  render: (r: KBRow) => <span style={{ color: 'var(--panel-text-muted)' }}>{r.content.slice(0, 80)}{r.content.length > 80 ? '…' : ''}</span> },
    { key: 'enabled',  header: 'Status',   render: (r: KBRow) => <Badge label={r.enabled ? 'Active' : 'Disabled'} color={r.enabled ? 'green' : 'red'} /> },
    { key: 'updated_at', header: 'Updated', render: (r: KBRow) => new Date(r.updated_at).toLocaleDateString() },
  ];

  return (
    <AdminSection
      title="Knowledge Base"
      subtitle={`${entries.filter((e) => e.enabled).length} active / ${entries.length} total entries across ${categories.length} categories.`}
    >
      {error && <ErrorBox message={error} />}
      {saveMsg && <div style={{ padding: '0.5rem', color: 'var(--panel-accent-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{saveMsg}</div>}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search content or trigger…"
          style={{
            background: 'var(--panel-input-bg)', border: '1px solid var(--panel-input-border)',
            borderRadius: '0.375rem', color: 'var(--panel-text)', padding: '0.35rem 0.625rem',
            fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', width: '16rem',
          }}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={{
            background: 'var(--panel-input-bg)', border: '1px solid var(--panel-input-border)',
            borderRadius: '0.375rem', color: 'var(--panel-text)', padding: '0.35rem 0.625rem',
            fontSize: '0.8125rem', fontFamily: 'inherit',
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <AdminButton variant="primary" onClick={() => setEditEntry({ enabled: true, category: 'general' })}>+ Add Entry</AdminButton>
        <AdminButton onClick={() => void fetchEntries()}>Refresh</AdminButton>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && filtered.length === 0 && <EmptyState message="No entries found. Run the seed script to populate the knowledge base." />}
      {!loading && filtered.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <DataTable
            cols={cols as unknown as Parameters<typeof DataTable>[0]['cols']}
            rows={filtered as unknown as Record<string, unknown>[]}
            getRowKey={(r) => (r as unknown as KBRow).entry_id}
            onEdit={(r) => setEditEntry({ ...(r as unknown as KBRow) })}
            onDelete={(r) => void deleteEntry(r as unknown as KBRow)}
          />
        </Card>
      )}

      {/* Edit form */}
      {editEntry && (
        <Card>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {editEntry.entry_id ? 'Edit Entry' : 'New Entry'}
          </h4>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Trigger (keyword/slug)</label>
                <AdminInput value={editEntry.trigger ?? ''} onChange={(v) => setEditEntry({ ...editEntry, trigger: v || null })} placeholder="e.g. suppressed_exceptions" />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Category</label>
                <AdminInput value={editEntry.category ?? ''} onChange={(v) => setEditEntry({ ...editEntry, category: v || null })} placeholder="engineering / lesson / general" />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Content</label>
              <AdminTextarea
                value={editEntry.content ?? ''}
                onChange={(v) => setEditEntry({ ...editEntry, content: v })}
                placeholder="Entry content (text or JSON string)"
                rows={6}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!editEntry.enabled} onChange={(e) => setEditEntry({ ...editEntry, enabled: e.target.checked })} />
              Active (visible to the system)
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <AdminButton variant="primary" onClick={() => void saveEntry()}>Save</AdminButton>
            <AdminButton onClick={() => { setEditEntry(null); setSaveMsg(''); }}>Cancel</AdminButton>
          </div>
        </Card>
      )}
    </AdminSection>
  );
}

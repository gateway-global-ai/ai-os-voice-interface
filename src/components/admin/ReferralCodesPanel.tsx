/**
 * Referral Codes Panel — Manage referral codes, view usage counts.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable,
  AdminButton, AdminInput, Badge, EmptyState,
  confirmAdminDestructiveAction, formatAdminMutationError,
} from './adminShared';

interface CodeRow {
  code: string;
  description: string | null;
  active: boolean;
  uses_count: number;
  created_at: string;
}

export function ReferralCodesPanel() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const fetchCodes = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setError(null);
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (e) throw e;
      setCodes((data as CodeRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCodes(); }, [fetchCodes]);

  const toggleCode = async (code: CodeRow) => {
    if (!supabase) return;
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('referral_codes')
        .update({ active: !code.active } as never)
        .eq('code', code.code);
      if (updateError) throw updateError;
      setCodes((prev) => prev.map((c) => c.code === code.code ? { ...c, active: !c.active } : c));
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, `Unable to update referral code "${code.code}".`));
    }
  };

  const deleteCode = async (code: CodeRow) => {
    if (!supabase || !confirmAdminDestructiveAction(`Delete code "${code.code}"?`)) return;
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('referral_codes').delete().eq('code', code.code);
      if (deleteError) throw deleteError;
      await fetchCodes();
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, `Unable to delete referral code "${code.code}".`));
    }
  };

  const addCode = async () => {
    if (!supabase || !newCode.trim()) return;
    setError(null);
    setSaveMsg('Adding…');
    const normalized = newCode.trim().toUpperCase().replace(/\s+/g, '-');
    try {
      const { error: insertError } = await supabase
        .from('referral_codes')
        .insert({ code: normalized, description: newDesc.trim() || null, active: true } as never);
      if (insertError) throw insertError;
      setSaveMsg(`Added ${normalized} ✓`);
      setNewCode('');
      setNewDesc('');
      await fetchCodes();
    } catch (e: unknown) {
      setSaveMsg('');
      setError(formatAdminMutationError(e, `Unable to add referral code "${normalized}".`));
    }
  };

  const cols = [
    { key: 'code',        header: 'Code',       render: (r: CodeRow) => <code style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.code}</code> },
    { key: 'description', header: 'Description', render: (r: CodeRow) => r.description ?? <span style={{ color: 'var(--panel-text-muted)' }}>—</span> },
    { key: 'uses_count',  header: 'Uses',        width: '5rem', render: (r: CodeRow) => String(r.uses_count) },
    { key: 'active',      header: 'Status',      render: (r: CodeRow) => <Badge label={r.active ? 'Active' : 'Disabled'} color={r.active ? 'green' : 'red'} /> },
    { key: 'created_at',  header: 'Created',     render: (r: CodeRow) => new Date(r.created_at).toLocaleDateString() },
  ];

  const active = codes.filter((c) => c.active).length;
  const totalUses = codes.reduce((s, c) => s + c.uses_count, 0);

  return (
    <AdminSection title="Referral Codes" subtitle="Manage early-access referral codes. Users enter these on the guest entry screen.">
      {error && <ErrorBox message={error} />}
      {saveMsg && <div style={{ padding: '0.5rem', color: 'var(--panel-accent-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{saveMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Codes',  value: codes.length },
          { label: 'Active',       value: active },
          { label: 'Total Uses',   value: totalUses },
        ].map((stat) => (
          <div key={stat.label}>
            <Card style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--panel-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stat.value}</div>
            </Card>
          </div>
        ))}
      </div>

      {/* Add new code */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Add New Code</h4>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '10rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Code</label>
            <AdminInput
              value={newCode}
              onChange={setNewCode}
              placeholder="e.g. BETA-LAUNCH"
            />
          </div>
          <div style={{ flex: '2', minWidth: '14rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Description (optional)</label>
            <AdminInput
              value={newDesc}
              onChange={setNewDesc}
              placeholder="e.g. Beta launch cohort"
            />
          </div>
          <AdminButton variant="primary" onClick={() => void addCode()} disabled={!newCode.trim()}>
            Add Code
          </AdminButton>
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Codes ({codes.length})</h3>
        <AdminButton onClick={() => void fetchCodes()}>Refresh</AdminButton>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && codes.length === 0 && <EmptyState message="No codes yet. Run the seed script to add default codes, or add one above." />}
      {!loading && codes.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            cols={cols as unknown as Parameters<typeof DataTable>[0]['cols']}
            rows={codes as unknown as Record<string, unknown>[]}
            getRowKey={(r) => (r as unknown as CodeRow).code}
            onEdit={(r) => void toggleCode(r as unknown as CodeRow)}
            onDelete={(r) => void deleteCode(r as unknown as CodeRow)}
          />
        </Card>
      )}
      <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--panel-text-muted)' }}>
        Click Edit to toggle active/disabled. Disabled codes cannot be used at the guest entry screen.
      </p>
    </AdminSection>
  );
}

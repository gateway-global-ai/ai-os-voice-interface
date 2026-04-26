/**
 * User Manager Panel — View/edit users, shell_preferences, user_plans.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable,
  AdminButton, AdminInput, Badge, EmptyState,
  confirmAdminDestructiveAction, formatAdminMutationError,
} from './adminShared';

interface UserRow {
  id: string;
  phone: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company: string | null;
  role: string | null;
  interface_mode: string | null;
  created_at: string;
}

interface PrefsRow {
  id: string;
  user_id: string;
  surface_mode: string | null;
  voice_route_id: string | null;
  updated_at: string;
}

export function UserManagerPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [prefs, setPrefs] = useState<PrefsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<Partial<UserRow> | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [filter, setFilter] = useState('');

  const fetchData = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setError(null);
    setLoading(true);
    try {
      const [usersRes, prefsRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('shell_preferences').select('*'),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (prefsRes.error) throw prefsRes.error;
      setUsers((usersRes.data as UserRow[]) ?? []);
      setPrefs((prefsRes.data as PrefsRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const saveUser = async () => {
    if (!supabase || !editUser?.id) return;
    setError(null);
    setSaveMsg('Saving…');
    try {
      const { error: e } = await supabase
        .from('users')
        .update({
          display_name: editUser.display_name ?? null,
          first_name: editUser.first_name ?? null,
          last_name: editUser.last_name ?? null,
          email: editUser.email ?? null,
          company: editUser.company ?? null,
          role: editUser.role ?? null,
        } as never)
        .eq('id', editUser.id);
      if (e) throw e;
      setSaveMsg('Saved ✓');
      setEditUser(null);
      await fetchData();
    } catch (e: unknown) {
      setSaveMsg('');
      setError(formatAdminMutationError(e, 'Unable to save user changes.'));
    }
  };

  const resetPrefs = async (userId: string) => {
    if (!supabase || !confirmAdminDestructiveAction('Reset shell preferences for this user?')) return;
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('shell_preferences').delete().eq('user_id', userId);
      if (deleteError) throw deleteError;
      await fetchData();
    } catch (e: unknown) {
      setError(formatAdminMutationError(e, 'Unable to reset shell preferences for this user.'));
    }
  };

  const filtered = users.filter((u) =>
    !filter ||
    (u.display_name ?? '').toLowerCase().includes(filter.toLowerCase()) ||
    (u.phone ?? '').includes(filter) ||
    (u.email ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  const userCols = [
    { key: 'display_name', header: 'Name',     render: (r: UserRow) => r.display_name ?? <span style={{ color: 'var(--panel-text-muted)' }}>—</span> },
    { key: 'phone',        header: 'Phone',    render: (r: UserRow) => r.phone ?? '—' },
    { key: 'email',        header: 'Email',    render: (r: UserRow) => r.email ?? '—' },
    { key: 'company',      header: 'Company',  render: (r: UserRow) => r.company ?? '—' },
    { key: 'interface_mode', header: 'Mode',   render: (r: UserRow) => <Badge label={r.interface_mode ?? 'voice'} color="gray" /> },
    {
      key: 'prefs',
      header: 'Preferences',
      render: (r: UserRow) => {
        const p = prefs.find((pp) => pp.user_id === r.id);
        return p ? <Badge label={p.voice_route_id ?? 'default'} color="green" /> : <span style={{ color: 'var(--panel-text-muted)' }}>none</span>;
      },
    },
    { key: 'created_at', header: 'Joined', render: (r: UserRow) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <AdminSection title="User Manager" subtitle="View and edit registered users, reset preferences.">
      {error && <ErrorBox message={error} />}
      {saveMsg && <div style={{ padding: '0.5rem', color: 'var(--panel-accent-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{saveMsg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Users',    value: users.length },
          { label: 'With Prefs',     value: prefs.length },
          { label: 'Voice Mode',     value: users.filter((u) => u.interface_mode === 'voice').length },
          { label: 'Chat Mode',      value: users.filter((u) => u.interface_mode === 'chat').length },
        ].map((stat) => (
          <div key={stat.label}>
            <Card style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--panel-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stat.value}</div>
            </Card>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, phone, or email…"
          style={{
            background: 'var(--panel-input-bg)', border: '1px solid var(--panel-input-border)',
            borderRadius: '0.375rem', color: 'var(--panel-text)', padding: '0.35rem 0.625rem',
            fontSize: '0.8125rem', fontFamily: 'inherit', outline: 'none', width: '18rem',
          }}
        />
        <AdminButton onClick={() => void fetchData()}>Refresh</AdminButton>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && filtered.length === 0 && <EmptyState message="No users yet. Users are created when someone completes phone OTP verification." />}
      {!loading && filtered.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <DataTable
            cols={userCols as unknown as Parameters<typeof DataTable>[0]['cols']}
            rows={filtered as unknown as Record<string, unknown>[]}
            getRowKey={(r) => (r as unknown as UserRow).id}
            onEdit={(r) => setEditUser({ ...(r as unknown as UserRow) })}
            onDelete={(r) => void resetPrefs((r as unknown as UserRow).id)}
            deleteLabel="Reset Prefs"
          />
        </Card>
      )}

      {/* Edit form */}
      {editUser && (
        <Card>
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600 }}>Edit User</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            {[
              { key: 'display_name', label: 'Display Name' },
              { key: 'first_name',   label: 'First Name' },
              { key: 'last_name',    label: 'Last Name' },
              { key: 'email',        label: 'Email' },
              { key: 'company',      label: 'Company' },
              { key: 'role',         label: 'Role' },
            ].map((field) => (
              <div key={field.key}>
                <label style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)', display: 'block', marginBottom: '0.25rem' }}>{field.label}</label>
                <AdminInput
                  value={(editUser[field.key as keyof UserRow] as string) ?? ''}
                  onChange={(v) => setEditUser({ ...editUser, [field.key]: v || null })}
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <AdminButton variant="primary" onClick={() => void saveUser()}>Save</AdminButton>
            <AdminButton onClick={() => { setEditUser(null); setSaveMsg(''); }}>Cancel</AdminButton>
          </div>
        </Card>
      )}
    </AdminSection>
  );
}

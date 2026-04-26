/**
 * Shell State Panel — Live view of shell sessions and local shell state.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable,
  Badge, AdminButton, EmptyState,
} from './adminShared';
import { readOnboardingProfile, getSupabaseUserId } from '../../onboarding/onboardingState';
import { getVoiceRoute } from '../../config/voiceRoutePreference';

interface SessionRow {
  id: string;
  user_id: string | null;
  session_token: string;
  entry_mode: string | null;
  surface_mode: string | null;
  created_at: string;
  last_active_at: string;
}

export function ShellStatePanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state snapshot
  const localProfile = readOnboardingProfile();
  const supabaseUserId = getSupabaseUserId();
  const voiceRoute = getVoiceRoute();
  const surfaceMode = (() => { try { return sessionStorage.getItem('aios.shell.surfaceMode') ?? 'primary'; } catch { return 'primary'; } })();

  const fetchSessions = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabase
        .from('shell_sessions')
        .select('*')
        .order('last_active_at', { ascending: false })
        .limit(50);
      if (e) throw e;
      setSessions((data as SessionRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  const cols = [
    { key: 'id',             header: 'Session ID',    width: '13rem', render: (r: SessionRow) => <code style={{ fontSize: '0.7rem' }}>{r.id.slice(0, 16)}…</code> },
    { key: 'user_id',        header: 'User ID',        width: '10rem', render: (r: SessionRow) => r.user_id ? <code style={{ fontSize: '0.7rem' }}>{r.user_id.slice(0, 12)}…</code> : <span style={{ color: 'var(--panel-text-muted)' }}>guest</span> },
    { key: 'surface_mode',   header: 'Surface Mode',   render: (r: SessionRow) => <Badge label={r.surface_mode ?? 'primary'} color={r.surface_mode === 'primary' ? 'green' : 'gray'} /> },
    { key: 'entry_mode',     header: 'Entry',          render: (r: SessionRow) => r.entry_mode ?? '—' },
    { key: 'created_at',     header: 'Created',        render: (r: SessionRow) => new Date(r.created_at).toLocaleString() },
    { key: 'last_active_at', header: 'Last Active',    render: (r: SessionRow) => new Date(r.last_active_at).toLocaleString() },
  ];

  return (
    <AdminSection title="Shell State" subtitle="Live sessions and current client state snapshot.">
      {/* Local state snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Surface Mode',    value: surfaceMode },
          { label: 'Voice Route',     value: voiceRoute },
          { label: 'Commander Name',  value: localProfile?.commander_name ?? 'Not set' },
          { label: 'Interface Mode',  value: localProfile?.interface_mode ?? 'Not set' },
          { label: 'Supabase User ID',value: supabaseUserId ? supabaseUserId.slice(0, 16) + '…' : 'Guest (no sync)' },
          { label: 'Onboarding',      value: localStorage.getItem('aios_onboarding_complete') === 'true' ? 'Complete' : 'Pending' },
          { label: 'OTP Verified',    value: localStorage.getItem('aios_otp_verified') === 'true' ? 'Yes' : 'No' },
        ].map((item) => (
          <div key={item.label}>
            <Card style={{ padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--panel-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.value}</div>
            </Card>
          </div>
        ))}
      </div>

      {/* Sessions table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Recent Sessions ({sessions.length})</h3>
        <AdminButton onClick={() => void fetchSessions()}>Refresh</AdminButton>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <LoadingSpinner />}
      {!loading && !error && sessions.length === 0 && (
        <EmptyState message="No sessions recorded yet. Sessions are created when users visit the app after migration." />
      )}
      {!loading && sessions.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <DataTable
            cols={cols}
            rows={sessions as unknown as Record<string, unknown>[]}
            getRowKey={(r) => (r as unknown as SessionRow).id}
          />
        </Card>
      )}
    </AdminSection>
  );
}

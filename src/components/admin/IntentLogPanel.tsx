/**
 * Intent Log Panel — Read-only CANI intent + outcome history.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { Database } from '../../lib/supabaseTypes';
import {
  AdminSection, Card, LoadingSpinner, ErrorBox, DataTable, AdminButton, EmptyState, Badge,
} from './adminShared';

type IntentRow = Database['public']['Tables']['intents']['Row'];
type OutcomeRow = Database['public']['Tables']['outcomes']['Row'];
type ActionEvidenceRow = Pick<Database['public']['Tables']['actions']['Row'], 'action_id' | 'intent_id'> & {
  outcomes: OutcomeRow[] | null;
};
type IntentEvidenceRow = IntentRow & {
  actions: ActionEvidenceRow[] | null;
};

function RatingBar({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: 'var(--panel-text-muted)' }}>—</span>;
  const pct = (value / 5) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ width: '3rem', height: '0.375rem', background: 'var(--panel-border)', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--panel-accent-border)', borderRadius: '9999px' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--panel-text-muted)' }}>{value}/5</span>
    </div>
  );
}

export function IntentLogPanel() {
  const [intents, setIntents] = useState<IntentEvidenceRow[]>([]);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!supabase) { setError('Supabase not configured'); return; }
    setLoading(true);
    try {
      const intentsRes = await supabase
        .from('intents')
        .select(`
          intent_id,
          user_id,
          primary_intent,
          desired_outcome,
          leverage_rating,
          proven_path_rating,
          purpose_rating,
          plan_rating,
          outcome_rating,
          created_at,
          actions (
            action_id,
            intent_id,
            outcomes (
              outcome_id,
              action_id,
              description,
              success_flag,
              score,
              timestamp
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (intentsRes.error) throw intentsRes.error;
      setIntents((intentsRes.data as IntentEvidenceRow[]) ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const intentCols = [
    { key: 'created_at',      header: 'Date',      width: '9rem', render: (r: IntentRow) => new Date(r.created_at).toLocaleDateString() },
    { key: 'primary_intent',  header: 'Intent',    render: (r: IntentRow) => <span title={r.primary_intent}>{r.primary_intent.slice(0, 60)}{r.primary_intent.length > 60 ? '…' : ''}</span> },
    { key: 'desired_outcome', header: 'Outcome',   render: (r: IntentRow) => <span style={{ color: 'var(--panel-text-muted)' }}>{(r.desired_outcome ?? '—').slice(0, 40)}</span> },
    { key: 'leverage_rating', header: 'Leverage',  render: (r: IntentRow) => <RatingBar value={r.leverage_rating} /> },
    { key: 'plan_rating',     header: 'Plan',      render: (r: IntentRow) => <RatingBar value={r.plan_rating} /> },
    { key: 'outcome_rating',  header: 'Outcome ★', render: (r: IntentRow) => <RatingBar value={r.outcome_rating} /> },
  ];

  const outcomeCols = [
    { key: 'timestamp',   header: 'Time',    width: '9rem', render: (r: OutcomeRow) => new Date(r.timestamp).toLocaleTimeString() },
    { key: 'description', header: 'Result',  render: (r: OutcomeRow) => (r.description ?? '—').slice(0, 80) },
    { key: 'success_flag',header: 'Status',  render: (r: OutcomeRow) => <Badge label={r.success_flag === true ? 'Success' : r.success_flag === false ? 'Failed' : 'Unknown'} color={r.success_flag ? 'green' : 'red'} /> },
    { key: 'score',       header: 'Score',   render: (r: OutcomeRow) => r.score !== null ? String(r.score) : '—' },
  ];

  const allOutcomes = intents
    .flatMap((intent) => intent.actions ?? [])
    .flatMap((action) => action.outcomes ?? [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const selectedOutcomes = selectedIntent
    ? (intents.find((intent) => intent.intent_id === selectedIntent)?.actions ?? [])
      .flatMap((action) => action.outcomes ?? [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : allOutcomes;

  // Summary stats
  const total = intents.length;
  const avgOutcome = intents.filter((i) => i.outcome_rating).reduce((s, i) => s + (i.outcome_rating ?? 0), 0) / (intents.filter((i) => i.outcome_rating).length || 1);

  return (
    <AdminSection title="Intent Log" subtitle="CANI intent history and outcome ratings. Read-only.">
      {error && <ErrorBox message={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Intents',  value: total },
          { label: 'Total Outcomes', value: allOutcomes.length },
          { label: 'Avg Outcome ★',  value: total > 0 ? avgOutcome.toFixed(1) + '/5' : 'N/A' },
        ].map((stat) => (
          <div key={stat.label}>
            <Card style={{ padding: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--panel-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{stat.value}</div>
            </Card>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Intent History</h3>
        <AdminButton onClick={() => void fetchData()}>Refresh</AdminButton>
      </div>

      {loading && <LoadingSpinner />}
      {!loading && intents.length === 0 && <EmptyState message="No intents recorded yet. Intents are logged when users interact with the CANI loop." />}
      {!loading && intents.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
          <DataTable
            cols={intentCols as unknown as Parameters<typeof DataTable>[0]['cols']}
            rows={intents as unknown as Record<string, unknown>[]}
            getRowKey={(r) => (r as unknown as IntentRow).intent_id}
            onEdit={(r) => setSelectedIntent((r as unknown as IntentRow).intent_id === selectedIntent ? null : (r as unknown as IntentRow).intent_id)}
            editLabel="Filter"
          />
        </Card>
      )}

      {allOutcomes.length > 0 && (
        <>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
            Outcomes {selectedIntent ? '(filtered by selected intent)' : `(all ${allOutcomes.length})`}
          </h3>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <DataTable
              cols={outcomeCols as unknown as Parameters<typeof DataTable>[0]['cols']}
              rows={selectedOutcomes as unknown as Record<string, unknown>[]}
              getRowKey={(r) => (r as unknown as OutcomeRow).outcome_id}
            />
          </Card>
        </>
      )}
    </AdminSection>
  );
}

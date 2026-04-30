/**
 * Native 123CheckMe SaaS Admin desktop panel.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AIOS_OPERATOR_TOKEN_KEY, restoreOperatorToken } from '../../core/io/checkmeClient';
import { readOnboardingProfile } from '../../onboarding/onboardingState';

type SectionId =
  | 'overview'
  | 'active-users'
  | 'tenants'
  | 'accounts'
  | 'subscriptions'
  | 'plans'
  | 'activity'
  | 'admins'
  | 'api-health';

type LoadState = 'idle' | 'loading' | 'ready' | 'blocked' | 'error';

type ProxyPayload = {
  upstream?: {
    status: number;
    ok: boolean;
    base: string;
    path: string;
  };
  data?: Record<string, unknown>;
  error?: string;
  status?: string;
};

type SectionState = {
  status: LoadState;
  message?: string;
  payload?: ProxyPayload;
};

type StoredOperatorProfile = {
  phone_number?: string;
  phone?: string;
};

const sections: Array<{ id: SectionId; label: string; intent: string; description: string }> = [
  {
    id: 'overview',
    label: 'Overview',
    intent: '123CheckMe > SaaS Admin > Overview',
    description: 'Counts and source status across tenants, activity, subscriptions, platform plans, and admins.',
  },
  {
    id: 'active-users',
    label: 'Active Users',
    intent: '123CheckMe > SaaS Admin > Active Users',
    description: 'Recent verification activity plus auth-admin state. Live sessions remain unverified until exposed.',
  },
  {
    id: 'tenants',
    label: 'Tenants',
    intent: '123CheckMe > SaaS Admin > Tenants',
    description: 'Customer account records treated as tenant records until a dedicated tenants table exists.',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    intent: '123CheckMe > SaaS Admin > Accounts',
    description: 'Customer account records and supported account update controls.',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    intent: '123CheckMe > SaaS Admin > Subscriptions',
    description: 'Platform subscriptions with legacy subscription records returned side-by-side.',
  },
  {
    id: 'plans',
    label: 'Plans',
    intent: '123CheckMe > SaaS Admin > Plans',
    description: 'Real platform_subscription_plans records with API-key hashes redacted.',
  },
  {
    id: 'activity',
    label: 'Activity',
    intent: '123CheckMe > SaaS Admin > Activity',
    description: 'Verification activity and subscription event history from 123CheckMe.',
  },
  {
    id: 'admins',
    label: 'Admin Controls',
    intent: '123CheckMe > SaaS Admin > Admin Controls',
    description: 'Admin claim inventory and phone-based grant/revoke controls for existing auth users.',
  },
  {
    id: 'api-health',
    label: 'API Health',
    intent: '123CheckMe > SaaS Admin > API Health',
    description: 'Proxy reachability and upstream response details for the SaaS Admin API.',
  },
];

const pageStyle: CSSProperties = {
  minHeight: '100%',
  background: 'var(--panel-bg)',
  color: 'var(--panel-text)',
  padding: '1rem',
};

const cardStyle: CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  borderRadius: '0.875rem',
  padding: '1rem',
};

const mutedStyle: CSSProperties = {
  color: 'var(--panel-text-muted)',
  fontSize: '0.82rem',
  lineHeight: 1.5,
};

const buttonStyle: CSSProperties = {
  border: '1px solid var(--panel-border)',
  background: 'var(--panel-surface)',
  color: 'var(--panel-text)',
  borderRadius: '0.75rem',
  padding: '0.65rem 0.75rem',
  cursor: 'pointer',
  textAlign: 'left',
};

function readOperatorToken(): string | null {
  try {
    return localStorage.getItem(AIOS_OPERATOR_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function checkmeAdminApi(token: string, path: string, init: RequestInit = {}): Promise<ProxyPayload> {
  const response = await fetch(`/__checkme_saas_admin_api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as ProxyPayload;
  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : typeof data.data?.error === 'string'
          ? data.data.error
          : `123CheckMe SaaS Admin API failed (${response.status})`,
    );
  }
  return data;
}

function statusColor(status?: string): string {
  switch (status) {
    case 'verified':
    case 'ready':
      return 'rgb(22 101 52)';
    case 'unverified':
      return 'rgb(146 64 14)';
    case 'blocked':
    case 'error':
      return 'rgb(185 28 28)';
    default:
      return 'var(--panel-text-muted)';
  }
}

function dataStatus(payload?: ProxyPayload): string {
  const value = payload?.data?.status ?? payload?.status;
  return typeof value === 'string' ? value : payload?.upstream?.ok ? 'verified' : 'unverified';
}

function countArray(value: unknown): number | undefined {
  return Array.isArray(value) ? value.length : undefined;
}

function summarizePayload(section: SectionId, payload?: ProxyPayload): Array<{ label: string; value: string }> {
  const data = payload?.data ?? {};
  if (section === 'overview') {
    const stats = (data.stats && typeof data.stats === 'object' ? data.stats : {}) as Record<string, unknown>;
    return Object.entries(stats).map(([key, value]) => ({ label: key.replace(/_/g, ' '), value: String(value ?? 0) }));
  }
  if (section === 'active-users') {
    return [
      { label: 'recent activity rows', value: String(countArray(data.activity) ?? 0) },
      { label: 'admin auth users', value: String(countArray(data.auth_admins) ?? 0) },
      { label: 'auth users scanned', value: String(data.auth_user_count ?? 0) },
    ];
  }
  if (section === 'tenants') return [{ label: 'tenant records', value: String(countArray(data.tenants) ?? 0) }];
  if (section === 'accounts') return [{ label: 'account records', value: String(countArray(data.accounts) ?? 0) }];
  if (section === 'subscriptions') {
    return [
      { label: 'platform subscriptions', value: String(countArray(data.platform_subscriptions) ?? 0) },
      { label: 'legacy subscriptions', value: String(countArray(data.legacy_subscriptions) ?? 0) },
    ];
  }
  if (section === 'plans') return [{ label: 'platform plans', value: String(countArray(data.plans) ?? 0) }];
  if (section === 'activity') {
    return [
      { label: 'verification events', value: String(countArray(data.verification_activity) ?? 0) },
      { label: 'subscription events', value: String(countArray(data.subscription_events) ?? 0) },
    ];
  }
  if (section === 'admins') {
    return [
      { label: 'admin users', value: String(countArray(data.admins) ?? 0) },
      { label: 'auth users scanned', value: String(data.user_count ?? 0) },
    ];
  }
  return [
    { label: 'upstream status', value: String(payload?.upstream?.status ?? 'not checked') },
    { label: 'upstream path', value: payload?.upstream?.path ?? '/api/operator/saas/overview' },
  ];
}

function PreviewTable({ value }: { value: unknown }) {
  const rows = Array.isArray(value) ? value.slice(0, 8) : [];
  if (rows.length === 0) {
    return <p style={mutedStyle}>No rows returned from this endpoint.</p>;
  }
  const keys = Array.from(
    rows.reduce((set, row) => {
      if (row && typeof row === 'object') {
        Object.keys(row as Record<string, unknown>)
          .slice(0, 8)
          .forEach((key) => set.add(key));
      }
      return set;
    }, new Set<string>()),
  ).slice(0, 6);

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--panel-border)', borderRadius: '0.75rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr>
            {keys.map((key) => (
              <th
                key={key}
                style={{
                  textAlign: 'left',
                  padding: '0.55rem',
                  color: 'var(--panel-heading)',
                  background: 'var(--panel-surface)',
                  borderBottom: '1px solid var(--panel-border)',
                }}
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => (
                <td key={key} style={{ padding: '0.55rem', borderBottom: '1px solid var(--panel-border)' }}>
                  {String((row as Record<string, unknown>)[key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function primaryRows(section: SectionId, payload?: ProxyPayload): unknown {
  const data = payload?.data ?? {};
  if (section === 'active-users') return data.activity;
  if (section === 'tenants') return data.tenants;
  if (section === 'accounts') return data.accounts;
  if (section === 'subscriptions') return data.platform_subscriptions;
  if (section === 'plans') return data.plans;
  if (section === 'activity') return data.verification_activity;
  if (section === 'admins') return data.admins;
  return [];
}

export function CheckmeSaasAdminPanel() {
  const [operatorToken, setOperatorToken] = useState<string | null>(() => readOperatorToken());
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [sectionState, setSectionState] = useState<Record<SectionId, SectionState>>({} as Record<SectionId, SectionState>);
  const [adminPhone, setAdminPhone] = useState('');
  const [controlMessage, setControlMessage] = useState<string | null>(null);

  useEffect(() => {
    if (operatorToken) return;
    const profile = readOnboardingProfile() as StoredOperatorProfile | null;
    const phone = profile?.phone_number?.trim() || profile?.phone?.trim();
    if (!phone) {
      setSectionState((prev) => ({
        ...prev,
        overview: {
          status: 'blocked',
          message: 'No verified phone number was found in this browser session. Log out and verify with your operator phone, then reopen 123CheckMe Admin.',
        },
      }));
      return;
    }
    let cancelled = false;
    restoreOperatorToken(phone)
      .then((token) => {
        if (!cancelled && token) {
          setOperatorToken(token);
        } else if (!cancelled) {
          setSectionState((prev) => ({
            ...prev,
            overview: {
              status: 'blocked',
              message: 'The verified phone session was restored, but the server did not issue an operator token for this phone.',
            },
          }));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setSectionState((prev) => ({
          ...prev,
          overview: {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          },
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [operatorToken]);

  const activeConfig = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection],
  );

  const loadSection = useCallback(
    async (sectionId: SectionId = activeSection) => {
      if (!operatorToken) {
        setSectionState((prev) => ({
          ...prev,
          [sectionId]: { status: 'blocked', message: 'Operator token is required before loading 123CheckMe admin data.' },
        }));
        return;
      }
      const path = sectionId === 'api-health' ? '/overview' : `/${sectionId}`;
      setSectionState((prev) => ({ ...prev, [sectionId]: { status: 'loading' } }));
      try {
        const payload = await checkmeAdminApi(operatorToken, path);
        const status = dataStatus(payload);
        setSectionState((prev) => ({
          ...prev,
          [sectionId]: {
            status: status === 'blocked' ? 'blocked' : 'ready',
            message: status,
            payload,
          },
        }));
      } catch (error) {
        setSectionState((prev) => ({
          ...prev,
          [sectionId]: { status: 'error', message: error instanceof Error ? error.message : String(error) },
        }));
      }
    },
    [activeSection, operatorToken],
  );

  useEffect(() => {
    if (!operatorToken) return;
    void loadSection('overview');
    // Load the start page once per restored/operator session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorToken]);

  const runAdminControl = useCallback(
    async (action: 'grant-phone' | 'revoke-phone') => {
      if (!operatorToken) {
        setControlMessage('Operator token is required before changing admin state.');
        return;
      }
      setControlMessage('Sending admin control request...');
      try {
        const payload = await checkmeAdminApi(operatorToken, `/admins/${action}`, {
          method: 'POST',
          body: JSON.stringify({ phone: adminPhone }),
        });
        setControlMessage(`Control result: ${dataStatus(payload)}`);
        await loadSection('admins');
      } catch (error) {
        setControlMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [adminPhone, loadSection, operatorToken],
  );

  const state = sectionState[activeSection] ?? { status: 'idle' };
  const payload = state.payload;
  const summaries = summarizePayload(activeSection, payload);

  return (
    <div style={pageStyle}>
      <section
        style={{
          ...cardStyle,
          background: 'linear-gradient(135deg, rgb(239 246 255), rgb(255 255 255))',
          marginBottom: '1rem',
        }}
      >
        <p style={{ color: 'var(--panel-accent-text)', fontSize: '0.72rem', fontWeight: 800, margin: 0 }}>
          123CHECKME.COM
        </p>
        <h1 style={{ color: 'var(--panel-heading)', fontSize: '1.7rem', margin: '0.25rem 0' }}>
          123CheckMe SaaS Admin
        </h1>
        <p style={{ ...mutedStyle, maxWidth: '54rem', margin: 0 }}>
          Native AI OS management for 123CheckMe endpoint results, active-user evidence, tenants, customer accounts,
          subscriptions, plans, activity, and admin controls. All data loads through the AI OS operator proxy and real
          123CheckMe APIs.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(14rem, 18rem) minmax(0, 1fr)', gap: '1rem' }}>
        <aside style={{ ...cardStyle, alignSelf: 'start', position: 'sticky', top: '1rem' }}>
          <h2 style={{ color: 'var(--panel-heading)', fontSize: '0.95rem', margin: '0 0 0.75rem' }}>
            Intent Menu Paths
          </h2>
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActiveSection(section.id);
                  void loadSection(section.id);
                }}
                style={{
                  ...buttonStyle,
                  background: activeSection === section.id ? 'var(--panel-accent-bg)' : 'var(--panel-surface)',
                  borderColor: activeSection === section.id ? 'var(--panel-accent-border)' : 'var(--panel-border)',
                }}
              >
                <strong style={{ display: 'block', color: 'var(--panel-heading)', fontSize: '0.82rem' }}>
                  {section.label}
                </strong>
                <span style={{ ...mutedStyle, fontSize: '0.68rem' }}>{section.intent}</span>
              </button>
            ))}
          </div>
        </aside>

        <main style={{ display: 'grid', gap: '1rem' }}>
          <section style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
              <div>
                <h2 style={{ color: 'var(--panel-heading)', fontSize: '1.2rem', margin: 0 }}>{activeConfig.label}</h2>
                <p style={{ ...mutedStyle, margin: '0.35rem 0 0' }}>{activeConfig.description}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadSection(activeSection)}
                style={{ ...buttonStyle, textAlign: 'center', fontWeight: 700 }}
              >
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem' }}>
              <span style={{ ...mutedStyle, color: statusColor(state.status) }}>Load: {state.status}</span>
              <span style={{ ...mutedStyle, color: statusColor(dataStatus(payload)) }}>Data: {dataStatus(payload)}</span>
              {payload?.upstream && <span style={mutedStyle}>Upstream: {payload.upstream.status}</span>}
            </div>
            {state.message && <p style={{ ...mutedStyle, color: statusColor(state.status), marginBottom: 0 }}>{state.message}</p>}
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '0.75rem' }}>
            {summaries.map((item) => (
              <div key={item.label} style={cardStyle}>
                <p style={{ ...mutedStyle, margin: 0, textTransform: 'capitalize' }}>{item.label}</p>
                <strong style={{ color: 'var(--panel-heading)', fontSize: '1.35rem' }}>{item.value}</strong>
              </div>
            ))}
          </section>

          {activeSection === 'admins' && (
            <section style={cardStyle}>
              <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', marginTop: 0 }}>Phone Admin Controls</h3>
              <p style={mutedStyle}>
                Grant or revoke the real Supabase Auth <code>app_metadata.is_admin</code> claim for an existing
                123CheckMe auth user by phone number.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  value={adminPhone}
                  onChange={(event) => setAdminPhone(event.target.value)}
                  placeholder="+15551234567"
                  style={{
                    flex: '1 1 15rem',
                    background: 'var(--panel-input-bg)',
                    border: '1px solid var(--panel-input-border)',
                    borderRadius: '0.75rem',
                    color: 'var(--panel-text)',
                    padding: '0.65rem 0.75rem',
                  }}
                />
                <button type="button" onClick={() => void runAdminControl('grant-phone')} style={buttonStyle}>
                  Grant Admin
                </button>
                <button type="button" onClick={() => void runAdminControl('revoke-phone')} style={buttonStyle}>
                  Revoke Admin
                </button>
              </div>
              {controlMessage && <p style={{ ...mutedStyle, color: statusColor(controlMessage.includes('verified') ? 'verified' : 'blocked') }}>{controlMessage}</p>}
            </section>
          )}

          <section style={cardStyle}>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', marginTop: 0 }}>Endpoint Results</h3>
            <PreviewTable value={primaryRows(activeSection, payload)} />
          </section>

          <section style={cardStyle}>
            <h3 style={{ color: 'var(--panel-heading)', fontSize: '1rem', marginTop: 0 }}>Raw Normalized JSON</h3>
            <pre
              style={{
                background: 'var(--panel-surface)',
                border: '1px solid var(--panel-border)',
                borderRadius: '0.75rem',
                color: 'var(--panel-text)',
                fontSize: '0.72rem',
                overflowX: 'auto',
                padding: '0.75rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(payload ?? { status: state.status, message: state.message ?? 'Select a path or refresh.' }, null, 2)}
            </pre>
          </section>
        </main>
      </div>
    </div>
  );
}

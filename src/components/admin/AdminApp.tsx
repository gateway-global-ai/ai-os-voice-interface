/**
 * Admin Panel — Supabase-backed operator surface for admin-only maintenance work.
 * Route: /admin
 *
 * This surface only renders after two checks succeed:
 * 1. `supabase.auth.getUser()` returns a real authenticated user.
 * 2. The user's JWT carries `app_metadata.is_admin = true`, which is mirrored by
 *    the database `admin_access_probe()` function and matching RLS policies.
 *
 * Uses --panel-* CSS tokens for full shell theme compatibility.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { MenuEditorPanel } from './MenuEditorPanel';
import { ToolRegistryPanel } from './ToolRegistryPanel';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { ReferralCodesPanel } from './ReferralCodesPanel';
import {
  describeAdminPrincipal,
  hasSupabaseAdminClaim,
} from '../../lib/adminAuthority';
import {
  browserSupabaseKeyRole,
  browserSupabaseUsesServiceRoleKey,
  supabase,
} from '../../lib/supabaseClient';

type AdminSection =
  | 'menu_editor'
  | 'tool_registry'
  | 'knowledge_base'
  | 'referral_codes';

const SECTIONS: { id: AdminSection; label: string; icon: string }[] = [
  { id: 'menu_editor',     label: 'Menu Editor',     icon: '☰' },
  { id: 'tool_registry',   label: 'Tool Registry',   icon: '🔧' },
  { id: 'knowledge_base',  label: 'Knowledge Base',  icon: '📚' },
  { id: 'referral_codes',  label: 'Referral Codes',  icon: '🔑' },
];

type AdminGateState =
  | { status: 'loading' }
  | { status: 'denied'; title: string; message: string; detail?: string }
  | { status: 'authorized'; user: User };

function AdminGateScreen(props: {
  title: string;
  message: string;
  loading?: boolean;
  detail?: string;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--panel-bg, #0a0a0f)',
        color: 'var(--panel-text, rgba(255,255,255,0.92))',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: 'min(36rem, 100%)',
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            color: 'var(--panel-accent-text)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          AIOS Admin Boundary
        </div>
        <h1 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--panel-heading)' }}>{props.title}</h1>
        <p style={{ margin: '0.75rem 0 0', color: 'var(--panel-text-muted)', lineHeight: 1.55 }}>
          {props.message}
        </p>
        {props.detail ? (
          <p style={{ margin: '0.75rem 0 0', color: 'var(--panel-text-muted)', fontSize: '0.8125rem' }}>
            {props.detail}
          </p>
        ) : null}
        {props.loading ? (
          <p style={{ margin: '1rem 0 0', color: 'var(--panel-text-muted)', fontSize: '0.8125rem' }}>
            Verifying the current Supabase session and admin claim...
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AdminConsole({ user }: { user: User }) {
  const [section, setSection] = useState<AdminSection>('menu_editor');
  const adminLabel = useMemo(() => describeAdminPrincipal(user), [user]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--panel-bg, #0a0a0f)',
        color: 'var(--panel-text, rgba(255,255,255,0.92))',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--panel-border, rgba(255,255,255,0.15))',
          padding: '0 1.5rem',
          height: '3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'var(--panel-surface, rgba(255,255,255,0.05))',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '0.75rem', color: 'var(--panel-accent-text, #a7f3d0)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          AIOS Admin
        </span>
        <span style={{ color: 'var(--panel-text-muted)', fontSize: '0.75rem' }}>
          Supabase: {import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0] ?? 'not configured'}
        </span>
        <span style={{ color: 'var(--panel-text-muted)', fontSize: '0.75rem' }}>
          Principal: {adminLabel}
        </span>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: '13rem',
            flexShrink: 0,
            borderRight: '1px solid var(--panel-border)',
            padding: '1rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.125rem',
          }}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 1.25rem',
                background: section === s.id ? 'var(--panel-bg-hover)' : 'transparent',
                border: 'none',
                borderLeft: `2px solid ${section === s.id ? 'var(--panel-accent-border)' : 'transparent'}`,
                color: section === s.id ? 'var(--panel-heading)' : 'var(--panel-text-muted)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem 0.875rem',
              borderRadius: '0.75rem',
              background: 'var(--panel-accent-bg)',
              border: '1px solid var(--panel-accent-border)',
              color: 'var(--panel-accent-text)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
            }}
          >
            This surface is gated by a verified Supabase session plus
            {' '}
            <code style={{ fontSize: '0.75rem' }}>app_metadata.is_admin = true</code>
            {' '}
            and the matching database RLS policies. `Shell State`, `Intent Log`, and `User Manager` are intentionally
            withheld from Phase 1 until their shared activity and identity tables have matching DB posture or a
            separately enforced server path.
          </div>
          {section === 'menu_editor'    && <MenuEditorPanel />}
          {section === 'tool_registry'  && <ToolRegistryPanel />}
          {section === 'knowledge_base' && <KnowledgeBasePanel />}
          {section === 'referral_codes' && <ReferralCodesPanel />}
        </main>
      </div>
    </div>
  );
}

export function AdminApp() {
  const [gate, setGate] = useState<AdminGateState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!supabase) {
        if (!cancelled) {
          setGate({
            status: 'denied',
            title: 'Supabase is not configured',
            message: 'The admin surface now requires a live Supabase client so it can verify identity and enforce database-backed admin authority.',
          });
        }
        return;
      }

      if (browserSupabaseUsesServiceRoleKey) {
        if (!cancelled) {
          setGate({
            status: 'denied',
            title: 'Unsafe browser Supabase key',
            message: 'The browser client is configured with a service-role key, which would bypass RLS. `/admin` stays disabled until VITE_SUPABASE_ANON_KEY is replaced with the project anon/publishable key.',
            detail: `Decoded browser key role: ${browserSupabaseKeyRole ?? 'unknown'}`,
          });
        }
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;
      if (error || !user) {
        if (!cancelled) {
          setGate({
            status: 'denied',
            title: 'Admin sign-in required',
            message: '`/admin` no longer opens from the URL alone. Sign in with a Supabase Auth user before loading this route.',
            detail: error?.message,
          });
        }
        return;
      }

      if (!hasSupabaseAdminClaim(user)) {
        if (!cancelled) {
          setGate({
            status: 'denied',
            title: 'Admin claim missing',
            message: 'The current Supabase user is authenticated, but its JWT does not carry `app_metadata.is_admin = true`, so the admin surface remains locked.',
            detail: `Signed in as ${describeAdminPrincipal(user)}`,
          });
        }
        return;
      }

      const probe = await supabase.rpc('admin_access_probe');
      if (probe.error || probe.data !== true) {
        if (!cancelled) {
          setGate({
            status: 'denied',
            title: 'Database admin probe failed',
            message: 'The browser session has an admin claim, but the database did not confirm admin authority. Apply the admin RLS migration and refresh the session token before using `/admin`.',
            detail: probe.error?.message,
          });
        }
        return;
      }

      if (!cancelled) {
        setGate({ status: 'authorized', user });
      }
    };

    void verify();
    const authListener = supabase?.auth.onAuthStateChange(() => {
      void verify();
    });

    return () => {
      cancelled = true;
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  if (gate.status === 'loading') {
    return (
      <AdminGateScreen
        title="Verifying admin authority"
        message="`/admin` only renders after the client and database both confirm an authenticated admin session."
        loading
      />
    );
  }

  if (gate.status === 'denied') {
    return <AdminGateScreen title={gate.title} message={gate.message} detail={gate.detail} />;
  }

  return <AdminConsole user={gate.user} />;
}

/**
 * Shared helpers for admin panel components.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// ─── Layout ───────────────────────────────────────────────────────────────────

export function AdminSection({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--panel-heading)' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--panel-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
        borderRadius: '0.5rem',
        padding: '1rem',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Loading / Error states ───────────────────────────────────────────────────

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--panel-text-muted)', fontSize: '0.875rem' }}>
      <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: '1.25rem' }}>⟳</div>
      <div style={{ marginTop: '0.5rem' }}>{label}</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-accent-border)',
        borderRadius: '0.375rem',
        padding: '0.75rem 1rem',
        color: 'var(--panel-text)',
        fontSize: '0.8125rem',
      }}
    >
      ⚠ {message}
    </div>
  );
}

export function confirmAdminDestructiveAction(message: string): boolean {
  return typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : false;
}

export function formatAdminMutationError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--panel-text-muted)', fontSize: '0.875rem' }}>
      {message}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface Col<T> {
  key: string;
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (row: T) => React.ReactNode;
  width?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  cols,
  rows,
  onEdit,
  onDelete,
  getRowKey,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: {
  // Accept cols typed for any row shape to avoid DataTable caller cast issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cols: Col<any>[];
  rows: T[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  getRowKey: (row: T) => string;
  editLabel?: string;
  deleteLabel?: string;
}) {
  const thStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: 'var(--panel-text-muted)',
    borderBottom: '1px solid var(--panel-border)',
    whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.8rem',
    borderBottom: '1px solid var(--panel-border)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} style={{ ...thStyle, width: c.width }}>
                {c.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th style={thStyle}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} style={{ transition: 'background 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {cols.map((c) => (
                <td key={c.key} style={tdStyle}>
                  {c.render ? c.render(row) : String(row[c.key] ?? '')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {onEdit && (
                      <AdminButton size="sm" onClick={() => onEdit(row)}>{editLabel}</AdminButton>
                    )}
                    {onDelete && (
                      <AdminButton size="sm" variant="danger" onClick={() => onDelete(row)}>{deleteLabel}</AdminButton>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function AdminButton({
  children,
  onClick,
  size = 'md',
  variant = 'default',
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md';
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const base: React.CSSProperties = {
    border: '1px solid var(--panel-border)',
    borderRadius: '0.375rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
    ...(size === 'sm'
      ? { padding: '0.2rem 0.6rem', fontSize: '0.75rem' }
      : { padding: '0.4rem 0.875rem', fontSize: '0.8125rem' }),
    ...(variant === 'primary'
      ? { background: 'var(--panel-accent-bg)', color: 'var(--panel-accent-text)', borderColor: 'var(--panel-accent-border)' }
      : variant === 'danger'
      ? { background: 'var(--panel-surface)', color: 'var(--panel-accent-text)', borderColor: 'var(--panel-accent-border)' }
      : { background: 'var(--panel-surface)', color: 'var(--panel-text)' }),
  };
  return (
    <button type={type} style={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ label, color = 'green' }: { label: string; color?: 'green' | 'red' | 'gray' }) {
  const colors: Record<string, React.CSSProperties> = {
    green: { background: 'var(--panel-accent-bg)', color: 'var(--panel-accent-text)', borderColor: 'var(--panel-accent-border)' },
    red:   { background: 'var(--panel-surface)', color: 'var(--panel-accent-text)', borderColor: 'var(--panel-accent-border)' },
    gray:  { background: 'var(--panel-surface)', color: 'var(--panel-text-muted)', borderColor: 'var(--panel-border)' },
  };
  return (
    <span style={{
      ...colors[color],
      border: '1px solid',
      borderRadius: '9999px',
      padding: '0.1rem 0.5rem',
      fontSize: '0.7rem',
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function AdminInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'var(--panel-input-bg)',
        border: '1px solid var(--panel-input-border)',
        borderRadius: '0.375rem',
        color: 'var(--panel-text)',
        padding: '0.375rem 0.625rem',
        fontSize: '0.8125rem',
        fontFamily: 'inherit',
        width: '100%',
        outline: 'none',
      }}
    />
  );
}

export function AdminTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        background: 'var(--panel-input-bg)',
        border: '1px solid var(--panel-input-border)',
        borderRadius: '0.375rem',
        color: 'var(--panel-text)',
        padding: '0.375rem 0.625rem',
        fontSize: '0.8125rem',
        fontFamily: 'inherit',
        width: '100%',
        outline: 'none',
        resize: 'vertical',
      }}
    />
  );
}

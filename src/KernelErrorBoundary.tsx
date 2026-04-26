import React, { type ErrorInfo, type ReactNode } from 'react';

// ─── Kernel Crash Screen ──────────────────────────────────────────────────────
// Renders a terminal-style crash log instead of a white void.
// Wraps the entire root so any uncaught React error is caught here.

interface Props {
  children: ReactNode;
}

interface State {
  crashed: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  crashTime: string;
}

export class KernelErrorBoundary extends React.Component<Props, State> {
  declare props: Readonly<Props>;
  declare setState: React.Component<Props, State>['setState'];
  state: State = {
    crashed: false,
    error: null,
    errorInfo: null,
    crashTime: '',
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      crashed: true,
      error,
      crashTime: new Date().toISOString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[AIOS KERNEL] Uncaught error:', error, errorInfo);
  }

  handleReboot = () => {
    this.setState({ crashed: false, error: null, errorInfo: null, crashTime: '' });
  };

  handleClearAndReboot = () => {
    try {
      localStorage.removeItem('aios_onboarding_complete');
    } catch {
      // ignore
    }
    this.handleReboot();
  };

  render() {
    if (!this.state.crashed) {
      return this.props.children;
    }

    const { error, errorInfo, crashTime } = this.state;
    const stack = error?.stack ?? error?.message ?? 'No stack trace available.';
    const componentStack = errorInfo?.componentStack ?? '';

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a0a0a',
          color: '#22c55e',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '13px',
          lineHeight: '1.6',
          padding: '24px',
          overflowY: 'auto',
          userSelect: 'text',
        }}
      >
        {/* Header */}
        <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>
          ██ AI OS — KERNEL PANIC
        </div>
        <div style={{ color: '#6b7280', marginBottom: '20px' }}>
          An uncaught error caused the render tree to unmount. Full crash log below.
        </div>

        {/* Crash metadata */}
        <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
          <span style={{ color: '#64748b' }}>TIMESTAMP  </span>
          {crashTime}
        </div>
        <div style={{ color: '#94a3b8', marginBottom: '20px' }}>
          <span style={{ color: '#64748b' }}>ERROR MSG  </span>
          <span style={{ color: '#fbbf24' }}>{error?.message ?? 'Unknown error'}</span>
        </div>

        {/* JS stack */}
        <div style={{ color: '#64748b', marginBottom: '4px' }}>── JS STACK TRACE ────────────────────────────────────</div>
        <pre
          style={{
            color: '#a3e635',
            background: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '6px',
            padding: '12px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          {stack}
        </pre>

        {/* Component stack */}
        {componentStack && (
          <>
            <div style={{ color: '#64748b', marginBottom: '4px' }}>── REACT COMPONENT STACK ─────────────────────────────</div>
            <pre
              style={{
                color: '#7dd3fc',
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '6px',
                padding: '12px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: '20px',
                fontSize: '12px',
              }}
            >
              {componentStack}
            </pre>
          </>
        )}

        {/* Recovery actions */}
        <div style={{ color: '#64748b', marginBottom: '12px' }}>── RECOVERY OPTIONS ──────────────────────────────────</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={this.handleReboot}
            style={{
              background: '#064e3b',
              border: '1px solid #059669',
              color: '#6ee7b7',
              padding: '8px 20px',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '13px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            ↺  REBOOT KERNEL
          </button>
          <button
            onClick={this.handleClearAndReboot}
            style={{
              background: '#1c1917',
              border: '1px solid #44403c',
              color: '#a8a29e',
              padding: '8px 20px',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '13px',
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            ⚑  CLEAR STATE + REBOOT
          </button>
        </div>

        <div style={{ color: '#374151', marginTop: '24px', fontSize: '11px' }}>
          AIOS v0.1 — Bare Metal Build — Crash logs are local-only. Nothing was transmitted.
        </div>
      </div>
    );
  }
}

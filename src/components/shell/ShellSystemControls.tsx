/**
 * Top-right power control trigger for the registry-driven System Controls menu.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { Power } from 'lucide-react';
import { cn } from '../../lib/cn';

export type PowerChromeState = 'idle' | 'signed_in' | 'disconnected';

type Props = {
  /** Blue: not signed in; green: signed in; red: disconnected. */
  powerState: PowerChromeState;
  /** Shown next to the power icon when `powerState === 'signed_in'`. */
  userName?: string | null;
  onOpenMenu?: () => void;
};

function powerButtonStyle(powerState: PowerChromeState) {
  const shared = {
    background: 'var(--panel-bg)',
    color: 'var(--panel-text)',
  };

  if (powerState === 'disconnected') {
    return {
      ...shared,
      border: '2px solid rgba(248,113,113,0.5)',
      boxShadow: '0 0 22px rgba(248,113,113,0.4)',
      color: '#fecaca',
    };
  }

  if (powerState === 'signed_in') {
    return {
      ...shared,
      border: '2px solid rgba(52,211,153,0.45)',
      boxShadow: '0 0 22px rgba(52,211,153,0.35)',
      color: '#d1fae5',
    };
  }

  return {
    ...shared,
    border: '2px solid rgba(56,189,248,0.45)',
    boxShadow: '0 0 22px rgba(56,189,248,0.35)',
    color: '#e0f2fe',
  };
}

export function ShellSystemControls({
  powerState,
  userName,
  onOpenMenu,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
      {powerState === 'signed_in' && userName ? (
        <span
          className="max-w-[min(42vw,9rem)] truncate text-right text-[10px] font-semibold sm:text-[11px] md:max-w-[10rem]"
          style={{ color: 'var(--panel-text)' }}
          title={userName}
        >
          {userName}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onOpenMenu}
        title={
          powerState === 'disconnected'
            ? 'System disconnected'
            : powerState === 'signed_in'
              ? 'System controls'
              : 'Not signed in — system controls'
        }
        className={cn(
          'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-transform hover:scale-[1.04] active:scale-[0.98]',
        )}
        style={powerButtonStyle(powerState)}
      >
        <Power className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.25} aria-hidden />
        <span className="sr-only">System power and controls</span>
      </button>
    </div>
  );
}
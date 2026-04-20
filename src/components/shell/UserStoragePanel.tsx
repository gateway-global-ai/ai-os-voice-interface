import type { ReactNode } from 'react';
import { HardDrive, FolderOpen, Image as ImageIcon, Radio, ServerCog, X } from 'lucide-react';
import type { ShellTheme } from '../../shell/useShellTheme';

type Props = {
  theme: ShellTheme;
  onClose: () => void;
  onOpenKnowledge: () => void;
  onOpenAppearance: () => void;
  onOpenWorkspace: () => void;
  onOpenPodcasts: () => void;
};

function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-opacity hover:opacity-95"
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: 'var(--panel-accent-bg)',
            border: '1px solid var(--panel-accent-border)',
            color: 'var(--panel-accent-text)',
          }}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
            {title}
          </span>
          <span className="mt-1 block text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
            {description}
          </span>
        </span>
      </div>
    </button>
  );
}

export function UserStoragePanel({
  theme,
  onClose,
  onOpenKnowledge,
  onOpenAppearance,
  onOpenWorkspace,
  onOpenPodcasts,
}: Props) {
  const customBackgroundLabel =
    theme.customBgPath?.split(/[\\/]/).pop() ?? 'No local background selected yet';

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-3xl"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--panel-border)' }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--panel-text-muted)' }}>
            User storage
          </p>
          <h2 className="text-base font-semibold" style={{ color: 'var(--panel-heading)' }}>
            Local + connected storage surfaces
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            User-owned storage lives here. Community media and shell system configuration do not.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-opacity hover:opacity-90"
          style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)', color: 'var(--panel-text-muted)' }}
          aria-label="Close user storage"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: 'var(--panel-accent-bg)',
                    border: '1px solid var(--panel-accent-border)',
                    color: 'var(--panel-accent-text)',
                  }}
                >
                  <HardDrive size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                    Current state
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                    The shell already persists preferences and session knowledge in device-local storage, but it does not
                    yet have a dedicated local file-storage library with folders, quotas, retention rules, or sync policy.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                title="Session knowledge"
                description="Open the local upload/library surface for user-provided knowledge inputs."
                icon={<FolderOpen size={16} />}
                onClick={onOpenKnowledge}
              />
              <ActionCard
                title="Background media"
                description="Manage device-local images and videos used by the shell background layer."
                icon={<ImageIcon size={16} />}
                onClick={onOpenAppearance}
              />
              <ActionCard
                title="Google Workspace"
                description="Open the governed Workspace connection and data surfaces from the footer-owned path."
                icon={<ServerCog size={16} />}
                onClick={onOpenWorkspace}
              />
              <ActionCard
                title="Community audio library"
                description="Open the shared research audio catalog. This is not user-private storage."
                icon={<Radio size={16} />}
                onClick={onOpenPodcasts}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--panel-text-muted)' }}>
                Local background asset
              </p>
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                {customBackgroundLabel}
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                Active kind: {theme.customBgKind ?? 'none'}.
              </p>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--panel-text-muted)' }}>
                What still needs to be built
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                <li>Separate local user library schema for files, media, and metadata.</li>
                <li>Explicit boundary between user-private storage and community/shared storage.</li>
                <li>Storage providers contract for local device, Google Workspace, and future governed remotes.</li>
                <li>Retention, sync, export, and deletion controls surfaced in the same footer-owned lane.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

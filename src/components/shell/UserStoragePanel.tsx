import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  Radio,
  ServerCog,
  Upload,
  X,
} from 'lucide-react';
import { AIOS_OPERATOR_TOKEN_KEY } from '../../core/io/checkmeClient';
import type { ShellTheme } from '../../shell/useShellTheme';

type Props = {
  theme: ShellTheme;
  onClose: () => void;
  onOpenKnowledge: () => void;
  onOpenAppearance: () => void;
  onOpenWorkspace: () => void;
  onOpenPodcasts: () => void;
};

type LibraryKind = 'all' | 'knowledge' | 'asset' | 'media';

type AdminKnowledgebaseItem = {
  id: string;
  title: string;
  kind: Exclude<LibraryKind, 'all'>;
  mimeType: string;
  sizeBytes: number;
  originalFileName: string;
  storedRelativePath: string;
  createdAt: string;
  source?: string;
  tags: string[];
  notes?: string;
};

type ItemsResponse = {
  root?: string;
  items?: AdminKnowledgebaseItem[];
  error?: string;
};

const fieldStyle = {
  background: 'var(--panel-input-bg)',
  border: '1px solid var(--panel-input-border)',
  color: 'var(--panel-text)',
} as const;

const subtleButtonStyle = {
  background: 'var(--panel-surface)',
  border: '1px solid var(--panel-border)',
  color: 'var(--panel-text)',
} as const;

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

function readOperatorToken(): string | null {
  try {
    return localStorage.getItem(AIOS_OPERATOR_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function adminKnowledgebaseApi<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/__admin_knowledgebase_api${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const error =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : response.statusText;
    throw new Error(error || `Admin knowledgebase API failed (${response.status})`);
  }
  return data as T;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function kindIcon(kind: AdminKnowledgebaseItem['kind']): ReactNode {
  if (kind === 'knowledge') return <FileText size={15} />;
  if (kind === 'media') return <Radio size={15} />;
  return <ImageIcon size={15} />;
}

export function UserStoragePanel({
  theme,
  onClose,
  onOpenKnowledge,
  onOpenAppearance,
  onOpenWorkspace,
  onOpenPodcasts,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<AdminKnowledgebaseItem[]>([]);
  const [storageRoot, setStorageRoot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'blocked' | 'error' | 'uploading'>('idle');
  const [message, setMessage] = useState('Load the admin knowledgebase to browse server-side files.');
  const [kindFilter, setKindFilter] = useState<LibraryKind>('all');
  const [uploadKind, setUploadKind] = useState<Exclude<LibraryKind, 'all'>>('knowledge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const customBackgroundLabel =
    theme.customBgPath?.split(/[\\/]/).pop() ?? 'No local background selected yet';

  const filteredItems = useMemo(
    () => (kindFilter === 'all' ? items : items.filter((item) => item.kind === kindFilter)),
    [items, kindFilter],
  );

  const loadItems = useCallback(async () => {
    const token = readOperatorToken();
    if (!token) {
      setStatus('blocked');
      setMessage('Operator token is missing. Verify with 123CheckMe before opening admin storage.');
      return;
    }

    setStatus('loading');
    setMessage('Loading admin knowledgebase...');
    try {
      const data = await adminKnowledgebaseApi<ItemsResponse>(token, '/items');
      setItems(Array.isArray(data.items) ? data.items : []);
      setStorageRoot(data.root ?? '');
      setStatus('ready');
      setMessage(`Loaded ${data.items?.length ?? 0} admin knowledgebase item(s).`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const uploadSelectedFile = async () => {
    const token = readOperatorToken();
    if (!token) {
      setStatus('blocked');
      setMessage('Operator token is missing. Verify with 123CheckMe before uploading.');
      return;
    }
    if (!selectedFile) {
      setMessage('Choose a file before uploading.');
      return;
    }

    setStatus('uploading');
    setMessage(`Uploading ${selectedFile.name}...`);
    try {
      await adminKnowledgebaseApi<{ item: AdminKnowledgebaseItem }>(token, '/items/upload', {
        method: 'POST',
        headers: {
          'Content-Type': selectedFile.type || 'application/octet-stream',
          'x-aios-file-name': encodeURIComponent(selectedFile.name),
          'x-aios-kind': uploadKind,
        },
        body: selectedFile,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadItems();
      setMessage('Upload complete.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const openItem = async (item: AdminKnowledgebaseItem) => {
    const token = readOperatorToken();
    if (!token) {
      setStatus('blocked');
      setMessage('Operator token is missing. Verify with 123CheckMe before opening files.');
      return;
    }

    try {
      const response = await fetch(`/__admin_knowledgebase_api/items/${item.id}/content`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed to open ${item.originalFileName}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

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
            Admin knowledgebase + assets
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            Operator-gated files live on the production server filesystem, outside git.
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
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
                    Admin knowledgebase filesystem
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                    Uploaded knowledge and assets are stored in an operator-gated server library, not in git.
                    {storageRoot ? ` Root: ${storageRoot}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
            >
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[10rem] flex-1 text-xs font-semibold" style={{ color: 'var(--panel-text-muted)' }}>
                  Upload file
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={onFileChange}
                    className="mt-2 block w-full rounded-xl px-3 py-2 text-xs"
                    style={fieldStyle}
                  />
                </label>
                <label className="text-xs font-semibold" style={{ color: 'var(--panel-text-muted)' }}>
                  Kind
                  <select
                    value={uploadKind}
                    onChange={(event) => setUploadKind(event.target.value as Exclude<LibraryKind, 'all'>)}
                    className="mt-2 block rounded-xl px-3 py-2 text-xs"
                    style={fieldStyle}
                  >
                    <option value="knowledge">Knowledge</option>
                    <option value="asset">Asset</option>
                    <option value="media">Media</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={uploadSelectedFile}
                  disabled={status === 'uploading'}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={subtleButtonStyle}
                >
                  <Upload size={14} />
                  Upload
                </button>
              </div>
              <p
                className="mt-3 text-xs"
                style={{ color: status === 'error' || status === 'blocked' ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)' }}
              >
                {message}
              </p>
            </div>

            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                    Library
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                    {filteredItems.length} visible of {items.length} item(s)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={kindFilter}
                    onChange={(event) => setKindFilter(event.target.value as LibraryKind)}
                    className="rounded-xl px-3 py-2 text-xs"
                    style={fieldStyle}
                  >
                    <option value="all">All</option>
                    <option value="knowledge">Knowledge</option>
                    <option value="asset">Assets</option>
                    <option value="media">Media</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void loadItems()}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                    style={subtleButtonStyle}
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="rounded-xl p-3 text-xs" style={{ border: '1px dashed var(--panel-border)', color: 'var(--panel-text-muted)' }}>
                    No files in this view yet.
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3"
                      style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span style={{ color: 'var(--panel-accent-text)' }}>{kindIcon(item.kind)}</span>
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
                            {item.title}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                          {item.kind} - {formatBytes(item.sizeBytes)} - {item.originalFileName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void openItem(item)}
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                        style={subtleButtonStyle}
                      >
                        <Download size={14} />
                        Open
                      </button>
                    </div>
                  ))
                )}
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
                Storage boundary
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                <li>Admin knowledgebase files live in the server data root and are never served as public static assets.</li>
                <li>Access requires the same operator token used by Course Creator and 123CheckMe SaaS Admin.</li>
                <li>Community podcast media remains separate from private/admin-uploaded knowledge assets.</li>
                <li>Existing `user_uploads/` files are imported copy-first; originals remain until cleanup is approved.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

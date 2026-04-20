/**
 * SessionKnowledgePanel — Upload and browse session-scoped knowledge inputs.
 *
 * Governed by AMD-2026-015-ADD-001 (declared input vocabulary).
 * source_class: 'operator_upload' for all user-uploaded files.
 *
 * Overlay rendered at App.tsx root level — never inside a transformed ancestor.
 * All styles via CSS custom properties (AIOS-SHELL-UI-LAYOUT-AND-COMPONENT-STANDARD-001).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BookOpen,
  Upload,
  Trash2,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  getInputs,
  addInput,
  removeInput,
  detectContentType,
  type SessionKnowledgeInput,
} from '../../core/knowledge/sessionKnowledgeStore';
import { geminiGenerateText } from '../../api/geminiGateway';
import { shellOverlayFrameStyle } from './ShellOverlayFrame';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function classifyDocument(text: string, filename: string): Promise<string> {
  if (!text.trim()) {
    return `Document: ${filename}`;
  }

  try {
    const response = await geminiGenerateText({
      userText: `Summarize this document in exactly one sentence (max 20 words): "${filename}"\n\n${text.slice(0, 2000)}`,
      model: 'gemini-2.0-flash',
      maxOutputTokens: 80,
      temperature: 0.3,
    });
    return response || `Document: ${filename}`;
  } catch {
    return `Document: ${filename}`;
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Could not read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsText(file, 'utf-8');
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  onClose: () => void;
  initialTab?: Tab;
};

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'library' | 'upload';

export function SessionKnowledgePanel({ onClose, initialTab = 'library' }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [inputs, setInputs] = useState<SessionKnowledgeInput[]>(() => getInputs());
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshInputs = () => setInputs(getInputs());

  const handleDelete = useCallback((id: string) => {
    removeInput(id);
    refreshInputs();
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const rawText = await extractTextFromFile(file);
      const contentType = detectContentType(file.name);
      const summary = await classifyDocument(rawText, file.name);

      addInput({
        declared_name: file.name,
        source_class: 'operator_upload',
        content_summary: summary,
        content_type: contentType,
        raw_text: rawText,
      });

      refreshInputs();
      setUploadSuccess(`"${file.name}" added to session knowledge.`);
      setTab('library');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileSelect]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="knowledge-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[var(--z-shell-modal-backdrop)] bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="knowledge-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Session knowledge library"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-[var(--z-shell-system-controls)] flex items-center justify-center pointer-events-none px-4"
      >
        <div
          className="pointer-events-auto w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            maxHeight: 'calc(100vh - 4rem)',
            ...shellOverlayFrameStyle,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--panel-border)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={16} style={{ color: 'var(--panel-accent-text)' }} />
              <h2 className="text-sm font-bold" style={{ color: 'var(--panel-heading)' }}>
                Session Knowledge
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--panel-text-muted)' }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 gap-1 px-5 py-2"
            style={{ borderBottom: '1px solid var(--panel-border)' }}>
            {(['library', 'upload'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize"
                style={{
                  background: tab === t ? 'var(--panel-accent-bg)' : 'transparent',
                  color: tab === t ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)',
                  border: tab === t ? '1px solid var(--panel-accent-border)' : '1px solid transparent',
                }}
              >
                {t === 'library' ? `Library (${inputs.length})` : 'Upload'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
              >
                {tab === 'library' && (
                  <LibraryTab
                    inputs={inputs}
                    onDelete={handleDelete}
                    onUploadClick={() => setTab('upload')}
                    uploadSuccess={uploadSuccess}
                  />
                )}
                {tab === 'upload' && (
                  <UploadTab
                    uploading={uploading}
                    uploadError={uploadError}
                    onDrop={handleDrop}
                    onFileChange={handleFileChange}
                    fileInputRef={fileInputRef}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ─── Library tab ─────────────────────────────────────────────────────────────

function LibraryTab({
  inputs,
  onDelete,
  onUploadClick,
  uploadSuccess,
}: {
  inputs: SessionKnowledgeInput[];
  onDelete: (id: string) => void;
  onUploadClick: () => void;
  uploadSuccess: string | null;
}) {
  if (inputs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        {uploadSuccess ? (
          <div className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--panel-accent-text)' }}>
            <CheckCircle2 size={14} />
            {uploadSuccess}
          </div>
        ) : null}
        <BookOpen size={32} style={{ color: 'var(--panel-text-muted)', opacity: 0.4 }} />
        <p className="text-sm" style={{ color: 'var(--panel-text-muted)' }}>
          No knowledge inputs declared yet.
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          className="rounded-xl px-4 py-2 text-sm font-medium transition-all"
          style={{
            background: 'var(--panel-accent-bg)',
            border: '1px solid var(--panel-accent-border)',
            color: 'var(--panel-accent-text)',
          }}
        >
          Upload a document
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {uploadSuccess && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--panel-accent-text)' }}>
          <CheckCircle2 size={12} />
          {uploadSuccess}
        </div>
      )}
      {inputs.map((input) => (
        <div
          key={input.id}
          className="flex items-start gap-3 rounded-xl p-3"
          style={{ background: 'var(--panel-surface)', border: '1px solid var(--panel-border)' }}
        >
          <FileText size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--panel-text-muted)' }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--panel-heading)' }}>
              {input.declared_name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--panel-text-muted)' }}>
              {input.content_summary}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] rounded-full px-1.5 py-0.5"
                style={{ background: 'var(--panel-bg)', color: 'var(--panel-text-muted)', border: '1px solid var(--panel-border)' }}>
                {input.content_type}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--panel-text-muted)' }}>
                {new Date(input.declared_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(input.id)}
            className="shrink-0 rounded-lg p-1 transition-colors"
            style={{ color: 'var(--panel-text-muted)' }}
            aria-label={`Remove ${input.declared_name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onUploadClick}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
          color: 'var(--panel-text-muted)',
        }}
      >
        <Upload size={14} />
        Add another document
      </button>
    </div>
  );
}

// ─── Upload tab ───────────────────────────────────────────────────────────────

function UploadTab({
  uploading,
  uploadError,
  onDrop,
  onFileChange,
  fileInputRef,
}: {
  uploading: boolean;
  uploadError: string | null;
  onDrop: (e: DragEvent) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>
        Upload a document to declare as session context input. AI OS will reference it
        in every response during this session.
        <br /><br />
        <span style={{ color: 'var(--panel-text-muted)', opacity: 0.7 }}>
          Source class: <code>operator_upload</code> (AMD-2026-015-ADD-001)
        </span>
      </p>

      {/* Drop zone */}
      <div
        className="relative flex flex-col items-center justify-center gap-3 rounded-xl p-8 cursor-pointer transition-all"
        style={{
          background: dragOver ? 'var(--panel-accent-bg)' : 'var(--panel-surface)',
          border: `2px dashed ${dragOver ? 'var(--panel-accent-border)' : 'var(--panel-border)'}`,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { setDragOver(false); onDrop(e); }}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--panel-accent-text)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
              Reading and classifying…
            </p>
          </>
        ) : (
          <>
            <Upload size={28} style={{ color: dragOver ? 'var(--panel-accent-text)' : 'var(--panel-text-muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--panel-text)' }}>
              Drop a file here or click to browse
            </p>
            <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>
              .txt, .md, .pdf, .docx — max 50,000 characters extracted
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,.docx,.markdown,.csv,.json,.xml,.yaml,.yml"
          className="sr-only"
          onChange={onFileChange}
          disabled={uploading}
        />
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}

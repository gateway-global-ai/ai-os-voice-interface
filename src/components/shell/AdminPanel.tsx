/**
 * Admin panel — editable narration scripts for all lessons and onboarding tasks.
 * Overrides persist to localStorage via lessonNarrationOverrides.
 * Accessible via the Admin tile in System Controls.
 * @license SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { LESSONS, ONBOARDING_TASKS } from '../../onboarding/lessons';
import {
  readNarrationOverrides,
  writeNarrationOverride,
  clearAllNarrationOverrides,
} from '../../onboarding/lessonNarrationOverrides';
import { cn } from '../../lib/cn';

type Props = {
  onBack: () => void;
};

type EntryState = {
  id: string;
  title: string;
  category: string;
  defaultText: string;
  currentText: string;
  isDirty: boolean;
  isSaved: boolean;
};

export function AdminPanel({ onBack }: Props) {
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    const overrides = readNarrationOverrides();
    const all = [
      ...LESSONS.filter((l) => !l.audio_url),
      ...ONBOARDING_TASKS,
    ];
    setEntries(
      all.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        defaultText: item.intro_narration,
        currentText: overrides[item.id] ?? item.intro_narration,
        isDirty: false,
        isSaved: false,
      })),
    );
  }, []);

  const handleChange = useCallback((id: string, text: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, currentText: text, isDirty: text !== e.defaultText, isSaved: false } : e,
      ),
    );
  }, []);

  const handleSave = useCallback((id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    writeNarrationOverride(id, entry.currentText);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isDirty: false, isSaved: true } : e)),
    );
    setTimeout(() => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, isSaved: false } : e)));
    }, 2000);
  }, [entries]);

  const handleReset = useCallback((id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    writeNarrationOverride(id, '');
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, currentText: e.defaultText, isDirty: false, isSaved: false } : e,
      ),
    );
  }, [entries]);

  const handleResetAll = useCallback(() => {
    clearAllNarrationOverrides();
    setEntries((prev) =>
      prev.map((e) => ({ ...e, currentText: e.defaultText, isDirty: false, isSaved: false })),
    );
    setResetConfirm(false);
  }, []);

  const lessons = entries.filter((e) => e.category === 'lesson');
  const tasks = entries.filter((e) => e.category === 'task');

  return (
    <motion.div
      key="admin-panel"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
            Admin · Voice Scripts
          </h3>
        </div>
        {resetConfirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-400">Reset all?</span>
            <button
              type="button"
              onClick={handleResetAll}
              className="rounded px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-900/30"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setResetConfirm(false)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-600 transition-colors hover:bg-white/10 hover:text-zinc-400"
            title="Reset all to defaults"
          >
            <RotateCcw className="h-3 w-3" />
            Reset all
          </button>
        )}
      </div>

      <p className="mb-3 text-[10px] leading-relaxed text-zinc-500">
        Edit the spoken text for each lesson. Changes take effect immediately for new playback.
        Audio-file lessons are not editable here.
      </p>

      {/* Lessons */}
      <Section label="Lessons">
        {lessons.map((entry) => (
          <NarrationEntry
            key={entry.id}
            entry={entry}
            isExpanded={expandedId === entry.id}
            onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            onChange={handleChange}
            onSave={handleSave}
            onReset={handleReset}
          />
        ))}
      </Section>

      {/* Onboarding Tasks */}
      <Section label="Onboarding Tasks">
        {tasks.map((entry) => (
          <NarrationEntry
            key={entry.id}
            entry={entry}
            isExpanded={expandedId === entry.id}
            onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            onChange={handleChange}
            onSave={handleSave}
            onReset={handleReset}
          />
        ))}
      </Section>
    </motion.div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function NarrationEntry({
  entry,
  isExpanded,
  onToggle,
  onChange,
  onSave,
  onReset,
}: {
  entry: EntryState;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (id: string, text: string) => void;
  onSave: (id: string) => void;
  onReset: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        entry.isDirty
          ? 'border-amber-400/30 bg-amber-500/5'
          : 'border-white/10 bg-white/[0.04]',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-zinc-200">{entry.title}</span>
        <div className="flex shrink-0 items-center gap-2">
          {entry.isDirty && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
              edited
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <textarea
                value={entry.currentText}
                onChange={(e) => onChange(entry.id, e.target.value)}
                rows={6}
                className="w-full resize-y rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-cyan-400/50 focus:bg-white/[0.09]"
                placeholder="Enter narration text…"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onReset(entry.id)}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Restore default
                </button>
                <button
                  type="button"
                  onClick={() => onSave(entry.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all',
                    entry.isSaved
                      ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                      : 'border border-cyan-400/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25',
                  )}
                >
                  <Save className="h-3 w-3" />
                  {entry.isSaved ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

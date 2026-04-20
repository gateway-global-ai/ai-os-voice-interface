import { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, BookOpen, Layers, CheckCircle2, ArrowRight, HeartHandshake } from 'lucide-react';
import { RealityCheckConfidenceBar } from './RealityCheckConfidenceBar';
import type { ShellMenuIntentIngestionState } from '../../shell/shellMenuStoreTypes';
import type { AggregatedReview } from '../../shell/TriangulationReviewService';
import { knowledgeRetrievalService } from '../../knowledge/KnowledgeRetrievalService';
import type { EducationalLesson, ShortcutTrigger } from '../../knowledge/KnowledgeBaseSchema';

interface Props {
  ingestionState: ShellMenuIntentIngestionState;
  aggregatedReview?: AggregatedReview;
  onApplyFix?: (pointsToRestore: number) => void;
}

export function RealityCheckReport({ ingestionState, aggregatedReview, onApplyFix }: Props) {
  const {
    current_payload,
    pending_review,
    mvp_success_probability,
    probability_disclosed,
    status
  } = ingestionState;

  const shortcuts = pending_review?.shortcut_report;
  const intentText = current_payload?.transcript || 'No transcript available.';
  const prob = mvp_success_probability ?? 0;
  const disclosed = probability_disclosed ?? false;

  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [celebration, setCelebration] = useState<string | null>(null);
  const [lessons, setLessons] = useState<EducationalLesson[]>([]);

  useEffect(() => {
    if (shortcuts) {
      const triggers: ShortcutTrigger[] = [];
      if (shortcuts.suppressed_exceptions?.length) triggers.push('suppressed_exceptions');
      if (shortcuts.mock_data_hallucinations?.length) triggers.push('mock_data_hallucinations');
      if (shortcuts.ui_fragility?.length) triggers.push('ui_fragility');
      if (shortcuts.repeated_code?.length) triggers.push('repeated_code');

      if (triggers.length > 0) {
        knowledgeRetrievalService.getLessonsForShortcuts(triggers).then(setLessons);
      }
    }
  }, [shortcuts]);

  const handleApplyFix = (fixId: string, points: number) => {
    if (appliedFixes.has(fixId)) return;
    setAppliedFixes(prev => new Set(prev).add(fixId));
    if (onApplyFix) {
      onApplyFix(points);
    }
    setCelebration(`Great job! You've successfully applied a structural fix. Your MVP probability just increased.`);
    setTimeout(() => setCelebration(null), 4000);
  };

  const remediationTasks = useMemo(() => {
    const tasks: Array<{ id: string; title: string; description: string; points: number }> = [];
    if (shortcuts?.suppressed_exceptions?.length) {
      tasks.push({
        id: 'suppressed_exceptions',
        title: 'Restore Error Visibility',
        description: 'Remove empty catch blocks so your app can properly report when something goes wrong. This makes debugging much easier for you.',
        points: 20
      });
    }
    if (shortcuts?.mock_data_hallucinations?.length) {
      tasks.push({
        id: 'mock_data',
        title: 'Connect Real Data',
        description: 'Replace hardcoded mock data with real database connections to ensure your app actually saves user information.',
        points: 15
      });
    }
    if (shortcuts?.ui_fragility?.length) {
      tasks.push({
        id: 'ui_fragility',
        title: 'Strengthen UI Components',
        description: 'Move inline CSS into your design system so your app looks consistent and doesn\'t break on different screen sizes.',
        points: 5
      });
    }
    if (shortcuts?.repeated_code?.length) {
      tasks.push({
        id: 'repeated_code',
        title: 'Abstract Repeated Logic',
        description: 'Combine duplicated code into shared functions. This means you only have to fix bugs in one place instead of many.',
        points: 5
      });
    }
    return tasks;
  }, [shortcuts]);

  if (status !== 'handoff_ready') {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* Top Confidence Bar */}
      <RealityCheckConfidenceBar probability={prob} disclosed={disclosed} />

      {celebration && (
        <div className="p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2" style={{ background: 'var(--panel-accent-bg)', borderColor: 'var(--panel-accent-border)' }}>
          <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--panel-accent-text)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--panel-accent-text)' }}>{celebration}</p>
        </div>
      )}

      {/* 1. The Plan Summary Component */}
      <section
        className="rounded-2xl p-5 border"
        style={{
          background: 'var(--panel-surface)',
          borderColor: 'var(--panel-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <HeartHandshake className="h-5 w-5" style={{ color: 'var(--panel-heading)' }} />
          <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: 'var(--panel-heading)' }}>
            Your Vision & Our Plan
          </h2>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--panel-text)' }}>
          Welcome to your collaborative workspace. We understand how important this project is to you. Our goal is to help you build a robust, deterministic foundation so your dream can scale without collapsing under technical debt.
        </p>
        <div className="p-4 rounded-xl" style={{ background: 'var(--panel-bg)' }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--panel-text-muted)' }}>
            Your Stated Intent
          </p>
          <p className="text-sm font-medium leading-relaxed italic" style={{ color: 'var(--panel-text)' }}>
            "{intentText}"
          </p>
        </div>
      </section>

      {/* 2. The Architecture & Scaffold Guide */}
      <section
        className="rounded-2xl p-5 border"
        style={{
          background: 'var(--panel-surface)',
          borderColor: 'var(--panel-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5" style={{ color: 'var(--panel-heading)' }} />
          <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: 'var(--panel-heading)' }}>
            Recommended Architecture
          </h2>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--panel-text)' }}>
          To achieve your vision, we recommend structuring your application with clear separation of concerns. Here is what a healthy version of your app looks like:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--panel-heading)' }}>Taxonomy & Schema</h4>
            <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>Define strict data models before writing UI. Ensure your database schema perfectly matches your TypeScript interfaces.</p>
          </div>
          <div className="p-3 rounded-xl border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--panel-heading)' }}>Routes & Controllers</h4>
            <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>Keep your API routes thin. Delegate business logic to dedicated controller classes.</p>
          </div>
          <div className="p-3 rounded-xl border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--panel-heading)' }}>Storage & State</h4>
            <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>Use a centralized store for global state. Avoid prop-drilling and local state fragmentation.</p>
          </div>
          <div className="p-3 rounded-xl border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--panel-heading)' }}>UI Components</h4>
            <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>Build pure, stateless components that inherit from a global design system.</p>
          </div>
        </div>
      </section>

      {/* 3. Educational Guidance & Security Breakdown */}
      {lessons.length > 0 && (
        <section
          className="rounded-2xl p-5 border"
          style={{
            background: 'var(--panel-surface)',
            borderColor: 'var(--panel-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5" style={{ color: 'var(--panel-heading)' }} />
            <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: 'var(--panel-heading)' }}>
              Architecture & Security Lessons
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--panel-text)' }}>
            AI coding agents often take shortcuts to give you quick visual results. While this feels fast, it creates "vibe coding" that breaks in production. Here is what we found and why it matters:
          </p>

          <div className="space-y-4">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="p-4 rounded-xl border" style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--panel-heading)' }}>{lesson.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                  {lesson.compassionate_explanation}
                </p>
                <button className="mt-2 text-[10px] uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--panel-accent-text)' }}>
                  Read more in Knowledge Base <ArrowRight size={10} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. The Interactive "Review & Apply" Workspace */}
      {remediationTasks.length > 0 && (
        <section
          className="rounded-2xl p-5 border"
          style={{
            background: 'var(--panel-accent-bg)',
            borderColor: 'var(--panel-accent-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5" style={{ color: 'var(--panel-accent-text)' }} />
            <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: 'var(--panel-accent-text)' }}>
              Collaborative Remediation Checklist
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--panel-text)' }}>
            You are in control. Review the structural fixes below and apply them to upgrade your architecture and increase your MVP success probability.
          </p>
          
          <div className="flex flex-col gap-3">
            {remediationTasks.map((task) => {
              const isApplied = appliedFixes.has(task.id);
              return (
                <div 
                  key={task.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all"
                  style={{
                    background: isApplied ? 'var(--panel-accent-bg)' : 'var(--panel-bg)',
                    borderColor: isApplied ? 'var(--panel-accent-border)' : 'var(--panel-border)'
                  }}
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-bold mb-1" style={{ color: isApplied ? 'var(--panel-accent-text)' : 'var(--panel-heading)' }}>
                      {task.title}
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--panel-text-muted)' }}>
                      {task.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyFix(task.id, task.points)}
                    disabled={isApplied}
                    className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: isApplied ? 'var(--panel-bg)' : 'var(--panel-surface)',
                      color: isApplied ? 'var(--panel-text-muted)' : 'var(--panel-text)',
                      cursor: isApplied ? 'not-allowed' : 'pointer',
                      border: '1px solid var(--panel-border)'
                    }}
                  >
                    {isApplied ? 'Applied' : 'Review & Apply'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

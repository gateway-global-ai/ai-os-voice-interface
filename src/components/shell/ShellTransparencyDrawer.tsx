import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { X, Sparkles, ShieldCheck, Cpu, Mic, Workflow, Target } from 'lucide-react';
import type { VoiceRouteId } from '../../config/voiceRoutePreference';
import type { ShellPromptContract } from '../../shell/shellPromptContract';
import { ShellOverlayFrame } from './ShellOverlayFrame';

type ShellTransparencyDrawerProps = {
  voiceRoute: VoiceRouteId;
  voiceLabel: string;
  voiceDescription: string;
  reasoningStatus: string;
  interactionMode: 'voice' | 'chat';
  currentIntent?: string;
  availableSkills: string[];
  promptContract: ShellPromptContract;
  currentAction?: string;
  currentOutcome?: string;
  onClose: () => void;
};

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-4"
      style={{
        background: 'var(--panel-surface)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: 'var(--panel-accent-text)' }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--panel-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm" style={{ color: 'var(--panel-text)' }}>
        {value}
      </span>
    </div>
  );
}

export function ShellTransparencyDrawer({
  voiceRoute,
  voiceLabel,
  voiceDescription,
  reasoningStatus,
  interactionMode,
  currentIntent,
  availableSkills,
  promptContract,
  currentAction,
  currentOutcome,
  onClose,
}: ShellTransparencyDrawerProps) {
  return (
    <ShellOverlayFrame overlayKey="transparency" onClose={onClose}>
      <div
        className="max-h-[min(90vh,calc(100vh-var(--shell-header-height)-2rem))] overflow-hidden rounded-[1.75rem] shadow-2xl"
        style={{
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
        }}
      >
        <div
          className="flex items-start justify-between gap-4 py-5"
          style={{ paddingLeft: 'var(--shell-overlay-card-padding)', paddingRight: 'var(--shell-overlay-card-padding)', borderBottom: '1px solid var(--panel-border)' }}
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: 'var(--panel-accent-text)' }}>
              Transparency
            </p>
            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--panel-heading)' }}>
              Voice agent state profile
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
              This surface discloses the active voice identity, loyalty state, prompt posture, intent, and currently declared skills.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--panel-text-muted)', background: 'var(--panel-surface)' }}
            aria-label="Close transparency drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="grid max-h-[calc(90vh-6.5rem)] overflow-y-auto lg:grid-cols-[1.2fr_1fr]"
          style={{
            gap: 'var(--shell-overlay-gap)',
            padding: 'var(--shell-overlay-card-padding)',
          }}
        >
          <div style={{ display: 'grid', gap: 'var(--shell-overlay-gap)' }}>
            <Section icon={<Mic size={16} />} title="Voice identity">
              <div className="grid gap-3 sm:grid-cols-2">
                <KeyValue label="Active voice route" value={`${voiceLabel} (${voiceRoute})`} />
                <KeyValue label="Interaction mode" value={interactionMode} />
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                {voiceDescription}
              </p>
            </Section>

            <Section icon={<ShieldCheck size={16} />} title="Loyalty disclosure">
              <div className="grid gap-3 sm:grid-cols-2">
                <KeyValue label="Current loyalty" value={promptContract.loyaltyLabel} />
                <KeyValue label="Reasoning/runtime" value={reasoningStatus} />
              </div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--panel-text)' }}>
                {promptContract.loyaltySummary}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--panel-text-muted)' }}>
                {promptContract.loyaltyReason}
              </p>
            </Section>

            <Section icon={<Sparkles size={16} />} title="Active prompt posture">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--panel-text)' }}>
                {promptContract.missionSummary}
              </p>
              <div className="mt-3 rounded-2xl p-3 text-xs leading-relaxed" style={{ background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', color: 'var(--panel-text-muted)' }}>
                <pre className="whitespace-pre-wrap font-mono">{promptContract.promptLines.join('\n')}</pre>
              </div>
            </Section>
          </div>

          <div style={{ display: 'grid', gap: 'var(--shell-overlay-gap)' }}>
            <Section icon={<Target size={16} />} title="Intent and outcomes">
              <div className="grid gap-3">
                <KeyValue label="Current intent" value={currentIntent || 'idle'} />
                <KeyValue label="Current action" value={currentAction || 'Structured action disclosure not yet surfaced'} />
                <KeyValue label="Current outcome" value={currentOutcome || 'Structured outcome disclosure not yet surfaced'} />
              </div>
            </Section>

            <Section icon={<Workflow size={16} />} title="Skills">
              <div className="flex flex-wrap gap-2">
                {availableSkills.length > 0 ? (
                  availableSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        background: 'var(--panel-accent-bg)',
                        border: '1px solid var(--panel-accent-border)',
                        color: 'var(--panel-accent-text)',
                      }}
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm" style={{ color: 'var(--panel-text-muted)' }}>
                    No structured skills are currently declared by the kernel for this intent.
                  </p>
                )}
              </div>
            </Section>

            <Section icon={<Cpu size={16} />} title="Prompt variables">
              <div className="grid gap-3">
                {promptContract.variables.map((variable) => (
                  <Fragment key={variable.label}>
                    <KeyValue label={variable.label} value={variable.value} />
                  </Fragment>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </ShellOverlayFrame>
  );
}

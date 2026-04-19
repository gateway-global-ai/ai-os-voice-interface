import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type ShellGlassTheme = {
  chromeClassName: string;
  panelClassName: string;
  accentBadgeClassName: string;
  textClassName: string;
  mutedTextClassName: string;
  statusOkClassName: string;
  statusMutedClassName: string;
  statusErrorClassName: string;
  inputClassName: string;
  primaryButtonClassName: string;
  secondaryButtonClassName: string;
};

export type ShellTranscriptMessage = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestampLabel: string;
};

type Props = {
  theme: ShellGlassTheme;
  mode: 'voice' | 'chat';
  messages: ShellTranscriptMessage[];
  transcription?: string;
  centerStage?: ReactNode;
  chatEndRef?: React.RefObject<HTMLDivElement | null>;
  renderMessage?: (message: ShellTranscriptMessage) => ReactNode;
};

function DefaultMessageRow({
  message,
  theme,
}: {
  message: ShellTranscriptMessage;
  theme: ShellGlassTheme;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <article
        className={cn(
          'max-w-[85%] md:max-w-2xl rounded-3xl border px-4 py-3 shadow-lg md:px-5 md:py-4',
          theme.panelClassName,
          isUser
            ? 'border-emerald-300/30 bg-emerald-500/24'
            : 'border-white/12 bg-slate-950/42',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className={cn('text-[10px] font-black uppercase tracking-[0.18em]', isUser ? 'text-emerald-200' : theme.mutedTextClassName)}>
            {isUser ? 'Operator' : 'Kernel'}
          </span>
          <span className={cn('text-[10px]', theme.mutedTextClassName)}>{message.timestampLabel}</span>
        </div>
        <p className={cn('mt-2 whitespace-pre-wrap text-sm leading-6 md:text-[15px]', theme.textClassName)}>{message.text}</p>
      </article>
    </div>
  );
}

export function ShellContentZone({
  theme,
  mode,
  messages,
  transcription,
  centerStage,
  chatEndRef,
  renderMessage,
}: Props) {
  return (
    <main className="relative z-[var(--z-shell-main)] flex h-full flex-col px-4 pb-[calc(var(--shell-footer-height)+1.25rem)] pt-[calc(var(--shell-header-height)+2.5rem)] md:px-6">
      {mode === 'chat' ? (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-1 py-3 md:px-3 md:py-4">
            <div className="mx-auto flex max-w-4xl flex-col gap-3">
              {messages.map((message) =>
                renderMessage ? renderMessage(message) : <DefaultMessageRow key={message.id} message={message} theme={theme} />,
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 items-center justify-center">
          {centerStage}
          {transcription ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
              <div className={cn('max-w-3xl rounded-2xl border px-5 py-3 text-center shadow-xl', theme.panelClassName, theme.chromeClassName)}>
                <p className={cn('text-sm font-medium md:text-base', theme.textClassName)}>{transcription}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}

import type { VoiceProfile } from '../../core/io/VoiceboxClient';
import type { ShellMenuRecordingStatus } from '../../shell/shellMenuStoreTypes';

type Props = {
  profiles: VoiceProfile[];
  activeProfileId: string | null;
  sampleCount: number;
  sampleTarget: number;
  promptText: string;
  captureStatus: ShellMenuRecordingStatus;
  lastError: string | null;
  voiceboxReady: boolean | null;
  pttBindingEnabled: boolean;
  onSelectProfile: (profileId: string) => void;
};

function captureStatusLabel(status: ShellMenuRecordingStatus, pttBindingEnabled: boolean) {
  switch (status) {
    case 'armed':
      return pttBindingEnabled ? 'Hold the shell button below to capture a sample.' : 'Capture is not armed.';
    case 'recording':
      return 'Recording now. Release the shell button when finished.';
    case 'saving':
      return 'Saving your sample to the selected profile.';
    case 'saved':
      return 'Sample saved. Continue with the next prompt when ready.';
    case 'error':
      return 'Capture failed. Review the error below and try again.';
    case 'idle':
    default:
      return 'Select a profile and use HOLD TO SPEAK below to record.';
  }
}

export function VoiceBoxRecordDetailSurface({
  profiles,
  activeProfileId,
  sampleCount,
  sampleTarget,
  promptText,
  captureStatus,
  lastError,
  voiceboxReady,
  pttBindingEnabled,
  onSelectProfile,
}: Props) {
  const progressPercent =
    sampleTarget > 0 ? Math.min(100, (sampleCount / sampleTarget) * 100) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section
        className="rounded-2xl p-4"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
        }}
      >
        <label
          htmlFor="voicebox-record-profile"
          className="block text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--panel-text-muted)' }}
        >
          Select a profile
        </label>
        <select
          id="voicebox-record-profile"
          className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm"
          style={{
            background: 'var(--panel-input-bg)',
            border: '1px solid var(--panel-input-border)',
            color: 'var(--panel-text)',
          }}
          value={activeProfileId ?? ''}
          onChange={(event) => onSelectProfile(event.target.value)}
        >
          <option value="">Select a profile</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        {voiceboxReady === false ? (
          <p className="mt-3 text-xs" style={{ color: 'var(--panel-text-muted)' }}>
            Voice Box runtime is offline. Start the local runtime before recording samples.
          </p>
        ) : null}
      </section>

      <section
        className="rounded-2xl p-4"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: 'var(--panel-text-muted)' }}
          >
            Sample progress
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--panel-heading)' }}>
            {sampleCount} / {sampleTarget} recommended
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full"
          style={{ background: 'var(--panel-bg)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              background: 'var(--panel-accent-border)',
            }}
          />
        </div>
      </section>

      <section
        className="rounded-2xl p-4"
        style={{
          background: 'var(--panel-surface)',
          border: '1px solid var(--panel-border)',
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--panel-text-muted)' }}
        >
          Read this aloud
        </p>
        <p className="mt-3 text-base font-medium leading-relaxed" style={{ color: 'var(--panel-heading)' }}>
          "{promptText}"
        </p>
      </section>

      <section
        className="rounded-2xl p-4"
        style={{
          background: 'var(--panel-accent-bg)',
          border: '1px solid var(--panel-accent-border)',
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: 'var(--panel-accent-text)' }}
        >
          Hold to speak
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--panel-text)' }}>
          {captureStatusLabel(captureStatus, pttBindingEnabled)}
        </p>
        {lastError ? (
          <p className="mt-3 text-xs" style={{ color: 'var(--panel-text)' }}>
            {lastError}
          </p>
        ) : null}
      </section>
    </div>
  );
}

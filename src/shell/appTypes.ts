export type SystemStatus =
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "offline";

export type VoicePlaybackEngine =
  | 'idle'
  | 'gemini'
  | 'voicebox'
  | 'browser'
  | 'browser_fallback';

export type ShellAudioCueSource = 'agent' | 'onboarding' | 'system' | 'landing';

export type ShellAudioCue = {
  id: string;
  text: string;
  label: string;
  source: ShellAudioCueSource;
  status: 'queued' | 'playing' | 'played' | 'stopped';
  createdAt: string;
  overrideVoice?: string;
};

export type AppMode =
  | "voice"
  | "chat"
  | "visual"
  | "voice_settings"
  | "disc_settings"
  | "intent_settings"
  | "api_health"
  | "appearance"
  | "voice_control"
  | "knowledge"
  | "user_storage"
  | "transparency"
  | "podcasts"
  | "create_account"
  | "coding_agent";

export interface Message {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

export interface DISCProfile {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

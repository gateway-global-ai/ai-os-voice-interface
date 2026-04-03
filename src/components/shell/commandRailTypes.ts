/** Shared types for the governed footer / command rail. */

export type CommandRailState = {
  mode: 'voice' | 'chat';
  primaryAction: 'ptt' | 'send';
  systemStatus: 'idle' | 'listening' | 'processing' | 'speaking';
  intent?: string;
};

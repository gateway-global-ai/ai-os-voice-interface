import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { invoke } from '@tauri-apps/api/core';
import * as VoiceboxClient from '../core/io/VoiceboxClient';
import type { PowerChromeState } from '../components/shell/ShellSystemControls';
import type { VoiceRouteId } from '../config/voiceRoutePreference';
import { isTauri, tryQuitApplication } from '../lib/tauriRuntime';
import type { ShellTheme } from './useShellTheme';
import type { AppMode, Message } from './appTypes';
import type { ShellMenuId } from './shellMenuContract';
import type { ShellMenuStoreState } from './shellMenuStoreTypes';
import { readInterimShellAuthority } from './shellAuthority';
import {
  evaluateShellSkillActionAuthority,
  SKILL_RELATED_SHELL_ACTION_IDS,
} from './skillIntentAuthority';
import { readVibeGuestDisplayName } from './vibeCodersSystemPrompt';

type AppearanceTune = null | 'overlay_color' | 'overlay_opacity' | 'overlay_width' | 'canvas_padding' | 'live_background';

export interface UseShellMenuActionsArgs {
  activeShellMenuId: ShellMenuId | null;
  activeMenuId: ShellMenuId | null;
  authStatus: 'guest' | 'authenticated';
  powerChromeState: PowerChromeState;
  showDiagnosticsChrome: boolean;
  engageSessionEntry: () => void;
  closeShellMenus: () => void;
  markShellMenuActionSelected: (menuId: ShellMenuId | null, actionId: string) => void;
  openGuestJoinSurface: () => void;
  openShellMenuById: (menuId: ShellMenuId) => void;
  openVcuDesktop: (view: 'intro' | 'coursework' | 'lab' | 'cursor' | 'skills' | 'access') => void;
  openWorkspaceHub: () => void;
  handleOpenPodcasts: () => void;
  handleOpenKnowledgePanel: (initialTab?: 'library' | 'upload') => void;
  handleLogout: () => void;
  applyVoiceRoute: (route: VoiceRouteId) => void;
  refreshVoiceboxRecordingState: () => Promise<void>;
  selectVoiceboxRecordingProfile: (profileId: string | null) => void;
  activateVoiceboxProfile: (profileId: string) => Promise<void>;
  resetTheme: () => void;
  setAppearanceTune: Dispatch<SetStateAction<AppearanceTune>>;
  setAuthPanelOpen: Dispatch<SetStateAction<boolean>>;
  setGuestNicknameDraft: Dispatch<SetStateAction<string>>;
  setGuestNicknameOverlayOpen: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setMode: Dispatch<SetStateAction<AppMode>>;
  setShellMenuRecordingState: (
    updater:
      | Partial<ShellMenuStoreState['recording']>
      | ((recording: ShellMenuStoreState['recording']) => ShellMenuStoreState['recording']),
  ) => void;
  setShellSessionStarted: Dispatch<SetStateAction<boolean>>;
  setTheme: (patch: Partial<ShellTheme>) => void;
}

export function useShellMenuActions({
  activeShellMenuId,
  activeMenuId,
  authStatus,
  powerChromeState,
  showDiagnosticsChrome,
  engageSessionEntry,
  closeShellMenus,
  markShellMenuActionSelected,
  openGuestJoinSurface,
  openShellMenuById,
  openVcuDesktop,
  openWorkspaceHub,
  handleOpenPodcasts,
  handleOpenKnowledgePanel,
  handleLogout,
  applyVoiceRoute,
  refreshVoiceboxRecordingState,
  selectVoiceboxRecordingProfile,
  activateVoiceboxProfile,
  resetTheme,
  setAppearanceTune,
  setAuthPanelOpen,
  setGuestNicknameDraft,
  setGuestNicknameOverlayOpen,
  setMessages,
  setMode,
  setShellMenuRecordingState,
  setShellSessionStarted,
  setTheme,
}: UseShellMenuActionsArgs) {
  const handleShellMenuAction = useCallback(
    async (actionId: string) => {
      engageSessionEntry();
      setShellSessionStarted(true);
      markShellMenuActionSelected(activeShellMenuId ?? activeMenuId, actionId);

      if (SKILL_RELATED_SHELL_ACTION_IDS.has(actionId)) {
        const skillGate = evaluateShellSkillActionAuthority({
          actionId,
          authStatus,
          interimAuthority: readInterimShellAuthority(),
        });
        if (skillGate.ok === false) {
          closeShellMenus();
          setMessages((prev) => [
            ...prev,
            {
              id: `skill_authority_${Date.now()}`,
              role: 'agent',
              text: `Skill authority denied: ${skillGate.reason} Evidence required: ${skillGate.evidenceRequired}`,
              timestamp: new Date(),
            },
          ]);
          return;
        }
      }

      switch (actionId) {
        case 'guest_verify_phone':
          closeShellMenus();
          setAuthPanelOpen(true);
          return;
        case 'guest_open_display_name':
          closeShellMenus();
          setGuestNicknameDraft(readVibeGuestDisplayName() ?? '');
          setGuestNicknameOverlayOpen(true);
          return;
        case 'guest_explore_topics':
          closeShellMenus();
          openGuestJoinSurface();
          return;
        case 'guest_open_public_shell_menu':
          closeShellMenus();
          openShellMenuById('shell-header-system');
          return;
        case 'open_menu_vcu':
          setMode('voice');
          openShellMenuById('vibe-coding-university');
          return;
        case 'open_vcu_intro':
          openVcuDesktop('intro');
          return;
        case 'open_vcu_coursework':
          openVcuDesktop('coursework');
          return;
        case 'open_vibe_code_lab':
          openVcuDesktop('lab');
          return;
        case 'open_vcu_cursor_pack':
          openVcuDesktop('cursor');
          return;
        case 'open_skill_registry':
          openVcuDesktop('skills');
          return;
        case 'open_vcu_registration':
          if (authStatus === 'guest') {
            closeShellMenus();
            setAuthPanelOpen(true);
          } else {
            openVcuDesktop('access');
          }
          return;
        case 'open_workspace':
          openWorkspaceHub();
          return;
        case 'open_user_storage':
          closeShellMenus();
          setMode('user_storage');
          return;
        case 'open_voice_control':
        case 'open_menu_voice_control':
          setMode('voice');
          openShellMenuById('voice-control');
          return;
        case 'open_menu_voice_box':
          setMode('voice');
          openShellMenuById('voice-box');
          return;
        case 'open_podcasts':
          handleOpenPodcasts();
          return;
        case 'open_menu_appearance':
          setMode('voice');
          openShellMenuById('appearance');
          return;
        case 'open_menu_agent_identity':
          setMode('voice');
          openShellMenuById('agent-identity');
          return;
        case 'open_arch_protocol_reference':
          closeShellMenus();
          setMode('intent_settings');
          return;
        case 'open_disc_settings':
          closeShellMenus();
          setMode('disc_settings');
          return;
        case 'open_api_health':
          closeShellMenus();
          if (showDiagnosticsChrome) {
            setMode('api_health');
          }
          return;
        case 'open_knowledge':
          handleOpenKnowledgePanel('library');
          return;
        case 'open_transparency':
          closeShellMenus();
          setMode('transparency');
          return;
        case 'open_coding_agent':
          closeShellMenus();
          setMode('coding_agent');
          return;
        case 'system_logout':
          if (powerChromeState === 'signed_in') {
            closeShellMenus();
            handleLogout();
          }
          return;
        case 'system_quit_app':
          await tryQuitApplication();
          return;
        case 'set_voice_route_gemini':
          applyVoiceRoute('gemini');
          return;
        case 'set_voice_route_voicebox':
          applyVoiceRoute('voicebox');
          return;
        case 'set_voice_route_browser':
          applyVoiceRoute('browser');
          return;
        case 'appearance_set_dark_mode':
          setTheme({ colorScheme: 'dark' });
          return;
        case 'appearance_set_light_mode':
          setTheme({ colorScheme: 'light' });
          return;
        case 'appearance_reset_defaults':
          resetTheme();
          return;
        case 'appearance_set_background_live_effects':
          closeShellMenus();
          setTheme({ backgroundType: 'canvas', customBgKind: null, customBgPath: null });
          setAppearanceTune('live_background');
          return;
        case 'appearance_open_overlay_color':
          closeShellMenus();
          setAppearanceTune('overlay_color');
          return;
        case 'appearance_open_overlay_opacity':
          closeShellMenus();
          setAppearanceTune('overlay_opacity');
          return;
        case 'appearance_open_overlay_width':
          closeShellMenus();
          setAppearanceTune('overlay_width');
          return;
        case 'appearance_open_canvas_padding':
          closeShellMenus();
          setAppearanceTune('canvas_padding');
          return;
        case 'appearance_open_custom_background': {
          if (!isTauri) return;
          const result = await invoke<[string, string] | null>('pick_file');
          if (!result?.[0]) return;
          const path = result[0];
          const ext = path.split('.').pop()?.toLowerCase() ?? '';
          const video = ['mp4', 'webm', 'mov', 'avi'].includes(ext);
          setTheme({
            backgroundType: 'custom',
            customBgPath: path,
            customBgKind: video ? 'video' : 'image',
          });
          return;
        }
        case 'appearance_open_background_library':
          closeShellMenus();
          setTheme({ backgroundType: 'canvas', customBgKind: null, customBgPath: null });
          setAppearanceTune('live_background');
          return;
        case 'open_voicebox_profiles':
        case 'open_voicebox_create':
          await refreshVoiceboxRecordingState();
          setMode('voice');
          openShellMenuById('voice-box');
          return;
        case 'open_voicebox_upload': {
          const archivePath = await VoiceboxClient.pickArchivePath();
          if (!archivePath) return;
          const profile = await VoiceboxClient.importProfileArchive(archivePath);
          await refreshVoiceboxRecordingState();
          selectVoiceboxRecordingProfile(profile.id);
          await activateVoiceboxProfile(profile.id);
          return;
        }
        case 'open_voicebox_record':
          setShellMenuRecordingState((recording) => ({
            ...recording,
            capture_status: recording.active_profile_id ? 'armed' : 'idle',
            capture_chunks: [],
            last_error: null,
            ptt_binding_enabled: Boolean(recording.active_profile_id),
          }));
          await refreshVoiceboxRecordingState();
          return;
        default:
          return;
      }
    },
    [
      activateVoiceboxProfile,
      activeMenuId,
      activeShellMenuId,
      applyVoiceRoute,
      authStatus,
      closeShellMenus,
      engageSessionEntry,
      handleLogout,
      handleOpenKnowledgePanel,
      handleOpenPodcasts,
      markShellMenuActionSelected,
      openGuestJoinSurface,
      openShellMenuById,
      openVcuDesktop,
      openWorkspaceHub,
      powerChromeState,
      refreshVoiceboxRecordingState,
      resetTheme,
      selectVoiceboxRecordingProfile,
      setAppearanceTune,
      setAuthPanelOpen,
      setGuestNicknameDraft,
      setGuestNicknameOverlayOpen,
      setMessages,
      setMode,
      setShellMenuRecordingState,
      setShellSessionStarted,
      setTheme,
      showDiagnosticsChrome,
    ],
  );

  return { handleShellMenuAction };
}

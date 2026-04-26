import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../lib/tauriRuntime';
import type { AppMode, Message } from './appTypes';

type ActiveIntentState = Record<string, string> & {
  agentIntent?: string;
  userIntent?: string;
  greetingMessage?: string;
};

export interface UseTauriKernelBridgeArgs {
  activeAgentMessageIdRef: MutableRefObject<string | null>;
  latestFrameRef: MutableRefObject<string | null>;
  setAgentIntent: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setMode: Dispatch<SetStateAction<AppMode>>;
  setUserIntent: Dispatch<SetStateAction<string>>;
  workspaceCanvasView?: string;
}

export function useTauriKernelBridge({
  activeAgentMessageIdRef,
  latestFrameRef,
  setAgentIntent,
  setMessages,
  setMode,
  setUserIntent,
  workspaceCanvasView,
}: UseTauriKernelBridgeArgs) {
  useEffect(() => {
    if (!isTauri) {
      setMessages([
        {
          id: '1',
          role: 'agent',
          text: 'Welcome to AI OS. How can I help you today?',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    Promise.all([
      invoke<Array<{ message_id: string; role: string; text: string; timestamp_ms: number }>>('get_conversation_history').catch(() => []),
      invoke<ActiveIntentState>('get_active_intent_state').catch((): ActiveIntentState => ({})),
    ]).then(([history, intentState]) => {
      if (intentState.agentIntent) setAgentIntent(intentState.agentIntent);
      if (intentState.userIntent) setUserIntent(intentState.userIntent);

      const greeting = intentState.greetingMessage || 'Welcome to AI OS. How can I help you today?';

      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m.message_id,
            role: m.role as 'user' | 'agent',
            text: m.text,
            timestamp: new Date(m.timestamp_ms),
          })),
        );
      } else {
        setMessages([
          {
            id: '1',
            role: 'agent',
            text: greeting,
            timestamp: new Date(),
          },
        ]);
      }
    });
  }, [setAgentIntent, setMessages, setUserIntent]);

  useEffect(() => {
    if (!isTauri) return undefined;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void (async () => {
      unlisten = await listen('open_coding_agent', () => {
        if (!cancelled) setMode('coding_agent');
      });
    })();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [setMode]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      const isTauriRuntime = '__TAURI_IPC__' in window;
      if (!isTauriRuntime) {
        console.warn("Browser Mode Detected: Skipping Tauri event listener setup.");
        return;
      }

      try {
        const unlistenFn = await listen<string>('llm_token', (event) => {
          setMessages((prev) => {
            const targetId = activeAgentMessageIdRef.current;
            if (!targetId) return prev;
            const targetIndex = prev.findIndex((msg) => msg.id === targetId && msg.role === 'agent');
            if (targetIndex === -1) return prev;
            const targetMessage = prev[targetIndex];
            const updatedTarget = {
              ...targetMessage,
              text: targetMessage.text.replace('Thinking with local Ollama kernel...', '') + event.payload,
            };
            return [
              ...prev.slice(0, targetIndex),
              updatedTarget,
              ...prev.slice(targetIndex + 1),
            ];
          });
        });

        if (cancelled) {
          activeAgentMessageIdRef.current = null;
          unlistenFn();
        } else {
          unlisten = () => {
            activeAgentMessageIdRef.current = null;
            unlistenFn();
          };
        }
      } catch (err) {
        console.error('Failed to setup Tauri event listener:', err);
      }
    };

    void setupListener();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [activeAgentMessageIdRef, setMessages]);

  const persistMessage = useCallback((msg: Message) => {
    if (!isTauri) return;
    void invoke('append_conversation_message', {
      message: {
        message_id: msg.id,
        role: msg.role,
        text: msg.text,
        timestamp_ms: msg.timestamp.getTime(),
      },
    }).catch(() => { /* DB write failed - not critical */ });
  }, []);

  const captureFrame = useCallback(() => {
    if (!isTauri) return;
    invoke<string>('capture_visual_context')
      .then((b64) => { latestFrameRef.current = b64; })
      .catch(() => { /* window minimised */ });
  }, [latestFrameRef]);

  useEffect(() => {
    captureFrame();
  }, [workspaceCanvasView, captureFrame]);

  return { captureFrame, persistMessage };
}

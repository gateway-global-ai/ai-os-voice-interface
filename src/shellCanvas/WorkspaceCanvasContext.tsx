/**
 * Workspace canvas provider — load/close/back for Google Workspace surfaces (AIOS-SPEC-007).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { CanvasView, WorkspaceCanvasState } from './canvasTypes';
import { isWorkspaceHubView, validateWorkspaceTransition, buildWorkspaceCanvasState } from './canvasTransitions';
import { canOpenCanvas, evaluateCanvasPolicy } from './policyGuard';
import { parseAgentIntentDetailed } from './intentParse';
import {
  workspaceIntentToCanvasView,
  workspaceMailReadMessageIdFromIntent,
} from '../workspace/workspaceIntentRouter';
import { workspaceViewAfterConnect } from '../workspace/workspacePostConnect';
import { getShellCanvasAuditSnapshot, logShellCanvasAudit, newEventId } from './shellCanvasAudit';
import {
  isPayloadEmpty,
  loadWorkspacePayload,
  type WorkspaceViewPayload,
} from './loadWorkspacePayload';
import type { PolicyDeniedHandler } from './policyDeniedContract';

export type WorkspaceCanvasOpenParams = {
  mailMessageId?: string;
};

export type WorkspaceCanvasOpenOptions = {
  transitionMode?: 'ui' | 'intent';
  auditDetail?: Record<string, unknown>;
};

export type WorkspaceDataPhase = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type WorkspaceCanvasContextValue = {
  canvas: WorkspaceCanvasState;
  payload: WorkspaceViewPayload | null;
  dataPhase: WorkspaceDataPhase;
  dataError: string | null;
  loadData: (
    view: CanvasView,
    params?: WorkspaceCanvasOpenParams,
    options?: WorkspaceCanvasOpenOptions
  ) => Promise<boolean>;
  loadDataAfterWorkspaceConnect: () => Promise<boolean>;
  retryLoadData: () => Promise<boolean>;
  closeCanvas: () => void;
  goBack: () => void;
  dismissBackdrop: () => void;
  canOpen: (view: CanvasView) => boolean;
  applyAgentIntent: (rawAgentText: string) => void;
  getAuditSnapshot: () => ReturnType<typeof getShellCanvasAuditSnapshot>;
};

const WorkspaceCanvasContext = createContext<WorkspaceCanvasContextValue | null>(null);

export function WorkspaceCanvasProvider({
  children,
  onPolicyDenied,
}: {
  children: ReactNode;
  onPolicyDenied?: PolicyDeniedHandler;
}): ReactElement {
  const [canvas, setCanvas] = useState<WorkspaceCanvasState>(null);
  const [payload, setPayload] = useState<WorkspaceViewPayload | null>(null);
  const [dataPhase, setDataPhase] = useState<WorkspaceDataPhase>('idle');
  const [dataError, setDataError] = useState<string | null>(null);

  const loadAbortRef = useRef<AbortController | null>(null);
  const lastLoadRef = useRef<{
    view: CanvasView;
    params?: WorkspaceCanvasOpenParams;
    options?: WorkspaceCanvasOpenOptions;
  } | null>(null);

  const canOpen = useCallback((view: CanvasView) => canOpenCanvas(view), []);

  const loadData = useCallback(
    async (
      view: CanvasView,
      params?: WorkspaceCanvasOpenParams,
      options?: WorkspaceCanvasOpenOptions
    ): Promise<boolean> => {
      const transitionMode = options?.transitionMode ?? 'ui';
      const from = canvas?.view ?? null;
      const next = buildWorkspaceCanvasState(view, params);
      const eventId = newEventId();

      lastLoadRef.current = { view, params, options };

      if (!validateWorkspaceTransition(from, next.view, transitionMode)) {
        logShellCanvasAudit('policy_denied', {
          kind: 'transition',
          from,
          to: next.view,
          eventId,
        });
        void onPolicyDenied?.({
          type: 'policy_denied',
          reason: 'transition_not_allowed',
          spokenMessage: 'That screen is not available from here.',
          eventId,
        });
        return false;
      }

      const p = evaluateCanvasPolicy(next.view);
      if (!p.allowed) {
        logShellCanvasAudit('policy_denied', {
          kind: 'policy',
          view: next.view,
          reason: p.reason ?? 'policy',
          eventId,
        });
        void onPolicyDenied?.({
          type: 'policy_denied',
          reason: p.reason || 'policy_denied',
          spokenMessage: p.reason || 'That view is not available right now.',
          eventId,
        });
        return false;
      }

      loadAbortRef.current?.abort();
      const ac = new AbortController();
      loadAbortRef.current = ac;

      setCanvas(next);
      setPayload(null);
      setDataPhase('loading');
      setDataError(null);

      try {
        const loaded = await loadWorkspacePayload(
          next.view,
          {
            mailMessageId: next.view === 'workspace_mail_hub' ? next.mailMessageId : undefined,
          },
          ac.signal
        );
        if (ac.signal.aborted) return false;
        setPayload(loaded);
        if (loaded.view === 'workspace_onboarding') {
          setCanvas({ view: 'workspace_onboarding' });
        }
        setDataPhase(isPayloadEmpty(loaded) ? 'empty' : 'success');
        logShellCanvasAudit('view_opened', {
          ...(options?.auditDetail ?? {}),
          view: loaded.view,
          eventId,
        });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return false;
        const msg = e instanceof Error ? e.message : 'Load failed';
        setDataPhase('error');
        setDataError(msg);
        setPayload(null);
        logShellCanvasAudit('policy_denied', {
          kind: 'load',
          view: next.view,
          reason: msg,
          eventId,
        });
        return false;
      }
    },
    [canvas?.view, onPolicyDenied]
  );

  const loadDataAfterWorkspaceConnect = useCallback(async (): Promise<boolean> => {
    const L = lastLoadRef.current;
    const req = L?.view;
    const mid = L?.params?.mailMessageId?.trim();
    const narrow = mid ? { mailMessageId: mid } : undefined;
    const { view, params } = workspaceViewAfterConnect(req, narrow);
    return loadData(view, params, {
      transitionMode: 'ui',
      auditDetail: {
        workspace_post_connect: true,
        prior_request: req ?? null,
        target: view,
      },
    });
  }, [loadData]);

  const retryLoadData = useCallback(async (): Promise<boolean> => {
    const L = lastLoadRef.current;
    if (!L) return false;
    return loadData(L.view, L.params, L.options);
  }, [loadData]);

  const closeCanvas = useCallback(() => {
    loadAbortRef.current?.abort();
    setCanvas((c) => {
      if (c) {
        logShellCanvasAudit('view_closed', { from: c.view, transition: 'close' });
      }
      return null;
    });
    setPayload(null);
    setDataPhase('idle');
    setDataError(null);
    lastLoadRef.current = null;
  }, []);

  const stepBackFromSubSurface = useCallback(() => {
    if (!canvas) return;
    if (canvas.view === 'workspace_onboarding') {
      closeCanvas();
      return;
    }
    if (
      canvas.view === 'workspace_calendar_hub' ||
      canvas.view === 'workspace_mail_hub' ||
      canvas.view === 'workspace_drive_hub' ||
      canvas.view === 'workspace_contacts_hub' ||
      canvas.view === 'workspace_search_hub'
    ) {
      void loadData('workspace_hub', undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'workspace_hub') {
      closeCanvas();
      return;
    }
    closeCanvas();
  }, [canvas, loadData, closeCanvas]);

  const goBack = useCallback(() => {
    if (!canvas || isWorkspaceHubView(canvas.view)) return;
    logShellCanvasAudit('view_closed', {
      from: canvas.view,
      transition: 'subsurface->parent',
    });
    stepBackFromSubSurface();
  }, [canvas, stepBackFromSubSurface]);

  const dismissBackdrop = useCallback(() => {
    if (!canvas) return;
    if (canvas.view === 'workspace_onboarding') {
      logShellCanvasAudit('backdrop_dismiss', { from: canvas.view });
      closeCanvas();
      return;
    }
    if (
      canvas.view === 'workspace_calendar_hub' ||
      canvas.view === 'workspace_mail_hub' ||
      canvas.view === 'workspace_drive_hub' ||
      canvas.view === 'workspace_contacts_hub' ||
      canvas.view === 'workspace_search_hub'
    ) {
      logShellCanvasAudit('backdrop_dismiss', { from: canvas.view });
      void loadData('workspace_hub', undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'workspace_hub') {
      logShellCanvasAudit('backdrop_dismiss', { from: canvas.view });
      closeCanvas();
      return;
    }
    closeCanvas();
  }, [canvas, closeCanvas, loadData]);

  const applyAgentIntent = useCallback(
    (rawAgentText: string) => {
      const agent = parseAgentIntentDetailed(rawAgentText);
      if (agent.kind !== 'workspace') return;
      logShellCanvasAudit('intent_parsed', {
        source: 'json',
        intent: agent.parsed.intent,
        subsystem: 'google_workspace',
        resource_id: agent.parsed.resource_id ?? null,
      });
      const next = workspaceIntentToCanvasView(agent.parsed);
      const mid = workspaceMailReadMessageIdFromIntent(agent.parsed);
      const openParams =
        next.view === 'workspace_mail_hub' && mid ? { mailMessageId: mid } : undefined;
      void loadData(next.view, openParams, { transitionMode: 'intent' });
    },
    [loadData]
  );

  const value = useMemo<WorkspaceCanvasContextValue>(
    () => ({
      canvas,
      payload,
      dataPhase,
      dataError,
      loadData,
      loadDataAfterWorkspaceConnect,
      retryLoadData,
      closeCanvas,
      goBack,
      dismissBackdrop,
      canOpen,
      applyAgentIntent,
      getAuditSnapshot: getShellCanvasAuditSnapshot,
    }),
    [
      canvas,
      payload,
      dataPhase,
      dataError,
      loadData,
      loadDataAfterWorkspaceConnect,
      retryLoadData,
      closeCanvas,
      goBack,
      dismissBackdrop,
      canOpen,
      applyAgentIntent,
    ]
  );

  return <WorkspaceCanvasContext.Provider value={value}>{children}</WorkspaceCanvasContext.Provider>;
}

export function useWorkspaceCanvas(): WorkspaceCanvasContextValue {
  const ctx = useContext(WorkspaceCanvasContext);
  if (!ctx) {
    throw new Error('useWorkspaceCanvas must be used within WorkspaceCanvasProvider');
  }
  return ctx;
}

export type { PolicyDeniedHandler } from './policyDeniedContract';
export type { WorkspaceViewPayload } from './loadWorkspacePayload';

/**
 * Sole control surface for governance canvas: open/close/back, backdrop, data load, audit.
 * Do not log governance navigation or mutate canvas from overlays — use this provider only.
 *
 * **Controller vocabulary (keep methods in these buckets):**
 * - `loadData` — view hydration (transition + policy + fetch + payload + `dataPhase`)
 * - `runSearch` — list-scoped corpus search projection (not navigation)
 * - `retryLoadData` — recovery after failed hydration
 * - `applyAmendmentWorkflowRun` — merge server run after POST /advance (no full reload; avoids flash)
 * - `refreshLifecycleSelection` — sub-load for lifecycle versions
 * - Future: e.g. `runComplianceCheck` — user-triggered action ops (when multiple flows need it)
 *
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
import type { CanvasView, GovernanceCanvasState } from './canvasTypes';
import { intentToCanvasView } from './canvasTypes';
import { canOpenCanvas, evaluateCanvasPolicy } from './policyGuard';
import {
  buildGovernanceCanvasState,
  GOVERNANCE_HOME_VIEW,
  isGovernanceHomeView,
  validateGovernanceTransition,
  type CanvasTransitionMode,
} from './canvasTransitions';
import { parseAgentIntentDetailed } from './intentParse';
import { workspaceIntentToCanvasView } from '../workspace/workspaceIntentRouter';
import { getGovernanceAuditSnapshot, logGovernanceAudit, newEventId } from './governanceAudit';
import {
  isPayloadEmpty,
  loadGovernancePayload,
  loadLifecycleVersionsPayload,
  type GovernanceViewPayload,
} from './loadGovernancePayload';
import type { PolicyDeniedHandler } from './policyDeniedContract';
import { executeDocumentFullTextSearch, type GovernanceSearchPhase } from './governanceSearch';
import type { AmendmentWorkflowRunState, DocumentListItem } from './canvasBridge';

export type GovernanceCanvasOpenParams = {
  documentId?: string;
  /** Amendment workflow run id (after first load). */
  workflowRunId?: string;
  /** Source folder for action plan review (e.g. AMD-2026-a10b9a). */
  actionPlanSource?: string;
  /** Amendment workflow: full edit vs read-only review (completed runs). */
  amendmentWorkflowMode?: 'edit' | 'review';
  /** When `document_list` was opened from a work mode, back returns here instead of the hub. */
  returnAfterList?: CanvasView;
  /** Slimmer list chrome for Review Docs (hide conflicts / compliance / lifecycle shortcuts). */
  listMode?: 'full' | 'review';
};

export type GovernanceCanvasOpenOptions = {
  transitionMode?: CanvasTransitionMode;
  /** Merged into `view_opened` audit detail (frozen taxonomy — no new event types). */
  auditDetail?: Record<string, unknown>;
};

export type GovernanceDataPhase = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type GovernanceCanvasContextValue = {
  canvas: GovernanceCanvasState;
  payload: GovernanceViewPayload | null;
  dataPhase: GovernanceDataPhase;
  dataError: string | null;
  /** Versions refetch after changing document in lifecycle surface. */
  lifecycleBusy: boolean;
  /** `document_list` chrome: `review` hides auxiliary governance shortcuts. */
  documentListToolbarMode: 'full' | 'review';
  /** Sub-operation while `document_list` is active (not a navigation mode). List-scoped only. */
  searchQuery: string;
  /** Temporary search projection over the base list (`null` = show registry order). */
  searchProjection: DocumentListItem[] | null;
  searchPhase: GovernanceSearchPhase;
  searchError: string | null;
  runSearch: (query: string) => Promise<boolean>;
  clearSearch: () => void;
  loadData: (
    view: CanvasView,
    params?: GovernanceCanvasOpenParams,
    options?: GovernanceCanvasOpenOptions
  ) => Promise<boolean>;
  retryLoadData: () => Promise<boolean>;
  /** Apply run returned from `advanceAmendmentWorkflowRun` without clearing payload (no loading flash). */
  applyAmendmentWorkflowRun: (run: AmendmentWorkflowRunState) => void;
  refreshLifecycleSelection: (documentId: string) => Promise<void>;
  closeCanvas: () => void;
  goBack: () => void;
  dismissBackdrop: () => void;
  canOpen: (view: CanvasView) => boolean;
  applyAgentIntent: (rawAgentText: string) => void;
  getAuditSnapshot: () => ReturnType<typeof getGovernanceAuditSnapshot>;
};

const GovernanceCanvasContext = createContext<GovernanceCanvasContextValue | null>(null);

export function GovernanceCanvasProvider({
  children,
  onPolicyDenied,
}: {
  children: ReactNode;
  onPolicyDenied?: PolicyDeniedHandler;
}): ReactElement {
  const [canvas, setCanvas] = useState<GovernanceCanvasState>(null);
  const [payload, setPayload] = useState<GovernanceViewPayload | null>(null);
  const [dataPhase, setDataPhase] = useState<GovernanceDataPhase>('idle');
  const [dataError, setDataError] = useState<string | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchProjection, setSearchProjection] = useState<DocumentListItem[] | null>(null);
  const [searchPhase, setSearchPhase] = useState<GovernanceSearchPhase>('idle');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [documentListToolbarMode, setDocumentListToolbarMode] = useState<'full' | 'review'>('full');

  const loadAbortRef = useRef<AbortController | null>(null);
  const lifecycleAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const documentViewBackRef = useRef<
    | null
    | { mode: 'list'; returnAfterList?: CanvasView; listMode: 'full' | 'review' }
    | { mode: 'hub' }
  >(null);
  /** When opening conflicts / compliance / lifecycle from the document list, return there on back. */
  const listToolReturnRef = useRef<GovernanceCanvasOpenParams | null>(null);
  /** When opening lifecycle from planning (not from list), return to that work mode on back. */
  const lifecycleWorkModeReturnRef = useRef<CanvasView | null>(null);
  const lastLoadRef = useRef<{
    view: CanvasView;
    params?: GovernanceCanvasOpenParams;
    options?: GovernanceCanvasOpenOptions;
  } | null>(null);

  const canOpen = useCallback((view: CanvasView) => canOpenCanvas(view), []);

  const clearSearch = useCallback(() => {
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setSearchQuery('');
    setSearchProjection(null);
    setSearchPhase('idle');
    setSearchError(null);
  }, []);

  const loadData = useCallback(
    async (
      view: CanvasView,
      params?: GovernanceCanvasOpenParams,
      options?: GovernanceCanvasOpenOptions
    ): Promise<boolean> => {
      const transitionMode = options?.transitionMode ?? 'ui';
      const from = canvas?.view ?? null;
      const prevLoadParams = lastLoadRef.current?.params;
      const next = buildGovernanceCanvasState(view, params);
      const eventId = newEventId();

      if (next.view === 'document_view') {
        listToolReturnRef.current = null;
        lifecycleWorkModeReturnRef.current = null;
        if (from === 'document_list') {
          documentViewBackRef.current = {
            mode: 'list',
            returnAfterList: prevLoadParams?.returnAfterList,
            listMode: prevLoadParams?.listMode === 'review' ? 'review' : 'full',
          };
        } else {
          documentViewBackRef.current = { mode: 'hub' };
        }
      } else if (
        from === 'document_list' &&
        (next.view === 'conflict_results' ||
          next.view === 'compliance_check' ||
          next.view === 'lifecycle_status')
      ) {
        listToolReturnRef.current = {
          returnAfterList: prevLoadParams?.returnAfterList,
          listMode: prevLoadParams?.listMode === 'review' ? 'review' : 'full',
        };
        lifecycleWorkModeReturnRef.current = null;
      } else if (from === 'planning_assistant' && next.view === 'lifecycle_status') {
        lifecycleWorkModeReturnRef.current = 'planning_assistant';
        listToolReturnRef.current = null;
      } else if (next.view === GOVERNANCE_HOME_VIEW) {
        listToolReturnRef.current = null;
        lifecycleWorkModeReturnRef.current = null;
      }

      lastLoadRef.current = { view, params, options };

      if (!validateGovernanceTransition(from, next.view, transitionMode)) {
        logGovernanceAudit('policy_denied', {
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

      if (!canOpenCanvas(next.view)) {
        const p = evaluateCanvasPolicy(next.view);
        logGovernanceAudit('policy_denied', {
          kind: 'policy',
          view: next.view,
          reason: p.reason ?? 'policy',
          eventId,
        });
        const spoken = p.reason || 'That governance view is not available right now.';
        void onPolicyDenied?.({
          type: 'policy_denied',
          reason: p.reason || 'policy_denied',
          spokenMessage: spoken,
          eventId,
        });
        return false;
      }

      clearSearch();

      if (next.view === 'document_list') {
        setDocumentListToolbarMode(params?.listMode === 'review' ? 'review' : 'full');
      }

      loadAbortRef.current?.abort();
      const ac = new AbortController();
      loadAbortRef.current = ac;

      setCanvas(next);
      setPayload(null);
      setDataPhase('loading');
      setDataError(null);

      try {
        const p = await loadGovernancePayload(
          next.view,
          {
            documentId: next.documentId,
            workflowRunId: next.workflowRunId,
            actionPlanSource:
              next.view === 'action_plan_review' ? next.actionPlanSource : undefined,
            amendmentWorkflowMode: next.amendmentWorkflowMode,
          },
          ac.signal
        );
        if (ac.signal.aborted) return false;
        setPayload(p);
        if (p.view === 'amendment_workflow' && p.run?.run_id) {
          const rid = p.run.run_id;
          const mode = p.mode ?? next.amendmentWorkflowMode ?? 'edit';
          setCanvas({
            view: 'amendment_workflow',
            workflowRunId: rid,
            amendmentWorkflowMode: mode,
          });
          lastLoadRef.current = {
            view,
            params: { ...params, workflowRunId: rid, amendmentWorkflowMode: mode },
            options,
          };
        }
        setDataPhase(isPayloadEmpty(p) ? 'empty' : 'success');
        logGovernanceAudit('view_opened', {
          ...(options?.auditDetail ?? {}),
          view: next.view,
          documentId: next.documentId,
          eventId,
        });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return false;
        const msg = e instanceof Error ? e.message : 'Load failed';
        setDataPhase('error');
        setDataError(msg);
        setPayload(null);
        logGovernanceAudit('policy_denied', {
          kind: 'load',
          view: next.view,
          reason: msg,
          eventId,
        });
        return false;
      }
    },
    [canvas?.view, onPolicyDenied, clearSearch]
  );

  const runSearch = useCallback(
    async (rawQuery: string): Promise<boolean> => {
      const q = rawQuery.trim();
      if (!q) return false;
      if (canvas?.view !== 'document_list') return false;
      if (dataPhase === 'loading' || dataPhase === 'error') return false;
      const registry = payload?.view === 'document_list' ? payload.documents : null;
      if (!registry) return false;

      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;

      setSearchPhase('loading');
      setSearchError(null);

      const searchEventId = newEventId();
      try {
        const outcome = await executeDocumentFullTextSearch(q, registry, ac.signal);
        if (ac.signal.aborted) return false;
        switch (outcome.kind) {
          case 'navigate':
            clearSearch();
            return loadData(
              'document_view',
              { documentId: outcome.documentId },
              {
                transitionMode: 'ui',
                auditDetail: {
                  source: 'search_single_hit',
                  query: q,
                  searchEventId,
                },
              }
            );
          case 'projection':
            setSearchQuery(q);
            setSearchProjection(outcome.documents);
            setSearchPhase('success');
            return true;
          case 'no_hits':
            setSearchQuery(q);
            setSearchProjection(null);
            setSearchError('No matches in full-text search. Try another term.');
            setSearchPhase('error');
            logGovernanceAudit('policy_denied', {
              kind: 'search',
              reason: 'no_hits',
              query: q,
              eventId: searchEventId,
            });
            return false;
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return false;
        const msg = e instanceof Error ? e.message : 'Search failed';
        setSearchError(msg);
        setSearchPhase('error');
        logGovernanceAudit('policy_denied', {
          kind: 'search',
          reason: msg,
          query: q,
          eventId: searchEventId,
        });
        return false;
      }
    },
    [canvas?.view, payload, dataPhase, loadData, clearSearch]
  );

  const retryLoadData = useCallback(async (): Promise<boolean> => {
    const L = lastLoadRef.current;
    if (!L) return false;
    return loadData(L.view, L.params, L.options);
  }, [loadData]);

  const applyAmendmentWorkflowRun = useCallback((run: AmendmentWorkflowRunState) => {
    const rid = run.run_id?.trim();
    if (!rid) return;
    const mode = lastLoadRef.current?.params?.amendmentWorkflowMode ?? 'edit';
    setCanvas({ view: 'amendment_workflow', workflowRunId: rid, amendmentWorkflowMode: mode });
    setPayload({ view: 'amendment_workflow', run, mode });
    setDataPhase('success');
    setDataError(null);
    const opts = lastLoadRef.current?.options;
    lastLoadRef.current = {
      view: 'amendment_workflow',
      params: { workflowRunId: rid, amendmentWorkflowMode: mode },
      options: opts,
    };
    logGovernanceAudit('view_opened', {
      view: 'amendment_workflow',
      hydrate: 'advance_response',
      runId: rid,
      eventId: newEventId(),
    });
  }, []);

  const refreshLifecycleSelection = useCallback(
    async (documentId: string) => {
      if (!documentId.trim()) return;
      lifecycleAbortRef.current?.abort();
      const ac = new AbortController();
      lifecycleAbortRef.current = ac;
      setLifecycleBusy(true);
      setDataError(null);
      try {
        const { versions } = await loadLifecycleVersionsPayload(documentId.trim(), ac.signal);
        if (ac.signal.aborted) return;
        setPayload((prev) => {
          if (!prev || prev.view !== 'lifecycle_status') return prev;
          return { ...prev, selectedId: documentId.trim(), versions };
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setDataError(e instanceof Error ? e.message : 'Versions failed');
      } finally {
        setLifecycleBusy(false);
      }
    },
    []
  );

  const closeCanvas = useCallback(() => {
    clearSearch();
    loadAbortRef.current?.abort();
    documentViewBackRef.current = null;
    listToolReturnRef.current = null;
    lifecycleWorkModeReturnRef.current = null;
    setCanvas((c) => {
      if (c) {
        logGovernanceAudit('view_closed', { from: c.view, transition: 'close' });
      }
      return null;
    });
    setPayload(null);
    setDataPhase('idle');
    setDataError(null);
    lastLoadRef.current = null;
  }, [clearSearch]);

  const stepBackFromSubSurface = useCallback(() => {
    if (!canvas) return;
    if (canvas.view === 'workspace_calendar_hub') {
      void loadData('workspace_hub', undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'workspace_hub') {
      closeCanvas();
      return;
    }
    if (canvas.view === 'amendment_workflow') {
      void loadData('amendment_hub', undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'amendment_hub') {
      void loadData(GOVERNANCE_HOME_VIEW, undefined, { transitionMode: 'ui' });
      return;
    }
    if (
      canvas.view === 'conflict_results' ||
      canvas.view === 'compliance_check' ||
      canvas.view === 'lifecycle_status'
    ) {
      const p = listToolReturnRef.current;
      if (p) {
        void loadData('document_list', p, { transitionMode: 'ui' });
        return;
      }
      if (canvas.view === 'lifecycle_status' && lifecycleWorkModeReturnRef.current) {
        const w = lifecycleWorkModeReturnRef.current;
        lifecycleWorkModeReturnRef.current = null;
        void loadData(w, undefined, { transitionMode: 'ui' });
        return;
      }
      void loadData(GOVERNANCE_HOME_VIEW, undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'document_view') {
      const b = documentViewBackRef.current;
      if (b?.mode === 'list') {
        void loadData(
          'document_list',
          {
            returnAfterList: b.returnAfterList,
            listMode: b.listMode,
          },
          { transitionMode: 'ui' }
        );
        return;
      }
      void loadData(GOVERNANCE_HOME_VIEW, undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'document_list') {
      const ret = lastLoadRef.current?.params?.returnAfterList;
      if (ret) {
        void loadData(ret, undefined, { transitionMode: 'ui' });
        return;
      }
    }
    void loadData(GOVERNANCE_HOME_VIEW, undefined, { transitionMode: 'ui' });
  }, [canvas, loadData, closeCanvas]);

  const goBack = useCallback(() => {
    if (!canvas || isGovernanceHomeView(canvas.view)) return;
    logGovernanceAudit('view_closed', {
      from: canvas.view,
      transition: 'subsurface->parent',
    });
    stepBackFromSubSurface();
  }, [canvas, stepBackFromSubSurface]);

  const dismissBackdrop = useCallback(() => {
    if (!canvas) return;
    if (canvas.view === 'workspace_calendar_hub') {
      logGovernanceAudit('backdrop_dismiss', { from: canvas.view });
      void loadData('workspace_hub', undefined, { transitionMode: 'ui' });
      return;
    }
    if (canvas.view === 'workspace_hub') {
      logGovernanceAudit('backdrop_dismiss', { from: canvas.view });
      closeCanvas();
      return;
    }
    if (isGovernanceHomeView(canvas.view)) {
      logGovernanceAudit('backdrop_dismiss', { from: GOVERNANCE_HOME_VIEW });
      closeCanvas();
      return;
    }
    logGovernanceAudit('backdrop_dismiss', { from: canvas.view });
    stepBackFromSubSurface();
  }, [canvas, closeCanvas, stepBackFromSubSurface, loadData]);

  const applyAgentIntent = useCallback(
    (rawAgentText: string) => {
      const agent = parseAgentIntentDetailed(rawAgentText);
      if (agent.kind === 'workspace') {
        logGovernanceAudit('intent_parsed', {
          source: 'json',
          intent: agent.parsed.intent,
          subsystem: 'google_workspace',
        });
        const next = workspaceIntentToCanvasView(agent.parsed);
        void loadData(next.view, {}, { transitionMode: 'intent' });
        return;
      }
      if (agent.kind === 'none') return;
      const { parsed, source } = { parsed: agent.parsed, source: agent.source };
      logGovernanceAudit('intent_parsed', {
        source,
        intent: parsed?.intent ?? null,
      });
      if (source === 'legacy' && parsed && parsed.intent !== 'none') {
        logGovernanceAudit('intent_fallback_used', { intent: parsed.intent });
      }
      if (!parsed || parsed.intent === 'none') return;
      const next = intentToCanvasView(parsed);
      if (!next) return;
      void loadData(
        next.view,
        {
          documentId: next.documentId,
          workflowRunId: next.workflowRunId,
          actionPlanSource: next.actionPlanSource,
          amendmentWorkflowMode: next.amendmentWorkflowMode,
        },
        { transitionMode: 'intent' }
      );
    },
    [loadData]
  );

  const value = useMemo<GovernanceCanvasContextValue>(
    () => ({
      canvas,
      payload,
      dataPhase,
      dataError,
      lifecycleBusy,
      documentListToolbarMode,
      searchQuery,
      searchProjection,
      searchPhase,
      searchError,
      runSearch,
      clearSearch,
      loadData,
      retryLoadData,
      applyAmendmentWorkflowRun,
      refreshLifecycleSelection,
      closeCanvas,
      goBack,
      dismissBackdrop,
      canOpen,
      applyAgentIntent,
      getAuditSnapshot: getGovernanceAuditSnapshot,
    }),
    [
      canvas,
      payload,
      dataPhase,
      dataError,
      lifecycleBusy,
      documentListToolbarMode,
      searchQuery,
      searchProjection,
      searchPhase,
      searchError,
      runSearch,
      clearSearch,
      loadData,
      retryLoadData,
      applyAmendmentWorkflowRun,
      refreshLifecycleSelection,
      closeCanvas,
      goBack,
      dismissBackdrop,
      canOpen,
      applyAgentIntent,
    ]
  );

  return <GovernanceCanvasContext.Provider value={value}>{children}</GovernanceCanvasContext.Provider>;
}

export function useGovernanceCanvas(): GovernanceCanvasContextValue {
  const ctx = useContext(GovernanceCanvasContext);
  if (!ctx) {
    throw new Error('useGovernanceCanvas must be used within GovernanceCanvasProvider');
  }
  return ctx;
}

export type { PolicyDeniedHandler } from './policyDeniedContract';
export type { GovernanceViewPayload } from './loadGovernancePayload';
export type { GovernanceSearchPhase } from './governanceSearch';

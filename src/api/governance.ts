/**
 * Governance REST API client (via Vite proxy: /api -> localhost:8100/v1)
 */

const BASE = '/api';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = data as { detail?: { error?: { message?: string; code?: string } } };
    const msg =
      err?.detail?.error?.message ??
      (typeof err?.detail === 'string' ? err.detail : JSON.stringify(err?.detail ?? data));
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data as T;
}

export type DocumentListItem = {
  document_id: string;
  title: string;
  version: string;
  status: string;
  category: string;
  path: string;
};

export type DocumentDetail = {
  document_id: string;
  title: string;
  version: string;
  status: string;
  category: string;
  path: string;
  content: string;
  metadata: Record<string, unknown>;
};

export type ConflictScanResult = {
  scan_date: string;
  documents_scanned: number;
  findings_count: number;
  findings: Array<Record<string, unknown>>;
};

export type ComplianceResult = {
  valid: boolean;
  violations?: Array<Record<string, unknown>>;
  primitive_type?: string;
};

export function listDocuments(params?: {
  status?: string;
  category?: string;
  includeDrafts?: boolean;
}): Promise<DocumentListItem[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.category) q.set('category', params.category);
  if (params?.includeDrafts) q.set('include_drafts', 'true');
  const qs = q.toString();
  return fetchJson<DocumentListItem[]>(`/documents${qs ? `?${qs}` : ''}`);
}

export function getDocument(
  id: string,
  includeDrafts = true
): Promise<DocumentDetail> {
  return fetchJson<DocumentDetail>(
    `/documents/${encodeURIComponent(id)}?include_drafts=${includeDrafts}`
  );
}

export function getDocumentVersions(id: string): Promise<Array<Record<string, unknown>>> {
  return fetchJson(`/documents/${encodeURIComponent(id)}/versions`);
}

export function diffDocuments(
  id: string,
  versionA: string,
  versionB = 'latest'
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ version_a: versionA, version_b: versionB });
  return fetchJson(`/documents/${encodeURIComponent(id)}/diff?${q}`);
}

export function searchDocuments(query: string): Promise<Array<Record<string, unknown>>> {
  const q = new URLSearchParams({ q: query });
  return fetchJson(`/documents/search?${q}`);
}

export function listPrimitives(): Promise<Array<{ name: string; schema_path: string }>> {
  return fetchJson('/primitives');
}

export function getGlossary(): Promise<Array<{ term: string; definition: string }>> {
  return fetchJson('/glossary');
}

export function checkConflicts(documentId?: string): Promise<ConflictScanResult> {
  const q = documentId ? `?document_id=${encodeURIComponent(documentId)}` : '';
  return fetchJson<ConflictScanResult>(`/conflicts${q}`);
}

export function checkCompliancePrimitive(
  primitiveType: string,
  content: Record<string, unknown>
): Promise<ComplianceResult> {
  return fetchJson<ComplianceResult>('/compliance/primitive', {
    method: 'POST',
    body: JSON.stringify({ primitive_type: primitiveType, content }),
  });
}

export function checkComplianceKit(kitManifest: Record<string, unknown>): Promise<ComplianceResult> {
  return fetchJson<ComplianceResult>('/compliance/kit', {
    method: 'POST',
    body: JSON.stringify({ kit_manifest: kitManifest }),
  });
}

export function proposeAmendment(body: {
  source_type: string;
  source_content: string;
  rationale: string;
  affected_documents: string[];
}): Promise<Record<string, unknown>> {
  return fetchJson('/amendments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getAmendmentStatus(id: string): Promise<Record<string, unknown>> {
  return fetchJson(`/amendments/${encodeURIComponent(id)}`);
}

/** Amendment program run (demo — no automatic merge into repo). */
export type AmendmentWorkflowRunState = {
  run_id: string;
  template_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  meta: Record<string, unknown>;
  proposal_markdown: string;
  peer_reviews: Array<{
    reviewer?: string;
    model?: string;
    dimensions?: Record<string, number>;
    summary?: string;
  }>;
  consolidated_plan_markdown: string;
  steps: Array<{
    id: string;
    label: string;
    status: string;
    detail: string;
    at: string | null;
  }>;
  console: Array<{ ts: string; level: string; message: string }>;
};

export function listAmendmentWorkflowTemplates(): Promise<
  Array<{
    template_id: string;
    title: string;
    amendment_id: string;
    affected_documents: string[];
  }>
> {
  return fetchJson('/amendment-workflow/templates');
}

export function createAmendmentWorkflowRun(templateId: string): Promise<AmendmentWorkflowRunState> {
  return fetchJson<AmendmentWorkflowRunState>('/amendment-workflow/runs', {
    method: 'POST',
    body: JSON.stringify({ template_id: templateId }),
  });
}

export function getAmendmentWorkflowRun(runId: string): Promise<AmendmentWorkflowRunState> {
  return fetchJson(`/amendment-workflow/runs/${encodeURIComponent(runId)}`);
}

export function advanceAmendmentWorkflowRun(runId: string): Promise<AmendmentWorkflowRunState> {
  return fetchJson(`/amendment-workflow/runs/${encodeURIComponent(runId)}/advance`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** action_plan.json shape + API wrappers */
export type ActionPlanAction = {
  id: string;
  title: string;
  description?: string;
  document_id?: string;
  target_path?: string;
  priority?: string;
  status: string;
  execution_kind?: string;
  dependencies?: string[];
  execution_note?: string;
  execution_error?: string;
  executed_at?: string;
};

export type ActionPlanDocument = {
  version?: number;
  source_name?: string;
  synthesized_at?: string;
  synthesis_model?: string;
  merge_notes?: string[];
  actions: ActionPlanAction[];
};

export type ActionPlanBundle = {
  source_name: string;
  plan: ActionPlanDocument;
  execution_log: Array<Record<string, unknown>>;
};

export function getActionPlan(sourceName: string): Promise<ActionPlanBundle> {
  return fetchJson(`/sources/${encodeURIComponent(sourceName)}/action-plan`);
}

export function putActionPlan(sourceName: string, plan: ActionPlanDocument): Promise<{ ok: boolean; path?: string }> {
  return fetchJson(`/sources/${encodeURIComponent(sourceName)}/action-plan`, {
    method: 'PUT',
    body: JSON.stringify({ plan }),
  });
}

export function executeActionPlan(sourceName: string, dryRun = false): Promise<Record<string, unknown>> {
  return fetchJson(`/sources/${encodeURIComponent(sourceName)}/action-plan/execute`, {
    method: 'POST',
    body: JSON.stringify({ dry_run: dryRun }),
  });
}

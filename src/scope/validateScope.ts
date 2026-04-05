/**
 * Validates logical resource operations against an ExecutionScopeEnvelope (AIOS-SPEC-010 §4.2).
 * @license SPDX-License-Identifier: Apache-2.0
 */

import type { ExecutionScopeEnvelope } from './executionScopeTypes';

export type ScopeOperation = 'read' | 'write';

export type ScopeValidationResult = {
  allowed: boolean;
  /** Present when `allowed` is false. */
  reason?: string;
};

function hasPath(paths: readonly string[], key: string): boolean {
  return paths.some((p) => p === key);
}

/**
 * Returns whether a read or write to `resourceKey` is allowed by the envelope.
 * - `protected_files` → deny always.
 * - Read → allowed if key is in `review_files` or `modify_files` (subset rule §4.2).
 * - Write → allowed only if key is in `modify_files`.
 */
export function validateScopeOperation(params: {
  operation: ScopeOperation;
  resourceKey: string;
  envelope: ExecutionScopeEnvelope;
}): ScopeValidationResult {
  const { operation, resourceKey, envelope } = params;
  const { review_files, modify_files, protected_files } = envelope.scope;

  if (hasPath(protected_files, resourceKey)) {
    return { allowed: false, reason: 'resource_in_protected_files' };
  }

  if (operation === 'read') {
    if (hasPath(review_files, resourceKey) || hasPath(modify_files, resourceKey)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'read_not_in_review_or_modify' };
  }

  if (operation === 'write') {
    if (hasPath(modify_files, resourceKey)) {
      return { allowed: true };
    }
    if (hasPath(review_files, resourceKey) && !hasPath(modify_files, resourceKey)) {
      return { allowed: false, reason: 'write_to_review_only_path' };
    }
    return { allowed: false, reason: 'write_not_in_modify_files' };
  }

  return { allowed: false, reason: 'unknown_operation' };
}

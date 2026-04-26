import type {
  UserIntentPayload,
  ProjectBaseline,
  ProjectBaselineSource,
  IntentReviewHandoffEnvelope
} from './shellMenuStoreTypes';
import { evaluateSkillIntentAuthority } from './skillIntentAuthority';

export class IntentIngestionController {
  
  /**
   * Begins the ingestion capture process.
   */
  public beginIntentIngestionCapture(): void {
    // Scaffolded for now
    console.log('[IntentIngestionController] beginIntentIngestionCapture');
  }

  /**
   * Completes the intent ingestion capture, normalizing the payload and deriving transcript text.
   */
  public completeIntentIngestionCapture(payload: { id: string; transcript: string; duration_ms?: number }): UserIntentPayload {
    console.log('[IntentIngestionController] completeIntentIngestionCapture', payload);
    return {
      id: payload.id,
      captured_at: new Date().toISOString(),
      transcript: payload.transcript,
      duration_ms: payload.duration_ms
    };
  }

  /**
   * Binds the captured intent to a project baseline.
   * Near-term fallback baseline source is strictly 'workspace_session'.
   */
  public bindIntentToProjectBaseline(intent: UserIntentPayload, existingBaseline?: ProjectBaseline): ProjectBaseline {
    console.log('[IntentIngestionController] bindIntentToProjectBaseline', intent.id);
    
    if (existingBaseline) {
      return existingBaseline;
    }

    // No-mock fallback: preserve the intent while marking project evidence as unverified.
    return {
      source: 'unknown',
      project_id: 'unverified_project_baseline',
      session_id: intent.id,
      directory_map_summary: 'No verified project files, repository, or zip were attached to this shell intent.'
    };
  }

  /**
   * Builds the triangulation handoff envelope containing the intent and baseline.
   */
  public buildIntentReviewHandoff(
    intent: UserIntentPayload, 
    baseline: ProjectBaseline, 
    sessionContext: Record<string, unknown> = {}
  ): IntentReviewHandoffEnvelope {
    console.log('[IntentIngestionController] buildIntentReviewHandoff', intent.id);
    
    const requestedSkills = Array.isArray(sessionContext.requestedSkills)
      ? sessionContext.requestedSkills.filter((item): item is string => typeof item === 'string')
      : [];
    const requestedTools = Array.isArray(sessionContext.requestedTools)
      ? sessionContext.requestedTools.filter((item): item is string => typeof item === 'string')
      : [];
    const role = typeof sessionContext.role === 'string' ? sessionContext.role : 'authenticated_user';
    const scope = typeof sessionContext.scope === 'string' ? sessionContext.scope : 'ordinary user-facing shell actions';
    const systemPrompt = typeof sessionContext.systemPrompt === 'string' ? sessionContext.systemPrompt : null;
    const skillAuthorityDecision = evaluateSkillIntentAuthority({
      activeSurfaceMode: role === 'operator' ? 'operator' : role.includes('developer') ? 'developer' : 'primary',
      authStatus: 'authenticated',
      desktopSubPath: null,
      agentRole: role,
      requestedSkill: requestedSkills[0] ?? null,
      requestedTools,
      systemPrompt,
    });

    return {
      id: `handoff_${Date.now()}`,
      user_intent: intent,
      project_baseline: baseline,
      session_context: sessionContext,
      review_request: {
        status: 'pending'
      },
      audit: {
        created_at: new Date().toISOString(),
        created_by: 'system'
      },
      skill_authority: {
        role,
        scope,
        requested_skills: requestedSkills,
        requested_tools: requestedTools,
        decision: skillAuthorityDecision,
      },
    };
  }
}

export const intentIngestionController = new IntentIngestionController();

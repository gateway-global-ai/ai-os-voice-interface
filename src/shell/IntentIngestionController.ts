import type {
  UserIntentPayload,
  ProjectBaseline,
  ProjectBaselineSource,
  IntentReviewHandoffEnvelope
} from './shellMenuStoreTypes';

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

    // Fallback to workspace_session
    return {
      source: 'workspace_session',
      project_id: 'fallback_project',
      session_id: 'fallback_session',
      directory_map_summary: 'Fallback workspace session baseline'
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
      }
    };
  }
}

export const intentIngestionController = new IntentIngestionController();

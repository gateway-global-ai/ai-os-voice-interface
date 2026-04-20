import type { IntentReviewHandoffEnvelope } from './shellMenuStoreTypes';

export type ReviewProvider = 'openai' | 'google' | 'deepseek' | 'minimax' | 'anthropic';

export interface ModelReviewResponse {
  provider: ReviewProvider;
  issues_flagged: string[];
  probability_disclosed: boolean;
  confidence_score?: number;
  raw_output?: string;
  error?: string;
}

export type IssueTier = 'consensus' | 'majority' | 'individual';

export interface AggregatedReview {
  consensus_issues: string[];
  majority_issues: string[];
  individual_issues: string[];
  model_responses: ModelReviewResponse[];
  probability_disclosure_warnings: ReviewProvider[];
}

export class TriangulationReviewService {
  /**
   * Step 2: The "Hostile Auditor" Prompt Injection
   */
  public readonly HOSTILE_AUDITOR_PROMPT = `Act as a cynical, hostile Senior Systems Architect. Review the attached codebase against the stated MVP intent. Your sole objective is to find exact reasons why this code will fail in production. Identify security flaws, unhandled edge cases, and architectural bottlenecks. Do not rewrite the code; only analyze and critique.`;

  /**
   * Step 1: API Orchestration Scaffold
   * Accepts the IntentReviewHandoffEnvelope and dispatches to 5 providers in parallel.
   */
  public async orchestrateReview(handoff: IntentReviewHandoffEnvelope): Promise<AggregatedReview> {
    const providers: ReviewProvider[] = ['openai', 'google', 'deepseek', 'minimax', 'anthropic'];
    
    // Asynchronous fan-out logic using Promise.allSettled
    const promises = providers.map(provider => this.callProviderWithTimeout(provider, handoff));
    const results = await Promise.allSettled(promises);
    
    const modelResponses: ModelReviewResponse[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        provider: providers[index],
        issues_flagged: [],
        probability_disclosed: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
      };
    });

    return this.aggregateResponses(modelResponses);
  }

  /**
   * Robust interface and parallel execution harness with timeout fallbacks.
   */
  private async callProviderWithTimeout(
    provider: ReviewProvider, 
    handoff: IntentReviewHandoffEnvelope, 
    timeoutMs: number = 30000
  ): Promise<ModelReviewResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout exceeding ${timeoutMs}ms for provider ${provider}`));
      }, timeoutMs);

      // Scaffold: Simulate API call processing
      // In reality, this would construct the payload using HOSTILE_AUDITOR_PROMPT, handoff.user_intent, and handoff.project_baseline
      setTimeout(() => {
        clearTimeout(timer);
        resolve({
          provider,
          issues_flagged: [`Simulated architectural bottleneck identified by ${provider}`],
          // Simulate probability disclosure: e.g., Google (Gemini) discloses, others might obscure it
          probability_disclosed: provider === 'google',
          confidence_score: provider === 'google' ? 0.92 : undefined,
        });
      }, 1500);
    });
  }

  /**
   * Step 3: Consensus Aggregation Matrix
   * Clusters feedback into Consensus (4-5), Majority (2-3), and Individual (1) tiers.
   */
  private aggregateResponses(responses: ModelReviewResponse[]): AggregatedReview {
    const issueCounts = new Map<string, Set<ReviewProvider>>();

    // Normalize and count issues (Note: A production implementation would use semantic clustering / embeddings here)
    for (const response of responses) {
      if (response.error) continue;

      for (const issue of response.issues_flagged) {
        const key = issue.toLowerCase().trim();
        if (!issueCounts.has(key)) {
          issueCounts.set(key, new Set());
        }
        issueCounts.get(key)!.add(response.provider);
      }
    }

    const consensus_issues: string[] = [];
    const majority_issues: string[] = [];
    const individual_issues: string[] = [];

    for (const [issue, providers] of issueCounts.entries()) {
      const count = providers.size;
      if (count >= 4) {
        consensus_issues.push(issue);
      } else if (count >= 2) {
        majority_issues.push(issue);
      } else {
        individual_issues.push(issue);
      }
    }

    /**
     * Step 4: Probability Disclosure Tracking
     * Flag models that intentionally obscure their statistical uncertainty.
     */
    const probability_disclosure_warnings = responses
      .filter(r => !r.probability_disclosed && !r.error)
      .map(r => r.provider);

    return {
      consensus_issues,
      majority_issues,
      individual_issues,
      model_responses: responses,
      probability_disclosure_warnings
    };
  }
}

export const triangulationReviewService = new TriangulationReviewService();

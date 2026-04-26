export function isGeminiLikelyQuotaError(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err);
  return (
    s.includes('429')
    || s.includes('RESOURCE_EXHAUSTED')
    || s.includes('Resource exhausted')
    || /quota|rate limit|exhausted/i.test(s)
  );
}

export function logGeminiGatewayFallback(context: string, err: unknown): void {
  if (isGeminiLikelyQuotaError(err)) {
    console.info(`[Gemini ${context}] Quota or rate limit - using local model.`);
    return;
  }
  console.warn(`[Gemini ${context}] failed, falling back to local model:`, err);
}

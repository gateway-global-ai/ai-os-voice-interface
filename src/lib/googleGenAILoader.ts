/**
 * Lazy-loads the Gemini SDK so the shell bundle does not eagerly pull it
 * into the initial execution path.
 */
let googleGenAIPromise: Promise<typeof import('@google/genai').GoogleGenAI> | null = null;
let googleGenAIModulePromise: Promise<typeof import('@google/genai')> | null = null;

export function getGoogleGenAIModule(): Promise<typeof import('@google/genai')> {
  googleGenAIModulePromise ??= import('@google/genai');
  return googleGenAIModulePromise;
}

export function getGoogleGenAI(): Promise<typeof import('@google/genai').GoogleGenAI> {
  googleGenAIPromise ??= getGoogleGenAIModule().then(({ GoogleGenAI }) => GoogleGenAI);
  return googleGenAIPromise;
}

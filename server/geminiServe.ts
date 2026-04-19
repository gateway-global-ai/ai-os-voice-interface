import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import type { ServerResponse } from 'node:http';

const DEFAULT_TEXT_MODEL = 'gemini-2.0-flash';
const DEFAULT_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_LIVE_TTS_MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';
const DEFAULT_VOICE = 'Kore';
const LIVE_TTS_SYSTEM_INSTRUCTION =
  'You are a pure text-to-speech engine. Repeat the user provided transcript exactly as written, word for word. Do not answer questions, do not add filler, do not explain, and do not acknowledge the prompt.';

type JsonResult = { status: number; body: unknown };

type GeminiHistoryMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

type GeminiGenerateBody = {
  userText?: string;
  history?: GeminiHistoryMessage[];
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
  inlineImage?: {
    mimeType?: string;
    data?: string;
  };
};

type GeminiTtsBody = {
  text?: string;
  voiceName?: string;
  model?: string;
};

type GeminiStreamChunk =
  | { type: 'audio'; data: string; mimeType: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

function getGeminiApiKey(env: Record<string, string>): string {
  return (env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '').trim();
}

function createGeminiClient(env: Record<string, string>): GoogleGenAI {
  const apiKey = getGeminiApiKey(env);
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY missing on app host');
  }
  return new GoogleGenAI({ apiKey });
}

function normalizeHistory(value: unknown): GeminiHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const role = (entry as { role?: unknown }).role;
      const parts = (entry as { parts?: unknown }).parts;
      if ((role !== 'user' && role !== 'model') || !Array.isArray(parts)) return null;
      const normalizedParts = parts
        .map((part) => {
          if (!part || typeof part !== 'object') return null;
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' && text.trim() ? { text } : null;
        })
        .filter((part): part is { text: string } => Boolean(part));
      if (normalizedParts.length === 0) return null;
      return { role, parts: normalizedParts };
    })
    .filter((entry): entry is GeminiHistoryMessage => Boolean(entry));
}

function normalizeInlineImage(value: unknown): { mimeType: string; data: string } | null {
  if (!value || typeof value !== 'object') return null;
  const mimeType = (value as { mimeType?: unknown }).mimeType;
  const data = (value as { data?: unknown }).data;
  if (typeof mimeType !== 'string' || !mimeType.trim()) return null;
  if (typeof data !== 'string' || !data.trim()) return null;
  return { mimeType: mimeType.trim(), data: data.trim() };
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolveLiveTtsModel(env: Record<string, string>, requestedModel?: string): string {
  return (
    normalizeOptionalString(requestedModel) ??
    normalizeOptionalString(env.GEMINI_MODEL_ID) ??
    normalizeOptionalString(env.GEMINI_LIVE_MODEL) ??
    normalizeOptionalString(env.VITE_GEMINI_LIVE_MODEL) ??
    DEFAULT_LIVE_TTS_MODEL
  )!;
}

function resolveVoiceName(env: Record<string, string>, requestedVoice?: string): string {
  return (
    normalizeOptionalString(requestedVoice) ??
    normalizeOptionalString(env.GEMINI_VOICE_NAME) ??
    DEFAULT_VOICE
  )!;
}

function writeNdjsonChunk(response: ServerResponse, chunk: GeminiStreamChunk): void {
  if (response.writableEnded || response.destroyed) return;
  response.write(`${JSON.stringify(chunk)}\n`);
}

export function serveGeminiReadiness(env: Record<string, string>): JsonResult {
  const configured = Boolean(getGeminiApiKey(env));
  return {
    status: 200,
    body: {
      configured,
      status: configured ? 'configured' : 'missing_api_key',
      detail: configured
        ? 'Gemini gateway configured on app host'
        : 'GEMINI_API_KEY missing on app host',
    },
  };
}

export async function serveGeminiHealth(env: Record<string, string>): Promise<JsonResult> {
  const configured = Boolean(getGeminiApiKey(env));
  if (!configured) {
    return {
      status: 200,
      body: {
        ok: false,
        detail: 'GEMINI_API_KEY missing on app host',
      },
    };
  }

  try {
    const ai = createGeminiClient(env);
    await ai.models.generateContent({
      model: DEFAULT_TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    });
    return {
      status: 200,
      body: {
        ok: true,
        detail: 'generateContent OK',
      },
    };
  } catch (error) {
    return {
      status: 200,
      body: {
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function serveGeminiGenerate(
  env: Record<string, string>,
  rawBody: unknown,
): Promise<JsonResult> {
  const body = (rawBody ?? {}) as GeminiGenerateBody;
  const userText = normalizeOptionalString(body.userText) ?? '';
  const history = normalizeHistory(body.history);
  const inlineImage = normalizeInlineImage(body.inlineImage);

  if (!userText && !inlineImage && history.length === 0) {
    return {
      status: 400,
      body: { error: 'userText, history, or inlineImage is required' },
    };
  }

  try {
    const ai = createGeminiClient(env);
    const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (userText) {
      userParts.push({ text: userText });
    }
    if (inlineImage) {
      userParts.push({
        inlineData: {
          mimeType: inlineImage.mimeType,
          data: inlineImage.data,
        },
      });
    }

    const contents =
      userParts.length > 0
        ? [...history, { role: 'user' as const, parts: userParts }]
        : history;

    const response = await ai.models.generateContent({
      model: normalizeOptionalString(body.model) ?? DEFAULT_TEXT_MODEL,
      contents,
      config: {
        systemInstruction: normalizeOptionalString(body.systemInstruction),
        maxOutputTokens: normalizeOptionalNumber(body.maxOutputTokens),
        temperature: normalizeOptionalNumber(body.temperature),
      },
    });

    return {
      status: 200,
      body: {
        text: response.text?.trim() ?? '',
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function serveGeminiTts(
  env: Record<string, string>,
  rawBody: unknown,
): Promise<JsonResult> {
  const body = (rawBody ?? {}) as GeminiTtsBody;
  const text = normalizeOptionalString(body.text) ?? '';

  if (!text) {
    return {
      status: 400,
      body: { error: 'text is required' },
    };
  }

  try {
    const ai = createGeminiClient(env);
    const voiceName = resolveVoiceName(env, body.voiceName);
    const response = await ai.models.generateContent({
      model: normalizeOptionalString(body.model) ?? DEFAULT_TTS_MODEL,
      contents: [{
        role: 'user',
        parts: [{ text: `Convert the following transcript to speech audio only. Do not add or remove words.\n\nTranscript:\n${text}` }],
      }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      } as Record<string, unknown>,
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const inlineData = (part as { inlineData?: { data?: string; mimeType?: string } } | undefined)?.inlineData;
    const audioData = inlineData?.data?.trim();
    const mimeType = inlineData?.mimeType?.trim() ?? 'audio/L16;rate=24000';

    if (!audioData) {
      return {
        status: 502,
        body: { error: 'No audio data returned from Gemini' },
      };
    }

    return {
      status: 200,
      body: {
        audioData,
        mimeType,
      },
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function streamGeminiTts(
  env: Record<string, string>,
  rawBody: unknown,
  response: ServerResponse,
  registerCloseHandler?: (handler: () => void) => void,
): Promise<void> {
  const body = (rawBody ?? {}) as GeminiTtsBody;
  const text = normalizeOptionalString(body.text) ?? '';

  if (!text) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'text is required' }));
    return;
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');

  let closed = false;
  let sessionClosed = false;
  let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;

  const closeSession = () => {
    if (sessionClosed) return;
    sessionClosed = true;
    try {
      session?.close();
    } catch {
      // ignore - best effort close
    }
  };

  registerCloseHandler?.(() => {
    closed = true;
    closeSession();
  });

  try {
    const ai = createGeminiClient(env);
    const voiceName = resolveVoiceName(env, body.voiceName);
    const liveModel = resolveLiveTtsModel(env, body.model);

    await new Promise<void>(async (resolve, reject) => {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const handleMessage = (message: LiveServerMessage) => {
        const serverContent = message.serverContent;
        if (!serverContent) return;

        const parts = serverContent.modelTurn?.parts ?? [];
        for (const part of parts) {
          const inlineData = part.inlineData;
          if (inlineData?.data) {
            writeNdjsonChunk(response, {
              type: 'audio',
              data: inlineData.data,
              mimeType: inlineData.mimeType?.trim() ?? 'audio/L16;rate=24000',
            });
          }
        }

        if (serverContent.turnComplete || serverContent.generationComplete) {
          finish();
        }
      };

      try {
        session = await ai.live.connect({
          model: liveModel,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              role: 'system',
              parts: [{ text: LIVE_TTS_SYSTEM_INSTRUCTION }],
            },
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
          callbacks: {
            onmessage: handleMessage,
            onerror: (event) => fail(event.error ?? new Error('Gemini Live socket error')),
            onclose: () => finish(),
          },
        });
      } catch (error) {
        fail(error);
        return;
      }

      if (closed) {
        finish();
        return;
      }

      try {
        session.sendClientContent({
          turns: [{
            role: 'user',
            parts: [{ text: `Read this transcript exactly as written:\n${text}` }],
          }],
          turnComplete: true,
        });
      } catch (error) {
        fail(error);
      }
    });

    closeSession();
    writeNdjsonChunk(response, { type: 'done' });
    response.end();
  } catch (error) {
    closeSession();
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!response.writableEnded && !response.destroyed) {
      writeNdjsonChunk(response, { type: 'error', error: errorMessage });
      response.end();
    }
  }
}

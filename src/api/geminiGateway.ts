export type GeminiGatewayHistoryMessage = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

export type GeminiGatewayGenerateRequest = {
  userText?: string;
  history?: GeminiGatewayHistoryMessage[];
  systemInstruction?: string;
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
  inlineImage?: {
    mimeType: string;
    data: string;
  };
};

export type GeminiGatewayTtsRequest = {
  text: string;
  voiceName?: string;
  model?: string;
};

export type GeminiGatewayTtsStreamChunk =
  | { type: 'audio'; data: string; mimeType: string }
  | { type: 'done' }
  | { type: 'error'; error: string };

export type GeminiGatewayReadiness = {
  configured: boolean;
  status: 'configured' | 'missing_api_key';
  detail: string;
  /** Present from gateway: Live / Bidi streaming TTS is off (kill switch). */
  liveTtsDisabled?: boolean;
};

export type GeminiGatewayHealth = {
  ok: boolean;
  detail: string;
};

type GeminiGatewayTtsResponse = {
  audioData: string;
  mimeType: string;
};

/** Thrown when a Gemini gateway `fetch` returns `!response.ok`. Use `status` / `code` for retry/backoff (e.g. 429). */
export class GeminiGatewayHttpError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly upstreamStatus?: number;

  constructor(
    message: string,
    init: {
      status: number;
      code?: string;
      detail?: string;
      upstreamStatus?: number;
    },
  ) {
    super(message);
    this.name = 'GeminiGatewayHttpError';
    this.status = init.status;
    this.code = init.code;
    this.detail = init.detail;
    this.upstreamStatus = init.upstreamStatus;
  }
}

/** Parse JSON from a same-origin `/api/gemini/*` response; throws {@link GeminiGatewayHttpError} when `!response.ok`. */
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new GeminiGatewayHttpError(
        `HTTP ${response.status}: ${response.statusText || 'Error'}`,
        { status: response.status, detail: text ? text.slice(0, 300) : undefined },
      );
    }
    const errorMsg =
      typeof parsed.error === 'string' ? parsed.error : `HTTP ${response.status}`;
    const code = typeof parsed.code === 'string' ? parsed.code : undefined;
    const detail = typeof parsed.detail === 'string' ? parsed.detail : undefined;
    const upstreamStatus =
      typeof parsed.upstreamStatus === 'number' ? parsed.upstreamStatus : undefined;
    const message = [errorMsg, code && `[${code}]`, detail].filter(Boolean).join(' — ');
    throw new GeminiGatewayHttpError(message || errorMsg, {
      status: response.status,
      code,
      detail,
      upstreamStatus,
    });
  }
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

export async function fetchGeminiGatewayReadiness(): Promise<GeminiGatewayReadiness> {
  const response = await fetch('/api/gemini/readiness');
  return readJsonResponse<GeminiGatewayReadiness>(response);
}

export async function fetchGeminiGatewayHealth(): Promise<GeminiGatewayHealth> {
  const response = await fetch('/api/gemini/health');
  return readJsonResponse<GeminiGatewayHealth>(response);
}

export async function geminiGenerateText(
  request: GeminiGatewayGenerateRequest,
): Promise<string> {
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const data = await readJsonResponse<{ text?: string }>(response);
  return (data.text ?? '').trim();
}

export async function geminiSynthesizeSpeech(
  request: GeminiGatewayTtsRequest,
): Promise<GeminiGatewayTtsResponse> {
  const response = await fetch('/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return readJsonResponse<GeminiGatewayTtsResponse>(response);
}

export async function streamGeminiSpeech(
  request: GeminiGatewayTtsRequest,
  handlers: {
    onChunk: (chunk: GeminiGatewayTtsStreamChunk) => void | Promise<void>;
  },
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/gemini/tts/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new GeminiGatewayHttpError(`HTTP ${response.status}`, {
        status: response.status,
        detail: text ? text.slice(0, 300) : undefined,
      });
    }
    const errorMsg =
      typeof parsed.error === 'string' ? parsed.error : `HTTP ${response.status}`;
    const code = typeof parsed.code === 'string' ? parsed.code : undefined;
    const detail = typeof parsed.detail === 'string' ? parsed.detail : undefined;
    const upstreamStatus =
      typeof parsed.upstreamStatus === 'number' ? parsed.upstreamStatus : undefined;
    const message = [errorMsg, code && `[${code}]`, detail].filter(Boolean).join(' — ');
    throw new GeminiGatewayHttpError(message || errorMsg, {
      status: response.status,
      code,
      detail,
      upstreamStatus,
    });
  }

  if (!response.body) {
    throw new Error('ReadableStream unavailable for Gemini TTS');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        await handlers.onChunk(JSON.parse(line) as GeminiGatewayTtsStreamChunk);
      }
      newlineIndex = buffer.indexOf('\n');
    }

    if (done) break;
  }

  const trailing = buffer.trim();
  if (trailing) {
    await handlers.onChunk(JSON.parse(trailing) as GeminiGatewayTtsStreamChunk);
  }
}

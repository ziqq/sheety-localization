import { isRecord } from '../generator/shared.js';
import type {
  LocalizationClient,
  LocalizationRequest,
  LocalizationResponse,
} from '../localize/models.js';

/** A valid HTTP response whose localization payload cannot be accepted. */
export class LocalizationResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalizationResponseError';
  }
}

/**
 * Represents transport or API failures and records whether exponential retry is
 * safe. Validation/refusal failures use `LocalizationResponseError` instead and
 * are never retried as transient network failures.
 */
export class OpenAIApiError extends Error {
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'OpenAIApiError';
    this.status = options.status;
    this.retryable =
      options.retryable ??
      (options.status === undefined ||
        [408, 409, 429].includes(options.status) ||
        options.status >= 500);
  }
}

/** Bound concurrent Responses API requests without dropping queued work. */
class Semaphore {
  private available: number;
  private readonly waiters: Array<() => void> = [];

  constructor(size: number) {
    this.available = Math.max(1, size);
  }

  async use<T>(operation: () => Promise<T>): Promise<T> {
    if (this.available > 0) {
      this.available--;
    } else {
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }

    try {
      return await operation();
    } finally {
      const waiter = this.waiters.shift();
      if (waiter) {
        waiter();
      } else {
        this.available++;
      }
    }
  }
}

/** Configuration and injectable boundaries for the Responses API client. */
export interface OpenAIClientOptions {
  apiKey: string;
  model?: string;
  workers?: number;
  retries?: number;
  timeoutMs?: number;
  systemPrompt?: string;
  endpoint?: string;
  fetchImplementation?: typeof fetch;
}

/**
 * Minimal Responses API client specialized for strict localization JSON.
 * Concurrency, timeout, retries, endpoint, and fetch are injectable so network
 * behavior remains deterministic in tests.
 */
export class OpenAIClient implements LocalizationClient {
  readonly model: string;
  private readonly apiKey: string;
  private readonly retries: number;
  private readonly timeoutMs: number;
  private readonly systemPrompt?: string;
  private readonly endpoint: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly semaphore: Semaphore;

  constructor(options: OpenAIClientOptions) {
    if (!options.apiKey.trim()) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = options.apiKey.trim();
    this.model = options.model ?? 'gpt-5-mini';
    this.retries = Math.max(1, options.retries ?? 3);
    this.timeoutMs = Math.max(1, options.timeoutMs ?? 120_000);
    this.systemPrompt = options.systemPrompt?.trim() || undefined;
    this.endpoint = options.endpoint ?? 'https://api.openai.com/v1/responses';
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.semaphore = new Semaphore(options.workers ?? 6);
  }

  static isReasoningModel(model: string): boolean {
    const name = model.toLowerCase();
    if (name.includes('chat')) {
      return false;
    }
    if (name.startsWith('o1-mini') || name.startsWith('o1-preview')) {
      return false;
    }
    return /^(gpt-5|o1|o3|o4)/.test(name);
  }

  /** Reserve enough output tokens for every requested language and reasoning. */
  static maxOutputTokens(
    schema: Record<string, unknown>,
    model = 'gpt-5-mini',
  ): number {
    const localization = isRecord(schema.properties)
      ? schema.properties.localization
      : undefined;
    const required =
      isRecord(localization) && Array.isArray(localization.required)
        ? localization.required.length
        : 1;
    const reasoningReserve = OpenAIClient.isReasoningModel(model) ? 16_384 : 0;
    return Math.min(
      32_768,
      1_024 + reasoningReserve + 768 * Math.max(1, required),
    );
  }

  /**
   * Extract and validate the first structured `output_text` payload, surfacing
   * refusals, incomplete generations, and malformed envelopes distinctly.
   */
  static parseResponseBody(body: string): LocalizationResponse {
    let envelope: unknown;
    try {
      envelope = JSON.parse(body) as unknown;
    } catch (error) {
      throw new LocalizationResponseError(`Malformed OpenAI JSON: ${error}`);
    }
    if (!isRecord(envelope)) {
      throw new LocalizationResponseError('Invalid OpenAI response envelope');
    }
    if (isRecord(envelope.error)) {
      throw new OpenAIApiError(JSON.stringify(envelope.error), {
        retryable: false,
      });
    }
    if (envelope.status === 'incomplete') {
      const details = isRecord(envelope.incomplete_details)
        ? envelope.incomplete_details.reason
        : 'unknown';
      throw new LocalizationResponseError(
        `Incomplete OpenAI response (${String(details)})`,
      );
    }

    if (!Array.isArray(envelope.output)) {
      throw new LocalizationResponseError('OpenAI response has no output');
    }
    for (const item of envelope.output) {
      if (
        !isRecord(item) ||
        item.type !== 'message' ||
        !Array.isArray(item.content)
      ) {
        continue;
      }
      for (const part of item.content) {
        if (!isRecord(part)) {
          continue;
        }
        if (part.type === 'refusal') {
          throw new LocalizationResponseError(
            `OpenAI refused the request: ${String(part.refusal ?? '')}`,
          );
        }
        if (part.type !== 'output_text' || typeof part.text !== 'string') {
          continue;
        }

        let payload: unknown;
        try {
          payload = JSON.parse(part.text) as unknown;
        } catch (error) {
          throw new LocalizationResponseError(
            `OpenAI returned invalid structured JSON: ${error}`,
          );
        }
        if (
          !isRecord(payload) ||
          typeof payload.label !== 'string' ||
          !isRecord(payload.localization)
        ) {
          throw new LocalizationResponseError(
            'OpenAI structured response has an invalid shape',
          );
        }

        const localization: Record<string, { text: string }> = {};
        for (const [code, value] of Object.entries(payload.localization)) {
          if (!isRecord(value) || typeof value.text !== 'string') {
            throw new LocalizationResponseError(
              `OpenAI translation for "${code}" has an invalid shape`,
            );
          }
          localization[code] = { text: value.text };
        }
        return { label: payload.label, localization };
      }
    }
    throw new LocalizationResponseError('OpenAI response has no output text');
  }

  /** Execute a request under the concurrency limit with transient retries. */
  async localize(request: LocalizationRequest): Promise<LocalizationResponse> {
    return this.semaphore.use(async () => {
      for (let attempt = 1; attempt <= this.retries; attempt++) {
        try {
          return await this.performRequest(request);
        } catch (error) {
          if (error instanceof LocalizationResponseError) {
            throw error;
          }
          const apiError =
            error instanceof OpenAIApiError
              ? error
              : new OpenAIApiError(String(error));
          if (!apiError.retryable || attempt === this.retries) {
            throw apiError;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** (attempt - 1)),
          );
        }
      }
      throw new OpenAIApiError('OpenAI request failed');
    });
  }

  /** Send one abortable strict-schema Responses API request. */
  private async performRequest(
    request: LocalizationRequest,
  ): Promise<LocalizationResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const reasoning = OpenAIClient.isReasoningModel(this.model);
    try {
      const response = await this.fetchImplementation(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          ...(this.systemPrompt ? { instructions: this.systemPrompt } : {}),
          input: [
            {
              role: 'user',
              content: [{ type: 'input_text', text: request.prompt }],
            },
          ],
          text: {
            format: {
              name: 'i18n_payload',
              strict: true,
              type: 'json_schema',
              schema: request.schema,
            },
          },
          ...(reasoning
            ? { reasoning: { effort: 'low' } }
            : { temperature: 0, top_p: 1 }),
          max_output_tokens: OpenAIClient.maxOutputTokens(
            request.schema,
            this.model,
          ),
        }),
      });
      const body = await response.text();
      if (!response.ok) {
        throw new OpenAIApiError(body || response.statusText, {
          status: response.status,
        });
      }
      return OpenAIClient.parseResponseBody(body);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new OpenAIApiError(
          `OpenAI request timed out after ${this.timeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

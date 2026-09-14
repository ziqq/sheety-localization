import { isRecord } from '../generator/shared.js';
/** A valid HTTP response whose localization payload cannot be accepted. */
export class LocalizationResponseError extends Error {
    constructor(message) {
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
    constructor(message, options = {}) {
        var _a;
        super(message);
        this.name = 'OpenAIApiError';
        this.status = options.status;
        this.retryable =
            (_a = options.retryable) !== null && _a !== void 0 ? _a : (options.status === undefined ||
                [408, 409, 429].includes(options.status) ||
                options.status >= 500);
    }
}
/** Bound concurrent Responses API requests without dropping queued work. */
class Semaphore {
    constructor(size) {
        this.waiters = [];
        this.available = Math.max(1, size);
    }
    async use(operation) {
        if (this.available > 0) {
            this.available--;
        }
        else {
            await new Promise((resolve) => this.waiters.push(resolve));
        }
        try {
            return await operation();
        }
        finally {
            const waiter = this.waiters.shift();
            if (waiter) {
                waiter();
            }
            else {
                this.available++;
            }
        }
    }
}
/**
 * Minimal Responses API client specialized for strict localization JSON.
 * Concurrency, timeout, retries, endpoint, and fetch are injectable so network
 * behavior remains deterministic in tests.
 */
export class OpenAIClient {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!options.apiKey.trim()) {
            throw new Error('OpenAI API key is required');
        }
        this.apiKey = options.apiKey.trim();
        this.model = (_a = options.model) !== null && _a !== void 0 ? _a : 'gpt-5-mini';
        this.retries = Math.max(1, (_b = options.retries) !== null && _b !== void 0 ? _b : 3);
        this.timeoutMs = Math.max(1, (_c = options.timeoutMs) !== null && _c !== void 0 ? _c : 120000);
        this.systemPrompt = ((_d = options.systemPrompt) === null || _d === void 0 ? void 0 : _d.trim()) || undefined;
        this.endpoint = (_e = options.endpoint) !== null && _e !== void 0 ? _e : 'https://api.openai.com/v1/responses';
        this.fetchImplementation = (_f = options.fetchImplementation) !== null && _f !== void 0 ? _f : fetch;
        this.semaphore = new Semaphore((_g = options.workers) !== null && _g !== void 0 ? _g : 6);
    }
    static isReasoningModel(model) {
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
    static maxOutputTokens(schema, model = 'gpt-5-mini') {
        const localization = isRecord(schema.properties)
            ? schema.properties.localization
            : undefined;
        const required = isRecord(localization) && Array.isArray(localization.required)
            ? localization.required.length
            : 1;
        const reasoningReserve = OpenAIClient.isReasoningModel(model) ? 16384 : 0;
        return Math.min(32768, 1024 + reasoningReserve + 768 * Math.max(1, required));
    }
    /**
     * Extract and validate the first structured `output_text` payload, surfacing
     * refusals, incomplete generations, and malformed envelopes distinctly.
     */
    static parseResponseBody(body) {
        var _a;
        let envelope;
        try {
            envelope = JSON.parse(body);
        }
        catch (error) {
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
            throw new LocalizationResponseError(`Incomplete OpenAI response (${String(details)})`);
        }
        if (!Array.isArray(envelope.output)) {
            throw new LocalizationResponseError('OpenAI response has no output');
        }
        for (const item of envelope.output) {
            if (!isRecord(item) ||
                item.type !== 'message' ||
                !Array.isArray(item.content)) {
                continue;
            }
            for (const part of item.content) {
                if (!isRecord(part)) {
                    continue;
                }
                if (part.type === 'refusal') {
                    throw new LocalizationResponseError(`OpenAI refused the request: ${String((_a = part.refusal) !== null && _a !== void 0 ? _a : '')}`);
                }
                if (part.type !== 'output_text' || typeof part.text !== 'string') {
                    continue;
                }
                let payload;
                try {
                    payload = JSON.parse(part.text);
                }
                catch (error) {
                    throw new LocalizationResponseError(`OpenAI returned invalid structured JSON: ${error}`);
                }
                if (!isRecord(payload) ||
                    typeof payload.label !== 'string' ||
                    !isRecord(payload.localization)) {
                    throw new LocalizationResponseError('OpenAI structured response has an invalid shape');
                }
                const localization = {};
                for (const [code, value] of Object.entries(payload.localization)) {
                    if (!isRecord(value) || typeof value.text !== 'string') {
                        throw new LocalizationResponseError(`OpenAI translation for "${code}" has an invalid shape`);
                    }
                    localization[code] = { text: value.text };
                }
                return { label: payload.label, localization };
            }
        }
        throw new LocalizationResponseError('OpenAI response has no output text');
    }
    /** Execute a request under the concurrency limit with transient retries. */
    async localize(request) {
        return this.semaphore.use(async () => {
            for (let attempt = 1; attempt <= this.retries; attempt++) {
                try {
                    return await this.performRequest(request);
                }
                catch (error) {
                    if (error instanceof LocalizationResponseError) {
                        throw error;
                    }
                    const apiError = error instanceof OpenAIApiError
                        ? error
                        : new OpenAIApiError(String(error));
                    if (!apiError.retryable || attempt === this.retries) {
                        throw apiError;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
                }
            }
            throw new OpenAIApiError('OpenAI request failed');
        });
    }
    /** Send one abortable strict-schema Responses API request. */
    async performRequest(request) {
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
                body: JSON.stringify(Object.assign(Object.assign(Object.assign(Object.assign({ model: this.model }, (this.systemPrompt ? { instructions: this.systemPrompt } : {})), { input: [
                        {
                            role: 'user',
                            content: [{ type: 'input_text', text: request.prompt }],
                        },
                    ], text: {
                        format: {
                            name: 'i18n_payload',
                            strict: true,
                            type: 'json_schema',
                            schema: request.schema,
                        },
                    } }), (reasoning
                    ? { reasoning: { effort: 'low' } }
                    : { temperature: 0, top_p: 1 })), { max_output_tokens: OpenAIClient.maxOutputTokens(request.schema, this.model) })),
            });
            const body = await response.text();
            if (!response.ok) {
                throw new OpenAIApiError(body || response.statusText, {
                    status: response.status,
                });
            }
            return OpenAIClient.parseResponseBody(body);
        }
        catch (error) {
            if (controller.signal.aborted) {
                throw new OpenAIApiError(`OpenAI request timed out after ${this.timeoutMs}ms`);
            }
            throw error;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
//# sourceMappingURL=client.js.map
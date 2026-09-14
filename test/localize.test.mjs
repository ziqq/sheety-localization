import { expect, jest, test } from '@jest/globals';

import {
  LocalizationResponseError,
  OpenAIApiError,
  OpenAIClient,
} from '../src/localize/client.ts';
import {
  extractEmptyCells,
  localizeRows,
} from '../src/localize/pipeline.ts';
import {
  cellRange,
  RateLimiter,
  SheetsError,
  updatesForRow,
  writeLocalizedRow,
} from '../src/localize/sheets.ts';
import { buildLocalizationRequest } from '../src/localize/prompt.ts';
import {
  extractPlaceholders,
  validateTranslation,
} from '../src/localize/validation.ts';

test('validation preserves ICU arguments, directives, branches, and markup', () => {
  const source =
    '<b>{count, plural, one {{name} has one task} other {{name} has # tasks}}</b>';
  const valid =
    '<b>{count, plural, one {У {name} одна задача} other {У {name} # задач}}</b>';

  expect(validateTranslation(source, valid)).toBeNull();
  expect(validateTranslation(source, 'У пользователя задачи')).toMatch(
    /placeholder mismatch/,
  );
  expect(validateTranslation(source, valid.replace('</b>', ''))).toMatch(
    /markup mismatch/,
  );
  expect(validateTranslation('Hello', '```Привет```')).toBe(
    'markdown fence in text',
  );
  expect(extractPlaceholders(source).directives).toEqual(new Set(['count']));
});

test('extractEmptyCells honors a non-English source locale and strict headers', () => {
  const rows = extractEmptyCells('app', [
    ['label', 'description', 'meta', 'ru', 'en', 'pt-BR', 'pt_BR'],
    ['welcome-title', 'Greeting', '{name}', 'Привет, {name}', '', null, ''],
    ['done', '', '', 'Готово', 'Done', 'Feito', 'Feito'],
  ]);

  expect(rows).toEqual([
    {
      row: 1,
      label: 'welcome_title',
      description: 'Greeting',
      meta: '{name}',
      sourceCode: 'ru',
      source: 'Привет, {name}',
      cells: [
        { column: 4, code: 'en', text: '' },
        { column: 5, code: 'pt_BR', text: '' },
      ],
    },
  ]);
  expect(
    extractEmptyCells('reference', [
      ['name', 'description', 'meta', 'ru', 'en'],
      ['value', '', '', 'Один', ''],
    ]),
  ).toEqual([]);
});

test('localizeRows keeps valid batch results and retries only failed languages', async () => {
  const calls = [];
  const client = {
    async localize(request) {
      const localizationSchema = request.schema.properties.localization;
      const languages = localizationSchema.required;
      calls.push(languages);
      return {
        label: 'hello',
        localization: Object.fromEntries(
          languages.map((code) => [
            code,
            {
              text:
                code === 'ru' && languages.length > 1
                  ? 'Привет'
                  : `${code}: {name}`,
            },
          ]),
        ),
      };
    },
  };
  const row = {
    row: 1,
    label: 'hello',
    sourceCode: 'en',
    source: 'Hello, {name}',
    cells: [
      { column: 4, code: 'ru', text: '' },
      { column: 5, code: 'fr', text: '' },
    ],
  };

  const result = await localizeRows([row], client, 2);

  expect(calls).toEqual([['ru', 'fr'], ['ru']]);
  expect(result[0].cells).toEqual([
    { column: 4, code: 'ru', text: 'ru: {name}' },
    { column: 5, code: 'fr', text: 'fr: {name}' },
  ]);
});

test('OpenAI client sends Responses structured output and parses message output', async () => {
  let requestBody;
  const client = new OpenAIClient({
    apiKey: 'sk-test',
    model: 'gpt-5-mini',
    fetchImplementation: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          status: 'completed',
          output: [
            { type: 'reasoning', content: [] },
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    label: 'hello',
                    localization: { ru: { text: 'Привет' } },
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    },
  });

  const response = await client.localize({
    prompt: 'Translate',
    schema: {
      properties: {
        localization: { required: ['ru'] },
      },
    },
  });

  expect(response.localization.ru.text).toBe('Привет');
  expect(requestBody.text.format.type).toBe('json_schema');
  expect(requestBody.reasoning).toEqual({ effort: 'low' });
  expect(requestBody.temperature).toBeUndefined();
  expect(requestBody.input[0].content[0]).toEqual({
    type: 'input_text',
    text: 'Translate',
  });
});

test('OpenAI parser rejects incomplete and refusal responses', () => {
  expect(() =>
    OpenAIClient.parseResponseBody(
      JSON.stringify({
        status: 'incomplete',
        incomplete_details: { reason: 'max_output_tokens' },
      }),
    ),
  ).toThrow(/Incomplete/);
  expect(() =>
    OpenAIClient.parseResponseBody(
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [{ type: 'refusal', refusal: 'No' }],
          },
        ],
      }),
    ),
  ).toThrow(/refused/);
});

test('sheet updates quote ranges, batch localized cells, and never write empties', async () => {
  const row = {
    row: 4,
    label: 'hello',
    sourceCode: 'en',
    source: 'Hello',
    cells: [
      { column: 4, code: 'ru', text: 'Привет' },
      { column: 5, code: 'fr', text: '' },
    ],
  };
  const write = jest.fn(async () => {});
  const gateway = { fetch: async () => [], write };

  expect(cellRange("Owner's app", 4, 4)).toBe("'Owner''s app'!E5");
  expect(updatesForRow("Owner's app", row)).toEqual([
    { range: "'Owner''s app'!E5", value: 'Привет' },
  ]);
  await expect(writeLocalizedRow(gateway, "Owner's app", row)).resolves.toBe(
    true,
  );
  expect(write).toHaveBeenCalledWith([
    { range: "'Owner''s app'!E5", value: 'Привет' },
  ]);
});

test('sheet rate limiter waits when its rolling quota is full', async () => {
  let now = 0;
  const delays = [];
  const limiter = new RateLimiter(
    2,
    1_000,
    () => now,
    async (milliseconds) => {
      delays.push(milliseconds);
      now += milliseconds;
    },
  );

  await limiter.wait();
  await limiter.wait();
  await limiter.wait();

  expect(delays).toEqual([1_001]);
});

test('validation rejects every unsafe translation shape', () => {
  expect(validateTranslation('Hello', undefined)).toBe('missing in response');
  expect(validateTranslation('Hello', '   ')).toBe('empty text');
  expect(validateTranslation('Hello', 'Bad \uFFFD text')).toBe(
    'contains replacement characters',
  );
  expect(validateTranslation('Hi', 'x'.repeat(161))).toMatch(
    /suspiciously long/,
  );
  expect(validateTranslation('Hello, {name}', 'Привет, {name')).toBe(
    'unbalanced braces in text',
  );
  expect(validateTranslation('Hello', '}Hello')).toBe(
    'unbalanced braces in text',
  );
  expect(
    validateTranslation(
      '{count, plural, one {one item} other {many items}}',
      '{count}',
    ),
  ).toMatch(/lost ICU directive/);
  expect(
    validateTranslation(
      '{count, plural, one {{name}} other {{name}}}',
      '{count, plural, one {one item} other {many items}} {name}',
    ),
  ).toMatch(/placeholder dropped inside an ICU branch/);
  expect(validateTranslation('Hello', 'Hello, {name}')).toMatch(
    /unexpected \["name"\]/,
  );
  expect(extractPlaceholders('Broken {name').arguments).toEqual(new Set());
});

test('extractEmptyCells skips malformed rows and preserves numeric context', () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});

  expect(extractEmptyCells('empty', [])).toEqual([]);
  expect(extractEmptyCells('short', [['label', 'description']])).toEqual([]);
  expect(
    extractEmptyCells('edge', [
      ['label', 'description', 'meta', 'en', 'bad locale', 'en', 'ru'],
      undefined,
      ['', '', '', 'Hello', '', '', ''],
      ['---', '', '', 'Hello', '', '', ''],
      ['missing', '', '', '', '', '', ''],
      ['missing', '', '', 'Duplicate is ignored', '', '', ''],
      ['complete', '', '', 'Done', '', '', 'Готово'],
      ['number', {}, [], 123, '', '', null],
    ]),
  ).toEqual([
    {
      row: 7,
      label: 'number',
      description: undefined,
      meta: undefined,
      sourceCode: 'en',
      source: '123',
      cells: [{ column: 6, code: 'ru', text: '' }],
    },
  ]);
  expect(error).toHaveBeenCalledWith(
    '[ERROR]',
    expect.stringContaining('invalid locale'),
  );
  expect(error).toHaveBeenCalledWith(
    '[ERROR]',
    expect.stringContaining('duplicate locale'),
  );
  expect(error).toHaveBeenCalledWith(
    '[ERROR]',
    expect.stringContaining('no source text'),
  );
  error.mockRestore();
});

test('localizeRows logs label mismatches and drops completely failed rows', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const client = {
    localize: jest
      .fn()
      .mockResolvedValueOnce({
        label: 'wrong-label',
        localization: { ru: { text: 'Привет' } },
      })
      .mockRejectedValueOnce(new Error('network down')),
  };
  const rows = [
    {
      row: 1,
      label: 'hello',
      sourceCode: 'en',
      source: 'Hello',
      cells: [{ column: 4, code: 'ru', text: '' }],
    },
    {
      row: 2,
      label: 'bye',
      sourceCode: 'en',
      source: 'Bye',
      cells: [{ column: 4, code: 'ru', text: '' }],
    },
  ];

  await expect(localizeRows(rows, client, 0)).resolves.toEqual([rows[0]]);
  expect(error.mock.calls.flat().join(' ')).toContain('Response label mismatch');
  expect(error.mock.calls.flat().join(' ')).toContain('Failed to localize');
  error.mockRestore();
});

test('prompt builder deduplicates languages and validates required input', () => {
  const row = {
    row: 1,
    label: 'hello',
    description: 'A greeting',
    meta: '{name}',
    sourceCode: 'en_US',
    source: 'Hello, {name}',
    cells: [],
  };
  const request = buildLocalizationRequest(row, [' ru ', 'ru', '', 'pt_BR']);
  const localization = request.schema.properties.localization;

  expect(localization.required).toEqual(['ru', 'pt_BR']);
  expect(Object.keys(localization.properties)).toEqual(['ru', 'pt_BR']);
  expect(request.prompt).toContain('Description: A greeting');
  expect(request.prompt).toContain('Metadata: {name}');
  expect(() => buildLocalizationRequest({ ...row, label: '' }, ['ru'])).toThrow(
    'must have a label',
  );
  expect(() => buildLocalizationRequest({ ...row, source: ' ' }, ['ru'])).toThrow(
    'must have a label and source text',
  );
  expect(() => buildLocalizationRequest(row, [' ', ''])).toThrow(
    'At least one target language',
  );

  const displayNames = jest
    .spyOn(Intl, 'DisplayNames')
    .mockImplementation(() => {
      throw new Error('unsupported');
    });
  expect(buildLocalizationRequest(row, ['ru']).prompt).toContain(
    'Source language: en_US',
  );
  displayNames.mockRestore();

  const missingDisplayName = jest
    .spyOn(Intl, 'DisplayNames')
    .mockImplementation(() => ({ of: () => undefined }));
  expect(buildLocalizationRequest(row, ['zz']).prompt).toContain('- zz: zz');
  missingDisplayName.mockRestore();
});

test('OpenAI model helpers classify retries and token budgets', () => {
  expect(() => new OpenAIClient({ apiKey: '  ' })).toThrow(
    'OpenAI API key is required',
  );
  expect(OpenAIClient.isReasoningModel('GPT-5-mini')).toBe(true);
  expect(OpenAIClient.isReasoningModel('gpt-5-chat-latest')).toBe(false);
  expect(OpenAIClient.isReasoningModel('o1-mini')).toBe(false);
  expect(OpenAIClient.isReasoningModel('o1-preview')).toBe(false);
  expect(OpenAIClient.isReasoningModel('gpt-4o-mini')).toBe(false);
  expect(OpenAIClient.maxOutputTokens({}, 'gpt-4o-mini')).toBe(1_792);
  expect(
    OpenAIClient.maxOutputTokens(
      { properties: { localization: { required: Array(30).fill('ru') } } },
      'gpt-5-mini',
    ),
  ).toBe(32_768);

  expect(new OpenAIApiError('network').retryable).toBe(true);
  expect(new OpenAIApiError('busy', { status: 408 }).retryable).toBe(true);
  expect(new OpenAIApiError('conflict', { status: 409 }).retryable).toBe(true);
  expect(new OpenAIApiError('bad request', { status: 400 }).retryable).toBe(
    false,
  );
  expect(
    new OpenAIApiError('forced', { status: 500, retryable: false }).retryable,
  ).toBe(false);
});

test('OpenAI parser distinguishes malformed envelopes and payloads', () => {
  const invalidBodies = [
    ['not json', /Malformed OpenAI JSON/],
    ['null', /Invalid OpenAI response envelope/],
    [JSON.stringify({ status: 'incomplete' }), /unknown/],
    [JSON.stringify({}), /has no output/],
    [
      JSON.stringify({
        output: [
          null,
          { type: 'tool_call' },
          { type: 'message', content: [null, { type: 'tool_call' }] },
        ],
      }),
      /has no output text/,
    ],
    [
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: '{' }],
          },
        ],
      }),
      /invalid structured JSON/,
    ],
    [
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: JSON.stringify([]) }],
          },
        ],
      }),
      /invalid shape/,
    ],
    [
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  label: 'hello',
                  localization: { ru: { text: 42 } },
                }),
              },
            ],
          },
        ],
      }),
      /translation for "ru" has an invalid shape/,
    ],
  ];

  for (const [body, message] of invalidBodies) {
    expect(() => OpenAIClient.parseResponseBody(body)).toThrow(message);
  }
  expect(() =>
    OpenAIClient.parseResponseBody(JSON.stringify({ error: { code: 'bad' } })),
  ).toThrow(OpenAIApiError);
  try {
    OpenAIClient.parseResponseBody(JSON.stringify({ error: { code: 'bad' } }));
  } catch (error) {
    expect(error).toBeInstanceOf(OpenAIApiError);
    expect(error.retryable).toBe(false);
  }
  expect(new LocalizationResponseError('invalid').name).toBe(
    'LocalizationResponseError',
  );
  expect(() =>
    OpenAIClient.parseResponseBody(
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [{ type: 'refusal' }],
          },
        ],
      }),
    ),
  ).toThrow('OpenAI refused the request:');
});

test('OpenAI client retries transient failures and preserves non-reasoning options', async () => {
  jest.useFakeTimers();
  try {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      label: 'hello',
                      localization: { ru: { text: 'Привет' } },
                    }),
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
      );
    const client = new OpenAIClient({
      apiKey: 'sk-test',
      endpoint: 'https://example.test/responses',
      model: 'gpt-4o-mini',
      retries: 2,
      systemPrompt: ' Be concise. ',
      fetchImplementation,
    });
    const pending = client.localize({
      prompt: 'Translate',
      schema: { properties: { localization: { required: ['ru'] } } },
    });

    await jest.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toMatchObject({ label: 'hello' });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(fetchImplementation.mock.calls[0][0]).toBe(
      'https://example.test/responses',
    );
    const body = JSON.parse(fetchImplementation.mock.calls[1][1].body);
    expect(body.instructions).toBe('Be concise.');
    expect(body.temperature).toBe(0);
    expect(body.top_p).toBe(1);
    expect(body.reasoning).toBeUndefined();
  } finally {
    jest.useRealTimers();
  }
});

test('OpenAI client does not retry response errors or non-retryable HTTP errors', async () => {
  const malformedFetch = jest.fn(async () => new Response('not json'));
  await expect(
    new OpenAIClient({
      apiKey: 'sk-test',
      retries: 3,
      fetchImplementation: malformedFetch,
    }).localize({ prompt: 'Translate', schema: {} }),
  ).rejects.toBeInstanceOf(LocalizationResponseError);
  expect(malformedFetch).toHaveBeenCalledTimes(1);

  const badRequestFetch = jest.fn(
    async () => new Response('', { status: 400, statusText: 'Bad Request' }),
  );
  await expect(
    new OpenAIClient({
      apiKey: 'sk-test',
      retries: 3,
      fetchImplementation: badRequestFetch,
    }).localize({ prompt: 'Translate', schema: {} }),
  ).rejects.toMatchObject({ status: 400, retryable: false });
  expect(badRequestFetch).toHaveBeenCalledTimes(1);

  await expect(
    new OpenAIClient({
      apiKey: 'sk-test',
      retries: 1,
      fetchImplementation: async () => {
        throw new Error('socket closed');
      },
    }).localize({ prompt: 'Translate', schema: {} }),
  ).rejects.toBeInstanceOf(OpenAIApiError);
});

test('OpenAI client times out aborted requests', async () => {
  jest.useFakeTimers();
  try {
    const client = new OpenAIClient({
      apiKey: 'sk-test',
      retries: 1,
      timeoutMs: 10,
      fetchImplementation: async (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    });
    const pending = client.localize({ prompt: 'Translate', schema: {} });
    const rejection = expect(pending).rejects.toThrow('timed out after 10ms');

    await jest.advanceTimersByTimeAsync(10);
    await rejection;
  } finally {
    jest.useRealTimers();
  }
});

test('OpenAI client queues work above its concurrency limit', async () => {
  let releaseFirst;
  const successfulResponse = () =>
    new Response(
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ label: 'hello', localization: {} }),
              },
            ],
          },
        ],
      }),
    );
  const fetchImplementation = jest
    .fn()
    .mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve(successfulResponse());
        }),
    )
    .mockImplementationOnce(async () => successfulResponse());
  const client = new OpenAIClient({
    apiKey: 'sk-test',
    workers: 1,
    retries: 1,
    fetchImplementation,
  });
  const request = { prompt: 'Translate', schema: {} };

  const first = client.localize(request);
  const second = client.localize(request);
  await Promise.resolve();
  expect(fetchImplementation).toHaveBeenCalledTimes(1);
  releaseFirst();
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  expect(fetchImplementation).toHaveBeenCalledTimes(2);
});

test('writeLocalizedRow handles empty, retryable, and terminal failures', async () => {
  const row = {
    row: 2,
    label: 'hello',
    sourceCode: 'en',
    source: 'Hello',
    cells: [{ column: 26, code: 'ru', text: '' }],
  };
  const emptyGateway = { fetch: async () => [], write: jest.fn() };
  await expect(writeLocalizedRow(emptyGateway, 'app', row)).resolves.toBe(false);
  expect(emptyGateway.write).not.toHaveBeenCalled();

  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  const terminalGateway = {
    fetch: async () => [],
    write: jest.fn(async () => {
      throw new SheetsError('forbidden', 403);
    }),
  };
  await expect(
    writeLocalizedRow(
      terminalGateway,
      'app',
      { ...row, cells: [{ ...row.cells[0], text: 'Привет' }] },
      3,
    ),
  ).resolves.toBe(false);
  expect(terminalGateway.write).toHaveBeenCalledTimes(1);
  expect(error.mock.calls.flat().join(' ')).toContain('Failed to update');
  error.mockRestore();

  jest.useFakeTimers();
  try {
    const limiter = { wait: jest.fn(async () => {}) };
    const retryGateway = {
      fetch: async () => [],
      write: jest
        .fn()
        .mockRejectedValueOnce(new SheetsError('busy', 500))
        .mockResolvedValueOnce(undefined),
    };
    const pending = writeLocalizedRow(
      retryGateway,
      'app',
      { ...row, cells: [{ ...row.cells[0], text: 'Привет' }] },
      2,
      limiter,
    );

    await jest.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toBe(true);
    expect(retryGateway.write).toHaveBeenCalledTimes(2);
    expect(limiter.wait).toHaveBeenCalledTimes(2);
    expect(cellRange('app', 26, 2)).toBe("'app'!AA3");
  } finally {
    jest.useRealTimers();
  }
});

test('rate limiter default delay serializes requests in real time windows', async () => {
  jest.useFakeTimers();
  try {
    const limiter = new RateLimiter(1, 10);
    await limiter.wait();
    const pending = limiter.wait();

    await jest.advanceTimersByTimeAsync(11);
    await expect(pending).resolves.toBeUndefined();
  } finally {
    jest.useRealTimers();
  }
});

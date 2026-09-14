import { expect, jest, test } from '@jest/globals';

import { OpenAIClient } from '../src/localize/client.ts';
import {
  extractEmptyCells,
  localizeRows,
} from '../src/localize/pipeline.ts';
import {
  cellRange,
  RateLimiter,
  updatesForRow,
  writeLocalizedRow,
} from '../src/localize/sheets.ts';
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

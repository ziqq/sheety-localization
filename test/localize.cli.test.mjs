import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  afterAll,
  beforeEach,
  expect,
  jest,
  test,
} from '@jest/globals';

const metadataGet = jest.fn();
const valuesGet = jest.fn();
const batchUpdate = jest.fn();
const getClient = jest.fn(async () => ({ kind: 'auth-client' }));
const GoogleAuth = jest.fn(() => ({ getClient }));
const sheets = jest.fn(() => ({
  spreadsheets: {
    get: metadataGet,
    values: { get: valuesGet, batchUpdate },
  },
}));

jest.unstable_mockModule('googleapis', () => ({
  google: { auth: { GoogleAuth }, sheets },
}));

const { main } = await import('../src/localize.ts');
const {
  GoogleSheetsGateway,
  SheetsError,
} = await import('../src/localize/sheets.ts');

const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'sheety-localize-cli-'),
);
const credentialsPath = path.join(temporaryDirectory, 'credentials.json');
const tokenPath = path.join(temporaryDirectory, 'token.txt');
const promptPath = path.join(temporaryDirectory, 'prompt.txt');
fs.writeFileSync(credentialsPath, '{}');
fs.writeFileSync(tokenPath, '  sk-from-file\n');
fs.writeFileSync(promptPath, '  Keep product terminology.\n');

const originalArgv = process.argv;
const originalApiKey = process.env.OPENAI_API_KEY;
const originalFetch = globalThis.fetch;

function responseFor(text, modelStatus = 'completed') {
  return new Response(
    JSON.stringify({
      status: modelStatus,
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                label: 'hello',
                localization: { ru: { text } },
              }),
            },
          ],
        },
      ],
    }),
    { status: 200 },
  );
}

function setArguments(...arguments_) {
  process.argv = ['node', 'sheety-localize', ...arguments_];
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.OPENAI_API_KEY;
  metadataGet.mockResolvedValue({ data: { sheets: [] } });
  valuesGet.mockResolvedValue({ data: { values: [] } });
  batchUpdate.mockResolvedValue({ data: {} });
});

afterAll(() => {
  process.argv = originalArgv;
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('localize CLI performs a complete dry run without writing to Sheets', async () => {
  metadataGet.mockResolvedValue({
    data: {
      sheets: [
        { properties: { title: 'app' } },
        { properties: {} },
        { properties: { title: 'ignored' } },
        { properties: { title: 'empty' } },
        { properties: { title: 'complete' } },
      ],
    },
  });
  valuesGet.mockImplementation(async ({ range }) => ({
    data: {
      values: {
        app: [
          ['label', 'description', 'meta', 'en', 'ru'],
          ['hello', 'Welcome', '{name}', 'Hello, {name}', ''],
        ],
        complete: [
          ['label', 'description', 'meta', 'en', 'ru'],
          ['done', '', '', 'Done', 'Готово'],
        ],
      }[range] ?? [],
    },
  }));
  const fetchMock = jest.fn(async () => responseFor('Привет, {name}'));
  globalThis.fetch = fetchMock;
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  setArguments(
    '--credentials',
    credentialsPath,
    '--sheet',
    'sheet-id',
    '--token-file',
    tokenPath,
    '--prompt',
    promptPath,
    '--ignore',
    '^ignored$',
    '--batch',
    '0',
    '--workers',
    '0',
    '--timeout',
    '0',
  );

  await main();

  expect(GoogleAuth).toHaveBeenCalledWith({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  expect(valuesGet.mock.calls.map(([request]) => request.range)).toEqual([
    'app',
    'empty',
    'complete',
  ]);
  expect(batchUpdate).not.toHaveBeenCalled();
  const request = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(request.instructions).toBe('Keep product terminology.');
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
    'Bearer sk-from-file',
  );
  expect(log.mock.calls.map((call) => call.join(' '))).toEqual(
    expect.arrayContaining([
      expect.stringContaining('Dry run:'),
      expect.stringContaining("[dry-run] 'app'!E2"),
      expect.stringContaining(
        'sheets=2, candidateRows=1, translatedCells=1, writtenRows=0, mode=dry-run',
      ),
    ]),
  );
  log.mockRestore();
});

test('localize CLI writes accepted translations with write credentials', async () => {
  metadataGet.mockResolvedValue({
    data: { sheets: [{ properties: { title: 'app' } }] },
  });
  valuesGet.mockResolvedValue({
    data: {
      values: [
        ['label', 'description', 'meta', 'en', 'ru'],
        ['hello', '', '', 'Hello', ''],
      ],
    },
  });
  globalThis.fetch = jest.fn(async () => responseFor('Привет'));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  setArguments(
    '--credentials',
    credentialsPath,
    '--sheet',
    'sheet-id',
    '--token',
    ' sk-inline ',
    '--model',
    'gpt-4o-mini',
    '--write',
  );

  await main();

  expect(GoogleAuth).toHaveBeenCalledWith({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  expect(batchUpdate).toHaveBeenCalledWith({
    spreadsheetId: 'sheet-id',
    requestBody: {
      valueInputOption: 'RAW',
      data: [{ range: "'app'!E2", values: [['Привет']] }],
    },
  });
  expect(log.mock.calls.flat().join(' ')).toContain(
    'sheets=1, candidateRows=1, translatedCells=1, writtenRows=1, mode=write',
  );
  log.mockRestore();
});

test('localize CLI reports missing credential, token, and prompt files', async () => {
  setArguments(
    '--credentials',
    path.join(temporaryDirectory, 'missing.json'),
    '--sheet',
    'sheet-id',
    '--token',
    'sk-test',
  );
  await expect(main()).rejects.toThrow('Credentials file does not exist');

  setArguments('--credentials', credentialsPath, '--sheet', 'sheet-id');
  await expect(main()).rejects.toThrow('OpenAI API key is required');

  setArguments(
    '--credentials',
    credentialsPath,
    '--sheet',
    'sheet-id',
    '--token',
    'sk-test',
    '--prompt',
    path.join(temporaryDirectory, 'missing-prompt.txt'),
  );
  await expect(main()).rejects.toThrow('File does not exist');

  process.env.OPENAI_API_KEY = ' sk-from-env ';
  setArguments('--credentials', credentialsPath, '--sheet', 'sheet-id');
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  await expect(main()).resolves.toBeUndefined();
  expect(log.mock.calls.flat().join(' ')).toContain('mode=dry-run');
  log.mockRestore();
});

test('Google Sheets gateway filters empty tabs and classifies API errors', async () => {
  metadataGet.mockResolvedValueOnce({ data: {} });
  const gateway = new GoogleSheetsGateway({}, 'sheet-id');
  await expect(gateway.fetch()).resolves.toEqual([]);

  metadataGet.mockRejectedValueOnce({ response: { status: 403 } });
  await expect(gateway.fetch()).rejects.toMatchObject({
    name: 'SheetsError',
    status: 403,
    retryable: false,
  });

  batchUpdate.mockRejectedValueOnce(new Error('offline'));
  await expect(
    gateway.write([{ range: "'app'!E2", value: 'Привет' }]),
  ).rejects.toMatchObject({
    name: 'SheetsError',
    status: undefined,
    retryable: true,
  });
  expect(new SheetsError('busy', 429).retryable).toBe(true);
  expect(new SheetsError('server', 500).retryable).toBe(true);
});

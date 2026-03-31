import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { google } from 'googleapis';

import { importGeneratorModule } from './runtime-target.mjs';

const { __test__ } = await importGeneratorModule();

const {
  buildIgnorePatterns,
  fetchSpreadsheet,
  generateLocalizationTable,
  getBaseLocale,
  isExecutedDirectly,
  listFilesRecursive,
  main,
  mapPlaceholderType,
  normalizeMessageMeta,
  writeJsonFiles,
} = __test__;

const originalArgv = process.argv;
const originalExit = process.exit;
const originalGoogleAuth = google.auth.GoogleAuth;
const originalSheets = google.sheets;

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.argv = originalArgv;
  process.exit = originalExit;
  google.auth.GoogleAuth = originalGoogleAuth;
  google.sheets = originalSheets;
  jest.restoreAllMocks();
});

test('generateLocalizationTable adds regional fallback base locales', async () => {
  const buckets = await generateLocalizationTable([
    {
      title: 'app',
      values: [
        ['label', 'description', 'meta', 'pt_BR'],
        [
          'welcomeTitle',
          'Greeting',
          '{"placeholders":{"name":{"type":"String"}}}',
          'Ola {name}',
        ],
      ],
    },
  ]);

  expect(Object.keys(buckets.app).sort()).toEqual(['pt', 'pt_BR']);
  expect(buckets.app.pt_BR.welcomeTitle).toBe('Ola {name}');
  expect(buckets.app.pt.welcomeTitle).toBe('Ola {name}');
  expect(buckets.app.pt['@welcomeTitle']).toEqual({
    placeholders: {
      name: {
        type: 'String',
      },
    },
  });
});

test('generateLocalizationTable omits missing translations by default and can keep explicit empty values', async () => {
  const sheets = [
    {
      title: 'app',
      values: [
        ['label', 'description', 'meta', 'en', 'ru', 'fr'],
        ['title', 'Greeting', 'Greeting meta', 'Hello', 'Privet'],
        ['subtitle', 'Subtitle', 'Subtitle meta', 'Welcome', '', ''],
      ],
    },
  ];

  const defaultBuckets = await generateLocalizationTable(sheets);
  const includeEmptyBuckets = await generateLocalizationTable(sheets, {
    includeEmpty: true,
  });

  expect(defaultBuckets.app.en.title).toBe('Hello');
  expect(defaultBuckets.app.ru.title).toBe('Privet');
  expect(defaultBuckets.app.fr.title).toBeUndefined();
  expect(defaultBuckets.app.fr['@title']).toBeUndefined();
  expect(defaultBuckets.app.ru.subtitle).toBeUndefined();
  expect(defaultBuckets.app.ru['@subtitle']).toBeUndefined();

  expect(includeEmptyBuckets.app.fr.title).toBe('');
  expect(includeEmptyBuckets.app.fr['@title']).toBe('Greeting meta');
  expect(includeEmptyBuckets.app.ru.subtitle).toBe('');
  expect(includeEmptyBuckets.app.ru['@subtitle']).toBe('Subtitle meta');
});

test('small helper functions keep locale and meta normalization behavior', () => {
  expect(getBaseLocale('pt_BR')).toBe('pt');
  expect(getBaseLocale('ru')).toBeNull();
  expect(mapPlaceholderType('DateTime')).toBe('Date | string');
  expect(normalizeMessageMeta('  Hello  ')).toEqual({ description: 'Hello' });
  expect(normalizeMessageMeta({ description: 'Hello' })).toEqual({
    description: 'Hello',
  });
  expect(normalizeMessageMeta(null)).toBeNull();
  expect(
    buildIgnorePatterns('help,temp-.*').map((entry) => entry.source),
  ).toEqual(['help', 'temp-.*']);
});

test('buildIgnorePatterns skips invalid regex values', () => {
  const patterns = buildIgnorePatterns('help,([');

  expect(patterns.map((entry) => entry.source)).toEqual(['help']);
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Invalid ignore pattern "([", skipping',
  );
});

test('generateLocalizationTable reports skipped rows and invalid json meta', async () => {
  const buckets = await generateLocalizationTable([
    {
      title: 'todo',
      values: [
        ['label', 'description', 'meta', '', 'en', 'pt_BR'],
        [],
        ['short'],
        ['', 'Missing label', ''],
        ['status', 'Status', '{"broken":}', '', 'Open', 'Aberto'],
        ['note', 'Note', 'Plain text meta', '', 'Hello', 'Ola'],
      ],
    },
  ]);

  expect(Object.keys(buckets.todo).sort()).toEqual(['en', 'pt', 'pt_BR']);
  expect(buckets.todo.en.status).toBe('Open');
  expect(buckets.todo.pt.note).toBe('Ola');
  expect(buckets.todo.en['@note']).toBe('Plain text meta');
  expect(buckets.todo.en['@status']).toBeUndefined();
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Invalid locale header at column D, ignoring',
  );
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Sheet "todo" has empty row 2, skipping',
  );
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Sheet "todo" has row 3 with less than 3 base columns, skipping',
  );
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Empty label at row 4, skipping',
  );
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Invalid JSON in meta at row 5',
  );
});

test('writeJsonFiles manages stale files, rewrites broken json, and reports manifest logs', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-write-'),
  );
  const outputDir = path.join(tempRoot, 'locales');

  try {
    const buckets = {
      app: {
        en: {
          title: 'Hello',
          '@title': 'Greeting',
        },
        ru: {
          title: 'Privet',
          '@title': 'Greeting',
        },
      },
      todo: {
        en: {
          subtitle: 'Tasks: {count}',
          '@subtitle': {
            placeholders: {
              count: { type: 'int' },
            },
          },
        },
      },
    };

    await writeJsonFiles(
      buckets,
      outputDir,
      'app',
      { '@@project': 'demo' },
      'Test Author',
      'Generated in tests',
      'Source test context',
    );

    const appEnPath = path.join(outputDir, 'app', 'app_en.json');
    const todoEnPath = path.join(outputDir, 'todo', 'app_en.json');
    const stalePath = path.join(outputDir, 'legacy', 'obsolete.json');

    mkdirSync(path.dirname(stalePath), { recursive: true });
    writeFileSync(stalePath, '{"obsolete":true}\n', 'utf8');
    writeFileSync(appEnPath, '{broken', 'utf8');

    await writeJsonFiles(
      buckets,
      outputDir,
      'app',
      { '@@project': 'demo' },
      'Test Author',
      'Generated in tests',
      'Source test context',
    );

    const thirdManifest = await writeJsonFiles(
      buckets,
      outputDir,
      'app',
      { '@@project': 'demo' },
      'Test Author',
      'Generated in tests',
      'Source test context',
    );

    expect(thirdManifest.baseLocale).toBe('en');
    expect(existsSync(appEnPath)).toBe(true);
    expect(existsSync(todoEnPath)).toBe(true);
    expect(existsSync(stalePath)).toBe(false);
    expect(
      listFilesRecursive(outputDir, (filePath) =>
        filePath.endsWith('.json'),
      ).sort(),
    ).toEqual([
      appEnPath,
      path.join(outputDir, 'app', 'app_ru.json'),
      todoEnPath,
    ]);

    const appEn = JSON.parse(readFileSync(appEnPath, 'utf8'));
    expect(appEn['@@project']).toBe('demo');
    expect(appEn['@@author']).toBe('Test Author');
    expect(appEn['@@comment']).toBe('Generated in tests');
    expect(appEn['@@context']).toBe('Source test context');
    expect(appEn['@@last_modified']).toEqual(expect.any(String));
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      expect.stringContaining('Deleted stale locale file:'),
    );
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      expect.stringContaining('JSON file is up to date, skipping rewrite:'),
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('writeJsonFiles can omit and explicitly control @@last_modified metadata', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-write-modified-'),
  );
  const outputDir = path.join(tempRoot, 'locales');

  try {
    const buckets = {
      app: {
        en: {
          title: 'Hello',
        },
      },
    };

    await writeJsonFiles(
      buckets,
      outputDir,
      'app',
      {},
      'Test Author',
      'Generated in tests',
      'Source test context',
      undefined,
      {
        includeLastModified: false,
      },
    );

    const appEnPath = path.join(outputDir, 'app', 'app_en.json');
    const withoutTimestamp = JSON.parse(readFileSync(appEnPath, 'utf8'));
    expect(withoutTimestamp['@@last_modified']).toBeUndefined();

    await writeJsonFiles(
      buckets,
      outputDir,
      'app',
      {},
      'Test Author',
      'Generated in tests',
      'Source test context',
      undefined,
      {
        includeLastModified: true,
        modifiedAt: '2026-03-25T12:00:00.000Z',
      },
    );

    const withTimestamp = JSON.parse(readFileSync(appEnPath, 'utf8'));
    expect(withTimestamp['@@last_modified']).toBe('2026-03-25T12:00:00.000Z');

    await writeJsonFiles(
      buckets,
      outputDir,
      'app',
      {},
      'Test Author',
      'Generated in tests',
      'Source test context',
      undefined,
      {
        includeLastModified: false,
      },
    );

    const removedTimestamp = JSON.parse(readFileSync(appEnPath, 'utf8'));
    expect(removedTimestamp['@@last_modified']).toBeUndefined();
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main generates locale files from mocked sheets api using meta file and ts index', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-success-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');
  const metaPath = path.join(tempRoot, 'meta.json');
  const outputDir = path.join(tempRoot, 'generated');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ client_email: 'bot@example.com' }),
    'utf8',
  );
  writeFileSync(metaPath, JSON.stringify({ '@@project': 'demo' }), 'utf8');

  try {
    const getClient = jest.fn().mockResolvedValue({ token: 'client' });
    const getSpreadsheet = jest.fn().mockResolvedValue({
      data: {
        sheets: [
          { properties: { title: 'help' } },
          { properties: { title: 'app' } },
          { properties: { title: 'draft' } },
          { properties: {} },
        ],
      },
    });
    const getValues = jest.fn(({ range }) => {
      if (range === 'app') {
        return Promise.resolve({
          data: {
            values: [
              ['label', 'description', 'meta', 'en', 'ru'],
              ['title', 'Title', 'Greeting', 'Hello', 'Privet'],
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          values: [['label', 'description', 'meta', 'en']],
        },
      });
    });

    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        return getClient();
      }
    };

    google.sheets = jest.fn(() => ({
      spreadsheets: {
        get: getSpreadsheet,
        values: {
          get: getValues,
        },
      },
    }));

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
      '--output',
      outputDir,
      '--prefix',
      'app',
      '--meta',
      '{"@@ignored":"value"}',
      '--meta-file',
      metaPath,
      '--type',
      'ts',
      '--ignore',
      'help',
    ];

    await main();

    expect(getClient).toHaveBeenCalledTimes(1);
    expect(getSpreadsheet).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-id',
    });
    expect(getValues).toHaveBeenCalledTimes(2);
    expect(existsSync(path.join(outputDir, 'index.ts'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'index.js'))).toBe(false);

    const generatedJson = JSON.parse(
      readFileSync(path.join(outputDir, 'app', 'app_en.json'), 'utf8'),
    );
    expect(generatedJson.title).toBe('Hello');
    expect(generatedJson['@@project']).toBe('demo');
    expect(generatedJson['@@ignored']).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      'Sheet "draft" has insufficient data, skipping',
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      'Skipping sheet with missing title',
    );
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      'Generating index.ts...',
    );
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      'Successfully generated localization files for 1 buckets.',
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main supports explicit missing-cell semantics and disabling @@last_modified metadata', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-options-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');
  const outputDir = path.join(tempRoot, 'generated');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ client_email: 'bot@example.com' }),
    'utf8',
  );

  try {
    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        return { token: 'client' };
      }
    };

    google.sheets = jest.fn(() => ({
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [{ properties: { title: 'app' } }],
          },
        }),
        values: {
          get: jest.fn().mockResolvedValue({
            data: {
              values: [
                ['label', 'description', 'meta', 'en', 'ru', 'fr'],
                ['title', 'Title', 'Greeting', 'Hello', 'Privet'],
              ],
            },
          }),
        },
      },
    }));

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
      '--output',
      outputDir,
      '--no-last-modified',
      '--include-empty',
      '--type',
      'ts',
    ];

    await main();

    const appFr = JSON.parse(
      readFileSync(path.join(outputDir, 'app', 'fr.json'), 'utf8'),
    );
    expect(appFr.title).toBe('');
    expect(appFr['@title']).toBe('Greeting');
    expect(appFr['@@last_modified']).toBeUndefined();
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main generates js index when requested', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-js-success-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');
  const outputDir = path.join(tempRoot, 'generated');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ client_email: 'bot@example.com' }),
    'utf8',
  );

  try {
    const getClient = jest.fn().mockResolvedValue({ token: 'client' });

    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        return getClient();
      }
    };

    google.sheets = jest.fn(() => ({
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [{ properties: { title: 'app' } }],
          },
        }),
        values: {
          get: jest.fn().mockResolvedValue({
            data: {
              values: [
                ['label', 'description', 'meta', 'en'],
                ['title', 'Title', '', 'Hello'],
              ],
            },
          }),
        },
      },
    }));

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
      '--output',
      outputDir,
      '--type',
      'js',
    ];

    await main();

    expect(getClient).toHaveBeenCalledTimes(1);
    expect(existsSync(path.join(outputDir, 'index.js'))).toBe(true);
    expect(existsSync(path.join(outputDir, 'index.ts'))).toBe(false);
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      'Generating index.js...',
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main exits when credentials file is missing', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-missing-creds-'),
  );
  const missingCredentialsPath = path.join(tempRoot, 'missing.json');

  try {
    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      missingCredentialsPath,
      '--sheet',
      'spreadsheet-id',
      '--output',
      path.join(tempRoot, 'generated'),
      '--type',
      'js',
    ];

    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    await expect(main()).rejects.toThrow('EXIT:1');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      `Missing credentials file at ${missingCredentialsPath}`,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('fetchSpreadsheet exits with helpful messages for 403 and 404 metadata errors', async () => {
  const metadataErrorCases = [
    {
      status: 403,
      messages: [
        'Google Sheets API returned 403 (forbidden).',
        'Please make sure the spreadsheet is shared with the service account',
        'from your credentials.json (at least Viewer access).',
      ],
    },
    {
      status: 404,
      messages: [
        'Google Sheets API returned 404 (not found).',
        'Please verify the --sheet (spreadsheetId) argument is correct.',
      ],
    },
  ];

  for (const { status, messages } of metadataErrorCases) {
    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    google.sheets = jest.fn(() => ({
      spreadsheets: {
        get: jest.fn().mockRejectedValue({
          response: { status },
        }),
        values: {
          get: jest.fn(),
        },
      },
    }));

    await expect(
      fetchSpreadsheet({ token: 'client' }, 'sheet-id'),
    ).rejects.toThrow('EXIT:1');

    for (const message of messages) {
      expect(console.error).toHaveBeenCalledWith('[ERROR]', message);
    }

    jest.clearAllMocks();
  }
});

test('fetchSpreadsheet reports generic metadata and value fetch failures while keeping usable sheets', async () => {
  const getValues = jest.fn(({ range }) => {
    if (range === 'broken') {
      return Promise.reject(new Error('Network down'));
    }

    return Promise.resolve({
      data: {
        values: [
          ['label', 'description', 'meta', 'en'],
          ['title', 'Title', '', 'Hello'],
        ],
      },
    });
  });

  google.sheets = jest.fn(() => ({
    spreadsheets: {
      get: jest.fn().mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: 'usable' } },
            { properties: { title: 'broken' } },
          ],
        },
      }),
      values: {
        get: getValues,
      },
    },
  }));

  const sheets = await fetchSpreadsheet({ token: 'client' }, 'sheet-id');

  expect(sheets).toEqual([
    {
      title: 'usable',
      values: [
        ['label', 'description', 'meta', 'en'],
        ['title', 'Title', '', 'Hello'],
      ],
    },
  ]);
  expect(console.error).toHaveBeenCalledWith(
    '[ERROR]',
    'Error fetching values for sheet "broken": Error: Network down',
  );
  expect(console.log).toHaveBeenCalledWith(
    '[INFO]',
    'Spreadsheet summary: total sheets=2, usable=1, ignored=0, insufficient=0',
  );
});

test('main exits when auth creation fails with invalid grant guidance', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-invalid-grant-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ private_key: 'bad' }),
    'utf8',
  );

  try {
    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        throw new Error('invalid_grant Invalid JWT Signature');
      }
    };

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
    ];

    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    await expect(main()).rejects.toThrow('EXIT:1');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      'Error creating Google Sheets API client: invalid or revoked service account key in credentials.json.',
    );
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      'The example credentials bundled with this project are not intended for real use.',
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main exits when auth creation fails with a generic error', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-auth-error-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ private_key: 'bad' }),
    'utf8',
  );

  try {
    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        throw new Error('oauth unavailable');
      }
    };

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
    ];

    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    await expect(main()).rejects.toThrow('EXIT:1');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      'Error creating Google Sheets API client: Error: oauth unavailable',
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main exits when processed locale names are invalid after sanitization', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-no-locales-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ client_email: 'bot@example.com' }),
    'utf8',
  );

  try {
    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        return { token: 'client' };
      }
    };

    google.sheets = jest.fn(() => ({
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [{ properties: { title: 'app' } }],
          },
        }),
        values: {
          get: jest.fn().mockResolvedValue({
            data: {
              values: [
                ['label', 'description', 'meta', '!!!'],
                ['title', 'Title', '', 'Hello'],
              ],
            },
          }),
        },
      },
    }));

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
      '--output',
      path.join(tempRoot, 'generated'),
    ];

    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    await expect(main()).rejects.toThrow('EXIT:1');
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      'No locales found in processed sheets.',
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('main exits when spreadsheet metadata contains no usable sheets', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-source-main-no-sheets-'),
  );
  const credentialsPath = path.join(tempRoot, 'credentials.json');

  writeFileSync(
    credentialsPath,
    JSON.stringify({ client_email: 'bot@example.com' }),
    'utf8',
  );

  try {
    google.auth.GoogleAuth = class MockGoogleAuth {
      async getClient() {
        return { token: 'client' };
      }
    };

    google.sheets = jest.fn(() => ({
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [],
          },
        }),
        values: {
          get: jest.fn(),
        },
      },
    }));

    process.argv = [
      'node',
      'bin/generate.js',
      '--credentials',
      credentialsPath,
      '--sheet',
      'spreadsheet-id',
    ];

    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    await expect(main()).rejects.toThrow('EXIT:1');
    expect(console.error).toHaveBeenCalledWith('[ERROR]', 'No sheets found');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('isExecutedDirectly reflects argv entry path matching the current module', () => {
  process.argv = ['node', path.join(process.cwd(), 'src', 'generate.ts')];
  expect(isExecutedDirectly()).toBe(true);

  process.argv = [
    'node',
    path.join(process.cwd(), 'test', 'generate.source.test.mjs'),
  ];
  expect(isExecutedDirectly()).toBe(false);

  process.argv = ['node'];
  expect(isExecutedDirectly()).toBe(false);
});

test('isExecutedDirectly resolves symlinked entry paths', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'sheety-cli-entry-'));

  try {
    const symlinkPath = path.join(tempRoot, 'sheety-localization');
    await symlink(path.join(process.cwd(), 'src', 'generate.ts'), symlinkPath);

    process.argv = ['node', symlinkPath];
    expect(isExecutedDirectly()).toBe(true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

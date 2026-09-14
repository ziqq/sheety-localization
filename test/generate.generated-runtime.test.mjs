import { spawn } from 'node:child_process';
import fs, { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';

import {
  buildGeneratedManifest,
  countBucketPlaceholders,
  createJsIndexSource,
  createTsIndexSource,
  logManifestSummary,
  mapPlaceholderType,
} from '../src/generator/manifest.ts';
import {
  cleanupStaleIndexFiles,
  generateIndexJs,
  generateIndexTs,
  writeJsonFiles,
} from '../src/generator/output.ts';
import IntlMessageFormat from '../src/runtime/intl-messageformat.ts';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

test('runtime source entry re-exports the bundled message formatter', () => {
  const message = new IntlMessageFormat('Hello, {name}!', 'en');

  expect(message.format({ name: 'Ada' })).toBe('Hello, Ada!');
});

afterEach(() => {
  jest.restoreAllMocks();
});

function inspectGeneratedRuntime(modulePath) {
  return new Promise((resolve, reject) => {
    const script = `
      const generated = await import(${JSON.stringify(pathToFileURL(modulePath).href)});
      console.log(JSON.stringify({
        baseLocale: generated.baseLocale,
        supportedLocales: [...generated.supportedLocales],
        bucketNames: [...generated.bucketNames],
        resolvedLocale: generated.resolveLocale('en-US'),
        localeChain: generated.getLocaleChain('pt-br'),
        bucketLocaleChain: generated.getBucketLocaleChain('app', 'pt-BR'),
        bucketBaseLocales: generated.bucketBaseLocales,
        subtitleMeta: generated.getMessageMeta('todo', 'subtitle'),
        formattedSubtitle: generated.formatMessage('Tasks: {count}', { count: 3 }),
        missingParams: generated.formatMessage('Hello {name}'),
        partialParams: generated.formatMessage('Hello {name}, age {age}', {
          name: 'Ada',
        }),
        pluralOne: generated.formatMessage(
          '{count, plural, one {# task} other {# tasks}}',
          { count: 1 },
          'en',
        ),
        pluralMany: generated.formatMessage(
          '{count, plural, one {# задача} few {# задачи} many {# задач} other {# задачи}}',
          { count: 5 },
          'ru',
        ),
        fallbackTitle: await generated.translate('app', 'title', 'ru'),
      }));
    `;

    const child = spawn(
      process.execPath,
      ['--input-type=module', '--eval', script],
      {
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(stderr || stdout || `Failed to inspect ${modulePath}`),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (error) {
        reject(error);
      }
    });
  });
}

test('buildGeneratedManifest derives locales, bucket metadata, and file paths', () => {
  const manifest = buildGeneratedManifest(
    {
      app: {
        en: {
          title: 'Hello',
          '@title': 'Title text',
        },
        ru: {
          title: 'Привет',
          '@title': 'Title text',
        },
      },
      todo: {
        ru: {
          subtitle: 'Tasks: {count}',
          '@subtitle': {
            placeholders: {
              count: { type: 'int' },
            },
          },
        },
      },
    },
    '/virtual/locales',
    'app',
  );

  expect(manifest.baseLocale).toBe('en');
  expect(manifest.bucketNames).toEqual(['app', 'todo']);
  expect(manifest.localeNames).toEqual(['en', 'ru']);
  expect(manifest.bucketLocales.todo).toEqual(['ru']);
  expect(manifest.bucketBaseLocales).toEqual({ app: 'en', todo: 'ru' });
  expect(manifest.bucketDefinitions.todo.messages[0].placeholders).toEqual([
    { name: 'count', type: 'int' },
  ]);
  expect(
    manifest.files.find(
      (file) => file.bucket === 'todo' && file.locale === 'ru',
    )?.relativeImportPath,
  ).toBe('./todo/app_ru.json');
});

test('manifest handles empty projects and conservative placeholder metadata', () => {
  const manifest = buildGeneratedManifest(
    {
      app: {
        fr: {
          title: 'Bonjour',
          '@title': {
            placeholders: {
              invalid: null,
              missingType: { type: ' ' },
              publishedAt: { type: 'date', example: '2026-09-14' },
            },
          },
        },
      },
    },
    '/virtual/locales',
    '',
    { app: 'fr' },
  );

  expect(manifest.baseLocale).toBe('fr');
  expect(manifest.files[0].fileName).toBe('fr.json');
  expect(manifest.bucketDefinitions.app.messages[0].placeholders).toEqual([
    { name: 'invalid', type: 'unknown' },
    { name: 'missingType', type: 'unknown' },
    { name: 'publishedAt', type: 'date', example: '2026-09-14' },
  ]);
  const typeCases = [
    ['string', 'string'],
    ['int', 'number'],
    ['integer', 'number'],
    ['double', 'number'],
    ['float', 'number'],
    ['num', 'number'],
    ['number', 'number'],
    ['bool', 'boolean'],
    ['boolean', 'boolean'],
    ['date', 'Date | string'],
    ['datetime', 'Date | string'],
    ['array', 'unknown[]'],
    ['list', 'unknown[]'],
    ['map', 'Record<string, unknown>'],
    ['json', 'Record<string, unknown>'],
    ['object', 'Record<string, unknown>'],
    ['unknown-type', 'unknown'],
  ];
  for (const [input, expected] of typeCases) {
    expect(mapPlaceholderType(input)).toBe(expected);
  }

  const emptyManifest = buildGeneratedManifest({}, '/virtual/locales', 'app');
  expect(emptyManifest.baseLocale).toBe('');
  expect(createTsIndexSource(emptyManifest)).toContain(
    'export type SupportedLocale = string;',
  );
  logManifestSummary(emptyManifest);
  expect(console.log).toHaveBeenCalledWith(
    '[INFO]',
    'Manifest summary: baseLocale=, locales=[none], buckets=0',
  );

  const emptyBucketManifest = buildGeneratedManifest(
    { empty: {} },
    '/virtual/locales',
    'app',
  );
  expect(emptyBucketManifest.bucketDefinitions.empty).toEqual({
    keys: [],
    messages: [],
  });

  const invalidRequestedLocale = buildGeneratedManifest(
    { app: { en: { title: 'Hello' } } },
    '/virtual/locales',
    'app',
    { app: 'fr' },
  );
  expect(invalidRequestedLocale.bucketBaseLocales.app).toBe('en');
});

test('createTsIndexSource exposes documented runtime helpers', () => {
  const manifest = buildGeneratedManifest(
    {
      app: {
        en: {
          title: 'Hello',
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
    },
    '/virtual/locales',
    'app',
  );

  const source = createTsIndexSource(manifest);

  expect(source).toMatch(/export const bucketLocales:/);
  expect(source).toMatch(/export function getMessageMeta/);
  expect(source).toMatch(/export function resolveBucketLocale/);
  expect(source).toMatch(/export async function loadLocaleFacade/);
  expect(source).toMatch(/export function createLocaleFacade/);
  expect(source).toMatch(/"subtitle": \{ "count": number \};/);
  expect(source).toContain(
    "import IntlMessageFormat from './sheety-message-format.js';",
  );
});

test('createJsIndexSource emits helper docs and loader exports', () => {
  const manifest = buildGeneratedManifest(
    {
      app: {
        en: {
          title: 'Hello',
        },
      },
    },
    '/virtual/locales',
    'app',
  );

  const source = createJsIndexSource(manifest);

  expect(source).toMatch(/export const bucketLocales = \{/);
  expect(source).toMatch(/Read generated metadata for a bucket message key\./);
  expect(source).toMatch(/export function getLocaleChain\(locale\)/);
  expect(source).toMatch(/export async function loadLocales\(\)/);
  expect(source).toContain(
    "import IntlMessageFormat from './sheety-message-format.js';",
  );
});

test('generateIndexTs and generateIndexJs write files and cleanupStaleIndexFiles removes opposite variant', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-runtime-index-'),
  );
  const manifest = buildGeneratedManifest(
    {
      app: {
        en: {
          title: 'Hello',
        },
        ru: {
          title: 'Privet',
        },
      },
    },
    tempRoot,
    'app',
  );

  try {
    await generateIndexTs(tempRoot, manifest);
    await generateIndexJs(tempRoot, manifest);

    const indexTsPath = path.join(tempRoot, 'index.ts');
    const indexJsPath = path.join(tempRoot, 'index.js');

    expect(readFileSync(indexTsPath, 'utf8')).toMatch(
      /export const bucketNames/,
    );
    expect(readFileSync(indexJsPath, 'utf8')).toMatch(
      /export const supportedLocales/,
    );
    expect(
      readFileSync(path.join(tempRoot, 'sheety-message-format.js'), 'utf8'),
    ).toMatch(/IntlMessageFormat/);
    expect(
      readFileSync(path.join(tempRoot, 'sheety-message-format.d.ts'), 'utf8'),
    ).toMatch(/declare class IntlMessageFormat/);

    cleanupStaleIndexFiles(tempRoot, 'ts');
    expect(readFileSync(indexTsPath, 'utf8')).toMatch(
      /export const bucketNames/,
    );

    cleanupStaleIndexFiles(tempRoot, 'js');
    expect(() => readFileSync(indexTsPath, 'utf8')).toThrow();
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('index generation reports a missing bundled message formatter', async () => {
  jest.spyOn(fs, 'existsSync').mockReturnValue(false);
  const manifest = buildGeneratedManifest(
    { app: { en: { title: 'Hello' } } },
    '/virtual/locales',
    'app',
  );

  await expect(generateIndexJs('/virtual/locales', manifest)).rejects.toThrow(
    'Bundled message formatter is missing',
  );
});

test('countBucketPlaceholders and logManifestSummary report manifest totals', () => {
  const manifest = buildGeneratedManifest(
    {
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
    },
    '/virtual/locales',
    'app',
  );

  expect(countBucketPlaceholders(manifest.bucketDefinitions.todo)).toBe(1);

  logManifestSummary(manifest);

  expect(console.log).toHaveBeenCalledWith(
    '[INFO]',
    'Manifest summary: baseLocale=en, locales=[en], buckets=1',
  );
  expect(console.log).toHaveBeenCalledWith(
    '[INFO]',
    'Bucket "todo": locales=[en], keys=1, placeholders=1',
  );
});

test('generated runtime file can be imported and used against generated locale json', async () => {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-generated-runtime-'),
  );

  try {
    const buckets = {
      app: {
        en: {
          title: 'Hello',
        },
        ru: {},
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

    const manifest = await writeJsonFiles(
      buckets,
      tempRoot,
      'app',
      {},
      'Runtime Test',
      'Generated runtime',
      'Generated runtime suite',
    );
    await generateIndexJs(tempRoot, manifest);

    const generated = await inspectGeneratedRuntime(
      path.join(tempRoot, 'index.js'),
    );

    expect(generated.baseLocale).toBe('en');
    expect(generated.supportedLocales).toEqual(['en', 'ru']);
    expect(generated.bucketNames).toEqual(['app', 'todo']);
    expect(generated.resolvedLocale).toBe('en');
    expect(generated.localeChain).toEqual(['pt_BR', 'pt', 'en']);
    expect(generated.bucketLocaleChain).toEqual(['en']);
    expect(generated.bucketBaseLocales).toEqual({ app: 'en', todo: 'en' });
    expect(generated.subtitleMeta).toEqual({
      placeholders: {
        count: {
          type: 'int',
        },
      },
    });
    expect(generated.formattedSubtitle).toBe('Tasks: 3');
    expect(generated.missingParams).toBe('Hello {name}');
    expect(generated.partialParams).toBe('Hello Ada, age {age}');
    expect(generated.pluralOne).toBe('1 task');
    expect(generated.pluralMany).toBe('5 задач');
    expect(generated.fallbackTitle).toBe('Hello');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

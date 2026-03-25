import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
} from '../src/generator/manifest.ts';
import {
  cleanupStaleIndexFiles,
  generateIndexJs,
  generateIndexTs,
  writeJsonFiles,
} from '../src/generator/output.ts';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
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
        localeChain: generated.getLocaleChain('pt-BR'),
        subtitleMeta: generated.getMessageMeta('todo', 'subtitle'),
        formattedSubtitle: generated.formatMessage('Tasks: {count}', { count: 3 }),
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
  expect(manifest.bucketDefinitions.todo.messages[0].placeholders).toEqual([
    { name: 'count', type: 'int' },
  ]);
  expect(
    manifest.files.find(
      (file) => file.bucket === 'todo' && file.locale === 'ru',
    )?.relativeImportPath,
  ).toBe('./todo/app_ru.json');
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
    expect(generated.supportedLocales).toEqual(['en']);
    expect(generated.bucketNames).toEqual(['app', 'todo']);
    expect(generated.resolvedLocale).toBe('en');
    expect(generated.localeChain).toEqual(['pt_BR', 'pt', 'en']);
    expect(generated.subtitleMeta).toEqual({
      placeholders: {
        count: {
          type: 'int',
        },
      },
    });
    expect(generated.formattedSubtitle).toBe('Tasks: 3');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

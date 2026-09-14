import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { build } from 'esbuild';

import { repoRoot } from './runtime-target.mjs';

const exampleLocalesDir = path.join(repoRoot, 'example', 'src', 'locales');
const exampleIndexPath = path.join(exampleLocalesDir, 'index.ts');
const legacyLocalesDir = path.join(
  repoRoot,
  'test',
  'fixtures',
  'backward-compatibility',
  'v0.2.2',
  'locales',
);
const legacyIndexPath = path.join(legacyLocalesDir, 'index.js');

let generated;
let legacyGenerated;
let tempRoot;

function messageKeys(dictionary) {
  return Object.keys(dictionary)
    .filter((key) => !key.startsWith('@'))
    .sort();
}

function paramsFor(meta) {
  return Object.fromEntries(
    Object.entries(meta?.placeholders ?? {}).map(([name, definition]) => {
      const type = String(definition?.type ?? '').toLowerCase();
      const value =
        definition?.example ??
        (['int', 'integer', 'double', 'float', 'num', 'number'].includes(type)
          ? 2
          : ['bool', 'boolean'].includes(type)
            ? true
            : ['date', 'datetime'].includes(type)
              ? new Date('2026-01-02T00:00:00.000Z')
              : 'example');
      return [name, value];
    }),
  );
}

beforeAll(async () => {
  tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'sheety-localization-example-test-'),
  );
  const bundlePath = path.join(tempRoot, 'example-locales.mjs');
  const legacyBundlePath = path.join(tempRoot, 'v0.2.2-locales.mjs');

  await Promise.all(
    [
      [exampleIndexPath, bundlePath],
      [legacyIndexPath, legacyBundlePath],
    ].map(([entryPoint, outfile]) =>
      build({
        entryPoints: [entryPoint],
        outfile,
        bundle: true,
        format: 'esm',
        platform: 'node',
        target: 'node20',
      }),
    ),
  );

  generated = await import(pathToFileURL(bundlePath).href);
  legacyGenerated = await import(pathToFileURL(legacyBundlePath).href);
});

afterAll(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('example contains the complete expected localization inventory', () => {
  expect(generated.supportedLocales).toEqual(['en', 'ru']);
  expect(generated.baseLocale).toBe('en');
  expect(generated.bucketNames).toEqual(['app', 'errors', 'todo']);
  expect(generated.bucketKeys).toEqual({
    app: [
      'englishLabel',
      'language',
      'languageCode',
      'localeCode',
      'russianLabel',
      'spanishLabel',
      'title',
      'welcomeSubtitle',
      'welcomeTitle',
    ],
    errors: [
      'badGatewayError',
      'badRequestError',
      'bandwidthLimitExceededError',
      'clientError',
      'conflictError',
      'defaultError',
      'forbiddenError',
      'gatewayTimeoutError',
      'internalServerError',
      'networkError',
      'notFoundError',
      'notImplementedError',
      'redirectionError',
      'requestTimeoutError',
      'serverError',
      'serviceUnavailableError',
      'timeoutError',
      'tooManyRequestsError',
      'unauthorizedError',
      'unknownError',
      'validationError',
    ],
    todo: ['addButton', 'subtitle', 'title'],
  });
});

test('every generated example dictionary contains every declared message', async () => {
  const allLocales = await generated.loadLocales();

  for (const locale of generated.supportedLocales) {
    expect(Object.keys(allLocales[locale]).sort()).toEqual(
      [...generated.bucketNames].sort(),
    );

    for (const bucket of generated.bucketNames) {
      const dictionary = allLocales[locale][bucket];
      expect(dictionary['@@locale']).toBe(locale);
      expect(messageKeys(dictionary)).toEqual(generated.bucketKeys[bucket]);

      for (const key of generated.bucketKeys[bucket]) {
        expect(dictionary[key]).toEqual(expect.any(String));
        expect(dictionary[key].trim()).not.toBe('');
      }
    }
  }
});

test('example manifest metadata matches generated locale metadata', async () => {
  const baseDictionaries = await generated.loadLocale(generated.baseLocale);

  for (const bucket of generated.bucketNames) {
    for (const key of generated.bucketKeys[bucket]) {
      const dictionaryMeta = baseDictionaries[bucket][`@${key}`];
      const manifestMeta = generated.getMessageMeta(bucket, key);

      if (dictionaryMeta === undefined) {
        expect(manifestMeta).toBeUndefined();
      } else {
        expect(manifestMeta).toEqual(dictionaryMeta);
      }
    }
  }
});

test('every example facade method resolves a non-empty localized message', async () => {
  for (const locale of generated.supportedLocales) {
    const facade = await generated.loadLocaleFacade(locale);

    for (const bucket of generated.bucketNames) {
      for (const key of generated.bucketKeys[bucket]) {
        const meta = generated.getMessageMeta(bucket, key);
        const params = paramsFor(meta);
        const value = facade[bucket][key](
          Object.keys(params).length ? params : undefined,
        );

        expect(value).toEqual(expect.any(String));
        expect(value.trim()).not.toBe('');
      }
    }
  }
});

test('checked-in locale files are represented by the generated manifest', () => {
  const expectedFiles = new Set(
    generated.bucketNames.flatMap((bucket) =>
      generated.bucketLocales[bucket].map(
        (locale) => `${bucket}/app_${locale}.json`,
      ),
    ),
  );

  for (const relativePath of expectedFiles) {
    const dictionary = JSON.parse(
      readFileSync(path.join(exampleLocalesDir, relativePath), 'utf8'),
    );
    expect(dictionary['@@locale']).toBe(
      path.basename(relativePath, '.json').replace('app_', ''),
    );
  }
});

test('regenerated example preserves all v0.2.2 localization values', async () => {
  const legacyLocales = await legacyGenerated.loadLocales();
  const currentLocales = await generated.loadLocales();
  let comparedValues = 0;

  expect(generated.supportedLocales).toEqual(legacyGenerated.supportedLocales);
  expect(generated.bucketNames).toEqual(legacyGenerated.bucketNames);

  for (const locale of legacyGenerated.supportedLocales) {
    for (const bucket of legacyGenerated.bucketNames) {
      for (const key of legacyGenerated.bucketKeys[bucket]) {
        expect(currentLocales[locale][bucket][key]).toBe(
          legacyLocales[locale][bucket][key],
        );
        comparedValues++;
      }
    }
  }

  expect(comparedValues).toBe(66);
});

test('generated runtime preserves the v0.2.2 public API and formatting behavior', () => {
  for (const exportName of Object.keys(legacyGenerated)) {
    expect(exportName in generated).toBe(true);
  }

  const scenarios = [
    ['Hello {name}', undefined],
    ['Hello {name}, age {age}', { name: 'Ada' }],
    ['Hello {name}', { name: 'Ada' }],
  ];
  for (const [template, params] of scenarios) {
    expect(generated.formatMessage(template, params)).toBe(
      legacyGenerated.formatMessage(template, params),
    );
  }
});

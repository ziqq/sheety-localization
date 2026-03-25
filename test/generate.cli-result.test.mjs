import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, jest, test } from '@jest/globals';
import { build as buildWithEsbuild } from 'esbuild';

import { cliPath, importGeneratorModule, repoRoot } from './runtime-target.mjs';

const credentialsPath = path.join(repoRoot, 'example', 'credentials.json');
const spreadsheetId = '1iTmPNGoo41_rk2uLThru1WxbnA-K96_OZmsCdLTcWYw';

jest.setTimeout(120000);

const runCliInProcessForCoverage =
  process.env.SHEETY_E2E_IN_PROCESS_COVERAGE === '1';

async function runCliInProcess(args, cwd = repoRoot) {
  const originalArgv = process.argv;
  const originalCwd = process.cwd();
  const originalExit = process.exit;
  let stdout = '';
  let stderr = '';

  const logSpy = jest.spyOn(console, 'log').mockImplementation((...chunks) => {
    stdout += `${chunks.map(String).join(' ')}\n`;
  });
  const errorSpy = jest
    .spyOn(console, 'error')
    .mockImplementation((...chunks) => {
      stderr += `${chunks.map(String).join(' ')}\n`;
    });

  try {
    const {
      __test__: { main },
    } = await importGeneratorModule();

    process.argv = ['node', cliPath, ...args];
    process.chdir(cwd);
    process.exit = jest.fn((code) => {
      throw new Error(`EXIT:${code}`);
    });

    await main();

    return { code: 0, stdout, stderr };
  } catch (error) {
    const message = error?.message ?? String(error);
    if (message.startsWith('EXIT:')) {
      return {
        code: Number(message.slice(5)),
        stdout,
        stderr,
      };
    }

    throw error;
  } finally {
    process.argv = originalArgv;
    process.chdir(originalCwd);
    process.exit = originalExit;
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

function runCli(args, cwd = repoRoot) {
  if (runCliInProcessForCoverage) {
    return runCliInProcess(args, cwd);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

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
      resolve({ code, stdout, stderr });
    });
  });
}

function createCliArgs(outputDir, type) {
  return [
    '--credentials',
    credentialsPath,
    '--sheet',
    spreadsheetId,
    '--output',
    outputDir,
    '--type',
    type,
    '--prefix',
    'app',
    '--author',
    'CLI Result Test <cli@example.com>',
    '--comment',
    'Generated in cli-result',
    '--context',
    'Live Google Sheets CLI result test',
  ];
}

const liveTest = existsSync(credentialsPath) ? test : test.skip;

liveTest(
  'CLI generates locale json files and js runtime index from live Google Sheets data',
  async () => {
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sheety-localization-cli-result-js-'),
    );
    const outputDir = path.join(tempRoot, 'locales');

    try {
      const result = await runCli(createCliArgs(outputDir, 'js'));

      expect(result.code).toBe(0);
      expect(result.stderr || result.stdout).toBeTruthy();
      expect(result.stdout).toMatch(
        /Successfully generated localization files/,
      );

      const appEnPath = path.join(outputDir, 'app', 'app_en.json');
      const todoRuPath = path.join(outputDir, 'todo', 'app_ru.json');
      const indexJsPath = path.join(outputDir, 'index.js');

      expect(existsSync(appEnPath)).toBe(true);
      expect(existsSync(todoRuPath)).toBe(true);
      expect(existsSync(indexJsPath)).toBe(true);

      const appEn = JSON.parse(readFileSync(appEnPath, 'utf8'));
      const todoRu = JSON.parse(readFileSync(todoRuPath, 'utf8'));

      expect(appEn['@@locale']).toBe('en');
      expect(appEn['@@author']).toBe('CLI Result Test <cli@example.com>');
      expect(appEn['@@comment']).toBe('Generated in cli-result');
      expect(appEn['@@context']).toBe('Live Google Sheets CLI result test');
      expect(typeof appEn.welcomeTitle).toBe('string');
      expect(typeof todoRu.subtitle).toBe('string');
      expect(todoRu['@subtitle']).toEqual({
        placeholders: {
          numberOfTasks: {
            type: 'String',
          },
        },
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  },
);

liveTest(
  'CLI ts generation removes stale files and writes runtime index',
  async () => {
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sheety-localization-cli-result-ts-'),
    );
    const outputDir = path.join(tempRoot, 'locales');
    const staleBucketDir = path.join(outputDir, 'legacy');
    const staleJsonPath = path.join(staleBucketDir, 'obsolete.json');
    const staleIndexJsPath = path.join(outputDir, 'index.js');

    try {
      mkdirSync(staleBucketDir, { recursive: true });
      mkdirSync(path.join(outputDir, 'app'), { recursive: true });

      await rm(staleJsonPath, { force: true });
      await rm(staleIndexJsPath, { force: true });

      writeFileSync(staleJsonPath, '{"stale":true}\n', 'utf8');
      writeFileSync(staleIndexJsPath, '// stale index\n', 'utf8');

      const result = await runCli(createCliArgs(outputDir, 'ts'));

      expect(result.code).toBe(0);
      expect(result.stderr || result.stdout).toBeTruthy();
      expect(result.stdout).toMatch(/Deleted stale locale file:/);
      expect(result.stdout).toMatch(/Deleted stale index file:/);

      const indexTsPath = path.join(outputDir, 'index.ts');
      expect(existsSync(staleJsonPath)).toBe(false);
      expect(existsSync(staleIndexJsPath)).toBe(false);
      expect(existsSync(staleBucketDir)).toBe(false);
      expect(existsSync(indexTsPath)).toBe(true);

      const indexSource = readFileSync(indexTsPath, 'utf8');

      expect(indexSource).toMatch(/export const bucketLocales:/);
      expect(indexSource).toMatch(/export async function loadLocaleFacade/);
      expect(indexSource).toMatch(/export function createLocaleFacade/);
      expect(indexSource).toMatch(/export const messageMeta:/);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  },
);

liveTest(
  'minified CLI artifact remains executable against live Google Sheets data',
  async () => {
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), 'sheety-localization-cli-result-minified-'),
    );
    const minifiedCliPath = path.join(repoRoot, 'bin', 'generate.test.min.js');
    const outputDir = path.join(tempRoot, 'locales');

    try {
      await buildWithEsbuild({
        entryPoints: [path.join(repoRoot, 'bin', 'generate.js')],
        outfile: minifiedCliPath,
        minify: true,
        format: 'esm',
        platform: 'node',
        target: 'node18',
      });

      const result = await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [minifiedCliPath, ...createCliArgs(outputDir, 'js')],
          {
            cwd: repoRoot,
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
          resolve({ code, stdout, stderr });
        });
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(
        /Successfully generated localization files/,
      );
      expect(existsSync(path.join(outputDir, 'app', 'app_en.json'))).toBe(true);
      expect(existsSync(path.join(outputDir, 'index.js'))).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
      await rm(minifiedCliPath, { force: true });
    }
  },
);

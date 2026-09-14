import path from 'node:path';

import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';

const originalArgv = process.argv;
const originalExit = process.exit;
const originalExitCode = process.exitCode;

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.argv = originalArgv;
  process.exit = originalExit;
  process.exitCode = originalExitCode;
  jest.restoreAllMocks();
});

test('generator direct entry reports rejected main execution', async () => {
  process.argv = [
    'node',
    path.join(process.cwd(), 'src', 'generate.ts'),
    '--credentials',
    path.join(process.cwd(), 'missing-direct-entry-credentials.json'),
    '--sheet',
    'sheet-id',
  ];
  let exitCalls = 0;
  process.exit = jest.fn((code) => {
    exitCalls++;
    if (exitCalls === 1) {
      throw new Error(`EXIT:${code}`);
    }
    process.exitCode = code;
  });

  await import('../src/generate.ts');
  await new Promise((resolve) => setImmediate(resolve));

  expect(process.exit).toHaveBeenCalledTimes(2);
  expect(process.exitCode).toBe(1);
  expect(console.error).toHaveBeenCalledWith('[ERROR]', expect.any(Error));
});

test('localize direct entry exposes rejected main execution', async () => {
  process.argv = [
    'node',
    path.join(process.cwd(), 'src', 'localize.ts'),
    '--credentials',
    path.join(process.cwd(), 'missing-direct-entry-credentials.json'),
    '--sheet',
    'sheet-id',
    '--token',
    'sk-test',
  ];
  process.exitCode = undefined;

  await import('../src/localize.ts');
  await new Promise((resolve) => setImmediate(resolve));

  expect(process.exitCode).toBe(1);
  expect(console.error).toHaveBeenCalledWith('[ERROR]', expect.any(Error));
});

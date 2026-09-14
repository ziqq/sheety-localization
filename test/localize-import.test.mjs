import { afterAll, expect, test } from '@jest/globals';

const originalArgv = process.argv;

afterAll(() => {
  process.argv = originalArgv;
});

test('localize source can be imported without an argv entry path', async () => {
  process.argv = ['node'];

  await expect(import('../src/localize.ts')).resolves.toHaveProperty('main');
});

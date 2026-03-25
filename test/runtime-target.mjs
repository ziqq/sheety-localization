import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const sourceCliPath = path.join(repoRoot, 'src', 'generate.ts');
const plainCliPath = path.join(repoRoot, 'bin', 'generate.js');
const minifiedCliPath = path.join(repoRoot, 'bin', 'generate.min.js');

export const cliPath = (() => {
  if (existsSync(plainCliPath)) {
    return plainCliPath;
  }

  if (existsSync(minifiedCliPath)) {
    return minifiedCliPath;
  }

  return plainCliPath;
})();

export async function importGeneratorModule() {
  if (existsSync(sourceCliPath)) {
    return import('../src/generate.ts');
  }

  return import(pathToFileURL(cliPath).href);
}

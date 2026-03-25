import fs from 'fs';
import path from 'path';

export const log = (...args: unknown[]) => console.log('[INFO]', ...args);
export const err = (...args: unknown[]) => console.error('[ERROR]', ...args);

export function sanitize(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

export function getBaseLocale(locale: string): string | null {
  const separatorIndex = locale.indexOf('_');
  if (separatorIndex <= 0) {
    return null;
  }

  return locale.slice(0, separatorIndex);
}

export function listFilesRecursive(
  dirPath: string,
  predicate: (filePath: string) => boolean,
): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(entryPath, predicate));
      continue;
    }

    if (predicate(entryPath)) {
      results.push(entryPath);
    }
  }

  return results;
}

export function removeEmptyDirectories(
  rootDir: string,
  currentDir = rootDir,
): void {
  if (!fs.existsSync(currentDir)) {
    return;
  }

  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    removeEmptyDirectories(rootDir, path.join(currentDir, entry.name));
  }

  if (currentDir === rootDir) {
    return;
  }

  if (fs.readdirSync(currentDir).length === 0) {
    fs.rmdirSync(currentDir);
    log(`Deleted empty directory: ${currentDir}`);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeMessageMeta(
  value: unknown,
): Record<string, unknown> | null {
  if (typeof value === 'string') {
    const description = value.trim();
    return description ? { description } : null;
  }

  if (isRecord(value)) {
    return value;
  }

  return null;
}

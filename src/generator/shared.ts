import fs from 'fs';
import path from 'path';

export const log = (...args: unknown[]) => console.log('[INFO]', ...args);
export const err = (...args: unknown[]) => console.error('[ERROR]', ...args);

/** Convert a sheet or message label into a stable JavaScript-safe identifier. */
export function sanitize(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Canonicalize a BCP 47 locale while keeping underscores in generated file and
 * runtime identifiers. Invalid values are preserved in normalized form so the
 * caller can report the original validation failure.
 */
export function normalizeLocaleCode(input: string): string {
  const candidate = input.trim().replace(/_/g, '-');
  try {
    return Intl.getCanonicalLocales(candidate)[0].replace(/-/g, '_');
  } catch {
    return candidate.replace(/-/g, '_');
  }
}

/** Return whether a sheet header is a structurally valid BCP 47 locale. */
export function isLocaleCode(input: string): boolean {
  const normalized = normalizeLocaleCode(input);
  if (!/^[A-Za-z]{2,3}(?:_[A-Za-z0-9]{2,8})*$/.test(normalized)) {
    return false;
  }

  try {
    Intl.getCanonicalLocales(normalized.replace(/_/g, '-'));
    return true;
  } catch {
    return false;
  }
}

/** Sort generated identifiers deterministically across host locales. */
export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

/** Return the parent language used for regional fallback, if one exists. */
export function getBaseLocale(locale: string): string | null {
  const separatorIndex = locale.indexOf('_');
  if (separatorIndex <= 0) {
    return null;
  }

  return locale.slice(0, separatorIndex);
}

/** Recursively collect files accepted by the supplied predicate. */
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

/**
 * Remove empty descendants after stale generated files are deleted, while
 * always preserving the requested output root itself.
 */
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

/** Narrow an unknown JSON value to a plain key-value object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize legacy string descriptions and structured `@key` metadata to the
 * single object shape used by manifests and generated TypeScript types.
 */
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

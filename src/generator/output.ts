import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  buildGeneratedManifest,
  createJsIndexSource,
  createTsIndexSource,
} from './manifest.js';
import { listFilesRecursive, log, removeEmptyDirectories } from './shared.js';
import type { GeneratedManifest, LocalizationBuckets } from './types.js';

interface WriteJsonFilesOptions {
  includeLastModified?: boolean;
  modifiedAt?: string;
}

const generatedRuntimeFileName = 'sheety-message-format.js';
const generatedRuntimeDeclarationFileName = 'sheety-message-format.d.ts';
const generatedRuntimeDeclaration = `declare class IntlMessageFormat {
  constructor(message: string, locales?: string | string[]);
  format(values?: Record<string, unknown>): unknown;
}

export default IntlMessageFormat;
`;

function resolveBundledRuntimePath(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, '../runtime/intl-messageformat.min.js'),
    path.resolve(currentDir, '../../bin/runtime/intl-messageformat.min.js'),
  ];
  const runtimePath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!runtimePath) {
    throw new Error(
      `Bundled message formatter is missing. Checked: ${candidates.join(', ')}`,
    );
  }

  return runtimePath;
}

/**
 * Copy the prebuilt ICU formatter beside generated indexes. This keeps output
 * self-contained and prevents consumers from needing a matching npm dependency.
 */
async function writeGeneratedRuntime(outputDir: string): Promise<void> {
  const runtimePath = path.join(outputDir, generatedRuntimeFileName);
  const declarationPath = path.join(
    outputDir,
    generatedRuntimeDeclarationFileName,
  );

  await fs.promises.copyFile(resolveBundledRuntimePath(), runtimePath);
  await fs.promises.writeFile(
    declarationPath,
    generatedRuntimeDeclaration,
    'utf8',
  );
  log(`Written generated message formatter at ${runtimePath}`);
}

function cleanupStaleLocaleFiles(
  outputDir: string,
  expectedFiles: Set<string>,
): number {
  const staleFiles = listFilesRecursive(outputDir, (filePath) =>
    filePath.endsWith('.json'),
  ).filter((filePath) => !expectedFiles.has(filePath));

  for (const filePath of staleFiles) {
    fs.unlinkSync(filePath);
    log(`Deleted stale locale file: ${filePath}`);
  }

  removeEmptyDirectories(outputDir);
  return staleFiles.length;
}

/** Remove the inactive index variant after switching between JS and TS output. */
export function cleanupStaleIndexFiles(
  outputDir: string,
  activeType: 'js' | 'ts',
): void {
  const staleIndexPath = path.join(
    outputDir,
    activeType === 'ts' ? 'index.js' : 'index.ts',
  );
  if (!fs.existsSync(staleIndexPath)) {
    return;
  }

  fs.unlinkSync(staleIndexPath);
  log(`Deleted stale index file: ${staleIndexPath}`);
}

/**
 * Write all locale JSON dictionaries and remove stale generated JSON files.
 * Content equality is checked without `@@last_modified`, allowing deterministic
 * no-op runs while still honoring an explicitly requested timestamp change.
 */
export async function writeJsonFiles(
  buckets: LocalizationBuckets,
  outputDir: string,
  prefix: string,
  globalMeta: Record<string, unknown>,
  author?: string,
  commentText?: string,
  contextText?: string,
  manifest = buildGeneratedManifest(buckets, outputDir, prefix),
  options: WriteJsonFilesOptions = {},
): Promise<GeneratedManifest> {
  if (!fs.existsSync(outputDir)) {
    log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const includeLastModified = options.includeLastModified ?? true;
  const modifiedAt = options.modifiedAt ?? new Date().toISOString();

  const bucketWriteStats = new Map<
    string,
    { written: number; skippedUpToDate: number; locales: string[] }
  >();
  let writtenFiles = 0;
  let skippedUpToDate = 0;

  for (const bucket of manifest.bucketNames) {
    bucketWriteStats.set(bucket, {
      written: 0,
      skippedUpToDate: 0,
      locales: manifest.bucketLocales[bucket],
    });
  }

  for (const [bucket, locales] of Object.entries(buckets)) {
    const bucketDir = path.join(outputDir, bucket);
    if (!fs.existsSync(bucketDir)) {
      log(`Creating directory: ${bucketDir}`);
      fs.mkdirSync(bucketDir, { recursive: true });
    }

    for (const [locale, messages] of Object.entries(locales)) {
      const fileName = `${prefix ? `${prefix}_` : ''}${locale}.json`;
      const filePath = path.join(bucketDir, fileName);

      const body = {
        '@@locale': locale,
        '@@author': author ?? '',
        '@@comment': commentText ?? '',
        '@@context': contextText ?? '',
        ...globalMeta,
        ...messages,
      };

      const newBody = JSON.stringify(body, null, 2);

      if (fs.existsSync(filePath)) {
        try {
          const oldText = fs.readFileSync(filePath, 'utf8');
          const oldObject = JSON.parse(oldText) as Record<string, unknown>;
          const oldHadLastModified = Object.prototype.hasOwnProperty.call(
            oldObject,
            '@@last_modified',
          );
          const oldLastModified =
            typeof oldObject['@@last_modified'] === 'string'
              ? oldObject['@@last_modified']
              : undefined;
          delete (oldObject as any)['@@last_modified'];
          const oldBody = JSON.stringify(oldObject, null, 2);
          const timestampMismatch = includeLastModified
            ? !oldHadLastModified ||
              (options.modifiedAt !== undefined && oldLastModified !== modifiedAt)
            : oldHadLastModified;

          if (oldBody === newBody && !timestampMismatch) {
            log(`JSON file is up to date, skipping rewrite: ${filePath}`);
            skippedUpToDate++;
            const bucketStats = bucketWriteStats.get(bucket);
            if (bucketStats) {
              bucketStats.skippedUpToDate += 1;
            }
            continue;
          }
        } catch {
          // fall through to rewrite
        }
      }

      const bodyWithTimestamp = {
        '@@locale': locale,
        '@@author': author ?? '',
        ...(includeLastModified ? { '@@last_modified': modifiedAt } : {}),
        '@@comment': commentText ?? '',
        '@@context': contextText ?? '',
        ...globalMeta,
        ...messages,
      };
      const finalText = JSON.stringify(bodyWithTimestamp, null, 2) + '\n';
      fs.writeFileSync(filePath, finalText, 'utf8');
      log(`Written ${filePath}`);
      writtenFiles++;
      const bucketStats = bucketWriteStats.get(bucket);
      if (bucketStats) {
        bucketStats.written += 1;
      }
    }
  }

  const deletedFiles = cleanupStaleLocaleFiles(
    outputDir,
    new Set(manifest.files.map((file) => file.filePath)),
  );

  log(
    `JSON write summary: written=${writtenFiles}, skippedUpToDate=${skippedUpToDate}, deletedStale=${deletedFiles}`,
  );

  for (const [bucket, stats] of bucketWriteStats.entries()) {
    log(
      `Bucket output "${bucket}": locales=[${stats.locales.join(', ')}], written=${stats.written}, skippedUpToDate=${stats.skippedUpToDate}`,
    );
  }

  return manifest;
}

/** Write the TypeScript runtime index and its colocated ICU formatter. */
export async function generateIndexTs(
  outputDir: string,
  manifest: GeneratedManifest,
): Promise<void> {
  await writeGeneratedRuntime(outputDir);
  const indexPath = path.join(outputDir, 'index.ts');
  await fs.promises.writeFile(indexPath, createTsIndexSource(manifest), 'utf8');
  log(`Written TypeScript locale index at ${indexPath}`);
}

/** Write the JavaScript runtime index and its colocated ICU formatter. */
export async function generateIndexJs(
  outputDir: string,
  manifest: GeneratedManifest,
): Promise<void> {
  await writeGeneratedRuntime(outputDir);
  const indexPath = path.join(outputDir, 'index.js');
  fs.writeFileSync(indexPath, createJsIndexSource(manifest), 'utf8');
  log(`Written JavaScript locale index at ${indexPath}`);
}

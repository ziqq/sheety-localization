import fs from 'fs';
import path from 'path';

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

export async function generateIndexTs(
  outputDir: string,
  manifest: GeneratedManifest,
): Promise<void> {
  const indexPath = path.join(outputDir, 'index.ts');
  await fs.promises.writeFile(indexPath, createTsIndexSource(manifest), 'utf8');
  log(`Written TypeScript locale index at ${indexPath}`);
}

export async function generateIndexJs(
  outputDir: string,
  manifest: GeneratedManifest,
): Promise<void> {
  const indexPath = path.join(outputDir, 'index.js');
  fs.writeFileSync(indexPath, createJsIndexSource(manifest), 'utf8');
  log(`Written JavaScript locale index at ${indexPath}`);
}

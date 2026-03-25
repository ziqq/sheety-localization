import fs from 'fs';
import path from 'path';
import { buildGeneratedManifest, createJsIndexSource, createTsIndexSource, } from './manifest.js';
import { listFilesRecursive, log, removeEmptyDirectories } from './shared.js';
function cleanupStaleLocaleFiles(outputDir, expectedFiles) {
    const staleFiles = listFilesRecursive(outputDir, (filePath) => filePath.endsWith('.json')).filter((filePath) => !expectedFiles.has(filePath));
    for (const filePath of staleFiles) {
        fs.unlinkSync(filePath);
        log(`Deleted stale locale file: ${filePath}`);
    }
    removeEmptyDirectories(outputDir);
    return staleFiles.length;
}
export function cleanupStaleIndexFiles(outputDir, activeType) {
    const staleIndexPath = path.join(outputDir, activeType === 'ts' ? 'index.js' : 'index.ts');
    if (!fs.existsSync(staleIndexPath)) {
        return;
    }
    fs.unlinkSync(staleIndexPath);
    log(`Deleted stale index file: ${staleIndexPath}`);
}
export async function writeJsonFiles(buckets, outputDir, prefix, globalMeta, author, commentText, contextText, manifest = buildGeneratedManifest(buckets, outputDir, prefix), options = {}) {
    var _a, _b;
    if (!fs.existsSync(outputDir)) {
        log(`Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const includeLastModified = (_a = options.includeLastModified) !== null && _a !== void 0 ? _a : true;
    const modifiedAt = (_b = options.modifiedAt) !== null && _b !== void 0 ? _b : new Date().toISOString();
    const bucketWriteStats = new Map();
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
            const body = Object.assign(Object.assign({ '@@locale': locale, '@@author': author !== null && author !== void 0 ? author : '', '@@comment': commentText !== null && commentText !== void 0 ? commentText : '', '@@context': contextText !== null && contextText !== void 0 ? contextText : '' }, globalMeta), messages);
            const newBody = JSON.stringify(body, null, 2);
            if (fs.existsSync(filePath)) {
                try {
                    const oldText = fs.readFileSync(filePath, 'utf8');
                    const oldObject = JSON.parse(oldText);
                    const oldHadLastModified = Object.prototype.hasOwnProperty.call(oldObject, '@@last_modified');
                    const oldLastModified = typeof oldObject['@@last_modified'] === 'string'
                        ? oldObject['@@last_modified']
                        : undefined;
                    delete oldObject['@@last_modified'];
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
                }
                catch (_c) {
                    // fall through to rewrite
                }
            }
            const bodyWithTimestamp = Object.assign(Object.assign(Object.assign(Object.assign({ '@@locale': locale, '@@author': author !== null && author !== void 0 ? author : '' }, (includeLastModified ? { '@@last_modified': modifiedAt } : {})), { '@@comment': commentText !== null && commentText !== void 0 ? commentText : '', '@@context': contextText !== null && contextText !== void 0 ? contextText : '' }), globalMeta), messages);
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
    const deletedFiles = cleanupStaleLocaleFiles(outputDir, new Set(manifest.files.map((file) => file.filePath)));
    log(`JSON write summary: written=${writtenFiles}, skippedUpToDate=${skippedUpToDate}, deletedStale=${deletedFiles}`);
    for (const [bucket, stats] of bucketWriteStats.entries()) {
        log(`Bucket output "${bucket}": locales=[${stats.locales.join(', ')}], written=${stats.written}, skippedUpToDate=${stats.skippedUpToDate}`);
    }
    return manifest;
}
export async function generateIndexTs(outputDir, manifest) {
    const indexPath = path.join(outputDir, 'index.ts');
    await fs.promises.writeFile(indexPath, createTsIndexSource(manifest), 'utf8');
    log(`Written TypeScript locale index at ${indexPath}`);
}
export async function generateIndexJs(outputDir, manifest) {
    const indexPath = path.join(outputDir, 'index.js');
    fs.writeFileSync(indexPath, createJsIndexSource(manifest), 'utf8');
    log(`Written JavaScript locale index at ${indexPath}`);
}
//# sourceMappingURL=output.js.map
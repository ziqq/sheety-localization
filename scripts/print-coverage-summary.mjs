import fs from 'node:fs';
import path from 'node:path';

function formatPercent(value) {
  return Number(value).toFixed(2);
}

function normalizeFileKey(filePath) {
  if (filePath === 'total') {
    return 'All files';
  }

  if (path.isAbsolute(filePath)) {
    return path.relative(process.cwd(), filePath) || path.basename(filePath);
  }

  return filePath;
}

function pad(value, width) {
  return String(value).padEnd(width, ' ');
}

const [summaryPathArg, reportNameArg] = process.argv.slice(2);

if (!summaryPathArg) {
  console.error(
    'Usage: node scripts/print-coverage-summary.mjs <coverage-summary.json> [name]',
  );
  process.exit(1);
}

const summaryPath = path.resolve(process.cwd(), summaryPathArg);
const reportName = reportNameArg ?? path.basename(path.dirname(summaryPath));

if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found: ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const rows = Object.entries(summary)
  .map(([filePath, stats]) => ({
    filePath: normalizeFileKey(filePath),
    statements: formatPercent(stats.statements.pct),
    branches: formatPercent(stats.branches.pct),
    functions: formatPercent(stats.functions.pct),
    lines: formatPercent(stats.lines.pct),
  }))
  .sort((left, right) => {
    if (left.filePath === 'All files') {
      return -1;
    }
    if (right.filePath === 'All files') {
      return 1;
    }
    return left.filePath.localeCompare(right.filePath, 'en');
  });

const fileWidth = Math.max(
  'File'.length,
  ...rows.map((row) => row.filePath.length),
);

const divider = [
  '-'.repeat(fileWidth),
  '-'.repeat(8),
  '-'.repeat(8),
  '-'.repeat(8),
  '-'.repeat(8),
].join('-+-');

console.log(`Coverage report: ${reportName}`);
console.log(divider);
console.log(
  [
    pad('File', fileWidth),
    pad('% Stmts', 8),
    pad('% Branch', 8),
    pad('% Funcs', 8),
    pad('% Lines', 8),
  ].join(' | '),
);
console.log(divider);

for (const row of rows) {
  console.log(
    [
      pad(row.filePath, fileWidth),
      pad(row.statements, 8),
      pad(row.branches, 8),
      pad(row.functions, 8),
      pad(row.lines, 8),
    ].join(' | '),
  );
}

console.log(divider);

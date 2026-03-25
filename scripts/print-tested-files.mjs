import fs from 'node:fs';
import path from 'node:path';

const reportConfig = {
  merged: {
    executed: ['src/generate.ts', 'bin/generate.js', 'bin/generate.min.js'],
    generated: [
      '<tmp>/index.js [exists, imported, runtime helpers asserted]',
      '<tmp>/index.ts [exists, source content asserted]',
      '<tmp>/app/app_en.json [exists, parsed, metadata/content asserted]',
      '<tmp>/todo/app_en.json [exists/listed in output set]',
      '<tmp>/todo/app_ru.json [exists, parsed, placeholder metadata asserted]',
    ],
    notes: [
      'Tests write generated outputs into temporary directories, not into example/src/locales/**.',
      'bin/generate.min.js is smoke-tested through a dedicated minified CLI run.',
    ],
  },
  source: {
    executed: ['src/generate.ts'],
    generated: [
      '<tmp>/index.js [exists asserted in js generation path]',
      '<tmp>/index.ts [exists asserted in ts generation path]',
      '<tmp>/app/app_en.json [parsed, metadata/content asserted]',
      '<tmp>/todo/app_en.json [exists/listed in output set]',
      '<tmp>/legacy/obsolete.json [absence asserted after cleanup]',
    ],
    notes: [
      'This suite calls the source entrypoint directly with mocked Google Sheets APIs.',
    ],
  },
  'generated-runtime': {
    executed: [],
    generated: [
      '<tmp>/index.js [written, read, imported in subprocess, runtime API asserted]',
      '<tmp>/index.ts [written, read, source content asserted]',
      '<tmp>/app/app_en.json [generated as runtime import target fixture]',
      '<tmp>/todo/app_en.json [generated as runtime import target fixture]',
    ],
    notes: [
      'This suite validates generated runtime module source and generated output files, not the compiled bin entrypoint.',
    ],
  },
  'cli-result': {
    executed: ['src/generate.ts', 'bin/generate.js', 'bin/generate.min.js'],
    generated: [
      '<tmp>/index.js [exists asserted after live js CLI run]',
      '<tmp>/index.ts [exists asserted after live ts CLI run]',
      '<tmp>/app/app_en.json [parsed, metadata/content asserted]',
      '<tmp>/todo/app_ru.json [parsed, placeholder metadata asserted]',
      '<tmp>/legacy/obsolete.json [absence asserted after cleanup]',
    ],
    notes: [
      'Coverage is collected in-process from src/generate.ts, while the non-coverage CLI path spawns bin/generate.js.',
      'The suite also minifies bin/generate.js into a temporary bin/generate.min.js-compatible artifact and executes it.',
      'example/src/locales/** is not touched by automated tests; tmp output directories are used to avoid mutating the repository.',
    ],
  },
};

function normalizeCoveredFile(filePath) {
  if (filePath === 'total') {
    return null;
  }

  if (path.isAbsolute(filePath)) {
    return path.relative(process.cwd(), filePath) || path.basename(filePath);
  }

  return filePath;
}

function printSection(title, values) {
  if (!values.length) {
    return;
  }

  console.log(title);
  for (const value of values) {
    console.log(`- ${value}`);
  }
}

const [summaryPathArg, reportNameArg] = process.argv.slice(2);

if (!summaryPathArg || !reportNameArg) {
  console.error(
    'Usage: node scripts/print-tested-files.mjs <coverage-summary.json> <report-name>',
  );
  process.exit(1);
}

const summaryPath = path.resolve(process.cwd(), summaryPathArg);
if (!fs.existsSync(summaryPath)) {
  console.error(`Coverage summary not found: ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const coveredFiles = Object.keys(summary)
  .map(normalizeCoveredFile)
  .filter(Boolean)
  .sort((left, right) => left.localeCompare(right, 'en'));
const config = reportConfig[reportNameArg] ?? {
  executed: [],
  generated: [],
  notes: [],
};

console.log(`Tested files report: ${reportNameArg}`);
printSection('Covered source files', coveredFiles);
printSection('Executed source/build files', config.executed);
printSection('Asserted generated tmp output files', config.generated);
printSection('Notes', config.notes);

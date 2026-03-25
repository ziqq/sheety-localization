# Sheety Localization

[![NPM](https://img.shields.io/npm/v/sheety-localization.svg)](https://www.npmjs.com/package/sheety-localization)
[![codecov](https://codecov.io/gh/ziqq/sheety-localization/graph/badge.svg?token=RYIQF8DZNM)](https://codecov.io/gh/ziqq/sheety-localization)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Sheety Localization** - CLI utility for generating JSON localization files and barrel files (`index.js`/`index.ts`) from Google Sheets. Uses Google Sheets API and service account to get data.


## Features

- Get data from Google Sheets via service account.
- Generate JSON files for each locale (e.g. `app_en.json`, `app_ru.json`).
- Create barrel file (`index.js` or `index.ts`) for easy import of locales.
- Generate locale manifest helpers: `supportedLocales`, `baseLocale`, `bucketNames`, `isLocale`, `loadLocale`, `loadBucket`.
- Insert metadata: `@@locale`, `@@author`, `@@last_modified`, `@@comment`, `@@context`.
- Flexible configuration of directory structure and prefixes via CLI options.
- Support for global fields (`--meta`).
- Explicit control over missing locale cells: omit them by default or emit empty-string translations with `--include-empty`.
- Controllable `@@last_modified` metadata via `--last-modified`, `--no-last-modified`, and `--modified`.
- Lazy loading of translations via `import()`.
- Automatic fallback from regional locales to base locales (for example `pt_BR -> pt`).
- Remove stale generated JSON files when locales or sheets are deleted.


## TL;DR

1. Create a Google Sheet with columns: `label | description | meta | en | ru | ...`.
2. Get a Google Cloud service account, enable Sheets API, share the spreadsheet.
3. Install dependencies:

```bash
npm install -g sheety-localization
```

4. Run the generator:

```bash
sheety-localization \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --no-last-modified \
  --ignore='help,temp-.*' \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

5. Import the barrel file (`src/locales/index.ts`) into the project.

6. Optionally automate translation formulas, conditional formatting, VS Code tasks, and CI pipelines.


## Requirements

- Node.js >= 18
- Google Service Account with access to Google Sheets API
- Google Sheet with first line:
  `label | description | meta | en | ru | ... (other locales)`


## Installation

```bash
npm install -g sheety-localization
```

> **Tip:** Do not publish `credentials.json` in public repositories.


## Usage

### Basic command

```bash
sheety-localization \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --no-last-modified \
  --ignore='help,temp-.*' \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

### Option definitions

- `--credentials`: Path to service account JSON (required)
- `--sheet`: Google Spreadsheet ID (required)
- `--output`: Root folder for locales (`src/locales` by default)
- `--prefix`: Prefix for files (`app` → `app_en.json`, `app_ru.json`, ...)
- `--meta`: JSON string with global fields merged into every JSON file
- `--meta-file`: Path to JSON file with global meta (has priority over `--meta`)
- `--type`: Type of barrel file (`js` or `ts`, defaults to `ts`)
- `--author`: Author for metadata (stored under `@@author`)
- `--comment`: Comment for metadata (stored under `@@comment`)
- `--context`: Context/version for metadata (stored under `@@context`)
- `--modified`: Explicit ISO timestamp for `@@last_modified` when enabled
- `--last-modified` / `--no-last-modified`: Enable or disable `@@last_modified` metadata (enabled by default)
- `--include-empty`: Emit empty-string translations and `@key` metadata for missing locale cells instead of omitting them
- `--ignore`: Comma-separated list of RegExp patterns to ignore sheets by title (e.g. `help,temp-.*`)
- `--help`: Show detailed help with all options


## Integration

### 1. Prepare Google Sheet

- First line: `label | description | meta | en | ru | ...`
- Each line is one localization row:
  - `label` — key for the localization string.
  - `description` — optional description for context (not used in output files).
  - `meta` — optional JSON string with metadata for this label (merged into output).
  - `en`, `ru`, ... — columns for each locale with translation strings.
- Missing locale cells are omitted from generated output by default: no translation key and no `@key` metadata entry are emitted for that locale.
- Use `--include-empty` if you want missing locale cells to become empty-string translations with matching `@key` metadata entries.

### 2. Create a service account and share the spreadsheet

- In Google Cloud Console, create a project, enable Sheets API.
- Create a service account, download `credentials.json`.
- Share the spreadsheet with the service account email.

### 3. Run the generator

- In the terminal:

```bash
sheety-localization \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --no-last-modified \
  --ignore='help,temp-.*' \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

- Will generate:
- `src/locales/app/app_en.json`, `src/locales/app/app_ru.json`, ...
- `src/locales/index.ts` (or `index.js`)


### 4. Add the generated locales to your app

If you are upgrading from an older `sheety-localization` release, see `MIGRATION.md` for the new runtime API and the compatibility path that keeps `loadLocales()` working.

```javascript
import { baseLocale, bucketNames, loadLocales, supportedLocales } from './locales/index.js';

const locales = await loadLocales();

console.log(baseLocale); // e.g. 'en'
console.log(supportedLocales); // e.g. ['en', 'ru']
console.log(bucketNames); // e.g. ['app', 'errors']
```

Generated index helpers:
- `supportedLocales`: all locales found across generated buckets.
- `baseLocale`: `en` when present, otherwise the first generated locale.
- `bucketNames`: generated namespace list based on sheet names.
- `bucketLocales`: locales available per generated bucket.
- `bucketKeys`: generated translation keys per bucket.
- `messageMeta`: generated metadata map derived from `@key` entries.
- `locales`: raw lazy loader table used by generated helpers.
- `normalizeLocale(locale)`: normalize locale separators before resolution.
- `isLocale(locale)`: check whether a normalized locale is present in generated output.
- `isBucket(bucket)`: check whether a bucket exists.
- `isMessageKey(bucket, key)`: check whether a key belongs to a generated bucket.
- `getMessageMeta(bucket, key)`: read metadata for one generated message.
- `getLocaleChain(locale)`: inspect the fallback chain used by resolution helpers.
- `resolveLocale(locale)`: normalize and resolve locale with regional fallback.
- `resolveBucketLocale(bucket, locale)`: resolve locale against a specific bucket.
- `loadBucket(bucket, locale)`: load a single generated namespace.
- `loadLocale(locale)`: load all buckets for one locale with fallback.
- `formatMessage(template, params)`: format an already loaded template string.
- `createLoadedBucketFacade(bucket, dictionary)`: create a synchronous bucket runtime helper from a preloaded dictionary.
- `createLoadedLocaleFacade(dictionaries)`: create a synchronous runtime object for a preloaded locale.
- `loadLocaleFacade(locale)`: preload all buckets for a locale and return a synchronous runtime object.
- `translateLoaded(bucket, key, dictionary, params)`: format a message from an already loaded dictionary.
- `translate(bucket, key, locale, params)`: load and format one message using generated placeholder types in TypeScript.
- `createBucketTranslator(bucket, locale)`: create a bucket-scoped translation helper.
- `createBucketFacade(bucket, locale)`: create a Dart-like namespace helper with one async method per message key.
- `createLocaleFacade(locale)`: create async runtime helpers for all generated buckets at once.

Example with a preloaded runtime object:

```ts
import { loadLocaleFacade } from './locales/index.js';

const l10n = await loadLocaleFacade('ru');

l10n.app.title();
l10n.todo.subtitle({ numberOfTasks: '5' });
```

Example with lazy async runtime helpers:

```ts
import { createLocaleFacade } from './locales/index.js';

const l10n = createLocaleFacade('ru');

await l10n.app.title();
await l10n.todo.subtitle({ numberOfTasks: '5' });
```


## Tips & Best Practices

- Store localization JSON files in git for auditing.
- Don't publish `credentials.json` — use CI secrets.
- Use `--author`, `--comment`, `--context` options for metadata.
- To add new locales, update the table and regenerate the files.


## VS Code task example

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "sheety-localization:generate",
      "detail": "Localization from Google Sheets",
      "type": "shell",
      "command": "sheety-localization",
      "args": [
        "--credentials=./credentials.json",
        "--sheet=<SPREADSHEET_ID>",
        "--output=src/locales",
        "--prefix=app",
        "--type=ts",
        "--ignore=help,temp-.*",
        "--author=Your Name <email>",
        "--comment=Generated from Google Sheets"
      ],
      "options": {
        "cwd": "${workspaceFolder}"
      }
    }
  ]
}
```
Run: Open Command Palette -> Tasks: Run Task -> sheety-localization:generate.

If you prefer the generated runtime over an i18next resource tree, the migration steps and API tradeoffs are described in `MIGRATION.md`.


## Example: Automatic Google Translate Formula

If you want to auto-fill missing translations from English to Russian:

```plaintext
=IF(ISBLANK(D2), "", GOOGLETRANSLATE(D2, "en", "ru"))
```

If you want to auto-fill missing translations from Russian to English and you have Russian localization of Google Sheets:

```plaintext
=ЕСЛИ(ЕПУСТО(D2); ""; GOOGLETRANSLATE(D2; "ru"; "en"))
```

- Place this formula in cell E2 (under the `en` column if `D` is `ru`).
- Drag/fill down to apply to all rows.
- Cells with empty `ru` values will remain blank; otherwise, Russian text will be machine-translated to English.


## Example: Conditional Formatting Rules

1.  Gray out machine translations

    - Select entire column (e.g., column E2:G for E-G colum's).
    - Add a custom formula rule: `=И(ISFORMULA(E2); ДЛСТР(E2)>0)`.
    - Set fill color to light gray.

2.  Highlight empty cells (missing translations)

    - Select entire column (e.g., E2:G for E-G colum's).
    - Add a custom formula rule: `=И(ДЛСТР(СЖПРОБЕЛЫ($A2))>0; ДЛСТР(СЖПРОБЕЛЫ(E2))=0)`.
    - Set fill color to red (or any noticeable color).

## Test and coverage scripts

- `npm test`: build compiled JS artifacts and run all Jest suites.
- `npm run test:source`: run mocked source-entry tests for spreadsheet parsing and source orchestration.
- `npm run test:generated-runtime`: validate generated runtime source and tmp generated artifacts.
- `npm run test:cli-result`: run live CLI result tests, including the minified CLI smoke test.
- `npm run test:coverage`: generate the merged coverage report plus explicit tested-files summaries.
- `npm run test:coverage:source`: generate the source-only coverage report.
- `npm run test:coverage:generated-runtime`: generate the generated-runtime coverage report.
- `npm run test:coverage:cli-result`: generate the live CLI coverage report.
- `npm run coverage`: run all four coverage commands above.

Notes:
- `test:cli-result` and `test:coverage:cli-result` expect a working `example/credentials.json`, Google Sheets access, and network connectivity.
- Per-suite coverage artifacts and Codecov flags are emitted as `merged`, `source`, `generated-runtime`, and `cli-result`.

<img src="https://codecov.io/gh/ziqq/flutter_simple_country_picker/graphs/sunburst.svg?token=RYIQF8DZNM" width="375" />

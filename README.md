# Sheety Localization

[![NPM](https://img.shields.io/npm/v/sheety-localization.svg)](https://www.npmjs.com/package/sheety-localization)
[![codecov](https://codecov.io/gh/ziqq/sheety-localization/graph/badge.svg?token=RYIQF8DZNM)](https://codecov.io/gh/ziqq/sheety-localization)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Sheety Localization** is a JavaScript/TypeScript CLI utility that reads localization tables from Google Sheets and generates per-bucket locale JSON files plus a generated runtime entrypoint (`index.js` or `index.ts`). It does not generate Flutter or Dart output.


## Features

- Get data from Google Sheets via service account.
- Generate JSON files for each locale inside each generated bucket (e.g. `app/app_en.json`, `app/app_ru.json`).
- Create a generated runtime entrypoint (`index.js` or `index.ts`) for easy imports.
- Generate locale manifest helpers, fallback resolution helpers, bucket loaders, and translation facades.
- Insert metadata: `@@locale`, `@@author`, `@@last_modified`, `@@comment`, `@@context`.
- Flexible configuration of directory structure and prefixes via CLI options.
- Support for global fields via `--meta` or `--meta-file`.
- Explicit control over missing locale cells: omit them by default or emit empty-string translations with `--include-empty`.
- Controllable `@@last_modified` metadata via `--last-modified`, `--no-last-modified`, and `--modified`.
- Lazy loading of translations via `import()`.
- Automatic fallback from regional locales to base locales (for example `pt_BR -> pt`).
- Per-key fallback from source locale through language and regional dictionaries.
- ICU MessageFormat plural, select, number, and date formatting.
- Optional OpenAI-assisted filling of empty translation cells with validation and dry-run mode.
- Remove stale generated JSON files when locales or sheets are deleted.


## TL;DR

1. Create a Google spreadsheet where each sheet/tab becomes one generated bucket, with columns: `label | description | meta | <source locale> | <target locale> | ...`.
2. Get a Google Cloud service account, enable Sheets API, share the spreadsheet.
3. Install the CLI globally:

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

5. Import the generated runtime entrypoint (`src/locales/index.ts` or `index.js`) into the project. The ICU formatter is generated beside it, so the consuming project does not need an additional runtime dependency.

6. Optionally automate translation formulas, conditional formatting, VS Code tasks, and CI pipelines.


## Requirements

- Node.js >= 20.19
- Google Service Account with access to Google Sheets API
- Google Sheet where each sheet/tab becomes one generated bucket/namespace
- Header row in each sheet/tab:
  `label | description | meta | <source locale> | <target locale> | ...`

### Locale code normalization

Locale headers must be valid BCP 47 language tags. The generator treats `_` as
`-`, canonicalizes language/script/region casing with `Intl.getCanonicalLocales`,
and uses `_` in generated locale identifiers and file names:

| Sheet header | Generated locale | Example file |
|---|---|---|
| `en` | `en` | `app_en.json` |
| `EN-us` | `en_US` | `app_en_US.json` |
| `pt-br` or `pt_BR` | `pt_BR` | `app_pt_BR.json` |
| `zh-hant-tw` | `zh_Hant_TW` | `app_zh_Hant_TW.json` |

Use the generated canonical value with runtime helpers such as `isLocale()` and
when referring to generated files directly. Headers that normalize to the same
locale, such as `pt-br` and `pt_BR`, collide and cause that sheet to be skipped.

### Generated runtime compatibility

Generated ESM indexes load locale JSON with an import attribute:

```js
import('./app/app_en.json', { with: { type: 'json' } });
```

The attribute tells an ESM runtime that the imported module is JSON. Direct
execution of the generated `index.js` therefore requires Node.js >= 20.19.
Modern bundlers such as Vite and esbuild process these imports during the build;
older Node.js versions or bundlers that cannot parse import attributes are not
supported.


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
- `--sheet`: Google Spreadsheet ID (required, the value between `/d/` and `/edit` in the spreadsheet URL)
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

### Fill missing translations with OpenAI

`sheety-localize` only considers empty target-locale cells. The fourth column is always the source locale, so it may be `en`, `ru`, or another valid BCP-47 locale. A dry run is the default and still calls the OpenAI API, but never writes to Google Sheets:

```bash
OPENAI_API_KEY=<token> sheety-localize \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID>
```

Review the proposed A1 cell updates, then opt into writing them:

```bash
OPENAI_API_KEY=<token> sheety-localize \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --write
```

Useful options are `--model` (default `gpt-5-mini`), `--batch`, `--workers`, `--timeout`, `--prompt`, `--ignore`, `--token`, and `--token-file`. Write mode requires the service account to have Editor access. Responses are rejected when they lose ICU placeholders/directives or markup, contain invalid output, or look like runaway text; a failed multi-language response is retried one language at a time.

#### OpenAI data handling

Dry-run mode protects the spreadsheet from writes, but it is not an offline preview. For every selected empty target cell, `sheety-localize` sends the row label, source locale and text, optional description and metadata, and requested target locale codes to the configured OpenAI model. Existing translations and Google service-account credentials are not included in the prompt.

Use `OPENAI_API_KEY` or `--token-file` instead of putting a token directly in shell history. Only run the command for spreadsheets whose localization content may be sent to the selected model, review dry-run output before `--write`, and keep both Google and OpenAI credentials out of version control.


## Integration

### 1. Prepare Google Sheet

- Each sheet/tab in the spreadsheet becomes one generated bucket or namespace.
- The first row in each sheet/tab must be:
  `label | description | meta | <source locale> | <target locale> | ...`
- Each next row describes one localized message:
  - `label` — translation key.
  - `description` — optional human-readable note for translators.
  - `meta` — optional JSON metadata for the message, for example placeholder definitions.
  - Column D — the authoritative source locale and source message.
  - Remaining locale columns — translations of the source message.
- The three structural headers are validated strictly. Invalid locale headers, duplicate normalized locales, duplicate sanitized labels, and colliding sanitized sheet names are skipped and reported.
- `description` is preserved in generated `@key` metadata and merged with the optional JSON object from `meta`.
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

This generates, for example:

```text
src/locales/
  index.ts
  sheety-message-format.js
  sheety-message-format.d.ts
  app/
    app_en.json
    app_ru.json
  errors/
    app_en.json
    app_ru.json
```

If you generate JavaScript output instead, the entrypoint will be `src/locales/index.js`.


### 4. Add the generated locales to your app

If you are upgrading from an older `sheety-localization` release, see `MIGRATION.md` for the new runtime API and the compatibility path that keeps `loadLocales()` working.

```javascript
import { baseLocale, bucketNames, loadLocales, supportedLocales } from './locales/index.js';

const locales = await loadLocales();

console.log(baseLocale); // e.g. 'en'
console.log(supportedLocales); // e.g. ['en', 'ru']
console.log(bucketNames); // e.g. ['app', 'errors']
```

The generated index file exposes manifest data, resolution helpers, loaders, ICU formatters, and runtime facades. The generated `sheety-message-format.js` is self-contained and imported by the index, so consumers do not need to install `intl-messageformat`.

Generated index helpers are grouped into a few categories:

- Manifest data:
  - `supportedLocales`, `baseLocale`, `bucketNames`, `bucketLocales`, `bucketBaseLocales`, `bucketKeys`, `messageMeta`, `locales`
- Validation and resolution:
  - `normalizeLocale(locale)`, `isLocale(locale)`, `isBucket(bucket)`, `isMessageKey(bucket, key)`
  - `getMessageMeta(bucket, key)`, `getLocaleChain(locale)`, `getBucketLocaleChain(bucket, locale)`, `resolveLocale(locale)`, `resolveBucketLocale(bucket, locale)`
- Loading and formatting:
  - `loadBucket(bucket, locale)`, `loadLocale(locale)`, `formatMessage(template, params)`
  - `translateLoaded(bucket, key, dictionary, params)`, `translate(bucket, key, locale, params)`
- Runtime facades:
  - `createLoadedBucketFacade(bucket, dictionary)`, `createLoadedLocaleFacade(dictionaries)`, `loadLocaleFacade(locale)`
  - `createBucketTranslator(bucket, locale)`, `createBucketFacade(bucket, locale)`, `createLocaleFacade(locale)`

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
- Keep one spreadsheet tab per namespace or bucket to match the generated folder structure.


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

Run it from the Command Palette via `Tasks: Run Task` -> `sheety-localization:generate`.

If you prefer the generated runtime over an i18next resource tree, the migration steps and API tradeoffs are described in `MIGRATION.md`.


## Google Sheets Tips

### Automatic Google Translate Formula

If you want to auto-fill missing translations from English to Russian, and column `D` contains English while column `E` contains Russian:

```plaintext
=IF(ISBLANK(D2), "", GOOGLETRANSLATE(D2, "en", "ru"))
```

Put this formula in `E2`, then fill it down the column.

If you use a localized Google Sheets UI, function names and separators may differ. For example, in a Russian UI, translating from Russian in `D2` to English in `E2` may look like this:

```plaintext
=ЕСЛИ(ЕПУСТО(D2); ""; GOOGLETRANSLATE(D2; "ru"; "en"))
```

- Adjust source and target locale codes to match your sheet.
- Keep in mind that machine-translated cells should still be reviewed manually.


### Conditional Formatting Rules

1. Gray out machine-translated cells

   - Select the target translation range, for example `E2:G`.
   - Add a custom formula rule such as `=ISFORMULA(E2)`.
   - Set a light gray fill color.

2. Highlight missing translations

   - Select the target translation range, for example `E2:G`.
   - Add a custom formula rule such as `=AND(LEN(TRIM($A2))>0, LEN(TRIM(E2))=0)`.
   - Set a warning color, for example red or orange.

If your Google Sheets UI is localized, function names may differ, but the logic should stay the same.

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
- `test/fixtures/backward-compatibility/v0.2.2` is an immutable baseline generated by the `v0.2.2` CLI. The example contract suite compares all 66 message values, legacy runtime exports, and soft placeholder formatting against it.
- `test:cli-result` and `test:coverage:cli-result` require Google Sheets read access and network connectivity. Set `SHEETY_GOOGLE_CREDENTIALS_FILE` to a working service-account JSON file outside the repository; without this variable, tests retain the legacy `example/credentials.json` fallback. An explicitly configured missing file fails rather than skipping tests.
- CI and publication use the `GOOGLE_SERVICE_ACCOUNT_JSON` Actions secret. It is materialized only below `RUNNER_TEMP` with mode `0600`, never committed or uploaded, and removed by an always-run cleanup step. Runs without access to this secret fail credential setup explicitly; live tests are not silently disabled for fork or Dependabot runs.
- Per-suite coverage artifacts and Codecov flags are emitted as `merged`, `source`, `generated-runtime`, and `cli-result`.

## Release automation

Pushing a `vX.Y.Z` tag starts `.github/workflows/publish.yml`. The workflow requires the tag to match `package.json`, runs tests and the production build, publishes the package through npm Trusted Publishing with automatically generated provenance, and verifies the exact version in the npm registry. A GitHub Release is created only after that verification succeeds. Re-running the workflow is safe when npm already contains the version: publication is skipped, registry verification still runs, and a missing GitHub Release is created.

The npm package must trust the GitHub repository `ziqq/sheety-localization`, workflow filename `publish.yml`, and the direct `npm publish` action. The release job uses a GitHub-hosted runner, Node.js 24, npm 11.15, and the `id-token: write` permission; it does not require a long-lived npm token. Authentication, network, build, test, and registry failures stop the workflow instead of being treated as an already-published version.

<img src="https://codecov.io/gh/ziqq/sheety-localization/graphs/sunburst.svg?token=RYIQF8DZNM" width="375" />

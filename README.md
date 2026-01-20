# Sheety Localization

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%23339933.svg?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![NPM](https://img.shields.io/npm/v/sheety-localization.svg)](https://www.npmjs.com/package/sheety-localization)

**Sheety Localization** - CLI utility for generating JSON localization files and barrel files (`index.js`/`index.ts`) from Google Sheets. Uses Google Sheets API and service account to get data.


## Features

- Get data from Google Sheets via service account.
- Generate JSON files for each locale (e.g. `app_en.json`, `app_ru.json`).
- Create barrel file (`index.js` or `index.ts`) for easy import of locales.
- Insert metadata: `@@locale`, `@@author`, `@@last_modified`, `@@comment`, `@@context`.
- Flexible configuration of directory structure and prefixes via CLI options.
- Support for global fields (`--meta`).
- Lazy loading of translations via `import()`.
- Automatic formatting of TypeScript files (optional).


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
  --ignore='help,temp-.*' \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

### Option definitions

- `--credentials`, `-c`: Path to service account JSON (defaults to `credentials.json` in CWD)
- `--sheet`, `-s`: Google Spreadsheet ID (required)
- `--output`, `-o`: Root folder for locales (`src/locales` by default)
- `--prefix`, `-p`: Prefix for files (`app` → `app_en.json`, `app_ru.json`, ...)
- `--meta`, `-m`: JSON string with global fields merged into every JSON file (default `{}`)
- `--meta-file`: Path to JSON file with global meta (has priority over `--meta`)
- `--type`, `-t`: Type of barrel file (`js` or `ts`)
- `--author`: Author for metadata (stored under `@@author`)
- `--comment`: Comment for metadata (stored under `@@comment`)
- `--context`: Context/version for metadata (stored under `@@context`)
- `--ignore`, `-i`: Comma-separated list of RegExp patterns to ignore sheets by title (e.g. `help,temp-.*`)
- `--help`, `-h`: Show detailed help with all options


## Integration

### 1. Prepare Google Sheet

- First line: `label | description | meta | en | ru | ...`
- Each line is one localization row:
  - `label` — key for the localization string.
  - `description` — optional description for context (not used in output files).
  - `meta` — optional JSON string with metadata for this label (merged into output).
  - `en`, `ru`, ... — columns for each locale with translation strings.

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
  --ignore='help,temp-.*' \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

- Will generate:
- `src/locales/app/app_en.json`, `src/locales/app/app_ru.json`, ...
- `src/locales/index.ts` (or `index.js`)


### 4. Add the generated locales to your app

```javascript
import { loadLocales } from './locales/index.js';
const locales = await loadLocales();
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
      "label": "npm:sheety-localization:generate",
      "detail": "Localization from Google Sheets",
      "type": "shell",
      "command": [
        "npm i -g sheety-localization"
        "sheety-localization",
        "--credentials=./credentials.json",
        "--sheet=<SPREADSHEET_ID>",
        "--output=src/locales",
        "--prefix=app",
        "--type=ts",
        "--ignore='help,temp-.*",
        "--author="Your Name <email>"",
        "--comment="Generated from Google Sheets"",
      ],
      "options": {
        "cwd": "${workspaceFolder}"
      }
    }
  ]
}
```
Run: Open Command Palette -> Tasks: Run Task -> npm:sheety-localization:generate.


## Example: Automatic Google Translate Formula

If you want to auto-fill missing translations from English to Russian:

```plaintext
=IF(ISBLANK(D2), "", GOOGLETRANSLATE(D2, "en", "ru"))
```

- Place this formula in cell E2 (under the ru column).
- Drag/fill down to apply to all rows.
- Cells with empty en will remain blank; otherwise, English text will be machine-translated to Russian.


## Example: Conditional Formatting Rules

1.  Gray out machine translations

    - Select entire column (e.g., column E for ru).
    - Add a custom formula rule: =ISFORMULA(E2).
    - Set fill color to light gray.

2.  Highlight empty cells (missing translations)

    - Select entire column (e.g., E).
    - Add a custom formula rule: =E2="".
    - Set fill color to red (or any noticeable color).

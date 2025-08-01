# Sheety Localization

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%23339933.svg?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![NPM](https://img.shields.io/npm/v/generate-locales.svg)](https://www.npmjs.com/package/generate-locales)

**Sheety Localization** - CLI utility for generating JSON localization files and barrel files (`index.js`/`index.ts`) from Google Sheets. Uses Google Sheets API and service account to get data.

---

## Features

- Get data from Google Sheets via service account.
- Generate JSON files for each locale (e.g. `app_en.json`, `app_ru.json`).
- Create barrel file (`index.js` or `index.ts`) for easy import of locales.
- Insert metadata: `@@locale`, `@@author`, `@@last_modified`, `@@comment`, `@@context`.
- Flexible configuration of directory structure and prefixes via CLI options.
- Support for global fields (`--meta`).
- Lazy loading of translations via `import()`.
- Automatic formatting of TypeScript files (optional).

---

## TL;DR

1. Create a Google Sheet with columns: `key | description | en | ru | ...`.
2. Get a Google Cloud service account, enable Sheets API, share the spreadsheet.
3. Install dependencies:

```bash
npm install -g generate-locales
```

4. Run the generator:

```bash
generate-locales \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

5. Import the barrel file (`src/locales/index.ts`) into the project.

6. Optionally automate translation formulas, conditional formatting, VS Code tasks, and CI pipelines.

---

## Requirements

- Node.js >= 18
- Google Service Account with access to Google Sheets API
- Google Sheet with first line:
  `key | description | en | ru | ... (other locales)`

---

## Installation

```bash
npm install -g generate-locales
```

> **Tip:** Do not publish `credentials.json` in public repositories.

---

## Usage

### Command example

```bash
generate-locales \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

### Option descriptions

- `--credentials`, `-c`: Path to service account JSON (required)
- `--sheet`, `-s`: Google Spreadsheet ID (required)
- `--output`, `-o`: Root folder for locales (`src/locales` by default)
- `--prefix`, `-p`: Prefix for files (`app`)
- `--meta`, `-m`: JSON string with global fields (`{}`)
- `--type`, `-t`: Type of barrel file (`js` or `ts`)
- `--author`: Author for metadata
- `--comment`: Comment for metadata
- `--context`: Context/version for metadata
- `--format`: Format index file (`false` by default)
- `--help`, `-h`: Show help

---

## Integration

1. **Prepare Google Sheet**

- First line: `key | description | en | ru | ...`
- Each line is one localization line.

2. **Create a service account and share the spreadsheet**

- In Google Cloud Console, create a project, enable Sheets API.
- Create a service account, download `credentials.json`.
- Share the spreadsheet with the service account email.

3. **Run the generator**

- In the terminal:

```bash
generate-locales \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --author="Your Name <email>" \
  --comment="Generated from Google Sheets"
```

- Will generate:
- `src/locales/app/app_en.json`, `src/locales/app/app_ru.json`, ...
- `src/locales/index.ts` (or `index.js`)

---

## Tips

- Store localization JSON files in git for auditing.
- Don't publish `credentials.json` — use CI secrets.
- Use `--author`, `--comment`, `--context` options for metadata.
- To add new locales, update the table and regenerate the files.

---

## VS Code task example

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Localization",
      "type": "shell",
      "command": [
        "generate-locales",
        "--credentials=credentials.json",
        "--sheet=<SPREADSHEET_ID>",
        "--output=src/locales",
        "--prefix=app",
        "--type=ts",
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

---

## Example: Google Automatic Translation Sheets

In a cell for Russian (`E2`):

```plaintext
=IF(ISBLANK(D2), "", GOOGLETRANSLATE(D2, "en", "ru"))
```

---

**Generate localizations from Google Sheets quickly and easily!**

## Description

A command-line tool to automatically generate locale JSON files and a barrel file (index.js/index.ts) from Google Sheets.

## Features

- Fetches data from Google Sheets via a Service Account.
- Generates JSON files with metadata: `@@locale, @@author, @@last_modified, @@comment, @@context`.
- Supports global fields (--meta).
- Creates a convenient index barrel:
- JavaScript: index.js
- TypeScript: index.ts with types.
- Lazy-loading of translations using import().

## Installation

1. Clone the repository:

````bash
git clone <your-repo-url>
cd <your-folder>
``` bash

2. Install dependencies:

npm install

3. Make the script executable:

``` bash
chmod +x scripts/generate-locales.js
````

## CLI Options

generate-locales [options]

### Flag Description Default

-c, --credentials Path to the Google Service Account JSON file — (required)
-s, --sheet Google Spreadsheet ID - (required)
-o, --output Root folder for output locales src/locales
-p, --prefix Prefix for filenames (${prefix}_${locale}.json) (empty)
-m, --meta JSON string of additional global fields {}
-t, --type Index file type: js or ts js
--author Author to insert into JSON files (empty)
--comment Comment to insert into JSON files (empty)
--context Context/version to insert into JSON files (empty)
--format (Future) format the index file false
-h, --help Show help output —

## Quick Start

1. Enable Google Sheets API and obtain credentials.json.
2. Share your Google Sheet with the Service Account email.
3. Run locale generation:

```bash
generate-locales\
--credentials=credentials.json \
--sheet=sheet_id \
--output=src/locales \
--prefix=app\
--type=ts\
--author="Author Name <example@gmail.com>" \
--comment="Generated from Google Sheets"
```

4.Verify:
• Folders: src/locales/<bucket>/<prefix>\_<locale>.json
• File: src/locales/index.ts

## Example Output Structure

```
src/locales/
├─app/
│ ├─ app_en.json
│ └─ app_ru.json
├─ errors/
│ ├─ errors_en.json
│ └─ errors_en.json
└─ index.ts # or index.js
```

## Tips

• Keep credentials.json out of public repos.
• Version-control generated JSON files for auditing.
• When adding locales, update the sheet or use --prefix to force regeneration.

## Publishing to npm (optional)

1.Add to package.json:

```json
"bin": { "generate-locales": "scripts/generate-locales.js" }
```

2. Make the script executable and publish:

```bash
chmod +x scripts/generate-locales.js
npm login
npm publish
```

3. Then users can install globally:

```bash
npm install -g generate-locales
```

Generate locales quickly and reliably!

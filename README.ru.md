# Sheety Localization

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%23339933.svg?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![NPM](https://img.shields.io/npm/v/generate-locales.svg)](https://www.npmjs.com/package/generate-locales)

**Sheety Localization** — CLI-утилита для генерации JSON-файлов локализации и barrel-файлов (`index.js`/`index.ts`) из Google Sheets. Использует Google Sheets API и сервисный аккаунт для получения данных.

---

## Возможности

- Получение данных из Google Sheets через сервисный аккаунт.
- Генерация JSON-файлов для каждой локали (например, `app_en.json`, `app_ru.json`).
- Создание barrel-файла (`index.js` или `index.ts`) для удобного импорта локализаций.
- Вставка метаданных: `@@locale`, `@@author`, `@@last_modified`, `@@comment`, `@@context`.
- Гибкая настройка структуры директорий и префиксов через CLI-опции.
- Поддержка глобальных полей (`--meta`).
- Ленивая загрузка переводов через `import()`.
- Автоматическое форматирование TypeScript-файлов (опционально).

---

## TL;DR

1. Создайте Google Sheet с колонками: `key | description | en | ru | ...`.
2. Получите сервисный аккаунт Google Cloud, включите Sheets API, поделитесь таблицей.
3. Установите зависимости:

   ```bash
   npm install
   ```

4. Запустите генератор:

   ```bash
   node scripts/generate-locales.js \
     --credentials=credentials.json \
     --sheet=<SPREADSHEET_ID> \
     --output=src/locales \
     --prefix=app \
     --type=ts \
     --author="Ваше Имя <email>" \
     --comment="Generated from Google Sheets"
   ```

5. Импортируйте barrel-файл (`src/locales/index.ts`) в проект.

---

## Требования

- Node.js >= 18
- Google Service Account с доступом к Google Sheets API
- Google Sheet с первой строкой:
  `key | description | en | ru | ... (другие локали)`

---

## Установка

```bash
npm install
```

> **Совет:** Не публикуйте `credentials.json` в публичных репозиториях.

---

## Использование

Для справки по опциям:

```bash
node scripts/generate-locales.js --help
```

### Пример команды

```bash
node scripts/generate-locales.js \
  --credentials=credentials.json \
  --sheet=<SPREADSHEET_ID> \
  --output=src/locales \
  --prefix=app \
  --type=ts \
  --author="Ваше Имя <email>" \
  --comment="Generated from Google Sheets"
```

#### Описание опций

- `--credentials`, `-c`: Путь к JSON сервисного аккаунта (обязательно)
- `--sheet`, `-s`: ID Google Spreadsheet (обязательно)
- `--output`, `-o`: Корневая папка для локалей (`src/locales` по умолчанию)
- `--prefix`, `-p`: Префикс для файлов (`app`)
- `--meta`, `-m`: JSON-строка с глобальными полями (`{}`)
- `--type`, `-t`: Тип barrel-файла (`js` или `ts`)
- `--author`: Автор для метаданных
- `--comment`: Комментарий для метаданных
- `--context`: Контекст/версия для метаданных
- `--format`: Форматировать index-файл (`false` по умолчанию)
- `--help`, `-h`: Показать справку

---

## Интеграция

1. **Подготовьте Google Sheet**

   - Первая строка: `key | description | en | ru | ...`
   - Каждая строка — одна строка локализации.

2. **Создайте сервисный аккаунт и поделитесь таблицей**

   - В Google Cloud Console создайте проект, включите Sheets API.
   - Создайте сервисный аккаунт, скачайте `credentials.json`.
   - Поделитесь таблицей с email сервисного аккаунта.

3. **Запустите генератор**

   - В терминале:

     ```bash
     node scripts/generate-locales.js \
       --credentials=credentials.json \
       --sheet=<SPREADSHEET_ID> \
       --output=src/locales \
       --prefix=app \
       --type=ts
     ```

   - Будут созданы:
     - `src/locales/app/app_en.json`, `src/locales/app/app_ru.json`, ...
     - `src/locales/index.ts` (или `index.js`)

---

## Пример структуры

```
example/
  credentials.json
  src/
    locales/
      app/
        app_en.json
        app_ru.json
      errors/
        errors_en.json
        errors_ru.json
      index.ts
```

- **`index.ts`**:

  ```ts
  // GENERATED FILE: index.ts
  // Barrel file for all locales

  export { default as app_en } from './app/app_en.json';
  export { default as app_ru } from './app/app_ru.json';
  // ... другие экспорты
  ```

- **`app_en.json`**:

  ```json
  {
    "@@locale": "en",
    "@@author": "Ваше Имя <email>",
    "@@last_modified": "2025-08-01T12:00:00Z",
    "@@comment": "Generated from Google Sheets",
    "@@context": "v1.0",
    "title": "Doctorina",
    "checkVersionUpdateNowButton": "Update Now"
    // ... другие ключи
  }
  ```

---

## Советы

- Храните JSON-файлы локализации в git для аудита.
- Не публикуйте `credentials.json` — используйте секреты CI.
- Используйте опции `--author`, `--comment`, `--context` для метаданных.
- Для добавления новых локалей — обновите таблицу и перегенерируйте файлы.

---

## Пример задачи VS Code

Добавьте в `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate Localization",
      "type": "shell",
      "command": [
        "node scripts/generate-locales.js",
        "--credentials=credentials.json",
        "--sheet=1iTmPNGoo41_rk2uLThru1WxbnA-K96_OZmsCdLTcWYw",
        "--output=src/locales",
        "--prefix=app",
        "--type=ts",
        "--author='Anton Ustinoff <a.a.ustinoff@gmail.com>'",
        "--comment='Generated from Google Sheets'",
        "--context='From Google Sheets'"
      ],
      "options": {
        "cwd": "${workspaceFolder}/example"
      }
    }
  ]
}
```

---

## Пример: Автоматический перевод Google Sheets

В ячейке для русского (`E2`):

```plaintext
=IF(ISBLANK(D2), "", GOOGLETRANSLATE(D2, "en", "ru"))
```

---

## Пример: Условное форматирование

1. **Серый фон для машинного перевода**
   Формула: `=ISFORMULA(E2)`

2. **Красный фон для пустых ячеек**
   Формула: `=E2==""`

---

**Быстро и удобно генерируйте локализации из Google Sheets!**

## Description

A command-line tool to automatically generate locale JSON files and a barrel file (index.js/index.ts) from Google Sheets.

## Features

• Fetches data from Google Sheets via a Service Account.
• Generates JSON files with metadata:
• @@locale, @@author, @@last_modified, @@comment, @@context.
• Supports global fields (--meta).
• Creates a convenient index barrel:
• JavaScript: index.js
• TypeScript: index.ts with types.
• Lazy-loading of translations using import().

## Installation

1. Clone the repository:

git clone <your-repo-url>
cd <your-folder>

2. Install dependencies:

npm install

3. Make the script executable:

chmod +x scripts/generate-locales.js

⸻

## CLI Options

generate-locales [options]

### Flag Description Default

-c, --credentials Path to the Google Service Account JSON file — (required)
-s, --sheet Google Spreadsheet ID — (required)
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

generate-locales \
 --credentials=credentials.json \
 --sheet=sheet_id \
 --output=src/locales \
 --prefix=app \
 --type=ts \
 --author="Author Name <example@gmail.com>" \
 --comment="Generated from Google Sheets"

4. Verify:
   • Folders: src/locales/<bucket>/<prefix>\_<locale>.json
   • File: src/locales/index.ts

## Example Output Structure

src/locales/
├─ app/
│ ├─ app_en.json
│ └─ app_ru.json
├─ errors/
│ ├─ errors_en.json
│ └─ errors_ru.json
└─ index.ts # or index.js

## Tips

• Keep credentials.json out of public repos.
• Version-control generated JSON files for auditing.
• When adding locales, update the sheet or use --prefix to force regeneration.

## Publishing to npm (optional)

1. Add to package.json:

"bin": { "generate-locales": "scripts/generate-locales.js" }

    2.	Make the script executable and publish:

chmod +x scripts/generate-locales.js
npm login
npm publish

    3.	Then users can install globally:

npm install -g generate-locales

⸻

Generate locales quickly and reliably!

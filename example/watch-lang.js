import { watch } from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function watchLangFile() {
  const localesDir = path.join(__dirname, 'src', 'locales');
  console.log('[watch-lang] watching', localesDir);
  try {
    watch(localesDir, { recursive: true }, (event, file) => {
      if (!file || !file.endsWith('.json')) return;
      exec('pnpm run format-lang', (err) => {
        if (err) {
          console.error('[watch-lang] format-lang failed:', err.message);
        }
      });
    });
  } catch (e) {
    console.warn('[watch-lang] failed:', e.message);
  }
}

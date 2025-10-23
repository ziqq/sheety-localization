import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';
import * as Handlebars from 'handlebars';

export interface HBOptions {
  context?: Record<string, any>;
  partialsDir?: string;
  helpers?: Record<string, (...a: any[]) => any>;
  reloadOnPartialChange?: boolean;
}

function loadPartials(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      loadPartials(full);
    } else if (/\.(hbs|handlebars|html)$/.test(file)) {
      const name = path
        .relative(dir, full)
        .replace(/\.(hbs|handlebars|html)$/, '')
        .replace(/\\/g, '/');
      const tpl = fs.readFileSync(full, 'utf8');
      Handlebars.registerPartial(name, tpl);
    }
  }
}

export function handlebarsPlugin(options: HBOptions = {}): Plugin {
  const {
    context = {},
    partialsDir = path.resolve(process.cwd(), 'src/partials'),
    helpers = {},
    reloadOnPartialChange = true,
  } = options;

  Object.entries(helpers).forEach(([k, fn]) => Handlebars.registerHelper(k, fn));

  let lastMTime = 0;
  const loadAll = () => {
    loadPartials(partialsDir);
  };

  return {
    name: 'custom-handlebars',
    enforce: 'pre',
    apply: 'serve',
    configureServer(server) {
      loadAll();
      if (reloadOnPartialChange && fs.existsSync(partialsDir)) {
        fs.watch(partialsDir, { recursive: true }, () => {
          loadAll();
          lastMTime = Date.now();
          server.ws.send({ type: 'full-reload' });
        });
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // простая инвалидация — можно использовать lastMTime при необходимости
        const template = Handlebars.compile(html);
        return template(context);
      },
    },
  };
}

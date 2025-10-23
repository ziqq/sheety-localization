import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import devtools from 'solid-devtools/vite';
import tailwindcss from '@tailwindcss/vite';
import solidPlugin from 'vite-plugin-solid';
// import handlebars from 'vite-plugin-handlebars';
// import basicSsl from '@vitejs/plugin-basic-ssl';
import checker from 'vite-plugin-checker';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'url';
import path, { resolve } from 'path';
import { existsSync } from 'fs';
import { ServerOptions } from 'vite';
// import { watchLangFile } from './watch-lang.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = __dirname;

const isDEV = process.env.NODE_ENV !== 'production';
// if (isDEV) watchLangFile();

/* const handlebarsPlugin = handlebars({
  context: {
    title: 'Example Solid + Vite + TailwindCSS',
    description: 'An example project using Solid, Vite, and TailwindCSS',
    url: 'https://web.example.org/',
    origin: 'https://web.example.org/',
  },
}); */

const serverOptions: ServerOptions = {
  port: 3000,
  host: true,
  sourcemapIgnoreList(sourcePath) {
    return sourcePath.includes('node_modules') || sourcePath.includes('logger');
  },
};

const SOLID_SRC_PATH = 'src/solid/packages/solid';
const SOLID_BUILT_PATH = 'src/vendor/solid';
const USE_SOLID_SRC = false;
const SOLID_PATH = USE_SOLID_SRC ? SOLID_SRC_PATH : SOLID_BUILT_PATH;
const USE_OWN_SOLID = existsSync(resolve(rootDir, SOLID_PATH));

const USE_SSL = false;
const USE_SSL_CERTS = false;
const NO_MINIFY = false;
const SSL_CONFIG: any = USE_SSL_CERTS &&
  USE_SSL && {
    name: '192.168.95.17',
    certDir: './certs/',
  };

const ADDITIONAL_ALIASES = {
  'solid-transition-group': resolve(rootDir, 'src/vendor/solid-transition-group'),
};

if (USE_OWN_SOLID) {
  console.log('[vite] using own solid', SOLID_PATH, 'built', !USE_SOLID_SRC);
} else {
  console.log('[vite] using original solid');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      devtools({
        /* additional options */
        autoname: true, // e.g. enable autoname
      }),
      // !process.env.VITEST &&
      //   checker({
      //     typescript: true,
      //     eslint: {
      //       // lintCommand: 'eslint "./src/**/*.{ts,tsx}" --ignore-pattern "./src/solid/*"',
      //       lintCommand: 'eslint --no-error-on-unmatched-pattern "src/**/*.{ts,tsx,js,jsx}"',
      //       useFlatConfig: true,
      //     },
      //   }),
      tailwindcss(),
      solidPlugin(),
      // Bundle analyzer (only in production)
      env.ANALYZE === 'true' &&
        visualizer({
          filename: 'dist/bundle-analysis.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
      // handlebarsPlugin,
      // USE_SSL ? (basicSsl as any)(SSL_CONFIG) : undefined,
      // visualizer({
      //   gzipSize: true,
      //   template: 'treemap',
      // }),
    ].filter(Boolean),
    server: serverOptions,
    test: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/solid/**',
      ],
      environment: 'jsdom',
      testTransformMode: { web: ['.[jt]sx?$'] },
      isolate: false,
      globals: true,
      setupFiles: ['./src/tests/setup.ts'],
    },
    build: {
      target: 'esnext',
      sourcemap: true, // Enable source maps for production
      minify: 'terser',
      terserOptions: {
        format: {
          comments: false, // Remove all comments including license comments
        },
        compress: {
          drop_console: mode === 'production', // Remove console.log in production
          drop_debugger: true, // Remove debugger statements
          pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [], // Remove specific console methods
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor dependencies
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            solidjs: ['solid-js', '@solidjs/router'],
          },
        },
      },
      // Enable advanced optimizations
      cssCodeSplit: true,
      assetsInlineLimit: 4096, // Inline assets smaller than 4KB as base64
      chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
    },
    worker: {
      format: 'es',
    },
    css: {
      // devSourcemap: true,
      // postcss: {
      //   plugins: [autoprefixer()],
      // },
      devSourcemap: false,
      // CSS optimization will be handled by Vite's built-in PostCSS
    },
    // Enable source maps in development
    define: {
      __DEV__: JSON.stringify(mode === 'development'),
      __PWA_DEV__: JSON.stringify(env.VITE_PWA_DEV === 'true'),
    },
    // GitHub Pages configuration
    base: env.HOSTING === 'github' ? '/example/' : '/',

    // PWA Configuration
    assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg'],

    // Optimized asset handling for PWA
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return { js: `/${filename}` };
        } else {
          return { relative: true };
        }
      },
    },

    resolve: {
      alias: USE_OWN_SOLID
        ? {
            rxcore: resolve(rootDir, SOLID_PATH, 'web/core'),
            'solid-js/jsx-runtime': resolve(rootDir, SOLID_PATH, 'jsx'),
            'solid-js/web': resolve(rootDir, SOLID_PATH, 'web'),
            'solid-js/store': resolve(rootDir, SOLID_PATH, 'store'),
            'solid-js': resolve(rootDir, SOLID_PATH),
            ...ADDITIONAL_ALIASES,
          }
        : ADDITIONAL_ALIASES,
    },
  };
});

# Migration Guide

This guide describes migration from previous `sheety-localization` releases to the current generated runtime.

Older versions of the package mainly exposed generated locale files plus a minimal `loadLocales()` entrypoint. The current generator still keeps that compatibility path, but it now also generates a richer runtime API: locale manifests, fallback helpers, typed placeholder metadata, per-locale loaders, and sync/async namespace helpers.

## Who needs to change code

If your app only does this:

```ts
import { loadLocales } from './locales/index.js';

const locales = await loadLocales();
```

then you do not need a forced migration. That flow is still supported.

You only need to change code if you want to adopt the newer runtime API for smaller loads, typed placeholders, or a Dart-like namespace API.

## What changed in the generated API

Previous package versions focused on:

- generated JSON locale buckets
- generated `index.js` or `index.ts`
- `loadLocales()` as the main runtime entrypoint

Current versions additionally generate:

- `supportedLocales`, `baseLocale`, `bucketNames`, `bucketLocales`
- `bucketKeys`, `messageMeta`, `getMessageMeta()`
- `normalizeLocale()`, `getLocaleChain()`, `resolveLocale()`, `resolveBucketLocale()`
- `isLocale()`, `isBucket()`, `isMessageKey()`
- `loadBucket()`, `loadLocale()`, `translate()`, `translateLoaded()`
- `createBucketTranslator()`
- `createBucketFacade()`, `createLocaleFacade()`
- `createLoadedBucketFacade()`, `createLoadedLocaleFacade()`, `loadLocaleFacade()`

## Migration paths

### 1. Keep the old integration with no behavioral changes

Before:

```ts
import { loadLocales } from './locales/index.js';

const locales = await loadLocales();
```

After:

```ts
import { loadLocales } from './locales/index.js';

const locales = await loadLocales();
```

This is still valid. If your application already consumes the full locale tree and you do not need the new helpers, you can stay on this API.

### 2. Migrate from full-tree loading to per-locale loading

Previous versions pushed most consumers toward loading every locale at once:

```ts
const locales = await loadLocales();
const current = locales.ru;
```

Current versions let you load only one locale:

```ts
const dictionaries = await loadLocale('ru');

console.log(dictionaries.app.welcomeTitle);
```

This is the smallest practical migration if you want to reduce eager loading but keep dictionary-level access.

### 3. Migrate from raw dictionaries to the generated runtime API

Before:

```ts
const locales = await loadLocales();
const title = locales.ru.app.welcomeTitle;
```

After:

```ts
const l10n = await loadLocaleFacade('ru');
const title = l10n.app.welcomeTitle();
```

Or in the two-step form:

```ts
const dictionaries = await loadLocale('ru');
const l10n = createLoadedLocaleFacade(dictionaries);

l10n.app.welcomeTitle();
```

This is the recommended migration path when you want the generated runtime to be your main API surface.

### 4. Migrate from manual string formatting to typed placeholder calls

Before:

```ts
const locales = await loadLocales();
const subtitle = locales.ru.todo.subtitle.replace('{numberOfTasks}', String(count));
```

After, imperative style:

```ts
const dictionaries = await loadLocale('ru');

const subtitle = translateLoaded('todo', 'subtitle', dictionaries.todo, {
  numberOfTasks: String(count),
});
```

After, runtime API style:

```ts
const l10n = await loadLocaleFacade('ru');
const subtitle = l10n.todo.subtitle({ numberOfTasks: String(count) });
```

This gives you generated placeholder metadata and TypeScript parameter checking.

### 5. Replace hardcoded locale and bucket knowledge with manifest helpers

Before:

```ts
const locales = ['en', 'ru'];
const namespaces = ['app', 'errors', 'todo'];
```

After:

```ts
import {
  baseLocale,
  bucketKeys,
  bucketLocales,
  bucketNames,
  messageMeta,
  supportedLocales,
} from './locales/index.js';
```

Use these when you want UI and tooling to follow the generated output instead of duplicated app config.

## Recommended upgrade order

1. Regenerate locale output with the new package version.
2. Keep `loadLocales()` first if you want a zero-risk upgrade.
3. Move to `loadLocale()` when you want per-locale loading.
4. Move to `loadLocaleFacade()` or `createLoadedLocaleFacade()` when you want the new primary runtime API.
5. Replace manual placeholder interpolation with `translateLoaded()` or runtime helper methods.

## Behavioral differences to know

- Locale fallback is now generated explicitly. For example, `pt-BR` resolves through `pt_BR -> pt -> baseLocale`.
- Placeholder metadata is emitted into `messageMeta` and used for generated TypeScript parameter types.
- Generated output now cleans up stale locale JSON files and stale alternate index files when inputs change.
- Generated `index.ts` and `index.js` now contain the runtime API surface and should be treated as the source of truth.

## When to use each new API

- Use `loadLocales()` to preserve previous full-tree behavior.
- Use `loadLocale(locale)` when you want one locale worth of dictionaries.
- Use `loadLocaleFacade(locale)` when you want a ready-to-use synchronous runtime object after one async load.
- Use `createLoadedLocaleFacade(dictionaries)` when dictionaries are already loaded elsewhere.
- Use `createLocaleFacade(locale)` when you prefer lazy async bucket methods.
- Use `translate()` for one-off async lookups.
- Use `translateLoaded()` when a bucket dictionary is already in memory.
- Use `formatMessage()` only when you already have a template string and only need placeholder interpolation.

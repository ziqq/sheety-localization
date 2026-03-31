# Changelog

## 0.2.2
- **ADDED**: Regression coverage for symlinked CLI entry paths to prevent future releases from silently skipping `main()` when launched from the installed npm executable.
- **FIXED**: Global npm CLI execution now works when `sheety-localization` is launched through a symlinked package bin, such as the binary installed by `npm install -g`.

## 0.2.1
- **CHANGED**: Documentation

## 0.2.0
- **ADDED**: Generated runtime helpers for locale manifests, fallback resolution, bucket metadata, and typed placeholder-aware translation APIs.
- **ADDED**: Synchronous preloaded runtime helpers (`createLoadedBucketFacade`, `createLoadedLocaleFacade`, `loadLocaleFacade`) and async bucket/locale namespace helpers.
- **ADDED**: Jest coverage split into `source`, `generated-runtime`, `cli-result`, and merged reports with explicit tested-files summaries.
- **ADDED**: CI and Codecov uploads for merged and per-suite coverage artifacts.
- **ADDED**: `--include-empty` to make missing locale cells explicit by emitting empty-string translations and matching `@key` metadata only when requested.
- **ADDED**: `--last-modified`, `--no-last-modified`, and `--modified` to control `@@last_modified` metadata in generated locale files.
- **ADDED**: `MIGRATION.md` describing migration from previous `sheety-localization` releases to the generated runtime.
- **CHANGED**: Generator logging now reports per-sheet fallback filling and per-bucket manifest summaries.
- **CHANGED**: Generated `index.ts` and `index.js` now include doc comments for exported helpers.
- **CHANGED**: Example app now documents both the generated Sheety runtime API path and the optional `solid-i18next` interoperability path.
- **CHANGED**: Example app cleanup removed redundant helper exports and duplicated service metadata accessors.
- **CHANGED**: README updated to document the expanded runtime API surface, coverage commands, and corrected VS Code task/examples.
- **CHANGED**: Missing or empty locale cells are now omitted from generated output by default instead of being implicitly emitted as empty-string translations.
- **FIXED**: Example app production build no longer depends on a missing changelog script or optional `terser`; it now builds with Vite's built-in esbuild minifier.

## 0.1.1
- **CHANGED**: README.md

## 0.1.0
- **ADDED**: TypeScript types and converted codebase to TypeScript

## 0.0.8
- **ADDED**: Ignore sheets by title via `--ignore` patterns
- **ADDED**: Support global meta from file via `--meta-file`
- **CHANGED**: Extended logging with per-sheet and per-run summaries
- **CHANGED**: More robust row parsing and `meta` handling (JSON or plain text)
- **CHANGED**: Improved CLI UX (richer `--help`, extra aliases, better usage text)
- **CHANGED**: Updated README to reflect `label | description | meta | ...` sheet format and new options

## 0.0.7
- **FIXED**: Double quotes in generated index file

## 0.0.6
- **ADDED**: More logs

## 0.0.5
- **FIXED**: Parsing `meta`

## 0.0.4
- **ADDED**: Skip generation JSON localization files for not modified localization files from Google Sheets

## 0.0.3
- **CHANGED**: Pakage documentation

## 0.0.2
- **CHANGED**: Run command from `generate-locales` to `sheety-localization`

## 0.0.1
- **ADDED**: Initial release

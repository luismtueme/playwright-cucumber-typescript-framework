# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses [semantic versioning](https://semver.org).

## [Unreleased]

## [1.0.0] - 2026-09-26

TypeScript version of [playwright-cucumber-automation-framework v3.0.0](https://github.com/luismtueme/playwright-cucumber-automation-framework/releases/tag/v3.0.0). Same features, tests and CI gates; the history of those features is in that repository's changelog.

### Added
- The whole framework in strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`): config, utilities, page objects, World, hooks, steps, specs, unit tests and config files.
- Typed Playwright fixtures (`test.extend<Fixtures>()`), a fully typed Cucumber World, and typed `Given`/`When`/`Then` (`utils/steps.ts`).
- Generic `ApiClient` responses (`api.post<Item>(...)`) and `DbClient` rows (`db.one<ItemRow>(...)`).
- Type-aware ESLint (`typescript-eslint` `recommendedTypeChecked`), including `no-floating-promises` to catch unawaited Playwright calls.
- Consistency test that `@cucumber/messages` and `@cucumber/gherkin` match the versions Cucumber pins (two copies mean two incompatible sets of enum types).

### Changed from the JavaScript version
- No build step: Playwright runs TypeScript natively; Cucumber, scripts and unit tests run through `tsx`.
- The Cucumber config is `cucumber.mts` (an ES module), because Cucumber imports TypeScript configs as ESM and reads their default export.
- TypeScript is pinned to 6.0 until `typescript-eslint` supports TypeScript 7; Dependabot skips TypeScript majors.
- `wrapStepFunction` has an exact type (it always returns a Promise), which the JavaScript version could only approximate.

[Unreleased]: https://github.com/luismtueme/playwright-cucumber-typescript-framework/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/luismtueme/playwright-cucumber-typescript-framework/releases/tag/v1.0.0

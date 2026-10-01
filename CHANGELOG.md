# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com), and the project uses [semantic versioning](https://semver.org).

## [Unreleased]

### Fixed
- README: the "one feature file" command ran every scenario; it now shows filtering by name. Docker commands include `--build`, so they never run a stale image. `npm run report` notes that Allure needs Java.

### Added
- Run guide (`docs/GUIDE.md`): setup on every OS, running and debugging, a worked example that adds a page end to end (page object, scenario, typed steps, spec and fixture, accessibility checks), API and database checks, quarantining, pointing the framework at your own app, troubleshooting and a command cheat sheet.

### Changed
- README: the "Which repo should I use?" table links the new Java and Selenium version, [selenium-java-cucumber-framework](https://github.com/luismtueme/selenium-java-cucumber-framework).

## [1.1.0] - 2026-09-26

### Added
- `tag` option on specs (`{ tag: '@smoke' }`) instead of tags in titles; describe-level tags for accessibility and visual specs.
- `test.step()` in specs, so the Playwright and Allure reports show named steps like Cucumber scenarios.
- Aria snapshot checks of each page's accessible structure: `toMatchAriaSnapshot()` in specs (partial matching), and `Then the page structure is:` in Cucumber (exact match on `locator.ariaSnapshot()`, since the matcher needs Playwright Test).
- `page.clock` tests for a new demo app feature: the items page shows a session-expired notice after 15 minutes without a click or keypress. Specs and a Cucumber feature cover the exact boundary and the timer restarting on activity.
- `expect.poll()` in the `@db` steps and the UI/API agreement check, so they work with apps that save asynchronously.

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

[Unreleased]: https://github.com/luismtueme/playwright-cucumber-typescript-framework/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/luismtueme/playwright-cucumber-typescript-framework/releases/tag/v1.1.0
[1.0.0]: https://github.com/luismtueme/playwright-cucumber-typescript-framework/releases/tag/v1.0.0

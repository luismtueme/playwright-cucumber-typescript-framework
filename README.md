# Playwright + Cucumber Automation Framework (TypeScript)

UI, API and database test automation with [Playwright](https://playwright.dev) and [Cucumber](https://cucumber.io), reported in [Allure](https://allurereport.org).

Written in strict TypeScript. It is the TypeScript version of [playwright-cucumber-automation-framework](https://github.com/luismtueme/playwright-cucumber-automation-framework) (v3.0.0), with the same features and CI gates.

Write tests as Gherkin scenarios (Cucumber), as Playwright specs, or both. The two runners share one configuration, the same page objects and the same API client, so a test behaves the same whichever way it's written.

[![Playwright Tests](https://github.com/luismtueme/playwright-cucumber-typescript-framework/actions/workflows/playwright.yml/badge.svg)](https://github.com/luismtueme/playwright-cucumber-typescript-framework/actions/workflows/playwright.yml) · [Latest Allure report](https://luismtueme.github.io/playwright-cucumber-typescript-framework/allure-report/)

## What's included

| Area | How it works |
|---|---|
| UI tests | Page objects with role and label locators (`pages/`), Playwright auto-waiting, no hard-coded waits (enforced by lint) |
| API tests | `ApiClient` on Playwright's request API. In Cucumber, every request/response is attached to the report with passwords and tokens masked |
| Database checks | `DbClient` (MySQL, pooled, parameterized queries). `@db` scenarios verify what the API wrote. CI runs them against a real MySQL |
| Configuration | One config for both runners (`config/index.ts`). Secrets come from environment variables or `.env`, never from committed files |
| Saved login | Log in once, reuse the session: Playwright's `setup` project, and the `@authenticated` tag in Cucumber |
| Test data | Factories and cleanup (`createItem`, `trackItem`, `this.addCleanup()`). Every test deletes what it creates, and CI fails if any rows are left behind |
| Parallel runs | Both runners run in parallel. Each Cucumber worker gets its own browser and demo app |
| Failure evidence | Screenshot, Playwright trace and video for every failed test. Videos of passing tests are deleted |
| Reporting | Allure with steps, attachments, trend history and failure categories (Application Bug, Flaky Test, Test Defect, Infrastructure) |
| Type checking | Strict TypeScript (`strict`, `noUncheckedIndexedAccess`) with typed fixtures, World and step definitions. Type-aware ESLint catches unawaited promises, the classic cause of flaky Playwright tests. Nothing to compile: Playwright runs TypeScript natively, everything else runs through `tsx` |
| Quality gates | ESLint (including Playwright rules), Prettier, Gherkin lint, type check, framework unit tests with coverage thresholds, step validation, `npm audit`, all required to merge |
| Cross-browser | Every PR runs on Chromium. A nightly job runs everything on Chromium, Firefox and WebKit |
| Accessibility | axe-core checks every page against WCAG 2.1 A/AA. Violations list the failing elements and link to the fix |
| Visual comparison | Screenshots compared with committed baselines, rendered in Playwright's Docker image so every machine matches |
| Flaky tests | Tag `@quarantine` (with a ticket): the test still runs and reports, but doesn't block merges |
| Docker | `docker compose run --rm tests` runs everything, MySQL included, with no local setup beyond Docker |
| Demo app | `demo-app/`: a small web app and JSON API the examples run against, so everything passes out of the box |

## Quick start

Requires Node.ts 22.8 or newer. Or skip the local setup entirely: `docker compose run --rm tests`.

```bash
npm install
npx playwright install chromium
npm test
```

`npm test` starts the demo app automatically, runs the Playwright specs and then the Cucumber scenarios. To see the report:

```bash
npm run report
```

## How TypeScript runs here

There is no build step and no `dist/` folder:

| Piece | Runs through |
|---|---|
| Playwright specs and `playwright.config.ts` | Playwright's built-in TypeScript support |
| Cucumber steps, hooks and `cucumber.mts` | `tsx`, loaded with `node --import tsx` by `npm run test:cucumber` |
| Scripts in `utils/`, the demo app, unit tests | `tsx` |
| `npm run typecheck` | `tsc --noEmit` over everything, including configs and tests |

Type errors never stop a test run (the runners strip types without checking them), so `npm run typecheck` is a separate required CI check.

## Testing your own application

1. Copy `.env.example` to `.env` and set at least:
   ```bash
   BASE_URL=https://your-app.example.com
   APP_USERNAME=your-test-user
   APP_PASSWORD=your-test-password
   ```
2. Replace the page objects in `pages/` and the examples in `features/`, `step_definitions/` and `tests/` with your own.
3. Delete `demo-app/` once nothing points at it.

When `BASE_URL` is set, the demo app isn't started and the demo credentials are never used.

## Configuration

Settings are read in this order, first match wins: **environment variables**, then **`.env`**, then **`config/testConfig.json`** (non-secret defaults). Every variable is listed with a description in [`.env.example`](.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | empty (demo app) | Application under test |
| `API_BASE_URL` | `BASE_URL` | API host, if different |
| `APP_USERNAME` / `APP_PASSWORD` | demo credentials for the demo app only | Login for UI and API tests |
| `TEST_BROWSER` | `chromium` | `chromium`, `firefox` or `webkit` |
| `HEADLESS` | `true` in CI | Show the browser locally with `HEADLESS=false` |
| `WORKERS` / `RETRIES` | CI: 2 / 1, local: 4 / 0 | Parallelism and retries, both runners |
| `VIDEO` / `TRACE` | `retain-on-failure` | `off`, `on` or `retain-on-failure` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | unset | Enables `@db` scenarios |
| `TEST_ENV` | `local` | Environment label in the report |
| `JIRA_BASE_URL` | unset | Turns `@jira:ABC-123` tags into report links |
| `LOG_LEVEL` | `warn` locally, `info` in CI | `error`, `warn`, `info` or `debug` |

Invalid values fail at startup with the variable name, for example `TEST_BROWSER must be one of chromium, firefox, webkit, got "ie11"`.

## Running tests

| Command | What it runs |
|---|---|
| `npm test` | Clean results, Playwright specs, then Cucumber scenarios |
| `npm run test:playwright` | Playwright specs in `tests/` |
| `npm run test:cucumber` | Cucumber scenarios in `features/` |
| `npm run test:cucumber -- --tags "@Smoke"` | Scenarios by tag. Allowed tags are listed in `utils/lintGherkin.ts`: `@Smoke`, `@Regression`, `@ui`, `@api`, `@db`, `@authenticated`, `@a11y`, `@quarantine`, `@jira:ABC-123` |
| `npx playwright test --grep @smoke` | Playwright specs by tag (`{ tag: '@smoke' }`) |
| `npm run test:cucumber -- features/ui/login.feature` | One feature file |
| `npm run test:unit` | Unit tests for the framework code (`unit/`), failing below 90% line coverage |
| `npm run test:visual` | Visual comparison in Docker. Add `-- --update` to accept new baselines |
| `npm run test:quarantine` | Only `@quarantine` tests, in both runners |
| `docker compose run --rm tests` | Everything in Docker with MySQL (any npm script works: `... tests npm run check`) |
| `npm run check` | Validates every Cucumber step is defined exactly once and every spec loads. No browser |
| `npm run lint` / `npm run format` | ESLint, Prettier and Gherkin lint / auto-fix |
| `npm run typecheck` | Strict type check of all code (no build step) |
| `TEST_BROWSER=webkit npm test` | Everything in another browser |
| `npm run demo` | Starts the demo app on http://127.0.0.1:4173 |
| `npm run report` | Builds and opens the Allure report |

`@db` scenarios run only when `DB_HOST` is set. To run them locally:

```bash
docker run -d --name test-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=testdb -e MYSQL_USER=tester -e MYSQL_PASSWORD=tester mysql:8.4
DB_HOST=127.0.0.1 DB_USER=tester DB_PASSWORD=tester DB_NAME=testdb npm run test:cucumber
```

## Project structure

```
├── config/
│   ├── index.ts              # Loads and validates configuration (both runners)
│   └── testConfig.json       # Non-secret defaults
├── demo-app/                 # Example app under test (delete when you adopt the framework)
├── features/                 # Gherkin: ui/, api/, db/
├── step_definitions/         # Cucumber steps, one file per area
├── hooks/hooks.ts            # Cucumber lifecycle: browser, demo app, DB, failure evidence
├── pages/                    # Page objects (BasePage, FormPage, LoginPage, ItemsPage)
├── tests/
│   ├── fixtures.ts           # Custom fixtures: page objects, API clients, test data factories
│   ├── auth.setup.ts         # Logs in once and saves the session for browser tests
│   ├── ui/, api/             # Playwright specs
│   └── visual/               # Screenshot tests and committed baselines (__screenshots__/)
├── unit/                     # Unit tests for the framework itself (node:test)
├── utils/
│   ├── apiClient.ts          # HTTP client (Playwright request API)
│   ├── dbClient.ts           # MySQL client
│   ├── world.ts              # Cucumber World: this.page, this.formPage, this.api(), this.db
│   ├── steps.ts              # Typed Given/When/Then (this = World)
│   ├── authState.ts          # Saved login session for both runners
│   ├── checkLeftoverData.ts  # Fails CI if tests left rows in the database
│   ├── accessibility.ts      # axe-core WCAG checks
│   ├── lintGherkin.ts        # Gherkin conventions (npm run lint)
│   ├── visual.ts             # Runs visual tests in the Playwright Docker image
│   ├── runQuarantine.ts      # Runs @quarantine tests in both runners
│   ├── logger.ts             # Leveled logger (LOG_LEVEL)
│   ├── allureMetadata.ts     # Report environment, executor and categories
│   ├── allureCategories.ts   # Failure categories
│   ├── stepErrorStatus.ts    # Reports assertion failures as "failed", not "broken"
│   └── validateSteps.ts      # Undefined/ambiguous step check (npm run check)
├── playwright.config.ts
├── cucumber.mts              # ES module: Cucumber imports TypeScript configs as ESM
├── tsconfig.json
├── eslint.config.ts
├── Dockerfile, docker-compose.yml
└── .env.example              # Every supported variable
```

## Writing tests

### A Cucumber scenario

```gherkin
@ui @Regression
Feature: Login

  Scenario: Log in with valid credentials
    Given I am on the login page
    When I log in with the configured credentials
    Then I am welcomed as the configured user
```

Steps use page objects from the World, and assertions stay in the steps. Import `Given`/`When`/`Then` from `utils/steps.ts` so `this` is typed as the World (autocomplete, and typos fail `npm run typecheck`):

```typescript
import { When, Then } from '../utils/steps';
import { requireCredentials } from '../config';

When('I log in with the configured credentials', async function () {
    const { username, password } = requireCredentials(this.config);
    await this.loginPage.login(username, password);
});

Then('I am welcomed as the configured user', async function () {
    const { username } = requireCredentials(this.config);
    await expect(this.loginPage.welcome).toHaveText(`Welcome, ${username}`);
});
```

- `@api` scenarios don't open a browser. Use `await this.api()` (or `await this.authedApi()`) for requests and `this.db` for queries.
- `@authenticated` scenarios start logged in with a session saved once per worker, so they skip the login page.
- Anything a scenario creates must be cleaned up: call `this.cleanUpItem(item)` or `this.addCleanup(async () => ...)`. Cleanups run after the scenario, pass or fail.

### A Playwright spec

Import `test` from `tests/fixtures.ts` to get page objects, API clients and test data injected. Browser tests start logged in (session saved once by `tests/auth.setup.ts`):

```typescript
import { test, expect, LOGGED_OUT } from '../fixtures';

test('lists items created through the API', async ({ itemsPage, createItem }) => {
    const item = await createItem(); // deleted automatically after the test
    await itemsPage.open(); // already logged in
    await expect(itemsPage.item(item.name)).toBeVisible();
});

test.describe('as a visitor', () => {
    test.use({ storageState: LOGGED_OUT }); // opt out of the saved session

    // Tags are structured (filter with --grep @smoke); steps show up in both reports
    test('logs in', { tag: '@smoke' }, async ({ loginPage, credentials }) => {
        await test.step('submit the configured credentials', async () => {
            await loginPage.open();
            await loginPage.login(credentials.username, credentials.password);
        });

        await test.step('the welcome message names the user', async () => {
            await expect(loginPage.welcome).toHaveText(`Welcome, ${credentials.username}`);
        });
    });
});
```

| Fixture | Gives you |
|---|---|
| `formPage`, `loginPage`, `itemsPage` | Page objects on the test's page |
| `api` / `authedApi` | `ApiClient` without / with a login token (never carries the browser session) |
| `createItem(overrides?)` | Creates an item via the API and deletes it after the test |
| `trackItem(item)` | Deletes an item you created another way (e.g. through the UI) after the test |
| `credentials` | `{ username, password }` from the environment |

When testing your own app, update `tests/auth.setup.ts` and `utils/authState.ts` with your login endpoint, and write factories like `createItem` for your own data.

### A page object

```typescript
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
    static override path = '/login';

    readonly username: Locator;
    readonly password: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        super(page);
        this.username = page.getByLabel('Username');
        this.password = page.getByLabel('Password');
        this.submitButton = page.getByRole('button', { name: 'Log in' });
    }

    async login(username: string, password: string): Promise<void> {
        await this.username.fill(username);
        await this.password.fill(password);
        await this.submitButton.click();
    }
}
```

Expose locators and user actions, and keep `expect` out of page objects so a failure points at the test that made the claim.

### Accessibility checks

Add a row to `features/ui/accessibility.feature` (and a line to `tests/ui/accessibility.spec.ts`) for each new page. In any scenario you can also add `Then the page has no accessibility violations`, and in any spec call the `checkAccessibility()` fixture. To skip something you don't control, pass `{ exclude: ['#third-party-widget'] }`; to skip a rule, pass `{ disableRules: ['color-contrast'] }` with a comment saying why.

### Visual comparison

Specs in `tests/visual/` compare screenshots with baselines in `tests/visual/__screenshots__/`. They run only through `npm run test:visual`, which uses the Playwright Docker image so fonts and anti-aliasing match everywhere (running them outside Docker is refused). After an intended UI change, run `npm run test:visual -- --update` and review the new images in the PR. Mask anything that changes between runs with `mask: [locator]`.

### Page structure (aria snapshots)

An aria snapshot is the page's accessible structure as YAML: headings, roles, labels, the things a screen reader announces. It fails when a label or role changes and ignores styling, so it's steadier than a screenshot for checking what a page contains.

```typescript
await expect(page.getByRole('main')).toMatchAriaSnapshot(`
  - main:
    - heading "Log in" [level=1]
    - textbox "Username"
    - button "Log in"
`);
```

In specs, the snapshot can list only the parts you care about (partial match). In Cucumber, `Then the page structure is:` takes the YAML as a doc string and compares it exactly, because `toMatchAriaSnapshot()` only runs inside Playwright Test. Get the current structure with `await page.getByRole('main').ariaSnapshot()`.

### Time-dependent behavior (page.clock)

`page.clock` replaces the browser's timers, so tests don't wait in real time and boundaries are exact. Install it before the page loads:

```typescript
await page.clock.install({ time: new Date('2026-01-05T09:00:00') });
await itemsPage.open();
await page.clock.fastForward('14:59'); // not expired yet
await page.clock.fastForward('00:01'); // exactly 15 minutes: expired
```

In Cucumber: `Given the browser clock is under test control`, then `When 15 minutes pass without activity`. See `tests/ui/session.spec.ts` and `features/ui/session.feature`.

### Waiting for things that aren't on the page (expect.poll)

Locator assertions retry on their own. For values from an API or the database, `expect.poll()` retries the function until the assertion passes or the expect timeout runs out, so tests stay correct when the app saves asynchronously:

```typescript
await expect.poll(async () => (await authedApi.get(`/api/items/${id}`)).body).toMatchObject({ name });
```

The `@db` steps use it for every database check.

### Quarantining a flaky test

1. Open a ticket, then tag the test: `@quarantine @jira:QA-123` on a scenario, or add `@quarantine` and the ticket to a spec's title.
2. It no longer runs in the normal suite. CI runs it in a separate, non-blocking step, so its results still appear in the report.
3. Fix it and remove the tag. The Gherkin linter rejects `@quarantine` without a ticket.

## Reporting

Both runners write to `allure-results/`, and `npm run report` builds one report from both.

- **Cucumber scenarios** show every Gherkin step. The failing step shows the error, expected vs received, and the line in your step definition. The screenshot, trace and video are under the scenario's "Tear down" section.
- **API steps** attach each request and response as JSON, with `password`, `token`, `authorization` and `apiKey` fields masked.
- **Status**: an assertion that doesn't hold is **failed** (probably an application bug). An error in the test itself (bad selector, timeout, script error) is **broken**.
- **Traces** open with `npx playwright show-trace <file>.zip`, or at [trace.playwright.dev](https://trace.playwright.dev).

In CI, the report for every push to `main` is published to GitHub Pages with trend history. For PRs, download the `allure-results` and `test-artifacts` artifacts from the run.

## CI

`.github/workflows/playwright.yml` runs on every PR and push to `main`:

| Job | Runs |
|---|---|
| Checks | Lint, format and Gherkin lint, type check, `npm audit` (high and critical), unit tests with coverage thresholds, step and spec validation |
| Tests | Both suites against the demo app, backed by a MySQL service container. Then quarantined tests (non-blocking) and a check that no test data was left behind |
| Visual | Screenshot comparison in the Playwright Docker image. Uploads expected/actual/diff images on failure |
| Publish Allure Report | On `main` only: builds the report and deploys it to GitHub Pages |
| Nightly Cross-Browser | Daily at 06:00 UTC (and on demand): everything on Chromium, Firefox and WebKit. Not required to merge |

`main` is protected: changes need a PR with Checks and Tests passing. Dependabot opens weekly update PRs. See [.github/GITHUB_ACTIONS_GUIDE.md](.github/GITHUB_ACTIONS_GUIDE.md) for setup in your own repository.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to make changes, and [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## License

MIT. See [LICENSE](LICENSE).

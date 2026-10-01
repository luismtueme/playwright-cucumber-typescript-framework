# Run guide

This guide is for anyone setting up the framework for the first time, running its tests day to day, or adding tests for a new page. It walks through each task step by step. For the feature overview and reference tables, see the [README](../README.md).

Contents:

1. [Set up](#1-set-up)
2. [Use](#2-use)
3. [Create tests](#3-create-tests)
4. [Point it at your own app](#4-point-it-at-your-own-app)
5. [Troubleshooting](#5-troubleshooting)
6. [Command cheat sheet](#6-command-cheat-sheet)

## 1. Set up

### Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node.js | 22.8 or newer | Everything |
| Git | any recent | Cloning |
| Docker | any recent | Visual tests, and the optional all-in-Docker run |
| Java | 8 or newer | Only `npm run report` (the Allure command line runs on Java) |

Check what you have:

```bash
node --version
git --version
docker --version
java -version
```

### Install

The steps are the same on Windows, macOS and Linux:

```bash
git clone https://github.com/luismtueme/playwright-cucumber-typescript-framework.git
cd playwright-cucumber-typescript-framework
npm install
npx playwright install chromium
```

On Linux, if Chromium fails to start because of missing system libraries, install them with `npx playwright install --with-deps chromium` (needs sudo).

To use Firefox or WebKit too, install them the same way: `npx playwright install firefox webkit`.

### First run

```bash
npm test
```

This needs no settings. It starts the bundled demo app, runs the Playwright specs in `tests/`, then the Cucumber scenarios in `features/`. Everything should pass. The `@db` scenarios are left out until you configure a database (see [Database scenarios](#database-scenarios)).

Open the combined report:

```bash
npm run report
```

### Settings

Settings are optional for the demo app. To change them, copy `.env.example` to `.env` and edit it. Every variable is described in that file. Environment variables override `.env`, which overrides `config/testConfig.json`.

Setting a variable for one command depends on your shell:

| Shell | Example |
|---|---|
| bash, zsh (macOS, Linux, Git Bash) | `HEADLESS=false npm test` |
| PowerShell | `$env:HEADLESS="false"; npm test` (stays set for the session) |
| Command Prompt | `set HEADLESS=false && npm test` |

The examples in this guide use the bash form.

### Docker (optional)

To run everything without installing Node or browsers, including a MySQL database for the `@db` scenarios:

```bash
docker compose run --build --rm tests
docker compose down -v
```

Keep `--build`: without it, Docker reuses an old image and runs old code. The second command removes the database afterwards.

### Editor setup

VS Code works well with these extensions:

| Extension | Why |
|---|---|
| Playwright Test for VS Code (`ms-playwright.playwright`) | Run and debug specs from the editor, pick locators |
| Cucumber (`CucumberOpen.cucumber-official`) | Step autocomplete and go-to-definition in `.feature` files |
| ESLint (`dbaeumer.vscode-eslint`) | Shows lint errors as you type, including unawaited promises |
| Prettier (`esbenp.prettier-vscode`) | Formats on save with the project's settings |

For the Cucumber extension, point it at this project's files in `.vscode/settings.json`:

```json
{
    "cucumber.features": ["features/**/*.feature"],
    "cucumber.glue": ["step_definitions/**/*.ts"]
}
```

## 2. Use

### Run everything

| Command | Runs |
|---|---|
| `npm test` | Clears old results, then Playwright specs, then Cucumber scenarios |
| `npm run test:playwright` | Only the Playwright specs |
| `npm run test:cucumber` | Only the Cucumber scenarios |

### Run part of the suite

Cucumber, by tag or by scenario name:

```bash
npm run test:cucumber -- --tags "@Smoke"
npm run test:cucumber -- --tags "@ui and not @authenticated"
npm run test:cucumber -- --name "Log in with valid credentials"
```

`--name` takes part of a scenario name (it's a regular expression), and runs every scenario that matches.

To run one feature file, use a tag or `--name`. Passing a file path (`npm run test:cucumber -- features/ui/login.feature`) doesn't narrow the run: Cucumber adds it to the `features/**/*.feature` paths in `cucumber.mts`, so every feature still runs.

Playwright specs, by file, by tag or by title:

```bash
npx playwright test tests/ui/login.spec.ts
npx playwright test --grep @smoke
npx playwright test --grep "rejects an empty name"
```

Tags in specs are structured: `test('...', { tag: '@smoke' }, ...)`. The allowed Cucumber tags are listed in `utils/lintGherkin.ts`.

### Watch and debug

| Command | What you get |
|---|---|
| `HEADLESS=false npm run test:cucumber -- --tags "@Smoke"` | Cucumber with a visible browser |
| `npx playwright test --headed` | Specs with a visible browser |
| `npx playwright test --ui` | Playwright's UI mode: pick tests, watch them, time-travel through each step |
| `npx playwright test tests/ui/login.spec.ts --debug` | Step through one spec in the Playwright Inspector |

Run Cucumber with one worker while watching, so only one browser opens: `WORKERS=1 HEADLESS=false npm run test:cucumber -- --tags "@Smoke"`.

### Other browsers

```bash
npx playwright install firefox webkit
TEST_BROWSER=firefox npm test
TEST_BROWSER=webkit npm test
```

### Reports and failure evidence

| Where | What |
|---|---|
| `npm run report` | Allure report from both runners: steps, attachments, trends, failure categories |
| `html-report/` | Playwright's HTML report (open `html-report/index.html`) |
| `traces/` | Cucumber traces of failed scenarios: `npx playwright show-trace traces/<file>.zip` |
| `test-results/` | Playwright's per-test output: screenshots, traces, videos of failures |
| `videos/` | Cucumber videos of failed scenarios |

In Allure, an assertion that didn't hold is **failed** (probably an app bug), and an error in the test itself (bad locator, timeout) is **broken**.

### Database scenarios

`@db` scenarios check what the API wrote, directly in MySQL. They run only when `DB_HOST` is set. Start a throwaway MySQL with Docker:

```bash
docker run -d --name test-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=testdb -e MYSQL_USER=tester -e MYSQL_PASSWORD=tester mysql:8.4
```

Wait about 20 seconds for it to start, then:

```bash
DB_HOST=127.0.0.1 DB_USER=tester DB_PASSWORD=tester DB_NAME=testdb npm test
DB_HOST=127.0.0.1 DB_USER=tester DB_PASSWORD=tester DB_NAME=testdb npm run check:leftovers
```

With `DB_HOST` set, the demo app stores its items in MySQL too. `npm run check:leftovers` fails if any test left rows behind. Remove the database with `docker rm -f test-mysql`. If port 3306 is taken, use `-p 3307:3306` and `DB_PORT=3307`.

### Quarantined tests

Tests tagged `@quarantine` are left out of the normal run. Run them on their own:

```bash
npm run test:quarantine
```

See [Quarantine a flaky test](#quarantine-a-flaky-test) for how to tag one.

### Visual tests

Visual specs in `tests/visual/` compare screenshots with committed baselines. They only run in Docker, so fonts and anti-aliasing match on every machine:

```bash
npm run test:visual
npm run test:visual -- --update
```

The second command writes new baselines after an intended UI change. Review the new images in your PR. On Windows and macOS the first run is slower: the container installs its own Linux `node_modules` into a Docker volume.

### Quality checks

Run these before you push. CI runs the same ones:

| Command | Checks |
|---|---|
| `npm run lint` | ESLint (including Playwright rules), Prettier, Gherkin conventions |
| `npm run typecheck` | Strict TypeScript over everything |
| `npm run test:unit` | Unit tests for the framework code, with coverage thresholds |
| `npm run check` | Every Cucumber step is defined exactly once, and every spec loads |
| `npm run format` | Fixes formatting and the lint findings that can be fixed automatically |

The test runners strip types without checking them, so a type error never stops a run. Only `npm run typecheck` catches it.

### What CI does

`.github/workflows/playwright.yml` runs on every PR and every push to `main`:

| Job | Runs | Required to merge |
|---|---|---|
| Checks | Lint, type check, `npm audit`, unit tests, step and spec validation | Yes |
| Tests | Both suites against the demo app with a MySQL service, then quarantined tests (non-blocking) and the leftover-data check | Yes |
| Visual | Screenshot comparison in the Playwright Docker image | Yes |
| Publish Allure Report | On `main` only: publishes the report to GitHub Pages | No |

`.github/workflows/nightly.yml` runs every test on Chromium, Firefox and WebKit daily at 06:00 UTC. It isn't required to merge. For a failed PR run, download the `allure-results` and `test-artifacts` artifacts from the run's page.

## 3. Create tests

This section adds a new page end to end, with a Cucumber scenario and a Playwright spec, then an API test, a database check, and a quarantine. Every snippet was run against this repo.

The example is a contact page where a visitor sends a question. For your own app, skip step 1: the page already exists.

### Step 1: Add the page to the demo app

Create `demo-app/public/contact.html`:

```html
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Contact | Example Application</title>
    </head>
    <body>
        <main>
            <h1>Contact us</h1>
            <form id="contact-form" novalidate>
                <label for="email">Email</label>
                <input id="email" name="email" type="email" />
                <label for="question">Question</label>
                <textarea id="question" name="question"></textarea>
                <button type="submit">Send</button>
            </form>
            <p id="contact-status" role="status"></p>
        </main>
        <script>
            document.getElementById('contact-form').addEventListener('submit', (event) => {
                event.preventDefault();
                const email = document.getElementById('email').value.trim();
                const status = document.getElementById('contact-status');
                status.textContent = email.includes('@') ? 'Thanks, we will reply by email' : 'Enter a valid email';
            });
        </script>
    </body>
</html>
```

Add its route to `PAGES` in `demo-app/server.ts`:

```typescript
const PAGES: Record<string, string> = {
    '/': 'index.html',
    '/login': 'login.html',
    '/items': 'items.html',
    '/contact': 'contact.html',
};
```

### Step 2: Write the page object

Create `pages/ContactPage.ts`. Expose locators and user actions, and keep `expect` out of page objects:

```typescript
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Contact page ("/contact"). */
export class ContactPage extends BasePage {
    static override path = '/contact';

    readonly heading: Locator;
    readonly email: Locator;
    readonly question: Locator;
    readonly sendButton: Locator;
    readonly status: Locator;

    constructor(page: Page) {
        super(page);
        this.heading = page.getByRole('heading', { name: 'Contact us' });
        this.email = page.getByLabel('Email');
        this.question = page.getByLabel('Question');
        this.sendButton = page.getByRole('button', { name: 'Send' });
        this.status = page.getByRole('status');
    }

    async send(email: string, question: string): Promise<void> {
        await this.email.fill(email);
        await this.question.fill(question);
        await this.sendButton.click();
    }
}
```

`BasePage.open()` goes to `static path`. Prefer `getByRole` and `getByLabel`: they find elements the way a user does, and survive markup changes.

### Step 3: Make the page object available to both runners

For Cucumber, add a getter to `CustomWorld` in `utils/world.ts`, next to `itemsPage`:

```typescript
import { ContactPage } from '../pages/ContactPage';

    get contactPage(): ContactPage {
        return this.pageObject(ContactPage);
    }
```

For Playwright specs, add a fixture in `tests/fixtures.ts`: the import, a line in the `Fixtures` interface, and the fixture next to `itemsPage`:

```typescript
import { ContactPage } from '../pages/ContactPage';

    contactPage: ContactPage;

    contactPage: async ({ page }, use) => {
        await use(new ContactPage(page));
    },
```

### Step 4: Write the scenario and its steps

Create `features/ui/contact.feature`:

```gherkin
@ui @Regression
Feature: Contact page
  Visitors can send a question and see whether it was accepted.

  Background:
    Given I am on the contact page

  @Smoke
  Scenario: A question with a valid email is accepted
    When I send the question "When is my inspection?" from "pat@example.com"
    Then the contact page says "Thanks, we will reply by email"

  Scenario: An invalid email is rejected
    When I send the question "Hello" from "not-an-email"
    Then the contact page says "Enter a valid email"
```

Create `step_definitions/contact.steps.ts`. Import `Given`, `When` and `Then` from `utils/steps.ts`, not from Cucumber, so `this` is typed as the World and `this.contactPage` autocompletes:

```typescript
import { expect } from '@playwright/test';
import { Given, When, Then } from '../utils/steps';

Given('I am on the contact page', async function () {
    await this.contactPage.open();
});

When('I send the question {string} from {string}', async function (question: string, email: string) {
    await this.contactPage.send(email, question);
});

Then('the contact page says {string}', async function (message: string) {
    await expect(this.contactPage.status).toHaveText(message);
});
```

Use `async function`, never arrow functions: Cucumber passes the World as `this`. `toHaveText` retries until the text matches, so there's no need to wait.

### Step 5: Write the matching spec

Create `tests/ui/contact.spec.ts`. Import `test` and `expect` from `tests/fixtures.ts` to get the page object injected. Browser specs start logged in; that doesn't matter for a public page:

```typescript
import { test, expect } from '../fixtures';

test.describe('Contact page', () => {
    test('accepts a question with a valid email', { tag: '@smoke' }, async ({ contactPage }) => {
        await contactPage.open();
        await contactPage.send('pat@example.com', 'When is my inspection?');
        await expect(contactPage.status).toHaveText('Thanks, we will reply by email');
    });

    test('rejects an invalid email', async ({ contactPage }) => {
        await contactPage.open();
        await contactPage.send('not-an-email', 'Hello');
        await expect(contactPage.status).toHaveText('Enter a valid email');
    });
});
```

For a test that needs a logged-out visitor, add `test.use({ storageState: LOGGED_OUT })` to its `describe` (see `tests/ui/items.spec.ts`).

### Step 6: Add the accessibility checks

Every page gets an axe check in both runners. In `step_definitions/accessibility.steps.ts`, add the page to `PAGES`, so `Given I open the contact page` works:

```typescript
    contact: (world) => world.contactPage,
```

In `features/ui/accessibility.feature`, add a row to the public pages table (pages that need a login go in the `@authenticated` table):

```gherkin
    Examples: Public pages
      | page    |
      | form    |
      | login   |
      | contact |
```

In `tests/ui/accessibility.spec.ts`, add a test inside the `logged out` block:

```typescript
        test('contact page', async ({ contactPage, checkAccessibility }) => {
            await contactPage.open();
            await checkAccessibility();
        });
```

### Step 7: Run and check

```bash
npm run test:cucumber -- --name "valid email|invalid email"
npx playwright test tests/ui/contact.spec.ts
npm run test:cucumber -- --tags "@a11y"
npx playwright test --grep @a11y
npm run lint
npm run typecheck
npm run check
```

All of them should pass. `npm run check` fails if a step is undefined or matches two definitions. If lint reports formatting, run `npm run format`.

### Add an API test

API scenarios run without a browser. Tag them `@api`. Most API checks reuse existing steps from `step_definitions/api.steps.ts`. This scenario, added to `features/api/items.feature`, needs no new code:

```gherkin
  Scenario: Deleting an item twice returns 404 the second time
    Given I am authenticated with the API
    And I create an item named "Short-lived item"
    When I delete the created item
    And I delete the created item
    Then the response status is 404
```

`I create an item named` registers the item for cleanup, and the cleanup accepts a 404, so deleting it in the scenario is fine.

The same check as a spec, added to `tests/api/items.spec.ts`. `createItem` creates the item through the API and deletes it after the test:

```typescript
    test('returns 404 when an item is deleted twice', async ({ authedApi, createItem }) => {
        const item = await createItem();
        expect((await authedApi.delete(`/api/items/${item.id}`)).status).toBe(204);
        expect((await authedApi.delete(`/api/items/${item.id}`)).status).toBe(404);
    });
```

The clients to use:

| Runner | Anonymous | Logged in |
|---|---|---|
| Cucumber | `await this.api()` | `await this.authedApi()` |
| Playwright | `api` fixture | `authedApi` fixture |

In Cucumber, every request and response is attached to the report with passwords and tokens masked.

### Add a database check

Add a step to `step_definitions/db.steps.ts`. `this.db` is the `DbClient` (parameterized queries only). Wrap the query in `expect.poll`, so it retries until the database agrees with the API:

```typescript
Then('the database has {int} item(s) named {string}', async function (count: number, name: string) {
    await expect
        .poll(() => this.db.count('items', 'name = ?', [name]), { message: `rows named "${name}" in items` })
        .toBe(count);
});
```

Use it in `features/db/items-persistence.feature`, whose feature-level tags (`@api @db`) and `Background` (`Given I am authenticated with the API`) apply to the new scenario:

```gherkin
  Scenario: An item name is stored exactly once
    When I create an item named "Lateral 9 inspection"
    Then the database has 1 item named "Lateral 9 inspection"
```

Run it with a database (see [Database scenarios](#database-scenarios)):

```bash
DB_HOST=127.0.0.1 DB_USER=tester DB_PASSWORD=tester DB_NAME=testdb npm run test:cucumber -- --tags "@db"
```

`DbClient` also has `query()` for all rows, `one()` for the first row and `execute()` for writes.

### Clean up what you create

Every test deletes what it creates, pass or fail. CI fails if rows are left behind.

| Runner | Created through the API | Created another way (the UI, a script) |
|---|---|---|
| Cucumber | `this.cleanUpItem(item)` | `this.addCleanup(async () => { ... })` |
| Playwright | `createItem()` | `trackItem(item)` |

For your own data, write cleanups the same way: `addCleanup` takes any async function, and runs it after the scenario, last registered first.

### Quarantine a flaky test

1. Open a ticket for it.
2. Tag the scenario with `@quarantine` and the ticket:
   ```gherkin
     @quarantine @jira:QA-123
     Scenario: An invalid email is rejected
   ```
   For a spec, put `@quarantine` and the ticket in its title.
3. It no longer runs in `npm test`. `npm run test:quarantine` runs it, and CI runs it in a step that reports but never blocks a merge.
4. Fix the cause and remove the tag.

`npm run lint` rejects `@quarantine` without a `@jira:ABC-123` tag:

```
features/ui/contact.feature:14  Quarantined scenario "An invalid email is rejected" needs a @jira:ABC-123 tag  [quarantine-ticket]
```

## 4. Point it at your own app

1. **Settings.** Copy `.env.example` to `.env` and set:
   ```bash
   BASE_URL=https://your-app.example.com
   APP_USERNAME=your-test-user
   APP_PASSWORD=your-test-password
   ```
   Set `API_BASE_URL` if the API is on another host. When `BASE_URL` is set, the demo app isn't started and the demo credentials are never used. In CI, put the credentials in repository secrets (the workflow has the lines to uncomment).
2. **Login.** Both runners log in through `POST /api/login` with `{ username, password }`. Change the endpoint and payload in `tests/auth.setup.ts` (Playwright) and `utils/authState.ts` (Cucumber's `@authenticated` session). Change `ApiClient.login()` in `utils/apiClient.ts` if your API returns its token differently. If your app has no login API, log in through the UI with `LoginPage` in those two files instead.
3. **Page objects.** Replace `pages/FormPage.ts`, `pages/LoginPage.ts` and `pages/ItemsPage.ts` with your pages, and update the getters in `utils/world.ts`, the fixtures in `tests/fixtures.ts`, and `PAGES` in `step_definitions/accessibility.steps.ts`.
4. **Tests.** Replace the examples in `features/`, `step_definitions/` and `tests/`. Keep `tests/auth.setup.ts`.
5. **Test data.** Replace `createItem`, `trackItem` and `cleanUpItem` with factories and cleanups for your own data. If you use the database checks, set `TABLES` in `utils/checkLeftoverData.ts` to the tables your tests write to.
6. **Visual baselines.** Delete `tests/visual/__screenshots__/` and run `npm run test:visual -- --update` to take baselines of your pages. Visual tests always run against the demo app inside Docker, so point `tests/visual/pages.spec.ts` at pages you can reach from the container, or remove the visual tests.
7. **Demo app.** Delete `demo-app/` once nothing needs it. It's used in four places: the `webServer` block in `playwright.config.ts`, the `BeforeAll` hook in `hooks/hooks.ts`, `unit/apiClient.test.ts` (which tests `ApiClient` against it), and the `demo` and `test:unit` scripts in `package.json` (coverage includes `demo-app/server.ts`). Run `npm run typecheck` afterwards to find anything left.

Run `npm run lint`, `npm run typecheck` and `npm test` after each step.

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| `browserType.launch: Executable doesn't exist at ...` | The browser isn't installed: `npx playwright install chromium` (or the `TEST_BROWSER` you chose) |
| `TEST_BROWSER must be one of chromium, firefox, webkit, got "chrome"` | Settings are checked at startup. Use one of the listed values. The same kind of message names any other invalid variable |
| `APP_USERNAME and APP_PASSWORD must be set for this app. Copy .env.example to .env.` | `BASE_URL` points at a real app, so the demo credentials aren't used. Set both variables |
| `Visual tests must run in Docker for stable screenshots: npm run test:visual` | You ran a visual spec directly. Use `npm run test:visual` |
| `@db` scenarios don't run | They're filtered out unless `DB_HOST` is set. See [Database scenarios](#database-scenarios) |
| `Database is not configured. Set DB_HOST (see .env.example).` | A step used `this.db` in a scenario that runs without a database. Tag the scenario `@db` |
| `No browser page: this scenario is tagged @api.` | A step used a page object in an `@api` scenario. Remove `@api`, or use the API instead |
| `Undefined scenarios:` and the run fails | A step has no definition (Cucumber runs in strict mode). Add the step, or fix its wording to match an existing one. `npm run check` lists every undefined or ambiguous step without opening a browser |
| Running a feature file path runs every feature | Cucumber adds CLI paths to the configured ones. Use `--tags` or `--name` (see [Run part of the suite](#run-part-of-the-suite)) |
| Tests pass but `npm run typecheck` fails | Expected: the runners don't check types. Fix the type error; CI requires the type check |
| ESLint `Promises must be awaited` (`no-floating-promises`) | A Playwright call is missing `await`, the most common cause of flaky tests. Add `await` |
| `toMatchAriaSnapshot` in a Cucumber step fails or doesn't exist | That matcher only works inside Playwright Test. In Cucumber, use `Then the page structure is:` with the YAML as a doc string |
| After a Dependabot bump of `@cucumber/cucumber`, type errors about two copies of `@cucumber/messages` | Set `@cucumber/messages` and `@cucumber/gherkin` to the exact versions Cucumber pins. `npm run test:unit` fails and prints the command |
| After a bump of `@playwright/test`, a unit test fails on the `Dockerfile` | Update the `FROM` line to the image the test names. Visual baselines may also need `npm run test:visual -- --update` |
| `docker compose run` runs old code | Add `--build`: `docker compose run --build --rm tests` |
| `npm run report` fails with a Java error | The Allure command line needs Java 8 or newer on your `PATH` |
| Specs run against the wrong app, or fail in CI with `http://127.0.0.1:4173/ is already used` | Locally, Playwright reuses whatever already listens on the demo app's port (fine when it's `npm run demo`). Stop the other program, or set `DEMO_APP_PORT` to a free port. Cucumber always starts its own demo app on a free port |
| `HEADLESS=false npm test` fails on Windows | That syntax is for bash. In PowerShell: `$env:HEADLESS="false"; npm test` |
| A test is flaky | Don't add retries or waits. Find the cause in the trace (`npx playwright show-trace`), and quarantine it with a ticket until it's fixed |

## 6. Command cheat sheet

| Task | Command |
|---|---|
| Install | `npm install` then `npx playwright install chromium` |
| Run everything | `npm test` |
| Playwright specs only | `npm run test:playwright` |
| Cucumber scenarios only | `npm run test:cucumber` |
| Cucumber by tag | `npm run test:cucumber -- --tags "@Smoke"` |
| Cucumber by scenario name | `npm run test:cucumber -- --name "Log in with valid credentials"` |
| One spec file | `npx playwright test tests/ui/login.spec.ts` |
| Specs by tag | `npx playwright test --grep @smoke` |
| Visible browser | `HEADLESS=false npm test` |
| Playwright UI mode | `npx playwright test --ui` |
| Debug a spec | `npx playwright test tests/ui/login.spec.ts --debug` |
| Another browser | `TEST_BROWSER=firefox npm test` |
| Database scenarios | `DB_HOST=127.0.0.1 DB_USER=tester DB_PASSWORD=tester DB_NAME=testdb npm test` |
| Leftover data check | `npm run check:leftovers` (with the `DB_*` variables) |
| Quarantined tests | `npm run test:quarantine` |
| Visual tests | `npm run test:visual` |
| Update visual baselines | `npm run test:visual -- --update` |
| Everything in Docker | `docker compose run --build --rm tests` |
| Report | `npm run report` |
| Open a trace | `npx playwright show-trace traces/<file>.zip` |
| Lint | `npm run lint` |
| Fix formatting | `npm run format` |
| Type check | `npm run typecheck` |
| Framework unit tests | `npm run test:unit` |
| Validate steps and specs | `npm run check` |
| Start the demo app | `npm run demo` (http://127.0.0.1:4173) |

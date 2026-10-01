# Contributing

Thanks for helping improve the framework. The code is strict TypeScript; `npm run typecheck` must pass. This page covers how to set up, what a good change looks like, and what CI checks before anything reaches `main`.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # optional; the demo app needs no settings
npm test
```

Or run everything in Docker, MySQL included: `docker compose run --build --rm tests`.

## Making a change

1. Branch from `main`. Direct pushes to `main` are blocked.
2. Make the change, with tests. A new utility gets a unit test in `unit/`; a new page gets a page object, an accessibility row and, if its look matters, a visual test.
3. Before pushing, run the same checks CI runs:
   ```bash
   npm run lint        # ESLint, Prettier, Gherkin lint
   npm run typecheck   # strict type check
   npm run test:unit   # framework unit tests, with coverage thresholds
   npm run check       # every Cucumber step defined once, every spec loads
   npm test            # both suites
   ```
   `npm run format` fixes most lint findings automatically.
4. Open a PR. It merges once the `Checks` and `Tests` jobs pass, and is squash-merged so `main` stays linear.

## Conventions

**Tests**
- Page objects expose locators (prefer `getByRole` and `getByLabel`) and user actions. Assertions live in steps and specs.
- No hard-coded waits (`waitForTimeout`) or `networkidle`: Playwright waits automatically, and lint rejects both.
- Every test cleans up what it creates: use `createItem` / `trackItem` in specs, `this.addCleanup()` in steps. CI fails if rows are left behind.
- Credentials and other secrets come from environment variables, never from committed files.

**Gherkin**
- Tags must be in the allowlist in `utils/lintGherkin.ts`. Add new tags there so they're documented.
- Every scenario needs a `Then`. Scenario names are unique within a feature.
- Import `Given`/`When`/`Then` from `utils/steps.ts` so `this` is typed.

**Flaky tests**
- Don't retry your way past a flaky test. Tag it `@quarantine` with a ticket (`@jira:ABC-123`), fix the cause, and remove the tag. Quarantined tests still run and report in CI, without blocking merges.

**Visual baselines**
- Update them only with `npm run test:visual -- --update` (Docker), and review the image diff in the PR.

## Versions and changelog

The project follows [semantic versioning](https://semver.org). Add your change under **Unreleased** in [CHANGELOG.md](CHANGELOG.md). When releasing, move those entries under a new version, bump `version` in `package.json`, and tag the merge commit (`git tag vX.Y.Z && git push origin vX.Y.Z`).

When Dependabot bumps `@cucumber/cucumber`, also set `@cucumber/messages` and `@cucumber/gherkin` to the exact versions it pins (Dependabot is told to skip them; `npm run test:unit` prints the command). When Dependabot bumps `@playwright/test`, update the `FROM` line in the `Dockerfile` to match. A unit test fails with the exact line to use until you do. Visual baselines may also need `npm run test:visual -- --update` after a browser update.

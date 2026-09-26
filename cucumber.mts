/**
 * Cucumber configuration. Runner settings come from config/index.ts, shared with
 * playwright.config.ts. Loaded with `--config cucumber.mts` through tsx (see the
 * `test:cucumber` script), which also compiles the step definitions and hooks.
 * It is an ES module (.mts) because Cucumber imports TypeScript configs as ESM and
 * reads their default export directly.
 *
 * Tags: @db scenarios run only when a database is configured (DB_HOST).
 * @quarantine scenarios are skipped, and run on their own with npm run test:quarantine.
 * Add your own filter with: npm run test:cucumber -- --tags "@Smoke"
 */
import { config } from './config/index.ts';

const links = config.jiraBaseUrl
    ? {
          jira: {
              pattern: [/^@jira:(.*)$/],
              urlTemplate: (value: string) => `${config.jiraBaseUrl}/browse/${value.replace('@jira:', '')}`,
          },
      }
    : {};

export default {
    paths: ['features/**/*.feature'],
    require: ['step_definitions/**/*.ts', 'hooks/hooks.ts'],
    format: [
        'summary',
        // Allure writes its results to allure-results/; the stream path keeps it off stdout
        ['allure-cucumberjs/reporter', 'allure-results/.cucumber-reporter.log'],
    ],
    formatOptions: { snippetInterface: 'async-await', links },
    tags: [config.quarantine ? '@quarantine' : 'not @quarantine', config.db ? '' : 'not @db']
        .filter(Boolean)
        .join(' and '),
    parallel: config.workers,
    retry: config.retries,
    strict: true,
};

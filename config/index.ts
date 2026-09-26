/**
 * Single source of test configuration for both runners (Playwright Test and Cucumber).
 *
 * Precedence: environment variables > .env file > config/testConfig.json defaults.
 * Secrets (credentials, tokens, DB passwords) come only from the environment, never
 * from committed files. See .env.example for every supported variable.
 */
import fs from 'fs';
import path from 'path';

export const ROOT = path.resolve(__dirname, '..');

const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
const ARTIFACT_MODES = ['off', 'on', 'retain-on-failure'] as const;

export type BrowserName = (typeof BROWSERS)[number];
export type ArtifactMode = (typeof ARTIFACT_MODES)[number];

export interface DbConfig {
    host: string;
    port: number;
    user?: string | undefined;
    password?: string | undefined;
    database?: string | undefined;
}

/** Shape of config/testConfig.json */
export interface Defaults {
    baseUrl: string;
    environment: string;
    browser: BrowserName;
    headless: boolean;
    viewport: { width: number; height: number };
    timeouts: { action: number; navigation: number; expect: number; test: number };
    video: ArtifactMode;
    trace: ArtifactMode;
}

export interface Credentials {
    username: string;
    password: string;
}

// Demo app credentials are public on purpose: they only unlock the bundled demo app
export const DEMO_CREDENTIALS: Readonly<Credentials> = { username: 'demo', password: 'demo-password' };

type Env = Record<string, string | undefined>;

function loadEnvFile(file = path.join(ROOT, '.env')): void {
    if (fs.existsSync(file)) {
        process.loadEnvFile(file);
    }
}

function parseBoolean(name: string, value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === '') return fallback;
    if (/^(1|true|yes)$/i.test(value)) return true;
    if (/^(0|false|no)$/i.test(value)) return false;
    throw new Error(`${name} must be true or false, got "${value}"`);
}

function parseInteger(name: string, value: string | undefined, fallback: number): number {
    if (value === undefined || value === '') return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
        throw new Error(`${name} must be a non-negative integer, got "${value}"`);
    }
    return number;
}

function oneOf<T extends string>(name: string, value: string, allowed: readonly T[]): T {
    if (!(allowed as readonly string[]).includes(value)) {
        throw new Error(`${name} must be one of ${allowed.join(', ')}, got "${value}"`);
    }
    return value as T;
}

const trimSlash = (url: string) => url.replace(/\/+$/, '');

/**
 * Builds the configuration object from defaults and an environment.
 * Exported separately from the cached config so it can be unit tested.
 */
export function buildConfig(env: Env, defaults: Defaults) {
    const isCI = parseBoolean('CI', env.CI, false);
    const baseUrl = trimSlash(env.BASE_URL || defaults.baseUrl || '');
    const useDemoApp = baseUrl === '';

    const username = env.APP_USERNAME || (useDemoApp ? DEMO_CREDENTIALS.username : undefined);
    const password = env.APP_PASSWORD || (useDemoApp ? DEMO_CREDENTIALS.password : undefined);

    const db: Readonly<DbConfig> | null = env.DB_HOST
        ? Object.freeze({
              host: env.DB_HOST,
              port: parseInteger('DB_PORT', env.DB_PORT, 3306),
              user: env.DB_USER,
              password: env.DB_PASSWORD,
              database: env.DB_NAME,
          })
        : null;

    return Object.freeze({
        isCI,
        environment: env.TEST_ENV || defaults.environment,
        useDemoApp,
        baseUrl,
        demoAppPort: parseInteger('DEMO_APP_PORT', env.DEMO_APP_PORT, 4173),
        apiBaseUrl: trimSlash(env.API_BASE_URL || baseUrl),
        browser: oneOf('TEST_BROWSER', env.TEST_BROWSER || defaults.browser, BROWSERS),
        headless: parseBoolean('HEADLESS', env.HEADLESS, isCI ? true : defaults.headless),
        viewport: Object.freeze({ ...defaults.viewport }),
        timeouts: Object.freeze({
            action: parseInteger('ACTION_TIMEOUT', env.ACTION_TIMEOUT, defaults.timeouts.action),
            navigation: parseInteger('NAVIGATION_TIMEOUT', env.NAVIGATION_TIMEOUT, defaults.timeouts.navigation),
            expect: parseInteger('EXPECT_TIMEOUT', env.EXPECT_TIMEOUT, defaults.timeouts.expect),
            test: parseInteger('TEST_TIMEOUT', env.TEST_TIMEOUT, defaults.timeouts.test),
        }),
        retries: parseInteger('RETRIES', env.RETRIES, isCI ? 1 : 0),
        workers: parseInteger('WORKERS', env.WORKERS, isCI ? 2 : 4),
        video: oneOf('VIDEO', env.VIDEO || defaults.video, ARTIFACT_MODES),
        trace: oneOf('TRACE', env.TRACE || defaults.trace, ARTIFACT_MODES),
        credentials: Object.freeze({ username, password }),
        db,
        jiraBaseUrl: trimSlash(env.JIRA_BASE_URL || ''),
        logLevel: env.LOG_LEVEL || (isCI ? 'info' : 'warn'),
        // Run only @quarantine tests (flaky tests that report but don't block merges)
        quarantine: parseBoolean('QUARANTINE', env.QUARANTINE, false),
        // Run only visual tests; they must run in Docker (npm run test:visual) for stable pixels
        visual: parseBoolean('VISUAL', env.VISUAL, false),
        inDocker: parseBoolean('IN_DOCKER', env.IN_DOCKER, false),
    });
}

export type Config = ReturnType<typeof buildConfig>;

/** Returns credentials for the application under test, or throws with setup instructions. */
export function requireCredentials(config: {
    credentials: { username?: string | undefined; password?: string | undefined };
}): Credentials {
    const { username, password } = config.credentials;
    if (!username || !password) {
        throw new Error('APP_USERNAME and APP_PASSWORD must be set for this app. Copy .env.example to .env.');
    }
    return { username, password };
}

loadEnvFile();
const defaults = JSON.parse(fs.readFileSync(path.join(__dirname, 'testConfig.json'), 'utf8')) as Defaults;

export const config: Config = buildConfig(process.env, defaults);

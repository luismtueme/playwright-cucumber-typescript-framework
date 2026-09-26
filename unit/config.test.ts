import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig, requireCredentials, DEMO_CREDENTIALS, type Defaults } from '../config';

const defaults: Defaults = {
    baseUrl: '',
    environment: 'local',
    browser: 'chromium',
    headless: false,
    viewport: { width: 1280, height: 720 },
    timeouts: { action: 10000, navigation: 30000, expect: 5000, test: 60000 },
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
};

test('uses the demo app and demo credentials when BASE_URL is empty', () => {
    const config = buildConfig({}, defaults);
    assert.equal(config.useDemoApp, true);
    assert.deepEqual({ ...config.credentials }, DEMO_CREDENTIALS);
});

test('never falls back to demo credentials for a real app', () => {
    const config = buildConfig({ BASE_URL: 'https://app.example.com' }, defaults);
    assert.equal(config.useDemoApp, false);
    assert.equal(config.credentials.username, undefined);
    assert.throws(() => requireCredentials(config), /APP_USERNAME and APP_PASSWORD must be set/);
});

test('environment variables override defaults', () => {
    const config = buildConfig(
        {
            BASE_URL: 'https://app.example.com/',
            TEST_BROWSER: 'firefox',
            HEADLESS: 'false',
            ACTION_TIMEOUT: '2500',
            APP_USERNAME: 'qa',
            APP_PASSWORD: 'secret',
        },
        defaults,
    );
    assert.equal(config.baseUrl, 'https://app.example.com', 'trailing slash is stripped');
    assert.equal(config.apiBaseUrl, 'https://app.example.com', 'API defaults to BASE_URL');
    assert.equal(config.browser, 'firefox');
    assert.equal(config.headless, false);
    assert.equal(config.timeouts.action, 2500);
    assert.deepEqual(requireCredentials(config), { username: 'qa', password: 'secret' });
});

test('CI defaults: headless, retries and fewer workers', () => {
    const local = buildConfig({}, defaults);
    const ci = buildConfig({ CI: 'true' }, defaults);
    assert.deepEqual([local.headless, local.retries], [false, 0]);
    assert.deepEqual([ci.headless, ci.retries, ci.workers], [true, 1, 2]);
});

test('database config is present only when DB_HOST is set', () => {
    assert.equal(buildConfig({}, defaults).db, null);
    const { db } = buildConfig({ DB_HOST: 'localhost', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'd' }, defaults);
    assert.deepEqual({ ...db }, { host: 'localhost', port: 3306, user: 'u', password: 'p', database: 'd' });
});

test('invalid values fail fast with the variable name', () => {
    assert.throws(() => buildConfig({ TEST_BROWSER: 'ie11' }, defaults), /TEST_BROWSER must be one of/);
    assert.throws(() => buildConfig({ HEADLESS: 'maybe' }, defaults), /HEADLESS must be true or false/);
    assert.throws(() => buildConfig({ WORKERS: '-1' }, defaults), /WORKERS must be a non-negative integer/);
    assert.throws(() => buildConfig({ VIDEO: 'always' }, defaults), /VIDEO must be one of/);
});

test('config is immutable', () => {
    const config = buildConfig({}, defaults);
    assert.throws(() => {
        'use strict';
        // @ts-expect-error: assigning to a read-only property is the point of this test
        config.baseUrl = 'changed';
    }, TypeError);
});

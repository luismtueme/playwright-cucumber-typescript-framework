import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '@playwright/test';
import { redact } from '../utils/apiClient';
import { createLogger } from '../utils/logger';
import { wrapStepFunction, AssertionError } from '../utils/stepErrorStatus';
import { allureCategories as categories } from '../utils/allureCategories';

test('redact masks credentials at any depth and keeps other fields', () => {
    const input = {
        request: { headers: { Authorization: 'Bearer abc', Accept: 'json' }, body: { username: 'qa', password: 'x' } },
        response: { body: { token: 't', items: [{ apiKey: 'k', name: 'n' }] } },
    };
    assert.deepEqual(redact(input), {
        request: { headers: { Authorization: '***', Accept: 'json' }, body: { username: 'qa', password: '***' } },
        response: { body: { token: '***', items: [{ apiKey: '***', name: 'n' }] } },
    });
});

test('logger only prints messages at or above its level', (t) => {
    const printed: string[] = [];
    t.mock.method(console, 'log', (message: string) => printed.push(message));
    t.mock.method(console, 'warn', (message: string) => printed.push(message));
    const log = createLogger('unit', 'warn');
    log.debug('hidden');
    log.info('hidden');
    log.warn('shown');
    assert.deepEqual(printed, ['[WARN] [unit] shown']);
});

test('Playwright assertion errors are re-thrown as AssertionError', async () => {
    const step = wrapStepFunction(() => {
        expect(1).toBe(2);
    });
    await assert.rejects(step(), (error) => {
        assert.ok(error instanceof AssertionError);
        assert.equal(error.constructor.name, 'AssertionError');
        assert.match(error.message, /toBe/);
        return true;
    });
});

test('other errors pass through unchanged', async () => {
    const original = new TypeError('boom');
    const step = wrapStepFunction(() => {
        throw original;
    });
    await assert.rejects(step(), (error) => error === original);
});

test('wrapped steps keep their arity (Cucumber validates parameter counts)', () => {
    const wrapped = wrapStepFunction(function (_a: string, _b: number) {});
    assert.equal(wrapped.length, 2);
});

test('Allure categories: specific categories come before catch-alls', () => {
    const names = categories.map((c) => c.name);
    assert.ok(names.indexOf('Infrastructure Problem') < names.indexOf('Application Bug'));
    assert.ok(names.indexOf('Flaky Test') < names.indexOf('Test Defect'));
});

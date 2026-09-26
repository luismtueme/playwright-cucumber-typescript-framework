/**
 * Custom Playwright Test fixtures. Import `test` and `expect` from here instead of
 * '@playwright/test' to get page objects, API clients and test data injected:
 *
 *   test('...', async ({ itemsPage, createItem }) => { ... })
 *
 * Browser tests start logged in (session saved once by tests/auth.setup.ts).
 * Use `test.use({ storageState: LOGGED_OUT })` for tests that need a fresh visitor.
 */
import { test as base, expect } from '@playwright/test';
import { config, requireCredentials, type Credentials } from '../config';
import { ApiClient } from '../utils/apiClient';
import { FormPage } from '../pages/FormPage';
import { LoginPage } from '../pages/LoginPage';
import { ItemsPage, type Item } from '../pages/ItemsPage';
import { findAccessibilityViolations, formatViolations, type AccessibilityOptions } from '../utils/accessibility';

/** storageState for a visitor with no session */
export const LOGGED_OUT = { cookies: [], origins: [] };

export interface Fixtures {
    credentials: Credentials;
    formPage: FormPage;
    loginPage: LoginPage;
    itemsPage: ItemsPage;
    /** Unauthenticated API client; never carries the saved browser session */
    api: ApiClient;
    /** API client logged in with the configured credentials */
    authedApi: ApiClient;
    /** Deletes an item after the test (pass or fail); for items created outside createItem */
    trackItem: (item: { id: number }) => void;
    /** Creates an item through the API and deletes it after the test */
    createItem: (overrides?: { name?: string }) => Promise<Item>;
    /** Runs axe on the current page, attaches the results, and fails on any violation */
    checkAccessibility: (options?: AccessibilityOptions) => Promise<void>;
}

export const test = base.extend<Fixtures>({
    credentials: async ({}, use) => {
        await use(requireCredentials(config));
    },

    formPage: async ({ page }, use) => {
        await use(new FormPage(page));
    },
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    itemsPage: async ({ page }, use) => {
        await use(new ItemsPage(page));
    },

    checkAccessibility: async ({ page }, use, testInfo) => {
        await use(async (options) => {
            const violations = await findAccessibilityViolations(page, options);
            await testInfo.attach('accessibility-violations.json', {
                body: JSON.stringify(violations, null, 2),
                contentType: 'application/json',
            });
            expect(violations, formatViolations(violations)).toEqual([]);
        });
    },

    api: async ({ playwright, baseURL }, use) => {
        const context = await playwright.request.newContext({
            baseURL: config.apiBaseUrl || baseURL,
            // Playwright applies the test's storageState to new request contexts too
            storageState: LOGGED_OUT,
        });
        await use(new ApiClient(context));
        await context.dispose();
    },

    authedApi: async ({ playwright, baseURL, credentials }, use) => {
        const context = await playwright.request.newContext({
            baseURL: config.apiBaseUrl || baseURL,
            // Playwright applies the test's storageState to new request contexts too
            storageState: LOGGED_OUT,
        });
        const api = new ApiClient(context);
        await api.login(credentials.username, credentials.password);
        await use(api);
        await context.dispose();
    },

    trackItem: async ({ authedApi }, use) => {
        const ids: number[] = [];
        await use((item) => {
            ids.push(item.id);
        });
        for (const id of ids.reverse()) {
            const { status } = await authedApi.delete(`/api/items/${id}`);
            // 404: the test already deleted it
            if (status !== 204 && status !== 404) throw new Error(`Cleanup of item ${id} failed: HTTP ${status}`);
        }
    },

    createItem: async ({ authedApi, trackItem }, use) => {
        await use(async (overrides = {}) => {
            const name = overrides.name ?? `Test item ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const response = await authedApi.post<Item>('/api/items', { name, ...overrides });
            if (response.status !== 201) throw new Error(`createItem failed: HTTP ${response.status}`);
            trackItem(response.body);
            return response.body;
        });
    },
});

export { expect };

/**
 * Returns `value`, or throws `message` if it's null or undefined. Narrows the type
 * for the code after it, without an `if` in the test body.
 */
export function defined<T>(value: T | null | undefined, message: string): T {
    if (value === null || value === undefined) throw new Error(message);
    return value;
}

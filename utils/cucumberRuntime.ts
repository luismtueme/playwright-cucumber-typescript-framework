/**
 * Per-worker state shared between Cucumber hooks and the World.
 * Each parallel Cucumber worker is a separate process with its own copy.
 */
import type { Browser } from '@playwright/test';
import type { DbClient } from './dbClient';

export const runtime: {
    browser: Browser | null;
    /** Base URL of the app under test (the demo app's URL when BASE_URL is empty) */
    baseUrl: string;
    apiBaseUrl: string;
    db: DbClient | null;
} = {
    browser: null,
    baseUrl: '',
    apiBaseUrl: '',
    db: null,
};

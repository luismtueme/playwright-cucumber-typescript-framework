/**
 * Saved login session shared by both runners.
 *
 * Playwright Test: tests/auth.setup.ts writes AUTH_FILE once per run.
 * Cucumber: getAuthState() logs in once per worker and keeps the state in memory.
 * The file holds live session cookies, so .auth/ is git-ignored.
 */
import path from 'path';
import { request, type BrowserContext } from '@playwright/test';
import { config, requireCredentials, ROOT } from '../config';

export const AUTH_FILE = path.join(ROOT, '.auth', 'user.json');

export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

let pending: Promise<StorageState> | null = null;

/** Logs in via the API and returns a Playwright storageState. Memoized, so each process logs in once. */
export function getAuthState(baseURL: string): Promise<StorageState> {
    pending ??= (async () => {
        const { username, password } = requireCredentials(config);
        const context = await request.newContext({ baseURL });
        try {
            const response = await context.post('/api/login', { data: { username, password } });
            if (!response.ok()) throw new Error(`Login for saved session failed: HTTP ${response.status()}`);
            return await context.storageState();
        } finally {
            await context.dispose();
        }
    })();
    return pending;
}

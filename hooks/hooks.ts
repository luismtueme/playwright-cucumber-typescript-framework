/**
 * Cucumber lifecycle hooks.
 *
 * Per worker: start the demo app (unless BASE_URL is set), launch one browser,
 * open the DB pool. Per scenario: a fresh browser context (skipped for @api).
 * On failure: screenshot, Playwright trace and video are attached to Allure.
 */
import {
    Before,
    After,
    BeforeAll,
    AfterAll,
    Status,
    setDefaultTimeout,
    setDefinitionFunctionWrapper,
} from '@cucumber/cucumber';
import { chromium, firefox, webkit } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { runtime } from '../utils/cucumberRuntime';
import { DbClient } from '../utils/dbClient';
import { writeAllureMetadata } from '../utils/allureMetadata';
import { startDemoApp, type DemoApp } from '../demo-app/server';
import { getAuthState } from '../utils/authState';
import { createLogger } from '../utils/logger';
import { wrapStepFunction } from '../utils/stepErrorStatus';
import type { CustomWorld } from '../utils/world';
import '../utils/world';

const log = createLogger('hooks');
const BROWSER_TYPES = { chromium, firefox, webkit };
let demoApp: DemoApp | null = null;

setDefaultTimeout(config.timeouts.test);
// Report Playwright assertion failures as "failed" (not "broken") in Allure
setDefinitionFunctionWrapper(wrapStepFunction);

BeforeAll(async function () {
    if (config.useDemoApp) {
        // Port 0: every parallel worker gets its own demo app on a free port
        demoApp = await startDemoApp({ port: 0 });
        log.debug(`Demo app started at ${demoApp.url}`);
    }
    runtime.baseUrl = demoApp ? demoApp.url : config.baseUrl;
    runtime.apiBaseUrl = config.apiBaseUrl || runtime.baseUrl;
    runtime.browser = await BROWSER_TYPES[config.browser].launch({ headless: config.headless });
    if (config.db) runtime.db = new DbClient(config.db);

    // One worker writes report metadata (CUCUMBER_WORKER_ID is unset when not parallel)
    if (!process.env.CUCUMBER_WORKER_ID || process.env.CUCUMBER_WORKER_ID === '0') {
        writeAllureMetadata({ baseUrl: config.useDemoApp ? '(demo app)' : runtime.baseUrl });
    }
});

Before<CustomWorld>({ tags: 'not @api' }, async function ({ pickle }) {
    // @authenticated scenarios start logged in (session saved once per worker)
    const authenticated = pickle.tags.some((tag) => tag.name === '@authenticated');
    await this.openPage({ storageState: authenticated ? await getAuthState(runtime.baseUrl) : undefined });
});

After<CustomWorld>(async function ({ pickle, result }) {
    const failed = result?.status === Status.FAILED;
    const slug = `${pickle.name.replace(/[^a-z0-9]+/gi, '_')}_${Date.now()}`;

    // Test data first, while the API client is still open. A failed cleanup is
    // reported but doesn't change the scenario's result; CI's leftover-data check catches leaks.
    const cleanupErrors = await this.runCleanups();
    for (const error of cleanupErrors) {
        log.warn(`Cleanup failed in "${pickle.name}": ${error.message}`);
        this.attach(error.stack ?? error.message, { mediaType: 'text/plain', fileName: 'cleanup-error.txt' });
    }

    if (this.page && failed) {
        this.attach(await this.page.screenshot({ fullPage: true }), {
            mediaType: 'image/png',
            fileName: 'screenshot.png',
        });
    }

    if (this.context && config.trace !== 'off') {
        if (failed || config.trace === 'on') {
            const tracePath = path.join('traces', `${slug}.zip`);
            await this.context.tracing.stop({ path: tracePath });
            this.attach(fs.readFileSync(tracePath), { mediaType: 'application/zip', fileName: 'trace.zip' });
        } else {
            await this.context.tracing.stop();
        }
    }

    // The video file is complete only after its context closes
    const video = this.page?.video();
    await this.context?.close();
    if (video) {
        const videoPath = await video.path();
        if (failed || config.video === 'on') {
            this.attach(fs.readFileSync(videoPath), { mediaType: 'video/webm', fileName: 'video.webm' });
        } else {
            fs.rmSync(videoPath, { force: true });
        }
    }

    await this.apiClient?.dispose();
});

AfterAll(async function () {
    await runtime.browser?.close();
    await runtime.db?.close();
    await demoApp?.close();
});

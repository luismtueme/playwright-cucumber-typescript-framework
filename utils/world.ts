/**
 * Cucumber World: per-scenario state available as `this` in steps and hooks.
 *
 *   this.page          Playwright Page (UI scenarios; not created for @api).
 *                      @authenticated scenarios start with a saved login session.
 *   this.formPage      page objects, created on first use
 *   this.api()         ApiClient; request/response pairs are attached to the report
 *   this.authedApi()   ApiClient logged in with the configured credentials
 *   this.addCleanup()  registers an async function to run after the scenario
 *   this.db            DbClient (@db scenarios)
 *   this.config        shared configuration (config/index.ts)
 */
import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber';
import type { BrowserContext, BrowserContextOptions, Page } from '@playwright/test';
import { config, requireCredentials, type Config } from '../config';
import { runtime } from './cucumberRuntime';
import { ApiClient, type ApiResponse } from './apiClient';
import type { DbClient } from './dbClient';
import { FormPage } from '../pages/FormPage';
import { LoginPage } from '../pages/LoginPage';
import { ItemsPage } from '../pages/ItemsPage';

export interface ItemRef {
    id: number;
    name: string;
}

export class CustomWorld extends World {
    readonly config: Config = config;
    context: BrowserContext | null = null;
    page: Page | null = null;
    apiClient: ApiClient | null = null;
    /** Last API response, for assertion steps */
    response: ApiResponse | null = null;
    /** Item created by the scenario, for later steps */
    createdItem: ItemRef | null = null;
    private readonly pageObjects = new Map<new (page: Page) => object, object>();
    private cleanups: Array<() => Promise<void>> = [];

    constructor(options: IWorldOptions) {
        super(options);
    }

    /**
     * Registers test data cleanup. Runs after the scenario (pass or fail), last
     * registered first, before the browser and API clients close.
     */
    addCleanup(fn: () => Promise<void>): void {
        this.cleanups.push(fn);
    }

    /** Runs registered cleanups; returns the errors instead of throwing. */
    async runCleanups(): Promise<Error[]> {
        const errors: Error[] = [];
        for (const fn of this.cleanups.reverse()) {
            try {
                await fn();
            } catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
        this.cleanups = [];
        return errors;
    }

    /** Deletes an item after the scenario; a 404 means the scenario already deleted it. */
    cleanUpItem(item: ItemRef): void {
        this.addCleanup(async () => {
            const { status } = await (await this.authedApi()).delete(`/api/items/${item.id}`);
            if (status !== 204 && status !== 404) throw new Error(`Cleanup of item ${item.id} failed: HTTP ${status}`);
        });
    }

    get baseUrl(): string {
        return runtime.baseUrl;
    }

    /** The last API response; throws if no earlier step called the API. */
    get lastResponse(): ApiResponse {
        if (!this.response) throw new Error('No API response yet: an earlier step must call the API.');
        return this.response;
    }

    /** The item created by an earlier step; throws if there is none. */
    get lastItem(): ItemRef {
        if (!this.createdItem) throw new Error('No item yet: an earlier step must create one.');
        return this.createdItem;
    }

    get db(): DbClient {
        if (!runtime.db) throw new Error('Database is not configured. Set DB_HOST (see .env.example).');
        return runtime.db;
    }

    /** Returns a page object bound to this scenario's page, creating it once. */
    pageObject<T extends object>(PageClass: new (page: Page) => T): T {
        if (!this.page) throw new Error('No browser page: this scenario is tagged @api.');
        if (!this.pageObjects.has(PageClass)) this.pageObjects.set(PageClass, new PageClass(this.page));
        return this.pageObjects.get(PageClass) as T;
    }

    get formPage(): FormPage {
        return this.pageObject(FormPage);
    }

    get loginPage(): LoginPage {
        return this.pageObject(LoginPage);
    }

    get itemsPage(): ItemsPage {
        return this.pageObject(ItemsPage);
    }

    async api(): Promise<ApiClient> {
        this.apiClient ??= await ApiClient.create({
            baseURL: runtime.apiBaseUrl,
            onExchange: (exchange) =>
                this.attach(JSON.stringify(exchange, null, 2), {
                    mediaType: 'application/json',
                    fileName: `${exchange.request.method} ${exchange.request.path}`,
                }),
        });
        return this.apiClient;
    }

    async authedApi(): Promise<ApiClient> {
        const api = await this.api();
        if (!api.token) {
            const { username, password } = requireCredentials(this.config);
            await api.login(username, password);
        }
        return api;
    }

    /** @param options.storageState starts the page logged in */
    async openPage({ storageState }: { storageState?: BrowserContextOptions['storageState'] } = {}): Promise<void> {
        if (!runtime.browser) throw new Error('Browser not launched: BeforeAll hook did not run.');
        this.context = await runtime.browser.newContext({
            baseURL: runtime.baseUrl,
            viewport: config.viewport,
            storageState,
            recordVideo: config.video === 'off' ? undefined : { dir: 'videos', size: config.viewport },
        });
        if (config.trace !== 'off') {
            await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
        }
        this.page = await this.context.newPage();
        this.page.setDefaultTimeout(config.timeouts.action);
        this.page.setDefaultNavigationTimeout(config.timeouts.navigation);
    }
}

setWorldConstructor(CustomWorld);

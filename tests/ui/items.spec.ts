import { test, expect, LOGGED_OUT, defined } from '../fixtures';

test.describe('Items page (logged in via saved session)', () => {
    test('opens without logging in again @smoke', async ({ itemsPage, page }) => {
        await itemsPage.open();
        await expect(page).toHaveURL(/\/items$/);
        await expect(itemsPage.heading).toBeVisible();
    });

    test('lists items created through the API', async ({ itemsPage, createItem }) => {
        const item = await createItem();
        await itemsPage.open();
        await expect(itemsPage.item(item.name)).toBeVisible();
    });

    test('adds an item through the UI', async ({ itemsPage, authedApi, trackItem }) => {
        const name = `UI item ${Date.now()}`;
        await itemsPage.open();
        const created = defined(await itemsPage.addItem(name), `The app rejected "${name}"`);
        trackItem(created);

        await expect(itemsPage.item(name)).toBeVisible();
        // The UI and the API agree
        expect((await authedApi.get(`/api/items/${created.id}`)).body).toMatchObject({ name });
    });

    test('rejects an empty name', async ({ itemsPage }) => {
        await itemsPage.open();
        expect(await itemsPage.addItem('')).toBeNull();
        await expect(itemsPage.error).toHaveText('Name is required');
    });
});

test.describe('Items page (logged out)', () => {
    test.use({ storageState: LOGGED_OUT });

    test('redirects to login and returns after logging in', async ({ itemsPage, loginPage, page, credentials }) => {
        await itemsPage.open();
        await expect(page).toHaveURL(/\/login\?next=%2Fitems$/);

        await loginPage.login(credentials.username, credentials.password);
        await expect(page).toHaveURL(/\/items$/);
        await expect(itemsPage.heading).toBeVisible();
    });
});

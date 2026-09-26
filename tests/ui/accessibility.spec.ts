import { test, expect, LOGGED_OUT } from '../fixtures';

// WCAG 2.1 A/AA and axe best practices on every page of the app.
// Add a line here for each new page object.
test.describe('Accessibility', () => {
    test('form page @a11y', async ({ formPage, checkAccessibility }) => {
        await formPage.open();
        await checkAccessibility();
    });

    test('items page @a11y', async ({ itemsPage, checkAccessibility }) => {
        await itemsPage.open();
        await expect(itemsPage.heading).toBeVisible();
        await checkAccessibility();
    });

    test.describe('logged out', () => {
        test.use({ storageState: LOGGED_OUT });

        test('login page @a11y', async ({ loginPage, checkAccessibility }) => {
            await loginPage.open();
            await checkAccessibility();
        });
    });
});

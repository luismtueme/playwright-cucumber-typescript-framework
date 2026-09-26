import { expect } from '@playwright/test';
import { Given, Then } from '../utils/steps';
import { findAccessibilityViolations, formatViolations } from '../utils/accessibility';
import type { BasePage } from '../pages/BasePage';
import type { CustomWorld } from '../utils/world';

/** Page names usable in "Given I open the <name> page" */
const PAGES: Record<string, (world: CustomWorld) => BasePage> = {
    form: (world) => world.formPage,
    login: (world) => world.loginPage,
    items: (world) => world.itemsPage,
};

Given('I open the {word} page', async function (name: string) {
    const pageObject = PAGES[name];
    if (!pageObject) throw new Error(`Unknown page "${name}". Known pages: ${Object.keys(PAGES).join(', ')}`);
    await pageObject(this).open();
});

/**
 * Compares the accessible structure of <main> (what a screen reader announces) with
 * the doc string. Playwright's toMatchAriaSnapshot() only works inside Playwright
 * Test, so this compares locator.ariaSnapshot() exactly, retrying until it matches.
 * Specs use toMatchAriaSnapshot(), which also allows partial matches.
 */
Then('the page structure is:', async function (expected: string) {
    if (!this.page) throw new Error('No browser page: structure checks need a UI scenario.');
    const main = this.page.getByRole('main');
    await expect.poll(() => main.ariaSnapshot(), { message: 'accessible structure of <main>' }).toBe(expected.trim());
});

Then('the page has no accessibility violations', async function () {
    if (!this.page) throw new Error('No browser page: accessibility checks need a UI scenario.');
    const violations = await findAccessibilityViolations(this.page);
    this.attach(JSON.stringify(violations, null, 2), {
        mediaType: 'application/json',
        fileName: 'accessibility-violations.json',
    });
    expect(violations, formatViolations(violations)).toEqual([]);
});

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

Then('the page has no accessibility violations', async function () {
    if (!this.page) throw new Error('No browser page: accessibility checks need a UI scenario.');
    const violations = await findAccessibilityViolations(this.page);
    this.attach(JSON.stringify(violations, null, 2), {
        mediaType: 'application/json',
        fileName: 'accessibility-violations.json',
    });
    expect(violations, formatViolations(violations)).toEqual([]);
});

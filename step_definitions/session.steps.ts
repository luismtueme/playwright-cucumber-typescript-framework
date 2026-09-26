import { expect } from '@playwright/test';
import { Given, When, Then } from '../utils/steps';

/** A fixed start time, so date-dependent screens render the same every run */
const START = new Date('2026-01-05T09:00:00');

Given('the browser clock is under test control', async function () {
    if (!this.page) throw new Error('No browser page: clock control needs a UI scenario.');
    // Must run before the page loads, so the page's own timers use the fake clock
    await this.page.clock.install({ time: START });
});

When('{int} minute(s) pass(es) without activity', async function (minutes: number) {
    await this.itemsPage.page.clock.fastForward(minutes * 60_000);
});

When('I type in the new item name', async function () {
    await this.itemsPage.nameInput.press('a');
});

Then('the session has expired', async function () {
    await expect(this.itemsPage.sessionExpired).toBeVisible();
    await expect(this.itemsPage.nameInput).toBeHidden();
});

Then('the session is still active', async function () {
    await expect(this.itemsPage.sessionExpired).toBeHidden();
    await expect(this.itemsPage.nameInput).toBeVisible();
});

import { expect } from '@playwright/test';
import { Given, When, Then } from '../utils/steps';

Given('I am on the form page', async function () {
    await this.formPage.open();
    await expect(this.formPage.heading).toHaveText('Example Application');
});

When('I run the example action', async function () {
    await this.formPage.runExampleAction();
});

Then('I see the example action result', async function () {
    await expect(this.formPage.result).toBeVisible();
});

When('I submit the form with {string}', async function (value: string) {
    await this.formPage.submit(value);
});

Then('the form message is {string}', async function (message: string) {
    await expect(this.formPage.message).toHaveText(message);
});

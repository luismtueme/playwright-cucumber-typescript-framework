import { expect } from '@playwright/test';
import { Given, When, Then } from '../utils/steps';
import { requireCredentials } from '../config';

Given('I am on the login page', async function () {
    await this.loginPage.open();
});

When('I log in with the configured credentials', async function () {
    const { username, password } = requireCredentials(this.config);
    await this.loginPage.login(username, password);
});

When('I log in as the configured user with the password {string}', async function (password: string) {
    const { username } = requireCredentials(this.config);
    await this.loginPage.login(username, password);
});

Then('I am welcomed as the configured user', async function () {
    const { username } = requireCredentials(this.config);
    await expect(this.loginPage.welcome).toHaveText(`Welcome, ${username}`);
});

Then('I see the login error {string}', async function (message: string) {
    await expect(this.loginPage.error).toHaveText(message);
});

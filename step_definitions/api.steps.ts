import { expect } from '@playwright/test';
import { Given, When, Then } from '../utils/steps';
import { ApiClient } from '../utils/apiClient';
import { runtime } from '../utils/cucumberRuntime';
import type { Item } from '../pages/ItemsPage';

Given('I am authenticated with the API', async function () {
    await this.authedApi();
});

When('I create an item named {string}', async function (name: string) {
    const api = await this.api();
    const response = await api.post<Item>('/api/items', { name });
    this.response = response;
    if (response.status === 201) {
        this.createdItem = response.body;
        this.cleanUpItem(response.body);
    }
});

When('I delete the created item', async function () {
    const api = await this.api();
    this.response = await api.delete(`/api/items/${this.lastItem.id}`);
});

When('I list the items without authenticating', async function () {
    const api = await ApiClient.create({ baseURL: runtime.apiBaseUrl });
    try {
        this.response = await api.get('/api/items');
    } finally {
        await api.dispose();
    }
});

Then('the response status is {int}', function (status: number) {
    expect(this.lastResponse.status, JSON.stringify(this.lastResponse.body)).toBe(status);
});

Then('the response body matches:', function (docString: string) {
    expect(this.lastResponse.body).toMatchObject(JSON.parse(docString) as Record<string, unknown>);
});

Then('the created item can be fetched by its id', async function () {
    const api = await this.api();
    const fetched = await api.get<Item>(`/api/items/${this.lastItem.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body).toEqual(this.lastItem);
});

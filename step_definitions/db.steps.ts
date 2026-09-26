import { expect } from '@playwright/test';
import { Then } from '../utils/steps';

// expect.poll retries until the database agrees (up to the expect timeout), so these
// steps also work for apps that write to the database asynchronously.

Then('the database has the created item named {string}', async function (name: string) {
    const { id } = this.lastItem;
    await expect
        .poll(() => this.db.one('SELECT id, name FROM items WHERE id = ?', [id]), {
            message: `row for item ${id} in items`,
        })
        .toEqual({ id, name });
});

Then('the database no longer has the created item', async function () {
    const { id } = this.lastItem;
    await expect
        .poll(() => this.db.count('items', 'id = ?', [id]), { message: `rows for item ${id} in items` })
        .toBe(0);
});

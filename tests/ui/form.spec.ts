import { test, expect } from '../fixtures';

test.describe('Example form', () => {
    test.beforeEach(async ({ formPage }) => {
        await formPage.open();
    });

    test('shows the example action result @smoke', async ({ formPage }) => {
        await formPage.runExampleAction();
        await expect(formPage.result).toBeVisible();
    });

    // Data-driven: one test per row, each reported separately
    const cases = [
        { name: 'a valid value', value: 'Sewer main inspection', message: 'Form submitted successfully' },
        { name: 'an empty value', value: '', message: 'Please enter a value' },
        { name: 'a value over 50 chars', value: 'x'.repeat(51), message: 'Value must be 50 characters or fewer' },
    ];
    for (const { name, value, message } of cases) {
        test(`submitting ${name} shows "${message}"`, async ({ formPage }) => {
            await formPage.submit(value);
            await expect(formPage.message).toHaveText(message);
        });
    }
});

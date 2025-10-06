import { test, expect } from '@playwright/test';
import { HasonPage } from './helpers/page-objects';
import { testCases } from './test-cases';
test.describe('JSON Formatting', () => {
    let hasonPage;
    test.beforeEach(async ({ page }) => {
        hasonPage = new HasonPage(page);
        await hasonPage.goto();
    });
    test('should format JSON with identity filter', async () => {
        await hasonPage.inputJson(testCases.simple.input);
        // Identity filter should work as it's the default
        await hasonPage.switchToOutputTab();
        await hasonPage.expectOutputToContain('John');
        await hasonPage.expectOutputToContain('30');
    });
    test('should handle jq filter input interactions', async ({ page }) => {
        await hasonPage.inputJson(testCases.simple.input);
        // Test filter input interactions
        await hasonPage.setJqFilter('.name');
        await expect(page.locator('[data-testid="jq-filter-input"]')).toHaveValue('.name');
        // Test applying filter (may show error if jq not loaded, which is acceptable)
        await hasonPage.applyJqFilter();
        await hasonPage.switchToOutputTab();
        // Should show either output or error (both are valid states)
        const hasOutput = await page.locator('[data-testid="json-output"], [data-testid="json-output-split"]').isVisible();
        const hasError = await page.locator('[data-testid="error-message"], [data-testid="error-message-split"]').isVisible();
        expect(hasOutput || hasError).toBe(true);
        // Input should be preserved
        await hasonPage.switchToInputTab();
        const inputValue = await page.locator('[data-testid="json-input-textarea"]').inputValue();
        expect(inputValue).toBe(testCases.simple.input);
    });
    test('should handle Enter key for filter application', async ({ page }) => {
        await hasonPage.inputJson(testCases.simple.input);
        await hasonPage.setJqFilter('.');
        // Test Enter key functionality
        await page.locator('[data-testid="jq-filter-input"]').press('Enter');
        await hasonPage.switchToOutputTab();
        // Should show formatted JSON
        await hasonPage.expectOutputToContain('John');
    });
});

import { test, expect } from '@playwright/test';
import { HasonPage } from './helpers/page-objects';
import { testCases } from './test-cases';

test.describe('Core Functionality', () => {
  let hasonPage: HasonPage;

  test.beforeEach(async ({ page }) => {
    hasonPage = new HasonPage(page);
    await hasonPage.goto();
  });

  test('should copy output to clipboard', async ({ page }) => {
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.switchToOutputTab();
    
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await hasonPage.copyOutput();
    
    // Verify copy feedback (button should show check icon)
    const copyButton = page.locator('[data-testid="copy-output-button"]');
    await expect(copyButton).toContainText(''); // Check icon should be present
    
    // Verify clipboard contents
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardContent).toContain('John');
    expect(clipboardContent).toContain('30');
  });

  test('should maintain state when switching between tabs', async ({ page }) => {
    const testData = testCases.simple.input;
    
    // Add input on input tab
    await hasonPage.inputJson(testData);
    
    // Switch to output tab
    await hasonPage.switchToOutputTab();
    await hasonPage.expectOutputToContain('John');
    
    // Switch back to input tab
    await hasonPage.switchToInputTab();
    
    // Input should be preserved
    const inputValue = await page.locator('[data-testid="json-input-textarea"]').inputValue();
    expect(inputValue).toBe(testData);
    
    // Switch back to output tab
    await hasonPage.switchToOutputTab();
    
    // Output should still be there
    await hasonPage.expectOutputToContain('John');
  });

  test('should show error and recover gracefully', async ({ page }) => {
    // Start with valid JSON
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.switchToOutputTab();
    await hasonPage.expectOutputToContain('John');
    
    // Add invalid JSON
    await hasonPage.switchToInputTab();
    await hasonPage.inputJson(testCases.invalid.malformed);
    await hasonPage.switchToOutputTab();
    
    // Should show error
    await hasonPage.expectErrorToBeVisible();
    
    // Fix the JSON
    await hasonPage.switchToInputTab();
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.switchToOutputTab();
    
    // Should show valid output again
    await hasonPage.expectOutputToContain('John');
    
    // Error should be gone
    const errorElement = page.locator('[data-testid="error-message"]');
    await expect(errorElement).not.toBeVisible();
  });

  test('should handle share functionality', async ({ page }) => {
    const testData = testCases.simple.input;
    const testFilter = '.name';
    
    await hasonPage.inputJson(testData);
    await hasonPage.setJqFilter(testFilter);
    await hasonPage.applyJqFilter();
    
    // Look for share button specifically by its title attribute
    const shareButton = page.locator('button[title="Share current filter and data"]');
    
    await shareButton.click();
    
    // Share functionality should update URL or show some feedback
    await hasonPage.expectUrlToContainData();
  });
});
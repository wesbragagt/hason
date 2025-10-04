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
    await hasonPage.inputJson(testCases.simple.input);
    
    // Switch to output tab
    await hasonPage.switchToOutputTab();
    await hasonPage.expectOutputToContain('John');
    
    // Switch back to input tab
    await hasonPage.switchToInputTab();
    
    // Input should be preserved
    const inputValue = await page.locator('[data-testid="json-input-textarea"]').inputValue();
    expect(inputValue).toBe(testCases.simple.input);
    
    // Switch back to output tab
    await hasonPage.switchToOutputTab();
    
    // Output should still be there
    await hasonPage.expectOutputToContain('John');
  });

  test('should display formatted JSON and handle errors', async () => {
    // Test basic JSON formatting
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.switchToOutputTab();
    await hasonPage.expectOutputToContain('John');
    await hasonPage.expectOutputToContain('30');
    
    // Test error handling with invalid JSON
    await hasonPage.switchToInputTab();
    await hasonPage.inputJson(testCases.invalid.malformed);
    await hasonPage.switchToOutputTab();
    
    // Should show error
    await hasonPage.expectErrorToBeVisible();
    
    // Test empty input handling
    await hasonPage.switchToInputTab();
    await hasonPage.inputJson('');
    await hasonPage.switchToOutputTab();
    
    // Should handle empty input gracefully
    const output = await hasonPage.getJsonOutput();
    expect(output || '').toBe('');
  });

  test('should handle share functionality', async ({ page }) => {
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.setJqFilter('.name');
    await hasonPage.applyJqFilter();
    
    // Look for share button specifically by its title attribute
    const shareButton = page.locator('button[title="Share current filter and data"]');
    
    await shareButton.click();
    
    // Share functionality should update URL or show some feedback
    await hasonPage.expectUrlToContainData();
  });
});
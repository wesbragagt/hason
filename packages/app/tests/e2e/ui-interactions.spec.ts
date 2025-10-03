import { test, expect } from '@playwright/test';
import { HasonPage } from './helpers/page-objects';
import { testCases } from './test-cases';

test.describe('UI Interactions', () => {
  let hasonPage: HasonPage;

  test.beforeEach(async ({ page }) => {
    hasonPage = new HasonPage(page);
    await hasonPage.goto();
  });

  test('should toggle between input and output tabs', async () => {
    // Should start on input tab by default
    await hasonPage.expectTabToBeActive('input');
    
    // Switch to output
    await hasonPage.switchToOutputTab();
    await hasonPage.expectTabToBeActive('output');
    
    // Switch back to input
    await hasonPage.switchToInputTab();
    await hasonPage.expectTabToBeActive('input');
  });

  test('should toggle theme', async ({ page }) => {
    // Get initial theme state from html element (where theme class is applied)
    const html = page.locator('html');
    const initialClasses = await html.getAttribute('class') || '';
    const isDark = initialClasses.includes('dark');
    
    // Toggle theme
    await hasonPage.toggleTheme();
    
    // Wait a bit for theme change
    await page.waitForTimeout(100);
    
    // Verify theme changed
    const newClasses = await html.getAttribute('class') || '';
    const isNowDark = newClasses.includes('dark');
    expect(isNowDark).toBe(!isDark);
  });

  test('should open and close help drawer', async ({ page }) => {
    // Open help
    await hasonPage.openHelp();
    await hasonPage.expectHelpToBeVisible();
    
    // Close help with keyboard shortcut toggle
    await page.keyboard.press('Control+Shift+H');
    await page.waitForTimeout(300);
    await hasonPage.expectHelpToBeHidden();
  });

  test('should open help with keyboard shortcut', async ({ page }) => {
    // Use keyboard shortcut to open help
    await page.keyboard.press('Control+Shift+H');
    await hasonPage.expectHelpToBeVisible();
    
    // Toggle again to close
    await page.keyboard.press('Control+Shift+H');
    await page.waitForTimeout(200);
    await hasonPage.expectHelpToBeHidden();
  });

  test('should switch to output tab after pasting in tabs mode', async ({ page }) => {
    // Start on input tab
    await hasonPage.expectTabToBeActive('input');
    
    // Paste JSON (this should trigger auto-switch to output)
    await page.locator('[data-testid="json-input-textarea"]').fill(testCases.simple.input);
    
    // Simulate a paste event by dispatching it
    await page.locator('[data-testid="json-input-textarea"]').dispatchEvent('paste');
    
    // Wait a bit for the auto-switch logic
    await page.waitForTimeout(200);
    
    // Should auto-switch to output tab
    await hasonPage.expectTabToBeActive('output');
  });

  test('should show toast notification after paste', async ({ page }) => {
    // Start on input tab
    await hasonPage.expectTabToBeActive('input');
    
    // Paste JSON
    await page.locator('[data-testid="json-input-textarea"]').fill(testCases.simple.input);
    await page.locator('[data-testid="json-input-textarea"]').dispatchEvent('paste');
    
    // Should show toast notification
    await expect(page.locator('text=Switched to output view')).toBeVisible();
    
    // Toast should disappear after a while
    await expect(page.locator('text=Switched to output view')).not.toBeVisible({ timeout: 3000 });
  });

  test('should toggle view mode between tabs and split', async ({ page }) => {
    // Find the split/tabs toggle button - it has an SVG icon
    const viewModeButton = page.locator('[data-testid="view-mode-toggle"]');
    
    // Wait for the button to be visible first
    await expect(viewModeButton).toBeVisible({ timeout: 10000 });
    
    // Click to switch to split mode
    await viewModeButton.click();
    
    // Verify split mode is active by checking for split view elements
    await expect(page.locator('h3', { hasText: 'JSON Input' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3', { hasText: 'Output' })).toBeVisible({ timeout: 5000 });
    
    // Click again to switch back to tabs mode
    await viewModeButton.click();
    
    // Should be back in tabs mode
    await hasonPage.expectTabToBeActive('input');
  });

  test('should maintain focus on filter input after applying filter', async ({ page }) => {
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.setJqFilter('.name');
    
    // Apply filter with Enter key
    await hasonPage.applyJqFilterWithEnter();
    
    // Filter input should still be focused
    const filterInput = page.locator('[data-testid="jq-filter-input"]');
    await expect(filterInput).toBeFocused();
  });

  test('should show copy button only when there is output', async ({ page }) => {
    // Initially no output, copy button should not be visible
    await hasonPage.switchToOutputTab();
    const copyButton = page.locator('[data-testid="copy-output-button"]');
    await expect(copyButton).not.toBeVisible();
    
    // Add some JSON input and switch to output
    await hasonPage.switchToInputTab();
    await hasonPage.inputJson(testCases.simple.input);
    await hasonPage.switchToOutputTab();
    
    // Now copy button should be visible
    await expect(copyButton).toBeVisible();
  });
});
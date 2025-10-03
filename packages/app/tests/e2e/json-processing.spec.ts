import { test, expect } from '@playwright/test';
import { HasonPage } from './helpers/page-objects';
import { testCases } from './test-cases';

test.describe('JSON Processing UI', () => {
  let hasonPage: HasonPage;

  test.beforeEach(async ({ page }) => {
    hasonPage = new HasonPage(page);
    await hasonPage.goto();
  });

  test('should display formatted JSON in output tab', async () => {
    const jsonInput = testCases.simple.input;
    
    await hasonPage.inputJson(jsonInput);
    await hasonPage.switchToOutputTab();
    
    // Verify UI displays JSON content
    await hasonPage.expectOutputToContain('John');
    await hasonPage.expectOutputToContain('30');
  });

  test('should show error state in UI for invalid JSON', async () => {
    const invalidJson = testCases.invalid.malformed;
    
    await hasonPage.inputJson(invalidJson);
    await hasonPage.switchToOutputTab();
    
    // Verify UI shows error state
    await hasonPage.expectErrorToBeVisible();
  });

  test('should handle empty input in UI gracefully', async () => {
    await hasonPage.inputJson('');
    await hasonPage.switchToOutputTab();
    
    // UI should handle empty input without showing error
    const output = await hasonPage.getJsonOutput();
    expect(output).toBe('');
  });
});
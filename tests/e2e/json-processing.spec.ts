import { test, expect } from '@playwright/test';
import { HasonPage } from './helpers/page-objects';
import { testCases } from './test-cases';

test.describe('JSON Processing', () => {
  let hasonPage: HasonPage;

  test.beforeEach(async ({ page }) => {
    hasonPage = new HasonPage(page);
    await hasonPage.goto();
  });

  test('should accept and format valid JSON', async () => {
    const jsonInput = testCases.simple.input;
    
    await hasonPage.inputJson(jsonInput);
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('John');
    await hasonPage.expectOutputToContain('30');
  });

  test('should handle identity filter correctly', async () => {
    const jsonInput = testCases.simple.input;
    
    await hasonPage.inputJson(jsonInput);
    await hasonPage.setJqFilter('.');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    // Should show formatted JSON
    await hasonPage.expectOutputToContain('"name": "John"');
    await hasonPage.expectOutputToContain('"age": 30');
  });

  test('should handle invalid JSON gracefully', async () => {
    const invalidJson = testCases.invalid.malformed;
    
    await hasonPage.inputJson(invalidJson);
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectErrorToBeVisible();
  });

  test('should handle incomplete JSON gracefully', async () => {
    const incompleteJson = testCases.invalid.incomplete;
    
    await hasonPage.inputJson(incompleteJson);
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectErrorToBeVisible();
  });

  test('should handle empty input gracefully', async () => {
    await hasonPage.inputJson('');
    await hasonPage.switchToOutputTab();
    
    // Empty input should result in empty output, not an error
    const output = await hasonPage.getJsonOutput();
    expect(output).toBe('');
  });

  test('should process nested objects correctly', async () => {
    const nestedJson = testCases.nested.input;
    
    await hasonPage.inputJson(nestedJson);
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('test@example.com');
    await hasonPage.expectOutputToContain('dark');
  });

  test('should process arrays correctly', async () => {
    const arrayJson = testCases.arrays.input;
    
    await hasonPage.inputJson(arrayJson);
    await hasonPage.switchToOutputTab();
    
    // Check for formatted array output
    await hasonPage.expectOutputToContain('1');
    await hasonPage.expectOutputToContain('2');
    await hasonPage.expectOutputToContain('3');
    await hasonPage.expectOutputToContain('4');
    await hasonPage.expectOutputToContain('5');
  });
});
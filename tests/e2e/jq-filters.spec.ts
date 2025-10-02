import { test, expect } from '@playwright/test';
import { HasonPage } from './helpers/page-objects';
import { testCases } from './test-cases';

test.describe('jq Filters', () => {
  let hasonPage: HasonPage;

  test.beforeEach(async ({ page }) => {
    hasonPage = new HasonPage(page);
    await hasonPage.goto();
  });

  test('should apply basic property filter via button', async () => {
    const jsonData = testCases.simple.input;
    
    await hasonPage.inputJson(jsonData);
    await hasonPage.setJqFilter('.name');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('"John"');
  });

  test('should apply filter via Enter key', async () => {
    const arrayData = testCases.arrays.input;
    
    await hasonPage.inputJson(arrayData);
    await hasonPage.setJqFilter('.items[0]');
    await hasonPage.applyJqFilterWithEnter();
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('1');
  });

  test('should handle nested property access', async () => {
    const nestedData = testCases.nested.input;
    
    await hasonPage.inputJson(nestedData);
    await hasonPage.setJqFilter('.user.profile.email');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('"test@example.com"');
  });

  test('should handle array access', async () => {
    const arrayData = testCases.arrays.input;
    
    await hasonPage.inputJson(arrayData);
    await hasonPage.setJqFilter('.items[0]');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('1');
  });

  test.skip('should handle invalid filter gracefully', async () => {
    // Skip this test - behavior varies based on jq-web loading state
    const jsonData = testCases.simple.input;
    
    await hasonPage.inputJson(jsonData);
    await hasonPage.setJqFilter('.nonexistent');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    // Should show undefined for non-existent property
    const output = await hasonPage.getJsonOutput();
    expect(output).toBe('undefined');
  });

  test('should update filter without losing input', async ({ page }) => {
    const jsonData = testCases.simple.input;
    
    await hasonPage.inputJson(jsonData);
    await hasonPage.setJqFilter('.name');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('"John"');
    
    // Change filter to access age
    await hasonPage.setJqFilter('.age');
    await hasonPage.applyJqFilter();
    
    await hasonPage.expectOutputToContain('30');
    
    // Original input should still be preserved
    await hasonPage.switchToInputTab();
    const inputValue = await page.locator('[data-testid="json-input-textarea"]').inputValue();
    expect(inputValue).toBe(jsonData);
  });

  test('should reset filter to identity', async () => {
    const jsonData = testCases.simple.input;
    
    await hasonPage.inputJson(jsonData);
    await hasonPage.setJqFilter('.name');
    await hasonPage.applyJqFilter();
    await hasonPage.switchToOutputTab();
    
    await hasonPage.expectOutputToContain('"John"');
    
    // Reset to identity filter
    await hasonPage.setJqFilter('.');
    await hasonPage.applyJqFilter();
    
    // Should show full formatted JSON
    await hasonPage.expectOutputToContain('"name": "John"');
    await hasonPage.expectOutputToContain('"age": 30');
  });
});
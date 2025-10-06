import { test, expect } from '@playwright/test';

test.describe('WASM Loading Integration (Real Browser)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dev server
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should load jq WASM module in browser', async ({ page }) => {
    // Test that jq module loads and works
    const result = await page.evaluate(async () => {
      // Import the jq module dynamically
      const { promised } = await import('/src/lib/jq-wasm/index.ts');
      
      // Test basic functionality
      const testResult = await promised({ name: 'test' }, '.name');
      return testResult;
    });

    expect(result).toBe('test');
  });

  test('should handle complex jq filters', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { promised } = await import('/src/lib/jq-wasm/index.ts');
      
      const data = {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]
      };
      
      return await promised(data, '.users[0].name');
    });

    expect(result).toBe('Alice');
  });
});

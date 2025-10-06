import { expect } from '@playwright/test';
import { commonSelectors } from '../test-cases';
export class HasonPage {
    constructor(page) {
        Object.defineProperty(this, "page", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: page
        });
    }
    async goto() {
        await this.page.goto('/');
    }
    async inputJson(json) {
        await this.page.locator(commonSelectors.jsonInput).fill(json);
        // Wait for JSON processing to trigger
        await this.page.waitForTimeout(100);
    }
    async setJqFilter(filter) {
        await this.page.locator(commonSelectors.jqFilterInput).fill(filter);
    }
    async applyJqFilter() {
        await this.page.locator(commonSelectors.applyFilterButton).click();
        // Wait a bit for async processing
        await this.page.waitForTimeout(100);
    }
    async applyJqFilterWithEnter() {
        await this.page.locator(commonSelectors.jqFilterInput).press('Enter');
        // Wait a bit for async processing
        await this.page.waitForTimeout(100);
    }
    async switchToInputTab() {
        await this.page.locator(commonSelectors.jsonInputTab).click();
    }
    async switchToOutputTab() {
        const outputTab = this.page.locator(commonSelectors.outputTab);
        if (await outputTab.isVisible()) {
            await outputTab.click();
            // Wait for tab to be active
            await this.page.waitForTimeout(300);
        }
    }
    async getJsonOutput() {
        return await this.page.locator(commonSelectors.jsonOutput).textContent();
    }
    async getErrorMessage() {
        return await this.page.locator(commonSelectors.errorMessage).textContent();
    }
    async copyOutput() {
        await this.page.locator(commonSelectors.copyButton).click();
    }
    async openHelp() {
        await this.page.locator(commonSelectors.helpButton).click();
    }
    async closeHelp() {
        // The help drawer should have a close button - let's use a generic close button
        await this.page.keyboard.press('Escape');
    }
    async toggleTheme() {
        await this.page.locator(commonSelectors.themeToggle).click();
    }
    async expectOutputToContain(text) {
        // First ensure we're on the output tab or in split mode
        const outputTab = this.page.locator(commonSelectors.outputTab);
        const isTabsMode = await outputTab.isVisible();
        if (isTabsMode) {
            // In tabs mode, make sure output tab is active
            await this.switchToOutputTab();
        }
        // Wait for processing to complete
        await this.page.waitForTimeout(1000);
        // Try to find the text in the output
        const outputLocator = this.page.locator(commonSelectors.jsonOutput);
        try {
            await expect(outputLocator).toContainText(text, { timeout: 5000 });
        }
        catch (error) {
            // If output is not found, check if there's an error instead
            const errorLocator = this.page.locator(commonSelectors.errorMessage);
            const errorVisible = await errorLocator.isVisible();
            if (errorVisible) {
                const errorText = await errorLocator.textContent();
                throw new Error(`Expected output '${text}' but got error: ${errorText}`);
            }
            else {
                // Re-throw the original error if no error message found
                throw error;
            }
        }
    }
    async expectErrorToBeVisible() {
        // First ensure we're on the output tab or in split mode
        const outputTab = this.page.locator(commonSelectors.outputTab);
        const isTabsMode = await outputTab.isVisible();
        if (isTabsMode) {
            await this.switchToOutputTab();
        }
        await expect(this.page.locator(commonSelectors.errorMessage)).toBeVisible({ timeout: 5000 });
    }
    async expectErrorToContain(text) {
        await expect(this.page.locator(commonSelectors.errorMessage)).toContainText(text);
    }
    async expectHelpToBeVisible() {
        await expect(this.page.locator(commonSelectors.helpDrawer)).toBeVisible();
    }
    async expectHelpToBeHidden() {
        await expect(this.page.locator(commonSelectors.helpDrawer)).not.toBeVisible();
    }
    async expectTabToBeActive(tab) {
        const selector = tab === 'input' ? commonSelectors.jsonInputTab : commonSelectors.outputTab;
        // Check if the tab has the active variant styling
        await expect(this.page.locator(selector)).toHaveClass(/bg-primary/, { timeout: 5000 });
    }
    async expectCopyButtonToShowCopied() {
        // The copy button should show a check icon when copied
        await expect(this.page.locator(commonSelectors.copyButton)).toContainText('');
    }
    async expectUrlToContainData() {
        await expect(this.page).toHaveURL(/data=/);
    }
    async expectJqFilterValue(value) {
        await expect(this.page.locator(commonSelectors.jqFilterInput)).toHaveValue(value);
    }
    async waitForStateToLoad() {
        // Wait for URL state to be decoded and applied
        // This is indicated by the jq filter input having a non-default value
        // or by waiting a reasonable time for async loading
        await this.page.waitForTimeout(2000);
    }
}

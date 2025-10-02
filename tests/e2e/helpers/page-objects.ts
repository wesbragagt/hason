import { Page, expect } from '@playwright/test';
import { commonSelectors } from '../test-cases';

export class HasonPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  async inputJson(json: string) {
    await this.page.locator(commonSelectors.jsonInput).fill(json);
  }

  async setJqFilter(filter: string) {
    await this.page.locator(commonSelectors.jqFilterInput).fill(filter);
  }

  async applyJqFilter() {
    await this.page.locator(commonSelectors.applyFilterButton).click();
  }

  async applyJqFilterWithEnter() {
    await this.page.locator(commonSelectors.jqFilterInput).press('Enter');
  }

  async switchToInputTab() {
    await this.page.locator(commonSelectors.jsonInputTab).click();
  }

  async switchToOutputTab() {
    await this.page.locator(commonSelectors.outputTab).click();
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

  async expectOutputToContain(text: string) {
    await expect(this.page.locator(commonSelectors.jsonOutput)).toContainText(text);
  }

  async expectErrorToBeVisible() {
    await expect(this.page.locator(commonSelectors.errorMessage)).toBeVisible();
  }

  async expectErrorToContain(text: string) {
    await expect(this.page.locator(commonSelectors.errorMessage)).toContainText(text);
  }

  async expectHelpToBeVisible() {
    await expect(this.page.locator(commonSelectors.helpDrawer)).toBeVisible();
  }

  async expectHelpToBeHidden() {
    await expect(this.page.locator(commonSelectors.helpDrawer)).not.toBeVisible();
  }

  async expectTabToBeActive(tab: 'input' | 'output') {
    const selector = tab === 'input' ? commonSelectors.jsonInputTab : commonSelectors.outputTab;
    // Check if the tab has the active variant styling
    await expect(this.page.locator(selector)).toHaveClass(/bg-primary/);
  }

  async expectCopyButtonToShowCopied() {
    // The copy button should show a check icon when copied
    await expect(this.page.locator(commonSelectors.copyButton)).toContainText('');
  }

  async expectUrlToContainData() {
    await expect(this.page).toHaveURL(/data=/);
  }

  async expectJqFilterValue(value: string) {
    await expect(this.page.locator(commonSelectors.jqFilterInput)).toHaveValue(value);
  }
}
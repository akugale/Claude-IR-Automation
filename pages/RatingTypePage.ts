import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RatingTypePage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly cutoffRankInput: Locator;
  private readonly scaleModelCheckbox: Locator;
  private readonly scaleTypeInput: Locator;
  private readonly saveInModalButton: Locator;
  private readonly updateInModalButton: Locator;
  private readonly cancelInModalButton: Locator;
  private readonly confirmDeleteYesButton: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput = page.locator('p-dialog').getByPlaceholder(/enter code/i).first();
    this.descriptionInput = page.locator('p-dialog').getByPlaceholder(/enter description/i).first();
    this.cutoffRankInput = page.locator('p-dialog').getByPlaceholder(/enter cutoff rank/i);
    this.scaleModelCheckbox = page.locator('p-dialog p-checkbox');
    this.scaleTypeInput = page.locator('p-dialog').getByPlaceholder(/enter scale type/i);
    this.saveInModalButton = page.getByRole('button', { name: /^save$/i });
    this.updateInModalButton = page.getByRole('button', { name: /^update$/i });
    this.cancelInModalButton = page.locator('p-dialog').getByRole('button', { name: /^cancel$/i });
    this.confirmDeleteYesButton = page.getByRole('button', { name: /^yes$/i });
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Rating');
    await this.clickNavNode('Rating Setup');
    await this.clickNavNode('Model Type');
    await expect(this.page.getByRole('heading', { name: /model type/i })).toBeVisible();
    await this.getAddButton();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /model type/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(await this.getAddButton()).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyAddModalContents(): Promise<void> {
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.cutoffRankInput).toBeVisible();
    await expect(this.scaleModelCheckbox).toBeVisible();
    await expect(this.scaleTypeInput).toBeVisible();
    await expect(this.saveInModalButton).toBeVisible();
    await expect(this.cancelInModalButton).toBeVisible();
  }

  // ─── TC_003 ──────────────────────────────────────────────────────────────────

  async verifyCodeFieldMaxLength(): Promise<void> {
    const longValue = 'A'.repeat(256);
    await this.codeInput.fill(longValue);
    const actualValue = await this.codeInput.inputValue();
    expect(actualValue.length).toBeLessThan(256);
  }

  // ─── TC_004a / TC_004b / TC_004c / TC_004d / TC_004e ────────────────────────

  async verifySaveDisabledWithOnlyDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
    await expect(this.saveInModalButton).toBeDisabled();
  }

  async verifySaveDisabledWithOnlyCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await expect(this.saveInModalButton).toBeDisabled();
  }

  async verifyCodeRejectsSpecialCharacters(): Promise<void> {
    await this.codeInput.fill('CODE@#$%');
    const value = await this.codeInput.inputValue();
    expect(value).not.toMatch(/[@#$%]/);
  }

  async verifyCutoffRankRejectsNonNumeric(): Promise<void> {
    await this.cutoffRankInput.fill('abc');
    const value = await this.cutoffRankInput.inputValue();
    expect(value, 'Investment Grade Cutoff Rank should reject non-numeric input').toBe('');
  }

  async verifyDuplicateCodeError(): Promise<void> {
    await expect(
      this.page.locator('p-dialog').getByText(/already exists|duplicate|code.*exist/i)
    ).toBeVisible();
  }

  // ─── TC_006 / TC_007 ─────────────────────────────────────────────────────────

  async verifySaveButtonDisabled(): Promise<void> {
    await expect(this.saveInModalButton).toBeDisabled();
  }

  async verifySaveButtonEnabled(): Promise<void> {
    await expect(this.saveInModalButton).toBeEnabled();
  }

  async fillRequiredFields(data: { code: string; description: string }): Promise<void> {
    await this.codeInput.fill(data.code);
    await this.descriptionInput.fill(data.description);
  }

  async fillAllAddModalFields(data: {
    code: string;
    description: string;
    investmentGradeCutoffRank?: string;
    scaleModel?: boolean;
    scaleType?: string;
  }): Promise<void> {
    await this.codeInput.fill(data.code);
    await this.descriptionInput.fill(data.description);
    if (data.investmentGradeCutoffRank !== undefined) {
      await this.cutoffRankInput.fill(data.investmentGradeCutoffRank);
    }
    if (data.scaleModel === true) {
      const isChecked = await this.scaleModelCheckbox.locator('input[type=checkbox]').isChecked();
      if (!isChecked) await this.scaleModelCheckbox.click();
    }
    if (data.scaleType !== undefined) {
      await this.scaleTypeInput.fill(data.scaleType);
    }
  }

  // ─── TC_008 ──────────────────────────────────────────────────────────────────

  async cancelModal(): Promise<void> {
    await this.cancelInModalButton.click();
  }

  async verifyModalClosed(): Promise<void> {
    await expect(this.page.locator('p-dialog')).not.toBeVisible({ timeout: 3000 });
  }

  // ─── TC_011 / TC_012 ─────────────────────────────────────────────────────────

  async submitAddForm(): Promise<void> {
    await this.saveInModalButton.click();
  }

  async verifyPendingAuthToast(): Promise<void> {
    await expect(
      this.page.locator('p-toast, .p-toast, .toast').getByText(/pending|authoris/i)
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── TC_014 / TC_016 ─────────────────────────────────────────────────────────

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.updateInModalButton).toBeVisible();
  }

  async clickUpdateInModal(): Promise<void> {
    await this.updateInModalButton.click();
  }

  async verifyNoAuthRequestToast(): Promise<void> {
    await expect(
      this.page.locator('p-toast, .p-toast, .toast').getByText(/authoris/i)
    ).not.toBeVisible({ timeout: 3000 });
  }

  // ─── TC_017 ──────────────────────────────────────────────────────────────────

  async editModelType(code: string, newDescription: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateInModalButton.click();
    try {
      await expect(this.updateInModalButton).toBeHidden({ timeout: 4000 });
    } catch {
      await this.page.keyboard.press('Escape');
    }
  }

  // ─── TC_019 ──────────────────────────────────────────────────────────────────

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateInModalButton).toBeDisabled();
  }

  // ─── TC_021 / TC_022 ─────────────────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    const dialog = this.page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByPlaceholder(/enter code/i).first()).toBeDisabled();
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByPlaceholder(/enter code/i).first()).toBeDisabled();
    await expect(dialog.getByPlaceholder(/enter description/i).first()).toBeDisabled();
    await expect(dialog.getByPlaceholder(/enter cutoff rank/i)).toBeDisabled();
    await expect(dialog.getByPlaceholder(/enter scale type/i)).toBeDisabled();
    await expect(dialog.locator('p-checkbox')).toHaveClass(/p-disabled/);
  }

  // ─── TC_028 / TC_029 / TC_030 ────────────────────────────────────────────────

  async verifyScaleModelCheckboxVisible(): Promise<void> {
    await expect(this.scaleModelCheckbox).toBeVisible();
  }

  async toggleScaleModelCheckbox(): Promise<boolean> {
    const wasChecked = await this.scaleModelCheckbox.locator('input[type=checkbox]').isChecked();
    await this.scaleModelCheckbox.click();
    const isNowChecked = await this.scaleModelCheckbox.locator('input[type=checkbox]').isChecked();
    expect(isNowChecked).toBe(!wasChecked);
    return isNowChecked;
  }

  // ─── TC_031 ──────────────────────────────────────────────────────────────────

  async enterScaleValues(values: string): Promise<void> {
    const scaleValuesInput = this.page.locator('p-dialog').getByPlaceholder(/enter scale values/i);
    await scaleValuesInput.fill(values);
  }

  async verifyNoScaleValuesValidationError(): Promise<void> {
    const errorLocator = this.page.locator('p-dialog').getByText(/scale values.*invalid|invalid.*scale values|sequence|order/i);
    await expect(errorLocator).not.toBeVisible({ timeout: 2000 });
  }

  async verifyScaleValuesValidationError(): Promise<void> {
    const errorLocator = this.page.locator('p-dialog').getByText(/scale values.*invalid|invalid.*scale values|sequence|order/i);
    await expect(errorLocator).toBeVisible();
  }

  // ─── TC_034 / TC_035 / TC_036 ────────────────────────────────────────────────

  async verifyGranularityOptions(): Promise<void> {
    const dropdown = this.page.locator('p-dialog p-select').nth(0);
    await expect(dropdown, 'Granularity dropdown not found in modal').toBeVisible({ timeout: 5000 });
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const options = await overlay.locator('.p-select-option').allInnerTexts();
    const expected = ['EXPOSURE', 'Counterparty', 'Industry', 'Retail Pool', 'Country'];
    for (const opt of expected) {
      expect(options.map(o => o.trim()), `Option "${opt}" missing from Granularity dropdown`).toContain(opt);
    }
    await this.page.keyboard.press('Escape');
  }

  async verifyScaleTypeDropdownOptions(): Promise<void> {
    const dropdown = this.page.locator('p-dialog p-select').nth(2);
    await expect(dropdown, 'Scale Type dropdown not found in modal').toBeVisible({ timeout: 5000 });
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const options = await overlay.locator('.p-select-option').allInnerTexts();
    expect(options.map(o => o.trim()), 'Increasing missing from Scale Type dropdown').toContain('Increasing');
    expect(options.map(o => o.trim()), 'Decreasing missing from Scale Type dropdown').toContain('Decreasing');
    await this.page.keyboard.press('Escape');
  }

  async verifyScaleModelSpecificOptions(): Promise<void> {
    const dropdown = this.page.locator('p-dialog p-select').nth(1);
    await expect(dropdown, 'Scale Model Specific dropdown not found in modal').toBeVisible({ timeout: 5000 });
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const options = await overlay.locator('.p-select-option').allInnerTexts();
    expect(options.map(o => o.trim()), 'Yes missing from Scale Model Specific dropdown').toContain('Yes');
    expect(options.map(o => o.trim()), 'No missing from Scale Model Specific dropdown').toContain('No');
    await this.page.keyboard.press('Escape');
  }

  async selectDropdownOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    await overlay
      .locator('.p-select-option')
      .filter({ hasText: new RegExp(`^\\s*${optionText}\\s*$`) })
      .first()
      .click();
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    const btn = await this.getAddButton();
    await btn.click();
    await expect(this.saveInModalButton).toBeVisible();
  }

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) {
      await byButton.click();
      return;
    }
    const byLink = this.mainNavigation.getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) {
      await byLink.click();
      return;
    }
    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }

  private async getAddButton(): Promise<Locator> {
    const headingAddIcon = this.page
      .getByRole('heading', { name: /model type/i })
      .locator('..')
      .locator('button:not(.export-pdf):not(.export-excel)')
      .last();
    if (
      (await headingAddIcon.isVisible().catch(() => false)) &&
      (await headingAddIcon.isEnabled().catch(() => false))
    ) {
      return headingAddIcon;
    }
    const namedAdd = this.page.getByRole('button', { name: /add/i }).first();
    await expect(namedAdd).toBeVisible();
    await expect(namedAdd).toBeEnabled();
    return namedAdd;
  }
}

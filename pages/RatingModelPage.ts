import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RatingModelPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  // ─── Configure form (full page, not dialog) ───────────────────────────────
  readonly nameInput: Locator;
  readonly effectiveDateInput: Locator;
  readonly saveAndContinueBtn: Locator;
  readonly saveBtn: Locator;
  readonly resetBtn: Locator;

  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });

    this.nameInput = page.getByPlaceholder(/enter model name/i);
    // p-datepicker AND its inner input both carry the placeholder — target the inner input specifically
    this.effectiveDateInput = page.locator('input[data-pc-name="pcinputtext"][placeholder*="YYYY"], p-datepicker input[type="text"]').first();
    this.saveAndContinueBtn = page.getByRole('button', { name: /save and continue/i });
    this.saveBtn = page.getByRole('button', { name: /^save$/i });
    this.resetBtn = page.getByRole('button', { name: /reset the model/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./model-setup/rating-models');
    // Use domcontentloaded — networkidle never fires in Angular apps with continuous polling
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('heading', { name: /rating model/i })).toBeVisible({ timeout: 30000 });
  }

  async navigateToNewModel(): Promise<void> {
    await (await this.getAddButton()).click();
    await expect(this.page.getByRole('heading', { name: /new rating model/i })).toBeVisible({ timeout: 15000 });
    // Wait for form to render (name input is the reliable signal)
    await this.nameInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /rating model/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    for (const col of ['Model Type', 'Rating Model', 'Effective Date', 'Workflow Status', 'Created on', 'Created by', 'Modified on', 'Modified by', 'Actions']) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(col, 'i') }).first(),
        `Column "${col}" should be visible`,
      ).toBeVisible();
    }
  }

  // ─── TC_003 ──────────────────────────────────────────────────────────────────

  async verifyActionsHaveViewEditDelete(): Promise<void> {
    const firstRow = this.page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)')).toBeVisible();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)')).toBeVisible();
    await expect(firstRow.locator('button:has(.ph-trash)')).toBeVisible();
  }

  // ─── TC_004 ──────────────────────────────────────────────────────────────────

  async verifyTableHasRows(): Promise<void> {
    const count = await this.table.getRowCount();
    expect(count, 'Table should have at least one row').toBeGreaterThan(0);
  }

  // ─── Configure form ──────────────────────────────────────────────────────────

  async verifyConfigureFormElements(): Promise<void> {
    await expect(this.nameInput).toBeVisible();
    await expect(this.effectiveDateInput).toBeVisible();
    await expect(this.page.getByText(/copy from existing/i).first()).toBeVisible();
    await expect(this.page.locator('p-select, p-dropdown, label, span').filter({ hasText: /model type/i }).first()).toBeVisible();
    await expect(this.page.getByText(/risk categor/i).first()).toBeVisible();
    await expect(this.saveAndContinueBtn).toBeVisible();
    await expect(this.resetBtn).toBeVisible();
  }

  async verifySaveAndContinueDisabled(): Promise<void> {
    await expect(this.saveAndContinueBtn).toBeDisabled();
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async fillEffectiveDate(dateStr: string): Promise<void> {
    await this.effectiveDateInput.click();
    // Triple-click to select any existing value, then type the new date
    await this.effectiveDateInput.press('Control+a');
    await this.effectiveDateInput.pressSequentially(dateStr, { delay: 50 });
    // Tab away to confirm — Escape reverts PrimeNG datepicker input
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(300);
  }

  async selectModelType(optionText: string): Promise<void> {
    const dropdown = this.page.locator('p-select').filter({ hasText: /select model type|model type/i }).first();
    const escaped = optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const optionLocator = this.page.locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
      .first();
    // Retry up to 3 times — PrimeNG v18 loads options async and may show "No results found" briefly
    for (let attempt = 0; attempt < 3; attempt++) {
      await dropdown.click();
      const appeared = await optionLocator.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      if (appeared) { await optionLocator.click(); return; }
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000);
    }
    await dropdown.click();
    await optionLocator.waitFor({ state: 'visible', timeout: 20000 });
    await optionLocator.click();
  }

  async getModelTypeOptions(): Promise<string[]> {
    const dropdown = this.page.locator('p-select').filter({ hasText: /select model type/i }).first();
    await dropdown.click();
    // Scope to the overlay attached to the model type dropdown
    const overlay = dropdown.locator('..').locator('[role="listbox"]').or(
      this.page.locator('[role="listbox"]').last()
    );
    await this.page.locator('[role="listbox"] [role="option"]').first().waitFor({ state: 'visible', timeout: 15000 });
    const options = (await this.page.locator('[role="listbox"] [role="option"]').allInnerTexts())
      .map(o => o.trim())
      .filter(o => o.length > 0 && o !== 'No results found');
    await this.page.keyboard.press('Escape');
    return options;
  }

  async setCopyFromExisting(value: 'Yes' | 'No'): Promise<void> {
    // Try PrimeNG SelectButton option first, then radio label, then any matching button/label near the section
    const selectBtn = this.page.locator('p-selectbutton .p-togglebutton, p-selectbutton .p-button').filter({ hasText: new RegExp(`^${value}$`, 'i') }).first();
    if (await selectBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectBtn.click();
      return;
    }
    const radioLabel = this.page.locator('label, span').filter({ hasText: new RegExp(`^${value}$`, 'i') }).first();
    await radioLabel.click();
  }

  async getCopyFromModelOptions(): Promise<string[]> {
    // Dropdown only visible when Copy from Existing = Yes
    const dropdown = this.page.locator('p-select, p-dropdown').filter({ hasText: /copy from|rating model/i }).first();
    await dropdown.click();
    // PrimeNG v18 uses [role="listbox"] / [role="option"]
    await this.page.locator('[role="listbox"] [role="option"]').first().waitFor({ state: 'visible', timeout: 10000 });
    const options = (await this.page.locator('[role="listbox"] [role="option"]').allInnerTexts())
      .map(o => o.trim()).filter(o => o.length > 0 && o !== 'No results found');
    await this.page.keyboard.press('Escape');
    return options;
  }

  async verifyCopyFromDropdownVisible(): Promise<void> {
    await expect(
      this.page.locator('p-select, p-dropdown').filter({ hasText: /copy from|select.*model/i }).nth(1),
    ).toBeVisible({ timeout: 5000 });
  }

  async verifyCopyFromDropdownHidden(): Promise<void> {
    const visible = await this.page
      .locator('p-select, p-dropdown').filter({ hasText: /copy from|select.*model/i }).nth(1)
      .isVisible().catch(() => false);
    expect(visible, 'Copy from dropdown should be hidden when No is selected').toBe(false);
  }

  async getRiskCategories(): Promise<string[]> {
    // Wait for checkboxes to render (async data)
    await this.page.locator('p-checkbox').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    // Use .p-checkbox-label or label — avoid p-checkbox span which picks up icon spans
    const labels = await this.page
      .locator('p-checkbox .p-checkbox-label, p-checkbox label')
      .allInnerTexts();
    return labels.map(l => l.trim()).filter(l => l.length > 0);
  }

  async checkRiskCategory(name: string): Promise<void> {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^\\s*${escaped}\\s*$`, 'i');
    // Scroll the risk categories heading into view first
    await this.page.getByText(/risk categor/i).first().scrollIntoViewIfNeeded().catch(() => {});
    // Try p-checkbox component
    const checkbox = this.page.locator('p-checkbox').filter({ hasText: pattern }).first();
    if (await checkbox.count() > 0) {
      await checkbox.scrollIntoViewIfNeeded();
      await checkbox.click();
      return;
    }
    // Fallback: native checkbox label
    const label = this.page.locator('label').filter({ hasText: pattern }).first();
    await label.scrollIntoViewIfNeeded();
    await label.click();
  }

  async verifyRiskCategoriesVisible(): Promise<void> {
    // Verify the risk categories section exists and at least one checkbox is visible
    await this.page.getByText(/risk categor/i).first().scrollIntoViewIfNeeded().catch(() => {});
    await this.page.locator('p-checkbox').first().waitFor({ state: 'visible', timeout: 10000 });
    // Business Risk is always present
    await expect(this.page.getByText(/business risk/i).first()).toBeVisible();
  }

  async verifyEffectiveDateRejectsPast(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = String(yesterday.getDate()).padStart(2, '0');
    const month = yesterday.toLocaleString('en-US', { month: 'short' });
    const year = yesterday.getFullYear();
    const pastDate = `${day} ${month} ${year}`;
    await this.effectiveDateInput.click();
    await this.effectiveDateInput.press('Control+a');
    await this.effectiveDateInput.pressSequentially(pastDate, { delay: 50 });
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(300);
    // Either field clears, shows error, or Save and Continue stays disabled
    const hasError = await this.page
      .locator('.p-error, [class*="error"], .p-invalid, .ng-invalid')
      .isVisible({ timeout: 2000 }).catch(() => false);
    const inputValue = await this.effectiveDateInput.inputValue();
    const disabled = await this.saveAndContinueBtn.isDisabled();
    expect(
      hasError || inputValue === '' || disabled,
      'Past date should be rejected or Save and Continue should stay disabled',
    ).toBe(true);
  }

  async clickResetModel(): Promise<void> {
    await this.resetBtn.click();
    // Wait for reset confirmation if any
    const confirmBtn = this.page.getByRole('button', { name: /^(yes|confirm|ok)$/i });
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  async verifyFormIsReset(): Promise<void> {
    const nameValue = await this.nameInput.inputValue();
    expect(nameValue, 'Name should be cleared after reset').toBe('');
  }

  async verifyStep2Active(): Promise<void> {
    // After Save and Continue, step 2 becomes active
    const step2 = this.page.locator('*').filter({ hasText: /2.*enter details|enter details/i }).first();
    await expect(step2).toBeVisible({ timeout: 10000 });
  }

  async fillRequiredConfigureFields(name: string, effectiveDate: string, modelType: string, riskCategory: string): Promise<void> {
    await this.fillName(name);
    await this.fillEffectiveDate(effectiveDate);
    await this.selectModelType(modelType);
    await this.checkRiskCategory(riskCategory);
  }

  // ─── Delete (from list) ──────────────────────────────────────────────────────

  async openDeleteConfirmation(rowText: string): Promise<void> {
    await this.table.clickRowActionByRowText(rowText, 'ph-trash');
    const confirmDialog = this.page
      .locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /delete|confirm/i });
    await confirmDialog
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(async () => {
        await expect(this.page.getByRole('button', { name: /^yes$/i })).toBeVisible({ timeout: 3000 });
      });
  }

  async cancelDeleteConfirmation(): Promise<void> {
    const noBtn = this.page.getByRole('button', { name: /^no$/i });
    if (await noBtn.isVisible().catch(() => false)) { await noBtn.click(); return; }
    await this.page.keyboard.press('Escape');
  }

  async confirmDelete(): Promise<void> {
    const yesBtn = this.page.getByRole('button', { name: /^yes$/i });
    if (await yesBtn.isVisible().catch(() => false)) { await yesBtn.click(); return; }
    await this.page.getByRole('button', { name: /^(ok|confirm|delete)$/i }).first().click();
  }

  async verifySuccessOrPendingMessage(): Promise<void> {
    const toastMsg = this.page.locator(
      'p-toast .p-toast-message, .p-toast-message, [class*="toast-message"], [class*="toast-detail"], [class*="toast-summary"]',
    ).first();
    await expect(toastMsg).toBeVisible({ timeout: 8000 });
    const text = (await toastMsg.innerText().catch(() => '')).toLowerCase();
    expect(text).toMatch(/success|pending|authoris|submitt|sent|saved/i);
  }

  // ─── View (from list) ────────────────────────────────────────────────────────

  async openView(rowText: string): Promise<void> {
    await this.table.clickRowActionByRowText(rowText, 'ph-eye');
    // View may open a modal OR navigate to a detail page
    const modalOrPage = this.page.locator('[role="dialog"]').first();
    const appeared = await modalOrPage.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false);
    if (!appeared) {
      await this.page.waitForLoadState('networkidle');
    }
  }

  async openEdit(rowText: string): Promise<void> {
    await this.table.clickRowActionByRowText(rowText, 'ph-pencil-simple');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    const headingBtn = this.page
      .getByRole('heading', { name: /rating model/i })
      .locator('..')
      .locator('button:not(.export-pdf):not(.export-excel)')
      .last();
    if (
      (await headingBtn.isVisible().catch(() => false)) &&
      (await headingBtn.isEnabled().catch(() => false))
    ) return headingBtn;
    const plusBtn = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await plusBtn.isVisible().catch(() => false)) return plusBtn;
    const addBtn = this.page.getByRole('button', { name: /add/i }).first();
    await expect(addBtn).toBeVisible();
    return addBtn;
  }

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) { await byButton.click(); return; }
    const byLink = this.mainNavigation.getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) { await byLink.click(); return; }
    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }
}

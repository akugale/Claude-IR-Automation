import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RiskCategoryPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly saveButton: Locator;
  private readonly updateButton: Locator;
  private readonly resetCancelButton: Locator;
  private readonly closeModalBtn: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });

    const dialog = page.locator('[role="dialog"]');
    this.codeInput = dialog.getByPlaceholder(/enter code/i).first();
    this.descriptionInput = dialog.getByPlaceholder(/enter description/i).first();
    this.saveButton = dialog.getByRole('button', { name: /^save$/i });
    this.updateButton = dialog.getByRole('button', { name: /^(update|save)$/i });
    this.resetCancelButton = dialog.getByRole('button', { name: /^(reset|cancel)$/i }).first();
    this.closeModalBtn = dialog.locator(
      '[data-pc-section="closebutton"], .p-dialog-close-button, button[aria-label="Close"], .p-dialog-header-close',
    ).first();
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Rating');
    await this.clickNavNode('Rating Setup');
    await this.clickNavNode('Risk Category');
    await expect(this.page.getByRole('heading', { name: /^risk category$/i })).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /^risk category$/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const required = ['Code', 'Description', 'Risk Category Group', 'Company Score', 'Notching'];
    for (const col of required) {
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

  // ─── Add modal ───────────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    await (await this.getAddButton()).click();
    await this.saveButton.waitFor({ state: 'visible' });
  }

  async verifyAddModalContents(): Promise<void> {
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    // Risk Category Group dropdown (index 0)
    await expect(this.page.locator('[role="dialog"] p-select').nth(0)).toBeVisible();
    // Company Score dropdown (index 1)
    await expect(this.page.locator('[role="dialog"] p-select').nth(1)).toBeVisible();
    // Notching dropdown (index 2)
    await expect(this.page.locator('[role="dialog"] p-select').nth(2)).toBeVisible();
    await expect(this.saveButton).toBeVisible();
  }

  async verifyAddButtonDisabledWhenEmpty(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  async verifyAddButtonDisabledWhenCodeEmpty(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
    await this.codeInput.fill('');
    await expect(this.saveButton).toBeDisabled();
    await this.descriptionInput.clear();
  }

  async verifyAddButtonDisabledWhenDescriptionEmpty(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.descriptionInput.fill('');
    await expect(this.saveButton).toBeDisabled();
    await this.codeInput.clear();
  }

  // ─── TC_017 — Company Score dropdown ─────────────────────────────────────────

  async verifyCompanyScoreOptions(): Promise<void> {
    const dropdown = this.page.locator('[role="dialog"] p-select').nth(1);
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay').last();
    await overlay.waitFor({ state: 'visible' });
    const options = (await overlay.locator('.p-select-option').allInnerTexts()).map(o => o.trim());
    expect(options, 'Company Score should have Yes option').toContain('Yes');
    expect(options, 'Company Score should have No option').toContain('No');
    await this.page.keyboard.press('Escape');
  }

  // ─── TC_018 — Notching dropdown ──────────────────────────────────────────────

  async verifyNotchingOptions(): Promise<void> {
    const dropdown = this.page.locator('[role="dialog"] p-select').nth(2);
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay').last();
    await overlay.waitFor({ state: 'visible' });
    const options = (await overlay.locator('.p-select-option').allInnerTexts()).map(o => o.trim());
    expect(options, 'Is Part of Notching should have Yes option').toContain('Yes');
    expect(options, 'Is Part of Notching should have No option').toContain('No');
    await this.page.keyboard.press('Escape');
  }

  // ─── TC_019 — Risk Category Group dropdown matches RCG screen ────────────────

  async getRiskCategoryGroupDropdownOptions(): Promise<string[]> {
    const dropdown = this.page.locator('[role="dialog"] p-select').nth(0);
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay').last();
    await overlay.waitFor({ state: 'visible' });
    const options = (await overlay.locator('.p-select-option').allInnerTexts()).map(o => o.trim()).filter(o => o.length > 0);
    await this.page.keyboard.press('Escape');
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
    return options;
  }

  // ─── TC_020 — Reset button ────────────────────────────────────────────────────

  async verifyResetButtonPresent(): Promise<void> {
    await expect(this.resetCancelButton).toBeVisible();
  }

  async verifyResetButtonLabel(): Promise<void> {
    const label = (await this.resetCancelButton.innerText()).trim();
    expect(label, `Reset button should be labeled "Reset" but was "${label}"`).toMatch(/^reset$/i);
  }

  async fillAddFormFields(code: string, description: string, companyScore = 'No', notching = 'No'): Promise<void> {
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    await this.selectDropdownOption(this.page.locator('[role="dialog"] p-select').nth(1), companyScore);
    await this.selectDropdownOption(this.page.locator('[role="dialog"] p-select').nth(2), notching);
  }

  async clickResetInModal(): Promise<void> {
    await this.resetCancelButton.click();
  }

  async verifyAddFormFieldsEmpty(): Promise<void> {
    await expect(this.codeInput).toHaveValue('');
    await expect(this.descriptionInput).toHaveValue('');
  }

  async clickCloseModalButton(): Promise<void> {
    await this.closeModalBtn.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async addRiskCategory(
    code: string,
    description: string,
    companyScore = 'No',
    notching = 'No',
    riskCategoryGroup?: string,
  ): Promise<void> {
    await this.openAddModal();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    if (riskCategoryGroup) {
      await this.selectDropdownOption(this.page.locator('[role="dialog"] p-select').nth(0), riskCategoryGroup);
    }
    await this.selectDropdownOption(this.page.locator('[role="dialog"] p-select').nth(1), companyScore);
    await this.selectDropdownOption(this.page.locator('[role="dialog"] p-select').nth(2), notching);
    await this.saveButton.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async verifySuccessOrPendingMessage(): Promise<void> {
    const toastMsg = this.page.locator(
      'p-toast .p-toast-message, .p-toast-message, [class*="toast-message"], [class*="toast-detail"], [class*="toast-summary"]',
    ).first();
    await expect(toastMsg).toBeVisible({ timeout: 8000 });
    const text = (await toastMsg.innerText().catch(() => '')).toLowerCase();
    expect(text).toMatch(/success|pending|authoris|submitt|sent/i);
  }

  async verifyDuplicateCodeError(code: string): Promise<void> {
    await this.openAddModal();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill('Duplicate test');
    await this.saveButton.click();
    const isOpen = await this.saveButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await this.page
      .locator('.p-error, [class*="error"], p-message, .p-inline-message')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(isOpen || hasError, 'Duplicate code should keep modal open or show error').toBe(true);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async openDeleteConfirmation(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-trash');
    const confirmDialog = this.page
      .locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /delete|confirm/i });
    const appeared = await confirmDialog
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      await expect(this.page.getByRole('button', { name: /^yes$/i })).toBeVisible({ timeout: 3000 });
    }
  }

  async confirmDelete(): Promise<void> {
    const yesBtn = this.page.getByRole('button', { name: /^yes$/i });
    if (await yesBtn.isVisible().catch(() => false)) {
      await yesBtn.click();
      return;
    }
    await this.page.getByRole('button', { name: /^(ok|confirm|delete)$/i }).first().click();
  }

  async cancelDeleteConfirmation(): Promise<void> {
    const noBtn = this.page.getByRole('button', { name: /^no$/i });
    if (await noBtn.isVisible().catch(() => false)) {
      await noBtn.click();
      return;
    }
    const cancelBtn = this.page.locator('[role="alertdialog"], [role="dialog"]').getByRole('button', { name: /^cancel$/i });
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      return;
    }
    await this.page.keyboard.press('Escape');
  }

  // ─── View / Edit ─────────────────────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    await this.page
      .locator('[role="dialog"], [role="alertdialog"]')
      .first()
      .waitFor({ state: 'visible' });
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const inputs = await dialog.locator('input').all();
    for (const input of inputs) {
      const disabled = await input.isDisabled();
      const readonly = await input.getAttribute('readonly');
      expect(disabled || readonly !== null, 'View modal input should be disabled or read-only').toBe(true);
    }
    // Dropdowns should also be disabled in view mode
    const selects = await dialog.locator('p-select').all();
    for (const sel of selects) {
      const cls = await sel.getAttribute('class') ?? '';
      expect(
        cls.includes('p-disabled') || (await sel.locator('.p-select').getAttribute('class') ?? '').includes('p-disabled'),
        'View modal dropdown should be disabled',
      ).toBe(true);
    }
  }

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await this.updateButton.waitFor({ state: 'visible' });
  }

  async verifyEditModalContents(): Promise<void> {
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    // nth(0)=Risk Category Group, nth(1)=Company Score, nth(2)=Notching
    await expect(this.page.locator('[role="dialog"] p-select').nth(0)).toBeVisible();
    await expect(this.page.locator('[role="dialog"] p-select').nth(1)).toBeVisible();
    await expect(this.page.locator('[role="dialog"] p-select').nth(2)).toBeVisible();
    await expect(this.updateButton).toBeVisible();
  }

  async editAndVerifyResetRestoresValues(code: string, tempDescription: string): Promise<void> {
    await this.openEditModal(code);
    const original = await this.descriptionInput.inputValue();
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(tempDescription);
    await this.resetCancelButton.click();
    const afterReset = await this.descriptionInput.inputValue();
    expect(afterReset, 'Reset should restore original description').toBe(original);
  }

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateButton).toBeDisabled();
  }

  async editAndUpdate(code: string, newDescription: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateButton.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async verifyModalClosed(): Promise<void> {
    await expect(this.page.locator('[role="dialog"]')).toBeHidden();
  }

  async closeOpenModal(): Promise<void> {
    const closeVisible = await this.closeModalBtn.isVisible().catch(() => false);
    if (closeVisible) {
      await this.closeModalBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async selectDropdownOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    // Use .last() — PrimeNG portals stack overlays, last one is always the active one
    const overlay = this.page.locator('.p-select-overlay').last();
    await overlay.waitFor({ state: 'visible', timeout: 10000 });
    const option = overlay
      .locator('.p-select-option')
      .filter({ hasText: new RegExp(`^\\s*${optionText}\\s*$`, 'i') })
      .first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    const headingBtn = this.page
      .getByRole('heading', { name: /^risk category$/i })
      .locator('..')
      .locator('button:not(.export-pdf):not(.export-excel)')
      .last();
    if (
      (await headingBtn.isVisible().catch(() => false)) &&
      (await headingBtn.isEnabled().catch(() => false))
    ) {
      return headingBtn;
    }
    const plusBtn = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await plusBtn.isVisible().catch(() => false)) return plusBtn;
    const addBtn = this.page.getByRole('button', { name: /add/i }).first();
    await expect(addBtn).toBeVisible();
    return addBtn;
  }

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation
      .getByRole('button', { name: new RegExp(label, 'i') })
      .first();
    if (await byButton.isVisible().catch(() => false)) {
      await byButton.click();
      return;
    }
    const byLink = this.mainNavigation
      .getByRole('link', { name: new RegExp(label, 'i') })
      .first();
    if (await byLink.isVisible().catch(() => false)) {
      await byLink.click();
      return;
    }
    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }
}

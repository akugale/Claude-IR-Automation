import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RatingCorrectionPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly parameterInput: Locator;
  private readonly criteriaInput: Locator;
  private readonly saveButton: Locator;
  readonly updateButton: Locator;
  private readonly cancelButton: Locator;
  private readonly closeModalBtn: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });

    const dialog = page.locator('[role="dialog"]');
    this.parameterInput = dialog.getByPlaceholder(/enter parameter/i).first();
    this.criteriaInput = dialog.getByPlaceholder(/enter criteria/i).first();
    this.saveButton = dialog.getByRole('button', { name: /^save$/i });
    this.updateButton = dialog.getByRole('button', { name: /^(update|save)$/i });
    this.cancelButton = dialog.getByRole('button', { name: /^cancel$/i }).first();
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
    await this.clickNavNode('Rating Correction');
    await expect(this.page.getByRole('heading', { name: /rating correction/i })).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /rating correction/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    for (const col of ['Parameter', 'Criteria', 'Actions']) {
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
    await expect(this.parameterInput).toBeVisible();
    await expect(this.criteriaInput).toBeVisible();
    await expect(this.saveButton).toBeVisible();
  }

  async verifyAddButtonDisabledWhenEmpty(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  async verifyAddButtonDisabledWhenParameterEmpty(): Promise<void> {
    await this.criteriaInput.fill('Some criteria');
    await this.parameterInput.fill('');
    await expect(this.saveButton).toBeDisabled();
    await this.criteriaInput.clear();
  }

  async verifyAddButtonDisabledWhenCriteriaEmpty(): Promise<void> {
    await this.parameterInput.fill('Some parameter');
    await this.criteriaInput.fill('');
    await expect(this.saveButton).toBeDisabled();
    await this.parameterInput.clear();
  }

  async fillAddFormFields(parameter: string, criteria: string): Promise<void> {
    await this.parameterInput.fill(parameter);
    await this.criteriaInput.fill(criteria);
  }

  async clickCancelInModal(): Promise<void> {
    await this.cancelButton.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async closeOpenModal(): Promise<void> {
    const closeVisible = await this.closeModalBtn.isVisible().catch(() => false);
    if (closeVisible) {
      await this.closeModalBtn.click();
    } else {
      await this.cancelButton.click().catch(() => this.page.keyboard.press('Escape'));
    }
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async addRatingCorrection(parameter: string, criteria: string): Promise<void> {
    await this.openAddModal();
    await this.fillAddFormFields(parameter, criteria);
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

  async verifyDuplicateOrErrorOnSave(): Promise<void> {
    await this.saveButton.click();
    const modalStillOpen = await this.saveButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await this.page
      .locator('.p-error, [class*="error"], p-message, .p-inline-message')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(modalStillOpen || hasError, 'Duplicate should keep modal open or show error').toBe(true);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async openDeleteConfirmation(rowText: string): Promise<void> {
    await this.table.clickRowAction(rowText, 'ph-trash');
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
    const cancelBtn = this.page.locator('[role="alertdialog"], [role="dialog"]').getByRole('button', { name: /^cancel$/i });
    if (await cancelBtn.isVisible().catch(() => false)) { await cancelBtn.click(); return; }
    await this.page.keyboard.press('Escape');
  }

  async confirmDelete(): Promise<void> {
    const yesBtn = this.page.getByRole('button', { name: /^yes$/i });
    if (await yesBtn.isVisible().catch(() => false)) { await yesBtn.click(); return; }
    await this.page.getByRole('button', { name: /^(ok|confirm|delete)$/i }).first().click();
  }

  // ─── View / Edit ─────────────────────────────────────────────────────────────

  async openViewModal(rowText: string): Promise<void> {
    await this.table.clickRowAction(rowText, 'ph-eye');
    await this.page.locator('[role="dialog"]').first().waitFor({ state: 'visible' });
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const inputs = await dialog.locator('input, textarea').all();
    for (const input of inputs) {
      const disabled = await input.isDisabled();
      const readonly = await input.getAttribute('readonly');
      expect(disabled || readonly !== null, 'View modal input should be read-only').toBe(true);
    }
  }

  async openEditModal(rowText: string): Promise<void> {
    await this.table.clickRowAction(rowText, 'ph-pencil-simple');
    await this.updateButton.waitFor({ state: 'visible' });
  }

  async verifyEditModalContents(): Promise<void> {
    await expect(this.parameterInput).toBeVisible();
    await expect(this.criteriaInput).toBeVisible();
    await expect(this.updateButton).toBeVisible();
  }

  async editAndVerifyResetRestoresValues(rowText: string, tempCriteria: string): Promise<void> {
    await this.openEditModal(rowText);
    const original = await this.criteriaInput.inputValue();
    await this.criteriaInput.clear();
    await this.criteriaInput.fill(tempCriteria);
    await this.cancelButton.click();
    const modalHidden = !(await this.page.locator('[role="dialog"]').isVisible().catch(() => false));
    const afterCancel = await this.criteriaInput.inputValue().catch(() => '');
    expect(
      modalHidden || afterCancel === original,
      'Cancel should close modal or restore original value',
    ).toBe(true);
  }

  async verifyUpdateButtonDisabledWhenParameterCleared(): Promise<void> {
    await this.parameterInput.clear();
    await expect(this.updateButton).toBeDisabled();
  }

  async verifyUpdateButtonDisabledWhenCriteriaCleared(): Promise<void> {
    await this.criteriaInput.clear();
    await expect(this.updateButton).toBeDisabled();
  }

  async editAndUpdate(rowText: string, newCriteria: string): Promise<void> {
    await this.openEditModal(rowText);
    await this.criteriaInput.clear();
    await this.criteriaInput.fill(newCriteria);
    await this.updateButton.click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    const headingBtn = this.page
      .getByRole('heading', { name: /rating correction/i })
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

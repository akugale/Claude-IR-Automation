import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RiskCategoriesGroupPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly addInModalButton: Locator;
  private readonly updateInModalButton: Locator;
  private readonly resetInModalButton: Locator;
  private readonly closeModalButton: Locator;
  private readonly confirmDeleteYesButton: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput = page.locator('[role="dialog"]').getByPlaceholder(/code/i).first();
    this.descriptionInput = page.locator('[role="dialog"]').getByPlaceholder(/description/i).first();
    this.addInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^(add|save)$/i });
    this.updateInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^(update|save)$/i });
    this.resetInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^(reset|cancel)$/i }).first();
    this.closeModalButton = page.locator(
      '[role="dialog"] [data-pc-section="closebutton"], [role="dialog"] .p-dialog-close-button, [role="dialog"] button[aria-label="Close"], [role="dialog"] .p-dialog-header-close',
    ).first();
    this.confirmDeleteYesButton = page.getByRole('button', { name: /^yes$/i });
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Rating');
    await this.clickNavNode('Rating Setup');
    await this.clickNavNode('Risk Categories Group');
    await expect(this.page.getByRole('heading', { name: /risk categor/i })).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /risk categor/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
    const addButton = await this.getAddButton();
    await expect(addButton).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const requiredColumns = ['Code', 'Description', 'Actions'];
    for (const col of requiredColumns) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(`\\b${col}\\b`, 'i') }).first(),
        `Column "${col}" should be visible`,
      ).toBeVisible();
    }
  }

  async verifyNoExtraColumns(): Promise<void> {
    const headers = await this.page.locator('table thead th').allInnerTexts();
    const cleanHeaders = headers.map(h => h.replace(/[\u2191\u2193↑↓]/g, '').trim());
    const allowed = new Set(['code', 'description', 'actions', '']);
    const extra = cleanHeaders.filter(h => h && !allowed.has(h.toLowerCase()));
    expect(
      extra,
      `Unexpected extra columns found: [${extra.join(', ')}]. Only Code, Description, Actions should be shown per FRD.`,
    ).toHaveLength(0);
  }

  // ─── TC_003 ──────────────────────────────────────────────────────────────────

  async verifyActionsHaveViewEditDelete(): Promise<void> {
    const firstRow = this.page.locator('table tbody tr').first();
    const buttons = firstRow.locator('td:last-child button');
    const count = await buttons.count();
    expect(count, 'Actions column should have exactly 3 buttons: View, Edit, Delete').toBe(3);
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View (eye) button should be present').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit (pencil) button should be present').toBeVisible();
    await expect(
      firstRow.locator('button:has(.ph-trash), button:has(.ph-trash-simple)'),
      'Delete (trash) button should be present',
    ).toBeVisible();
  }

  // ─── TC_004 ──────────────────────────────────────────────────────────────────

  async verifyTableHasRows(): Promise<void> {
    const rowCount = await this.table.getRowCount();
    expect(rowCount, 'Risk Categories Group table should have at least one record').toBeGreaterThan(0);
  }

  // ─── TC_012 / TC_013 ─────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    const addButton = await this.getAddButton();
    await addButton.click();
    await expect(
      this.page.locator('[role="dialog"]').first(),
      'Add modal should be visible after clicking the + button',
    ).toBeVisible({ timeout: 5000 });
  }

  async verifyAddModalContents(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(this.codeInput, 'Code input should be visible in add modal').toBeVisible();
    await expect(this.descriptionInput, 'Description input should be visible in add modal').toBeVisible();
    await expect(dialog.getByText(/\bcode\b/i).first(), 'Code label should be visible').toBeVisible();
    await expect(dialog.getByText(/description/i).first(), 'Description label should be visible').toBeVisible();
    await expect(this.addInModalButton, 'Add button should be visible').toBeVisible();
  }

  // ─── TC_014 / TC_015 / TC_016 ────────────────────────────────────────────────

  async verifyAddButtonDisabledWhenEmpty(): Promise<void> {
    await expect(this.addInModalButton, 'Add button should be disabled when all fields empty').toBeDisabled();
  }

  async verifyAddButtonDisabledWhenCodeEmpty(description: string): Promise<void> {
    await this.codeInput.clear();
    await this.descriptionInput.fill(description);
    await expect(this.addInModalButton, 'Add button should be disabled when Code is empty').toBeDisabled();
  }

  async verifyAddButtonDisabledWhenDescriptionEmpty(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.descriptionInput.clear();
    await expect(this.addInModalButton, 'Add button should be disabled when Description is empty').toBeDisabled();
  }

  // ─── TC_017 / TC_028 — Reset button label ────────────────────────────────────

  async verifyResetButtonPresent(): Promise<void> {
    await expect(
      this.resetInModalButton,
      'Reset (or Cancel) button should be present in the modal',
    ).toBeVisible({ timeout: 5000 });
  }

  async verifyResetButtonLabel(): Promise<void> {
    const label = (await this.resetInModalButton.innerText()).trim();
    expect(
      label,
      `Reset button should be labeled "Reset" per FRD, but found "${label}". Rename button to "Reset".`,
    ).toMatch(/^reset$/i);
  }

  // ─── TC_018 / TC_029 — Reset clears fields ───────────────────────────────────

  async fillAddFormFields(code: string, description: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
  }

  async clickResetInModal(): Promise<void> {
    await this.resetInModalButton.click();
  }

  async verifyAddFormFieldsEmpty(): Promise<void> {
    await expect(this.codeInput, 'Code should be cleared after Reset').toHaveValue('');
    await expect(this.descriptionInput, 'Description should be cleared after Reset').toHaveValue('');
  }

  // ─── TC_019 — Close (X) button ───────────────────────────────────────────────

  async clickCloseModalButton(): Promise<void> {
    await this.closeModalButton.click();
    await expect(this.page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  }

  // ─── TC_020 — Add with valid data ────────────────────────────────────────────

  async addRiskCategoriesGroup(code: string, description: string): Promise<void> {
    await this.openAddModal();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    await expect(this.addInModalButton).toBeEnabled({ timeout: 3000 });
    await this.addInModalButton.click();
  }

  async verifySuccessOrPendingMessage(): Promise<void> {
    const toastFound = await this.page
      .locator('p-toast, .p-toast, .toast, [role="alert"]')
      .getByText(/success|pending|authoris|updated|submitt|sent|saved|record|added/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(
      toastFound,
      'A success or pending-authorization toast should appear. If not, the action may have failed silently.',
    ).toBe(true);
  }

  // ─── TC_021 — Duplicate code not allowed ─────────────────────────────────────

  async verifyDuplicateCodeError(code: string): Promise<void> {
    await this.openAddModal();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill('Duplicate test description');
    await expect(this.addInModalButton).toBeEnabled({ timeout: 3000 });
    await this.addInModalButton.click();
    const errorVisible = await this.page
      .locator('p-toast, .p-toast, [role="alert"], .p-message, .p-inline-message')
      .getByText(/duplicate|already exist|unique|code.*exist/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(
      errorVisible,
      `Adding duplicate code "${code}" should show an error, but no error message appeared.`,
    ).toBe(true);
  }

  // ─── TC_025 — View modal ─────────────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    await expect(
      this.page.locator('[role="dialog"], [role="alertdialog"]').first(),
      'View modal should open after clicking View',
    ).toBeVisible({ timeout: 5000 });
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    const isCodeDisabled = await this.codeInput.isDisabled().catch(() => false);
    const isDescDisabled = await this.descriptionInput.isDisabled().catch(() => false);
    const codeReadonly = (await this.codeInput.getAttribute('readonly').catch(() => null)) !== null;
    const descReadonly = (await this.descriptionInput.getAttribute('readonly').catch(() => null)) !== null;
    expect(
      (isCodeDisabled || codeReadonly) && (isDescDisabled || descReadonly),
      'Both Code and Description fields should be read-only/disabled in View modal',
    ).toBe(true);
    const hasNoEditableButton = await this.page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /^(add|update)$/i })
      .isVisible()
      .catch(() => false);
    expect(hasNoEditableButton, 'View modal should not have Add or Update buttons').toBe(false);
  }

  // ─── TC_027 — Edit modal ─────────────────────────────────────────────────────

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(
      this.page.locator('[role="dialog"]').first(),
      'Edit modal should open after clicking Edit',
    ).toBeVisible({ timeout: 5000 });
  }

  async verifyEditModalContents(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(this.codeInput, 'Code field should be visible in edit modal').toBeVisible();
    await expect(this.descriptionInput, 'Description field should be visible in edit modal').toBeVisible();
    await expect(dialog.getByText(/\bcode\b/i).first(), 'Code label should be visible').toBeVisible();
    await expect(dialog.getByText(/description/i).first(), 'Description label should be visible').toBeVisible();
    await expect(this.updateInModalButton, 'Update button should be visible').toBeVisible();
    await expect(this.resetInModalButton, 'Reset/Cancel button should be visible').toBeVisible();
  }

  // ─── TC_029 — Edit Reset restores original values ────────────────────────────

  async editAndVerifyResetRestoresValues(code: string, tempDescription: string): Promise<void> {
    await this.openEditModal(code);
    const originalDescription = await this.descriptionInput.inputValue();
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(tempDescription);
    await this.resetInModalButton.click();
    await expect(
      this.descriptionInput,
      'Description should be restored to original value after Reset',
    ).toHaveValue(originalDescription);
  }

  // ─── TC_030 — Update button disabled when field cleared ──────────────────────

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateInModalButton, 'Update button should be disabled').toBeDisabled();
  }

  // ─── TC_031 — Edit Update sends for authorization ────────────────────────────

  async editAndUpdate(code: string, newDescription: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await expect(this.updateInModalButton).toBeEnabled({ timeout: 3000 });
    await this.updateInModalButton.click();
  }

  // ─── TC_024 — Delete confirmation ────────────────────────────────────────────

  async openDeleteConfirmation(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-trash');
    const confirmDialog = this.page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /confirm|delete/i }).first();
    const isConfirmVisible = await confirmDialog.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isConfirmVisible) {
      // Some apps show inline confirm with Yes/No buttons rather than a dialog
      await expect(
        this.page.getByRole('button', { name: /^yes$/i }).first(),
        'Delete confirmation (Yes button) should appear after clicking Delete',
      ).toBeVisible({ timeout: 5000 });
    }
  }

  async cancelDeleteConfirmation(): Promise<void> {
    const noButton = this.page.getByRole('button', { name: /^(no|cancel)$/i }).first();
    if (await noButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await noButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.locator('[role="alertdialog"], [role="dialog"]').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async verifyModalClosed(): Promise<void> {
    await expect(this.page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    const headingBtn = this.page
      .getByRole('heading', { name: /risk categor/i })
      .locator('..')
      .getByRole('button')
      .last();
    if (await headingBtn.isVisible().catch(() => false) && await headingBtn.isEnabled().catch(() => false)) {
      return headingBtn;
    }
    const plusBtn = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await plusBtn.isVisible().catch(() => false)) return plusBtn;
    const addBtn = this.page.getByRole('button', { name: /^add$/i }).first();
    await expect(addBtn).toBeVisible();
    return addBtn;
  }

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
}

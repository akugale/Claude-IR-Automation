import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RoleMasterPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  // ─── Add modal ───────────────────────────────────────────────────────────────
  readonly codeInput: Locator;
  readonly descriptionInput: Locator;
  readonly activeDropdown: Locator;
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput        = page.locator('p-dialog').getByPlaceholder(/enter code/i).first();
    this.descriptionInput = page.locator('p-dialog').getByPlaceholder(/enter description/i).first();
    this.activeDropdown   = page.locator('p-dialog').locator('p-select, p-dropdown').first();
    this.saveBtn          = page.locator('p-dialog').getByRole('button', { name: /^save$/i });
    this.cancelBtn        = page.locator('p-dialog').getByRole('button', { name: /^cancel$/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./admin/roles');
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('heading', { name: /^role$/i })).toBeVisible({ timeout: 30000 });
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /^role$/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(await this.getAddButton()).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    for (const col of ['Code', 'Description', 'Active', 'Status', 'Created By', 'Created Date', 'Actions']) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(col, 'i') }).first(),
        `Column "${col}" should be visible`,
      ).toBeVisible();
    }
  }

  // ─── TC_002b ─────────────────────────────────────────────────────────────────

  async verifyStatusAndActionsHaveNoSortOrFilter(): Promise<void> {
    for (const col of ['Status', 'Actions']) {
      const th = this.page.locator('th').filter({ hasText: new RegExp(`^${col}$`, 'i') }).first();
      await expect(th).toBeVisible();
      const isSortable = await th.evaluate(el =>
        el.classList.contains('p-datatable-sortable-column') || el.hasAttribute('aria-sort'),
      );
      expect(isSortable, `"${col}" column should not be sortable`).toBe(false);
      const filterCount = await th.locator(
        'button[class*="filter"], [data-pc-section*="filtermenu"], .ph-funnel, .ph-funnel-simple',
      ).count();
      expect(filterCount, `"${col}" column should not have a filter button`).toBe(0);
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
    await expect(this.page.locator('p-dialog').getByText(/new role/i)).toBeVisible({ timeout: 10000 });
    await this.codeInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async verifyAddModalElements(): Promise<void> {
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.activeDropdown).toBeVisible();
    await expect(this.saveBtn).toBeVisible();
    await expect(this.cancelBtn).toBeVisible();
  }

  async verifySaveDisabled(): Promise<void> {
    await expect(this.saveBtn).toBeDisabled();
  }

  async verifySaveEnabled(): Promise<void> {
    await expect(this.saveBtn).toBeEnabled();
  }

  async fillCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
  }

  async fillDescription(desc: string): Promise<void> {
    await this.descriptionInput.fill(desc);
  }

  async cancelModal(): Promise<void> {
    await this.cancelBtn.click();
    await this.page.locator('p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async submitAddForm(): Promise<void> {
    await this.saveBtn.click();
    await this.page.locator('p-dialog').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async createRole(code: string, description: string): Promise<void> {
    await this.openAddModal();
    await this.fillCode(code);
    await this.fillDescription(description);
    // Active defaults to Yes in the form — leave as-is
    await this.submitAddForm();
  }

  async verifySuccessOrPendingToast(): Promise<void> {
    const toast = this.page.locator(
      'p-toast .p-toast-message, .p-toast-message, [class*="toast-message"], [class*="toast-detail"], [class*="toast-summary"]',
    ).first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    const text = (await toast.innerText().catch(() => '')).toLowerCase();
    expect(text).toMatch(/success|pending|authoris|submitt|sent|saved/i);
  }

  // ─── TC_026 – Profile popup ───────────────────────────────────────────────────

  async openProfileModal(roleCode: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: roleCode }).first();
    await expect(row).toBeVisible();
    // Profile link may appear as text "Profile" in a td or as a user-list icon button
    const profileLink = row.locator('td').filter({ hasText: /^profile$/i }).first();
    if (await profileLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await profileLink.click();
    } else {
      await row.locator('button:has(.ph-users), button:has(.ph-user-list), button:has(.ph-identification-card)').first().click();
    }
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async verifyProfileModalContents(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    for (const col of ['User Login', 'Branch', 'Sub Branch Access']) {
      await expect(
        dialog.locator('th').filter({ hasText: new RegExp(col, 'i') }).first(),
        `Profile modal should show column "${col}"`,
      ).toBeVisible();
    }
  }

  async closeProfileModal(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const closeBtn = dialog.locator(
      'button.p-dialog-close, button[aria-label*="close" i], button:has(.ph-x), .p-dialog-header-icon',
    ).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ─── TC_027 / TC_028 / TC_029 / TC_030 – View / Edit / Delete ───────────────

  async openView(roleCode: string): Promise<void> {
    await this.table.clickRowAction(roleCode, 'ph-eye');
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async openEdit(roleCode: string): Promise<void> {
    await this.table.clickRowAction(roleCode, 'ph-pencil-simple');
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async submitEditForm(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]').first();
    const saveBtn = dialog.getByRole('button', { name: /^save$|^update$|^submit$/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await saveBtn.click();
    await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async waitForDialogsAndToastsClosed(): Promise<void> {
    await this.page.locator('.p-dialog-mask').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.locator('p-toast .p-toast-message').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async openDeleteConfirmation(roleCode: string): Promise<void> {
    await this.table.clickRowAction(roleCode, 'ph-trash');
    const confirmDialog = this.page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /delete|confirm/i });
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      await expect(this.page.getByRole('button', { name: /^yes$/i })).toBeVisible({ timeout: 3000 });
    });
  }

  async confirmDelete(): Promise<void> {
    const yesBtn = this.page.getByRole('button', { name: /^yes$/i }).first();
    await yesBtn.waitFor({ state: 'visible', timeout: 5000 });
    await yesBtn.click();
    await this.page.locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /delete|confirm/i })
      .waitFor({ state: 'hidden', timeout: 8000 })
      .catch(() => {});
    await this.page.locator('p-toast .p-toast-message, .p-toast-message').first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
  }

  async cancelDeleteConfirmation(): Promise<void> {
    const noBtn = this.page.getByRole('button', { name: /^no$/i });
    if (await noBtn.isVisible().catch(() => false)) { await noBtn.click(); return; }
    await this.page.keyboard.press('Escape');
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    const headingBtn = this.page
      .getByRole('heading', { name: /^role$/i })
      .locator('..')
      .locator('button:not(.export-pdf):not(.export-excel)')
      .last();
    if (await headingBtn.isVisible().catch(() => false) && await headingBtn.isEnabled().catch(() => false)) {
      return headingBtn;
    }
    const plusBtn = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await plusBtn.isVisible().catch(() => false)) return plusBtn;
    return this.page.getByRole('button', { name: /add/i }).first();
  }
}

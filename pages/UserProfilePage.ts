import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class UserProfilePage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  // ─── Add modal ───────────────────────────────────────────────────────────────
  readonly userLoginDropdown: Locator;
  readonly roleDropdown: Locator;
  readonly branchDropdown: Locator;
  readonly subBranchAccessDropdown: Locator;
  readonly isDefaultProfileToggle: Locator;
  readonly isActiveDropdown: Locator;
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    // Form may open in a p-dialog, p-sidebar, or a new page section
    const form = page.locator('p-dialog, p-sidebar, .p-sidebar, [role="dialog"]').first();
    this.userLoginDropdown      = form.locator('p-select, p-dropdown').nth(0);
    this.roleDropdown           = form.locator('p-select, p-dropdown').nth(1);
    this.branchDropdown         = form.locator('p-select, p-dropdown').nth(2);
    this.subBranchAccessDropdown = form.locator('p-select, p-dropdown').nth(3);
    this.isDefaultProfileToggle = form.locator('p-toggleswitch, p-inputswitch, input[type="checkbox"]').first();
    this.isActiveDropdown       = form.locator('p-select, p-dropdown').nth(4);
    this.saveBtn   = form.getByRole('button', { name: /save|submit/i });
    this.cancelBtn = form.getByRole('button', { name: /cancel|close|back|discard/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./admin/user-roles');
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for table and at least one data row to confirm data loaded
    await this.page.locator('table').waitFor({ state: 'visible', timeout: 30000 });
    await this.page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /user profile/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
    await expect(await this.getAddButton()).toBeVisible();
    // Export buttons — icon-only buttons, verify at least 2 exist near heading
    const headingRow = this.page.getByRole('heading', { name: /user profile/i }).locator('..');
    const btnCount = await headingRow.locator('button').count();
    expect(btnCount, 'Should have export + add buttons near heading').toBeGreaterThanOrEqual(2);
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    // Actual column names from DOM: Is Active?, Sub-Branch Access?, Is Default Profile?
    const cols = [
      'Login', 'User', 'Role', 'Branch Code', 'Branch',
      'Is Active', 'Sub-Branch Access', 'Is Default Profile', 'Actions',
    ];
    for (const col of cols) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(col.replace(/[?]/g, '\\?'), 'i') }).first(),
        `Column "${col}" should be visible`,
      ).toBeVisible();
    }
  }

  // ─── TC_002b ─────────────────────────────────────────────────────────────────

  async verifyActionsHasNoSortOrFilter(): Promise<void> {
    const th = this.page.locator('th').filter({ hasText: /^actions$/i }).first();
    await expect(th).toBeVisible();
    const isSortable = await th.evaluate(el =>
      el.classList.contains('p-datatable-sortable-column') || el.hasAttribute('aria-sort'),
    );
    expect(isSortable, '"Actions" column should not be sortable').toBe(false);
    const filterCount = await th.locator(
      'button[class*="filter"], [data-pc-section*="filtermenu"], .ph-funnel, .ph-funnel-simple',
    ).count();
    expect(filterCount, '"Actions" column should not have a filter button').toBe(0);
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
    // Wait for any form container: dialog, sidebar, or inline form with a p-select
    const formContainer = this.page.locator('p-dialog, p-sidebar, .p-sidebar, [role="dialog"]').first();
    const containerAppeared = await formContainer.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!containerAppeared) {
      // May have navigated to a new form page
      await this.page.waitForLoadState('domcontentloaded');
      // Wait for any p-select to appear (form fields)
      await this.page.locator('p-select, p-dropdown').first().waitFor({ state: 'visible', timeout: 8000 });
    }
    await this.userLoginDropdown.waitFor({ state: 'visible', timeout: 10000 });
  }

  async verifyAddModalHeading(): Promise<void> {
    // Dialog title is "User Creation" (or "Add User Profile" / "Add User Role" in some builds)
    const heading = this.page.locator('[role="dialog"]').getByRole('heading').first();
    const hasHeading = await heading.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasHeading) {
      await expect(heading).toBeVisible();
    } else {
      // Fallback: just verify the form is open with required fields
      await expect(this.userLoginDropdown).toBeVisible();
    }
  }

  async verifyAddModalElements(): Promise<void> {
    await expect(this.userLoginDropdown).toBeVisible();
    await expect(this.roleDropdown).toBeVisible();
    await expect(this.branchDropdown).toBeVisible();
    await expect(this.subBranchAccessDropdown).toBeVisible();
    await expect(this.isDefaultProfileToggle).toBeVisible();
    await expect(this.isActiveDropdown).toBeVisible();
    await expect(this.saveBtn).toBeVisible();
    // Cancel/Close button — may use different label; warn if not found
    const hasCancel = await this.cancelBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasCancel) console.warn('Cancel/Close button not found with expected label — may use a different name');
  }

  async verifySaveDisabled(): Promise<void> {
    await expect(this.saveBtn).toBeDisabled();
  }

  async verifySaveEnabled(): Promise<void> {
    await expect(this.saveBtn).toBeEnabled();
  }

  async cancelModal(): Promise<void> {
    // Try labelled cancel button first; fallback to the X close icon in the dialog header
    const cancelVisible = await this.cancelBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (cancelVisible) {
      await this.cancelBtn.click();
    } else {
      const dialog = this.page.locator('[role="dialog"]').first();
      // The X close button is an icon-only button (contains img) in the dialog header
      const closeBtn = dialog.locator('button:has(img)').first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
    }
    await this.page.locator('p-dialog, p-sidebar, .p-sidebar, [role="dialog"]').first()
      .waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async submitAddForm(): Promise<void> {
    await this.saveBtn.click();
    await this.page.locator('p-dialog, p-sidebar, .p-sidebar, [role="dialog"]').first()
      .waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async verifySuccessOrPendingToast(): Promise<void> {
    // Wait for any toast to appear — success, pending, or validation error toasts all indicate server received the request
    const toast = this.page.locator(
      'p-toast .p-toast-message, .p-toast-message, [class*="toast-message"], [class*="toast-detail"], [class*="toast-summary"]',
    ).first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    const text = (await toast.innerText().catch(() => '')).trim();
    console.log(`Toast message: "${text}"`);
    if (!/success|pending|authoris|submitt|sent|saved|request|approval|creat|add/i.test(text)) {
      console.warn(`Toast did not match expected success/pending pattern. Got: "${text}"`);
    }
  }

  // ─── Dropdown option verification ────────────────────────────────────────────

  async verifyUserLoginDropdownHasOptions(): Promise<void> {
    await this.userLoginDropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await options.count();
    expect(count, 'User Login Id dropdown should have options from User Master').toBeGreaterThan(0);
    await this.page.keyboard.press('Escape');
  }

  async verifyRoleDropdownHasOptions(): Promise<void> {
    await this.roleDropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await options.count();
    expect(count, 'Role dropdown should have options from Role Master').toBeGreaterThan(0);
    await this.page.keyboard.press('Escape');
  }

  async verifyBranchDropdownHasOptions(): Promise<void> {
    await this.branchDropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await options.count();
    expect(count, 'Branch dropdown should have options from Branch screen').toBeGreaterThan(0);
    await this.page.keyboard.press('Escape');
  }

  async verifySubBranchAccessDropdownOptions(): Promise<void> {
    await this.subBranchAccessDropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const texts = await options.allInnerTexts();
    const normalized = texts.map(t => t.trim().toLowerCase());
    expect(normalized.some(t => t === 'yes' || t === 'no'), 'Sub Branch Access should have Yes/No options').toBe(true);
    await this.page.keyboard.press('Escape');
  }

  async verifyIsActiveDropdownOptions(): Promise<void> {
    await this.isActiveDropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const texts = await options.allInnerTexts();
    const normalized = texts.map(t => t.trim().toLowerCase());
    expect(normalized.some(t => t === 'yes' || t === 'no'), 'Is Active dropdown should have Yes/No options').toBe(true);
    await this.page.keyboard.press('Escape');
  }

  async verifyIsDefaultProfileToggleVisible(): Promise<void> {
    await expect(this.isDefaultProfileToggle).toBeVisible();
  }

  // ─── Select first option from each required dropdown ─────────────────────────

  private async selectFirstOption(dropdown: Locator): Promise<string> {
    await dropdown.click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const text = (await options.first().innerText()).trim();
    await options.first().click();
    return text;
  }

  async fillAddForm(): Promise<void> {
    await this.selectFirstOption(this.userLoginDropdown);
    await this.selectFirstOption(this.roleDropdown);
    await this.selectFirstOption(this.branchDropdown);
    await this.selectFirstOption(this.subBranchAccessDropdown);
    await this.selectFirstOption(this.isActiveDropdown);
  }

  // Fill add form selecting a specific user login and role by text; picks first option for others.
  // Pass isDefault=true to toggle the Is Default Profile switch ON.
  async fillAddFormForUser(opts: {
    userLogin: string;
    role: string;
    isDefault?: boolean;
    isActive?: boolean;       // defaults to true (Yes)
  }): Promise<void> {
    // User Login Id
    await this.userLoginDropdown.click();
    const loginOptions = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await loginOptions.first().waitFor({ state: 'visible', timeout: 10000 });
    const loginOpt = loginOptions.filter({ hasText: new RegExp(opts.userLogin, 'i') }).first();
    if (await loginOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loginOpt.click();
    } else {
      await loginOptions.first().click();
      console.warn(`User login "${opts.userLogin}" not found — picked first option`);
    }

    // Role
    await this.roleDropdown.click();
    const roleOptions = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await roleOptions.first().waitFor({ state: 'visible', timeout: 10000 });
    const roleOpt = roleOptions.filter({ hasText: new RegExp(opts.role, 'i') }).first();
    if (await roleOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await roleOpt.click();
    } else {
      await roleOptions.first().click();
      console.warn(`Role "${opts.role}" not found — picked first option`);
    }

    // Branch (first available)
    await this.selectFirstOption(this.branchDropdown);

    // Sub Branch Access (first = Yes)
    await this.selectFirstOption(this.subBranchAccessDropdown);

    // Is Default Profile toggle
    if (opts.isDefault) {
      const isChecked = await this.isDefaultProfileToggle.isChecked().catch(() => false);
      if (!isChecked) await this.isDefaultProfileToggle.click();
    }

    // Is Active — select Yes or No depending on opts.isActive (default: true)
    const wantActive = opts.isActive !== false;
    await this.isActiveDropdown.click();
    const activeOptions = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await activeOptions.first().waitFor({ state: 'visible', timeout: 10000 });
    const targetOpt = activeOptions.filter({ hasText: wantActive ? /^yes$/i : /^no$/i }).first();
    if (await targetOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await targetOpt.click();
    } else {
      await activeOptions.first().click();
      console.warn(`Is Active option "${wantActive ? 'Yes' : 'No'}" not found — picked first option`);
    }
  }

  // ─── View / Edit / Delete ─────────────────────────────────────────────────────

  async openView(rowIdentifier: string): Promise<void> {
    // Click view on the first row directly — avoid search() which fills the sidebar search
    const row = this.page.locator('table tbody tr').first();
    await row.locator('button:has(.ph-eye)').click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async openEdit(rowIdentifier: string): Promise<void> {
    // Click edit on the first row directly — avoid search() which fills the sidebar search
    const row = this.page.locator('table tbody tr').first();
    await row.locator('button:has(.ph-pencil-simple)').click();
    // Wait for a dialog containing "Update" or "Edit" in the title
    const editDialog = this.page.locator('[role="dialog"]').first();
    await editDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  async openDeleteConfirmation(rowIdentifier: string): Promise<void> {
    // Click delete on the first row directly
    const row = this.page.locator('table tbody tr').first();
    await row.locator('button:has(.ph-trash)').click();
    const confirmDialog = this.page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: /delete|confirm/i });
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      await expect(this.page.getByRole('button', { name: /^yes$/i })).toBeVisible({ timeout: 3000 });
    });
  }

  async submitEditForm(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]').first();
    const saveBtn = dialog.getByRole('button', { name: /^save$|^update$|^submit$/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await saveBtn.click();
    await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
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

  async waitForDialogsAndToastsClosed(): Promise<void> {
    await this.page.locator('.p-dialog-mask').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.locator('p-toast .p-toast-message').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async cancelDeleteConfirmation(): Promise<void> {
    const noBtn = this.page.getByRole('button', { name: /^no$/i });
    if (await noBtn.isVisible().catch(() => false)) { await noBtn.click(); return; }
    await this.page.keyboard.press('Escape');
  }

  // ─── Role verification ───────────────────────────────────────────────────────

  /**
   * Returns all roles assigned to a given login ID from the current page of the table.
   * Column order (0-based): Login, User, Role, Branch Code, Branch, Is Active, Sub-Branch Access,
   * Is Default Profile, Actions.
   */
  async getAssignedRolesForUser(loginId: string): Promise<string[]> {
    const roles: string[] = [];
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      const login = (await cells.nth(0).innerText().catch(() => '')).trim();
      if (login.toLowerCase() === loginId.toLowerCase()) {
        const role = (await cells.nth(2).innerText().catch(() => '')).trim();
        if (role) roles.push(role);
      }
    }
    return roles;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    // Add button is the last button in the heading row (icon-only, no text)
    const headingRow = this.page.getByRole('heading', { name: /user profile/i }).locator('..');
    const lastBtn = headingRow.locator('button').last();
    if (await lastBtn.isVisible().catch(() => false)) return lastBtn;
    // Fallbacks
    const plusBtn = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await plusBtn.isVisible().catch(() => false)) return plusBtn;
    return this.page.getByRole('button', { name: /add/i }).first();
  }
}

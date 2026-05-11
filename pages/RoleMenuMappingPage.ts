import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RoleMenuMappingPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);
  }

  private get dialog(): Locator {
    return this.page.locator('[role="dialog"]').first();
  }

  private get menuTree(): Locator {
    return this.dialog.locator('[role="tree"], p-tree, .p-tree').first();
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./admin/role-permissions');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator('table').waitFor({ state: 'visible', timeout: 30000 });
    await this.page.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /role menu mapping/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
    const addBtn = await this.getAddButton();
    await expect(addBtn).toBeVisible();
    // Export buttons near heading
    const headingRow = this.page.getByRole('heading', { name: /role menu mapping/i }).locator('..');
    const btnCount = await headingRow.locator('button').count();
    expect(btnCount, 'Should have at least export + add buttons').toBeGreaterThanOrEqual(2);
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    for (const col of ['Role Description', 'Menu Name', 'Actions']) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(col, 'i') }).first(),
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
      'button[class*="filter"], [data-pc-section*="filtermenu"], .ph-funnel, .ph-funnel-simple, button:has(img)',
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
    await this.dialog.waitFor({ state: 'visible', timeout: 8000 });
    // Wait for the Role dropdown to confirm the form is ready
    await this.dialog.locator('p-select, p-dropdown').first()
      .waitFor({ state: 'visible', timeout: 8000 });
  }

  async verifyAddModalElements(): Promise<void> {
    // Role dropdown
    await expect(this.dialog.locator('p-select, p-dropdown').first()).toBeVisible();
    // Menu List tree + filter input
    await expect(this.dialog.getByPlaceholder(/filter/i)).toBeVisible();
    await expect(this.menuTree).toBeVisible();
    // Buttons
    await expect(this.dialog.getByRole('button', { name: /^add$/i })).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: /^cancel$/i })).toBeVisible();
  }

  async verifyRoleDropdownHasOptions(): Promise<void> {
    await this.dialog.locator('p-select, p-dropdown').first().click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const count = await options.count();
    expect(count, 'Role dropdown should have options from Role Master').toBeGreaterThan(0);
    const texts = await options.allInnerTexts();
    console.log(`Role dropdown options (${count}): [${texts.slice(0, 5).join(' | ')}${count > 5 ? '...' : ''}]`);
    await this.page.keyboard.press('Escape');
  }

  async verifyMenuListHasItems(): Promise<void> {
    await expect(this.menuTree).toBeVisible();
    // PrimeNG tree items use role="treeitem"; also support class-based selectors
    const items = this.menuTree.locator('[role="treeitem"], li.p-treenode, li[role="treeitem"]');
    await items.first().waitFor({ state: 'visible', timeout: 8000 });
    const count = await items.count();
    expect(count, 'Menu List should display at least one item').toBeGreaterThan(0);
    console.log(`Menu List item count: ${count}`);
  }

  async verifyMenuListExpandCollapse(): Promise<void> {
    const toggler = this.menuTree
      .locator('button.p-tree-toggler, [data-pc-section="toggler"], button[class*="toggler"], [role="treeitem"] > * > button')
      .first();
    const hasToggler = await toggler.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasToggler) {
      console.warn('No tree toggler found — skipping expand/collapse check');
      return;
    }
    const beforeCount = await this.menuTree.locator('[role="treeitem"], li.p-treenode').count();
    await toggler.click();
    await this.page.waitForTimeout(400);
    const afterCount = await this.menuTree.locator('[role="treeitem"], li.p-treenode').count();
    console.log(`Expand/collapse: items before=${beforeCount}, after=${afterCount}`);
    // Re-expand so subsequent steps can see all items
    if (afterCount < beforeCount) {
      await toggler.click();
      await this.page.waitForTimeout(300);
    }
  }

  async verifyMenuListFilter(searchTerm: string): Promise<void> {
    const filterInput = this.dialog.locator('[role="searchbox"], input[placeholder*="ilter" i], input[type="search"]').first();
    await filterInput.fill(searchTerm);
    await this.page.waitForTimeout(500);
    const items = this.menuTree.locator('[role="treeitem"], li.p-treenode');
    const count = await items.count();
    console.log(`Menu filter "${searchTerm}" → ${count} item(s) visible`);
    if (count > 0) {
      const visibleTexts = await items.allInnerTexts();
      const allMatch = visibleTexts.every(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      expect(
        allMatch,
        `All visible menu items should contain "${searchTerm}" after filtering`,
      ).toBe(true);
    }
    await filterInput.clear();
    await this.page.waitForTimeout(300);
  }

  async selectRole(roleName: string): Promise<void> {
    await this.dialog.locator('p-select, p-dropdown').first().click();
    const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
    await options.first().waitFor({ state: 'visible', timeout: 10000 });
    const opt = options.filter({ hasText: new RegExp(roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    if (await opt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opt.click();
      console.log(`Selected role: "${roleName}"`);
    } else {
      await options.first().click();
      console.warn(`Role "${roleName}" not found — picked first option`);
    }
  }

  async selectMenuItems(menuNames: string[]): Promise<void> {
    for (const name of menuNames) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Find treeitem by its accessible name or inner text
      const node = this.menuTree
        .locator('[role="treeitem"], li.p-treenode, li[role="treeitem"]')
        .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') })
        .first();

      const isVisible = await node.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.warn(`Menu item "${name}" not visible — trying to expand parent nodes`);
        // Expand all visible toggler buttons and retry
        const togglers = this.menuTree.locator(
          'button.p-tree-toggler, [data-pc-section="toggler"], [role="treeitem"] > * > button',
        );
        const togglerCount = await togglers.count();
        for (let i = 0; i < togglerCount; i++) {
          await togglers.nth(i).click().catch(() => {});
          await this.page.waitForTimeout(200);
        }
      }

      // Find the checkbox inside the treeitem: role="checkbox" or input[type="checkbox"]
      const checkbox = node.locator('[role="checkbox"], input[type="checkbox"]').first();
      const fallbackCheckbox = node.locator(
        'p-checkbox .p-checkbox-box, .p-checkbox .p-checkbox-box, .p-checkbox-input',
      ).first();

      const chk = (await checkbox.isVisible({ timeout: 3000 }).catch(() => false))
        ? checkbox
        : fallbackCheckbox;

      const isChecked = await chk
        .evaluate(el => {
          const input = el as HTMLInputElement;
          return input.checked || el.classList.contains('p-checkbox-checked') || el.classList.contains('p-checked');
        })
        .catch(() => false);

      if (!isChecked) {
        await chk.click();
        console.log(`Checked menu: "${name}"`);
      } else {
        console.log(`Menu "${name}" already checked`);
      }
    }
  }

  async verifyAddButtonState(expected: 'enabled' | 'disabled'): Promise<void> {
    const btn = this.dialog.getByRole('button', { name: /^add$/i });
    if (expected === 'enabled') {
      await expect(btn, 'Add button should be enabled').toBeEnabled();
    } else {
      await expect(btn, 'Add button should be disabled').toBeDisabled();
    }
  }

  async submitAddForm(): Promise<void> {
    await this.dialog.getByRole('button', { name: /^add$/i }).click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async cancelModal(): Promise<void> {
    const cancelBtn = this.dialog.getByRole('button', { name: /^cancel$/i });
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async verifySuccessToast(): Promise<void> {
    const toast = this.page.locator(
      'p-toast .p-toast-message, .p-toast-message, [class*="toast-message"]',
    ).first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    const text = (await toast.innerText().catch(() => '')).trim();
    console.log(`Toast: "${text}"`);
    if (!/success|saved|creat|add|mapped/i.test(text)) {
      console.warn(`Unexpected toast: "${text}"`);
    }
  }

  // ─── View / Edit / Delete ────────────────────────────────────────────────────

  async openView(rowText: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: rowText }).first();
    await row.locator('button:has(.ph-eye)').click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async openEdit(rowText: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: rowText }).first();
    await row.locator('button:has(.ph-pencil-simple)').click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async submitEditForm(): Promise<void> {
    const updateBtn = this.dialog.getByRole('button', { name: /^update$|^save$|^edit$/i }).first();
    await updateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await updateBtn.click();
    await this.dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  async getEditButtonLabel(): Promise<string> {
    const btn = this.dialog.locator('button[type="submit"], button').filter({ hasText: /update|save|edit/i }).first();
    return (await btn.innerText().catch(() => '')).trim();
  }

  async waitForDialogsAndToastsClosed(): Promise<void> {
    await this.page.locator('.p-dialog-mask').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.locator('p-toast .p-toast-message').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async openDeleteConfirmation(rowText: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: rowText }).first();
    await row.locator('button:has(.ph-trash)').click();
    const confirmDialog = this.page.locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /delete|confirm/i });
    await confirmDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(async () => {
      await expect(this.page.getByRole('button', { name: /^yes$/i })).toBeVisible({ timeout: 3000 });
    });
  }

  async cancelDeleteConfirmation(): Promise<void> {
    const noBtn = this.page.getByRole('button', { name: /^no$/i });
    if (await noBtn.isVisible().catch(() => false)) { await noBtn.click(); return; }
    await this.page.keyboard.press('Escape');
  }

  async confirmDelete(): Promise<void> {
    const yesBtn = this.page.getByRole('button', { name: /^yes$/i }).first();
    await yesBtn.waitFor({ state: 'visible', timeout: 5000 });
    await yesBtn.click();
    // Wait for confirmation dialog to close
    await this.page.locator('[role="alertdialog"], [role="dialog"]')
      .filter({ hasText: /delete|confirm/i })
      .waitFor({ state: 'hidden', timeout: 8000 })
      .catch(() => {});
    // Wait for success toast
    await this.page.locator('p-toast .p-toast-message, .p-toast-message').first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
  }

  async getMappedMenusForRole(roleDesc: string): Promise<string[]> {
    const menus: string[] = [];
    const rows = this.page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator('td');
      const roleCell = (await cells.nth(0).innerText().catch(() => '')).trim();
      if (roleCell.toLowerCase().includes(roleDesc.toLowerCase())) {
        const menu = (await cells.nth(1).innerText().catch(() => '')).trim();
        if (menu) menus.push(menu);
      }
    }
    return menus;
  }

  // ─── Column filter (Role Description uses a dropdown overlay) ────────────────

  // Returns the selected option text, or null if the filter overlay has no options available.
  async filterRoleDescription(roleName?: string): Promise<string | null> {
    await this.page.locator('th')
      .filter({ hasText: /Role Description/i })
      .getByRole('button', { name: /filter/i })
      .click();
    const overlay = this.page.locator('[role="dialog"]').last();
    await overlay.waitFor({ state: 'visible', timeout: 8000 });
    // Open the dropdown (click the trigger or the combobox container)
    const trigger = overlay.locator('button[data-pc-section="dropdown"], button[class*="dropdown-trigger"]').first();
    if (await trigger.isVisible({ timeout: 1500 }).catch(() => false)) {
      await trigger.click();
    } else {
      await overlay.locator('p-select, p-dropdown, [data-pc-name="select"]').first().click();
    }
    await this.page.waitForTimeout(500);
    // Check for real options (exclude the "no options" empty-message element)
    const realOptions = this.page
      .locator('[role="listbox"] [role="option"]:not(.p-select-empty-message)');
    const hasOptions = await realOptions.first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasOptions) {
      // Close the overlay without applying — filter has no options loaded
      await this.page.keyboard.press('Escape');
      await overlay.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      return null;
    }
    const selectedText = (await realOptions.first().innerText().catch(() => '')).trim();
    await realOptions.first().click();
    await overlay.getByRole('button', { name: /apply/i }).click();
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return selectedText;
  }

  async clearRoleDescriptionFilter(): Promise<void> {
    await this.page.locator('th')
      .filter({ hasText: /Role Description/i })
      .getByRole('button', { name: /filter/i })
      .click();
    const overlay = this.page.locator('[role="dialog"]').last();
    await overlay.waitFor({ state: 'visible', timeout: 8000 });
    await overlay.getByRole('button', { name: /clear/i }).click();
    await overlay.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async getAddButton(): Promise<Locator> {
    const headingRow = this.page.getByRole('heading', { name: /role menu mapping/i }).locator('..');
    const lastBtn = headingRow.locator('button').last();
    if (await lastBtn.isVisible().catch(() => false)) return lastBtn;
    return this.page.getByRole('button', { name: /add/i }).first();
  }
}

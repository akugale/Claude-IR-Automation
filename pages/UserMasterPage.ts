import { expect, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class UserMasterPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./admin/ScreenUserCreation');
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.getByRole('heading', { name: /user master/i })).toBeVisible({ timeout: 30000 });
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /user master/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const cols = [
      'Application Login Id', 'Reporting Manager', 'Name', 'Email',
      'Is Locked', 'Status', 'Is Email Required', 'Profile', 'Actions',
    ];
    for (const col of cols) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(col, 'i') }).first(),
        `Column "${col}" should be visible`,
      ).toBeVisible();
    }
  }

  // ─── TC_003 ──────────────────────────────────────────────────────────────────

  async verifyActionsHasOnlyView(): Promise<void> {
    const firstRow = this.page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)')).toBeVisible();
    const editCount = await firstRow.locator('button:has(.ph-pencil-simple)').count();
    const deleteCount = await firstRow.locator('button:has(.ph-trash)').count();
    expect(editCount, 'Edit button should not be in Actions column').toBe(0);
    expect(deleteCount, 'Delete button should not be in Actions column').toBe(0);
  }

  // ─── TC_002b ─────────────────────────────────────────────────────────────────

  async verifyProfileAndActionsHaveNoSortOrFilter(): Promise<void> {
    for (const col of ['Profile', 'Actions']) {
      const th = this.page.locator('th').filter({ hasText: new RegExp(`^${col}$`, 'i') }).first();
      await expect(th).toBeVisible();
      // Must NOT have sort — sortable columns carry aria-sort attribute or p-datatable-sortable-column class
      const isSortable = await th.evaluate(el =>
        el.classList.contains('p-datatable-sortable-column') || el.hasAttribute('aria-sort'),
      );
      expect(isSortable, `"${col}" column should not be sortable`).toBe(false);
      // Must NOT have a filter button
      const filterBtnCount = await th.locator(
        'button[class*="filter"], [data-pc-section*="filtermenu"], .ph-funnel, .ph-funnel-simple',
      ).count();
      expect(filterBtnCount, `"${col}" column should not have a filter button`).toBe(0);
    }
  }

  // ─── TC_004 ──────────────────────────────────────────────────────────────────

  async verifyTableHasRows(): Promise<void> {
    const count = await this.table.getRowCount();
    expect(count, 'Table should have at least one row').toBeGreaterThan(0);
  }

  // ─── TC_018 ──────────────────────────────────────────────────────────────────

  async openProfileModal(loginId: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: loginId }).first();
    await expect(row).toBeVisible();
    // Profile column contains a clickable "Profile" text/link
    await row.locator('td').filter({ hasText: /^profile$/i }).first().click();
    await this.page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 8000 });
  }

  async verifyProfileModalContents(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/user master/i).first()).toBeVisible();
    for (const col of ['Role', 'Branch', 'Sub Branch Access']) {
      await expect(
        dialog.locator('th').filter({ hasText: new RegExp(col, 'i') }).first(),
        `Profile modal should have column "${col}"`,
      ).toBeVisible();
    }
  }

  async closeProfileModal(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    // Try PrimeNG dialog close button (×), then aria-label, then Escape
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

  // ─── TC_020 ──────────────────────────────────────────────────────────────────

  async openView(loginId: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: loginId }).first();
    await expect(row).toBeVisible();
    await row.locator('button:has(.ph-eye)').click();
    const dialog = this.page.locator('[role="dialog"]').first();
    const appeared = await dialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (!appeared) {
      await this.page.waitForLoadState('domcontentloaded');
    }
  }
}

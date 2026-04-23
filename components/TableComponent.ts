import { expect, Locator, Page } from '@playwright/test';

export class TableComponent {
  private readonly table: Locator;
  private readonly searchInput: Locator;

  constructor(
    private readonly page: Page,
    tableSelector: string,
    searchInputSelector: string
  ) {
    this.table = this.page.locator(tableSelector);
    this.searchInput = this.page.locator(searchInputSelector);
  }

  // ─── Search ─────────────────────────────────────────────────────────────────

  async search(value: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill('');
    await this.searchInput.fill(value);
  }

  // ─── Sort ────────────────────────────────────────────────────────────────────

  async sortByColumn(columnName: string): Promise<void> {
    await this.page
      .locator('th.p-datatable-sortable-column')
      .filter({ hasText: columnName })
      .click();
  }

  async getColumnSortOrder(columnName: string): Promise<string | null> {
    return this.page
      .locator('th.p-datatable-sortable-column')
      .filter({ hasText: columnName })
      .getAttribute('aria-sort');
  }

  // ─── Filter ──────────────────────────────────────────────────────────────────

  async clickFilter(): Promise<void> {
    await this.page.getByRole('button', { name: /filter/i }).click();
  }

  async resetFilter(): Promise<void> {
    await this.page.getByRole('button', { name: /reset filter/i }).click();
  }

  // ─── Row assertions ──────────────────────────────────────────────────────────

  async verifyRowExistsByCellText(text: string): Promise<void> {
    const row = this.table.locator('tbody tr').filter({ hasText: text }).first();
    await expect(row).toBeVisible();
  }

  async verifyRowExistsByValues(values: string[]): Promise<void> {
    let row = this.table.locator('tbody tr');
    for (const value of values) {
      row = row.filter({ hasText: value });
    }
    await expect(row.first()).toBeVisible();
  }

  async verifyRowNotExists(text: string): Promise<void> {
    const rows = this.table.locator('tbody tr').filter({ hasText: text });
    await expect(rows).toHaveCount(0);
  }

  async getRowCount(): Promise<number> {
    return this.table.locator('tbody tr').count();
  }

  async getFirstRowCellText(cellIndex = 0): Promise<string> {
    return this.table.locator('tbody tr').first().locator('td').nth(cellIndex).innerText();
  }

  // ─── Row actions ─────────────────────────────────────────────────────────────

  async clickRowAction(rowText: string, iconClass: string): Promise<void> {
    await this.search(rowText);
    const row = this.table.locator('tbody tr').filter({ hasText: rowText }).first();
    await expect(row).toBeVisible();
    await row.locator(`button:has(.${iconClass})`).click();
  }

  async clickRowActionByCellText(rowText: string, actionLabel: string): Promise<void> {
    const row = this.table.locator('tbody tr').filter({ hasText: rowText }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: actionLabel }).click();
  }
}

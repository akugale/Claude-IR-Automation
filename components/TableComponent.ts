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

  async search(value: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill('');
    await this.searchInput.fill(value);
  }

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

  async clickRowActionByCellText(rowText: string, actionLabel: string): Promise<void> {
    const row = this.table.locator('tbody tr').filter({ hasText: rowText }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: actionLabel }).click();
  }
}

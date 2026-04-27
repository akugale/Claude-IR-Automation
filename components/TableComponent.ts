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

  async getFilterableColumnNames(): Promise<string[]> {
    const ths = this.page.locator('th').filter({
      has: this.page.locator('.p-column-filter-menu-button'),
    });
    const texts = await ths.allInnerTexts();
    return texts
      .map(t => t.replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 0 && !/^action$/i.test(t));
  }

  async openColumnFilter(columnName: string): Promise<void> {
    await this.page
      .locator('th')
      .filter({ hasText: new RegExp(columnName, 'i') })
      .locator('.p-column-filter-menu-button')
      .click();
    await this.page.locator('.p-column-filter-overlay').waitFor({ state: 'visible' });
  }

  async applyColumnFilter(value: string): Promise<void> {
    const overlay = this.page.locator('.p-column-filter-overlay');
    await overlay.locator('input').first().fill(value);
    const applyBtn = overlay.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
    } else {
      await overlay.locator('input').first().press('Enter');
    }
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async isColumnFilterActive(columnName: string): Promise<boolean> {
    const cls = await this.page
      .locator('th')
      .filter({ hasText: new RegExp(columnName, 'i') })
      .locator('.p-column-filter-menu-button')
      .getAttribute('class') ?? '';
    return cls.includes('p-column-filter-menu-button-active');
  }

  async clearColumnFilter(columnName: string): Promise<void> {
    await this.page
      .locator('th')
      .filter({ hasText: new RegExp(columnName, 'i') })
      .locator('.p-column-filter-menu-button')
      .click();
    const overlay = this.page.locator('.p-column-filter-overlay');
    await overlay.waitFor({ state: 'visible' });
    const clearBtn = overlay.getByRole('button', { name: /clear/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    } else {
      await overlay.locator('input').first().clear();
      const applyBtn = overlay.getByRole('button', { name: /apply/i });
      if (await applyBtn.isVisible()) await applyBtn.click();
    }
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async getColumnIndexByName(columnName: string): Promise<number> {
    const allHeaders = await this.page.locator('th').allInnerTexts();
    return allHeaders.findIndex(h =>
      h.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(columnName.toLowerCase()),
    );
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

  async getSortableColumnNames(): Promise<string[]> {
    const texts = await this.page
      .locator('th.p-datatable-sortable-column')
      .allInnerTexts();
    return texts.map(t => t.trim()).filter(t => t.length > 0);
  }

  async getAllColumnValues(cellIndex: number): Promise<string[]> {
    return this.table.locator('tbody tr').evaluateAll(
      (rows, idx) => rows.map(r => (r.querySelectorAll('td')[idx] as HTMLElement)?.innerText?.trim() ?? ''),
      cellIndex,
    );
  }

  // ─── Row actions ─────────────────────────────────────────────────────────────

  async clickRowAction(rowText: string, iconClass: string): Promise<void> {
    await this.search(rowText);
    const escaped = rowText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match code column exactly (td:first-child) with optional surrounding whitespace
    const row = this.table.locator('tbody tr').filter({
      has: this.page.locator('td:first-child').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }),
    }).first();
    await expect(row).toBeVisible();
    await row.locator(`button:has(.${iconClass})`).click();
  }

  async clickRowActionByCellText(rowText: string, actionLabel: string): Promise<void> {
    const row = this.table.locator('tbody tr').filter({ hasText: rowText }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: actionLabel }).click();
  }
}

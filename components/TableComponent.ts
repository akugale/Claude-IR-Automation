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

  // PrimeNG v17 uses class names; v18 uses data-pc-section (all lowercase)
  // App uses Phosphor icons (.ph-funnel / .ph-funnel-simple) for filter buttons
  private filterBtnSelector = [
    '.p-column-filter-menu-button',
    '[data-pc-section="filterMenuButton"]',
    '[data-pc-section="filtermenubutton"]',
    'button[class*="column-filter"]',
    'th button:has(.ph-funnel)',
    'th button:has(.ph-funnel-simple)',
    'th button:has(i[class*="funnel"])',
  ].join(', ');

  private filterOverlaySelector = [
    '.p-column-filter-overlay',
    '[data-pc-section="filterOverlay"]',
    '[data-pc-section="filteroverlay"]',
    '[data-pc-name="columnfilteroverlay"]',
    'p-columnfilteroverlay',
  ].join(', ');

  async getFilterableColumnNames(): Promise<string[]> {
    const ths = this.page.locator('th').filter({
      has: this.page.locator(this.filterBtnSelector),
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
      .locator(this.filterBtnSelector)
      .first()
      .click();
    // Wait for filter overlay — try known selectors, then fall back to any visible overlay with filter input
    const overlayLocator = this.page.locator(this.filterOverlaySelector).first();
    const appeared = await overlayLocator.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (!appeared) {
      // Fallback: wait for any element containing p-columnfilterformelement to become visible
      await this.page.locator('p-columnfilterformelement').waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  private async getFilterOverlay(): Promise<import('@playwright/test').Locator> {
    const primary = this.page.locator(this.filterOverlaySelector).first();
    if (await primary.isVisible().catch(() => false)) return primary;
    // Fallback: parent of p-columnfilterformelement
    return this.page.locator('p-columnfilterformelement').locator('..');
  }

  async applyColumnFilter(value: string): Promise<void> {
    const overlay = await this.getFilterOverlay();
    // Target the actual text input — not the match-mode p-select inputs
    const filterInput = overlay
      .locator([
        'p-columnfilterformelement input',
        '.p-column-filter-constraint input[type="text"]',
        '[data-pc-section="filterconstraint"] input',
        '[data-pc-section="filterConstraint"] input',
      ].join(', '))
      .first();
    await filterInput.waitFor({ state: 'visible' });
    await filterInput.fill(value);
    const applyBtn = overlay.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click();
    } else {
      await filterInput.press('Enter');
    }
    await this.page.locator(this.filterOverlaySelector).first().waitFor({ state: 'hidden' }).catch(() => {});
  }

  async isColumnFilterActive(columnName: string): Promise<boolean> {
    const th = this.page
      .locator('th')
      .filter({ hasText: new RegExp(columnName, 'i') })
      .first();
    const btn = th.locator(this.filterBtnSelector).first();
    const btnCls  = (await btn.getAttribute('class')        .catch(() => '')) ?? '';
    const btnData = (await btn.getAttribute('data-p-active').catch(() => '')) ?? '';
    const thCls   = (await th.getAttribute('class')         .catch(() => '')) ?? '';
    return (
      btnCls.includes('active') ||
      btnCls.includes('p-highlight') ||
      btnData === 'true' ||
      thCls.includes('p-filter-column') ||
      thCls.includes('active')
    );
  }

  async clearColumnFilter(columnName: string): Promise<void> {
    // Single click to open overlay — do NOT call openColumnFilter again (double-click closes it)
    await this.page
      .locator('th')
      .filter({ hasText: new RegExp(columnName, 'i') })
      .locator(this.filterBtnSelector)
      .first()
      .click();
    const appeared = await this.page
      .locator(this.filterOverlaySelector)
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true).catch(() => false);
    if (!appeared) {
      await this.page.locator('p-columnfilterformelement').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    }
    const overlay = await this.getFilterOverlay();
    const clearBtn = overlay.getByRole('button', { name: /clear/i });
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearBtn.click();
    } else {
      const filterInput = overlay
        .locator([
          'p-columnfilterformelement input',
          '.p-column-filter-constraint input[type="text"]',
          '[data-pc-section="filterconstraint"] input',
        ].join(', '))
        .first();
      await filterInput.clear();
      const applyBtn = overlay.getByRole('button', { name: /apply/i });
      if (await applyBtn.isVisible()) await applyBtn.click();
    }
    await this.page.locator(this.filterOverlaySelector).first().waitFor({ state: 'hidden' }).catch(() => {});
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

  async getVisibleColumnValues(columnHeader: string): Promise<string[]> {
    const colIdx = await this.getColumnIndexByName(columnHeader);
    if (colIdx < 0) return [];
    const cells = await this.table
      .locator(`tbody tr td:nth-child(${colIdx + 1})`)
      .allInnerTexts();
    return cells.map(v => v.trim()).filter(v => v.length > 0);
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

  async clickRowActionByRowText(rowText: string, iconClass: string): Promise<void> {
    await this.search(rowText);
    const row = this.table.locator('tbody tr').filter({ hasText: rowText }).first();
    await expect(row).toBeVisible();
    await row.locator(`button:has(.${iconClass})`).click();
  }
}

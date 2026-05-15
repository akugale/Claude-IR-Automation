import { expect, Locator, Page } from '@playwright/test';

export class TableComponent {
  private readonly table: Locator;
  private readonly searchInput: Locator;
  /** Scoped root — either the full page or a specific container (e.g. active tab panel). */
  private readonly root: Page | Locator;

  constructor(
    private readonly page: Page,
    tableSelector: string,
    searchInputSelector: string,
    container?: Locator,
  ) {
    this.root = container ?? page;
    this.table = this.root.locator(tableSelector);
    this.searchInput = this.root.locator(searchInputSelector);
  }

  // ─── Search ─────────────────────────────────────────────────────────────────

  async search(value: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill('');
    await this.searchInput.fill(value);
  }

  // ─── Sort ────────────────────────────────────────────────────────────────────

  async sortByColumn(columnName: string): Promise<void> {
    const th = this.root
      .locator('th.p-datatable-sortable-column')
      .filter({ hasText: columnName })
      .first();
    // p-sorticon sits left of the filter button; th.click() lands on filter button
    // (th center overlaps filter button). Click p-sorticon directly to avoid this.
    const sortIcon = th.locator('p-sorticon').first();
    if (await sortIcon.count() > 0) {
      await sortIcon.click();
    } else {
      // Fallback: click left side of header (20px from left = text/icon zone, not filter)
      await th.click({ position: { x: 20, y: 10 } });
    }
    // Wait for aria-sort to update (async DOM re-render after click)
    await this.page.waitForFunction(
      (col) => {
        // Only check sortable columns that are visible (active tab panel) to avoid matching hidden tabs
        const th = Array.from(document.querySelectorAll('th.p-datatable-sortable-column'))
          .filter(el => (el as HTMLElement).offsetParent !== null) // visible only
          .find(el => el.textContent?.includes(col));
        return th?.getAttribute('aria-sort') !== 'none';
      },
      columnName,
      { timeout: 3000 },
    ).catch(() => {}); // if never updates, let test assertion fail with clear message
  }

  async getColumnSortOrder(columnName: string): Promise<string | null> {
    return this.root
      .locator('th.p-datatable-sortable-column')
      .filter({ hasText: columnName })
      .first()
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
    'th button:has(img)',
    'button[aria-label*="filter" i]',
  ].join(', ');

  private filterOverlaySelector = [
    '.p-column-filter-overlay',
    '[data-pc-section="filterOverlay"]',
    '[data-pc-section="filteroverlay"]',
    '[data-pc-name="columnfilteroverlay"]',
    'p-columnfilteroverlay',
    'p-popover',
    '.p-popover',
    '[data-pc-name="popover"]',
    '.p-overlay-open',
  ].join(', ');

  async getFilterableColumnNames(): Promise<string[]> {
    const ths = this.root.locator('th').filter({
      has: this.page.locator(this.filterBtnSelector),
    });
    const texts = await ths.allInnerTexts();
    return texts
      .map(t => t.replace(/\s+/g, ' ').trim())
      .filter(t => t.length > 0 && !/^action$/i.test(t));
  }

  async openColumnFilter(columnName: string): Promise<void> {
    const escapedName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.root
      .locator('th')
      .filter({ hasText: new RegExp(escapedName, 'i') })
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
    // Fallback 1: parent of p-columnfilterformelement
    const formEl = this.page.locator('p-columnfilterformelement');
    if (await formEl.isVisible().catch(() => false)) return formEl.locator('..');
    // Fallback 2: any visible overlay/panel that appeared (CDK portal or custom)
    const anyOverlay = this.page.locator(
      'div[class*="overlay"]:visible, div[class*="filter"]:visible, div[class*="panel"]:visible',
    ).filter({ has: this.page.locator('input') }).first();
    if (await anyOverlay.isVisible({ timeout: 2000 }).catch(() => false)) return anyOverlay;
    // Last resort: return a page-level locator so input search works on whole page
    return this.page.locator('body');
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
        'input[type="text"]',
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      ].join(', '))
      .first();
    await filterInput.waitFor({ state: 'visible', timeout: 15000 });
    await filterInput.fill(value);
    const applyBtn = overlay.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) {
      // Use force:true — PrimeNG overlays can re-render after typing, making button temporarily unstable
      await applyBtn.click({ force: true });
    } else {
      await filterInput.press('Enter');
    }
    await this.page.locator(this.filterOverlaySelector).first().waitFor({ state: 'hidden' }).catch(() => {});
  }

  /**
   * Like applyColumnFilter but uses pressSequentially (key-by-key) instead of fill().
   * Use for columns whose filter input requires real keyboard events to trigger Angular bindings
   * (e.g. autocomplete / linked-entity filters where fill() doesn't trigger change detection).
   * Assumes the filter overlay is ALREADY OPEN via openColumnFilter().
   */
  async applyColumnFilterByKeyboard(value: string): Promise<void> {
    const overlay = await this.getFilterOverlay();
    const filterInput = overlay
      .locator([
        'p-columnfilterformelement input',
        '.p-column-filter-constraint input[type="text"]',
        '[data-pc-section="filterconstraint"] input',
        '[data-pc-section="filterConstraint"] input',
        'input[type="text"]',
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      ].join(', '))
      .first();
    await filterInput.waitFor({ state: 'visible', timeout: 15000 });
    await filterInput.click();
    // Select-all + delete to clear existing value without triggering race conditions
    await filterInput.press('Control+a');
    await filterInput.press('Delete');
    // Type character by character so Angular's reactive forms process each keystroke
    await filterInput.pressSequentially(value, { delay: 80 });
    const applyBtn = overlay.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click({ force: true });
    } else {
      await filterInput.press('Enter');
    }
    await this.page.locator(this.filterOverlaySelector).first().waitFor({ state: 'hidden' }).catch(() => {});
  }

  /**
   * For columns whose filter is a PrimeNG autocomplete/entity filter.
   * Types text key-by-key → waits for autocomplete suggestion panel → clicks first suggestion → applies.
   */
  async applyColumnFilterByAutocomplete(value: string): Promise<void> {
    const overlay = await this.getFilterOverlay();
    const filterInput = overlay
      .locator([
        'p-columnfilterformelement input',
        '.p-column-filter-constraint input[type="text"]',
        '[data-pc-section="filterconstraint"] input',
        '[data-pc-section="filterConstraint"] input',
        'input[type="text"]',
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
      ].join(', '))
      .first();
    await filterInput.waitFor({ state: 'visible', timeout: 15000 });
    await filterInput.click();
    await filterInput.press('Control+a');
    await filterInput.press('Delete');
    await filterInput.pressSequentially(value, { delay: 80 });

    // Wait for autocomplete suggestion panel (PrimeNG / Angular CDK)
    const suggestionPanel = this.page.locator([
      '.p-autocomplete-panel',
      '[role="listbox"].p-autocomplete-items',
      '.p-autocomplete-items',
      'p-autocomplete-overlay',
      'ul[id*="autocomplete"] li',
    ].join(', ')).first();

    const panelVisible = await suggestionPanel
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true).catch(() => false);

    if (panelVisible) {
      // Click first suggestion
      const firstItem = this.page.locator([
        '.p-autocomplete-panel li.p-autocomplete-item',
        '.p-autocomplete-items li',
        '[role="listbox"] [role="option"]',
        '.p-autocomplete-option',
      ].join(', ')).first();
      await firstItem.waitFor({ state: 'visible', timeout: 5000 });
      await firstItem.click();
      await suggestionPanel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }

    const applyBtn = overlay.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) {
      await applyBtn.click({ force: true });
    } else {
      await filterInput.press('Enter');
    }
    await this.page.locator(this.filterOverlaySelector).first().waitFor({ state: 'hidden' }).catch(() => {});
  }

  // For columns that use a p-select dropdown filter (e.g. boolean/enum columns like Is Locked, Status)
  // Opens the filter, picks the first real option, applies it, and returns the selected option text.
  // Skips the match-mode dropdown (Match All/Match Any) and targets the value dropdown.
  async applyDropdownColumnFilter(columnName: string): Promise<string> {
    await this.openColumnFilter(columnName);
    const overlay = await this.getFilterOverlay();
    // The filter overlay contains 2 p-selects: [0]=match-mode (Match All/Any), [1]=value (Yes/No/enum)
    // Use the LAST p-select, or the one that does NOT contain "Match" options
    const dropdowns = overlay.locator('p-select, p-dropdown');
    const count = await dropdowns.count();
    // Try dropdowns from last to first — value dropdown is typically last
    let selectedText = '';
    for (let i = count - 1; i >= 0; i--) {
      await dropdowns.nth(i).click();
      const options = this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: /\S/ });
      const firstOptionText = await options.first().innerText().catch(() => '');
      // Skip match-mode dropdowns (Match All / Match Any / Contains / Starts with)
      if (/match all|match any|contains|starts with|ends with|equals|not equals/i.test(firstOptionText)) {
        await this.page.keyboard.press('Escape');
        continue;
      }
      await options.first().waitFor({ state: 'visible', timeout: 10000 });
      selectedText = firstOptionText.trim();
      await options.first().click();
      break;
    }
    const applyBtn = overlay.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible()) await applyBtn.click();
    await this.page.locator(this.filterOverlaySelector).first().waitFor({ state: 'hidden' }).catch(() => {});
    return selectedText;
  }

  async isColumnFilterActive(columnName: string): Promise<boolean> {
    const escapedName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const th = this.root
      .locator('th')
      .filter({ hasText: new RegExp(escapedName, 'i') })
      .first();
    const btn = th.locator(this.filterBtnSelector).first();
    const btnCls  = (await btn.getAttribute('class')        .catch(() => '')) ?? '';
    const btnData = (await btn.getAttribute('data-p-active').catch(() => '')) ?? '';
    const thCls   = (await th.getAttribute('class')         .catch(() => '')) ?? '';

    // PrimeNG v18: active filter indicator = SVG icon swaps from "filter" → "filter-fill"
    // No CSS class or data-p-active attribute changes — only the SVG data-p-icon attribute
    const svgIcon = (await btn.locator('svg').first().getAttribute('data-p-icon').catch(() => '')) ?? '';
    const isFillIcon = svgIcon === 'filter-fill';

    return (
      isFillIcon ||                          // PrimeNG v18 active indicator
      btnCls.includes('active') ||
      btnCls.includes('p-highlight') ||
      btnData === 'true' ||
      thCls.includes('p-filter-column') ||
      thCls.includes('active')
    );
  }

  async clearColumnFilter(columnName: string): Promise<void> {
    // Single click to open overlay — do NOT call openColumnFilter again (double-click closes it)
    const escapedName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.root
      .locator('th')
      .filter({ hasText: new RegExp(escapedName, 'i') })
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
    const allHeaders = await this.root.locator('th').allInnerTexts();
    return allHeaders.findIndex(h =>
      h.replace(/\s+/g, ' ').trim().toLowerCase().startsWith(columnName.toLowerCase()),
    );
  }

  // ─── Row assertions ──────────────────────────────────────────────────────────

  async verifyRowExistsByCellText(text: string): Promise<void> {
    const row = this.table.locator('tbody tr').filter({ hasText: text }).first();
    await expect(row).toBeVisible();
  }

  /** After applying a column filter, asserts ALL visible rows in that column contain the
   *  filter value (case-insensitive). Fails with a descriptive message if any non-matching
   *  row is found. Use alongside verifyRowExistsByCellText for complete filter verification. */
  async verifyAllRowsInColumnContain(columnName: string, value: string): Promise<void> {
    const colIdx = await this.getColumnIndexByName(columnName);
    expect(colIdx, `Column "${columnName}" not found in table`).toBeGreaterThanOrEqual(0);
    const cells = await this.table
      .locator(`tbody tr td:nth-child(${colIdx + 1})`)
      .allInnerTexts();
    expect(cells.length, `No rows visible after filtering "${columnName}" by "${value}"`).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(
        cell.toLowerCase(),
        `Non-matching row in "${columnName}" column after filter by "${value}": got "${cell}"`,
      ).toContain(value.toLowerCase());
    }
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
    const texts = await this.root
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

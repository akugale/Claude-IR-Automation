import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const COUNTERPARTY_EXT_AGENCY_RATING_COLUMNS = [
  'CIF No',
  'Counterparty Name',
  'Rating Agency',
  'External Rating',
  'Rating Date',
  'Expiry Date',
] as const;

export class CounterpartyExtAgencyRatingPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(
      page,
      'table',
      'input[placeholder*="Search"], input[type="search"]',
    );
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./rating-setup/counterparty-rating-ext');
    await expect(
      this.page.getByRole('heading', { name: /counterparty ext\.? agency rating/i }),
    ).toBeVisible({ timeout: 15000 });
    await this.page.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
  }

  // ─── Screen elements ─────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /counterparty ext\.? agency rating/i }),
    ).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();

    const pdfBtns = this.page.locator('button.export-pdf');
    const pdfCount = await pdfBtns.count();
    let pdfVisible = false;
    for (let i = 0; i < pdfCount; i++) {
      if (await pdfBtns.nth(i).isVisible().catch(() => false)) { pdfVisible = true; break; }
    }
    expect(pdfVisible, 'Export PDF button should be visible').toBe(true);

    const excelBtns = this.page.locator('button.export-excel');
    const excelCount = await excelBtns.count();
    let excelVisible = false;
    for (let i = 0; i < excelCount; i++) {
      if (await excelBtns.nth(i).isVisible().catch(() => false)) { excelVisible = true; break; }
    }
    expect(excelVisible, 'Export Excel button should be visible').toBe(true);

    await expect(this.page.locator('p-paginator')).toBeVisible();
    await expect(this.getAddButton()).toBeVisible();
  }

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.page.locator('th').allInnerTexts();
    const normalised = headerTexts
      .map(h => h.replace(/\s+/g, ' ').trim())
      .filter(h => h.length > 0);

    const expected = [...COUNTERPARTY_EXT_AGENCY_RATING_COLUMNS, 'Actions'];

    expect(
      normalised.length,
      `Table has ${normalised.length} columns [${normalised.join(', ')}], expected exactly ${expected.length}: [${expected.join(', ')}]`,
    ).toBe(expected.length);

    for (const col of expected) {
      expect(
        normalised.some(h => h.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" missing from table`,
      ).toBe(true);
    }
  }

  // ─── Add button ──────────────────────────────────────────────────────────────

  getAddButton(): Locator {
    return this.page
      .locator('button:has(.ph-plus), button.add-btn')
      .or(this.page.locator('p-button[icon*="plus"]').locator('button'))
      .first();
  }

  async clickAddButton(): Promise<void> {
    // Force-close any stale dialog from a previous test before opening a new one
    const existing = this.getDialog();
    if (await existing.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await existing.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    const btn = this.getAddButton();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  // ─── Dialog helpers ───────────────────────────────────────────────────────────

  getDialog(): Locator {
    return this.page.locator('[role="dialog"], .p-dialog').first();
  }

  async isDialogVisible(): Promise<boolean> {
    return this.getDialog().isVisible().catch(() => false);
  }

  /** Counterparty dropdown — 1st dropdown in dialog */
  getCounterpartyDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(0);
  }

  /** Rating Agency dropdown — 2nd dropdown in dialog */
  getRatingAgencyDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(1);
  }

  /** External Rating dropdown — 3rd dropdown in dialog (may cascade from agency) */
  getExternalRatingDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(2);
  }

  /** Rating Date — 1st date picker input */
  getRatingDateInput(): Locator {
    return this.getDialog()
      .locator('p-datepicker input, p-calendar input, input[placeholder*="date" i]')
      .nth(0);
  }

  /** Expiry Date — 2nd date picker input */
  getExpiryDateInput(): Locator {
    return this.getDialog()
      .locator('p-datepicker input, p-calendar input, input[placeholder*="date" i]')
      .nth(1);
  }

  /** CIF No — disabled text input; auto-filled when counterparty selected */
  getCifNoInput(): Locator {
    return this.getDialog()
      .locator('input[placeholder*="CIF" i]')
      .or(this.getDialog().locator('input[type="text"]').last())
      .first();
  }

  // ─── Dropdown helpers ─────────────────────────────────────────────────────────

  async selectDropdownOption(dropdown: Locator, value: string): Promise<void> {
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = listbox
      .locator('[role="option"], .p-select-option, .p-dropdown-item')
      .filter({ hasText: new RegExp(`^\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  async selectFirstDropdownOption(dropdown: Locator): Promise<string> {
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const first = listbox
      .locator('[role="option"], .p-select-option, .p-dropdown-item')
      .first();
    await first.waitFor({ state: 'visible', timeout: 5000 });
    const text = (await first.innerText()).trim();
    await first.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return text;
  }

  async selectNthDropdownOption(dropdown: Locator, index: number): Promise<string> {
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const options = listbox.locator('[role="option"], .p-select-option, .p-dropdown-item');
    const count = await options.count();
    const idx = Math.min(index, count - 1);
    const target = options.nth(idx);
    await target.waitFor({ state: 'visible', timeout: 5000 });
    const text = (await target.innerText()).trim();
    await target.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return text;
  }

  async getDropdownOptions(dropdown: Locator): Promise<string[]> {
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const options = await listbox
      .locator('[role="option"], .p-select-option, .p-dropdown-item')
      .allInnerTexts();
    await this.page.keyboard.press('Escape');
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return options.map(o => o.trim()).filter(o => o.length > 0);
  }

  // ─── Date helpers ──────────────────────────────────────────────────────────────

  /**
   * Fills a PrimeNG datepicker using the "Choose Date" calendar dialog.
   * dateStr format: "DD/MM/YYYY"
   * Clicks input → calendar dialog opens → navigates to correct month → clicks day.
   */
  async fillDateInput(input: Locator, dateStr: string): Promise<void> {
    const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const parts = dateStr.split('/');
    const targetDay    = parseInt(parts[0], 10);
    const targetMonIdx = parseInt(parts[1], 10) - 1;
    const targetYear   = parseInt(parts[2], 10);

    await input.click();

    // Detect calendar by "Choose Month" button — works regardless of container role
    // (form calendar may use alertdialog/div, not dialog; filter used role="dialog")
    const chooseMonthBtn = this.page.getByRole('button', { name: 'Choose Month' });
    const calendarVisible = await chooseMonthBtn
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true).catch(() => false);

    if (!calendarVisible) {
      // Fallback: type directly into input
      await input.press('Control+a');
      await input.fill(dateStr);
      await input.press('Tab');
      return;
    }

    // Navigate to correct month/year using page-level buttons (unique to open calendar)
    for (let i = 0; i < 48; i++) {
      const monthText = (await chooseMonthBtn.innerText().catch(() => '')).trim().toLowerCase().substring(0, 3);
      const yearNum   = parseInt(
        (await this.page.getByRole('button', { name: 'Choose Year' }).innerText().catch(() => '0')).trim(), 10,
      );
      if (monthText === MONTHS[targetMonIdx] && yearNum === targetYear) break;
      const target  = new Date(targetYear, targetMonIdx, 1).getTime();
      const current = new Date(yearNum, MONTHS.indexOf(monthText) >= 0 ? MONTHS.indexOf(monthText) : 0, 1).getTime();
      if (target > current) {
        await this.page.getByRole('button', { name: 'Next Month' }).click();
      } else {
        await this.page.getByRole('button', { name: 'Previous Month' }).click();
      }
      await this.page.waitForTimeout(200);
    }

    // Wait for grid cells to be fully rendered (no nav = no natural wait; add explicit one)
    await this.page.waitForTimeout(300);

    // PrimeNG form calendar cells: td.p-datepicker-day-cell (no role="gridcell", no data-p-other-month)
    // Other-month cells add class: p-datepicker-other-month
    const calendarGrid = this.page.locator('[role="grid"]').last();

    // Click target day via Playwright native click (triggers Angular zone / change detection)
    const target = String(targetDay);
    // Current-month cells = p-datepicker-day-cell without p-datepicker-other-month
    const allCells = calendarGrid.locator(
      'td.p-datepicker-day-cell:not(.p-datepicker-other-month)',
    );

    // Wait for at least one current-month cell to be visible before looping
    await allCells.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    const cellCount = await allCells.count();
    let clicked = false;
    for (let i = 0; i < cellCount; i++) {
      const rawText = ((await allCells.nth(i).innerText().catch(() => '')) ?? '').replace(/\s+/g, '').trim();
      if (rawText === target) {
        await allCells.nth(i).click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      // Last-resort: try any td with matching text (covers gridcell-based calendars too)
      await calendarGrid.evaluate((el, day) => {
        const tds = el.querySelectorAll('td');
        for (const td of tds) {
          if (td.classList.contains('p-datepicker-other-month')) continue;
          if (td.getAttribute('data-p-other-month') === 'true') continue;
          const text = (td.textContent ?? '').replace(/\s+/g, '').trim();
          if (text === String(day)) {
            (td as HTMLElement).click();
            return;
          }
        }
      }, targetDay);
    }

    // Wait for calendar to close
    await chooseMonthBtn.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }

  /** Returns a date string offset by `days` from today in DD/MM/YYYY format. */
  dateOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // ─── Form actions ─────────────────────────────────────────────────────────────

  async clickSave(): Promise<void> {
    await this.getDialog()
      .getByRole('button', { name: /save|update/i })
      .click();
  }

  async clickCancel(): Promise<void> {
    await this.getDialog().getByRole('button', { name: /cancel/i }).click();
  }

  // ─── Row actions ─────────────────────────────────────────────────────────────

  async clickViewOnFirstRow(): Promise<void> {
    await this.page.locator('table tbody tr').first()
      .locator('button:has(.ph-eye)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditOnFirstRow(): Promise<void> {
    await this.page.locator('table tbody tr').first()
      .locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async deleteRecordByCounterparty(counterpartyName: string): Promise<void> {
    await this.table.openColumnFilter('Counterparty Name');
    await this.table.applyColumnFilter(counterpartyName);
    const rows = this.page.locator('table tbody tr').filter({ hasText: counterpartyName });
    if (await rows.count() === 0) return;
    await rows.first().locator('button:has(.ph-trash)').click();
    const confirmBtn = this.page
      .getByRole('button', { name: /^(yes|confirm|ok|delete)$/i })
      .first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await rows.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

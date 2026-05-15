import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const MAPPING_INDUSTRY_COLUMNS = ['Industry', 'Sub Industry', 'CORF Industry'] as const;

export class MappingWithIndustryPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly mainNavigation: Locator;
  /** Scoped to the third tab panel (Mapping with Industry — index 2).
   *  PrimeNG renders ALL tab panels simultaneously in the DOM. */
  readonly tabPanel: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.tabPanel = page.locator('[role="tabpanel"]').nth(2);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]', this.tabPanel);
    this.paginator = new PaginatorComponent(page, this.tabPanel);
    this.export = new ExportComponent(page);
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./rating-setup/industry-parameters');
    await this.clickMappingWithIndustryTab();
  }

  async clickMappingWithIndustryTab(): Promise<void> {
    // "Mapping with Industry" is NOT the default tab — must explicitly click it.
    // Use count() instead of isVisible().catch() to avoid silently swallowing errors.
    const byRole = this.page.getByRole('tab', { name: /mapping with industry/i });
    const byAttr = this.page.locator('[role="tab"]').filter({ hasText: /mapping with industry/i });

    const roleCount = await byRole.count().catch(() => 0);
    if (roleCount > 0) {
      await byRole.first().click();
    } else {
      // Fallback: iterate all tabs, match by innerText
      const allTabs = this.page.locator('[role="tab"]');
      const total = await allTabs.count();
      let clicked = false;
      for (let i = 0; i < total; i++) {
        const txt = await allTabs.nth(i).innerText().catch(() => '');
        if (/mapping with industry/i.test(txt)) {
          await allTabs.nth(i).click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        // Last resort: text-filter click
        await byAttr.first().click();
      }
    }
    await expect(
      this.page.getByRole('heading', { name: /mapping with industry/i }),
    ).toBeVisible({ timeout: 15000 });
    await this.tabPanel.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
  }

  // ─── TC_134 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /mapping with industry/i }),
    ).toBeVisible();
    await expect(this.tabPanel.locator('table')).toBeVisible();
    const pdfBtns = this.page.locator('button.export-pdf');
    const excelBtns = this.page.locator('button.export-excel');
    const pdfCount = await pdfBtns.count();
    let pdfVisible = false;
    for (let i = 0; i < pdfCount; i++) {
      if (await pdfBtns.nth(i).isVisible().catch(() => false)) { pdfVisible = true; break; }
    }
    expect(pdfVisible, 'Export PDF button should be visible').toBe(true);
    const excelCount = await excelBtns.count();
    let excelVisible = false;
    for (let i = 0; i < excelCount; i++) {
      if (await excelBtns.nth(i).isVisible().catch(() => false)) { excelVisible = true; break; }
    }
    expect(excelVisible, 'Export Excel button should be visible').toBe(true);
    await expect(this.tabPanel.locator('p-paginator')).toBeVisible();
    await expect(this.getAddButton()).toBeVisible();
  }

  // ─── TC_135 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.tabPanel.locator('th').allInnerTexts();
    const normalised = headerTexts
      .map(h => h.replace(/\s+/g, ' ').trim())
      .filter(h => h.length > 0);

    const expected = [...MAPPING_INDUSTRY_COLUMNS, 'Actions'];

    // Exact column count — no extra columns allowed (e.g. "Status" must not be present)
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
    // Scope to tabPanel — page-level scope picks CORF Industry's Add button (hidden panel)
    return this.tabPanel
      .locator('button:has(.ph-plus)')
      .or(this.tabPanel.locator('p-button[icon*="plus"]').locator('button'))
      .or(this.tabPanel.locator('button.add-btn'))
      .first();
  }

  async clickAddButton(): Promise<void> {
    const btn = this.getAddButton();
    const visible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) {
      // Fallback: last p-button-icon-only within the ACTIVE tabPanel (not page — avoids clicking delete)
      await this.tabPanel.locator('button.p-button-icon-only').last().click();
    } else {
      await btn.click();
    }
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  // ─── Dialog helpers ───────────────────────────────────────────────────────────

  getDialog(): Locator {
    return this.page.locator('[role="dialog"], .p-dialog').first();
  }

  async isDialogVisible(): Promise<boolean> {
    return this.getDialog().isVisible().catch(() => false);
  }

  /** First dropdown in dialog: Sub Industry (required) */
  getSubIndustryDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(0);
  }

  /** Auto-populated read-only Industry field — populated when Sub Industry is selected */
  getIndustryInput(): Locator {
    return this.getDialog()
      .locator('input[placeholder*="Auto-populated" i]')
      .or(this.getDialog().locator('input[readonly]').first())
      .or(this.getDialog().locator('input').nth(0))
      .first();
  }

  /** Second dropdown in dialog: CORF Industry (required) */
  getCorfIndustryDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(1);
  }

  // ─── Dropdown helpers ─────────────────────────────────────────────────────────

  /** Opens dropdown, collects all option texts, closes with Escape. */
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

  /** Opens dropdown, selects option matching value exactly (case-insensitive). */
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

  /** Opens dropdown, selects the first option. Returns its text. */
  async selectFirstDropdownOption(dropdown: Locator): Promise<string> {
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const first = listbox.locator('[role="option"], .p-select-option, .p-dropdown-item').first();
    await first.waitFor({ state: 'visible', timeout: 5000 });
    const text = (await first.innerText()).trim();
    await first.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return text;
  }

  /** Opens dropdown, selects the Nth visible option (0-based). First ~10 options are always
   *  rendered in PrimeNG virtual scroll viewport — safe to click without scrolling. */
  async selectNthFromFirstDropdownOption(dropdown: Locator, n: number): Promise<string> {
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const options = listbox.locator('[role="option"], .p-select-option, .p-dropdown-item');
    await options.first().waitFor({ state: 'visible', timeout: 5000 });
    const option = options.nth(n);
    await option.waitFor({ state: 'visible', timeout: 3000 });
    const text = (await option.innerText()).trim();
    await option.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return text;
  }

  // ─── Form actions ─────────────────────────────────────────────────────────────

  async fillAddForm(subIndustry: string, corfIndustry: string): Promise<void> {
    await this.selectDropdownOption(this.getSubIndustryDropdown(), subIndustry);
    // Industry field auto-populates from Sub Industry selection — no manual entry
    await this.selectDropdownOption(this.getCorfIndustryDropdown(), corfIndustry);
  }

  /** Fill form with first available Sub Industry and CORF Industry options.
   *  Returns selected values so callers can track what was created. */
  async fillAddFormWithFirstOptions(): Promise<{ subIndustry: string; corfIndustry: string }> {
    const subIndustry = await this.selectFirstDropdownOption(this.getSubIndustryDropdown());
    const corfIndustry = await this.selectFirstDropdownOption(this.getCorfIndustryDropdown());
    return { subIndustry, corfIndustry };
  }

  /** Try Sub Industry options 0, 1, 2… until save succeeds (no duplicate).
   *  Opens dialog, fills form, attempts save — retries with next sub-industry if rejected.
   *  Leaves dialog CLOSED on success. Returns { subIndustry, corfIndustry } of created record. */
  async createRecordCleanFirst(): Promise<{ subIndustry: string; corfIndustry: string }> {
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.clickAddButton();
      const subIndustry = await this.selectNthFromFirstDropdownOption(
        this.getSubIndustryDropdown(), attempt,
      );
      const corfIndustry = await this.selectFirstDropdownOption(this.getCorfIndustryDropdown());
      await this.clickSave();

      const saved = await this.getDialog()
        .waitFor({ state: 'hidden', timeout: 3000 })
        .then(() => true)
        .catch(() => false);

      if (saved) return { subIndustry, corfIndustry };

      // Save rejected (duplicate) — close dialog and try next sub-industry
      const cancelBtn = this.getDialog().getByRole('button', { name: /cancel/i });
      if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelBtn.click();
      }
      await this.getDialog().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }
    throw new Error(`createRecordCleanFirst: no unique mapping found after ${maxAttempts} attempts`);
  }

  async clickSave(): Promise<void> {
    // Edit dialog may show "Update" instead of "Save"
    await this.getDialog()
      .getByRole('button', { name: /save|update/i })
      .click();
  }

  async clickCancel(): Promise<void> {
    await this.getDialog().getByRole('button', { name: /cancel/i }).click();
  }

  // ─── Row actions ─────────────────────────────────────────────────────────────

  async clickViewOnFirstRow(): Promise<void> {
    await this.tabPanel.locator('table tbody tr').first()
      .locator('button:has(.ph-eye)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditOnFirstRow(): Promise<void> {
    await this.tabPanel.locator('table tbody tr').first()
      .locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditBySubIndustry(subIndustry: string): Promise<void> {
    // Filter Sub Industry column first — record may be on a page beyond page 1
    await this.table.openColumnFilter('Sub Industry');
    await this.table.applyColumnFilter(subIndustry);
    const row = this.tabPanel.locator('table tbody tr').filter({ hasText: subIndustry });
    await row.first().waitFor({ state: 'visible', timeout: 10000 });
    await row.first().locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async deleteRecordBySubIndustry(subIndustry: string): Promise<void> {
    // Filter Sub Industry column first — record may be on a page beyond page 1
    await this.table.openColumnFilter('Sub Industry');
    await this.table.applyColumnFilter(subIndustry);
    const row = this.tabPanel.locator('table tbody tr').filter({ hasText: subIndustry });
    if (await row.count() === 0) return;
    await row.first().locator('button:has(.ph-trash)').click();
    const confirmBtn = this.page
      .getByRole('button', { name: /^(yes|confirm|ok|delete)$/i })
      .first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await row.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // ─── CORF Industry tab helpers (for cross-reference TC_159) ──────────────────

  /** Navigates to CORF Industry tab, collects description values from first table page,
   *  then returns to Mapping with Industry tab. */
  async getCorfIndustryTabDescriptions(): Promise<string[]> {
    const corfTab = this.page
      .locator('[role="tab"]').filter({ hasText: /^corf industry$/i })
      .or(this.page.locator('a, li, button').filter({ hasText: /^corf industry$/i }))
      .first();
    await corfTab.click();
    const corfPanel = this.page.locator('[role="tabpanel"]').nth(0);
    await corfPanel.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    // Description is 2nd column (index 1)
    const descriptions = await corfPanel
      .locator('table tbody tr td:nth-child(2)')
      .allInnerTexts();
    // Return to Mapping tab
    await this.clickMappingWithIndustryTab();
    return descriptions.map(d => d.trim()).filter(d => d.length > 0);
  }
}

import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const EXTERNAL_RATING_SCALE_COLUMNS = [
  'Rating Agency',
  'Rank',
  'Label',
  'Description',
  'Rating Type',
  'Status',
] as const;

export class ExternalRatingScalePage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  /** Scoped to Scale tab panel (index 1) — PrimeNG renders ALL tab panels simultaneously. */
  readonly tabPanel: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.tabPanel = page.locator('[role="tabpanel"]').nth(1);
    this.table = new TableComponent(
      page,
      'table',
      'input[placeholder*="Search"], input[type="search"]',
      this.tabPanel,
    );
    this.paginator = new PaginatorComponent(page, this.tabPanel);
    this.export = new ExportComponent(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.page.goto('./rating-setup/external-ratings');
    await this.clickScaleTab();
  }

  async clickScaleTab(): Promise<void> {
    // "Scale" tab is NOT the default — must explicitly click it.
    const byRole = this.page.getByRole('tab', { name: /^scale$/i });
    const byAttr = this.page.locator('[role="tab"]').filter({ hasText: /scale/i });

    const roleCount = await byRole.count().catch(() => 0);
    if (roleCount > 0) {
      await byRole.first().click();
    } else {
      // Fallback: iterate all tabs, find one whose text is exactly "Scale"
      const allTabs = this.page.locator('[role="tab"]');
      const total = await allTabs.count();
      let clicked = false;
      for (let i = 0; i < total; i++) {
        const txt = (await allTabs.nth(i).innerText().catch(() => '')).trim();
        if (/^scale$/i.test(txt)) {
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
      this.page.getByRole('heading', { name: /external rating scale/i }),
    ).toBeVisible({ timeout: 15000 });
    await this.tabPanel.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
  }

  // ─── Screen elements ─────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /external rating scale/i }),
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

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.tabPanel.locator('th').allInnerTexts();
    const normalised = headerTexts
      .map(h => h.replace(/\s+/g, ' ').trim())
      .filter(h => h.length > 0);

    const expected = [...EXTERNAL_RATING_SCALE_COLUMNS, 'Actions'];

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
    // Scope strictly to Scale tabPanel to avoid picking Agency tab's hidden add button
    // (PrimeNG renders ALL tab panels simultaneously; page-scope OR locators find Agency's first)
    return this.tabPanel
      .locator('button:has(.ph-plus), button.add-btn')
      .or(this.tabPanel.locator('p-button[icon*="plus"]').locator('button'))
      .first();
  }

  async clickAddButton(): Promise<void> {
    const btn = this.getAddButton();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  // ─── Dialog helpers ───────────────────────────────────────────────────────────

  getDialog(): Locator {
    return this.page.locator('[role="dialog"], .p-dialog').first();
  }

  /** External Rating dropdown — first dropdown in dialog */
  getExternalRatingDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(0);
  }

  /** Rank input — number field, default 0 */
  getRankInput(): Locator {
    return this.getDialog()
      .locator('input[type="number"]')
      .or(this.getDialog().locator('p-inputnumber input'))
      .or(this.getDialog().locator('input').nth(0))
      .first();
  }

  /** Label input — mandatory text field */
  getLabelInput(): Locator {
    return this.getDialog()
      .locator('input[placeholder*="Enter label" i]')
      .or(this.getDialog().locator('input[type="text"]').nth(0))
      .first();
  }

  /** Description input — optional text field */
  getDescriptionInput(): Locator {
    return this.getDialog()
      .locator('input[placeholder*="Enter description" i]')
      .or(this.getDialog().locator('input[type="text"]').nth(1))
      .first();
  }

  /** Rating Type dropdown — second dropdown in dialog */
  getRatingTypeDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').nth(1);
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
    const first = listbox.locator('[role="option"], .p-select-option, .p-dropdown-item').first();
    await first.waitFor({ state: 'visible', timeout: 5000 });
    const text = (await first.innerText()).trim();
    await first.click();
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

  // ─── Form actions ─────────────────────────────────────────────────────────────

  async fillAddForm(
    externalRating: string,
    rank: number,
    label: string,
    description: string,
    ratingType: string,
  ): Promise<void> {
    await this.selectDropdownOption(this.getExternalRatingDropdown(), externalRating);
    const rankInput = this.getRankInput();
    await rankInput.clear();
    await rankInput.fill(String(rank));
    await rankInput.press('Tab');
    const labelInput = this.getLabelInput();
    await labelInput.clear();
    await labelInput.fill(label);
    await labelInput.press('Tab');
    const descInput = this.getDescriptionInput();
    await descInput.clear();
    await descInput.fill(description);
    await descInput.press('Tab');
    await this.selectDropdownOption(this.getRatingTypeDropdown(), ratingType);
  }

  /** Fill form selecting first available External Rating option. Returns selected agency name. */
  async fillAddFormWithFirstAgency(
    rank: number,
    label: string,
    description: string,
    ratingType: string,
  ): Promise<string> {
    const agencyName = await this.selectFirstDropdownOption(this.getExternalRatingDropdown());
    const rankInput = this.getRankInput();
    await rankInput.clear();
    await rankInput.fill(String(rank));
    await rankInput.press('Tab');
    const labelInput = this.getLabelInput();
    await labelInput.clear();
    await labelInput.fill(label);
    await labelInput.press('Tab');
    const descInput = this.getDescriptionInput();
    await descInput.clear();
    await descInput.fill(description);
    await descInput.press('Tab');
    await this.selectDropdownOption(this.getRatingTypeDropdown(), ratingType);
    return agencyName;
  }

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
    await this.tabPanel.locator('table tbody tr').first()
      .locator('button:has(.ph-eye)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditOnFirstRow(): Promise<void> {
    await this.tabPanel.locator('table tbody tr').first()
      .locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditByLabel(label: string): Promise<void> {
    await this.table.openColumnFilter('Label');
    await this.table.applyColumnFilter(label);
    const row = this.tabPanel.locator('table tbody tr').filter({ hasText: label });
    await row.first().waitFor({ state: 'visible', timeout: 10000 });
    await row.first().locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async deleteRecordByLabel(label: string): Promise<void> {
    await this.table.openColumnFilter('Label');
    await this.table.applyColumnFilter(label);
    const row = this.tabPanel.locator('table tbody tr').filter({ hasText: label });
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

  // ─── Agency tab cross-reference ───────────────────────────────────────────────

  /** Navigates to Agency tab, collects first-page agency descriptions, returns to Scale tab. */
  async getAgencyTabDescriptions(): Promise<string[]> {
    // Use robust tab click (same pattern as clickScaleTab)
    const allTabs = this.page.locator('[role="tab"]');
    const total = await allTabs.count();
    let clicked = false;
    for (let i = 0; i < total; i++) {
      const txt = (await allTabs.nth(i).innerText().catch(() => '')).trim();
      if (/^agency$/i.test(txt)) {
        await allTabs.nth(i).click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await this.page.locator('[role="tab"]').filter({ hasText: /agency/i }).first().click();
    }
    const agencyPanel = this.page.locator('[role="tabpanel"]').nth(0);
    await agencyPanel.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    // Description column = index 1 (Code=0, Description=1)
    const descriptions = await agencyPanel
      .locator('table tbody tr td:nth-child(2)')
      .allInnerTexts();
    // Return to Scale tab
    await this.clickScaleTab();
    return descriptions.map(d => d.trim()).filter(d => d.length > 0);
  }
}

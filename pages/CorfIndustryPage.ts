import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const CORF_INDUSTRY_COLUMNS = ['Code', 'Description', 'Is Nature Cyclicality?'] as const;

export class CorfIndustryPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly mainNavigation: Locator;
  /** Scoped to the first tab panel (CORF Industry) — avoids strict-mode collisions
   *  when PrimeNG renders multiple tab panels simultaneously in the DOM. */
  private readonly tabPanel: Locator;

  constructor(private readonly page: Page) {
    super(page);
    // PrimeNG renders ALL tab panels in the DOM simultaneously.
    // Scope table and paginator to [role="tabpanel"]:nth(0) (CORF Industry tab).
    this.tabPanel = page.locator('[role="tabpanel"]').nth(0);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]', this.tabPanel);
    this.paginator = new PaginatorComponent(page, this.tabPanel);
    this.export = new ExportComponent(page);
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    // Navigate directly via URL — avoids multi-level nav hierarchy expansion
    await this.page.goto('./rating-setup/industry-parameters');
    await this.clickCorfIndustryTab();
  }

  async clickCorfIndustryTab(): Promise<void> {
    // CORF Industry is the default first tab — click to ensure it is active
    const tab = this.page
      .locator('[role="tab"]').filter({ hasText: /corf industry/i })
      .or(this.page.locator('a, li, button').filter({ hasText: /corf industry/i }))
      .first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
    }
    await expect(
      this.page.getByRole('heading', { name: /corf industry/i }),
    ).toBeVisible({ timeout: 15000 });
    // Wait for table rows to load before proceeding
    await this.tabPanel.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
  }

  // ─── TC_102 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /corf industry/i }),
    ).toBeVisible();
    await expect(this.tabPanel.locator('table')).toBeVisible();
    // Iterate visible export buttons — avoids strict-mode collision with other tab panels
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

  // ─── TC_104 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.tabPanel.locator('th').allInnerTexts();
    const normalised = headerTexts
      .map(h => h.replace(/\s+/g, ' ').trim())
      .filter(h => h.length > 0);

    const expected = [...CORF_INDUSTRY_COLUMNS, 'Actions'];

    // Exact column count — no extra columns allowed (e.g. "Status" should not be present)
    expect(
      normalised.length,
      `Table has ${normalised.length} columns [${normalised.join(', ')}], expected exactly ${expected.length}: [${expected.join(', ')}]`,
    ).toBe(expected.length);

    // Each required column present
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
      .locator('button:has(.ph-plus)')
      .or(this.page.getByRole('button', { name: /^\+$|^add$/i }))
      .or(this.page.locator('p-button[icon*="plus"]').locator('button'))
      .first();
  }

  async clickAddButton(): Promise<void> {
    const btn = this.getAddButton();
    const visible = await btn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) {
      await this.page.locator('button.p-button-icon-only').last().click();
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

  getCodeInput(): Locator {
    return this.getDialog()
      .locator('input[placeholder*="Enter code" i]')
      .or(this.getDialog().locator('input').nth(0))
      .first();
  }

  getDescriptionInput(): Locator {
    return this.getDialog()
      .locator('input[placeholder*="Enter description" i]')
      .or(this.getDialog().locator('input').nth(1))
      .first();
  }

  getNatureCyclicalityDropdown(): Locator {
    return this.getDialog().locator('p-select, p-dropdown').first();
  }

  // ─── Dropdown selection ───────────────────────────────────────────────────────

  async selectNatureCyclicality(value: 'Yes' | 'No'): Promise<void> {
    const dropdown = this.getNatureCyclicalityDropdown();
    await dropdown.click();
    const listbox = this.page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = listbox
      .locator('[role="option"], .p-select-option, .p-dropdown-item')
      .filter({ hasText: new RegExp(`^\\s*${value}\\s*$`, 'i') })
      .first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  // ─── Form actions ─────────────────────────────────────────────────────────────

  async fillAddForm(code: string, description: string, isNatureCyclicality: 'Yes' | 'No'): Promise<void> {
    const codeInput = this.getCodeInput();
    const descInput = this.getDescriptionInput();
    await codeInput.clear();
    await codeInput.fill(code);
    await codeInput.press('Tab'); // trigger Angular blur validators
    await descInput.clear();
    await descInput.fill(description);
    await descInput.press('Tab'); // trigger Angular blur validators
    await this.selectNatureCyclicality(isNatureCyclicality);
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

  async clickEditByCode(code: string): Promise<void> {
    // Filter Code column first — record may be on a page beyond page 1 (alphabetical sort)
    await this.table.openColumnFilter('Code');
    await this.table.applyColumnFilter(code);
    const row = this.tabPanel.locator('table tbody tr').filter({ hasText: code });
    await row.first().waitFor({ state: 'visible', timeout: 10000 });
    await row.first().locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async deleteRecordByCode(code: string): Promise<void> {
    // Filter Code column first — record may be on a page beyond page 1 (alphabetical sort)
    await this.table.openColumnFilter('Code');
    await this.table.applyColumnFilter(code);
    const row = this.tabPanel.locator('table tbody tr').filter({ hasText: code });
    if (await row.count() === 0) return;
    await row.first().locator('button:has(.ph-trash)').click();
    // Handle confirmation dialog if app shows one
    const confirmBtn = this.page
      .getByRole('button', { name: /^(yes|confirm|ok|delete)$/i })
      .first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    // Wait for row to disappear
    await row.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  // ─── Private nav helpers ─────────────────────────────────────────────────────

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation
      .getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) { await byButton.click(); return; }
    const byLink = this.mainNavigation
      .getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) { await byLink.click(); return; }
    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }
}

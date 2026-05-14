import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const DEFAULTER_RATING_COLUMNS = [
  'Company Name',
  'Unique Identifier',
  'Rating Date',
  'Financial Year',
  'External Rating',
  'Vendor System',
  'Has Error?',
  'Validation status',
  'Error desc',
] as const;

export class DefaulterRatingDetailsPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly mainNavigation: Locator;
  /** Scoped to the second tab panel (Defaulter And Committee Rating Details) — avoids strict-mode
   *  collisions with the first tab panel (Counterparty Details) that is always in DOM. */
  private readonly tabPanel: Locator;

  constructor(private readonly page: Page) {
    super(page);
    // PrimeNG renders BOTH tab panels in the DOM simultaneously.
    // Scope everything to [role="tabpanel"]:nth(1) so locators don't resolve to 2 elements.
    this.tabPanel = page.locator('[role="tabpanel"]').nth(1);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]', this.tabPanel);
    this.paginator = new PaginatorComponent(page, this.tabPanel);
    this.export = new ExportComponent(page);
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Admin');
    await this.clickNavNode('Interfacing Records');
    await this.clickDefaulterTab();
  }

  async clickDefaulterTab(): Promise<void> {
    const tab = this.page
      .locator('[role="tab"]').filter({ hasText: /defaulter and committee rating details/i })
      .or(this.page.locator('a, li, button').filter({ hasText: /defaulter and committee rating details/i }))
      .first();
    await tab.click();
    await expect(
      this.page.getByRole('heading', { name: /defaulter and committee rating details/i }),
    ).toBeVisible();
    // Wait for table rows to load before proceeding
    await this.tabPanel.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  // ─── TC_034 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /defaulter and committee rating details/i }),
    ).toBeVisible();
    await expect(this.tabPanel.locator('table')).toBeVisible();
    // Scope export buttons to this tab panel to avoid strict-mode collision with Counterparty tab panel
    await expect(this.tabPanel.locator('button.export-pdf')).toBeVisible();
    await expect(this.tabPanel.locator('button.export-excel')).toBeVisible();
    await expect(this.tabPanel.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_035 ──────────────────────────────────────────────────────────────────

  async verifyTableHasRows(): Promise<void> {
    const count = await this.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  }

  // ─── TC_036 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.tabPanel.locator('th').allInnerTexts();
    const normalised = headerTexts.map(h => h.replace(/\s+/g, ' ').trim().toLowerCase());
    for (const col of DEFAULTER_RATING_COLUMNS) {
      expect(
        normalised.some(h => h.includes(col.toLowerCase())),
        `Column "${col}" missing from table`,
      ).toBe(true);
    }
  }

  // ─── TC_037 ──────────────────────────────────────────────────────────────────

  async verifySortIconsOnAllColumns(): Promise<void> {
    const sortableCols = await this.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['Company Name', 'Unique Identifier', 'Has Error?']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  }

  // ─── TC_038 ──────────────────────────────────────────────────────────────────

  async verifyFilterIconsOnColumns(): Promise<void> {
    const filterableCols = await this.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
  }

  // ─── TC_065 ──────────────────────────────────────────────────────────────────

  async verifyNoAddButton(): Promise<void> {
    const addBtn = this.page.getByRole('button', { name: /^add$|^\+$/i });
    await expect(addBtn).toHaveCount(0);
  }

  async verifyNoRowActions(): Promise<void> {
    const editIcons = this.tabPanel.locator('tbody tr button:has(.ph-pencil-simple)');
    const deleteIcons = this.tabPanel.locator('tbody tr button:has(.ph-trash)');
    await expect(editIcons).toHaveCount(0);
    await expect(deleteIcons).toHaveCount(0);
  }

  // ─── Private nav helpers ─────────────────────────────────────────────────────

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) { await byButton.click(); return; }
    const byLink = this.mainNavigation.getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) { await byLink.click(); return; }
    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }
}

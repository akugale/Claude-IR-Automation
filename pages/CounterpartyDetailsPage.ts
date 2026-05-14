import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const COUNTERPARTY_DETAILS_COLUMNS = [
  'Counterparty Name',
  'Unique Identifier',
  'Sub Industry Code',
  'Sub Industry',
  'Code',
  'Industry',
  'Vendor System',
  'Has Error?',
  'Validation status',
  'Error desc',
] as const;

export class CounterpartyDetailsPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly mainNavigation: Locator;
  /** Scoped to the first tab panel (Counterparty Details) — avoids strict-mode collisions with the
   *  second tab panel (Defaulter And Committee Rating Details) that is always in DOM. */
  private readonly tabPanel: Locator;

  constructor(private readonly page: Page) {
    super(page);
    // PrimeNG renders BOTH tab panels in the DOM simultaneously (only hides the inactive one).
    // Scope everything to [role="tabpanel"]:nth-child(1) so locators don't resolve to 2 elements.
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
    await this.clickNavNode('Admin');
    await this.clickNavNode('Interfacing Records');
    // Wait for Counterparty Details tab panel to load with data
    await expect(
      this.page.getByRole('heading', { name: /counterparty interface details/i }),
    ).toBeVisible();
    // Wait for table rows to load before proceeding
    await this.tabPanel.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  }

  async clickCounterpartyDetailsTab(): Promise<void> {
    const tab = this.page
      .locator('[role="tab"]').filter({ hasText: /^counterparty details$/i })
      .or(this.page.locator('a, li, button').filter({ hasText: /^counterparty details$/i }))
      .first();
    await tab.click();
    await expect(
      this.page.getByRole('heading', { name: /counterparty interface details/i }),
    ).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /counterparty interface details/i })).toBeVisible();
    await expect(this.tabPanel.locator('table')).toBeVisible();
    await expect(this.tabPanel.locator('button.export-pdf')).toBeVisible();
    await expect(this.tabPanel.locator('button.export-excel')).toBeVisible();
    await expect(this.tabPanel.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyTabsExist(): Promise<void> {
    const counterpartyTab = this.page
      .locator('[role="tab"], li, a, button')
      .filter({ hasText: /counterparty details/i })
      .first();
    const defaulterTab = this.page
      .locator('[role="tab"], li, a, button')
      .filter({ hasText: /defaulter and committee rating details/i })
      .first();
    await expect(counterpartyTab).toBeVisible();
    await expect(defaulterTab).toBeVisible();
  }

  // ─── TC_003 ──────────────────────────────────────────────────────────────────

  async verifyCounterpartyDetailsTabActive(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /counterparty interface details/i }),
    ).toBeVisible();
  }

  // ─── TC_004 ──────────────────────────────────────────────────────────────────

  async verifyTableHasRows(): Promise<void> {
    const count = await this.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  }

  // ─── TC_005 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.tabPanel.locator('th').allInnerTexts();
    const normalised = headerTexts.map(h => h.replace(/\s+/g, ' ').trim().toLowerCase());
    for (const col of COUNTERPARTY_DETAILS_COLUMNS) {
      expect(
        normalised.some(h => h.includes(col.toLowerCase())),
        `Column "${col}" missing from table`,
      ).toBe(true);
    }
  }

  // ─── TC_006 ──────────────────────────────────────────────────────────────────

  async verifySortIconsOnAllColumns(): Promise<void> {
    const sortableCols = await this.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['Counterparty Name', 'Unique Identifier', 'Has Error?']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  }

  // ─── TC_007 ──────────────────────────────────────────────────────────────────

  async verifyFilterIconsOnColumns(): Promise<void> {
    const filterableCols = await this.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
  }

  // ─── TC_032 ──────────────────────────────────────────────────────────────────

  async verifyNoAddButton(): Promise<void> {
    const addBtn = this.page.getByRole('button', { name: /^add$|^\+$/i });
    await expect(addBtn).toHaveCount(0);
  }

  // ─── TC_033 ──────────────────────────────────────────────────────────────────

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

import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class CounterpartyGroupPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  readonly codeInput: Locator;
  readonly descriptionInput: Locator;

  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput        = page.locator('p-dialog').getByPlaceholder(/enter code/i).first();
    this.descriptionInput = page.locator('p-dialog').getByPlaceholder(/enter description/i).first();

    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Reference Data');
    await this.clickNavNode('Counterparty Setup');
    await this.clickNavNode('Counterparty Group');
    await expect(this.page.getByRole('heading', { name: /counterparty group/i })).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /counterparty group/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
    // Read-only screen — no add button expected
    await expect(this.page.getByRole('button', { name: /^\+$/ })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: /^add$/i })).toHaveCount(0);
  }

  // ─── TC_014 / TC_015 — View modal ────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    await expect(this.page.locator('[role="dialog"]')).toBeVisible({ timeout: 8000 });
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    // All inputs inside dialog must be disabled (read-only view)
    const inputs = dialog.locator('input, textarea');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await expect(inputs.nth(i), `Input ${i} should be disabled in view modal`).toBeDisabled();
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) {
      await byButton.click();
      return;
    }
    const byMenuItem = this.mainNavigation.getByRole('menuitem', { name: new RegExp(label, 'i') }).first();
    if (await byMenuItem.isVisible().catch(() => false)) {
      await byMenuItem.click();
      return;
    }
    const byLink = this.mainNavigation.getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) {
      await byLink.click();
      return;
    }
    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }
}

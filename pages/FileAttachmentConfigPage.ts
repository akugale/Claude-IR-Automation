import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export const FILE_ATTACHMENT_COLUMNS = [
  'File Extension',
  'Mime Type',
  'Max File Size(in kb)',
] as const;

export class FileAttachmentConfigPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    // No tab panels on this screen — no container scoping needed
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Admin');
    await this.clickNavNode('File Attachment Configuration');
    await expect(
      this.page.getByRole('heading', { name: /file attachment configuration/i }),
    ).toBeVisible();
    // Wait for table rows to load
    await this.page.locator('table tbody tr').first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .catch(() => {});
  }

  // ─── TC_067 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: /file attachment configuration/i }),
    ).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
    await expect(this.getAddButton()).toBeVisible();
  }

  // ─── TC_069 ──────────────────────────────────────────────────────────────────

  async verifyRequiredColumns(): Promise<void> {
    const headerTexts = await this.page.locator('th').allInnerTexts();
    const normalised = headerTexts.map(h => h.replace(/\s+/g, ' ').trim().toLowerCase());
    for (const col of FILE_ATTACHMENT_COLUMNS) {
      expect(
        normalised.some(h => h.includes(col.toLowerCase())),
        `Column "${col}" missing from table`,
      ).toBe(true);
    }
    expect(normalised.some(h => h.includes('actions')), 'Actions column missing').toBe(true);
  }

  // ─── TC_085 / TC_086 / TC_087 ────────────────────────────────────────────────

  async verifyRowActionIcons(): Promise<void> {
    const firstRow = this.page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
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
      // Fallback: 3rd icon-only button in heading row (after PDF, Excel)
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

  getFileExtensionInput(): Locator {
    // Placeholder: "e.g. .pdf"
    return this.getDialog()
      .locator('input[placeholder*=".pdf"]')
      .or(this.getDialog().locator('input').nth(0))
      .first();
  }

  getMimeTypeInput(): Locator {
    // Placeholder: "e.g. application/pdf"
    return this.getDialog()
      .locator('input[placeholder*="application/pdf"]')
      .or(this.getDialog().locator('input').nth(1))
      .first();
  }

  getMaxFileSizeInput(): Locator {
    // Angular uses reactive-form validators for numeric — no type="number" attribute on this field.
    // Third input in dialog (index 2): File Extension [0], Mime Type [1], Max File Size [2].
    return this.getDialog().locator('input').nth(2);
  }

  // ─── TC_090 – popup verification ─────────────────────────────────────────────

  async verifyAddPopupTitle(): Promise<void> {
    await expect(
      this.getDialog().getByText(/new file attachment config/i),
    ).toBeVisible();
  }

  async verifyAddPopupFields(): Promise<void> {
    await expect(this.getFileExtensionInput(), 'File Extension input missing').toBeVisible();
    await expect(this.getMimeTypeInput(), 'Mime Type input missing').toBeVisible();
    await expect(this.getMaxFileSizeInput(), 'Max File Size input missing').toBeVisible();
  }

  async verifyAddPopupButtons(): Promise<void> {
    const dialog = this.getDialog();
    await expect(dialog.getByRole('button', { name: /cancel/i }), 'Cancel button missing').toBeVisible();
    await expect(dialog.getByRole('button', { name: /save|update/i }), 'Save/Update button missing').toBeVisible();
  }

  // ─── Form actions ─────────────────────────────────────────────────────────────

  async fillAddForm(fileExtension: string, mimeType: string, maxFileSizeKb: number): Promise<void> {
    const extInput = this.getFileExtensionInput();
    const mimeInput = this.getMimeTypeInput();
    const sizeInput = this.getMaxFileSizeInput();
    await extInput.clear();
    await extInput.fill(fileExtension);
    await extInput.press('Tab'); // trigger Angular blur validators
    await mimeInput.clear();
    await mimeInput.fill(mimeType);
    await mimeInput.press('Tab'); // trigger Angular blur validators
    await sizeInput.clear();
    await sizeInput.fill(String(maxFileSizeKb));
    await sizeInput.press('Tab'); // trigger Angular blur validators
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
    await this.page.locator('table tbody tr').first()
      .locator('button:has(.ph-eye)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditOnFirstRow(): Promise<void> {
    await this.page.locator('table tbody tr').first()
      .locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async clickEditByExtension(fileExtension: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: fileExtension });
    await row.first().locator('button:has(.ph-pencil-simple)').click();
    await this.getDialog().waitFor({ state: 'visible', timeout: 10000 });
  }

  async deleteRecordByExtension(fileExtension: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: fileExtension });
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

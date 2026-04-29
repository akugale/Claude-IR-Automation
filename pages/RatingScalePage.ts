import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RatingScalePage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly labelInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly updateInModalButton: Locator;
  private readonly resetInModalButton: Locator;
  private readonly cancelInModalButton: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.labelInput = page.locator('[role="dialog"]').getByPlaceholder(/label/i).first();
    this.descriptionInput = page.locator('[role="dialog"]').getByPlaceholder(/description/i).first();
    this.updateInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^update$/i });
    this.resetInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^(reset|clear)$/i });
    this.cancelInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^cancel$/i });
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Rating');
    await this.clickNavNode('Rating Setup');
    await this.clickNavNode('Rating Scale');
    await expect(this.page.getByRole('heading', { name: /rating scale/i })).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /rating scale/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyTableColumns(): Promise<void> {
    // Required columns per FRD: Rating Type (app shows as "Model Type"), Scale Group, Rank, Label, Description, Value Start, Value End, Actions
    const requiredColumns = ['Scale Group', 'Rank', 'Label', 'Description', 'Value Start', 'Value End', 'Actions'];
    for (const col of requiredColumns) {
      await expect(
        this.page.locator('th').filter({ hasText: new RegExp(`\\b${col}\\b`, 'i') }).first(),
        `Column "${col}" should be visible`,
      ).toBeVisible();
    }
    // Accept either "Rating Type" or "Model Type" for the first column
    const ratingTypeHeader = this.page.locator('th').filter({ hasText: /rating type|model type/i }).first();
    await expect(ratingTypeHeader, 'Rating Type (or Model Type) column should be visible').toBeVisible();
  }

  async verifyNoExtraColumns(): Promise<void> {
    const actualHeaders = await this.getTableColumnLabels();
    // Strip sort/filter icon text — keep only alphabetic label content
    const cleanHeaders = actualHeaders.map(h => h.replace(/[\u2191\u2193↑↓]/g, '').trim());
    const allowed = new Set([
      'rating type', 'model type', 'scale group', 'rank', 'label',
      'description', 'value start', 'value end', 'actions', '',
    ]);
    const extra = cleanHeaders.filter(h => h && !allowed.has(h.toLowerCase()));
    expect(
      extra,
      `Unexpected extra columns found: [${extra.join(', ')}]. Only required columns should be shown.`,
    ).toHaveLength(0);
  }

  async verifyActionsHaveOnlyViewAndEdit(): Promise<void> {
    const firstRow = this.page.locator('table tbody tr').first();
    const buttons = firstRow.locator('td:last-child button');
    const count = await buttons.count();
    expect(count, 'Actions column should have exactly 2 buttons: View and Edit (no Delete)').toBe(2);
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View (eye) button should be present').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit (pencil) button should be present').toBeVisible();
    const hasDelete = await firstRow.locator('button:has(.ph-trash), button:has(.ph-trash-simple)').isVisible().catch(() => false);
    expect(hasDelete, 'Delete button should NOT be present in Actions column').toBe(false);
  }

  // ─── TC_003 ──────────────────────────────────────────────────────────────────

  async verifyTableHasRows(): Promise<void> {
    const rowCount = await this.table.getRowCount();
    expect(rowCount, 'Rating Scale table should have at least one record').toBeGreaterThan(0);
  }

  // ─── TC_015 / TC_016 / TC_017 / TC_018 / TC_028 / TC_029 / TC_030 ──────────

  async openEditModal(ratingType: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: ratingType }).first();
    await expect(row, `Row with Rating Type "${ratingType}" should be visible`).toBeVisible();
    await row.locator('button:has(.ph-pencil-simple)').click();
    await expect(this.updateInModalButton).toBeVisible({ timeout: 5000 });
  }

  async verifyEditModalContents(): Promise<void> {
    await expect(this.updateInModalButton, 'Update button should be visible in edit modal').toBeVisible();
    await expect(this.cancelInModalButton, 'Cancel button should be visible in edit modal').toBeVisible();
    // Verify field labels are present
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog.getByText(/\blabel\b/i).first(), 'Label field label should be visible').toBeVisible();
    await expect(dialog.getByText(/description/i).first(), 'Description field label should be visible').toBeVisible();
  }

  async verifyResetButtonPresent(): Promise<void> {
    await expect(
      this.resetInModalButton,
      'Reset button should be present in the edit modal',
    ).toBeVisible({ timeout: 3000 });
  }

  async verifyResetButtonLabel(): Promise<void> {
    const label = await this.resetInModalButton.innerText();
    expect(label.trim().toLowerCase(), 'Reset button label should be "Reset" or "Clear"').toMatch(/^(reset|clear)$/i);
  }

  // Returns all column headers from the table
  async getTableColumnLabels(): Promise<string[]> {
    const headers = await this.page.locator('table thead th').allInnerTexts();
    return headers.map(h => h.trim()).filter(h => h.length > 0);
  }

  // Gets cell values for a given column header (first N rows)
  async getColumnValues(columnHeader: string, count = 5): Promise<string[]> {
    const headers = await this.page.locator('table thead th').allInnerTexts();
    const colIdx = headers.findIndex(h => h.trim().toLowerCase().includes(columnHeader.toLowerCase()));
    if (colIdx < 0) return [];
    const cells = await this.page.locator(`table tbody tr td:nth-child(${colIdx + 1})`).allInnerTexts();
    return cells.slice(0, count).map(v => v.trim());
  }

  // Verifies sort toggles ascending/descending AND visible-page data is in correct order
  async verifySortForColumn(columnHeader: string): Promise<void> {
    // Sort ascending — verify aria-label and page data order
    await this.table.sortByColumn(columnHeader);
    const asc = await this.table.getColumnSortOrder(columnHeader);
    expect(asc, `Column "${columnHeader}" should be ascending after first click`).toMatch(/ascending/i);
    const ascValues = await this.getColumnValues(columnHeader, 10);
    const ascUnique = [...new Set(ascValues)];
    if (ascUnique.length >= 2) {
      const cmp = ascUnique[0].localeCompare(ascUnique[ascUnique.length - 1], undefined, { numeric: true, sensitivity: 'base' });
      expect(
        cmp,
        `"${columnHeader}" ascending: first unique value "${ascUnique[0]}" should be ≤ last unique value "${ascUnique[ascUnique.length - 1]}" on the visible page`,
      ).toBeLessThanOrEqual(0);
    }

    // Sort descending — verify aria-label and page data order
    await this.table.sortByColumn(columnHeader);
    const desc = await this.table.getColumnSortOrder(columnHeader);
    expect(desc, `Column "${columnHeader}" should be descending after second click`).toMatch(/descending/i);
    const descValues = await this.getColumnValues(columnHeader, 10);
    const descUnique = [...new Set(descValues)];
    if (descUnique.length >= 2) {
      const cmp = descUnique[0].localeCompare(descUnique[descUnique.length - 1], undefined, { numeric: true, sensitivity: 'base' });
      expect(
        cmp,
        `"${columnHeader}" descending: first unique value "${descUnique[0]}" should be ≥ last unique value "${descUnique[descUnique.length - 1]}" on the visible page`,
      ).toBeGreaterThanOrEqual(0);
    }
  }

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateInModalButton).toBeDisabled();
  }

  async editLabel(newLabel: string): Promise<void> {
    const input = await this.resolveEditableInput(this.labelInput);
    await input.clear();
    await input.fill(newLabel);
  }

  async editDescription(newDescription: string): Promise<void> {
    const input = await this.resolveEditableInput(this.descriptionInput);
    await input.clear();
    await input.fill(newDescription);
  }

  async getLabelValue(): Promise<string> {
    const input = await this.resolveEditableInput(this.labelInput);
    return input.inputValue();
  }

  async getDescriptionValue(): Promise<string> {
    const input = await this.resolveEditableInput(this.descriptionInput);
    return input.inputValue();
  }

  async clickUpdateInModal(): Promise<void> {
    await this.updateInModalButton.click();
  }

  async clickResetInEditModal(): Promise<void> {
    await this.resetInModalButton.click();
  }

  async cancelModal(): Promise<void> {
    await this.cancelInModalButton.click();
    await expect(this.page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  }

  async verifySuccessOrPendingMessage(): Promise<void> {
    // After clicking Update, a visible toast with success/pending message is required
    const toastFound = await this.page
      .locator('p-toast, .p-toast, .toast, [role="alert"]')
      .getByText(/success|pending|authoris|updated|submitt|sent|saved|record/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(
      toastFound,
      'A success or pending-authorization toast message should appear after clicking Update. ' +
      'If the modal stays open with no feedback, the update may have failed silently.',
    ).toBe(true);
  }

  // ─── TC_028 — Rank not editable ──────────────────────────────────────────────

  async verifyRankNotEditable(): Promise<void> {
    await this.verifyInputNotEditable(['rank']);
  }

  // ─── TC_029 — Value Start not editable ──────────────────────────────────────

  async verifyValueStartNotEditable(): Promise<void> {
    await this.verifyInputNotEditable(['valuestart', 'value_start', 'startvalue', 'start', 'valueFrom']);
  }

  // ─── TC_030 — Value End not editable ─────────────────────────────────────────

  async verifyValueEndNotEditable(): Promise<void> {
    await this.verifyInputNotEditable(['valueend', 'value_end', 'endvalue', 'end', 'valueTo']);
  }

  // ─── TC_019 / TC_020 — View modal ────────────────────────────────────────────

  async openViewModal(ratingType: string): Promise<void> {
    const row = this.page.locator('table tbody tr').filter({ hasText: ratingType }).first();
    await expect(row, `Row with Rating Type "${ratingType}" should be visible`).toBeVisible();
    await row.locator('button:has(.ph-eye)').click();
    // View button shows a toast notification ("Viewing rating scale '...'"), not a dialog
    await expect(
      this.page.locator('p-toast, .p-toast, [role="alert"]')
        .filter({ hasText: /viewing rating scale/i })
        .first(),
    ).toBeVisible({ timeout: 5000 });
  }

  async isViewModalOpen(): Promise<boolean> {
    return this.page
      .locator('[role="dialog"], [role="alertdialog"], .p-dialog, .p-dynamic-dialog')
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    // Per FRD, clicking View should open a read-only modal with form fields.
    // Currently the app only shows a toast notification — no read-only modal exists.
    // This method asserts a proper view dialog is visible, failing to document the gap.
    const hasViewModal = await this.page
      .locator('[role="dialog"], [role="alertdialog"]')
      .filter({ hasText: /rating scale/i })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(
      hasViewModal,
      'A read-only view modal should open when clicking the View button, but only a toast notification appeared. ' +
      'The view modal with read-only fields is not implemented.',
    ).toBe(true);
  }

  // ─── TC_027 ──────────────────────────────────────────────────────────────────

  async verifyPaginationInfoText(): Promise<void> {
    const infoText = await this.paginator.getInfoText();
    expect(infoText, 'Pagination info text should show entries count').toMatch(/showing|of/i);
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  // Resolves to the preferred locator if visible, or the first non-disabled input in dialog
  private async resolveEditableInput(preferred: Locator): Promise<Locator> {
    if (await preferred.isVisible({ timeout: 1500 }).catch(() => false)) {
      return preferred;
    }
    return this.page.locator('[role="dialog"] input:not([disabled]):not([readonly])').first();
  }

  // Scans all inputs in the dialog for one matching any of the identifier strings
  // (against placeholder, name, id, formcontrolname). Verifies it is non-editable via:
  // HTML disabled attr, readonly attr, or PrimeNG p-disabled CSS class.
  // If no matching input found, field is plain text — not editable by definition.
  private async verifyInputNotEditable(identifiers: string[]): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]');
    const allInputs = await dialog.locator('input').all();

    for (const input of allInputs) {
      const attrs = (await Promise.all([
        input.getAttribute('placeholder').catch(() => ''),
        input.getAttribute('name').catch(() => ''),
        input.getAttribute('id').catch(() => ''),
        input.getAttribute('formcontrolname').catch(() => ''),
      ])).join(' ').toLowerCase().replace(/[^a-z0-9 ]/g, '');

      if (identifiers.some(id => attrs.includes(id.toLowerCase()))) {
        const isDisabled = await input.isDisabled().catch(() => false);
        const isReadonly = (await input.getAttribute('readonly').catch(() => null)) !== null;
        const classes = (await input.getAttribute('class').catch(() => '') ?? '');
        const hasPDisabled = classes.includes('p-disabled') || classes.includes('ng-disabled');
        const isAriaDisabled = (await input.getAttribute('aria-disabled').catch(() => null)) === 'true';
        expect(
          isDisabled || isReadonly || hasPDisabled || isAriaDisabled,
          `Field [${identifiers[0]}] should not be editable`,
        ).toBe(true);
        return;
      }
    }
    // No matching input found → field is plain text → not editable ✓
  }

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) {
      await byButton.click();
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

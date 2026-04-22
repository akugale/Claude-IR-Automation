import { expect, Locator, Page } from '@playwright/test';
import { TableComponent } from '../components/TableComponent';

export class CounterpartyTypePage {
  private readonly codeInput;
  private readonly descriptionInput;
  private readonly addInModalButton;
  private readonly updateInModalButton;
  private readonly confirmDeleteYesButton;
  private readonly resetInModalButton;
  private readonly exportPdfButton;
  private readonly exportExcelButton;
  private readonly table;
  private readonly mainNavigation;

  constructor(private readonly page: Page) {
    this.codeInput = this.page.getByPlaceholder('Enter code').first();
    this.descriptionInput = this.page.getByPlaceholder('Enter description').first();
    this.addInModalButton = this.page.getByRole('button', { name: /^add$/i }).last();
    this.updateInModalButton = this.page.getByRole('button', { name: /^update$/i });
    this.confirmDeleteYesButton = this.page.getByRole('button', { name: /^yes$/i });
    this.resetInModalButton = this.page.getByRole('button', { name: /^reset$/i });
    this.exportPdfButton = this.page.locator('button.export-pdf');
    this.exportExcelButton = this.page.locator('button.export-excel');
    this.table = new TableComponent(
      this.page,
      'table',
      'input[placeholder*="Search"], input[type="search"]'
    );
    this.mainNavigation = this.page.getByRole('navigation', { name: /main navigation/i });
  }

  async goto(): Promise<void> {
    await this.clickNavNode('Reference Data');
    await this.clickNavNode('Counterparty Setup');
    await this.clickNavNode('Counterparty Type');
    await expect(this.page.getByRole('heading', { name: /counterparty type/i })).toBeVisible();
    await this.getAddIconButton();
  }

  async addCounterpartyType(code: string, description: string): Promise<void> {
    const addIconButton = await this.getAddIconButton();
    await addIconButton.click();
    await expect(this.page.getByText('New Counterparty Type', { exact: true })).toBeVisible();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    await this.addInModalButton.click();
    await expect(this.page.getByText('New Counterparty Type', { exact: true })).toBeHidden();
  }

  async editCounterpartyType(code: string, newDescription: string): Promise<void> {
    await this.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.page.getByText('Edit Counterparty Type', { exact: true })).toBeVisible();
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateInModalButton.click();
    await expect(this.page.getByText('Edit Counterparty Type', { exact: true })).toBeHidden();
  }

  async deleteCounterpartyType(code: string): Promise<void> {
    await this.clickRowAction(code, 'ph-trash');
    await expect(this.page.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await this.confirmDeleteYesButton.click();
    await expect(this.page.getByText('Confirm Delete', { exact: true })).toBeHidden();
  }

  async openViewModal(code: string): Promise<void> {
    await this.clickRowAction(code, 'ph-eye');
    await expect(this.page.getByText('View Counterparty Type', { exact: true })).toBeVisible();
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    await expect(this.codeInput).toBeDisabled();
    await expect(this.descriptionInput).toBeDisabled();
  }

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async openAddModal(): Promise<void> {
    const addIconButton = await this.getAddIconButton();
    await addIconButton.click();
    await expect(this.page.getByText('New Counterparty Type', { exact: true })).toBeVisible();
  }

  async verifyAddButtonDisabled(): Promise<void> {
    await expect(this.addInModalButton).toBeDisabled();
  }

  async verifyAddButtonEnabled(): Promise<void> {
    await expect(this.addInModalButton).toBeEnabled();
  }

  async triggerExportPdf(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportPdfButton.click();
    await expect(this.page.getByText('PDF export initiated')).toBeVisible();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  }

  async triggerExportExcel(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.exportExcelButton.click();
    await expect(this.page.getByText('Excel export initiated')).toBeVisible();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  }

  async getFirstTableRowCode(): Promise<string> {
    return this.page.locator('tbody tr').first().locator('td').first().innerText();
  }

  async clickSortByColumn(columnName: string): Promise<void> {
    await this.page
      .locator('th.p-datatable-sortable-column')
      .filter({ hasText: columnName })
      .click();
  }

  async getColumnSortOrder(columnName: string): Promise<string | null> {
    return this.page
      .locator('th.p-datatable-sortable-column')
      .filter({ hasText: columnName })
      .getAttribute('aria-sort');
  }

  async submitAddForm(): Promise<void> {
    await this.addInModalButton.click();
  }

  async clickResetInModal(): Promise<void> {
    await this.resetInModalButton.click();
  }

  async verifyModalFieldsEmpty(): Promise<void> {
    await expect(this.codeInput).toHaveValue('');
    await expect(this.descriptionInput).toHaveValue('');
  }

  async verifyAddModalOpen(): Promise<void> {
    await expect(this.page.getByText('New Counterparty Type', { exact: true })).toBeVisible();
  }

  async verifyRecordExists(code: string, description: string): Promise<void> {
    await this.table.search(code);
    await this.table.verifyRowExistsByValues([code, description]);
  }

  async verifyRecordNotExists(code: string): Promise<void> {
    await this.table.search(code);
    await this.table.verifyRowNotExists(code);
  }

  // clicks an action icon button (ph-pencil-simple | ph-trash | ph-eye) on the row matching code
  private async clickRowAction(code: string, iconClass: string): Promise<void> {
    await this.table.search(code);
    const row = this.page.locator('tbody tr').filter({ hasText: code }).first();
    await expect(row).toBeVisible();
    await row.locator(`button:has(.${iconClass})`).click();
  }

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

  private async getAddIconButton(): Promise<Locator> {
    const headingActionButtons = this.page
      .getByRole('heading', { name: /counterparty type/i })
      .locator('..')
      .getByRole('button');

    const headingAddIcon = headingActionButtons.last();
    if (await headingAddIcon.isVisible().catch(() => false) && await headingAddIcon.isEnabled().catch(() => false)) {
      return headingAddIcon;
    }

    const namedPlus = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await namedPlus.isVisible().catch(() => false) && await namedPlus.isEnabled().catch(() => false)) {
      return namedPlus;
    }

    const namedAdd = this.page.getByRole('button', { name: /add/i }).first();
    await expect(namedAdd).toBeVisible();
    await expect(namedAdd).toBeEnabled();
    return namedAdd;
  }
}

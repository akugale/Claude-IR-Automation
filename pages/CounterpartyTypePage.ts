import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class CounterpartyTypePage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly addInModalButton: Locator;
  private readonly updateInModalButton: Locator;
  private readonly confirmDeleteYesButton: Locator;
  private readonly resetInModalButton: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput = page.getByPlaceholder('Enter code').first();
    this.descriptionInput = page.getByPlaceholder('Enter description').first();
    this.addInModalButton = page.getByRole('button', { name: /^add$/i }).last();
    this.updateInModalButton = page.getByRole('button', { name: /^update$/i });
    this.confirmDeleteYesButton = page.getByRole('button', { name: /^yes$/i });
    this.resetInModalButton = page.getByRole('button', { name: /^reset$/i });
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Reference Data');
    await this.clickNavNode('Counterparty Setup');
    await this.clickNavNode('Counterparty Type');
    await expect(this.page.getByRole('heading', { name: /counterparty type/i })).toBeVisible();
    await this.getAddIconButton();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /counterparty type/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(await this.getAddIconButton()).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyAddModalContents(): Promise<void> {
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.resetInModalButton).toBeVisible();
    await expect(this.addInModalButton).toBeVisible();
  }

  // ─── TC_003 / TC_020 ─────────────────────────────────────────────────────────

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
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.page.getByText('Edit Counterparty Type', { exact: true })).toBeVisible();
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateInModalButton.click();
    await expect(this.page.getByText('Edit Counterparty Type', { exact: true })).toBeHidden();
  }

  // ─── TC_004 ──────────────────────────────────────────────────────────────────

  async verifyCodeFieldMaxLength(): Promise<void> {
    const longValue = 'A'.repeat(256);
    await this.codeInput.fill(longValue);
    const actualValue = await this.codeInput.inputValue();
    expect(actualValue.length).toBeLessThan(256);
  }

  // ─── TC_007 ──────────────────────────────────────────────────────────────────

  async verifyAddButtonDisabled(): Promise<void> {
    await expect(this.addInModalButton).toBeDisabled();
  }

  async verifyAddButtonEnabled(): Promise<void> {
    await expect(this.addInModalButton).toBeEnabled();
  }

  // ─── TC_008 ──────────────────────────────────────────────────────────────────

  async clickResetInModal(): Promise<void> {
    await this.resetInModalButton.click();
  }

  async verifyModalFieldsEmpty(): Promise<void> {
    await expect(this.codeInput).toHaveValue('');
    await expect(this.descriptionInput).toHaveValue('');
  }

  // ─── TC_017 ──────────────────────────────────────────────────────────────────

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.page.getByText('Edit Counterparty Type', { exact: true })).toBeVisible();
  }

  async clickUpdateInModal(): Promise<void> {
    await this.updateInModalButton.click();
  }

  async verifyNoAuthRequestToast(): Promise<void> {
    await expect(this.page.getByText(/authoris/i)).not.toBeVisible({ timeout: 3000 });
  }

  // ─── TC_022 ──────────────────────────────────────────────────────────────────

  async editAndResetModal(code: string, tempDescription: string): Promise<void> {
    await this.openEditModal(code);
    const originalDescription = await this.descriptionInput.inputValue();
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(tempDescription);
    await this.resetInModalButton.click();
    await expect(this.descriptionInput).toHaveValue(originalDescription);
  }

  // ─── TC_023 ──────────────────────────────────────────────────────────────────

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateInModalButton).toBeDisabled();
  }

  // ─── TC_025 / TC_026 ─────────────────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    await expect(this.page.getByText('View Counterparty Type', { exact: true })).toBeVisible();
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    await expect(this.codeInput).toBeDisabled();
    await expect(this.descriptionInput).toBeDisabled();
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    const addIconButton = await this.getAddIconButton();
    await addIconButton.click();
    await expect(this.page.getByText('New Counterparty Type', { exact: true })).toBeVisible();
  }

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async submitAddForm(): Promise<void> {
    await this.addInModalButton.click();
  }

  async verifyAddModalOpen(): Promise<void> {
    await expect(this.page.getByText('New Counterparty Type', { exact: true })).toBeVisible();
  }

  async deleteCounterpartyType(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-trash');
    await expect(this.page.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await this.confirmDeleteYesButton.click();
    await expect(this.page.getByText('Confirm Delete', { exact: true })).toBeHidden();
  }

  async verifyRecordExists(code: string, description: string): Promise<void> {
    await this.table.search(code);
    await this.table.verifyRowExistsByValues([code, description]);
  }

  async verifyRecordNotExists(code: string): Promise<void> {
    await this.table.search(code);
    await this.table.verifyRowNotExists(code);
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

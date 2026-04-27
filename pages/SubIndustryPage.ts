import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class SubIndustryPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly industryDropdown: Locator;
  private readonly addInModalButton: Locator;
  private readonly updateInModalButton: Locator;
  private readonly resetInModalButton: Locator;
  private readonly confirmDeleteYesButton: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search"], input[type="search"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput = page.getByPlaceholder('Enter code').first();
    this.descriptionInput = page.getByPlaceholder('Enter description').first();
    this.industryDropdown = page.locator('p-select:not(.p-paginator-rpp-dropdown)').first();
    this.addInModalButton = page.getByRole('button', { name: /^add$/i }).last();
    this.updateInModalButton = page.getByRole('button', { name: /^update$/i });
    this.resetInModalButton = page.getByRole('button', { name: /^reset$/i });
    this.confirmDeleteYesButton = page.getByRole('button', { name: /^yes$/i });
    this.mainNavigation = page.getByRole('navigation', { name: /main navigation/i });
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.ensureLoggedIn();
    await this.clickNavNode('Reference Data');
    await this.clickNavNode('Counterparty Setup');
    await this.clickNavNode('Sub Industry');
    await expect(this.page.getByRole('heading', { name: /sub.?industr/i })).toBeVisible();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /sub.?industr/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyAddModalContents(): Promise<void> {
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.industryDropdown).toBeVisible();
    await expect(this.resetInModalButton).toBeVisible();
    await expect(this.addInModalButton).toBeVisible();
  }

  // ─── TC_003b ─────────────────────────────────────────────────────────────────

  async verifyAddModalOpen(): Promise<void> {
    await expect(this.page.getByText('New Sub Industry', { exact: true })).toBeVisible();
  }

  // ─── TC_006 ──────────────────────────────────────────────────────────────────

  async verifyAddButtonDisabled(): Promise<void> {
    await expect(this.addInModalButton).toBeDisabled();
  }

  async verifyAddButtonEnabled(): Promise<void> {
    await expect(this.addInModalButton).toBeEnabled();
  }

  // ─── Industry dropdown ───────────────────────────────────────────────────────

  async selectIndustry(industryName: string): Promise<void> {
    await this.industryDropdown.locator('.p-select-dropdown').click();
    await this.page.locator('[role="listbox"] [role="option"]').filter({ hasText: new RegExp(`^${industryName}$`) }).first().click();
  }

  async getIndustryDropdownOptions(): Promise<string[]> {
    await this.industryDropdown.locator('.p-select-dropdown').click();
    const options = await this.page.locator('[role="listbox"] [role="option"]').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return options.map(o => o.trim());
  }

  // ─── TC_018 ──────────────────────────────────────────────────────────────────

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.page.getByText('Edit Sub Industry', { exact: true })).toBeVisible();
  }

  async editSubIndustry(code: string, newDescription: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateInModalButton.click();
    await expect(this.page.getByText('Edit Sub Industry', { exact: true })).toBeHidden();
  }

  // ─── TC_020 ──────────────────────────────────────────────────────────────────

  async editAndResetModal(code: string, tempDescription: string): Promise<void> {
    await this.openEditModal(code);
    const originalDescription = await this.descriptionInput.inputValue();
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(tempDescription);
    await this.resetInModalButton.click();
    await expect(this.descriptionInput).toHaveValue(originalDescription);
  }

  // ─── TC_021 ──────────────────────────────────────────────────────────────────

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateInModalButton).toBeDisabled();
  }

  // ─── TC_023 / TC_024 ─────────────────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    await expect(this.page.getByText('View Sub Industry', { exact: true })).toBeVisible();
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    await expect(this.codeInput).toBeDisabled();
    await expect(this.descriptionInput).toBeDisabled();
    await expect(this.industryDropdown).toHaveClass(/p-disabled/);
  }

  // ─── TC_032 ──────────────────────────────────────────────────────────────────

  async verifyIndustrySelected(industryName: string): Promise<void> {
    await expect(this.industryDropdown.locator('.p-select-label')).toHaveText(industryName);
  }

  // ─── TC_033 ──────────────────────────────────────────────────────────────────

  async editSubIndustryFullFields(code: string, newDescription: string, newIndustry: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.selectIndustry(newIndustry);
    await this.updateInModalButton.click();
    await expect(this.page.getByText('Edit Sub Industry', { exact: true })).toBeHidden();
  }

  // ─── TC_034 ──────────────────────────────────────────────────────────────────

  async verifyViewModalData(expectedCode: string, expectedDescription: string, expectedIndustry: string): Promise<void> {
    await expect(this.codeInput).toHaveValue(expectedCode);
    await expect(this.descriptionInput).toHaveValue(expectedDescription);
    await expect(this.industryDropdown.locator('.p-select-label')).toHaveText(expectedIndustry);
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    const addIconButton = await this.getAddIconButton();
    await addIconButton.click();
    await expect(this.page.getByText('New Sub Industry', { exact: true })).toBeVisible();
  }

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async addSubIndustry(code: string, description: string, industry: string): Promise<void> {
    await this.openAddModal();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    await this.selectIndustry(industry);
    await this.addInModalButton.click();
    await expect(this.page.getByText('New Sub Industry', { exact: true })).toBeHidden();
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
      .getByRole('heading', { name: /sub.?industr/i })
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

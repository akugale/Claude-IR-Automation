import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class BranchPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly branchTypeDropdown: Locator;
  private readonly parentBranchDropdown: Locator;
  private readonly countryDropdown: Locator;
  private readonly provinceDropdown: Locator;
  private readonly currencyDropdown: Locator;
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

    this.codeInput = page.locator('p-dialog:not([role="alertdialog"])').getByPlaceholder(/enter code/i).first();
    this.descriptionInput = page.locator('p-dialog:not([role="alertdialog"])').getByPlaceholder(/enter description/i).first();

    // Dropdowns in modal order: Branch Type, Parent Branch, Country, Province, Currency
    const dialogDropdowns = page.locator('p-dialog:not([role="alertdialog"]) p-select');
    this.branchTypeDropdown = dialogDropdowns.nth(0);
    this.parentBranchDropdown = dialogDropdowns.nth(1);
    this.countryDropdown = dialogDropdowns.nth(2);
    this.provinceDropdown = dialogDropdowns.nth(3);
    this.currencyDropdown = dialogDropdowns.nth(4);

    this.addInModalButton = page.getByRole('button', { name: /^save$/i }).last();
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
    await this.clickNavNode('Branch');
    // Navigate to child "Branch" — use last() to skip accordion parent button
    await this.clickNavLeafItem('Branch');
    await expect(this.page.getByRole('heading', { name: /^branch$/i })).toBeVisible();
    await this.getAddIconButton();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /^branch$/i })).toBeVisible();
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
    await expect(this.branchTypeDropdown).toBeVisible();
    await expect(this.parentBranchDropdown).toBeVisible();
    await expect(this.countryDropdown).toBeVisible();
    await expect(this.provinceDropdown).toBeVisible();
    await expect(this.currencyDropdown).toBeVisible();
    await expect(this.addInModalButton).toBeVisible();
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
    await expect(this.branchTypeDropdown.locator('.p-select-label')).toHaveText(/select/i);
    await expect(this.parentBranchDropdown.locator('.p-select-label')).toHaveText(/select/i);
    await expect(this.countryDropdown.locator('.p-select-label')).toHaveText(/select/i);
    // Province resets when Country is cleared — either disabled or showing placeholder
    const provinceDisabled = await this.provinceDropdown.getAttribute('class').then(c => (c ?? '').includes('p-disabled'));
    if (!provinceDisabled) {
      await expect(this.provinceDropdown.locator('.p-select-label')).toHaveText(/select/i);
    }
    await expect(this.currencyDropdown.locator('.p-select-label')).toHaveText(/select/i);
  }

  // ─── TC_034 ──────────────────────────────────────────────────────────────────

  async verifyProvinceDependsOnCountry(country: string): Promise<void> {
    // Province should be disabled or empty before Country is selected
    const isDisabledBefore = await this.provinceDropdown.getAttribute('class').then(c => (c ?? '').includes('p-disabled'));
    const optionsBefore = isDisabledBefore ? [] : await this.getDropdownOptions(this.provinceDropdown);
    expect(
      isDisabledBefore || optionsBefore.length === 0,
      'Province dropdown should be disabled or empty before Country is selected',
    ).toBe(true);

    // Select country — province should now have options
    await this.selectDropdownOption(this.countryDropdown, country);
    const isDisabledAfter = await this.provinceDropdown.getAttribute('class').then(c => (c ?? '').includes('p-disabled'));
    expect(isDisabledAfter, 'Province dropdown should be enabled after Country is selected').toBe(false);
    const optionsAfter = await this.getDropdownOptions(this.provinceDropdown);
    expect(optionsAfter.length, 'Province dropdown should have options after Country is selected').toBeGreaterThan(0);
  }

  // ─── Dropdown helpers ────────────────────────────────────────────────────────

  async selectDropdownOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.locator('.p-select-dropdown').click();
    await this.page.locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^${optionText}$`) })
      .first()
      .click();
  }

  async getDropdownOptions(dropdown: Locator): Promise<string[]> {
    await dropdown.locator('.p-select-dropdown').click();
    const options = await this.page.locator('[role="listbox"] [role="option"]').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return options.map(o => o.trim()).filter(o => o.length > 0);
  }

  async getBranchTypeDropdownOptions(): Promise<string[]> {
    return this.getDropdownOptions(this.branchTypeDropdown);
  }

  // ─── TC_017 ──────────────────────────────────────────────────────────────────

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.updateInModalButton).toBeVisible();
  }

  async clickUpdateInModal(): Promise<void> {
    await this.updateInModalButton.click();
  }

  async verifyNoAuthRequestToast(): Promise<void> {
    await expect(this.page.locator('p-toast, .p-toast, .toast').getByText(/authoris/i)).not.toBeVisible({ timeout: 3000 });
  }

  // ─── TC_020 ──────────────────────────────────────────────────────────────────

  async editBranch(code: string, newDescription: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateInModalButton.click();
    // Branch screen may keep modal open in maker-checker flow — close if still open
    try {
      await expect(this.updateInModalButton).toBeHidden({ timeout: 4000 });
    } catch {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.page.locator('.p-dialog-mask')).toBeHidden({ timeout: 5000 }).catch(() => {});
  }

  // ─── TC_033 ──────────────────────────────────────────────────────────────────

  async editBranchFullFields(
    code: string,
    newDescription: string,
    newBranchType: string,
    newParentBranch: string,
    newCountry: string,
    newProvince: string,
    newCurrency: string,
  ): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.selectDropdownOption(this.branchTypeDropdown, newBranchType);
    await this.selectDropdownOption(this.parentBranchDropdown, newParentBranch);
    await this.selectDropdownOption(this.countryDropdown, newCountry);
    await this.selectDropdownOption(this.provinceDropdown, newProvince);
    await this.selectDropdownOption(this.currencyDropdown, newCurrency);
    await this.updateInModalButton.click();
    // Branch screen may keep modal open in maker-checker flow — close if still open
    try {
      await expect(this.updateInModalButton).toBeHidden({ timeout: 4000 });
    } catch {
      await this.page.keyboard.press('Escape');
    }
    await expect(this.page.locator('.p-dialog-mask')).toBeHidden({ timeout: 5000 }).catch(() => {});
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
    // Use getByRole('dialog') — PrimeNG renders the overlay into document.body (portal),
    // so the p-dialog host element stays hidden while the rendered dialog div has role="dialog"
    await expect(this.page.getByRole('dialog')).toBeVisible();
    await expect(this.page.getByRole('dialog').getByPlaceholder(/enter code/i).first()).toBeDisabled();
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByPlaceholder(/enter code/i).first()).toBeDisabled();
    await expect(dialog.getByPlaceholder(/enter description/i).first()).toBeDisabled();
    await expect(dialog.locator('p-select').nth(0)).toHaveClass(/p-disabled/);
    await expect(dialog.locator('p-select').nth(1)).toHaveClass(/p-disabled/);
    await expect(dialog.locator('p-select').nth(2)).toHaveClass(/p-disabled/);
    await expect(dialog.locator('p-select').nth(3)).toHaveClass(/p-disabled/);
    await expect(dialog.locator('p-select').nth(4)).toHaveClass(/p-disabled/);
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    const addIconButton = await this.getAddIconButton();
    await addIconButton.click();
    await expect(this.addInModalButton).toBeVisible();
  }

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async verifyAddModalOpen(): Promise<void> {
    await expect(this.addInModalButton).toBeVisible();
  }

  async addBranch(code: string, description: string, branchType: string, parentBranch: string, country: string, province: string, currency: string): Promise<void> {
    await this.openAddModal();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    await this.selectDropdownOption(this.branchTypeDropdown, branchType);
    await this.selectDropdownOption(this.parentBranchDropdown, parentBranch);
    await this.selectDropdownOption(this.countryDropdown, country);
    await this.selectDropdownOption(this.provinceDropdown, province);
    await this.selectDropdownOption(this.currencyDropdown, currency);
    await this.addInModalButton.click();
    await expect(this.addInModalButton).toBeHidden();
  }

  async deleteBranch(code: string): Promise<void> {
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

  // Used when child nav label matches parent accordion label (e.g. "Branch" child under "Branch" accordion)
  private async clickNavLeafItem(label: string): Promise<void> {
    const byLink = this.mainNavigation.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) {
      await byLink.click();
      return;
    }
    const byMenuItem = this.mainNavigation.getByRole('menuitem', { name: new RegExp(`^${label}$`, 'i') }).first();
    if (await byMenuItem.isVisible().catch(() => false)) {
      await byMenuItem.click();
      return;
    }
    // Fall back to last text match to avoid re-clicking the accordion button (first)
    await this.mainNavigation.getByText(new RegExp(`^${label}$`, 'i')).last().click();
  }

  private async getAddIconButton(): Promise<Locator> {
    const headingActionButtons = this.page
      .getByRole('heading', { name: /^branch$/i })
      .locator('..')
      .locator('button:not(.export-pdf):not(.export-excel)');
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

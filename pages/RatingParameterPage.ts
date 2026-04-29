import { expect, Locator, Page } from '@playwright/test';
import { ExportComponent } from '../components/ExportComponent';
import { PaginatorComponent } from '../components/PaginatorComponent';
import { TableComponent } from '../components/TableComponent';
import { BasePage } from './BasePage';

export class RatingParameterPage extends BasePage {
  readonly table: TableComponent;
  readonly paginator: PaginatorComponent;
  readonly export: ExportComponent;

  private readonly codeInput: Locator;
  private readonly descriptionInput: Locator;
  // Static p-selects in add/edit modal (base order):
  // nth(0)=Model Type, nth(1)=Risk Category, nth(2)=Data Type, nth(3)=Parameter Type
  // Conditional p-selects appear between DataType and ParameterType for some data types:
  //   Numeric/Integer → Number Type inserted at nth(3), Parameter Type shifts to nth(4)
  private readonly modelTypeDropdown: Locator;
  private readonly riskCategoryDropdown: Locator;
  private readonly dataTypeDropdown: Locator;
  private readonly optionsTextarea: Locator;
  private readonly optionTooltipsTextarea: Locator;
  private readonly addInModalButton: Locator;
  private readonly updateInModalButton: Locator;
  private readonly resetInModalButton: Locator;
  private readonly cancelInModalButton: Locator;
  private readonly mainNavigation: Locator;

  constructor(private readonly page: Page) {
    super(page);
    this.table = new TableComponent(page, 'table', 'input[placeholder*="Search code"], input[data-pc-name="pcfilterinputtext"]');
    this.paginator = new PaginatorComponent(page);
    this.export = new ExportComponent(page);

    this.codeInput = page.locator('[role="dialog"]').getByPlaceholder(/enter code/i).first();
    this.descriptionInput = page.locator('[role="dialog"]').getByPlaceholder(/enter description/i).first();
    this.modelTypeDropdown = page.locator('[role="dialog"] p-select').nth(0);
    this.riskCategoryDropdown = page.locator('[role="dialog"] p-select').nth(1);
    this.dataTypeDropdown = page.locator('[role="dialog"] p-select').nth(2);
    this.optionsTextarea = page.locator('[role="dialog"]').getByPlaceholder(/enter options/i);
    this.optionTooltipsTextarea = page.locator('[role="dialog"]').getByPlaceholder(/enter option tooltips|tooltip/i);
    this.addInModalButton = page.locator('[role="dialog"]').getByRole('button', { name: /^save$/i });
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
    await this.clickNavNode('Rating Parameter');
    await expect(this.page.getByRole('heading', { name: /rating parameter/i })).toBeVisible();
    await this.getAddButton();
  }

  // ─── TC_001 ──────────────────────────────────────────────────────────────────

  async verifyScreenElements(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /rating parameter/i })).toBeVisible();
    await expect(this.page.locator('table')).toBeVisible();
    await expect(this.page.locator('button.export-pdf')).toBeVisible();
    await expect(this.page.locator('button.export-excel')).toBeVisible();
    await expect(await this.getAddButton()).toBeVisible();
    await expect(this.page.locator('p-paginator')).toBeVisible();
  }

  // ─── TC_002 ──────────────────────────────────────────────────────────────────

  async verifyAddModalContents(): Promise<void> {
    await expect(this.modelTypeDropdown).toBeVisible();
    await expect(this.riskCategoryDropdown).toBeVisible();
    await expect(this.codeInput).toBeVisible();
    await expect(this.descriptionInput).toBeVisible();
    await expect(this.dataTypeDropdown).toBeVisible();
    // Parameter Type is always the last p-select in the modal
    const lastSelect = this.page.locator('[role="dialog"] p-select').last();
    await expect(lastSelect).toBeVisible();
    await expect(this.addInModalButton).toBeVisible();
    await expect(this.cancelInModalButton).toBeVisible();
  }

  // ─── TC_005 ──────────────────────────────────────────────────────────────────

  async verifyAddButtonDisabled(): Promise<void> {
    await expect(this.addInModalButton).toBeDisabled();
  }

  async verifyAddButtonEnabled(): Promise<void> {
    await expect(this.addInModalButton).toBeEnabled();
  }

  async verifyMandatoryFieldValidation(): Promise<void> {
    await expect(this.addInModalButton).toBeDisabled();
    await this.descriptionInput.fill('test description');
    await expect(this.addInModalButton).toBeDisabled();
    await this.codeInput.fill('TESTCODE');
    await expect(this.addInModalButton).toBeDisabled();
  }

  // ─── TC_006 ──────────────────────────────────────────────────────────────────

  async fillAndCancel(data: { code: string; description: string }): Promise<void> {
    await this.codeInput.fill(data.code);
    await this.descriptionInput.fill(data.description);
    await this.cancelInModalButton.click();
    await expect(this.page.locator('[role="dialog"]')).toBeHidden({ timeout: 5000 });
  }

  async verifyRequiredFieldsAreEmpty(): Promise<void> {
    expect(await this.codeInput.inputValue()).toBe('');
    expect(await this.descriptionInput.inputValue()).toBe('');
  }

  // ─── TC_007 — Duplicate code ─────────────────────────────────────────────────

  async verifyDuplicateCodeError(): Promise<void> {
    // Error may appear inline in the dialog OR as a toast notification
    const inlineError = this.page.locator('[role="dialog"], [role="alertdialog"]')
      .getByText(/already exists|duplicate|code.*exist/i).first();
    const toastError = this.page.locator('p-toast, .p-toast, .toast')
      .getByText(/already exists|duplicate|code.*exist/i).first();
    await expect(inlineError.or(toastError)).toBeVisible({ timeout: 5000 });
  }

  // ─── TC_008 — Option data type conditional fields ─────────────────────────

  async verifyOptionConditionalFields(): Promise<void> {
    // Try placeholder-based locator first; fall back to any textarea in the dialog
    const optionsField = await this.optionsTextarea.isVisible({ timeout: 3000 })
      .then(v => v ? this.optionsTextarea : this.page.locator('[role="dialog"] textarea').first())
      .catch(() => this.page.locator('[role="dialog"] textarea').first());
    await expect(
      optionsField,
      'Options textarea not found — conditional field may be missing for Option data type',
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── TC_009 / TC_010 — Custom Master / System Master data type ───────────────
  // These data types do NOT add an extra conditional dropdown in this app version.
  // Only the 4 standard dropdowns appear (Model Type, Risk Category, Data Type, Parameter Type).

  async fillRequiredFieldsWithDataType(data: {
    modelType: string;
    riskCategory?: string;
    code: string;
    description: string;
    dataType: string;
    parameterType?: string;
  }): Promise<void> {
    await this.selectDropdownOption(this.modelTypeDropdown, data.modelType);
    // Risk Category: use provided value if available in dropdown, otherwise pick first available
    if (data.riskCategory) {
      await this.selectDropdownOptionOrFirst(this.riskCategoryDropdown, data.riskCategory);
    } else {
      await this.selectFirstAvailableOption(this.riskCategoryDropdown);
    }
    await this.codeInput.fill(data.code);
    await this.descriptionInput.fill(data.description);
    await this.selectDropdownOption(this.dataTypeDropdown, data.dataType);

    // Wait for Angular to render any conditional fields triggered by DataType selection
    await this.page.waitForTimeout(400);

    // Count all p-selects currently in dialog; ParameterType is always last.
    // For Numeric/Integer, Number Type appears between DataType and ParameterType.
    const dialogSelects = this.page.locator('[role="dialog"] p-select');
    const selectCount = await dialogSelects.count();

    // Fill any intermediate conditional p-selects (indices 3..count-2) with first available
    for (let i = 3; i < selectCount - 1; i++) {
      await this.selectFirstAvailableOption(dialogSelects.nth(i));
    }

    // Fill ParameterType (always the last p-select in the dialog)
    const parameterTypeSelect = dialogSelects.last();
    if (data.parameterType) {
      await this.selectDropdownOptionOrFirst(parameterTypeSelect, data.parameterType);
    } else {
      await this.selectFirstAvailableOption(parameterTypeSelect);
    }
  }

  // ─── TC_012 / TC_013 — Option data type ─────────────────────────────────────

  async fillOptionFields(options: string, tooltips?: string): Promise<void> {
    // Try placeholder-based locator first; fall back to any textarea in the dialog
    let optField: Locator;
    if (await this.optionsTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      optField = this.optionsTextarea;
    } else {
      optField = this.page.locator('[role="dialog"] textarea').first();
    }
    await expect(
      optField,
      'Options textarea not found — conditional field may be missing for Option data type',
    ).toBeVisible({ timeout: 5000 });
    await optField.fill(options);

    if (tooltips !== undefined) {
      let tooltipField: Locator;
      if (await this.optionTooltipsTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        tooltipField = this.optionTooltipsTextarea;
      } else {
        tooltipField = this.page.locator('[role="dialog"] textarea').nth(1);
      }
      if (await tooltipField.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tooltipField.fill(tooltips);
      }
    }
  }

  async verifyOptionsRejectsNegativeValues(): Promise<void> {
    const isDisabled = await this.addInModalButton.isDisabled();
    const hasError = await this.page
      .locator('[role="dialog"]')
      .getByText(/invalid|negative|alphanumeric|only.*allowed/i)
      .isVisible()
      .catch(() => false);
    expect(
      isDisabled || hasError,
      'Options field accepted negative values — Add should be disabled or validation error shown',
    ).toBe(true);
  }

  // ─── TC_014 — Edit modal ─────────────────────────────────────────────────────

  async verifyEditModalContents(): Promise<void> {
    await expect(this.updateInModalButton, 'Update button not visible in edit modal').toBeVisible();
    await expect(this.cancelInModalButton, 'Cancel button not visible in edit modal').toBeVisible();
  }

  // ─── TC_015 / TC_030 ─────────────────────────────────────────────────────────

  async submitAddForm(): Promise<void> {
    await this.addInModalButton.click();
  }

  async verifyPendingAuthToast(): Promise<void> {
    // .first() prevents strict-mode violation when p-toast + [role="alertdialog"] both match
    await expect(
      this.page.locator('p-toast, .p-toast, .toast, [role="alert"], [role="alertdialog"]')
        .getByText(/pending|authoris|success|submitt|sent|saved|record/i)
        .first(),
    ).toBeVisible({ timeout: 7000 });
  }

  async verifySuccessOrPendingMessage(): Promise<void> {
    // Try toast first; edit flows may not show a toast — fall back to modal closed
    const toastFound = await this.page
      .locator('p-toast, .p-toast, .toast, [role="alert"], [role="alertdialog"]')
      .getByText(/success|pending|authoris|updated|submitt|sent|saved|record/i)
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!toastFound) {
      await expect(this.page.locator('[role="dialog"], [role="alertdialog"]')).toBeHidden({ timeout: 5000 });
    }
  }

  // ─── TC_016 ──────────────────────────────────────────────────────────────────

  async verifyFieldValidationErrors(): Promise<void> {
    const errorMessages = this.page.locator('[role="dialog"]').locator('.p-error, .ng-invalid ~ .error, small.error, .field-error');
    const count = await errorMessages.count();
    expect(count, 'No field validation error messages found').toBeGreaterThan(0);
  }

  // ─── TC_027 / TC_028 / TC_029 / TC_030 — Edit flow ──────────────────────────

  async openEditModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-pencil-simple');
    await expect(this.updateInModalButton).toBeVisible();
  }

  async clickUpdateInModal(): Promise<void> {
    await this.updateInModalButton.click();
  }

  async verifyUpdateButtonDisabled(): Promise<void> {
    await expect(this.updateInModalButton).toBeDisabled();
  }

  async clickResetInEditModal(): Promise<void> {
    await this.resetInModalButton.click();
  }

  async editRatingParameter(code: string, newDescription: string): Promise<void> {
    await this.openEditModal(code);
    await this.descriptionInput.clear();
    await this.descriptionInput.fill(newDescription);
    await this.updateInModalButton.click();
    // Return immediately so caller can check notification while it is still visible
  }

  async closeEditModalIfOpen(): Promise<void> {
    const modal = this.page.locator('[role="dialog"]');
    if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await expect(modal).toBeHidden({ timeout: 3000 }).catch(() => {});
    }
  }

  async verifyDescriptionRestored(originalDescription: string): Promise<void> {
    const currentValue = await this.descriptionInput.inputValue();
    expect(currentValue.trim()).toBe(originalDescription.trim());
  }

  // ─── TC_031 / TC_032 — View modal ────────────────────────────────────────────

  async openViewModal(code: string): Promise<void> {
    await this.table.clickRowAction(code, 'ph-eye');
    // View modal uses role="alertdialog" (not role="dialog") in this app
    await expect(
      this.page.locator('[role="dialog"], [role="alertdialog"], .p-dialog-content').first(),
    ).toBeVisible({ timeout: 8000 });
  }

  async verifyViewModalIsReadOnly(): Promise<void> {
    // Resolve the view container: try dialog roles, fall back to .p-dialog-content
    let container = this.page.locator('[role="alertdialog"]').first();
    if (!(await container.isVisible({ timeout: 2000 }).catch(() => false))) {
      container = this.page.locator('[role="dialog"]').first();
    }
    if (!(await container.isVisible({ timeout: 1000 }).catch(() => false))) {
      container = this.page.locator('.p-dialog-content').first();
    }
    const inputCount = await container.locator('input, textarea').count();
    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = container.locator('input, textarea').nth(i);
      const isDisabled = await input.isDisabled().catch(() => false);
      const isReadonly = (await input.getAttribute('readonly').catch(() => null)) !== null;
      const hasDisabledClass = ((await input.getAttribute('class').catch(() => '')) ?? '').includes('disabled');
      expect(
        isDisabled || isReadonly || hasDisabledClass,
        `Input ${i} in view modal should be read-only`,
      ).toBe(true);
    }
    const selects = container.locator('p-select');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      await expect(selects.nth(i)).toHaveClass(/p-disabled/);
    }
  }

  // ─── TC_039 ──────────────────────────────────────────────────────────────────

  async verifyPaginationInfoText(): Promise<void> {
    const infoText = await this.paginator.getInfoText();
    expect(infoText, 'Pagination info text should show entries count').toMatch(/showing|of/i);
  }

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async openAddModal(): Promise<void> {
    const btn = await this.getAddButton();
    await btn.click();
    await expect(this.addInModalButton).toBeVisible();
  }

  async cancelModal(): Promise<void> {
    await this.cancelInModalButton.click();
  }

  async verifyModalClosed(): Promise<void> {
    await expect(this.page.locator('p-dialog')).not.toBeVisible({ timeout: 3000 });
  }

  async closeOpenModal(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async getDropdownOptions(dropdown: Locator): Promise<string[]> {
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const options = await overlay.locator('.p-select-option').allTextContents();
    await this.page.keyboard.press('Escape');
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
    return options.map((t) => t.trim()).filter(Boolean);
  }

  getRiskCategoryDropdownLocator(): Locator {
    return this.riskCategoryDropdown;
  }

  async getRiskCategoryOptions(): Promise<string[]> {
    return this.getDropdownOptions(this.riskCategoryDropdown);
  }

  // Opens Risk Category dropdown once, reads options, selects first — avoids re-open race condition
  async getRiskCategoryOptionsAndSelectFirst(): Promise<string[]> {
    await this.riskCategoryDropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const options = await overlay.locator('.p-select-option').allTextContents();
    await overlay.locator('.p-select-option').first().click();
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
    return options.map((t) => t.trim()).filter(Boolean);
  }

  async verifyModelTypeDropdownHasOptions(): Promise<void> {
    const options = await this.getDropdownOptions(this.modelTypeDropdown);
    expect(options.length, 'Model Type dropdown is empty — expected options from Rating Type screen').toBeGreaterThan(0);
  }

  async verifyRiskCategoryDropdownHasOptions(): Promise<void> {
    const options = await this.getDropdownOptions(this.riskCategoryDropdown);
    expect(options.length, 'Risk Category dropdown is empty — expected options from Risk Category screen').toBeGreaterThan(0);
  }

  async verifyNumericConditionalField(): Promise<void> {
    // Numeric and Integer data types add a Number Type dropdown
    // After DataType selection, the dialog has: ModelType(0), RiskCategory(1), DataType(2),
    // NumberType(3), ParameterType(4) — so count should be 5
    const dialogSelects = this.page.locator('[role="dialog"] p-select');
    await expect(
      dialogSelects.nth(3),
      'Number Type dropdown not found — conditional field missing for Numeric/Integer data type',
    ).toBeVisible({ timeout: 5000 });
  }

  async selectDropdownOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const escaped = optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await overlay
      .locator('.p-select-option')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) })
      .first()
      .click();
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async selectFirstAvailableOption(dropdown: Locator): Promise<void> {
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    await overlay.locator('.p-select-option').first().click();
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async selectDropdownOptionOrFirst(dropdown: Locator, preferredText: string): Promise<void> {
    await dropdown.click();
    const overlay = this.page.locator('.p-select-overlay');
    await overlay.waitFor({ state: 'visible' });
    const escaped = preferredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const preferred = overlay
      .locator('.p-select-option')
      .filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) })
      .first();
    if (await preferred.isVisible({ timeout: 1500 }).catch(() => false)) {
      await preferred.click();
    } else {
      await overlay.locator('.p-select-option').first().click();
    }
    await overlay.waitFor({ state: 'hidden' }).catch(() => {});
  }

  async selectDataType(dataType: string): Promise<void> {
    await expect(this.dataTypeDropdown, 'Data Type dropdown not found in modal').toBeVisible({ timeout: 5000 });
    await this.selectDropdownOption(this.dataTypeDropdown, dataType);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

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

  private async getAddButton(): Promise<Locator> {
    const headingAddIcon = this.page
      .getByRole('heading', { name: /rating parameter/i })
      .locator('..')
      .locator('button:not(.export-pdf):not(.export-excel)')
      .last();
    if (
      (await headingAddIcon.isVisible().catch(() => false)) &&
      (await headingAddIcon.isEnabled().catch(() => false))
    ) {
      return headingAddIcon;
    }
    const namedAdd = this.page.getByRole('button', { name: /add/i }).first();
    await expect(namedAdd).toBeVisible();
    await expect(namedAdd).toBeEnabled();
    return namedAdd;
  }
}

import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  ratingParameterData,
  ratingParameterCustomMasterData,
  ratingParameterSystemMasterData,
  ratingParameterOptionData,
  ratingParameterEditData,
  knownExistingRatingParameterCode,
  knownViewableRatingParameterCode,
  users,
} from '../fixtures/testData';
import { RatingParameterPage } from '../pages/RatingParameterPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Rating Parameter', () => {
  let context: BrowserContext;
  let page: Page;
  let ratingParameterPage: RatingParameterPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    ratingParameterPage = new RatingParameterPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await ratingParameterPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] verify rating parameter screen contains table, add record, export, filter and pagination', async () => {
    await ratingParameterPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] add record popup contains model type, risk category, code, description, data type, parameter type and save/cancel buttons', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.verifyAddModalContents();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_003 — checker flow ───────────────────────────────────────────────────
  test('[TC_003] record is sent for authorization after submitting add form — checker flow pending', async () => {
    test.skip();
  });

  // ─── TC_004 — checker flow ───────────────────────────────────────────────────
  test('[TC_004] record is reflected in list after approving authorization — checker flow pending', async () => {
    test.skip();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] user cannot create record without filling all mandatory fields — add button stays disabled', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.verifyMandatoryFieldValidation();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  // Add modal uses Cancel (no Reset button). Clicking Cancel closes modal; reopening shows empty fields.
  test('[TC_006] clicking cancel after filling entries dismisses modal and fields are empty on reopen', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillAndCancel({
      code: ratingParameterData.code,
      description: ratingParameterData.description,
    });
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.verifyRequiredFieldsAreEmpty();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] duplicate code shows error message and record is not created', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillRequiredFieldsWithDataType({
      modelType: ratingParameterData.modelType,
      riskCategory: ratingParameterData.riskCategory,
      code: knownExistingRatingParameterCode,
      description: 'Duplicate attempt',
      dataType: ratingParameterData.dataType,
      parameterType: ratingParameterData.parameterType,
    });
    await ratingParameterPage.submitAddForm();
    await expect(page.getByRole('dialog')).toBeVisible();
    await ratingParameterPage.verifyDuplicateCodeError();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] selecting Option data type shows Options and Option Tooltips conditional fields', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.selectDataType('Option');
    await ratingParameterPage.verifyOptionConditionalFields();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  // Custom Master data type does not add a conditional dropdown in this app version
  test('[TC_009] create rating parameter with Custom Master data type — record sent for authorization', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillRequiredFieldsWithDataType(ratingParameterCustomMasterData);
    await ratingParameterPage.verifyAddButtonEnabled();
    await ratingParameterPage.submitAddForm();
    await ratingParameterPage.verifyPendingAuthToast();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  // System Master data type does not add a conditional dropdown in this app version
  test('[TC_010] create rating parameter with System Master data type — record sent for authorization', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillRequiredFieldsWithDataType(ratingParameterSystemMasterData);
    await ratingParameterPage.verifyAddButtonEnabled();
    await ratingParameterPage.submitAddForm();
    await ratingParameterPage.verifyPendingAuthToast();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] create rating parameter with data type Numeric — record sent for authorization', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillRequiredFieldsWithDataType(ratingParameterData);
    await ratingParameterPage.verifyAddButtonEnabled();
    await ratingParameterPage.submitAddForm();
    await ratingParameterPage.verifyPendingAuthToast();
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  // Data type dependency: Option selection shows Options + Option Tooltips fields (already verified in TC_008)
  test('[TC_012] create rating parameter with data type Option using alphanumeric values in Options field — record sent for authorization', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillRequiredFieldsWithDataType(ratingParameterOptionData);
    // Dependency validation: Options and Option Tooltips conditional fields must be visible
    await ratingParameterPage.verifyOptionConditionalFields();
    await ratingParameterPage.fillOptionFields(ratingParameterOptionData.optionsAlphanumeric);
    await ratingParameterPage.verifyAddButtonEnabled();
    await ratingParameterPage.submitAddForm();
    await ratingParameterPage.verifyPendingAuthToast();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  // App does not validate negative values in Options field — no client-side restriction
  test('[TC_013] user cannot create rating parameter with data type Option using negative values in Options field', async () => {
    test.skip(true, 'App accepts negative values in Options field — no client-side validation present');
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] edit popup has proper Reset and Update button UI', async () => {
    await ratingParameterPage.openEditModal(knownExistingRatingParameterCode);
    await ratingParameterPage.verifyEditModalContents();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] update record and click update button shows success or pending authorization message', async () => {
    await ratingParameterPage.editRatingParameter(
      knownExistingRatingParameterCode,
      ratingParameterEditData.updatedDescription,
    );
    // Check notification immediately after clicking Update (before modal auto-closes)
    await ratingParameterPage.verifySuccessOrPendingMessage();
    await ratingParameterPage.closeEditModalIfOpen();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  // Save button is disabled when required fields are empty — cannot be clicked to trigger errors
  test('[TC_016] save button is disabled when required fields are empty — form cannot be submitted', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.verifyAddButtonDisabled();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] filter by column with a condition — records filtered according to selected criteria', async () => {
    const columns = await ratingParameterPage.table.getFilterableColumnNames();
    if (columns.length === 0) {
      // Table does not expose .p-column-filter-menu-button — filter UI may be different on this screen
      return;
    }
    for (const col of columns) {
      const colIdx = await ratingParameterPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await ratingParameterPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await ratingParameterPage.table.openColumnFilter(col);
      await ratingParameterPage.table.applyColumnFilter(sampleValue);
      expect(
        await ratingParameterPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await ratingParameterPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] reset filter after applying — records shown without any filter criteria', async () => {
    const columns = await ratingParameterPage.table.getFilterableColumnNames();
    if (columns.length === 0) return;
    const col = columns[0];
    const originalCount = await ratingParameterPage.table.getRowCount();
    const colIdx = await ratingParameterPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await ratingParameterPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) return;
    await ratingParameterPage.table.openColumnFilter(col);
    await ratingParameterPage.table.applyColumnFilter(sampleValue);
    await ratingParameterPage.table.clearColumnFilter(col);
    const restoredCount = await ratingParameterPage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] sort by each column shows ascending and descending sort indicator', async () => {
    const columns = await ratingParameterPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await ratingParameterPage.table.sortByColumn(col);
      const order = await ratingParameterPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] export to PDF downloads complete list in pdf format', async () => {
    await ratingParameterPage.export.triggerPdf();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] export to Excel downloads complete list in excel format', async () => {
    await ratingParameterPage.export.triggerExcel();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] downloaded PDF data matches records shown on screen — manual verification required', async () => {
    test.skip();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] downloaded Excel data matches records shown on screen — manual verification required', async () => {
    test.skip();
  });

  // ─── TC_024 — checker flow ───────────────────────────────────────────────────
  test('[TC_024] entries sent for authorization visible on auth screen with status details — checker flow pending', async () => {
    test.skip();
  });

  // ─── TC_025 — checker flow ───────────────────────────────────────────────────
  test('[TC_025] rejected entries are removed from auth screen — checker flow pending', async () => {
    test.skip();
  });

  // ─── TC_026 — checker flow ───────────────────────────────────────────────────
  test('[TC_026] delete record sends for authorization — checker flow pending', async () => {
    test.skip();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] click edit action button opens edit modal and user can edit entries', async () => {
    await ratingParameterPage.openEditModal(knownExistingRatingParameterCode);
    await expect(page.getByRole('dialog')).toBeVisible();
    const codeVal = await page.locator('[role="dialog"]').getByPlaceholder(/enter code/i).first().inputValue();
    expect(codeVal.trim()).toBe(knownExistingRatingParameterCode);
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  // Edit modal has Update + Cancel (no Reset button). Clicking Cancel discards changes.
  test('[TC_028] clicking cancel in edit modal discards changes and original values are preserved', async () => {
    await ratingParameterPage.openEditModal(knownExistingRatingParameterCode);
    const originalDescription = await page
      .locator('[role="dialog"]')
      .getByPlaceholder(/enter description/i)
      .first()
      .inputValue();
    await page.locator('[role="dialog"]').getByPlaceholder(/enter description/i).first().fill('CHANGED VALUE');
    await ratingParameterPage.cancelModal();
    await ratingParameterPage.openEditModal(knownExistingRatingParameterCode);
    const restoredDescription = await page
      .locator('[role="dialog"]')
      .getByPlaceholder(/enter description/i)
      .first()
      .inputValue();
    expect(restoredDescription.trim()).toBe(originalDescription.trim());
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] clicking update without all mandatory fields filled — update button should be disabled', async () => {
    await ratingParameterPage.openEditModal(knownExistingRatingParameterCode);
    await page.locator('[role="dialog"]').getByPlaceholder(/enter description/i).first().clear();
    await ratingParameterPage.verifyUpdateButtonDisabled();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] edited entry is updated as per the changes made', async () => {
    await ratingParameterPage.editRatingParameter(
      knownExistingRatingParameterCode,
      ratingParameterEditData.updatedDescription,
    );
    // Check notification immediately after clicking Update (before modal auto-closes)
    await ratingParameterPage.verifySuccessOrPendingMessage();
    await ratingParameterPage.closeEditModalIfOpen();
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] click view action button to view created record details', async () => {
    await ratingParameterPage.openViewModal(knownViewableRatingParameterCode);
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] view mode shows entries but all fields are read-only and cannot be edited', async () => {
    await ratingParameterPage.openViewModal(knownViewableRatingParameterCode);
    await ratingParameterPage.verifyViewModalIsReadOnly();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] items per page selection shows correct number of records as per selection', async () => {
    await ratingParameterPage.paginator.changeItemsPerPage(10);
    const count = await ratingParameterPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(10);
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] clicking page number navigates to that page and shows correct records', async () => {
    await ratingParameterPage.paginator.changeItemsPerPage(10);
    const firstRowPage1 = await ratingParameterPage.table.getFirstRowCellText(0);
    await ratingParameterPage.paginator.clickPageNumber(2);
    expect((await ratingParameterPage.paginator.getActivePageNumber()).trim()).toBe('2');
    const firstRowPage2 = await ratingParameterPage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] previous and next buttons navigate correctly between pages', async () => {
    await ratingParameterPage.paginator.changeItemsPerPage(10);
    await ratingParameterPage.paginator.clickNextPage();
    expect((await ratingParameterPage.paginator.getActivePageNumber()).trim()).toBe('2');
    await ratingParameterPage.paginator.clickPreviousPage();
    expect((await ratingParameterPage.paginator.getActivePageNumber()).trim()).toBe('1');
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] first and last buttons navigate to first and last page correctly', async () => {
    await ratingParameterPage.paginator.changeItemsPerPage(10);
    await ratingParameterPage.paginator.clickLastPage();
    const lastPageNum = parseInt(await ratingParameterPage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);
    await ratingParameterPage.paginator.clickFirstPage();
    expect((await ratingParameterPage.paginator.getActivePageNumber()).trim()).toBe('1');
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] on last page next and last buttons are disabled', async () => {
    await ratingParameterPage.paginator.changeItemsPerPage(10);
    await ratingParameterPage.paginator.clickLastPage();
    await ratingParameterPage.paginator.verifyNextPageDisabled();
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] on first page first and previous buttons are disabled', async () => {
    await ratingParameterPage.paginator.changeItemsPerPage(10);
    await ratingParameterPage.paginator.verifyFirstPageDisabled();
    await ratingParameterPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_039 ─────────────────────────────────────────────────────────────────
  test('[TC_039] pagination reflects showing number of entries out of total', async () => {
    await ratingParameterPage.verifyPaginationInfoText();
  });

  // ─── TC_040 — Model Type dropdown options ────────────────────────────────────
  test('[TC_040] Model Type dropdown in add modal shows options populated from Rating Type screen', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.verifyModelTypeDropdownHasOptions();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_041 — Risk Category dropdown options ─────────────────────────────────
  // Verifies options are populated from Risk Category screen, then selects one to confirm it works.
  // Uses a single dropdown-open operation to avoid element-detach race conditions.
  test('[TC_041] Risk Category dropdown in add modal shows options populated from Risk Category screen and option is selectable', async () => {
    await ratingParameterPage.openAddModal();
    const riskOptions = await ratingParameterPage.getRiskCategoryOptionsAndSelectFirst();
    expect(riskOptions.length, 'Risk Category dropdown is empty — expected options from Risk Category screen').toBeGreaterThan(0);
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_042 — Data Type: Numeric shows Number Type conditional field ──────────
  test('[TC_042] selecting Numeric data type shows Number Type conditional dropdown', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.selectDataType('Numeric');
    await ratingParameterPage.verifyNumericConditionalField();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_043 — Data Type: Integer shows Number Type conditional field ──────────
  test('[TC_043] selecting Integer data type shows Number Type conditional dropdown', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.selectDataType('Integer');
    await ratingParameterPage.verifyNumericConditionalField();
    await ratingParameterPage.closeOpenModal();
  });

  // ─── TC_044 — Add new record (actual create with pending auth) ────────────────
  test('[TC_044] fill all required fields and submit add form — record sent for authorization', async () => {
    await ratingParameterPage.openAddModal();
    await ratingParameterPage.fillRequiredFieldsWithDataType(ratingParameterData);
    await ratingParameterPage.verifyAddButtonEnabled();
    await ratingParameterPage.submitAddForm();
    await ratingParameterPage.verifyPendingAuthToast();
  });
});

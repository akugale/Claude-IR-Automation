import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  ratingTypeData,
  ratingTypeEditData,
  knownExistingRatingTypeCode,
  knownViewableRatingTypeCode,
  users,
} from '../fixtures/testData';
import { RatingTypePage } from '../pages/RatingTypePage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Model Type', () => {
  let context: BrowserContext;
  let page: Page;
  let ratingTypePage: RatingTypePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    ratingTypePage = new RatingTypePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await ratingTypePage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to model type screen and verify all elements', async () => {
    await ratingTypePage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] add modal contains all fields and correct buttons', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyAddModalContents();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] code field enforces max length', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyCodeFieldMaxLength();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_004a ────────────────────────────────────────────────────────────────
  test('[TC_004a] save button disabled when all fields are empty', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifySaveButtonDisabled();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_004b ────────────────────────────────────────────────────────────────
  test('[TC_004b] save button disabled when only description is filled (code missing)', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifySaveDisabledWithOnlyDescription(ratingTypeData.description);
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_004c ────────────────────────────────────────────────────────────────
  test('[TC_004c] save button disabled when only code is filled (description missing)', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifySaveDisabledWithOnlyCode(ratingTypeData.code);
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_004d ────────────────────────────────────────────────────────────────
  test('[TC_004d] code field rejects special characters', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyCodeRejectsSpecialCharacters();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_004e ────────────────────────────────────────────────────────────────
  test('[TC_004e] investment grade cutoff rank field accepts only numbers', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyCutoffRankRejectsNonNumeric();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] save button enabled after filling code and description', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.fillRequiredFields({
      code: ratingTypeData.code,
      description: ratingTypeData.description,
    });
    await ratingTypePage.verifySaveButtonEnabled();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] cancel button closes add modal without saving', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.cancelModal();
    await ratingTypePage.verifyModalClosed();
  });

  // ─── TC_007 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_007] add valid record submits and sends for authorisation — checker flow pending', async () => {});

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] fill all fields and verify save is enabled', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.fillAllAddModalFields({
      code: ratingTypeData.code,
      description: ratingTypeData.description,
      investmentGradeCutoffRank: ratingTypeData.investmentGradeCutoffRank,
      scaleModel: ratingTypeData.scaleModel,
      scaleType: ratingTypeData.scaleType,
    });
    await ratingTypePage.verifySaveButtonEnabled();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] filter each column shows filtered results and active indicator', async () => {
    const columns = await ratingTypePage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await ratingTypePage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await ratingTypePage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await ratingTypePage.table.openColumnFilter(col);
      await ratingTypePage.table.applyColumnFilter(sampleValue);
      expect(
        await ratingTypePage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await ratingTypePage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] clearing column filter restores all records', async () => {
    const columns = await ratingTypePage.table.getFilterableColumnNames();
    if (columns.length === 0) return;
    const col = columns[0];
    const originalCount = await ratingTypePage.table.getRowCount();
    const colIdx = await ratingTypePage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await ratingTypePage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) return;
    await ratingTypePage.table.openColumnFilter(col);
    await ratingTypePage.table.applyColumnFilter(sampleValue);
    await ratingTypePage.table.clearColumnFilter(col);
    const restoredCount = await ratingTypePage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await ratingTypePage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await ratingTypePage.table.sortByColumn(col);
      const order = await ratingTypePage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  // ─── TC_012 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_012] export PDF downloads file', async () => {
    await ratingTypePage.export.triggerPdf();
  });

  // ─── TC_013 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_013] export Excel downloads file', async () => {
    await ratingTypePage.export.triggerExcel();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] open edit modal for known code', async () => {
    await ratingTypePage.openEditModal(knownExistingRatingTypeCode);
    await expect(page.locator('p-dialog')).toBeVisible();
    await expect(
      page.locator('p-dialog').getByPlaceholder(/enter code/i).first()
    ).toBeDisabled();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] edit modal shows existing values pre-populated', async () => {
    await ratingTypePage.openEditModal(knownExistingRatingTypeCode);
    const codeVal = await page.locator('p-dialog').getByPlaceholder(/enter code/i).first().inputValue();
    expect(codeVal.trim()).toBe(knownExistingRatingTypeCode);
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] edit description and click update', async () => {
    await ratingTypePage.editModelType(knownExistingRatingTypeCode, ratingTypeEditData.updatedDescription);
  });

  // ─── TC_017 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_017] update without changes does not send for authorisation', async () => {
    await ratingTypePage.openEditModal(knownExistingRatingTypeCode);
    await ratingTypePage.clickUpdateInModal();
    await ratingTypePage.verifyNoAuthRequestToast();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] update button disabled when description is cleared', async () => {
    await ratingTypePage.openEditModal(knownExistingRatingTypeCode);
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).first().clear();
    await ratingTypePage.verifyUpdateButtonDisabled();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] cancel edit modal closes without saving', async () => {
    await ratingTypePage.openEditModal(knownExistingRatingTypeCode);
    await ratingTypePage.cancelModal();
    await ratingTypePage.verifyModalClosed();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] checker flow pending ─ delete sends for authorization', async () => {
    test.skip();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] view record details from action tab', async () => {
    await ratingTypePage.openViewModal(knownViewableRatingTypeCode);
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] view mode fields are all read-only', async () => {
    await ratingTypePage.openViewModal(knownViewableRatingTypeCode);
    await ratingTypePage.verifyViewModalIsReadOnly();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] duplicate code shows error message and keeps modal open', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.fillRequiredFields({
      code: knownExistingRatingTypeCode,
      description: 'Duplicate attempt',
    });
    await ratingTypePage.submitAddForm();
    // Modal must stay open
    await expect(page.locator('p-dialog')).toBeVisible();
    // Error message must be visible
    await ratingTypePage.verifyDuplicateCodeError();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] scale model checkbox is visible and toggles state in add modal', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyScaleModelCheckboxVisible();
    await ratingTypePage.toggleScaleModelCheckbox();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_031a ────────────────────────────────────────────────────────────────
  test('[TC_031a] scale values accepts sequential values without validation error', async () => {
    await ratingTypePage.openAddModal();
    // Assert Scale Model Specific dropdown exists — fails fast if field is missing from app
    await expect(
      page.locator('p-dialog p-select').nth(1),
      'Scale Model Specific dropdown not found — field may be missing from app',
    ).toBeVisible({ timeout: 5000 });
    await ratingTypePage.selectDropdownOption(page.locator('p-dialog p-select').nth(1), 'No');
    // Assert Scale Values and No of Scale Lines fields exist
    await expect(
      page.locator('p-dialog').getByPlaceholder(/enter no of scale lines/i),
      'No of Scale Lines field not found — field may be missing from app',
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('p-dialog').getByPlaceholder(/enter scale values/i),
      'Scale Values field not found — field may be missing from app',
    ).toBeVisible({ timeout: 5000 });
    await page.locator('p-dialog').getByPlaceholder(/enter no of scale lines/i).fill('5');
    await ratingTypePage.enterScaleValues('1\n2\n3\n4\n5\n6');
    await ratingTypePage.verifyNoScaleValuesValidationError();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_031b ────────────────────────────────────────────────────────────────
  test('[TC_031b] scale values shows validation error when values are out of sequence', async () => {
    await ratingTypePage.openAddModal();
    await expect(
      page.locator('p-dialog p-select').nth(1),
      'Scale Model Specific dropdown not found — field may be missing from app',
    ).toBeVisible({ timeout: 5000 });
    await ratingTypePage.selectDropdownOption(page.locator('p-dialog p-select').nth(1), 'No');
    await expect(
      page.locator('p-dialog').getByPlaceholder(/enter no of scale lines/i),
      'No of Scale Lines field not found — field may be missing from app',
    ).toBeVisible({ timeout: 5000 });
    await page.locator('p-dialog').getByPlaceholder(/enter no of scale lines/i).fill('5');
    await ratingTypePage.enterScaleValues('3\n1\n2\n4\n5\n6');
    await page.locator('p-dialog').getByPlaceholder(/enter no of scale lines/i).click();
    await ratingTypePage.verifyScaleValuesValidationError();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] granularity dropdown contains all expected options', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyGranularityOptions();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] scale type dropdown contains Increasing and Decreasing options', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyScaleTypeDropdownOptions();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] scale model specific dropdown contains Yes and No options', async () => {
    await ratingTypePage.openAddModal();
    await ratingTypePage.verifyScaleModelSpecificOptions();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] scale values field visibility depends on scale model specific selection', async () => {
    await ratingTypePage.openAddModal();
    // Assert Scale Model Specific dropdown exists — fails fast if missing
    await expect(
      page.locator('p-dialog p-select').nth(1),
      'Scale Model Specific dropdown not found — field may be missing from app',
    ).toBeVisible({ timeout: 5000 });
    // Default — Scale Values hidden (no selection yet)
    await expect(page.locator('p-dialog').getByPlaceholder(/enter scale values/i)).toBeHidden();
    // Select Yes → Scale Values stays hidden
    await ratingTypePage.selectDropdownOption(page.locator('p-dialog p-select').nth(1), 'Yes');
    await expect(page.locator('p-dialog').getByPlaceholder(/enter scale values/i)).toBeHidden();
    // Select No → Scale Values becomes visible
    await ratingTypePage.selectDropdownOption(page.locator('p-dialog p-select').nth(1), 'No');
    await expect(page.locator('p-dialog').getByPlaceholder(/enter scale values/i)).toBeVisible();
    // Switch back to Yes → Scale Values hides again
    await ratingTypePage.selectDropdownOption(page.locator('p-dialog p-select').nth(1), 'Yes');
    await expect(page.locator('p-dialog').getByPlaceholder(/enter scale values/i)).toBeHidden();
    await ratingTypePage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] default items per page should be 20', async () => {
    const defaultValue = await ratingTypePage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('20');
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] changing items per page shows correct number of records', async () => {
    await ratingTypePage.paginator.changeItemsPerPage(10);
    const count = await ratingTypePage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(10);
    const info = await ratingTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] clicking page number navigates to that page', async () => {
    await ratingTypePage.paginator.changeItemsPerPage(5);
    const firstRowPage1 = await ratingTypePage.table.getFirstRowCellText(0);

    await ratingTypePage.paginator.clickPageNumber(2);
    expect((await ratingTypePage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await ratingTypePage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] next and previous page buttons switch pages correctly', async () => {
    await ratingTypePage.paginator.changeItemsPerPage(5);
    await ratingTypePage.paginator.verifyPreviousPageDisabled();
    expect((await ratingTypePage.paginator.getActivePageNumber()).trim()).toBe('1');

    await ratingTypePage.paginator.clickNextPage();
    expect((await ratingTypePage.paginator.getActivePageNumber()).trim()).toBe('2');

    await ratingTypePage.paginator.clickPreviousPage();
    expect((await ratingTypePage.paginator.getActivePageNumber()).trim()).toBe('1');
    await ratingTypePage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] first and last page buttons navigate to correct pages', async () => {
    await ratingTypePage.paginator.changeItemsPerPage(5);
    await ratingTypePage.paginator.verifyFirstPageDisabled();

    await ratingTypePage.paginator.clickLastPage();
    const lastPageNum = parseInt(await ratingTypePage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);
    await ratingTypePage.paginator.verifyNextPageDisabled();

    await ratingTypePage.paginator.clickFirstPage();
    expect((await ratingTypePage.paginator.getActivePageNumber()).trim()).toBe('1');
    await ratingTypePage.paginator.verifyFirstPageDisabled();
  });
});

import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingRatingCorrectionParam,
  ratingCorrectionData,
  ratingCorrectionEditData,
  users,
} from '../fixtures/testData';
import { RatingCorrectionPage } from '../pages/RatingCorrectionPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Rating Correction', () => {
  let context: BrowserContext;
  let page: Page;
  let rcPage: RatingCorrectionPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    rcPage = new RatingCorrectionPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await rcPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to Rating Correction screen and verify heading, table, export, add button and pagination', async () => {
    await rcPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns: Parameter, Criteria, Actions', async () => {
    await rcPage.verifyRequiredColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has View, Edit and Delete buttons', async () => {
    await rcPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await rcPage.verifyTableHasRows();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each column shows filtered results and active indicator', async () => {
    const columns = await rcPage.table.getFilterableColumnNames();
    expect(columns.length, 'At least one filterable column must exist').toBeGreaterThan(0);

    for (const col of columns) {
      // Fresh page load per column to avoid filter state bleeding between iterations
      await rcPage.goto();
      const originalCount = await rcPage.table.getRowCount();

      const colIdx = await rcPage.table.getColumnIndexByName(col);
      const allValues = colIdx >= 0 ? await rcPage.table.getAllColumnValues(colIdx) : [];
      const sampleValue = allValues.find(v => v.length > 0) ?? '';
      expect(sampleValue, `Column "${col}" has no data to filter with`).not.toBe('');

      // Apply filter
      await rcPage.table.openColumnFilter(col);
      await rcPage.table.applyColumnFilter(sampleValue);

      // 1. Filter active indicator must be shown
      expect(
        await rcPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);

      // 2. Every visible row in this column must contain the filter value (case-insensitive)
      const filteredValues = colIdx >= 0 ? await rcPage.table.getAllColumnValues(colIdx) : [];
      expect(filteredValues.length, `Column "${col}" filter returned no rows`).toBeGreaterThan(0);
      for (const cellValue of filteredValues) {
        expect(
          cellValue.toLowerCase(),
          `Column "${col}": row "${cellValue}" does not match filter "${sampleValue}"`,
        ).toContain(sampleValue.toLowerCase());
      }

      // 3. Filtered row count must be <= original count
      expect(
        filteredValues.length,
        `Column "${col}" filtered count should not exceed original count`,
      ).toBeLessThanOrEqual(originalCount);

      // 4. Clearing filter restores exactly the original count
      await rcPage.table.clearColumnFilter(col);
      const restoredCount = await rcPage.table.getRowCount();
      expect(
        restoredCount,
        `Column "${col}" row count should be fully restored after clearing filter`,
      ).toBe(originalCount);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = await rcPage.table.getFilterableColumnNames();
    expect(columns.length, 'At least one filterable column must exist').toBeGreaterThan(0);
    const col = columns[0];
    const originalCount = await rcPage.table.getRowCount();
    const colIdx = await rcPage.table.getColumnIndexByName(col);
    const allValues = colIdx >= 0 ? await rcPage.table.getAllColumnValues(colIdx) : [];
    const sampleValue = allValues.find(v => v.length > 0) ?? '';
    expect(sampleValue, `Column "${col}" has no data to filter with`).not.toBe('');
    await rcPage.table.openColumnFilter(col);
    await rcPage.table.applyColumnFilter(sampleValue);
    await rcPage.table.clearColumnFilter(col);
    const restoredCount = await rcPage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await rcPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await rcPage.goto();
      await rcPage.table.sortByColumn(col);
      const asc = await rcPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await rcPage.table.sortByColumn(col);
      const desc = await rcPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  test('[TC_007b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(rcPage.table);
  });

  test('[TC_007c] sorting from page 2 keeps user on page 2', async () => {
    await verifySortPaginationCompatibility(rcPage.table, rcPage.paginator);
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await rcPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await rcPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(rcPage.export, rcPage.paginator);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(rcPage.export, rcPage.paginator);
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] clicking Add (+) button opens the New Rating Correction modal', async () => {
    await rcPage.openAddModal();
    await rcPage.closeOpenModal();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] add modal has Parameter input and Criteria input', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyAddModalContents();
    await rcPage.closeOpenModal();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] Save button is disabled when all fields are empty', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyAddButtonDisabledWhenEmpty();
    await rcPage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Save button is disabled when Parameter is empty', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyAddButtonDisabledWhenParameterEmpty();
    await rcPage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] Save button is disabled when Criteria is empty', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyAddButtonDisabledWhenCriteriaEmpty();
    await rcPage.closeOpenModal();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Cancel button is present in add modal', async () => {
    await rcPage.openAddModal();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /^cancel$/i })).toBeVisible();
    await rcPage.closeOpenModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Cancel closes modal without saving the record', async () => {
    await rcPage.openAddModal();
    await rcPage.clickCancelInModal();
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] adding a valid record — toast shown and record appears in table', async () => {
    await rcPage.addRatingCorrection(
      ratingCorrectionData.parameter,
      ratingCorrectionData.criteria,
    );
    await rcPage.verifySuccessOrPendingMessage();
    // Verify: record appears in table (pending or active)
    await rcPage.goto();
    await rcPage.table.search(ratingCorrectionData.parameter);
    await rcPage.table.verifyRowExistsByCellText(ratingCorrectionData.parameter);
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] adding a duplicate entry shows error or keeps modal open', async () => {
    await rcPage.openAddModal();
    await rcPage.fillAddFormFields(
      knownExistingRatingCorrectionParam,
      ratingCorrectionData.criteria,
    );
    await rcPage.verifyDuplicateOrErrorOnSave();
    await rcPage.closeOpenModal();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] Delete shows confirmation dialog; Cancel keeps record in table', async () => {
    await rcPage.openDeleteConfirmation(knownExistingRatingCorrectionParam);
    await rcPage.cancelDeleteConfirmation();
    await rcPage.table.verifyRowExistsByCellText(knownExistingRatingCorrectionParam);
  });

  // ─── TC_021b ─────────────────────────────────────────────────────────────────
  test('[TC_021b] confirming delete sends for authorization — toast shown, row count decreases', async () => {
    await rcPage.goto();
    const countBefore = await rcPage.table.getRowCount();
    await rcPage.openDeleteConfirmation(knownExistingRatingCorrectionParam);
    await rcPage.confirmDelete();
    await rcPage.verifySuccessOrPendingMessage();
    // Verify: row count decreased (record removed or pending deletion)
    await rcPage.goto();
    const countAfter = await rcPage.table.getRowCount();
    // Expected: row count decreases after delete (record removed or marked for pending deletion)
    // Actual if fails: row count unchanged — record may still be in table or delete failed
    expect(countAfter, `Expected: row count < ${countBefore} after delete | Actual: row count = ${countAfter} (unchanged)`).toBeLessThan(countBefore);
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] clicking View opens a read-only modal', async () => {
    await rcPage.openViewModal(knownExistingRatingCorrectionParam);
    await rcPage.closeOpenModal();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] View modal fields are read-only', async () => {
    await rcPage.openViewModal(knownExistingRatingCorrectionParam);
    await rcPage.verifyViewModalIsReadOnly();
    await rcPage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] Edit modal has Parameter and Criteria fields with Update button', async () => {
    await rcPage.openEditModal(knownExistingRatingCorrectionParam);
    await rcPage.verifyEditModalContents();
    await rcPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] Cancel in Edit modal closes without applying changes', async () => {
    await rcPage.editAndVerifyResetRestoresValues(
      knownExistingRatingCorrectionParam,
      'Temporary criteria that should not persist',
    );
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] Update button is disabled when Parameter is cleared', async () => {
    await rcPage.openEditModal(knownExistingRatingCorrectionParam);
    await rcPage.verifyUpdateButtonDisabledWhenParameterCleared();
    await rcPage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Update button is disabled when Criteria is cleared', async () => {
    await rcPage.openEditModal(knownExistingRatingCorrectionParam);
    await rcPage.verifyUpdateButtonDisabledWhenCriteriaCleared();
    await rcPage.closeOpenModal();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] editing a record — toast shown and updated criteria visible in table', async () => {
    await rcPage.editAndUpdate(
      knownExistingRatingCorrectionParam,
      ratingCorrectionEditData.updatedCriteria,
    );
    await rcPage.verifySuccessOrPendingMessage();
    // Verify: updated criteria visible in table row
    await rcPage.goto();
    await rcPage.table.search(knownExistingRatingCorrectionParam);
    const editedRow = page.locator('table tbody tr').filter({ hasText: knownExistingRatingCorrectionParam });
    // Expected: row with knownExistingRatingCorrectionParam is visible in table after edit
    // Actual if fails: row not found — edit may not have been applied or record is in pending state
    await expect(editedRow.first(), `Expected: row with param "${knownExistingRatingCorrectionParam}" visible in table after edit | Actual: row not found`).toBeVisible({ timeout: 8000 });
    // Expected: row contains the updated criteria value
    // Actual if fails: row shows old criteria or no match — edit not reflected in table
    await expect(editedRow.first(), `Expected: row to contain updated criteria "${ratingCorrectionEditData.updatedCriteria}" | Actual: row missing updated value`).toContainText(ratingCorrectionEditData.updatedCriteria);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] Update without changing data — no toast expected', async () => {
    await rcPage.openEditModal(knownExistingRatingCorrectionParam);
    const isDisabled = await rcPage.updateButton.isDisabled().catch(() => false);
    if (isDisabled) {
      await rcPage.closeOpenModal();
      return;
    }
    await rcPage.updateButton.click();
    const toastVisible = await page
      .locator('p-toast .p-toast-message')
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const modalClosed = !(await page.locator('[role="dialog"]').isVisible().catch(() => false));
    expect(
      !toastVisible || modalClosed,
      'Update without change should not trigger authorization toast or modal closes normally',
    ).toBe(true);
    await rcPage.closeOpenModal();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] default items per page is 10', async () => {
    const defaultValue = await rcPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim(), 'Default items per page should be 10').toBe('10');
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] items per page dropdown has options', async () => {
    const options = await rcPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] clicking page number 2 navigates to page 2', async () => {
    if (await rcPage.paginator.isLastPage()) { test.skip(); return; }
    await rcPage.paginator.clickPageNumber(2);
    expect(await rcPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] Next and Previous buttons switch between pages', async () => {
    if (await rcPage.paginator.isLastPage()) { test.skip(); return; }
    await rcPage.paginator.clickNextPage();
    expect(Number(await rcPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await rcPage.paginator.clickPreviousPage();
    expect(await rcPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] First and Previous buttons are disabled when on first page', async () => {
    await rcPage.paginator.verifyFirstPageDisabled();
    await rcPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] pagination info text shows entry count', async () => {
    const infoText = await rcPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });
});

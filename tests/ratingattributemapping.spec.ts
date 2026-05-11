import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingRatingAttributeMappingParam,
  ratingAttributeMappingData,
  ratingAttributeMappingEditData,
  users,
} from '../fixtures/testData';
import { RatingAttributeMappingPage } from '../pages/RatingAttributeMappingPage';
import { RatingParameterPage } from '../pages/RatingParameterPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Rating Attribute Mapping', () => {
  let context: BrowserContext;
  let page: Page;
  let ramPage: RatingAttributeMappingPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    ramPage = new RatingAttributeMappingPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await ramPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to Rating Attribute Mapping screen and verify heading, table, export, add button and pagination', async () => {
    await ramPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns: Rating Parameter, Attribute ID, Data Type, Actions', async () => {
    await ramPage.verifyRequiredColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has View, Edit and Delete buttons', async () => {
    await ramPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await ramPage.verifyTableHasRows();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each column shows filtered results and active indicator', async () => {
    const columns = await ramPage.table.getFilterableColumnNames();
    if (columns.length === 0) {
      test.skip(true, 'No filterable columns found');
      return;
    }
    for (const col of columns) {
      const colIdx = await ramPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await ramPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await ramPage.table.openColumnFilter(col);
      await ramPage.table.applyColumnFilter(sampleValue);
      expect(
        await ramPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await ramPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = await ramPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await ramPage.table.getRowCount();
    const colIdx = await ramPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await ramPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await ramPage.table.openColumnFilter(col);
    await ramPage.table.applyColumnFilter(sampleValue);
    await ramPage.table.clearColumnFilter(col);
    const restoredCount = await ramPage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await ramPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await ramPage.goto();
      await ramPage.table.sortByColumn(col);
      const asc = await ramPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await ramPage.table.sortByColumn(col);
      const desc = await ramPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  test('[TC_007b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(ramPage.table);
  });

  test('[TC_007c] sorting from page 2 keeps user on page 2', async () => {
    await verifySortPaginationCompatibility(ramPage.table, ramPage.paginator);
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await ramPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await ramPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(ramPage.export, ramPage.paginator);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(ramPage.export, ramPage.paginator);
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] clicking Add (+) button opens the New Attribute Mapping modal', async () => {
    await ramPage.openAddModal();
    await ramPage.closeOpenModal();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] add modal has Rating Parameter dropdown, Attribute ID input and Data Type input', async () => {
    await ramPage.openAddModal();
    await ramPage.verifyAddModalContents();
    await ramPage.closeOpenModal();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] Save button is disabled when all fields are empty/default', async () => {
    await ramPage.openAddModal();
    await ramPage.verifyAddButtonDisabledWhenEmpty();
    await ramPage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Save button is disabled when Rating Parameter is not selected', async () => {
    await ramPage.openAddModal();
    await ramPage.verifyAddButtonDisabledWhenRatingParamEmpty();
    await ramPage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test.skip('[TC_016] Save button is disabled when Attribute ID is 0 — skipped: validation check deferred', async () => {});

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Rating Parameter dropdown options match records from Rating Parameter screen', async () => {
    const rpPage = new RatingParameterPage(page);
    await rpPage.goto();
    // Collect first-page description values (column index 1 = Description)
    await rpPage.paginator.changeItemsPerPage(50).catch(() => {});
    const descriptions = await rpPage.table.getAllColumnValues(1);
    const sample = descriptions.filter(d => d.length > 0).slice(0, 10);
    expect(sample.length, 'Rating Parameter screen should have records').toBeGreaterThan(0);

    await ramPage.goto();
    await ramPage.openAddModal();
    const dropdownOptions = await ramPage.getRatingParameterDropdownOptions();
    for (const desc of sample) {
      expect(
        dropdownOptions,
        `"${desc}" from Rating Parameter screen missing from dropdown`,
      ).toContain(desc);
    }
    await ramPage.closeOpenModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Cancel button is present in add modal', async () => {
    await ramPage.openAddModal();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /^cancel$/i })).toBeVisible();
    await ramPage.closeOpenModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] Cancel closes modal without saving the record', async () => {
    await ramPage.openAddModal();
    await ramPage.clickCancelInModal();
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] adding a valid record — toast shown and record appears in table', async () => {
    await ramPage.addAttributeMapping(
      knownExistingRatingAttributeMappingParam,
      ratingAttributeMappingData.attributeId,
      ratingAttributeMappingData.dataType,
    );
    await ramPage.verifySuccessOrPendingMessage();
    // Verify: record appears in table (pending or active)
    await ramPage.goto();
    await ramPage.table.search(knownExistingRatingAttributeMappingParam);
    await ramPage.table.verifyRowExistsByCellText(knownExistingRatingAttributeMappingParam);
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] adding a duplicate entry shows error or keeps modal open', async () => {
    await ramPage.openAddModal();
    await ramPage.fillAddFormFields(
      knownExistingRatingAttributeMappingParam,
      '1068',
      '2',
    );
    await ramPage.verifyDuplicateOrErrorOnSave();
    await ramPage.closeOpenModal();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] Delete shows confirmation dialog; Cancel keeps record in table', async () => {
    await ramPage.openDeleteConfirmation(knownExistingRatingAttributeMappingParam);
    await ramPage.cancelDeleteConfirmation();
    await ramPage.table.verifyRowExistsByCellText(knownExistingRatingAttributeMappingParam);
  });

  // ─── TC_022b ─────────────────────────────────────────────────────────────────
  test('[TC_022b] confirming delete sends for authorization — toast shown, row count decreases', async () => {
    await ramPage.goto();
    const countBefore = await ramPage.table.getRowCount();
    await ramPage.openDeleteConfirmation(knownExistingRatingAttributeMappingParam);
    await ramPage.confirmDelete();
    await ramPage.verifySuccessOrPendingMessage();
    // Verify: row count decreased (record removed or pending deletion)
    await ramPage.goto();
    const countAfter = await ramPage.table.getRowCount();
    // Expected: row count decreases after delete (record removed or marked for pending deletion)
    // Actual if fails: row count unchanged — record may still be in table or delete failed
    expect(countAfter, `Expected: row count < ${countBefore} after delete | Actual: row count = ${countAfter} (unchanged)`).toBeLessThan(countBefore);
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] clicking View opens a read-only modal', async () => {
    await ramPage.openViewModal(knownExistingRatingAttributeMappingParam);
    await ramPage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] View modal fields and dropdowns are read-only', async () => {
    await ramPage.openViewModal(knownExistingRatingAttributeMappingParam);
    await ramPage.verifyViewModalIsReadOnly();
    await ramPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] Edit modal has Rating Parameter dropdown, Attribute ID and Data Type fields', async () => {
    await ramPage.openEditModal(knownExistingRatingAttributeMappingParam);
    await ramPage.verifyEditModalContents();
    await ramPage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] Cancel in Edit modal closes without applying changes', async () => {
    await ramPage.editAndVerifyResetRestoresValues(
      knownExistingRatingAttributeMappingParam,
      'Temporary value that should not persist',
    );
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Update button is disabled when Data Type field is cleared', async () => {
    await ramPage.openEditModal(knownExistingRatingAttributeMappingParam);
    await ramPage.verifyUpdateButtonDisabledWhenDataTypeCleared();
    await ramPage.closeOpenModal();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] editing a record — toast shown and updated data type visible in table', async () => {
    await ramPage.editAndUpdate(
      knownExistingRatingAttributeMappingParam,
      ratingAttributeMappingEditData.updatedDataType,
    );
    await ramPage.verifySuccessOrPendingMessage();
    // Verify: updated data type visible in table row
    await ramPage.goto();
    await ramPage.table.search(knownExistingRatingAttributeMappingParam);
    const editedRow = page.locator('table tbody tr').filter({ hasText: knownExistingRatingAttributeMappingParam });
    // Expected: row with knownExistingRatingAttributeMappingParam is visible in table after edit
    // Actual if fails: row not found — edit may not have been applied or record is in pending state
    await expect(editedRow.first(), `Expected: row with param "${knownExistingRatingAttributeMappingParam}" visible in table after edit | Actual: row not found`).toBeVisible({ timeout: 8000 });
    // Expected: row contains the updated data type value
    // Actual if fails: row shows old data type or no match — edit not reflected in table
    await expect(editedRow.first(), `Expected: row to contain updated data type "${ratingAttributeMappingEditData.updatedDataType}" | Actual: row missing updated value`).toContainText(ratingAttributeMappingEditData.updatedDataType);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] default items per page is 10', async () => {
    const defaultValue = await ramPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim(), 'Default items per page should be 10').toBe('10');
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] items per page dropdown has options', async () => {
    const options = await ramPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] clicking page number 2 navigates to page 2', async () => {
    if (await ramPage.paginator.isLastPage()) { test.skip(); return; }
    await ramPage.paginator.clickPageNumber(2);
    expect(await ramPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] Next and Previous buttons switch between pages', async () => {
    if (await ramPage.paginator.isLastPage()) { test.skip(); return; }
    await ramPage.paginator.clickNextPage();
    expect(Number(await ramPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await ramPage.paginator.clickPreviousPage();
    expect(await ramPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] First and Previous buttons are disabled when on first page', async () => {
    await ramPage.paginator.verifyFirstPageDisabled();
    await ramPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] pagination info text shows entry count', async () => {
    const infoText = await ramPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });
});

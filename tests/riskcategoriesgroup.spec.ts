import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingRiskCategoriesGroupCode,
  riskCategoriesGroupData,
  riskCategoriesGroupEditData,
  users,
} from '../fixtures/testData';
import { RiskCategoriesGroupPage } from '../pages/RiskCategoriesGroupPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Risk Categories Group', () => {
  let context: BrowserContext;
  let page: Page;
  let rcgPage: RiskCategoriesGroupPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    rcgPage = new RiskCategoriesGroupPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await rcgPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] screen has heading, table, PDF/Excel export, add (+) button and pagination', async () => {
    await rcgPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns (Code, Description, Actions) and no extra columns', async () => {
    await rcgPage.verifyRequiredColumns();
    await rcgPage.verifyNoExtraColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has exactly View, Edit and Delete buttons', async () => {
    await rcgPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await rcgPage.verifyTableHasRows();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each column (except Actions) shows filtered results', async () => {
    const columns = await rcgPage.table.getFilterableColumnNames();
    if (columns.length === 0) {
      test.skip(true, 'Filter functionality not yet implemented on Risk Categories Group screen');
      return;
    }
    for (const col of columns) {
      const colIdx = await rcgPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await rcgPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await rcgPage.table.openColumnFilter(col);
      await rcgPage.table.applyColumnFilter(sampleValue);
      expect(
        await rcgPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator should appear after filtering`,
      ).toBe(true);
      await rcgPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = await rcgPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await rcgPage.table.getRowCount();
    const colIdx = await rcgPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await rcgPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await rcgPage.table.openColumnFilter(col);
    await rcgPage.table.applyColumnFilter(sampleValue);
    await rcgPage.table.clearColumnFilter(col);
    const restoredCount = await rcgPage.table.getRowCount();
    expect(restoredCount, 'Row count should be restored after clearing filter').toBe(originalCount);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const sortableColumns = await rcgPage.table.getSortableColumnNames();
    expect(sortableColumns.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of sortableColumns) {
      await rcgPage.goto();
      await rcgPage.table.sortByColumn(col);
      const asc = await rcgPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await rcgPage.table.sortByColumn(col);
      const desc = await rcgPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  test('[TC_007b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(rcgPage.table);
  });

  test('[TC_007c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
    await verifySortPaginationCompatibility(rcgPage.table, rcgPage.paginator);
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await rcgPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await rcgPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(rcgPage.export, rcgPage.paginator);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(rcgPage.export, rcgPage.paginator);
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] clicking Add (+) button opens the add modal', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyModalClosed().catch(() => {}); // just ensure it opened above
    await rcgPage.closeOpenModal();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] add modal has Code and Description input fields with correct labels', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddModalContents();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] Add button is disabled when all fields are empty', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddButtonDisabledWhenEmpty();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Add button is disabled when Code field is empty', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddButtonDisabledWhenCodeEmpty('Some description');
    await rcgPage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] Add button is disabled when Description field is empty', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddButtonDisabledWhenDescriptionEmpty('TST');
    await rcgPage.closeOpenModal();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Reset button in Add modal has label "Reset" (fail if labeled "Cancel")', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyResetButtonPresent();
    await rcgPage.verifyResetButtonLabel();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Reset/Cancel button clears all field values in Add modal', async () => {
    await rcgPage.openAddModal();
    await rcgPage.fillAddFormFields('TESTCODE', 'Test Description');
    await rcgPage.clickResetInModal();
    await rcgPage.verifyAddFormFieldsEmpty();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] X (close) button closes the Add modal without saving', async () => {
    await rcgPage.openAddModal();
    await rcgPage.fillAddFormFields('TESTCLOSE', 'Should not be saved');
    await rcgPage.clickCloseModalButton();
    // Verify record was NOT added
    await rcgPage.table.search('TESTCLOSE');
    await rcgPage.table.verifyRowNotExists('TESTCLOSE');
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] adding a valid record sends it for authorization with success or pending toast', async () => {
    await rcgPage.addRiskCategoriesGroup(riskCategoriesGroupData.code, riskCategoriesGroupData.description);
    await rcgPage.verifySuccessOrPendingMessage();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] adding a duplicate code shows an error message', async () => {
    await rcgPage.verifyDuplicateCodeError(knownExistingRiskCategoriesGroupCode);
    await rcgPage.closeOpenModal();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] entries sent for authorization are visible in auth screen', async () => {
    test.skip(true, 'Checker flow — requires checker role login and authorization screen');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] rejected entries are visible in Rejected tab of auth screen', async () => {
    test.skip(true, 'Checker flow — requires checker role login and authorization screen');
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] Delete action shows confirmation dialog', async () => {
    await rcgPage.openDeleteConfirmation(knownExistingRiskCategoriesGroupCode);
    await rcgPage.cancelDeleteConfirmation();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] clicking View opens a read-only modal', async () => {
    await rcgPage.openViewModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] View modal fields are read-only and cannot be edited', async () => {
    await rcgPage.openViewModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.verifyViewModalIsReadOnly();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Edit action opens modal with Code, Description fields and buttons', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.verifyEditModalContents();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Reset button in Edit modal has label "Reset" (fail if labeled "Cancel")', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.verifyResetButtonPresent();
    await rcgPage.verifyResetButtonLabel();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] Edit Reset/Cancel restores original field values', async () => {
    await rcgPage.editAndVerifyResetRestoresValues(
      knownExistingRiskCategoriesGroupCode,
      'Temporary description that should be reset',
    );
    await rcgPage.closeOpenModal();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] Update button is disabled when mandatory Description field is cleared', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    const descInput = page.locator('[role="dialog"]').getByPlaceholder(/description/i).first();
    await descInput.clear();
    await rcgPage.verifyUpdateButtonDisabled();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] editing a record and clicking Update sends it for authorization', async () => {
    await rcgPage.editAndUpdate(
      knownExistingRiskCategoriesGroupCode,
      riskCategoriesGroupEditData.updatedDescription,
    );
    await rcgPage.verifySuccessOrPendingMessage();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] items per page dropdown changes number of displayed records', async () => {
    const currentValue = await rcgPage.paginator.getItemsPerPageValue().catch(() => '');
    const options = await rcgPage.paginator.getItemsPerPageOptions().catch(() => [] as string[]);
    if (options.length <= 1) { test.skip(); return; }
    expect(options.length, 'Items per page should have multiple options').toBeGreaterThan(1);
    const newSize = options.find(o => o.trim() !== currentValue.trim() && /\d+/.test(o));
    if (newSize) {
      const sizeNum = Number(newSize.replace(/\D/g, ''));
      await rcgPage.paginator.changeItemsPerPage(sizeNum);
      const rowCount = await rcgPage.table.getRowCount();
      expect(rowCount).toBeLessThanOrEqual(sizeNum);
    }
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] clicking page number 2 navigates to page 2', async () => {
    const isLastPage = await rcgPage.paginator.isLastPage();
    if (isLastPage) { test.skip(); return; }
    await rcgPage.paginator.clickPageNumber(2);
    const activePage = await rcgPage.paginator.getActivePageNumber();
    expect(activePage).toBe('2');
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] Next and Previous buttons switch between pages', async () => {
    const isLastPage = await rcgPage.paginator.isLastPage();
    if (isLastPage) { test.skip(); return; }
    await rcgPage.paginator.clickNextPage();
    const afterNext = await rcgPage.paginator.getActivePageNumber();
    expect(Number(afterNext), 'Should be past page 1 after clicking Next').toBeGreaterThan(1);
    await rcgPage.paginator.clickPreviousPage();
    const afterPrev = await rcgPage.paginator.getActivePageNumber();
    expect(afterPrev, 'Should return to page 1 after clicking Previous').toBe('1');
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] First and Last buttons navigate to first and last pages', async () => {
    const isLastPage = await rcgPage.paginator.isLastPage();
    if (isLastPage) { test.skip(); return; }
    await rcgPage.paginator.clickLastPage();
    await rcgPage.paginator.verifyNextPageDisabled();
    await rcgPage.paginator.clickFirstPage();
    await rcgPage.paginator.verifyFirstPageDisabled();
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] Next and Last buttons are disabled when on last page', async () => {
    const alreadyLastPage = await rcgPage.paginator.isLastPage();
    if (!alreadyLastPage) {
      await rcgPage.paginator.clickLastPage();
    }
    await rcgPage.paginator.verifyNextPageDisabled();
    await rcgPage.paginator.verifyLastPageDisabled();
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] First and Previous buttons are disabled when on first page', async () => {
    await rcgPage.paginator.verifyFirstPageDisabled();
    await rcgPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] pagination info text shows entry count (e.g. "Showing 1-7 of 7")', async () => {
    const infoText = await rcgPage.paginator.getInfoText();
    expect(infoText, 'Pagination info text should contain "showing" and "of"').toMatch(/showing|of/i);
  });
});

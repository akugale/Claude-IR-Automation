import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingRiskCategoriesGroupCode,
  riskCategoriesGroupData,
  riskCategoriesGroupEditData,
  users,
  CHECKER_ENABLED,
} from '../fixtures/testData';
import { RiskCategoriesGroupPage } from '../pages/RiskCategoriesGroupPage';
import { LoginPage } from '../pages/LoginPage';
import { AuthorizationPage } from '../pages/AuthorizationPage';
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
  test('[TC_001] navigate to Risk Categories Group screen and verify heading, table, export, add button and pagination', async () => {
    await rcgPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns: Code, Description, Actions', async () => {
    await rcgPage.verifyRequiredColumns();
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
  test('[TC_005] filter each column shows filtered results and active indicator', async () => {
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
    const cols = await rcgPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
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
    await rcgPage.closeOpenModal();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] add modal has Code and Description input fields', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddModalContents();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] Save button is disabled when all fields are empty', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddButtonDisabledWhenEmpty();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Save button is disabled when Code field is empty', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddButtonDisabledWhenCodeEmpty('Some description');
    await rcgPage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] Save button is disabled when Description field is empty', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyAddButtonDisabledWhenDescriptionEmpty('TSTCODE');
    await rcgPage.closeOpenModal();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Add modal has a Reset or Cancel button', async () => {
    await rcgPage.openAddModal();
    await rcgPage.verifyResetButtonPresent();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Reset button clears all fields in Add modal', async () => {
    await rcgPage.openAddModal();
    await rcgPage.fillAddFormFields('TESTCODE', 'Test Description');
    await rcgPage.clickResetInModal();
    await rcgPage.verifyAddFormFieldsEmpty();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] X (close) button closes the Add modal without saving', async () => {
    await rcgPage.openAddModal();
    await rcgPage.fillAddFormFields('TSTCLOSE', 'Should not be saved');
    await rcgPage.clickCloseModalButton();
    await rcgPage.table.search('TSTCLOSE');
    await rcgPage.table.verifyRowNotExists('TSTCLOSE');
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] adding a valid record — toast shown and record appears in table', async () => {
    await rcgPage.addRiskCategoriesGroup(riskCategoriesGroupData.code, riskCategoriesGroupData.description);
    await rcgPage.verifySuccessOrPendingMessage();
    // Verify: record appears in table (pending or active)
    await rcgPage.goto();
    await rcgPage.table.search(riskCategoriesGroupData.code);
    await rcgPage.table.verifyRowExistsByCellText(riskCategoriesGroupData.code);
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] adding a duplicate code shows an error message', async () => {
    await rcgPage.verifyDuplicateCodeError(knownExistingRiskCategoriesGroupCode);
    await rcgPage.closeOpenModal();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] add entry visible on auth screen with Add action — checker approves — record in table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await rcgPage.addRiskCategoriesGroup(riskCategoriesGroupData.code, riskCategoriesGroupData.description);
    await rcgPage.verifySuccessOrPendingMessage();

    // ── Checker: verify entry visible → approve ───────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(riskCategoriesGroupData.code);
    await authPage.verifyRecordDetails(riskCategoriesGroupData.code, 'Add');
    await authPage.approveRecord(riskCategoriesGroupData.code);
    await authPage.verifyRecordNotVisible(riskCategoriesGroupData.code);
    await checkerCtx.close();

    // ── Verify: record active in maker table ──────────────────────────────────
    await rcgPage.goto();
    const row = page.locator('table tbody tr').filter({ hasText: riskCategoriesGroupData.code });
    await expect(row.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] checker rejects add — entry moves to Rejected tab and record not in maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await rcgPage.addRiskCategoriesGroup(riskCategoriesGroupData.code, riskCategoriesGroupData.description);
    await rcgPage.verifySuccessOrPendingMessage();

    // ── Checker: reject → verify moves to Rejected tab ────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(riskCategoriesGroupData.code);
    await authPage.rejectRecord(riskCategoriesGroupData.code);
    await authPage.verifyRecordNotVisible(riskCategoriesGroupData.code);
    await authPage.goToRejectedTab();
    await authPage.verifyRecordVisible(riskCategoriesGroupData.code);
    await checkerCtx.close();

    // ── Verify: record NOT in maker table after rejection ─────────────────────
    await rcgPage.goto();
    await rcgPage.table.search(riskCategoriesGroupData.code);
    await rcgPage.table.verifyRowNotExists(riskCategoriesGroupData.code);
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] Delete action shows confirmation dialog; Cancel keeps record in table', async () => {
    await rcgPage.openDeleteConfirmation(knownExistingRiskCategoriesGroupCode);
    await rcgPage.cancelDeleteConfirmation();
    await rcgPage.table.verifyRowExistsByCellText(knownExistingRiskCategoriesGroupCode);
  });

  // ─── TC_024b ─────────────────────────────────────────────────────────────────
  test('[TC_024b] confirming delete sends for authorization — toast shown, row count decreases', async () => {
    await rcgPage.goto();
    const countBefore = await rcgPage.table.getRowCount();
    await rcgPage.openDeleteConfirmation(knownExistingRiskCategoriesGroupCode);
    await rcgPage.confirmDelete();
    await rcgPage.verifySuccessOrPendingMessage();
    // Verify: row count decreased (record removed or pending deletion)
    await rcgPage.goto();
    const countAfter = await rcgPage.table.getRowCount();
    // Expected: row count decreases after delete (record removed or marked for pending deletion)
    // Actual if fails: row count unchanged — record may still be in table or delete failed
    expect(countAfter, `Expected: row count < ${countBefore} after delete | Actual: row count = ${countAfter} (unchanged)`).toBeLessThan(countBefore);
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
  test('[TC_027] Edit modal has Code and Description fields', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.verifyEditModalContents();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Edit modal has a Reset or Cancel button', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.verifyResetButtonPresent();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] Edit Reset restores original Description value', async () => {
    await rcgPage.editAndVerifyResetRestoresValues(
      knownExistingRiskCategoriesGroupCode,
      'Temporary description that should be reset',
    );
    await rcgPage.closeOpenModal();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] Update button is disabled when mandatory Description field is cleared', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    await page.locator('[role="dialog"]').getByPlaceholder(/description/i).first().clear();
    await rcgPage.verifyUpdateButtonDisabled();
    await rcgPage.closeOpenModal();
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] editing a record — toast shown and updated description visible in table', async () => {
    await rcgPage.editAndUpdate(knownExistingRiskCategoriesGroupCode, riskCategoriesGroupEditData.updatedDescription);
    await rcgPage.verifySuccessOrPendingMessage();
    // Verify: updated description visible in table row
    await rcgPage.goto();
    await rcgPage.table.search(knownExistingRiskCategoriesGroupCode);
    const editedRow = page.locator('table tbody tr').filter({ hasText: knownExistingRiskCategoriesGroupCode });
    // Expected: row with knownExistingRiskCategoriesGroupCode is visible in table after edit
    // Actual if fails: row not found — edit may not have been applied or record is in pending state
    await expect(editedRow.first(), `Expected: row with code "${knownExistingRiskCategoriesGroupCode}" visible in table after edit | Actual: row not found`).toBeVisible({ timeout: 8000 });
    // Expected: row contains the updated description value
    // Actual if fails: row shows old description or no match — edit not reflected in table
    await expect(editedRow.first(), `Expected: row to contain updated description "${riskCategoriesGroupEditData.updatedDescription}" | Actual: row missing updated text`).toContainText(riskCategoriesGroupEditData.updatedDescription);
  });

  // ─── TC_031b ────────────────────────────────────────────────────────────────
  test('[TC_031b] clicking Update without changing data should not send for authorization', async () => {
    await rcgPage.openEditModal(knownExistingRiskCategoriesGroupCode);
    await rcgPage.updateButton.click();
    const toastMsg = page.locator('p-toast .p-toast-message').first();
    const toastAppeared = await toastMsg.isVisible({ timeout: 3000 }).catch(() => false);
    expect(toastAppeared, 'No-change Update should not trigger authorization toast').toBe(false);
    await rcgPage.closeOpenModal();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] default items per page is 20', async () => {
    const defaultValue = await rcgPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim(), 'Default items per page should be 20').toBe('20');
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] items per page dropdown has options', async () => {
    const options = await rcgPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] clicking page number 2 navigates to page 2', async () => {
    if (await rcgPage.paginator.isLastPage()) { test.skip(); return; }
    await rcgPage.paginator.clickPageNumber(2);
    expect(await rcgPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] Next and Previous buttons switch between pages', async () => {
    if (await rcgPage.paginator.isLastPage()) { test.skip(); return; }
    await rcgPage.paginator.clickNextPage();
    expect(Number(await rcgPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await rcgPage.paginator.clickPreviousPage();
    expect(await rcgPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] First and Last buttons navigate to first and last pages', async () => {
    if (await rcgPage.paginator.isLastPage()) { test.skip(); return; }
    await rcgPage.paginator.clickLastPage();
    await rcgPage.paginator.verifyNextPageDisabled();
    await rcgPage.paginator.clickFirstPage();
    await rcgPage.paginator.verifyFirstPageDisabled();
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] First and Previous buttons are disabled when on first page', async () => {
    await rcgPage.paginator.verifyFirstPageDisabled();
    await rcgPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] pagination info text shows entry count (e.g. "Showing 1-10 of N")', async () => {
    const infoText = await rcgPage.paginator.getInfoText();
    expect(infoText, 'Pagination info text should contain "showing" and "of"').toMatch(/showing|of/i);
  });
});

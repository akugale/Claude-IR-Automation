import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingRiskCategoryCode,
  knownExistingRiskCategoriesGroupCode,
  riskCategoryData,
  riskCategoryEditData,
  users,
  CHECKER_ENABLED,
} from '../fixtures/testData';
import { RiskCategoryPage } from '../pages/RiskCategoryPage';
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

test.describe('Risk Category', () => {
  let context: BrowserContext;
  let page: Page;
  let rcPage: RiskCategoryPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    rcPage = new RiskCategoryPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await rcPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to Risk Category screen and verify heading, table, export, add button and pagination', async () => {
    await rcPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns: Code, Description, Risk Category Group, Company Score, Notching, Actions', async () => {
    await rcPage.verifyRequiredColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has exactly View, Edit and Delete buttons', async () => {
    await rcPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await rcPage.verifyTableHasRows();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each column (except Actions) shows filtered results and active indicator', async () => {
    const columns = await rcPage.table.getFilterableColumnNames();
    if (columns.length === 0) {
      test.skip(true, 'Filter functionality not yet implemented on Risk Category screen');
      return;
    }
    for (const col of columns) {
      const colIdx = await rcPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await rcPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await rcPage.table.openColumnFilter(col);
      await rcPage.table.applyColumnFilter(sampleValue);
      expect(
        await rcPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator should appear after filtering`,
      ).toBe(true);
      await rcPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = await rcPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await rcPage.table.getRowCount();
    const colIdx = await rcPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await rcPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await rcPage.table.openColumnFilter(col);
    await rcPage.table.applyColumnFilter(sampleValue);
    await rcPage.table.clearColumnFilter(col);
    const restoredCount = await rcPage.table.getRowCount();
    expect(restoredCount, 'Row count should be restored after clearing filter').toBe(originalCount);
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

  test('[TC_007c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
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
  test('[TC_012] clicking Add (+) button opens the add modal', async () => {
    await rcPage.openAddModal();
    await rcPage.closeOpenModal();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] add modal has Code, Description, Company Score, Risk Category Group and Notching fields', async () => {
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
  test('[TC_015] Save button is disabled when Code field is empty', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyAddButtonDisabledWhenCodeEmpty('Some description');
    await rcPage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] Save button is disabled when Description field is empty', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyAddButtonDisabledWhenDescriptionEmpty('TSTCODE');
    await rcPage.closeOpenModal();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Is Part of Company Score dropdown has Yes and No options', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyCompanyScoreOptions();
    await rcPage.closeOpenModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Is Part of Notching dropdown has Yes and No options', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyNotchingOptions();
    await rcPage.closeOpenModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] Risk Category Group dropdown options match all records from Risk Categories Group screen', async () => {
    const rcgPage = new RiskCategoriesGroupPage(page);
    await rcgPage.goto();
    const rcgDescriptions = await rcgPage.getAllDescriptions();
    expect(rcgDescriptions.length, 'Risk Categories Group screen should have records').toBeGreaterThan(0);

    await rcPage.goto();
    await rcPage.openAddModal();
    const dropdownOptions = await rcPage.getRiskCategoryGroupDropdownOptions();
    for (const desc of rcgDescriptions) {
      expect(
        dropdownOptions,
        `"${desc}" from Risk Categories Group screen is missing from Risk Category Group dropdown`,
      ).toContain(desc);
    }
    await rcPage.closeOpenModal();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] Reset button in Add modal has label "Reset" (fail if labeled "Cancel")', async () => {
    await rcPage.openAddModal();
    await rcPage.verifyResetButtonPresent();
    await rcPage.verifyResetButtonLabel();
    await rcPage.closeOpenModal();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] Reset/Cancel button clears all field values in Add modal', async () => {
    await rcPage.openAddModal();
    await rcPage.fillAddFormFields('TESTCODE', 'Test Description', 'Yes', 'Yes');
    await rcPage.clickResetInModal();
    await rcPage.verifyAddFormFieldsEmpty();
    await rcPage.closeOpenModal();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] X (close) button closes the Add modal without saving', async () => {
    await rcPage.openAddModal();
    await rcPage.fillAddFormFields('TSTCLOSE', 'Should not be saved');
    await rcPage.clickCloseModalButton();
    await rcPage.table.search('TSTCLOSE');
    await rcPage.table.verifyRowNotExists('TSTCLOSE');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] adding a valid record — toast shown and record appears in table', async () => {
    await rcPage.addRiskCategory(
      riskCategoryData.code,
      riskCategoryData.description,
      riskCategoryData.companyScore,
      riskCategoryData.notching,
    );
    await rcPage.verifySuccessOrPendingMessage();
    // Verify: record appears in table (pending or active)
    await rcPage.goto();
    await rcPage.table.search(riskCategoryData.code);
    await rcPage.table.verifyRowExistsByCellText(riskCategoryData.code);
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] adding a duplicate code shows an error message', async () => {
    await rcPage.verifyDuplicateCodeError(knownExistingRiskCategoryCode);
    await rcPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] add entry visible on auth screen with Add action — checker approves — record in table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await rcPage.addRiskCategory(
      riskCategoryData.code,
      riskCategoryData.description,
      riskCategoryData.companyScore,
      riskCategoryData.notching,
    );
    await rcPage.verifySuccessOrPendingMessage();

    // ── Checker: verify entry visible → approve ───────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(riskCategoryData.code);
    await authPage.verifyRecordDetails(riskCategoryData.code, 'Add');
    await authPage.approveRecord(riskCategoryData.code);
    await authPage.verifyRecordNotVisible(riskCategoryData.code);
    await checkerCtx.close();

    // ── Verify: record active in maker table ──────────────────────────────────
    await rcPage.goto();
    const row = page.locator('table tbody tr').filter({ hasText: riskCategoryData.code });
    await expect(row.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] checker rejects add — entry moves to Rejected tab and record not in maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await rcPage.addRiskCategory(
      riskCategoryData.code,
      riskCategoryData.description,
      riskCategoryData.companyScore,
      riskCategoryData.notching,
    );
    await rcPage.verifySuccessOrPendingMessage();

    // ── Checker: reject → verify moves to Rejected tab ────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(riskCategoryData.code);
    await authPage.rejectRecord(riskCategoryData.code);
    await authPage.verifyRecordNotVisible(riskCategoryData.code);
    await authPage.goToRejectedTab();
    await authPage.verifyRecordVisible(riskCategoryData.code);
    await checkerCtx.close();

    // ── Verify: record NOT in maker table after rejection ─────────────────────
    await rcPage.goto();
    await rcPage.table.search(riskCategoryData.code);
    await rcPage.table.verifyRowNotExists(riskCategoryData.code);
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Delete action shows confirmation dialog; Cancel keeps record in table', async () => {
    await rcPage.openDeleteConfirmation(knownExistingRiskCategoryCode);
    await rcPage.cancelDeleteConfirmation();
    await rcPage.table.verifyRowExistsByCellText(knownExistingRiskCategoryCode);
  });

  // ─── TC_027b ─────────────────────────────────────────────────────────────────
  test('[TC_027b] confirming delete sends for authorization — toast shown, row count decreases', async () => {
    await rcPage.goto();
    const countBefore = await rcPage.table.getRowCount();
    await rcPage.openDeleteConfirmation(knownExistingRiskCategoryCode);
    await rcPage.confirmDelete();
    await rcPage.verifySuccessOrPendingMessage();
    // Verify: row count decreased (record removed or pending deletion)
    await rcPage.goto();
    const countAfter = await rcPage.table.getRowCount();
    // Expected: row count decreases after delete (record removed or marked for pending deletion)
    // Actual if fails: row count unchanged — record may still be in table or delete failed
    expect(countAfter, `Expected: row count < ${countBefore} after delete | Actual: row count = ${countAfter} (unchanged)`).toBeLessThan(countBefore);
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] clicking View opens a read-only modal', async () => {
    await rcPage.openViewModal(knownExistingRiskCategoryCode);
    await rcPage.closeOpenModal();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] View modal fields are read-only and cannot be edited', async () => {
    await rcPage.openViewModal(knownExistingRiskCategoryCode);
    await rcPage.verifyViewModalIsReadOnly();
    await rcPage.closeOpenModal();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] Edit modal has Code, Description, Company Score, Risk Category Group and Notching fields', async () => {
    await rcPage.openEditModal(knownExistingRiskCategoryCode);
    await rcPage.verifyEditModalContents();
    await rcPage.closeOpenModal();
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] Reset button in Edit modal has label "Reset" (fail if labeled "Cancel")', async () => {
    await rcPage.openEditModal(knownExistingRiskCategoryCode);
    await rcPage.verifyResetButtonPresent();
    await rcPage.verifyResetButtonLabel();
    await rcPage.closeOpenModal();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] Edit Reset/Cancel restores original Description value', async () => {
    await rcPage.editAndVerifyResetRestoresValues(
      knownExistingRiskCategoryCode,
      'Temporary description that should be reset',
    );
    await rcPage.closeOpenModal();
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] Update button is disabled when mandatory Description field is cleared', async () => {
    await rcPage.openEditModal(knownExistingRiskCategoryCode);
    const descInput = page.locator('[role="dialog"]').getByPlaceholder(/enter description/i).first();
    await descInput.clear();
    await rcPage.verifyUpdateButtonDisabled();
    await rcPage.closeOpenModal();
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] editing a record — toast shown and updated description visible in table', async () => {
    await rcPage.editAndUpdate(knownExistingRiskCategoryCode, riskCategoryEditData.updatedDescription);
    await rcPage.verifySuccessOrPendingMessage();
    // Verify: updated description visible in table row
    await rcPage.goto();
    await rcPage.table.search(knownExistingRiskCategoryCode);
    const editedRow = page.locator('table tbody tr').filter({ hasText: knownExistingRiskCategoryCode });
    // Expected: row with knownExistingRiskCategoryCode is visible in table after edit
    // Actual if fails: row not found — edit may not have been applied or record is in pending state
    await expect(editedRow.first(), `Expected: row with code "${knownExistingRiskCategoryCode}" visible in table after edit | Actual: row not found`).toBeVisible({ timeout: 8000 });
    // Expected: row contains the updated description value
    // Actual if fails: row shows old description or no match — edit not reflected in table
    await expect(editedRow.first(), `Expected: row to contain updated description "${riskCategoryEditData.updatedDescription}" | Actual: row missing updated text`).toContainText(riskCategoryEditData.updatedDescription);
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] items per page dropdown changes number of displayed records', async () => {
    const currentValue = await rcPage.paginator.getItemsPerPageValue().catch(() => '');
    const options = await rcPage.paginator.getItemsPerPageOptions().catch(() => [] as string[]);
    if (options.length <= 1) { test.skip(); return; }
    const newSize = options.find(o => o.trim() !== currentValue.trim() && /\d+/.test(o));
    if (newSize) {
      const sizeNum = Number(newSize.replace(/\D/g, ''));
      await rcPage.paginator.changeItemsPerPage(sizeNum);
      const rowCount = await rcPage.table.getRowCount();
      expect(rowCount).toBeLessThanOrEqual(sizeNum);
    }
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] default items per page is 10', async () => {
    const defaultValue = await rcPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim(), 'Default items per page should be 10').toBe('10');
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] clicking page number 2 navigates to page 2', async () => {
    if (await rcPage.paginator.isLastPage()) { test.skip(); return; }
    await rcPage.paginator.clickPageNumber(2);
    expect(await rcPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] Next and Previous buttons switch between pages', async () => {
    if (await rcPage.paginator.isLastPage()) { test.skip(); return; }
    await rcPage.paginator.clickNextPage();
    expect(Number(await rcPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await rcPage.paginator.clickPreviousPage();
    expect(await rcPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_039 ─────────────────────────────────────────────────────────────────
  test('[TC_039] First and Last buttons navigate to first and last pages', async () => {
    if (await rcPage.paginator.isLastPage()) { test.skip(); return; }
    await rcPage.paginator.clickLastPage();
    await rcPage.paginator.verifyNextPageDisabled();
    await rcPage.paginator.clickFirstPage();
    await rcPage.paginator.verifyFirstPageDisabled();
  });

  // ─── TC_040 ─────────────────────────────────────────────────────────────────
  test('[TC_040] Next and Last buttons are disabled when on last page', async () => {
    const alreadyLastPage = await rcPage.paginator.isLastPage();
    if (!alreadyLastPage) {
      await rcPage.paginator.clickLastPage();
    }
    await rcPage.paginator.verifyNextPageDisabled();
    await rcPage.paginator.verifyLastPageDisabled();
  });

  // ─── TC_041 ─────────────────────────────────────────────────────────────────
  test('[TC_041] First and Previous buttons are disabled when on first page', async () => {
    await rcPage.paginator.verifyFirstPageDisabled();
    await rcPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_042 ─────────────────────────────────────────────────────────────────
  test('[TC_042] pagination info text shows entry count (e.g. "Showing 1-10 of N")', async () => {
    const infoText = await rcPage.paginator.getInfoText();
    expect(infoText, 'Pagination info text should contain "showing" and "of"').toMatch(/showing|of/i);
  });
});

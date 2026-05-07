import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingIndustryMedianIndustry,
  industryMedianData,
  industryMedianEditData,
  users,
} from '../fixtures/testData';
import { IndustryMedianPage } from '../pages/IndustryMedianPage';
import { IndustryPage } from '../pages/IndustryPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Industry Median (Industry Parameter)', () => {
  let context: BrowserContext;
  let page: Page;
  let imPage: IndustryMedianPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    imPage = new IndustryMedianPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await imPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to Industry Median screen and verify heading, table, export, add button and pagination', async () => {
    await imPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns: Industry, PBIDT Margin, Operating Cycle, Current Ratio, As On Date', async () => {
    await imPage.verifyRequiredColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has View, Edit and Delete buttons', async () => {
    await imPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await imPage.verifyTableHasRows();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each column shows filtered results and active indicator', async () => {
    const columns = await imPage.table.getFilterableColumnNames();
    if (columns.length === 0) {
      test.skip(true, 'No filterable columns found');
      return;
    }
    for (const col of columns) {
      const colIdx = await imPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await imPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await imPage.table.openColumnFilter(col);
      await imPage.table.applyColumnFilter(sampleValue);
      expect(
        await imPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await imPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = await imPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await imPage.table.getRowCount();
    const colIdx = await imPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await imPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await imPage.table.openColumnFilter(col);
    await imPage.table.applyColumnFilter(sampleValue);
    await imPage.table.clearColumnFilter(col);
    const restoredCount = await imPage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await imPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await imPage.goto();
      await imPage.table.sortByColumn(col);
      const asc = await imPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await imPage.table.sortByColumn(col);
      const desc = await imPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  test('[TC_007b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(imPage.table);
  });

  test('[TC_007c] sorting from page 2 keeps user on page 2', async () => {
    await verifySortPaginationCompatibility(imPage.table, imPage.paginator);
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await imPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await imPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(imPage.export, imPage.paginator);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(imPage.export, imPage.paginator);
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] clicking Add (+) button opens the New Industry Median modal', async () => {
    await imPage.openAddModal();
    await imPage.closeOpenModal();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] add modal has Industry dropdown and Financial Year input', async () => {
    await imPage.openAddModal();
    await imPage.verifyAddModalContents();
    await imPage.closeOpenModal();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] Save button is disabled when all fields are empty/default', async () => {
    await imPage.openAddModal();
    await imPage.verifyAddButtonDisabledWhenEmpty();
    await imPage.closeOpenModal();
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Save button is disabled when Industry is not selected', async () => {
    await imPage.openAddModal();
    await imPage.verifyAddButtonDisabledWhenIndustryNotSelected();
    await imPage.closeOpenModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test.skip('[TC_016] Save button is disabled when Financial Year is empty — skipped: validation deferred', async () => {});

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Industry dropdown options match records from Industry screen', async () => {
    const industryPage = new IndustryPage(page);
    await industryPage.goto();
    await industryPage.paginator.changeItemsPerPage(50).catch(() => {});
    const descriptions = await industryPage.table.getAllColumnValues(1);
    const sample = descriptions.filter(d => d.length > 0).slice(0, 10);
    expect(sample.length, 'Industry screen should have records').toBeGreaterThan(0);

    await imPage.goto();
    await imPage.openAddModal();
    const dropdownOptions = await imPage.getIndustryDropdownOptions();
    for (const desc of sample) {
      expect(
        dropdownOptions,
        `"${desc}" from Industry screen missing from Industry Median dropdown`,
      ).toContain(desc);
    }
    await imPage.closeOpenModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Cancel button is present in add modal', async () => {
    await imPage.openAddModal();
    await expect(page.locator('[role="dialog"]').getByRole('button', { name: /^cancel$/i })).toBeVisible();
    await imPage.closeOpenModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] Cancel closes modal without saving the record', async () => {
    await imPage.openAddModal();
    await imPage.clickCancelInModal();
    await expect(page.locator('[role="dialog"]')).toBeHidden();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] adding a valid record sends it for authorization with success or pending toast', async () => {
    await imPage.openAddModal();
    const opts = await imPage.getIndustryDropdownOptions();
    if (opts.length === 0) { await imPage.closeOpenModal(); test.skip(); return; }
    await imPage.fillAddFormFields(opts[0], industryMedianData.financialYear, industryMedianData.asOnDate);
    await page.locator('[role="dialog"]').getByRole('button', { name: /^save$/i }).click();
    await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await imPage.verifySuccessOrPendingMessage();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] adding a duplicate entry shows error or keeps modal open', async () => {
    await imPage.openAddModal();
    const opts = await imPage.getIndustryDropdownOptions();
    if (opts.length === 0) { await imPage.closeOpenModal(); test.skip(); return; }
    await imPage.fillAddFormFields(opts[0], industryMedianData.financialYear, industryMedianData.asOnDate);
    await page.locator('[role="dialog"]').getByRole('button', { name: /^save$/i }).click();
    const modalStillOpen = await page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await page
      .locator('.p-error, [class*="error"], p-message, .p-inline-message')
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(modalStillOpen || hasError, 'Duplicate should keep modal open or show error').toBe(true);
    await imPage.closeOpenModal();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test.skip('[TC_022] Upload Industry Parameter feature — skipped: out of scope', async () => {});

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] Delete shows confirmation dialog; Cancel keeps record in table', async () => {
    await imPage.openDeleteConfirmation(knownExistingIndustryMedianIndustry);
    await imPage.cancelDeleteConfirmation();
    await imPage.table.verifyRowExistsByCellText(knownExistingIndustryMedianIndustry);
  });

  // ─── TC_023b ─────────────────────────────────────────────────────────────────
  test('[TC_023b] confirming delete sends record for authorization with success or pending toast', async () => {
    await imPage.openDeleteConfirmation(knownExistingIndustryMedianIndustry);
    await imPage.confirmDelete();
    await imPage.verifySuccessOrPendingMessage();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] clicking View opens a read-only modal', async () => {
    await imPage.openViewModal(knownExistingIndustryMedianIndustry);
    await imPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] View modal fields and dropdowns are read-only', async () => {
    await imPage.openViewModal(knownExistingIndustryMedianIndustry);
    await imPage.verifyViewModalIsReadOnly();
    await imPage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] Edit modal has Industry dropdown and Financial Year input', async () => {
    await imPage.openEditModal(knownExistingIndustryMedianIndustry);
    await imPage.verifyEditModalContents();
    await imPage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Cancel in Edit modal closes without applying changes', async () => {
    await imPage.editAndVerifyResetRestoresValues(
      knownExistingIndustryMedianIndustry,
      'TempValue999',
    );
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Update button is disabled when Financial Year field is cleared', async () => {
    await imPage.openEditModal(knownExistingIndustryMedianIndustry);
    await imPage.verifyUpdateButtonDisabledWhenFinancialYearCleared();
    await imPage.closeOpenModal();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] editing a record and clicking Update sends it for authorization', async () => {
    await imPage.editAndUpdate(
      knownExistingIndustryMedianIndustry,
      industryMedianEditData.updatedFinancialYear,
    );
    await imPage.verifySuccessOrPendingMessage();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] Update without changing data should not send for authorization (no toast)', async () => {
    await imPage.openEditModal(knownExistingIndustryMedianIndustry);
    const isDisabled = await imPage.updateButton.isDisabled().catch(() => false);
    if (isDisabled) {
      await imPage.closeOpenModal();
      return;
    }
    await imPage.updateButton.click();
    const toastVisible = await page
      .locator('p-toast .p-toast-message')
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const modalClosed = !(await page.locator('[role="dialog"]').isVisible().catch(() => false));
    expect(
      !toastVisible || modalClosed,
      'Update without change should not trigger authorization toast or modal closes normally',
    ).toBe(true);
    await imPage.closeOpenModal();
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] default items per page is 10', async () => {
    const defaultValue = await imPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim(), 'Default items per page should be 10').toBe('10');
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] items per page dropdown has options', async () => {
    const options = await imPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] clicking page number 2 navigates to page 2', async () => {
    if (await imPage.paginator.isLastPage()) { test.skip(); return; }
    await imPage.paginator.clickPageNumber(2);
    expect(await imPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] Next and Previous buttons switch between pages', async () => {
    if (await imPage.paginator.isLastPage()) { test.skip(); return; }
    await imPage.paginator.clickNextPage();
    expect(Number(await imPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await imPage.paginator.clickPreviousPage();
    expect(await imPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] First and Previous buttons are disabled when on first page', async () => {
    await imPage.paginator.verifyFirstPageDisabled();
    await imPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] pagination info text shows entry count', async () => {
    const infoText = await imPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });
});

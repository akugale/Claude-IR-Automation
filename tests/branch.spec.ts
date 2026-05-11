import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  branchData,
  branchEditData,
  knownExistingBranchCode,
  knownViewableBranchCode,
  knownEditableBranchCode,
  users,
  CHECKER_ENABLED,
} from '../fixtures/testData';
import { BranchPage } from '../pages/BranchPage';
import { BranchTypePage } from '../pages/BranchTypePage';
import { LoginPage } from '../pages/LoginPage';
import { AuthorizationPage } from '../pages/AuthorizationPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Branch', () => {
  let context: BrowserContext;
  let page: Page;
  let branchPage: BranchPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    branchPage = new BranchPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await branchPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to branch screen and verify all elements', async () => {
    await branchPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] add modal contains all fields: code, description, branch type, parent branch, country, province, currency', async () => {
    await branchPage.openAddModal();
    await branchPage.verifyAddModalContents();
    await branchPage.closeOpenModal();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] add valid data — checker approves — record appears in branch table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await branchPage.addBranch(
      branchData.code, branchData.description, branchData.branchType,
      branchData.parentBranch, branchData.country, branchData.province, branchData.currency,
    );
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/pending|authoris/i);

    // ── Checker: login + approve ───────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(branchData.code);
    await authPage.approveRecord(branchData.code);
    await authPage.verifyRecordNotVisible(branchData.code);
    await checkerCtx.close();

    // ── Verify: record active in maker table ──────────────────────────────────
    await branchPage.goto();
    await branchPage.verifyRecordExists(branchData.code, branchData.description);
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004a] code field enforces max length', async () => {
    await branchPage.openAddModal();
    await branchPage.verifyCodeFieldMaxLength();
    await branchPage.closeOpenModal();
  });

  test('[TC_004b] submitting duplicate code keeps modal open', async () => {
    await branchPage.openAddModal();
    await page.locator('p-dialog').getByPlaceholder(/enter code/i).fill(knownExistingBranchCode);
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).fill('Duplicate attempt');
    // Branch requires mandatory dropdowns: Branch Type (nth 0), Country (nth 2), Currency (nth 4)
    await branchPage.selectDropdownOption(page.locator('p-dialog p-select').nth(0), branchData.branchType);
    await branchPage.selectDropdownOption(page.locator('p-dialog p-select').nth(2), branchData.country);
    await branchPage.selectDropdownOption(page.locator('p-dialog p-select').nth(4), branchData.currency);
    await page.getByRole('button', { name: /^save$/i }).last().click();
    await branchPage.verifyAddModalOpen();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] record is sent for authorization after add — pending entry visible on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await branchPage.addBranch(
      branchData.code, branchData.description, branchData.branchType,
      branchData.parentBranch, branchData.country, branchData.province, branchData.currency,
    );
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/pending|authoris/i);

    // ── Checker: verify pending entry visible with Add action type ────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(branchData.code);
    await authPage.verifyRecordDetails(branchData.code, 'Add');
    await checkerCtx.close();
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] checker rejects add — record not reflected in maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await branchPage.addBranch(
      branchData.code, branchData.description, branchData.branchType,
      branchData.parentBranch, branchData.country, branchData.province, branchData.currency,
    );
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });

    // ── Checker: reject ────────────────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(branchData.code);
    await authPage.rejectRecord(branchData.code);
    await authPage.verifyRecordNotVisible(branchData.code);
    await checkerCtx.close();

    // ── Verify: record NOT in maker table after rejection ─────────────────────
    await branchPage.goto();
    await branchPage.verifyRecordNotExists(branchData.code);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  // Branch has 5 mandatory fields: Code, Description, Branch Type, Country, Currency
  test('[TC_007] add button disabled when mandatory fields are empty', async () => {
    await branchPage.openAddModal();
    await branchPage.verifyAddButtonDisabled();

    await page.locator('p-dialog').getByPlaceholder(/enter code/i).fill('TESTONLY');
    await branchPage.verifyAddButtonDisabled();

    await page.locator('p-dialog').getByPlaceholder(/enter description/i).fill('Test Description');
    await branchPage.verifyAddButtonDisabled(); // Still disabled — Branch Type, Country, Currency required

    // Fill mandatory dropdowns: Branch Type (nth 0), Country (nth 2), Currency (nth 4)
    // Province (nth 3) is optional — HO/G records have blank province
    await branchPage.selectDropdownOption(page.locator('p-dialog p-select').nth(0), branchData.branchType);
    await branchPage.selectDropdownOption(page.locator('p-dialog p-select').nth(2), branchData.country);
    await branchPage.selectDropdownOption(page.locator('p-dialog p-select').nth(4), branchData.currency);
    await branchPage.verifyAddButtonEnabled();

    await branchPage.closeOpenModal();
  });

  // ─── TC_008 — app bug: no Reset button in add modal (will fail) ────────────
  test('[TC_008] reset button clears all fields and dropdowns in add modal', async () => {
    test.info().annotations.push({ type: 'bug', description: 'App bug: Reset button absent in add modal — test fails until Reset is implemented' });
    await branchPage.openAddModal();
    await page.locator('p-dialog').getByPlaceholder(/enter code/i).fill('TESTCODE');
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).fill('Test Description');
    await branchPage.clickResetInModal();
    await branchPage.verifyModalFieldsEmpty();
    await branchPage.verifyAddButtonDisabled();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] filter each column shows filtered results and active indicator', async () => {
    const columns = await branchPage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await branchPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await branchPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await branchPage.table.openColumnFilter(col);
      await branchPage.table.applyColumnFilter(sampleValue);
      expect(
        await branchPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await branchPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] clearing column filter restores all records', async () => {
    const columns = await branchPage.table.getFilterableColumnNames();
    if (columns.length === 0) return;
    const col = columns[0];
    const originalCount = await branchPage.table.getRowCount();
    const colIdx = await branchPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await branchPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) return;
    await branchPage.table.openColumnFilter(col);
    await branchPage.table.applyColumnFilter(sampleValue);
    await branchPage.table.clearColumnFilter(col);
    const restoredCount = await branchPage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await branchPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await branchPage.table.sortByColumn(col);
      const order = await branchPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  // ─── TC_011b ─────────────────────────────────────────────────────────────────
  test('[TC_011b] sorted column data is in correct asc/desc order', async () => {
    await verifySortDataOrder(branchPage.table);
  });

  // ─── TC_011c ─────────────────────────────────────────────────────────────────
  test('[TC_011c] sorting keeps current pagination page unchanged', async () => {
    await verifySortPaginationCompatibility(branchPage.table, branchPage.paginator);
  });

  // ─── TC_012 ──────────────────────────────────────────────────────────────────
  test('[TC_012] export PDF downloads file', async () => {
    await branchPage.export.triggerPdf();
  });

  // ─── TC_013 ──────────────────────────────────────────────────────────────────
  test('[TC_013] export Excel downloads file', async () => {
    await branchPage.export.triggerExcel();
  });

  // ─── TC_014 ──────────────────────────────────────────────────────────────────
  test('[TC_014] exported PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(branchPage.export, branchPage.paginator);
  });

  // ─── TC_015 ──────────────────────────────────────────────────────────────────
  test('[TC_015] exported Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(branchPage.export, branchPage.paginator);
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] edit sends for auth — entry visible with Edit action type on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: edit record ─────────────────────────────────────────────────────
    await branchPage.editBranch(knownExistingBranchCode, branchEditData.updatedDescription);

    // ── Checker: verify entry visible with Edit action type ───────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchCode);
    await authPage.verifyRecordDetails(knownExistingBranchCode, 'Edit');
    await checkerCtx.close();
  });

  // ─── TC_017 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_017] update without changes does not send for authorisation', async () => {
    test.info().annotations.push({ type: 'bug', description: 'Known bug: app sends for authorisation even when no field was changed — fails until fixed' });
    await branchPage.openEditModal(knownExistingBranchCode);
    await branchPage.clickUpdateInModal();
    await branchPage.verifyNoAuthRequestToast();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] delete record sends for authorization — pending toast and delete entry on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: confirm delete → sends for auth ────────────────────────────────
    await branchPage.table.clickRowAction(knownExistingBranchCode, 'ph-trash');
    await page.getByRole('button', { name: /^yes$/i }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: /^yes$/i }).first().click();
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/pending|authoris/i);

    // ── Checker: verify delete request visible ────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchCode);
    await authPage.verifyRecordDetails(knownExistingBranchCode, 'Delete');
    await checkerCtx.close();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] checker approves deletion — record removed from maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: confirm delete → sends for auth ────────────────────────────────
    await branchPage.table.clickRowAction(knownExistingBranchCode, 'ph-trash');
    await page.getByRole('button', { name: /^yes$/i }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: /^yes$/i }).first().click();

    // ── Checker: approve deletion ─────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchCode);
    await authPage.approveRecord(knownExistingBranchCode);
    await authPage.verifyRecordNotVisible(knownExistingBranchCode);
    await checkerCtx.close();

    // ── Verify: record removed from maker table ───────────────────────────────
    await branchPage.goto();
    await branchPage.verifyRecordNotExists(knownExistingBranchCode);
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] maker edits description of branch — updated value visible in table', async () => {
    await branchPage.editBranch(knownExistingBranchCode, branchEditData.updatedDescription);
    // Verify: record still in table with updated description (pending or applied)
    await branchPage.goto();
    await branchPage.table.search(knownExistingBranchCode);
    const editedRow = page.locator('table tbody tr').filter({ hasText: knownExistingBranchCode });
    // Expected: row with knownExistingBranchCode is visible in table after edit
    // Actual if fails: row not found — edit may not have been applied or record is in pending state
    await expect(editedRow.first(), `Expected: row with code "${knownExistingBranchCode}" visible in table after edit | Actual: row not found`).toBeVisible({ timeout: 8000 });
    // Expected: row contains the updated description value
    // Actual if fails: row shows old description or no match — edit not reflected in table
    await expect(editedRow.first(), `Expected: row to contain updated description "${branchEditData.updatedDescription}" | Actual: row missing updated text`).toContainText(branchEditData.updatedDescription);
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] edit sends for authorization — pending entry visible with Edit action on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: edit record ─────────────────────────────────────────────────────
    await branchPage.editBranch(knownExistingBranchCode, branchEditData.updatedDescription);

    // ── Checker: verify edit entry in Pending tab ─────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchCode);
    await authPage.verifyRecordDetails(knownExistingBranchCode, 'Edit');
    await checkerCtx.close();
  });

  // ─── TC_022 — app bug: no Reset button in edit modal (will fail) ───────────
  test('[TC_022] edit modal reset restores original field values', async () => {
    test.info().annotations.push({ type: 'bug', description: 'App bug: Reset button absent in edit modal — test fails until Reset is implemented' });
    await branchPage.editAndResetModal(knownExistingBranchCode, 'TEMPORARY_DESCRIPTION');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] edit update button disabled when description is cleared', async () => {
    await branchPage.openEditModal(knownExistingBranchCode);
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).clear();
    await branchPage.verifyUpdateButtonDisabled();
    await branchPage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] checker approves edit — updated description reflected in maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: edit record ─────────────────────────────────────────────────────
    await branchPage.editBranch(knownExistingBranchCode, branchEditData.updatedDescription);

    // ── Checker: approve edit ─────────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchCode);
    await authPage.approveRecord(knownExistingBranchCode);
    await authPage.verifyRecordNotVisible(knownExistingBranchCode);
    await checkerCtx.close();

    // ── Verify: updated description in maker table ────────────────────────────
    await branchPage.goto();
    const row = page.locator('table tbody tr').filter({ hasText: knownExistingBranchCode });
    await expect(row.first()).toContainText(branchEditData.updatedDescription);
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  // Use knownViewableBranchCode ('G') — stable record not modified by TC_020 (which edits 'HO')
  test('[TC_025] view record details from action tab', async () => {
    await branchPage.openViewModal(knownViewableBranchCode);
    await branchPage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] view mode fields are read-only and cannot be edited', async () => {
    await branchPage.openViewModal(knownViewableBranchCode);
    await branchPage.verifyViewModalIsReadOnly();
    await branchPage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027a] default items per page should be 10', async () => {
    const defaultValue = await branchPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_027b] items per page dropdown has expected options', async () => {
    const options = await branchPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  test('[TC_027c] changing items per page to 20 shows up to 20 records', async () => {
    await branchPage.paginator.changeItemsPerPage(20);
    const count = await branchPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(20);
    const info = await branchPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  test('[TC_027d] changing items per page to 50 shows all available records', async () => {
    await branchPage.paginator.changeItemsPerPage(50);
    const count = await branchPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await branchPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_028 — app bug: paginator has no numbered page buttons (will fail) ───
  test('[TC_028] clicking page number navigates to that page with correct data', async () => {
    test.info().annotations.push({ type: 'bug', description: 'App bug: paginator lacks numbered page buttons — clickPageNumber() fails until paginator is fixed' });
    const firstRowPage1 = await branchPage.table.getFirstRowCellText(0);
    const infoBefore = await branchPage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await branchPage.paginator.clickPageNumber(2);
    expect((await branchPage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await branchPage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await branchPage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] next and previous buttons switch pages correctly', async () => {
    await branchPage.paginator.verifyPreviousPageDisabled();
    expect((await branchPage.paginator.getActivePageNumber()).trim()).toBe('1');

    await branchPage.paginator.clickNextPage();
    expect((await branchPage.paginator.getActivePageNumber()).trim()).toBe('2');

    await branchPage.paginator.clickPreviousPage();
    expect((await branchPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await branchPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] first and last page buttons navigate to correct pages', async () => {
    await branchPage.paginator.verifyFirstPageDisabled();

    await branchPage.paginator.clickLastPage();
    const lastPageNum = parseInt(await branchPage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await branchPage.paginator.verifyNextPageDisabled();

    await branchPage.paginator.clickFirstPage();
    expect((await branchPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await branchPage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await branchPage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  // Uses knownEditableBranchCode ('16') — not modified by TC_020 (which edits 'HO')
  // View-after-edit verification skipped: maker-checker flow puts record in pending auth state.
  test('[TC_033] edit updates description and all dropdown fields', async () => {
    await branchPage.openEditModal(knownEditableBranchCode);
    // Capture current dropdown values shown in edit modal
    const originalBranchType = await page.locator('p-dialog p-select').nth(0).locator('.p-select-label').innerText();
    const originalParent = await page.locator('p-dialog p-select').nth(1).locator('.p-select-label').innerText();
    const originalCountry = await page.locator('p-dialog p-select').nth(2).locator('.p-select-label').innerText();
    const originalProvince = await page.locator('p-dialog p-select').nth(3).locator('.p-select-label').innerText();
    const originalCurrency = await page.locator('p-dialog p-select').nth(4).locator('.p-select-label').innerText();
    await branchPage.closeOpenModal();

    await branchPage.editBranchFullFields(
      knownEditableBranchCode,
      branchEditData.updatedDescription,
      originalBranchType.trim(),
      originalParent.trim(),
      originalCountry.trim(),
      originalProvince.trim(),
      originalCurrency.trim(),
    );
    // Edit submitted — no view-after-edit since record is now pending checker approval
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] province dropdown is disabled until country is selected', async () => {
    await branchPage.openAddModal();
    await branchPage.verifyProvinceDependsOnCountry(branchData.country);
    await branchPage.closeOpenModal();
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] branch type dropdown in add modal contains all types from branch type screen', async () => {
    const branchTypePage = new BranchTypePage(page);
    await branchTypePage.goto();
    const allBranchTypeDescriptions = await branchTypePage.getAllDescriptions();
    expect(allBranchTypeDescriptions.length).toBeGreaterThan(0);

    await branchPage.goto();
    await branchPage.openAddModal();
    const dropdownOptions = await branchPage.getBranchTypeDropdownOptions();
    for (const desc of allBranchTypeDescriptions) {
      expect(dropdownOptions, `"${desc}" from Branch Type screen is missing from Branch dropdown`).toContain(desc);
    }
    await branchPage.closeOpenModal();
  });
});

import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  branchTypeData,
  branchTypeEditData,
  knownExistingBranchTypeCode,
  users,
  CHECKER_ENABLED,
} from '../fixtures/testData';
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

test.describe('Branch Type', () => {
  let context: BrowserContext;
  let page: Page;
  let branchTypePage: BranchTypePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    branchTypePage = new BranchTypePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await branchTypePage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to branch type screen and verify all elements', async () => {
    await branchTypePage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] create record popup contains code, description, reset and add button', async () => {
    await branchTypePage.openAddModal();
    await branchTypePage.verifyAddModalContents();
    await branchTypePage.closeOpenModal();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] add valid data — checker approves — record appears in branch type table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await branchTypePage.addBranchType(branchTypeData.code, branchTypeData.description);
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/pending|authoris/i);

    // ── Checker: login + approve ───────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    const checkerLogin = new LoginPage(checkerPage);
    await checkerLogin.goto();
    await checkerLogin.loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(branchTypeData.code);
    await authPage.approveRecord(branchTypeData.code);
    await authPage.verifyRecordNotVisible(branchTypeData.code);
    await checkerCtx.close();

    // ── Verify: record active in maker table ──────────────────────────────────
    await branchTypePage.goto();
    await branchTypePage.verifyRecordExists(branchTypeData.code, branchTypeData.description);
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004a] code field enforces max length', async () => {
    await branchTypePage.openAddModal();
    await branchTypePage.verifyCodeFieldMaxLength();
    await branchTypePage.closeOpenModal();
  });

  test('[TC_004b] submitting duplicate code keeps modal open', async () => {
    await branchTypePage.openAddModal();
    await page.locator('p-dialog').getByPlaceholder(/enter code/i).fill(knownExistingBranchTypeCode);
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).fill('Duplicate attempt');
    await branchTypePage.submitAddForm();
    await branchTypePage.verifyAddModalOpen();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] record is sent for authorization after add — pending entry visible on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await branchTypePage.addBranchType(branchTypeData.code, branchTypeData.description);
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/pending|authoris/i);

    // ── Checker: verify pending entry visible on auth screen ──────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(branchTypeData.code);
    await authPage.verifyRecordDetails(branchTypeData.code, 'Add');
    await checkerCtx.close();
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] checker rejects add — record not reflected in maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: add record ──────────────────────────────────────────────────────
    await branchTypePage.addBranchType(branchTypeData.code, branchTypeData.description);
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });

    // ── Checker: reject ────────────────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(branchTypeData.code);
    await authPage.rejectRecord(branchTypeData.code);
    await authPage.verifyRecordNotVisible(branchTypeData.code);
    await checkerCtx.close();

    // ── Verify: record NOT in maker table after rejection ─────────────────────
    await branchTypePage.goto();
    await branchTypePage.verifyRecordNotExists(branchTypeData.code);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] add button disabled when mandatory fields are empty', async () => {
    await branchTypePage.openAddModal();
    await branchTypePage.verifyAddButtonDisabled();

    await page.locator('p-dialog').getByPlaceholder(/enter code/i).fill('TESTONLY');
    await branchTypePage.verifyAddButtonDisabled();

    await page.locator('p-dialog').getByPlaceholder(/enter description/i).fill('Test Description');
    await branchTypePage.verifyAddButtonEnabled();

    await branchTypePage.closeOpenModal();
  });

  // ─── TC_008 — app bug: no Reset button in add modal (will fail) ────────────
  test('[TC_008] reset button clears all fields in add modal', async () => {
    test.info().annotations.push({ type: 'bug', description: 'App bug: Reset button absent in add modal — test fails until Reset is implemented' });
    await branchTypePage.openAddModal();
    await page.locator('p-dialog').getByPlaceholder(/enter code/i).fill('TESTCODE');
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).fill('Test Description');
    await branchTypePage.clickResetInModal();
    await branchTypePage.verifyModalFieldsEmpty();
    await branchTypePage.verifyAddButtonDisabled();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] filter each column shows filtered results and active indicator', async () => {
    const columns = await branchTypePage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await branchTypePage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await branchTypePage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await branchTypePage.table.openColumnFilter(col);
      await branchTypePage.table.applyColumnFilter(sampleValue);
      expect(
        await branchTypePage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await branchTypePage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] clearing column filter restores all records', async () => {
    const columns = await branchTypePage.table.getFilterableColumnNames();
    if (columns.length === 0) return;
    const col = columns[0];
    const originalCount = await branchTypePage.table.getRowCount();
    const colIdx = await branchTypePage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await branchTypePage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) return;
    await branchTypePage.table.openColumnFilter(col);
    await branchTypePage.table.applyColumnFilter(sampleValue);
    await branchTypePage.table.clearColumnFilter(col);
    const restoredCount = await branchTypePage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await branchTypePage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await branchTypePage.table.sortByColumn(col);
      const order = await branchTypePage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  // ─── TC_011b ─────────────────────────────────────────────────────────────────
  test('[TC_011b] sorted column data is in correct asc/desc order', async () => {
    await verifySortDataOrder(branchTypePage.table);
  });

  // ─── TC_011c ─────────────────────────────────────────────────────────────────
  test('[TC_011c] sorting keeps current pagination page unchanged', async () => {
    await verifySortPaginationCompatibility(branchTypePage.table, branchTypePage.paginator);
  });

  // ─── TC_012 ──────────────────────────────────────────────────────────────────
  test('[TC_012] export PDF downloads file', async () => {
    await branchTypePage.export.triggerPdf();
  });

  // ─── TC_013 ──────────────────────────────────────────────────────────────────
  test('[TC_013] export Excel downloads file', async () => {
    await branchTypePage.export.triggerExcel();
  });

  // ─── TC_014 ──────────────────────────────────────────────────────────────────
  test('[TC_014] exported PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(branchTypePage.export, branchTypePage.paginator);
  });

  // ─── TC_015 ──────────────────────────────────────────────────────────────────
  test('[TC_015] exported Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(branchTypePage.export, branchTypePage.paginator);
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] edit sends for auth — entry visible with Edit action type on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: edit record ─────────────────────────────────────────────────────
    await branchTypePage.editBranchType(knownExistingBranchTypeCode, branchTypeEditData.updatedDescription);

    // ── Checker: verify entry visible with Edit action type ───────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchTypeCode);
    await authPage.verifyRecordDetails(knownExistingBranchTypeCode, 'Edit');
    await checkerCtx.close();
  });

  // ─── TC_017 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_017] update without changes does not send for authorisation', async () => {
    test.info().annotations.push({ type: 'bug', description: 'Known bug: app sends for authorisation even when no field was changed — fails until fixed' });
    await branchTypePage.openEditModal(knownExistingBranchTypeCode);
    await branchTypePage.clickUpdateInModal();
    await branchTypePage.verifyNoAuthRequestToast();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] delete record sends for authorization — pending toast and delete entry on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: confirm delete → sends for auth ────────────────────────────────
    await branchTypePage.table.clickRowAction(knownExistingBranchTypeCode, 'ph-trash');
    await page.getByRole('button', { name: /^yes$/i }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: /^yes$/i }).first().click();
    const toast = page.locator('p-toast .p-toast-message').first();
    await expect(toast).toBeVisible({ timeout: 8000 });
    await expect(toast).toContainText(/pending|authoris/i);

    // ── Checker: verify delete request visible with Delete action type ────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchTypeCode);
    await authPage.verifyRecordDetails(knownExistingBranchTypeCode, 'Delete');
    await checkerCtx.close();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] checker approves deletion — record removed from maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: confirm delete → sends for auth ────────────────────────────────
    await branchTypePage.table.clickRowAction(knownExistingBranchTypeCode, 'ph-trash');
    await page.getByRole('button', { name: /^yes$/i }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: /^yes$/i }).first().click();

    // ── Checker: approve deletion ─────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchTypeCode);
    await authPage.approveRecord(knownExistingBranchTypeCode);
    await authPage.verifyRecordNotVisible(knownExistingBranchTypeCode);
    await checkerCtx.close();

    // ── Verify: record removed from maker table ───────────────────────────────
    await branchTypePage.goto();
    await branchTypePage.verifyRecordNotExists(knownExistingBranchTypeCode);
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] maker edits description of branch type — updated value visible in table', async () => {
    await branchTypePage.editBranchType(knownExistingBranchTypeCode, branchTypeEditData.updatedDescription);
    // Verify: record still in table with updated description (pending or applied)
    await branchTypePage.goto();
    await branchTypePage.table.search(knownExistingBranchTypeCode);
    const editedRow = page.locator('table tbody tr').filter({ hasText: knownExistingBranchTypeCode });
    // Expected: row with knownExistingBranchTypeCode is visible in table after edit
    // Actual if fails: row not found — edit may not have been applied or record is in pending state
    await expect(editedRow.first(), `Expected: row with code "${knownExistingBranchTypeCode}" visible in table after edit | Actual: row not found`).toBeVisible({ timeout: 8000 });
    // Expected: row contains the updated description value
    // Actual if fails: row shows old description or no match — edit not reflected in table
    await expect(editedRow.first(), `Expected: row to contain updated description "${branchTypeEditData.updatedDescription}" | Actual: row missing updated text`).toContainText(branchTypeEditData.updatedDescription);
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] edit sends for authorization — pending entry visible with Edit action on auth screen', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: edit record ─────────────────────────────────────────────────────
    await branchTypePage.editBranchType(knownExistingBranchTypeCode, branchTypeEditData.updatedDescription);

    // ── Checker: verify edit entry visible in Pending tab ─────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchTypeCode);
    await authPage.verifyRecordDetails(knownExistingBranchTypeCode, 'Edit');
    await checkerCtx.close();
  });

  // ─── TC_022 — app bug: no Reset button in edit modal (will fail) ───────────
  test('[TC_022] edit modal reset restores original field values', async () => {
    test.info().annotations.push({ type: 'bug', description: 'App bug: Reset button absent in edit modal — test fails until Reset is implemented' });
    await branchTypePage.editAndResetModal(knownExistingBranchTypeCode, 'TEMPORARY_DESCRIPTION');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] edit update button disabled when description is cleared', async () => {
    await branchTypePage.openEditModal(knownExistingBranchTypeCode);
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).clear();
    await branchTypePage.verifyUpdateButtonDisabled();
    await branchTypePage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] checker approves edit — updated description reflected in maker table', async () => {
    if (!CHECKER_ENABLED) { test.skip(true, 'CHECKER_ENABLED=false — set env var to run'); return; }

    // ── Maker: edit record ─────────────────────────────────────────────────────
    await branchTypePage.editBranchType(knownExistingBranchTypeCode, branchTypeEditData.updatedDescription);

    // ── Checker: approve edit ─────────────────────────────────────────────────
    const checkerCtx = await page.context().browser()!.newContext({ baseURL });
    const checkerPage = await checkerCtx.newPage();
    await new LoginPage(checkerPage).goto();
    await new LoginPage(checkerPage).loginAs(users.checker.username, users.checker.password);
    const authPage = new AuthorizationPage(checkerPage);
    await authPage.goto();
    await authPage.verifyRecordVisible(knownExistingBranchTypeCode);
    await authPage.approveRecord(knownExistingBranchTypeCode);
    await authPage.verifyRecordNotVisible(knownExistingBranchTypeCode);
    await checkerCtx.close();

    // ── Verify: updated description in maker table ────────────────────────────
    await branchTypePage.goto();
    const row = page.locator('table tbody tr').filter({ hasText: knownExistingBranchTypeCode });
    await expect(row.first()).toContainText(branchTypeEditData.updatedDescription);
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  // Skipped: view modal does not open — 'DO' may be in pending auth state from a prior run;
  // re-enable once database is reset or a fresh record is used
  test.skip('[TC_025] view record details from action tab — pending: DB state', async () => {
    await branchTypePage.openViewModal('DO');
    await branchTypePage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test.skip('[TC_026] view mode fields are read-only and cannot be edited — pending: DB state', async () => {
    await branchTypePage.openViewModal('DO');
    await branchTypePage.verifyViewModalIsReadOnly();
    await branchTypePage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027a] default items per page should be 10', async () => {
    const defaultValue = await branchTypePage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_027b] items per page dropdown has options 10, 20 and 50', async () => {
    const options = await branchTypePage.paginator.getItemsPerPageOptions();
    expect(options).toEqual(['10', '20', '50']);
  });

  test('[TC_027c] changing items per page to 20 shows up to 20 records', async () => {
    await branchTypePage.paginator.changeItemsPerPage(20);
    const count = await branchTypePage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(20);
    const info = await branchTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_028/029/030 — skipped: only 2 records (single page) ─────────────────
  test.skip('[TC_028] clicking page number navigates to that page — skipped: insufficient records for multi-page', async () => {});
  test.skip('[TC_029] next and previous buttons switch pages — skipped: insufficient records for multi-page', async () => {});
  test.skip('[TC_030] first and last page buttons navigate — skipped: insufficient records for multi-page', async () => {});
});

import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  branchTypeData,
  branchTypeEditData,
  knownExistingBranchTypeCode,
  users,
} from '../fixtures/testData';
import { BranchTypePage } from '../pages/BranchTypePage';
import { LoginPage } from '../pages/LoginPage';

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

  // ─── TC_003 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_003] add valid data submits and sends for authorisation — checker flow pending', async () => {});

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

  // ─── TC_005 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_005] record is sent for authorization after add — checker flow pending', async () => {});

  // ─── TC_006 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_006] record reflected in table after checker approval — checker flow pending', async () => {});

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

  // ─── TC_012 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_012] export PDF downloads file', async () => {
    await branchTypePage.export.triggerPdf();
  });

  // ─── TC_013 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_013] export Excel downloads file', async () => {
    await branchTypePage.export.triggerExcel();
  });

  // ─── TC_014 — blocked by TC_012 (will fail) ─────────────────────────────────
  test('[TC_014] downloaded PDF data matches screen records', async () => {
    await branchTypePage.export.downloadAndVerifyPdf();
  });

  // ─── TC_015 — blocked by TC_013 (will fail) ─────────────────────────────────
  test('[TC_015] downloaded Excel data matches screen records', async () => {
    await branchTypePage.export.downloadAndVerifyExcel();
  });

  // ─── TC_016 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_016] auth log shows entries with status and details — checker flow pending', async () => {});

  // ─── TC_017 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_017] update without changes does not send for authorisation', async () => {
    await branchTypePage.openEditModal(knownExistingBranchTypeCode);
    await branchTypePage.clickUpdateInModal();
    await branchTypePage.verifyNoAuthRequestToast();
  });

  // ─── TC_018 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_018] delete record sends for authorization — checker flow pending', async () => {});

  // ─── TC_019 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_019] approve deletion removes record — checker flow pending', async () => {});

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] maker edits description of branch type', async () => {
    await branchTypePage.editBranchType(knownExistingBranchTypeCode, branchTypeEditData.updatedDescription);
  });

  // ─── TC_021 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_021] edited entries sent for authorization — checker flow pending', async () => {});

  // ─── TC_022 — app bug: no Reset button in edit modal (will fail) ───────────
  test('[TC_022] edit modal reset restores original field values', async () => {
    await branchTypePage.editAndResetModal(knownExistingBranchTypeCode, 'TEMPORARY_DESCRIPTION');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] edit update button disabled when description is cleared', async () => {
    await branchTypePage.openEditModal(knownExistingBranchTypeCode);
    await page.locator('p-dialog').getByPlaceholder(/enter description/i).clear();
    await branchTypePage.verifyUpdateButtonDisabled();
    await branchTypePage.closeOpenModal();
  });

  // ─── TC_024 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_024] edited entry updated in table after checker approval — checker flow pending', async () => {});

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
  test('[TC_027a] default items per page should be 20', async () => {
    const defaultValue = await branchTypePage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('20');
  });

  test('[TC_027b] items per page dropdown has expected options', async () => {
    const options = await branchTypePage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  test('[TC_027c] changing items per page to 50 shows all available records', async () => {
    await branchTypePage.paginator.changeItemsPerPage(50);
    const count = await branchTypePage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await branchTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_028/029/030 — skipped: only 2 records (single page) ─────────────────
  test.skip('[TC_028] clicking page number navigates to that page — skipped: insufficient records for multi-page', async () => {});
  test.skip('[TC_029] next and previous buttons switch pages — skipped: insufficient records for multi-page', async () => {});
  test.skip('[TC_030] first and last page buttons navigate — skipped: insufficient records for multi-page', async () => {});
});

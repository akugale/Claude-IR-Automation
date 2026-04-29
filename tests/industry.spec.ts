import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingIndustryCode,
  users,
} from '../fixtures/testData';
import { IndustryPage } from '../pages/IndustryPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Industry', () => {
  let context: BrowserContext;
  let page: Page;
  let industryPage: IndustryPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    industryPage = new IndustryPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await industryPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to industry screen and verify all elements', async () => {
    await industryPage.verifyScreenElements();
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] filter each column shows filtered results and active indicator', async () => {
    const columns = await industryPage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await industryPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await industryPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await industryPage.table.openColumnFilter(col);
      await industryPage.table.applyColumnFilter(sampleValue);
      expect(
        await industryPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await industryPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] clearing column filter restores all records', async () => {
    const columns = await industryPage.table.getFilterableColumnNames();
    if (columns.length === 0) return;
    const col = columns[0];
    const originalCount = await industryPage.table.getRowCount();
    const colIdx = await industryPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await industryPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) return;
    await industryPage.table.openColumnFilter(col);
    await industryPage.table.applyColumnFilter(sampleValue);
    await industryPage.table.clearColumnFilter(col);
    const restoredCount = await industryPage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_009 ──────────────────────────────────────────────────────────────────
  test('[TC_009] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await industryPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await industryPage.table.sortByColumn(col);
      const order = await industryPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  test('[TC_009b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(industryPage.table);
  });

  test('[TC_009c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
    await verifySortPaginationCompatibility(industryPage.table, industryPage.paginator);
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await industryPage.export.triggerPdf();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await industryPage.export.triggerExcel();
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(industryPage.export, industryPage.paginator);
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(industryPage.export, industryPage.paginator);
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] view record details from action tab', async () => {
    await industryPage.openViewModal(knownExistingIndustryCode);
    await industryPage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] view mode fields are read-only and cannot be edited', async () => {
    await industryPage.openViewModal(knownExistingIndustryCode);
    await industryPage.verifyViewModalIsReadOnly();
    await industryPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 10', async () => {
    const defaultValue = await industryPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_025b] items per page dropdown has options 10, 20 and 50', async () => {
    const options = await industryPage.paginator.getItemsPerPageOptions();
    expect(options).toEqual(['10', '20', '50']);
  });

  test('[TC_025c] changing items per page to 20 shows 20 records', async () => {
    await industryPage.paginator.changeItemsPerPage(20);
    const count = await industryPage.table.getRowCount();
    expect(count).toBe(20);
    const info = await industryPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 20/);
  });

  test('[TC_025d] changing items per page to 50 shows up to 50 records', async () => {
    await industryPage.paginator.changeItemsPerPage(50);
    const count = await industryPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await industryPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 50|Showing 1 - \d+/);
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] clicking page number navigates to that page with correct data', async () => {
    const firstRowPage1 = await industryPage.table.getFirstRowCellText(0);
    const infoBefore = await industryPage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await industryPage.paginator.clickPageNumber(2);
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await industryPage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await industryPage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] next and previous buttons switch pages correctly', async () => {
    await industryPage.paginator.verifyPreviousPageDisabled();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('1');

    await industryPage.paginator.clickNextPage();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('2');

    await industryPage.paginator.clickPreviousPage();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await industryPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] first and last page buttons navigate to correct pages', async () => {
    await industryPage.paginator.verifyFirstPageDisabled();

    await industryPage.paginator.clickLastPage();
    const lastPageNum = parseInt(await industryPage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await industryPage.paginator.verifyNextPageDisabled();

    await industryPage.paginator.clickFirstPage();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await industryPage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await industryPage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });
});

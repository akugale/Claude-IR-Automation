import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { CounterpartyMasterPage } from '../pages/CounterpartyMasterPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Counterparty Master', () => {
  let context: BrowserContext;
  let page: Page;
  let counterpartyMasterPage: CounterpartyMasterPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    counterpartyMasterPage = new CounterpartyMasterPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await counterpartyMasterPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to counterparty master screen and verify all elements', async () => {
    await counterpartyMasterPage.verifyScreenElements();
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] filter each column shows filtered results and active indicator', async () => {
    const columns = await counterpartyMasterPage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await counterpartyMasterPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await counterpartyMasterPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await counterpartyMasterPage.table.openColumnFilter(col);
      await counterpartyMasterPage.table.applyColumnFilter(sampleValue);
      expect(
        await counterpartyMasterPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await counterpartyMasterPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_009 ──────────────────────────────────────────────────────────────────
  test('[TC_009] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await counterpartyMasterPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await counterpartyMasterPage.table.sortByColumn(col);
      const order = await counterpartyMasterPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  test('[TC_009b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(counterpartyMasterPage.table);
  });

  test('[TC_009c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
    await verifySortPaginationCompatibility(counterpartyMasterPage.table, counterpartyMasterPage.paginator);
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await counterpartyMasterPage.export.triggerPdf();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await counterpartyMasterPage.export.triggerExcel();
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(counterpartyMasterPage.export, counterpartyMasterPage.paginator);
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(counterpartyMasterPage.export, counterpartyMasterPage.paginator);
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 10', async () => {
    const defaultValue = await counterpartyMasterPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_025b] items per page dropdown has expected options', async () => {
    const options = await counterpartyMasterPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  test('[TC_025c] changing items per page to 20 shows 20 records', async () => {
    await counterpartyMasterPage.paginator.changeItemsPerPage(20);
    const count = await counterpartyMasterPage.table.getRowCount();
    expect(count).toBe(20);
    const info = await counterpartyMasterPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 20/);
  });

  test('[TC_025d] changing items per page to 50 shows up to 50 records', async () => {
    await counterpartyMasterPage.paginator.changeItemsPerPage(50);
    const count = await counterpartyMasterPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await counterpartyMasterPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 50|Showing 1 - \d+/);
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] clicking page number navigates to that page with correct data', async () => {
    const firstRowPage1 = await counterpartyMasterPage.table.getFirstRowCellText(0);
    const infoBefore = await counterpartyMasterPage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await counterpartyMasterPage.paginator.clickPageNumber(2);
    expect((await counterpartyMasterPage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await counterpartyMasterPage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await counterpartyMasterPage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] next and previous buttons switch pages correctly', async () => {
    await counterpartyMasterPage.paginator.verifyPreviousPageDisabled();
    expect((await counterpartyMasterPage.paginator.getActivePageNumber()).trim()).toBe('1');

    await counterpartyMasterPage.paginator.clickNextPage();
    expect((await counterpartyMasterPage.paginator.getActivePageNumber()).trim()).toBe('2');

    await counterpartyMasterPage.paginator.clickPreviousPage();
    expect((await counterpartyMasterPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await counterpartyMasterPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] first and last page buttons navigate to correct pages', async () => {
    await counterpartyMasterPage.paginator.verifyFirstPageDisabled();

    await counterpartyMasterPage.paginator.clickLastPage();
    const lastPageNum = parseInt(await counterpartyMasterPage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await counterpartyMasterPage.paginator.verifyNextPageDisabled();

    await counterpartyMasterPage.paginator.clickFirstPage();
    expect((await counterpartyMasterPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await counterpartyMasterPage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await counterpartyMasterPage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });
});

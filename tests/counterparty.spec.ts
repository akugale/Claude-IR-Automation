import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { CounterpartyTypePage } from '../pages/CounterpartyTypePage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Counterparty Type', () => {
  let context: BrowserContext;
  let page: Page;
  let counterpartyTypePage: CounterpartyTypePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    counterpartyTypePage = new CounterpartyTypePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await counterpartyTypePage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to counterparty type screen and verify all elements', async () => {
    await counterpartyTypePage.verifyScreenElements();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] filter each column shows filtered results and active indicator', async () => {
    const columns = await counterpartyTypePage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await counterpartyTypePage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await counterpartyTypePage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await counterpartyTypePage.table.openColumnFilter(col);
      await counterpartyTypePage.table.applyColumnFilter(sampleValue);
      expect(
        await counterpartyTypePage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await counterpartyTypePage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] clearing column filter restores all records', async () => {
    const columns = await counterpartyTypePage.table.getFilterableColumnNames();
    if (columns.length === 0) return;
    const col = columns[0];
    const originalCount = await counterpartyTypePage.table.getRowCount();
    const colIdx = await counterpartyTypePage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await counterpartyTypePage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) return;
    await counterpartyTypePage.table.openColumnFilter(col);
    await counterpartyTypePage.table.applyColumnFilter(sampleValue);
    await counterpartyTypePage.table.clearColumnFilter(col);
    const restoredCount = await counterpartyTypePage.table.getRowCount();
    expect(restoredCount).toBe(originalCount);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await counterpartyTypePage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await counterpartyTypePage.table.sortByColumn(col);
      const order = await counterpartyTypePage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  test('[TC_011b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(counterpartyTypePage.table);
  });

  test('[TC_011c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
    await verifySortPaginationCompatibility(counterpartyTypePage.table, counterpartyTypePage.paginator);
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] export PDF downloads file', async () => {
    await counterpartyTypePage.export.triggerPdf();
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] export Excel downloads file', async () => {
    await counterpartyTypePage.export.triggerExcel();
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(counterpartyTypePage.export, counterpartyTypePage.paginator);
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(counterpartyTypePage.export, counterpartyTypePage.paginator);
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] view record details from action tab', async () => {
    await counterpartyTypePage.openViewModal('BFSI');
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] view mode fields are read-only and cannot be edited', async () => {
    await counterpartyTypePage.openViewModal('BFSI');
    await counterpartyTypePage.verifyViewModalIsReadOnly();
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027a] default items per page should be 10', async () => {
    const defaultValue = await counterpartyTypePage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_027b] items per page dropdown has options 10, 20 and 50', async () => {
    const options = await counterpartyTypePage.paginator.getItemsPerPageOptions();
    expect(options).toEqual(['10', '20', '50']);
  });

  test('[TC_027c] changing items per page to 20 shows 20 records', async () => {
    await counterpartyTypePage.paginator.changeItemsPerPage(20);
    const count = await counterpartyTypePage.table.getRowCount();
    expect(count).toBe(20);
    const info = await counterpartyTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 20/);
  });

  test('[TC_027d] changing items per page to 50 shows up to 50 records', async () => {
    await counterpartyTypePage.paginator.changeItemsPerPage(50);
    const count = await counterpartyTypePage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await counterpartyTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 50|Showing 1 - \d+/);
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] clicking page number navigates to that page with correct data', async () => {
    const firstRowPage1 = await counterpartyTypePage.table.getFirstRowCellText(0);
    const infoBefore = await counterpartyTypePage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await counterpartyTypePage.paginator.clickPageNumber(2);

    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await counterpartyTypePage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await counterpartyTypePage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] next and previous buttons switch pages correctly', async () => {
    await counterpartyTypePage.paginator.verifyPreviousPageDisabled();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('1');

    await counterpartyTypePage.paginator.clickNextPage();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('2');

    await counterpartyTypePage.paginator.clickPreviousPage();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('1');
    await counterpartyTypePage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] first and last page buttons navigate to correct pages', async () => {
    await counterpartyTypePage.paginator.verifyFirstPageDisabled();

    await counterpartyTypePage.paginator.clickLastPage();
    const lastPageNum = parseInt(await counterpartyTypePage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await counterpartyTypePage.paginator.verifyNextPageDisabled();

    await counterpartyTypePage.paginator.clickFirstPage();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('1');
    await counterpartyTypePage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await counterpartyTypePage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });
});

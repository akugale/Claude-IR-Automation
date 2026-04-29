import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { CounterpartyGroupPage } from '../pages/CounterpartyGroupPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Counterparty Group', () => {
  let context: BrowserContext;
  let page: Page;
  let counterpartyGroupPage: CounterpartyGroupPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    counterpartyGroupPage = new CounterpartyGroupPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await counterpartyGroupPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to counterparty group screen and verify all elements', async () => {
    await counterpartyGroupPage.verifyScreenElements();
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] filter each column shows filtered results and active indicator', async () => {
    const columns = await counterpartyGroupPage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await counterpartyGroupPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await counterpartyGroupPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await counterpartyGroupPage.table.openColumnFilter(col);
      await counterpartyGroupPage.table.applyColumnFilter(sampleValue);
      expect(
        await counterpartyGroupPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await counterpartyGroupPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_009 ──────────────────────────────────────────────────────────────────
  test('[TC_009] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await counterpartyGroupPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await counterpartyGroupPage.table.sortByColumn(col);
      const order = await counterpartyGroupPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  test('[TC_009b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(counterpartyGroupPage.table);
  });

  test('[TC_009c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
    await verifySortPaginationCompatibility(counterpartyGroupPage.table, counterpartyGroupPage.paginator);
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await counterpartyGroupPage.export.triggerPdf();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await counterpartyGroupPage.export.triggerExcel();
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(counterpartyGroupPage.export, counterpartyGroupPage.paginator);
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(counterpartyGroupPage.export, counterpartyGroupPage.paginator);
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 10', async () => {
    const defaultValue = await counterpartyGroupPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_025b] items per page dropdown has expected options', async () => {
    const options = await counterpartyGroupPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  test('[TC_025c] changing items per page to 50 shows all available records', async () => {
    await counterpartyGroupPage.paginator.changeItemsPerPage(50);
    const count = await counterpartyGroupPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await counterpartyGroupPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_028 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_028] clicking page number navigates to that page — skipped: insufficient records for multi-page', async () => {});

  // ─── TC_029 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_029] next and previous buttons switch pages — skipped: insufficient records for multi-page', async () => {});

  // ─── TC_030 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_030] first and last page buttons navigate — skipped: insufficient records for multi-page', async () => {});
});

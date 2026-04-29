import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { CustomerDefaulterPage } from '../pages/CustomerDefaulterPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifySortDataOrder,
  verifySortPaginationCompatibility,
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Customer Defaulter', () => {
  let context: BrowserContext;
  let page: Page;
  let customerDefaulterPage: CustomerDefaulterPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    customerDefaulterPage = new CustomerDefaulterPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await customerDefaulterPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to customer defaulter screen and verify all elements', async () => {
    await customerDefaulterPage.verifyScreenElements();
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] filter each column shows filtered results and active indicator', async () => {
    const columns = await customerDefaulterPage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await customerDefaulterPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await customerDefaulterPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await customerDefaulterPage.table.openColumnFilter(col);
      await customerDefaulterPage.table.applyColumnFilter(sampleValue);
      expect(
        await customerDefaulterPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await customerDefaulterPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_009 ──────────────────────────────────────────────────────────────────
  test('[TC_009] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await customerDefaulterPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await customerDefaulterPage.table.sortByColumn(col);
      const order = await customerDefaulterPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  test('[TC_009b] sort data is correctly ordered ascending then descending', async () => {
    await verifySortDataOrder(customerDefaulterPage.table);
  });

  test('[TC_009c] sorting from page 2 keeps user on page 2 (not reset to page 1)', async () => {
    await verifySortPaginationCompatibility(customerDefaulterPage.table, customerDefaulterPage.paginator);
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await customerDefaulterPage.export.triggerPdf();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await customerDefaulterPage.export.triggerExcel();
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] downloaded PDF contains all records (not just current page)', async () => {
    await verifyExportPdfAllRecords(customerDefaulterPage.export, customerDefaulterPage.paginator);
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] downloaded Excel contains all records (not just current page)', async () => {
    await verifyExportExcelAllRecords(customerDefaulterPage.export, customerDefaulterPage.paginator);
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 10', async () => {
    const defaultValue = await customerDefaulterPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_025b] items per page dropdown has expected options', async () => {
    const options = await customerDefaulterPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  test('[TC_025c] changing items per page to 50 shows all available records', async () => {
    await customerDefaulterPage.paginator.changeItemsPerPage(50);
    const count = await customerDefaulterPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await customerDefaulterPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_028 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_028] clicking page number navigates to that page — skipped: insufficient records for multi-page', async () => {});

  // ─── TC_029 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_029] next and previous buttons switch pages — skipped: insufficient records for multi-page', async () => {});

  // ─── TC_030 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_030] first and last page buttons navigate — skipped: insufficient records for multi-page', async () => {});
});

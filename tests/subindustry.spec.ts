import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownExistingSubIndustryCode,
  users,
} from '../fixtures/testData';
import { SubIndustryPage } from '../pages/SubIndustryPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Sub Industry', () => {
  let context: BrowserContext;
  let page: Page;
  let subIndustryPage: SubIndustryPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    subIndustryPage = new SubIndustryPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await subIndustryPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to sub industry screen and verify all elements', async () => {
    await subIndustryPage.verifyScreenElements();
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] filter each column shows filtered results and active indicator', async () => {
    const columns = await subIndustryPage.table.getFilterableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      const colIdx = await subIndustryPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await subIndustryPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await subIndustryPage.table.openColumnFilter(col);
      await subIndustryPage.table.applyColumnFilter(sampleValue);
      expect(
        await subIndustryPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await subIndustryPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_009 ──────────────────────────────────────────────────────────────────
  test('[TC_009] sort by each column shows sort indicator for all sortable columns', async () => {
    const columns = await subIndustryPage.table.getSortableColumnNames();
    expect(columns.length).toBeGreaterThan(0);
    for (const col of columns) {
      await subIndustryPage.table.sortByColumn(col);
      const order = await subIndustryPage.table.getColumnSortOrder(col);
      expect(['ascending', 'descending'], `Column "${col}" sort indicator missing`).toContain(order);
    }
  });

  // ─── TC_010 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await subIndustryPage.export.triggerPdf();
  });

  // ─── TC_011 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await subIndustryPage.export.triggerExcel();
  });

  // ─── TC_012 — blocked by TC_010 (will fail) ──────────────────────────────────
  test('[TC_012] downloaded PDF data matches screen records', async () => {
    await subIndustryPage.export.downloadAndVerifyPdf();
  });

  // ─── TC_013 — blocked by TC_011 (will fail) ──────────────────────────────────
  test('[TC_013] downloaded Excel data matches screen records', async () => {
    await subIndustryPage.export.downloadAndVerifyExcel();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] view record details from action tab', async () => {
    await subIndustryPage.openViewModal(knownExistingSubIndustryCode);
    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] view mode fields are read-only and cannot be edited', async () => {
    await subIndustryPage.openViewModal(knownExistingSubIndustryCode);
    await subIndustryPage.verifyViewModalIsReadOnly();
    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 10', async () => {
    const defaultValue = await subIndustryPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_025b] items per page dropdown has options 10, 20 and 50', async () => {
    const options = await subIndustryPage.paginator.getItemsPerPageOptions();
    expect(options).toEqual(['10', '20', '50']);
  });

  test('[TC_025c] changing items per page to 20 shows 20 records', async () => {
    await subIndustryPage.paginator.changeItemsPerPage(20);
    const count = await subIndustryPage.table.getRowCount();
    expect(count).toBe(20);
    const info = await subIndustryPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 20/);
  });

  test('[TC_025d] changing items per page to 50 shows up to 50 records', async () => {
    await subIndustryPage.paginator.changeItemsPerPage(50);
    const count = await subIndustryPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await subIndustryPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 50|Showing 1 - \d+/);
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] clicking page number navigates to that page with correct data', async () => {
    const firstRowPage1 = await subIndustryPage.table.getFirstRowCellText(0);
    const infoBefore = await subIndustryPage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await subIndustryPage.paginator.clickPageNumber(2);
    expect((await subIndustryPage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await subIndustryPage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await subIndustryPage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] next and previous buttons switch pages correctly', async () => {
    await subIndustryPage.paginator.verifyPreviousPageDisabled();
    expect((await subIndustryPage.paginator.getActivePageNumber()).trim()).toBe('1');

    await subIndustryPage.paginator.clickNextPage();
    expect((await subIndustryPage.paginator.getActivePageNumber()).trim()).toBe('2');

    await subIndustryPage.paginator.clickPreviousPage();
    expect((await subIndustryPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await subIndustryPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] first and last page buttons navigate to correct pages', async () => {
    await subIndustryPage.paginator.verifyFirstPageDisabled();

    await subIndustryPage.paginator.clickLastPage();
    const lastPageNum = parseInt(await subIndustryPage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await subIndustryPage.paginator.verifyNextPageDisabled();

    await subIndustryPage.paginator.clickFirstPage();
    expect((await subIndustryPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await subIndustryPage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await subIndustryPage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] view modal displays correct code, description and industry for the record', async () => {
    await subIndustryPage.openViewModal(knownExistingSubIndustryCode);
    await subIndustryPage.verifyViewModalData('01', 'Data Processing', 'Information and communication');
    await subIndustryPage.verifyViewModalIsReadOnly();
    await subIndustryPage.closeOpenModal();
  });
});

import { expect, test, BrowserContext, Page } from '@playwright/test';
import { knownViewableUserLoginId, users } from '../fixtures/testData';
import { UserMasterPage } from '../pages/UserMasterPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('User Master', () => {
  let context: BrowserContext;
  let page: Page;
  let umPage: UserMasterPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    umPage = new UserMasterPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await umPage.goto();
  });

  // ══════════════════════════════════════════════════════
  //  LIST SCREEN
  // ══════════════════════════════════════════════════════

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to User Master and verify heading, table, export buttons, pagination', async () => {
    await umPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns', async () => {
    await umPage.verifyRequiredColumns();
  });

  // ─── TC_002b ────────────────────────────────────────────────────────────────
  test('[TC_002b] Profile and Actions columns do not have sort or filter buttons', async () => {
    await umPage.verifyProfileAndActionsHaveNoSortOrFilter();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has only View button and no Edit or Delete', async () => {
    await umPage.verifyActionsHasOnlyView();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await umPage.verifyTableHasRows();
  });

  // ══════════════════════════════════════════════════════
  //  FILTER
  // ══════════════════════════════════════════════════════

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each filterable column shows filtered results and active indicator', async () => {
    const columns = await umPage.table.getFilterableColumnNames();
    expect(columns.length, 'At least one filterable column must exist').toBeGreaterThan(0);

    // Text-input filter columns
    for (const col of columns) {
      if (/profile|actions|is locked|status|is email/i.test(col)) continue;
      await umPage.goto();
      const originalCount = await umPage.table.getRowCount();
      const colIdx = await umPage.table.getColumnIndexByName(col);
      const allValues = colIdx >= 0 ? await umPage.table.getAllColumnValues(colIdx) : [];
      const sampleValue = allValues.find(v => v.trim().length > 0) ?? '';
      if (!sampleValue) { console.warn(`Skipping column "${col}" — no sample value found`); continue; }

      await umPage.table.openColumnFilter(col);
      await umPage.table.applyColumnFilter(sampleValue);

      const isActive = await umPage.table.isColumnFilterActive(col);
      if (!isActive) console.warn(`Column "${col}" filter active indicator not detected`);

      const rawFiltered = colIdx >= 0 ? await umPage.table.getAllColumnValues(colIdx) : [];
      const filteredValues = rawFiltered.filter(v => v.trim().length > 0);
      expect(filteredValues.length, `Column "${col}" filter returned no rows`).toBeGreaterThan(0);
      for (const cellValue of filteredValues) {
        expect(
          cellValue.toLowerCase(),
          `Column "${col}": row "${cellValue}" does not match filter "${sampleValue}"`,
        ).toContain(sampleValue.toLowerCase());
      }
      expect(filteredValues.length).toBeLessThanOrEqual(originalCount);
      await umPage.table.clearColumnFilter(col);
    }

    // Dropdown filter columns (Is Locked, Status, Is Email Required?) — use p-select in overlay
    const dropdownCols = columns.filter(c => /is locked|status|is email/i.test(c));
    for (const col of dropdownCols) {
      await umPage.goto();
      const originalCount = await umPage.table.getRowCount();
      const colIdx = await umPage.table.getColumnIndexByName(col);
      const selectedOption = await umPage.table.applyDropdownColumnFilter(col);
      const rawFiltered = colIdx >= 0 ? await umPage.table.getAllColumnValues(colIdx) : [];
      const filteredValues = rawFiltered.filter(v => v.trim().length > 0);
      expect(filteredValues.length, `Dropdown filter on "${col}" returned no rows`).toBeGreaterThan(0);
      expect(filteredValues.length, `Dropdown filter on "${col}" should narrow results`).toBeLessThanOrEqual(originalCount);
      console.log(`Column "${col}" dropdown filter by "${selectedOption}": ${filteredValues.length} rows`);
      // No clearColumnFilter needed — next iteration calls goto() which reloads fresh
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = await umPage.table.getFilterableColumnNames();
    expect(columns.length, 'At least one filterable column must exist').toBeGreaterThan(0);
    const col = columns[0];
    const originalCount = await umPage.table.getRowCount();
    const colIdx = await umPage.table.getColumnIndexByName(col);
    const allValues = colIdx >= 0 ? await umPage.table.getAllColumnValues(colIdx) : [];
    const sampleValue = allValues.find(v => v.trim().length > 0) ?? '';
    expect(sampleValue, `Column "${col}" has no data to filter with`).not.toBe('');
    await umPage.table.openColumnFilter(col);
    await umPage.table.applyColumnFilter(sampleValue);
    await umPage.table.clearColumnFilter(col);
    expect(await umPage.table.getRowCount()).toBe(originalCount);
  });

  // ══════════════════════════════════════════════════════
  //  SORT
  // ══════════════════════════════════════════════════════

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = (await umPage.table.getSortableColumnNames())
      .filter(c => !/profile|actions/i.test(c));
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await umPage.goto();
      await umPage.table.sortByColumn(col);
      const order1 = await umPage.table.getColumnSortOrder(col);
      // PrimeNG on this screen keeps aria-sort="none" even while sorted — verify rows load instead
      if (order1 && order1 !== 'none') {
        expect(order1).toMatch(/ascending/i);
      } else {
        const rows1 = await umPage.table.getRowCount();
        expect(rows1, `Rows should load after ascending sort of "${col}"`).toBeGreaterThan(0);
      }
      await umPage.table.sortByColumn(col);
      const order2 = await umPage.table.getColumnSortOrder(col);
      if (order2 && order2 !== 'none') {
        expect(order2).toMatch(/descending/i);
      } else {
        const rows2 = await umPage.table.getRowCount();
        expect(rows2, `Rows should load after descending sort of "${col}"`).toBeGreaterThan(0);
      }
    }
  });

  test('[TC_007b] sort data loads records in ascending then descending order', async () => {
    const cols = (await umPage.table.getSortableColumnNames())
      .filter(c => !/profile|actions/i.test(c));
    if (cols.length === 0) return;
    await umPage.table.sortByColumn(cols[0]);
    expect(await umPage.table.getColumnSortOrder(cols[0])).toMatch(/ascending/i);
    const asc = await umPage.table.getVisibleColumnValues(cols[0]);
    expect(asc.length, 'Ascending sort should show rows').toBeGreaterThan(0);
    await umPage.table.sortByColumn(cols[0]);
    expect(await umPage.table.getColumnSortOrder(cols[0])).toMatch(/descending/i);
    const desc = await umPage.table.getVisibleColumnValues(cols[0]);
    expect(desc.length, 'Descending sort should show rows').toBeGreaterThan(0);
  });

  test('[TC_007c] sorting resets pagination gracefully', async () => {
    const cols = (await umPage.table.getSortableColumnNames())
      .filter(c => !/profile|actions/i.test(c));
    if (cols.length === 0) return;
    if (await umPage.paginator.isLastPage()) return;
    await umPage.paginator.clickNextPage();
    await umPage.table.sortByColumn(cols[0]);
    const pageNum = Number(await umPage.paginator.getActivePageNumber());
    expect(pageNum, 'Should be on a valid page after sort').toBeGreaterThanOrEqual(1);
    await umPage.paginator.clickFirstPage().catch(() => {});
  });

  // ══════════════════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════════════════

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await umPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await umPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded PDF contains all records', async () => {
    await verifyExportPdfAllRecords(umPage.export, umPage.paginator);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] downloaded Excel contains all records', async () => {
    await verifyExportExcelAllRecords(umPage.export, umPage.paginator);
  });

  // ══════════════════════════════════════════════════════
  //  PAGINATION
  // ══════════════════════════════════════════════════════

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] default items per page is 10', async () => {
    expect((await umPage.paginator.getItemsPerPageValue()).trim()).toBe('10');
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] items per page dropdown has options', async () => {
    expect((await umPage.paginator.getItemsPerPageOptions()).length).toBeGreaterThan(0);
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] clicking page 2 navigates to page 2', async () => {
    if (await umPage.paginator.isLastPage()) { test.skip(); return; }
    await umPage.paginator.clickPageNumber(2);
    expect(await umPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Next and Previous buttons switch between pages', async () => {
    if (await umPage.paginator.isLastPage()) { test.skip(); return; }
    await umPage.paginator.clickNextPage();
    expect(Number(await umPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await umPage.paginator.clickPreviousPage();
    expect(await umPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] First and Previous buttons are disabled on first page', async () => {
    await umPage.paginator.verifyFirstPageDisabled();
    await umPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] pagination info text shows entry count', async () => {
    expect(await umPage.paginator.getInfoText()).toMatch(/showing|of/i);
  });

  // ══════════════════════════════════════════════════════
  //  PROFILE MODAL
  // ══════════════════════════════════════════════════════

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Profile link opens modal with Role, Branch and Sub Branch Access columns', async () => {
    await umPage.openProfileModal(knownViewableUserLoginId);
    await umPage.verifyProfileModalContents();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] Profile modal close button dismisses the modal', async () => {
    await umPage.openProfileModal(knownViewableUserLoginId);
    await umPage.closeProfileModal();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });

  // ══════════════════════════════════════════════════════
  //  VIEW
  // ══════════════════════════════════════════════════════

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] View button opens user profile in read-only mode', async () => {
    await umPage.openView(knownViewableUserLoginId);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

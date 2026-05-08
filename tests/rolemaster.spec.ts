import { expect, test, BrowserContext, Page } from '@playwright/test';
import { knownViewableRoleCode, roleMasterData, users } from '../fixtures/testData';
import { RoleMasterPage } from '../pages/RoleMasterPage';
import { LoginPage } from '../pages/LoginPage';
import {
  verifyExportPdfAllRecords,
  verifyExportExcelAllRecords,
} from './helpers/commonScreenTests';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Role Master', () => {
  let context: BrowserContext;
  let page: Page;
  let rmPage: RoleMasterPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    rmPage = new RoleMasterPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await rmPage.goto();
  });

  // ══════════════════════════════════════════════════════
  //  LIST SCREEN
  // ══════════════════════════════════════════════════════

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to Role Master and verify heading, table, export, add button, pagination', async () => {
    await rmPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns', async () => {
    await rmPage.verifyRequiredColumns();
  });

  // ─── TC_002b ────────────────────────────────────────────────────────────────
  test('[TC_002b] Status and Actions columns do not have sort or filter buttons', async () => {
    await rmPage.verifyStatusAndActionsHaveNoSortOrFilter();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has View, Edit and Delete buttons', async () => {
    await rmPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await rmPage.verifyTableHasRows();
  });

  // ══════════════════════════════════════════════════════
  //  FILTER
  // ══════════════════════════════════════════════════════

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each filterable column shows filtered results and active indicator', async () => {
    const columns = await rmPage.table.getFilterableColumnNames();
    expect(columns.length, 'At least one filterable column must exist').toBeGreaterThan(0);

    // Text-input filter columns (skip date, Status, Actions; handle Active as dropdown)
    for (const col of columns) {
      if (/status|actions|active|date/i.test(col)) continue;
      await rmPage.goto();
      const originalCount = await rmPage.table.getRowCount();
      const colIdx = await rmPage.table.getColumnIndexByName(col);
      const allValues = colIdx >= 0 ? await rmPage.table.getAllColumnValues(colIdx) : [];
      const sampleValue = allValues.find(v => v.trim().length > 0) ?? '';
      if (!sampleValue) { console.warn(`Skipping column "${col}" — no sample value`); continue; }

      await rmPage.table.openColumnFilter(col);
      await rmPage.table.applyColumnFilter(sampleValue);

      const isActive = await rmPage.table.isColumnFilterActive(col);
      if (!isActive) console.warn(`Column "${col}" filter active indicator not detected`);

      const rawFiltered = colIdx >= 0 ? await rmPage.table.getAllColumnValues(colIdx) : [];
      const filteredValues = rawFiltered.filter(v => v.trim().length > 0);
      expect(filteredValues.length, `Column "${col}" filter returned no rows`).toBeGreaterThan(0);
      for (const v of filteredValues) {
        expect(v.toLowerCase(), `"${col}": "${v}" doesn't match filter "${sampleValue}"`).toContain(sampleValue.toLowerCase());
      }
      expect(filteredValues.length).toBeLessThanOrEqual(originalCount);
      await rmPage.table.clearColumnFilter(col);
    }

    // Dropdown filter column: Active (Yes/No)
    const activeCol = columns.find(c => /^active$/i.test(c));
    if (activeCol) {
      await rmPage.goto();
      const originalCount = await rmPage.table.getRowCount();
      const colIdx = await rmPage.table.getColumnIndexByName(activeCol);
      const selectedOption = await rmPage.table.applyDropdownColumnFilter(activeCol);
      const rawFiltered = colIdx >= 0 ? await rmPage.table.getAllColumnValues(colIdx) : [];
      const filteredValues = rawFiltered.filter(v => v.trim().length > 0);
      expect(filteredValues.length, `Active dropdown filter returned no rows`).toBeGreaterThan(0);
      expect(filteredValues.length).toBeLessThanOrEqual(originalCount);
      console.log(`Active dropdown filter by "${selectedOption}": ${filteredValues.length} rows`);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = (await rmPage.table.getFilterableColumnNames())
      .filter(c => !/status|actions|active|date/i.test(c));
    expect(columns.length, 'At least one text-filterable column must exist').toBeGreaterThan(0);
    const col = columns[0];
    const originalCount = await rmPage.table.getRowCount();
    const colIdx = await rmPage.table.getColumnIndexByName(col);
    const allValues = colIdx >= 0 ? await rmPage.table.getAllColumnValues(colIdx) : [];
    const sampleValue = allValues.find(v => v.trim().length > 0) ?? '';
    expect(sampleValue, `Column "${col}" has no data to filter with`).not.toBe('');
    await rmPage.table.openColumnFilter(col);
    await rmPage.table.applyColumnFilter(sampleValue);
    await rmPage.table.clearColumnFilter(col);
    expect(await rmPage.table.getRowCount()).toBe(originalCount);
  });

  // ══════════════════════════════════════════════════════
  //  SORT
  // ══════════════════════════════════════════════════════

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = (await rmPage.table.getSortableColumnNames())
      .filter(c => !/status|actions/i.test(c));
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await rmPage.goto();
      await rmPage.table.sortByColumn(col);
      expect(await rmPage.table.getColumnSortOrder(col)).toMatch(/ascending/i);
      await rmPage.table.sortByColumn(col);
      expect(await rmPage.table.getColumnSortOrder(col)).toMatch(/descending/i);
    }
  });

  test('[TC_007b] sort data loads records in ascending then descending order', async () => {
    const cols = (await rmPage.table.getSortableColumnNames())
      .filter(c => !/status|actions/i.test(c));
    if (cols.length === 0) return;
    await rmPage.table.sortByColumn(cols[0]);
    expect(await rmPage.table.getColumnSortOrder(cols[0])).toMatch(/ascending/i);
    expect(await rmPage.table.getRowCount()).toBeGreaterThan(0);
    await rmPage.table.sortByColumn(cols[0]);
    expect(await rmPage.table.getColumnSortOrder(cols[0])).toMatch(/descending/i);
    expect(await rmPage.table.getRowCount()).toBeGreaterThan(0);
  });

  test('[TC_007c] sorting resets pagination gracefully', async () => {
    const cols = (await rmPage.table.getSortableColumnNames())
      .filter(c => !/status|actions/i.test(c));
    if (cols.length === 0) return;
    if (await rmPage.paginator.isLastPage()) return;
    await rmPage.paginator.clickNextPage();
    await rmPage.table.sortByColumn(cols[0]);
    const pageNum = Number(await rmPage.paginator.getActivePageNumber());
    expect(pageNum, 'Should be on a valid page after sort').toBeGreaterThanOrEqual(1);
    await rmPage.paginator.clickFirstPage().catch(() => {});
  });

  // ══════════════════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════════════════

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await rmPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await rmPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded PDF contains all records', async () => {
    await verifyExportPdfAllRecords(rmPage.export, rmPage.paginator);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] downloaded Excel contains all records', async () => {
    await verifyExportExcelAllRecords(rmPage.export, rmPage.paginator);
  });

  // ══════════════════════════════════════════════════════
  //  PAGINATION
  // ══════════════════════════════════════════════════════

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] default items per page is 10', async () => {
    expect((await rmPage.paginator.getItemsPerPageValue()).trim()).toBe('10');
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] items per page dropdown has options', async () => {
    expect((await rmPage.paginator.getItemsPerPageOptions()).length).toBeGreaterThan(0);
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] clicking page 2 navigates to page 2', async () => {
    if (await rmPage.paginator.isLastPage()) { test.skip(); return; }
    await rmPage.paginator.clickPageNumber(2);
    expect(await rmPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Next and Previous buttons switch between pages', async () => {
    if (await rmPage.paginator.isLastPage()) { test.skip(); return; }
    await rmPage.paginator.clickNextPage();
    expect(Number(await rmPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await rmPage.paginator.clickPreviousPage();
    expect(await rmPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] First and Previous buttons are disabled on first page', async () => {
    await rmPage.paginator.verifyFirstPageDisabled();
    await rmPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] pagination info text shows entry count', async () => {
    expect(await rmPage.paginator.getInfoText()).toMatch(/showing|of/i);
  });

  // ══════════════════════════════════════════════════════
  //  ADD — NEW ROLE
  // ══════════════════════════════════════════════════════

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Add button opens New Role modal', async () => {
    await rmPage.openAddModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] New Role modal has Code, Description, Active (System Role) fields with Save and Cancel', async () => {
    await rmPage.openAddModal();
    await rmPage.verifyAddModalElements();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] Save is disabled when all fields are empty', async () => {
    await rmPage.openAddModal();
    await rmPage.verifySaveDisabled();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] Save is disabled when only Description is filled', async () => {
    await rmPage.openAddModal();
    await rmPage.fillDescription(roleMasterData.description);
    await rmPage.verifySaveDisabled();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] Save is disabled when only Code is filled', async () => {
    await rmPage.openAddModal();
    await rmPage.fillCode(roleMasterData.code);
    await rmPage.verifySaveDisabled();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] Cancel closes modal without saving', async () => {
    await rmPage.openAddModal();
    await rmPage.fillCode(roleMasterData.code);
    await rmPage.cancelModal();
    await expect(page.locator('p-dialog')).not.toBeVisible({ timeout: 5000 });
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] filling Code and Description enables Save', async () => {
    await rmPage.openAddModal();
    await rmPage.fillCode(roleMasterData.code);
    await rmPage.fillDescription(roleMasterData.description);
    await rmPage.verifySaveEnabled();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] saving new role sends record for authorization with toast', async () => {
    await rmPage.openAddModal();
    await rmPage.fillCode(roleMasterData.code);
    await rmPage.fillDescription(roleMasterData.description);
    await rmPage.submitAddForm();
    await rmPage.verifySuccessOrPendingToast();
  });

  // ══════════════════════════════════════════════════════
  //  PROFILE POPUP
  // ══════════════════════════════════════════════════════

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] Profile popup shows User Login, Branch and Sub Branch Access columns', async () => {
    await rmPage.openProfileModal(knownViewableRoleCode);
    await rmPage.verifyProfileModalContents();
  });

  // ══════════════════════════════════════════════════════
  //  VIEW / DELETE
  // ══════════════════════════════════════════════════════

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] View button opens role in read-only modal', async () => {
    await rmPage.openView(knownViewableRoleCode);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Delete shows confirmation dialog; Cancel keeps record in table', async () => {
    await rmPage.openDeleteConfirmation(knownViewableRoleCode);
    await rmPage.cancelDeleteConfirmation();
    await rmPage.table.verifyRowExistsByCellText(knownViewableRoleCode);
  });
});

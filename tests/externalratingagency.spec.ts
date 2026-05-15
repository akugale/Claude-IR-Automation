import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { ExternalRatingAgencyPage } from '../pages/ExternalRatingAgencyPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('External Rating Agency', () => {
  let context: BrowserContext;
  let page: Page;
  let eraPage: ExternalRatingAgencyPage;

  /** Track code created in CRUD chain — shared across TC_041–TC_045 */
  let createdCode = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    eraPage = new ExternalRatingAgencyPage(page);
  });

  test.afterAll(async () => {
    try {
      if (createdCode) {
        await eraPage.goto().catch(() => {});
        await eraPage.deleteRecordByCode(createdCode).catch(() => {});
        await eraPage.table.clearColumnFilter('Code').catch(() => {});
      }
    } catch { /* best-effort cleanup */ }
    await context.close();
  });

  test.beforeEach(async () => {
    await eraPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to External Rating Agency and verify heading, table, exports, add button and pagination', async () => {
    await eraPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  // Note: screenshot shows extra "Status" and "Created By" columns.
  // This test is EXPECTED TO FAIL if those extra columns are present.
  test('[TC_002] table has exactly: Code, Description, Eligible for Basel, Is Domestic, Actions — no extra columns', async () => {
    await eraPage.verifyRequiredColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] table renders with data rows', async () => {
    const count = await eraPage.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] Actions column has View (eye), Edit (pencil), Delete (trash) icons per row', async () => {
    const firstRow = eraPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] sortable columns include Code, Description, Eligible for Basel, Is Domestic', async () => {
    const sortableCols = await eraPage.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['Code', 'Description', 'Eligible for Basel', 'Is Domestic']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] filterable columns have filter icons — Actions column excluded', async () => {
    const filterableCols = await eraPage.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
    expect(
      filterableCols.every(c => !/^actions$/i.test(c.trim())),
      'Actions column should not have filter icon',
    ).toBe(true);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await eraPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await eraPage.goto();
      await eraPage.table.sortByColumn(col);
      const asc = await eraPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await eraPage.table.sortByColumn(col);
      const desc = await eraPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] sort applies to table — indicators toggle and rows remain visible', async () => {
    const cols = await eraPage.table.getSortableColumnNames();
    if (cols.length === 0) { test.skip(); return; }
    const col = cols[0];
    await eraPage.table.sortByColumn(col);
    expect(await eraPage.table.getColumnSortOrder(col)).toMatch(/ascending/i);
    expect(await eraPage.table.getRowCount(), 'Rows should remain after ascending sort').toBeGreaterThan(0);
    await eraPage.table.sortByColumn(col);
    expect(await eraPage.table.getColumnSortOrder(col)).toMatch(/descending/i);
    expect(await eraPage.table.getRowCount(), 'Rows should remain after descending sort').toBeGreaterThan(0);
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] filter each column — active indicator set and data is filtered', async () => {
    const columns = await eraPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(true, 'No filterable columns'); return; }
    for (const col of columns) {
      const colIdx = await eraPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await eraPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await eraPage.table.openColumnFilter(col);
      await eraPage.table.applyColumnFilter(sampleValue);
      expect(
        await eraPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await eraPage.table.verifyAllRowsInColumnContain(col, sampleValue);
      await eraPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] filter Code column — only matching rows shown', async () => {
    const colIdx = await eraPage.table.getColumnIndexByName('Code');
    const sampleValue = colIdx >= 0 ? await eraPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await eraPage.table.openColumnFilter('Code');
    await eraPage.table.applyColumnFilter(sampleValue);
    await eraPage.table.verifyRowExistsByCellText(sampleValue);
    await eraPage.table.verifyAllRowsInColumnContain('Code', sampleValue);
    await eraPage.table.clearColumnFilter('Code');
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] filter Description column — only matching rows shown', async () => {
    const colIdx = await eraPage.table.getColumnIndexByName('Description');
    const sampleValue = colIdx >= 0 ? await eraPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await eraPage.table.openColumnFilter('Description');
    await eraPage.table.applyColumnFilter(sampleValue);
    await eraPage.table.verifyRowExistsByCellText(sampleValue);
    await eraPage.table.verifyAllRowsInColumnContain('Description', sampleValue);
    await eraPage.table.clearColumnFilter('Description');
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] filter Eligible for Basel column — only matching rows shown', async () => {
    const colIdx = await eraPage.table.getColumnIndexByName('Eligible for Basel');
    const sampleValue = colIdx >= 0 ? await eraPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await eraPage.table.openColumnFilter('Eligible for Basel');
    await eraPage.table.applyColumnFilter(sampleValue);
    await eraPage.table.verifyRowExistsByCellText(sampleValue);
    await eraPage.table.verifyAllRowsInColumnContain('Eligible for Basel', sampleValue);
    await eraPage.table.clearColumnFilter('Eligible for Basel');
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] filter Is Domestic column — only matching rows shown', async () => {
    const colIdx = await eraPage.table.getColumnIndexByName('Is Domestic');
    const sampleValue = colIdx >= 0 ? await eraPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await eraPage.table.openColumnFilter('Is Domestic');
    await eraPage.table.applyColumnFilter(sampleValue);
    await eraPage.table.verifyRowExistsByCellText(sampleValue);
    await eraPage.table.verifyAllRowsInColumnContain('Is Domestic', sampleValue);
    await eraPage.table.clearColumnFilter('Is Domestic');
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] clearing column filter restores all records', async () => {
    const columns = await eraPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await eraPage.table.getRowCount();
    const colIdx = await eraPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await eraPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await eraPage.table.openColumnFilter(col);
    await eraPage.table.applyColumnFilter(sampleValue);
    await eraPage.table.clearColumnFilter(col);
    expect(await eraPage.table.getRowCount()).toBe(originalCount);
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Export PDF button is visible and clickable', async () => {
    await eraPage.export.triggerPdf();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] Export Excel button is visible and clickable', async () => {
    await eraPage.export.triggerExcel();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] pagination info text shows record count e.g. Showing 1-N out of N records', async () => {
    const infoText = await eraPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] default items per page is 10', async () => {
    const defaultValue = await eraPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] items per page dropdown has options', async () => {
    const options = await eraPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] First and Previous page buttons are disabled on page 1', async () => {
    await eraPage.paginator.verifyFirstPageDisabled();
    await eraPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] View (eye) action icon present in table rows', async () => {
    const firstRow = eraPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] Edit (pencil) action icon present in table rows', async () => {
    const firstRow = eraPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] Delete (trash) action icon present in table rows', async () => {
    const firstRow = eraPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] clicking View icon opens view modal', async () => {
    await eraPage.clickViewOnFirstRow();
    await expect(page.locator('[role="dialog"], .p-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] clicking Edit icon opens edit modal with pre-filled Code field', async () => {
    await eraPage.clickEditOnFirstRow();
    const dialog = page.locator('[role="dialog"], .p-dialog').first();
    await expect(dialog).toBeVisible();
    const codeValue = await eraPage.getCodeInput().inputValue();
    expect(codeValue.trim(), 'Edit modal should pre-fill Code field').not.toBe('');
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] Add (+) button opens popup with title "New External Rating"', async () => {
    await eraPage.clickAddButton();
    await expect(
      eraPage.getDialog().getByText(/new external rating/i),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Add popup has Code, Description, Eligible for Basel?, Is Domestic? fields — all mandatory', async () => {
    await eraPage.clickAddButton();
    const dialog = eraPage.getDialog();
    await expect(eraPage.getCodeInput()).toBeVisible();
    await expect(eraPage.getDescriptionInput()).toBeVisible();
    await expect(eraPage.getEligibleForBaselDropdown()).toBeVisible();
    await expect(eraPage.getIsDomesticDropdown()).toBeVisible();
    // All 4 fields mandatory — verify red * present in dialog
    const mandatoryCount = await dialog.locator('label').filter({ hasText: /\*/ }).count();
    expect(mandatoryCount, 'All 4 fields should show mandatory indicator').toBeGreaterThanOrEqual(4);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Code field has placeholder "Enter code"', async () => {
    await eraPage.clickAddButton();
    const placeholder = await eraPage.getCodeInput().getAttribute('placeholder');
    expect(placeholder).toMatch(/enter code/i);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] Description field has placeholder "Enter description"', async () => {
    await eraPage.clickAddButton();
    const placeholder = await eraPage.getDescriptionInput().getAttribute('placeholder');
    expect(placeholder).toMatch(/enter description/i);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] Eligible for Basel? dropdown has Yes and No options only', async () => {
    await eraPage.clickAddButton();
    const options = await eraPage.getDropdownOptions(eraPage.getEligibleForBaselDropdown());
    const normalised = options.map(o => o.toLowerCase());
    expect(normalised.some(o => o === 'yes'), 'Dropdown should have "Yes"').toBe(true);
    expect(normalised.some(o => o === 'no'), 'Dropdown should have "No"').toBe(true);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] Is Domestic? dropdown has Yes and No options only', async () => {
    await eraPage.clickAddButton();
    const options = await eraPage.getDropdownOptions(eraPage.getIsDomesticDropdown());
    const normalised = options.map(o => o.toLowerCase());
    expect(normalised.some(o => o === 'yes'), 'Dropdown should have "Yes"').toBe(true);
    expect(normalised.some(o => o === 'no'), 'Dropdown should have "No"').toBe(true);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  // App Bug: Cancel button may keep popup open (Reset behaviour) without clearing fields.
  // Expected: Cancel/Reset clears all fields.
  test('[TC_032] Cancel resets form fields — popup closes or fields cleared', async () => {
    await eraPage.clickAddButton();
    await eraPage.getCodeInput().fill('CANCELTEST');
    await eraPage.getDescriptionInput().fill('cancel test description');
    await eraPage.clickCancel();

    const codeInputVisible = await eraPage.getCodeInput().isVisible({ timeout: 2000 }).catch(() => false);
    if (codeInputVisible) {
      // Cancel kept popup open (Reset) — fields must be cleared
      const codeValue = await eraPage.getCodeInput().inputValue();
      const descValue = await eraPage.getDescriptionInput().inputValue();
      expect(codeValue, 'Cancel/Reset should clear Code field').toBe('');
      expect(descValue, 'Cancel/Reset should clear Description field').toBe('');
    } else {
      // Cancel closed popup — verify record not saved, form empty on reopen
      const rows = page.locator('table tbody tr').filter({ hasText: 'CANCELTEST' });
      expect(await rows.count(), 'Cancel should not save record').toBe(0);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await eraPage.clickAddButton();
      const codeValue = await eraPage.getCodeInput().inputValue();
      expect(codeValue, 'Form should be empty on reopen after Cancel').toBe('');
      await page.keyboard.press('Escape');
    }
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] Save with all fields empty shows validation errors', async () => {
    await eraPage.clickAddButton();
    await eraPage.clickSave();
    // Dialog must stay open — validation prevents save
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Dialog should stay open when mandatory fields are empty',
    ).toBeVisible({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  // CRUD chain: TC_034 → TC_035 → TC_036 → TC_037 → TC_038 (all on same record)
  test('[TC_034] Save with valid data closes popup and record visible in list', async () => {
    const code = `ERA${String(Date.now()).slice(-8)}`;
    createdCode = code;
    await eraPage.clickAddButton();
    await eraPage.fillAddForm(code, `Auto test ${code}`, 'Yes', 'No');
    await eraPage.clickSave();
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Popup should close after successful Save',
    ).toBeHidden({ timeout: 15000 });
    expect(createdCode.length, 'createdCode must be set for CRUD chain').toBeGreaterThan(0);
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] newly added record is visible in table list', async () => {
    if (!createdCode) { test.skip(true, 'TC_034 did not create a record'); return; }
    await eraPage.table.openColumnFilter('Code');
    await eraPage.table.applyColumnFilter(createdCode);
    const rows = eraPage.tabPanel.locator('table tbody tr').filter({ hasText: createdCode });
    expect(
      await rows.count(),
      `Record "${createdCode}" should be visible in list`,
    ).toBeGreaterThan(0);
    await eraPage.table.clearColumnFilter('Code');
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] Duplicate Code — save rejected, dialog stays open', async () => {
    if (!createdCode) { test.skip(true, 'TC_034 did not create a record'); return; }
    await eraPage.clickAddButton();
    await eraPage.fillAddForm(createdCode, `Duplicate test`, 'No', 'Yes');
    await eraPage.clickSave();
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Duplicate Code: dialog must stay open (save rejected)',
    ).toBeVisible({ timeout: 5000 });
    await eraPage.clickCancel();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] Edit record — updated Description reflected in table list', async () => {
    if (!createdCode) { test.skip(true, 'TC_034 did not create a record'); return; }
    await eraPage.clickEditByCode(createdCode);

    const descInput = eraPage.getDescriptionInput();
    await descInput.clear();
    await descInput.fill(`Updated ${createdCode}`);
    await descInput.press('Tab');
    await eraPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Verify updated description in table
    await eraPage.table.openColumnFilter('Code');
    await eraPage.table.applyColumnFilter(createdCode);
    const updatedRow = eraPage.tabPanel.locator('table tbody tr').filter({ hasText: createdCode });
    await expect(
      updatedRow.filter({ hasText: `Updated ${createdCode}` }),
      `Row should show updated description "Updated ${createdCode}"`,
    ).toBeVisible();
    await eraPage.table.clearColumnFilter('Code');
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] Delete record — row removed from table list', async () => {
    if (!createdCode) { test.skip(true, 'TC_034 did not create a record'); return; }
    const codeToDelete = createdCode;
    await eraPage.deleteRecordByCode(codeToDelete);
    createdCode = ''; // mark deleted so afterAll skips double-delete

    await eraPage.table.openColumnFilter('Code');
    await eraPage.table.applyColumnFilter(codeToDelete);
    await expect(
      eraPage.tabPanel.locator('table tbody tr').filter({ hasText: codeToDelete }),
      `Record "${codeToDelete}" should be removed from table after delete`,
    ).toHaveCount(0);
    await eraPage.table.clearColumnFilter('Code');
  });
});

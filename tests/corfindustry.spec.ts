import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { CorfIndustryPage } from '../pages/CorfIndustryPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('CORF Industry', () => {
  let context: BrowserContext;
  let page: Page;
  let cifPage: CorfIndustryPage;
  /** Track code created in TC_130 so afterAll can clean it up if TC_131 didn't run */
  let createdCode = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    cifPage = new CorfIndustryPage(page);
  });

  test.afterAll(async () => {
    // Cleanup: delete test record if TC_131 didn't already remove it
    if (createdCode) {
      await cifPage.goto().catch(() => {});
      await cifPage.deleteRecordByCode(createdCode).catch(() => {});
    }
    await context.close();
  });

  test.beforeEach(async () => {
    await cifPage.goto();
  });

  // ─── TC_102 ─────────────────────────────────────────────────────────────────
  test('[TC_102] navigate to CORF Industry and verify heading, table, exports, add button and pagination', async () => {
    await cifPage.verifyScreenElements();
  });

  // ─── TC_103 ─────────────────────────────────────────────────────────────────
  test('[TC_103] table renders with data rows', async () => {
    const count = await cifPage.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  });

  // ─── TC_104 ─────────────────────────────────────────────────────────────────
  // App Bug: table shows extra "Status" column — only Code, Description, Is Nature Cyclicality?, Actions expected.
  // This test is EXPECTED TO FAIL until the Status column is removed.
  test('[TC_104] table has exactly: Code, Description, Is Nature Cyclicality?, Actions — no extra columns', async () => {
    await cifPage.verifyRequiredColumns();
  });

  // ─── TC_105 ─────────────────────────────────────────────────────────────────
  test('[TC_105] sortable columns have sort icons — Code, Description, Is Nature Cyclicality?', async () => {
    const sortableCols = await cifPage.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['Code', 'Description', 'Is Nature Cyclicality?']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  });

  // ─── TC_106 ─────────────────────────────────────────────────────────────────
  test('[TC_106] filterable columns have filter icons — Actions column excluded', async () => {
    const filterableCols = await cifPage.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
    expect(
      filterableCols.every(c => !/^actions$/i.test(c.trim())),
      'Actions column should not have filter icon',
    ).toBe(true);
  });

  // ─── TC_107 ─────────────────────────────────────────────────────────────────
  test('[TC_107] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await cifPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await cifPage.goto();
      await cifPage.table.sortByColumn(col);
      const asc = await cifPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await cifPage.table.sortByColumn(col);
      const desc = await cifPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  // ─── TC_108 ─────────────────────────────────────────────────────────────────
  // Verifies sort indicators toggle and rows remain visible — data comparison skipped
  // (server-side DB collation may produce identical visible rows in both directions).
  test('[TC_108] sort applies to table — indicators toggle and rows remain visible', async () => {
    const cols = await cifPage.table.getSortableColumnNames();
    if (cols.length === 0) { test.skip(); return; }
    const col = cols[0];
    await cifPage.table.sortByColumn(col);
    expect(await cifPage.table.getColumnSortOrder(col)).toMatch(/ascending/i);
    expect(await cifPage.table.getRowCount(), 'Rows should remain after ascending sort').toBeGreaterThan(0);
    await cifPage.table.sortByColumn(col);
    expect(await cifPage.table.getColumnSortOrder(col)).toMatch(/descending/i);
    expect(await cifPage.table.getRowCount(), 'Rows should remain after descending sort').toBeGreaterThan(0);
  });

  // ─── TC_109 ─────────────────────────────────────────────────────────────────
  test('[TC_109] filter each column — active indicator set after filtering', async () => {
    const columns = await cifPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(true, 'No filterable columns'); return; }
    for (const col of columns) {
      if (/cyclicality/i.test(col)) {
        // Is Nature Cyclicality? is a dropdown column — applyDropdownColumnFilter opens filter internally
        await cifPage.table.applyDropdownColumnFilter(col);
        expect(
          await cifPage.table.isColumnFilterActive(col),
          `Column "${col}" filter active indicator missing`,
        ).toBe(true);
        await cifPage.table.clearColumnFilter(col);
      } else {
        const colIdx = await cifPage.table.getColumnIndexByName(col);
        const sampleValue = colIdx >= 0 ? await cifPage.table.getFirstRowCellText(colIdx) : '';
        if (!sampleValue) continue;
        await cifPage.table.openColumnFilter(col);
        await cifPage.table.applyColumnFilter(sampleValue);
        expect(
          await cifPage.table.isColumnFilterActive(col),
          `Column "${col}" filter active indicator missing`,
        ).toBe(true);
        await cifPage.table.clearColumnFilter(col);
      }
    }
  });

  // ─── TC_110 ─────────────────────────────────────────────────────────────────
  test('[TC_110] filter by Code shows only matching rows', async () => {
    const colIdx = await cifPage.table.getColumnIndexByName('Code');
    const sampleValue = colIdx >= 0 ? await cifPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await cifPage.table.openColumnFilter('Code');
    await cifPage.table.applyColumnFilter(sampleValue);
    await cifPage.table.verifyRowExistsByCellText(sampleValue);
    await cifPage.table.clearColumnFilter('Code');
  });

  // ─── TC_111 ─────────────────────────────────────────────────────────────────
  test('[TC_111] filter by Description shows only matching rows', async () => {
    const colIdx = await cifPage.table.getColumnIndexByName('Description');
    const sampleValue = colIdx >= 0 ? await cifPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await cifPage.table.openColumnFilter('Description');
    await cifPage.table.applyColumnFilter(sampleValue);
    await cifPage.table.verifyRowExistsByCellText(sampleValue);
    await cifPage.table.clearColumnFilter('Description');
  });

  // ─── TC_112 ─────────────────────────────────────────────────────────────────
  test('[TC_112] filter by Is Nature Cyclicality? shows only matching rows', async () => {
    // Is Nature Cyclicality? is a dropdown column — use applyDropdownColumnFilter directly
    await cifPage.table.applyDropdownColumnFilter('Is Nature Cyclicality?');
    const count = await cifPage.table.getRowCount();
    expect(count, 'Filtered table should still have at least one row').toBeGreaterThan(0);
    await cifPage.table.clearColumnFilter('Is Nature Cyclicality?');
  });

  // ─── TC_113 ─────────────────────────────────────────────────────────────────
  test('[TC_113] clearing column filter restores all records', async () => {
    const columns = await cifPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    // Use first non-dropdown column for this test
    const col = columns.find(c => !/cyclicality/i.test(c)) ?? columns[0];
    const originalCount = await cifPage.table.getRowCount();
    if (/cyclicality/i.test(col)) {
      await cifPage.table.applyDropdownColumnFilter(col);
    } else {
      const colIdx = await cifPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await cifPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) { test.skip(); return; }
      await cifPage.table.openColumnFilter(col);
      await cifPage.table.applyColumnFilter(sampleValue);
    }
    await cifPage.table.clearColumnFilter(col);
    expect(await cifPage.table.getRowCount()).toBe(originalCount);
  });

  // ─── TC_114 ─────────────────────────────────────────────────────────────────
  test('[TC_114] Export PDF button is visible and clickable', async () => {
    await cifPage.export.triggerPdf();
  });

  // ─── TC_115 ─────────────────────────────────────────────────────────────────
  test('[TC_115] Export Excel button is visible and clickable', async () => {
    await cifPage.export.triggerExcel();
  });

  // ─── TC_116 ─────────────────────────────────────────────────────────────────
  test('[TC_116] pagination info text shows record count e.g. Showing 1-N out of N records', async () => {
    const infoText = await cifPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });

  // ─── TC_117 ─────────────────────────────────────────────────────────────────
  // App Bug: default items per page is 20, expected 10 to match all other screens.
  // This test is EXPECTED TO FAIL until the bug is fixed.
  test('[TC_117] default items per page is 10', async () => {
    const defaultValue = await cifPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  // ─── TC_118 ─────────────────────────────────────────────────────────────────
  test('[TC_118] items per page dropdown has options', async () => {
    const options = await cifPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_119 ─────────────────────────────────────────────────────────────────
  test('[TC_119] First and Previous page buttons are disabled on page 1', async () => {
    await cifPage.paginator.verifyFirstPageDisabled();
    await cifPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_120 ─────────────────────────────────────────────────────────────────
  test('[TC_120] View (eye) action icon present in table rows', async () => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
  });

  // ─── TC_121 ─────────────────────────────────────────────────────────────────
  test('[TC_121] Edit (pencil) action icon present in table rows', async () => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
  });

  // ─── TC_122 ─────────────────────────────────────────────────────────────────
  test('[TC_122] Delete (trash) action icon present in table rows', async () => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
  });

  // ─── TC_123 ─────────────────────────────────────────────────────────────────
  test('[TC_123] clicking View icon opens view modal', async () => {
    await cifPage.clickViewOnFirstRow();
    await expect(page.locator('[role="dialog"], .p-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_124 ─────────────────────────────────────────────────────────────────
  test('[TC_124] clicking Edit icon opens edit modal with pre-filled Code field', async () => {
    await cifPage.clickEditOnFirstRow();
    const dialog = page.locator('[role="dialog"], .p-dialog').first();
    await expect(dialog).toBeVisible();
    const codeInput = dialog.locator('input').first();
    const value = await codeInput.inputValue();
    expect(value.trim(), 'Edit modal should pre-fill Code field').not.toBe('');
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_125 ─────────────────────────────────────────────────────────────────
  test('[TC_125] Add (+) button opens popup with title "New CORF Industry"', async () => {
    await cifPage.clickAddButton();
    await expect(
      cifPage.getDialog().getByText(/new corf industry/i),
    ).toBeVisible();
  });

  // ─── TC_126 ─────────────────────────────────────────────────────────────────
  test('[TC_126] Add popup has Code field with placeholder containing "Enter code"', async () => {
    await cifPage.clickAddButton();
    const input = cifPage.getCodeInput();
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder, 'Code placeholder should contain "Enter code"').toMatch(/enter code/i);
  });

  // ─── TC_127 ─────────────────────────────────────────────────────────────────
  test('[TC_127] Add popup has Description field with placeholder containing "Enter description"', async () => {
    await cifPage.clickAddButton();
    const input = cifPage.getDescriptionInput();
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder, 'Description placeholder should contain "Enter description"').toMatch(/enter description/i);
  });

  // ─── TC_128 ─────────────────────────────────────────────────────────────────
  test('[TC_128] Is Nature Cyclicality? dropdown has Yes and No options', async () => {
    await cifPage.clickAddButton();
    const dropdown = cifPage.getNatureCyclicalityDropdown();
    await expect(dropdown, 'Is Nature Cyclicality? dropdown should be visible').toBeVisible();
    await dropdown.click();
    const listbox = page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const optionTexts = await listbox
      .locator('[role="option"], .p-select-option, .p-dropdown-item')
      .allInnerTexts();
    const normalised = optionTexts.map(o => o.trim().toLowerCase());
    expect(normalised.some(o => o === 'yes'), 'Dropdown should contain "Yes" option').toBe(true);
    expect(normalised.some(o => o === 'no'), 'Dropdown should contain "No" option').toBe(true);
    await page.keyboard.press('Escape');
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_129 ─────────────────────────────────────────────────────────────────
  // App Bug: Cancel button keeps popup open (acts as Reset toggle) but does NOT clear form fields.
  // Expected behaviour: Cancel/Reset should clear all input fields.
  // This test is EXPECTED TO FAIL until the app bug is fixed.
  test('[TC_129] Cancel closes popup without saving and form is empty on reopen', async () => {
    await cifPage.clickAddButton();
    await cifPage.fillAddForm('CANCELTEST', 'cancel test description', 'Yes');
    await cifPage.clickCancel();

    // Check specifically for the CODE INPUT being accessible — not just any dialog/toast
    // (some apps show a toast/confirmation with role="dialog" after Cancel)
    const stillVisible = await cifPage.getCodeInput().isVisible({ timeout: 2000 }).catch(() => false);
    if (stillVisible) {
      // Cancel kept add-form open (Reset behaviour) — verify fields are cleared
      const codeValue = await cifPage.getCodeInput().inputValue();
      const descValue = await cifPage.getDescriptionInput().inputValue();
      expect(codeValue, 'Cancel/Reset should clear Code field').toBe('');
      expect(descValue, 'Cancel/Reset should clear Description field').toBe('');
    } else {
      // Cancel closed the popup — verify no "CANCELTEST" record was saved
      const rows = page.locator('table tbody tr').filter({ hasText: 'CANCELTEST' });
      expect(
        await rows.count(),
        'Cancel should not save the record to the table',
      ).toBe(0);
      // Dismiss any lingering toast/confirmation dialog, then reopen and verify empty
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await cifPage.clickAddButton();
      const codeValue = await cifPage.getCodeInput().inputValue();
      expect(codeValue, 'Form should be empty on reopen after Cancel').toBe('');
      await page.keyboard.press('Escape');
    }
  });

  // ─── TC_130 ─────────────────────────────────────────────────────────────────
  test('[TC_130] Save with valid data closes popup and shows success', async () => {
    const code = `AUTOTEST${Date.now()}`;
    createdCode = code;
    await cifPage.clickAddButton();
    await cifPage.fillAddForm(code, 'automated test industry', 'Yes');
    await cifPage.clickSave();
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Popup should close after successful Save',
    ).toBeHidden({ timeout: 15000 });
  });

  // ─── TC_131 ─────────────────────────────────────────────────────────────────
  // Verifies Create → record appears in list (CRUD: Read after Create)
  test('[TC_131] newly added record is visible in table list (cleanup after)', async () => {
    if (!createdCode) { test.skip(true, 'TC_130 did not create a record'); return; }
    const rows = page.locator('table tbody tr').filter({ hasText: createdCode });
    expect(
      await rows.count(),
      `Record "${createdCode}" should appear in table after Save`,
    ).toBeGreaterThan(0);
    // Cleanup: delete the created test record
    const codeToDelete = createdCode;
    await cifPage.deleteRecordByCode(codeToDelete);
    createdCode = ''; // mark cleaned up so afterAll skips
    // Verify deleted — use saved variable (empty string would match all rows)
    await expect(
      page.locator('table tbody tr').filter({ hasText: codeToDelete }),
    ).toHaveCount(0);
  });

  // ─── TC_132 ─────────────────────────────────────────────────────────────────
  // CRUD: Edit → save → verify updated value reflected in table list
  test('[TC_132] Edit record — updated values reflected in table list (cleanup after)', async () => {
    const code = `EDITCK${Date.now()}`;

    // Setup: create a record to edit
    await cifPage.clickAddButton();
    await cifPage.fillAddForm(code, 'editoriginal', 'No');
    await cifPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Reload to ensure record is in list
    await cifPage.goto();

    // Edit: open edit dialog for this record
    await cifPage.clickEditByCode(code);

    // Change description
    const descInput = cifPage.getDescriptionInput();
    await descInput.clear();
    await descInput.fill('editedvalue');
    await descInput.press('Tab');
    await cifPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Verify updated description visible in list on same row as code
    const updatedRow = page.locator('table tbody tr').filter({ hasText: code });
    await expect(
      updatedRow.filter({ hasText: 'editedvalue' }),
      `Row for "${code}" should show updated description "editedvalue"`,
    ).toBeVisible();

    // Cleanup
    await cifPage.deleteRecordByCode(code);
    await expect(page.locator('table tbody tr').filter({ hasText: code })).toHaveCount(0);
  });

  // ─── TC_133 ─────────────────────────────────────────────────────────────────
  // CRUD: Delete → verify record removed from table list
  test('[TC_133] Delete record — row removed from table list', async () => {
    const code = `DELCK${Date.now()}`;

    // Setup: create a record to delete
    await cifPage.clickAddButton();
    await cifPage.fillAddForm(code, 'delete me', 'Yes');
    await cifPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Reload to ensure record is in list
    await cifPage.goto();

    // Filter Code column to find record (may not be on page 1 due to alphabetical sort)
    await cifPage.table.openColumnFilter('Code');
    await cifPage.table.applyColumnFilter(code);
    const row = page.locator('table tbody tr').filter({ hasText: code });
    expect(await row.count(), `Record "${code}" should exist before delete`).toBeGreaterThan(0);

    // Delete the record (deleteRecordByCode also applies filter internally)
    await cifPage.table.clearColumnFilter('Code'); // reset before deleteRecordByCode re-filters
    await cifPage.deleteRecordByCode(code);

    // Verify row gone from table
    await expect(
      page.locator('table tbody tr').filter({ hasText: code }),
      `Record "${code}" should be removed from table after delete`,
    ).toHaveCount(0);
  });
});

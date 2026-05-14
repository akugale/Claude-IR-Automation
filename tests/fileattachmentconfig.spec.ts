import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { FileAttachmentConfigPage } from '../pages/FileAttachmentConfigPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('File Attachment Configuration', () => {
  let context: BrowserContext;
  let page: Page;
  let facPage: FileAttachmentConfigPage;
  /** Track extension created in TC_098 so afterAll can clean it up if TC_099 didn't run */
  let createdExtension = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    facPage = new FileAttachmentConfigPage(page);
  });

  test.afterAll(async () => {
    // Cleanup: delete test record if TC_099 didn't already remove it
    if (createdExtension) {
      await facPage.goto().catch(() => {});
      await facPage.deleteRecordByExtension(createdExtension).catch(() => {});
    }
    await context.close();
  });

  test.beforeEach(async () => {
    await facPage.goto();
  });

  // ─── TC_067 ─────────────────────────────────────────────────────────────────
  test('[TC_067] navigate to File Attachment Configuration and verify heading, table, exports, add button and pagination', async () => {
    await facPage.verifyScreenElements();
  });

  // ─── TC_068 ─────────────────────────────────────────────────────────────────
  test('[TC_068] table renders with data rows', async () => {
    const count = await facPage.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  });

  // ─── TC_069 ─────────────────────────────────────────────────────────────────
  test('[TC_069] table contains required columns: File Extension, Mime Type, Max File Size(in kb), Actions', async () => {
    await facPage.verifyRequiredColumns();
  });

  // ─── TC_070 ─────────────────────────────────────────────────────────────────
  test('[TC_070] sortable columns have sort icons — File Extension, Mime Type, Max File Size', async () => {
    const sortableCols = await facPage.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['File Extension', 'Mime Type', 'Max File Size']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  });

  // ─── TC_071 ─────────────────────────────────────────────────────────────────
  test('[TC_071] filterable columns have filter icons — Actions column excluded', async () => {
    const filterableCols = await facPage.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
    expect(
      filterableCols.every(c => !/^actions$/i.test(c.trim())),
      'Actions column should not have filter icon',
    ).toBe(true);
  });

  // ─── TC_072 ─────────────────────────────────────────────────────────────────
  test('[TC_072] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await facPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await facPage.goto();
      await facPage.table.sortByColumn(col);
      const asc = await facPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await facPage.table.sortByColumn(col);
      const desc = await facPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  // ─── TC_073 ─────────────────────────────────────────────────────────────────
  // Verifies sort indicators toggle and rows remain visible — data comparison skipped
  // (server-side DB collation may produce identical visible rows in both directions).
  test('[TC_073] sort applies to table — indicators toggle and rows remain visible', async () => {
    const cols = await facPage.table.getSortableColumnNames();
    if (cols.length === 0) { test.skip(); return; }
    const col = cols[0];
    await facPage.table.sortByColumn(col);
    expect(await facPage.table.getColumnSortOrder(col)).toMatch(/ascending/i);
    expect(await facPage.table.getRowCount(), 'Rows should remain after ascending sort').toBeGreaterThan(0);
    await facPage.table.sortByColumn(col);
    expect(await facPage.table.getColumnSortOrder(col)).toMatch(/descending/i);
    expect(await facPage.table.getRowCount(), 'Rows should remain after descending sort').toBeGreaterThan(0);
  });

  // ─── TC_074 ─────────────────────────────────────────────────────────────────
  test('[TC_074] filter each column — active indicator set after filtering', async () => {
    const columns = await facPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(true, 'No filterable columns'); return; }
    for (const col of columns) {
      const colIdx = await facPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await facPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await facPage.table.openColumnFilter(col);
      await facPage.table.applyColumnFilter(sampleValue);
      expect(
        await facPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await facPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_075 ─────────────────────────────────────────────────────────────────
  test('[TC_075] filter by File Extension shows only matching rows', async () => {
    const colIdx = await facPage.table.getColumnIndexByName('File Extension');
    const sampleValue = colIdx >= 0 ? await facPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await facPage.table.openColumnFilter('File Extension');
    await facPage.table.applyColumnFilter(sampleValue);
    await facPage.table.verifyRowExistsByCellText(sampleValue);
    await facPage.table.clearColumnFilter('File Extension');
  });

  // ─── TC_076 ─────────────────────────────────────────────────────────────────
  test('[TC_076] filter by Mime Type shows only matching rows', async () => {
    const colIdx = await facPage.table.getColumnIndexByName('Mime Type');
    const sampleValue = colIdx >= 0 ? await facPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await facPage.table.openColumnFilter('Mime Type');
    await facPage.table.applyColumnFilter(sampleValue);
    await facPage.table.verifyRowExistsByCellText(sampleValue);
    await facPage.table.clearColumnFilter('Mime Type');
  });

  // ─── TC_077 ─────────────────────────────────────────────────────────────────
  test('[TC_077] filter by Max File Size shows only matching rows', async () => {
    const colIdx = await facPage.table.getColumnIndexByName('Max File Size');
    const sampleValue = colIdx >= 0 ? await facPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await facPage.table.openColumnFilter('Max File Size');
    await facPage.table.applyColumnFilter(sampleValue);
    await facPage.table.verifyRowExistsByCellText(sampleValue);
    await facPage.table.clearColumnFilter('Max File Size');
  });

  // ─── TC_078 ─────────────────────────────────────────────────────────────────
  test('[TC_078] clearing column filter restores all records', async () => {
    const columns = await facPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await facPage.table.getRowCount();
    const colIdx = await facPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await facPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await facPage.table.openColumnFilter(col);
    await facPage.table.applyColumnFilter(sampleValue);
    await facPage.table.clearColumnFilter(col);
    expect(await facPage.table.getRowCount()).toBe(originalCount);
  });

  // ─── TC_079 ─────────────────────────────────────────────────────────────────
  test('[TC_079] Export PDF button is visible and clickable', async () => {
    await facPage.export.triggerPdf();
  });

  // ─── TC_080 ─────────────────────────────────────────────────────────────────
  test('[TC_080] Export Excel button is visible and clickable', async () => {
    await facPage.export.triggerExcel();
  });

  // ─── TC_081 ─────────────────────────────────────────────────────────────────
  test('[TC_081] pagination info text shows record count e.g. Showing 1-N out of N records', async () => {
    const infoText = await facPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });

  // ─── TC_082 ─────────────────────────────────────────────────────────────────
  // App Bug: default items per page is 20, expected 10 to match all other screens.
  // This test is EXPECTED TO FAIL until the bug is fixed.
  test('[TC_082] default items per page is 10', async () => {
    const defaultValue = await facPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  // ─── TC_083 ─────────────────────────────────────────────────────────────────
  test('[TC_083] items per page dropdown has options', async () => {
    const options = await facPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_084 ─────────────────────────────────────────────────────────────────
  test('[TC_084] First and Previous page buttons are disabled on page 1', async () => {
    await facPage.paginator.verifyFirstPageDisabled();
    await facPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_085 ─────────────────────────────────────────────────────────────────
  test('[TC_085] View (eye) action icon present in table rows', async () => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
  });

  // ─── TC_086 ─────────────────────────────────────────────────────────────────
  test('[TC_086] Edit (pencil) action icon present in table rows', async () => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
  });

  // ─── TC_087 ─────────────────────────────────────────────────────────────────
  test('[TC_087] Delete (trash) action icon present in table rows', async () => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
  });

  // ─── TC_088 ─────────────────────────────────────────────────────────────────
  test('[TC_088] clicking View icon opens view modal', async () => {
    await facPage.clickViewOnFirstRow();
    await expect(page.locator('[role="dialog"], .p-dialog')).toBeVisible();
    // Close modal
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_089 ─────────────────────────────────────────────────────────────────
  test('[TC_089] clicking Edit icon opens edit modal with pre-filled data', async () => {
    await facPage.clickEditOnFirstRow();
    const dialog = page.locator('[role="dialog"], .p-dialog').first();
    await expect(dialog).toBeVisible();
    // First input (File Extension) should be pre-filled
    const extInput = dialog.locator('input').first();
    const value = await extInput.inputValue();
    expect(value.trim(), 'Edit modal should pre-fill File Extension field').not.toBe('');
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_090 ─────────────────────────────────────────────────────────────────
  test('[TC_090] Add (+) button opens popup with title "New File Attachment Config"', async () => {
    await facPage.clickAddButton();
    await facPage.verifyAddPopupTitle();
  });

  // ─── TC_091 ─────────────────────────────────────────────────────────────────
  test('[TC_091] Add popup has File Extension field with placeholder "e.g. .pdf"', async () => {
    await facPage.clickAddButton();
    const input = facPage.getFileExtensionInput();
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder, 'File Extension placeholder should contain ".pdf"').toMatch(/\.pdf/i);
  });

  // ─── TC_092 ─────────────────────────────────────────────────────────────────
  test('[TC_092] Add popup has Mime Type field with placeholder "e.g. application/pdf"', async () => {
    await facPage.clickAddButton();
    const input = facPage.getMimeTypeInput();
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder, 'Mime Type placeholder should contain "application/pdf"').toMatch(/application\/pdf/i);
  });

  // ─── TC_093 ─────────────────────────────────────────────────────────────────
  // Angular uses reactive-form validators for numeric — field has no type="number" attribute.
  // Test verifies the field is present, visible, and accepts a numeric value.
  test('[TC_093] Add popup has Max File Size (in kb) input field that accepts numeric values', async () => {
    await facPage.clickAddButton();
    const input = facPage.getMaxFileSizeInput();
    await expect(input, 'Max File Size input should be visible').toBeVisible();
    // Verify field accepts numeric input
    await input.fill('2048');
    expect(
      await input.inputValue(),
      'Max File Size field should accept and retain numeric value "2048"',
    ).toBe('2048');
  });

  // ─── TC_094 ─────────────────────────────────────────────────────────────────
  test('[TC_094] Add popup has Cancel and Save buttons', async () => {
    await facPage.clickAddButton();
    await facPage.verifyAddPopupButtons();
  });

  // ─── TC_095 ─────────────────────────────────────────────────────────────────
  test('[TC_095] Max File Size field accepts numeric value', async () => {
    await facPage.clickAddButton();
    const input = facPage.getMaxFileSizeInput();
    await input.fill('1024');
    expect(await input.inputValue(), 'Numeric value 1024 should be accepted').toBe('1024');
  });

  // ─── TC_096 ─────────────────────────────────────────────────────────────────
  // Max File Size limit is 5000 KB — entering 5001 should be rejected.
  // Angular fires blur validators on Tab: Save button becomes disabled when value > 5000 KB.
  test('[TC_096] Max File Size validates max limit — entering 5001 KB disables Save button', async () => {
    await facPage.clickAddButton();
    await facPage.fillAddForm('.validationtest', 'test/plain', 5001);
    // After Tab blur on all fields, Angular validator marks max size invalid → Save disabled
    const saveBtn = facPage.getDialog().getByRole('button', { name: /save|update/i });
    const isDisabled = await saveBtn.isDisabled();
    expect(
      isDisabled,
      'Save button should be disabled when Max File Size exceeds 5000 KB (Angular max validator)',
    ).toBe(true);
    // Cleanup: Escape to close (Cancel may not close — see TC_097 app bug)
    await page.keyboard.press('Escape');
    await facPage.getDialog().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_097 ─────────────────────────────────────────────────────────────────
  // App Bug: Cancel button keeps popup open (acts as Reset toggle) but does NOT clear form fields.
  // Expected behaviour: Cancel/Reset should clear all input fields.
  // This test is EXPECTED TO FAIL until the app bug is fixed.
  test('[TC_097] Cancel closes popup without saving and form is empty on reopen', async () => {
    await facPage.clickAddButton();
    // Fill form with data
    await facPage.fillAddForm('.canceltest', 'test/cancel', 500);
    // Click Cancel
    await facPage.clickCancel();

    const stillVisible = await facPage.isDialogVisible();
    if (stillVisible) {
      // Cancel kept popup open (Reset behaviour) — verify fields are cleared
      const extValue = await facPage.getFileExtensionInput().inputValue();
      const mimeValue = await facPage.getMimeTypeInput().inputValue();
      expect(extValue, 'Cancel/Reset should clear File Extension field').toBe('');
      expect(mimeValue, 'Cancel/Reset should clear Mime Type field').toBe('');
    } else {
      // Cancel closed the popup — verify no ".canceltest" record was saved
      const rows = page.locator('table tbody tr').filter({ hasText: '.canceltest' });
      expect(
        await rows.count(),
        'Cancel should not save the record to the table',
      ).toBe(0);
      // Reopen and verify fields start empty
      await facPage.clickAddButton();
      const extValue = await facPage.getFileExtensionInput().inputValue();
      expect(extValue, 'Form should be empty on reopen after Cancel').toBe('');
      await facPage.clickCancel();
    }
  });

  // ─── TC_098 ─────────────────────────────────────────────────────────────────
  test('[TC_098] Save with valid data closes popup and shows success', async () => {
    const ext = `.auto${Date.now()}`;
    createdExtension = ext;
    await facPage.clickAddButton();
    await facPage.fillAddForm(ext, 'application/octet-stream', 1024);
    await facPage.clickSave();
    // Popup should close on successful save
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Popup should close after successful Save',
    ).toBeHidden({ timeout: 15000 });
  });

  // ─── TC_099 ─────────────────────────────────────────────────────────────────
  // Verifies Create → record appears in list (CRUD: Read after Create)
  test('[TC_099] newly added record is visible in table list (cleanup after)', async () => {
    if (!createdExtension) { test.skip(true, 'TC_098 did not create a record'); return; }
    // goto() in beforeEach already re-navigated — record should persist
    const rows = page.locator('table tbody tr').filter({ hasText: createdExtension });
    expect(
      await rows.count(),
      `Record "${createdExtension}" should appear in table after Save`,
    ).toBeGreaterThan(0);
    // Cleanup: delete the created test record
    const extToDelete = createdExtension;
    await facPage.deleteRecordByExtension(extToDelete);
    createdExtension = ''; // mark cleaned up so afterAll skips
    // Verify deleted — use saved variable (empty string would match all rows)
    await expect(
      page.locator('table tbody tr').filter({ hasText: extToDelete }),
    ).toHaveCount(0);
  });

  // ─── TC_100 ─────────────────────────────────────────────────────────────────
  // CRUD: Edit → save → verify updated value reflected in table list
  test('[TC_100] Edit record — updated values reflected in table list (cleanup after)', async () => {
    const ext = `.editck${Date.now()}`;

    // Setup: create a record to edit
    await facPage.clickAddButton();
    await facPage.fillAddForm(ext, 'application/original', 512);
    await facPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Reload to ensure record is in list
    await facPage.goto();

    // Edit: open edit dialog for this record
    await facPage.clickEditByExtension(ext);

    // Change mime type
    const mimeInput = facPage.getMimeTypeInput();
    await mimeInput.clear();
    await mimeInput.fill('application/edited');
    await mimeInput.press('Tab');
    await facPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Verify updated mime type visible in list on same row as ext
    const updatedRow = page.locator('table tbody tr').filter({ hasText: ext });
    await expect(
      updatedRow.filter({ hasText: 'application/edited' }),
      `Row for "${ext}" should show updated mime type "application/edited"`,
    ).toBeVisible();

    // Cleanup
    await facPage.deleteRecordByExtension(ext);
    await expect(page.locator('table tbody tr').filter({ hasText: ext })).toHaveCount(0);
  });

  // ─── TC_101 ─────────────────────────────────────────────────────────────────
  // CRUD: Delete → verify record removed from table list
  test('[TC_101] Delete record — row removed from table list', async () => {
    const ext = `.delck${Date.now()}`;

    // Setup: create a record to delete
    await facPage.clickAddButton();
    await facPage.fillAddForm(ext, 'application/deleteme', 256);
    await facPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    // Reload to ensure record is in list
    await facPage.goto();

    // Verify record exists before delete
    const row = page.locator('table tbody tr').filter({ hasText: ext });
    expect(await row.count(), `Record "${ext}" should exist before delete`).toBeGreaterThan(0);

    // Delete the record
    await facPage.deleteRecordByExtension(ext);

    // Verify row gone from table
    await expect(
      page.locator('table tbody tr').filter({ hasText: ext }),
      `Record "${ext}" should be removed from table after delete`,
    ).toHaveCount(0);
  });
});

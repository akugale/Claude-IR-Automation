import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { MappingWithIndustryPage } from '../pages/MappingWithIndustryPage';
import { CorfIndustryPage } from '../pages/CorfIndustryPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

/** Timestamp-based unique CORF Industry — generated once per test run.
 *  New code every run = zero duplicate conflict, no cleanup-before-add needed. */
const RUN_ID = String(Date.now()).slice(-6);
const TEST_CORF_CODE = `MWI${RUN_ID}`;
const TEST_CORF_DESC = `Auto MWI Test ${RUN_ID}`;

test.describe('Mapping with Industry', () => {
  let context: BrowserContext;
  let page: Page;
  let mwiPage: MappingWithIndustryPage;
  let corfPage: CorfIndustryPage;

  /** Sub Industry used in TC_163 — shared across TC_164, TC_165, TC_166, TC_167 */
  let createdSubIndustry = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);

    corfPage = new CorfIndustryPage(page);
    mwiPage = new MappingWithIndustryPage(page);

    // Create unique CORF Industry for this run — timestamp code guarantees no duplicate
    await corfPage.goto();
    await corfPage.clickAddButton();
    await corfPage.fillAddForm(TEST_CORF_CODE, TEST_CORF_DESC, 'No');
    await corfPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });
  });

  test.afterAll(async () => {
    // Cleanup: delete CORF Industry and any remaining mapping created in tests
    try {
      if (createdSubIndustry) {
        await mwiPage.goto().catch(() => {});
        await mwiPage.deleteRecordBySubIndustry(createdSubIndustry).catch(() => {});
        await mwiPage.table.clearColumnFilter('Sub Industry').catch(() => {});
      }
      await corfPage.goto().catch(() => {});
      await corfPage.deleteRecordByCode(TEST_CORF_CODE).catch(() => {});
      await corfPage.table.clearColumnFilter('Code').catch(() => {});
    } catch { /* best-effort cleanup */ }
    await context.close();
  });

  test.beforeEach(async () => {
    await mwiPage.goto();
  });

  // ─── TC_134 ─────────────────────────────────────────────────────────────────
  test('[TC_134] navigate to Mapping with Industry and verify heading, table, exports, add button and pagination', async () => {
    await mwiPage.verifyScreenElements();
  });

  // ─── TC_135 ─────────────────────────────────────────────────────────────────
  // App Bug: table shows extra "Status" column — only Industry, Sub Industry, CORF Industry, Actions expected.
  // This test is EXPECTED TO FAIL until the Status column is removed.
  test('[TC_135] table has exactly: Industry, Sub Industry, CORF Industry, Actions — no extra columns', async () => {
    await mwiPage.verifyRequiredColumns();
  });

  // ─── TC_136 ─────────────────────────────────────────────────────────────────
  test('[TC_136] table renders with data rows', async () => {
    const count = await mwiPage.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  });

  // ─── TC_137 ─────────────────────────────────────────────────────────────────
  test('[TC_137] sortable columns include Industry, Sub Industry, CORF Industry', async () => {
    const sortableCols = await mwiPage.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['Industry', 'Sub Industry', 'CORF Industry']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  });

  // ─── TC_138 ─────────────────────────────────────────────────────────────────
  test('[TC_138] filterable columns have filter icons — Actions column excluded', async () => {
    const filterableCols = await mwiPage.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
    expect(
      filterableCols.every(c => !/^actions$/i.test(c.trim())),
      'Actions column should not have filter icon',
    ).toBe(true);
  });

  // ─── TC_139 ─────────────────────────────────────────────────────────────────
  test('[TC_139] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await mwiPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await mwiPage.goto();
      await mwiPage.table.sortByColumn(col);
      const asc = await mwiPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await mwiPage.table.sortByColumn(col);
      const desc = await mwiPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  // ─── TC_140 ─────────────────────────────────────────────────────────────────
  test('[TC_140] sort applies to table — indicators toggle and rows remain visible', async () => {
    const cols = await mwiPage.table.getSortableColumnNames();
    if (cols.length === 0) { test.skip(); return; }
    const col = cols[0];
    await mwiPage.table.sortByColumn(col);
    expect(await mwiPage.table.getColumnSortOrder(col)).toMatch(/ascending/i);
    expect(await mwiPage.table.getRowCount(), 'Rows should remain after ascending sort').toBeGreaterThan(0);
    await mwiPage.table.sortByColumn(col);
    expect(await mwiPage.table.getColumnSortOrder(col)).toMatch(/descending/i);
    expect(await mwiPage.table.getRowCount(), 'Rows should remain after descending sort').toBeGreaterThan(0);
  });

  // ─── TC_141 ─────────────────────────────────────────────────────────────────
  test('[TC_141] filter each column — active indicator set and data is filtered', async () => {
    const columns = await mwiPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(true, 'No filterable columns'); return; }
    for (const col of columns) {
      const colIdx = await mwiPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await mwiPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await mwiPage.table.openColumnFilter(col);
      await mwiPage.table.applyColumnFilter(sampleValue);
      // Assert 1: filter active indicator is set
      expect(
        await mwiPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      // Assert 2: ALL visible rows contain the filter value — data is actually filtered
      await mwiPage.table.verifyAllRowsInColumnContain(col, sampleValue);
      await mwiPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_142 ─────────────────────────────────────────────────────────────────
  test('[TC_142] filter Industry column shows matching rows', async () => {
    const colIdx = await mwiPage.table.getColumnIndexByName('Industry');
    const sampleValue = colIdx >= 0 ? await mwiPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await mwiPage.table.openColumnFilter('Industry');
    await mwiPage.table.applyColumnFilter(sampleValue);
    await mwiPage.table.verifyRowExistsByCellText(sampleValue);
    await mwiPage.table.verifyAllRowsInColumnContain('Industry', sampleValue);
    await mwiPage.table.clearColumnFilter('Industry');
  });

  // ─── TC_143 ─────────────────────────────────────────────────────────────────
  test('[TC_143] filter Sub Industry column shows matching rows', async () => {
    const colIdx = await mwiPage.table.getColumnIndexByName('Sub Industry');
    const sampleValue = colIdx >= 0 ? await mwiPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await mwiPage.table.openColumnFilter('Sub Industry');
    await mwiPage.table.applyColumnFilter(sampleValue);
    await mwiPage.table.verifyRowExistsByCellText(sampleValue);
    await mwiPage.table.verifyAllRowsInColumnContain('Sub Industry', sampleValue);
    await mwiPage.table.clearColumnFilter('Sub Industry');
  });

  // ─── TC_144 ─────────────────────────────────────────────────────────────────
  test('[TC_144] filter CORF Industry column shows matching rows', async () => {
    const colIdx = await mwiPage.table.getColumnIndexByName('CORF Industry');
    const sampleValue = colIdx >= 0 ? await mwiPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await mwiPage.table.openColumnFilter('CORF Industry');
    await mwiPage.table.applyColumnFilter(sampleValue);
    await mwiPage.table.verifyRowExistsByCellText(sampleValue);
    await mwiPage.table.verifyAllRowsInColumnContain('CORF Industry', sampleValue);
    await mwiPage.table.clearColumnFilter('CORF Industry');
  });

  // ─── TC_145 ─────────────────────────────────────────────────────────────────
  test('[TC_145] clearing column filter restores all records', async () => {
    const columns = await mwiPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await mwiPage.table.getRowCount();
    const colIdx = await mwiPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await mwiPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await mwiPage.table.openColumnFilter(col);
    await mwiPage.table.applyColumnFilter(sampleValue);
    await mwiPage.table.clearColumnFilter(col);
    expect(await mwiPage.table.getRowCount()).toBe(originalCount);
  });

  // ─── TC_146 ─────────────────────────────────────────────────────────────────
  test('[TC_146] Export PDF button is visible and clickable', async () => {
    await mwiPage.export.triggerPdf();
  });

  // ─── TC_147 ─────────────────────────────────────────────────────────────────
  test('[TC_147] Export Excel button is visible and clickable', async () => {
    await mwiPage.export.triggerExcel();
  });

  // ─── TC_148 ─────────────────────────────────────────────────────────────────
  test('[TC_148] pagination info text shows record count e.g. Showing 1-N out of N records', async () => {
    const infoText = await mwiPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });

  // ─── TC_149 ─────────────────────────────────────────────────────────────────
  // App Bug: default items per page is 20, expected 10.
  // This test is EXPECTED TO FAIL until the bug is fixed.
  test('[TC_149] default items per page is 10', async () => {
    const defaultValue = await mwiPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  // ─── TC_150 ─────────────────────────────────────────────────────────────────
  test('[TC_150] items per page dropdown has options', async () => {
    const options = await mwiPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_151 ─────────────────────────────────────────────────────────────────
  test('[TC_151] First and Previous page buttons are disabled on page 1', async () => {
    await mwiPage.paginator.verifyFirstPageDisabled();
    await mwiPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_152 ─────────────────────────────────────────────────────────────────
  test('[TC_152] View (eye) action icon present in table rows', async () => {
    const firstRow = mwiPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
  });

  // ─── TC_153 ─────────────────────────────────────────────────────────────────
  test('[TC_153] Edit (pencil) action icon present in table rows', async () => {
    const firstRow = mwiPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
  });

  // ─── TC_154 ─────────────────────────────────────────────────────────────────
  test('[TC_154] Delete (trash) action icon present in table rows', async () => {
    const firstRow = mwiPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
  });

  // ─── TC_155 ─────────────────────────────────────────────────────────────────
  test('[TC_155] clicking View icon opens view modal', async () => {
    await mwiPage.clickViewOnFirstRow();
    await expect(page.locator('[role="dialog"], .p-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_156 ─────────────────────────────────────────────────────────────────
  test('[TC_156] clicking Edit icon opens edit modal with pre-filled Sub Industry dropdown', async () => {
    await mwiPage.clickEditOnFirstRow();
    const dialog = page.locator('[role="dialog"], .p-dialog').first();
    await expect(dialog).toBeVisible();
    // Sub Industry dropdown should show a selected value (not empty placeholder)
    const subIndustryDropdown = mwiPage.getSubIndustryDropdown();
    const labelText = await subIndustryDropdown
      .locator('.p-select-label, .p-dropdown-label')
      .innerText()
      .catch(() => '');
    expect(labelText.trim(), 'Edit modal Sub Industry should be pre-filled').not.toMatch(/select sub-industry/i);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_157 ─────────────────────────────────────────────────────────────────
  test('[TC_157] Add (+) button opens popup with title "New Mapping"', async () => {
    await mwiPage.clickAddButton();
    await expect(
      mwiPage.getDialog().getByText(/new mapping/i),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  // ─── TC_158 ─────────────────────────────────────────────────────────────────
  test('[TC_158] Add popup has Sub Industry dropdown, Industry auto-populated field, CORF Industry dropdown', async () => {
    await mwiPage.clickAddButton();
    const dialog = mwiPage.getDialog();

    // Sub Industry dropdown visible
    await expect(mwiPage.getSubIndustryDropdown(), 'Sub Industry dropdown should be visible').toBeVisible();

    // Industry input visible (auto-populated, read-only)
    await expect(mwiPage.getIndustryInput(), 'Industry field should be visible').toBeVisible();

    // CORF Industry dropdown visible
    await expect(mwiPage.getCorfIndustryDropdown(), 'CORF Industry dropdown should be visible').toBeVisible();

    // Cancel and Save buttons present
    await expect(dialog.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /save/i })).toBeVisible();

    await page.keyboard.press('Escape');
  });

  // ─── TC_159 ─────────────────────────────────────────────────────────────────
  // Cross-reference: Sub Industry dropdown options should match Sub Industry screen data.
  // NOTE: No dedicated Sub Industry screen URL found in nav — verifying options non-empty.
  // Full cross-reference requires Sub Industry screen URL to compare full list.
  test('[TC_159] Sub Industry dropdown has options (from Sub Industry source data)', async () => {
    await mwiPage.clickAddButton();
    const options = await mwiPage.getDropdownOptions(mwiPage.getSubIndustryDropdown());
    expect(
      options.length,
      `Sub Industry dropdown should have options but found 0. Verify Sub Industry source data is loaded.`,
    ).toBeGreaterThan(0);
    // All options should be non-empty strings
    expect(
      options.every(o => o.trim().length > 0),
      'All Sub Industry options should be non-empty strings',
    ).toBe(true);

    // Verify dropdown scrolling: Sub Industry has 300+ options — virtual scroll must work
    await mwiPage.getSubIndustryDropdown().click();
    const scrollListbox = page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await scrollListbox.waitFor({ state: 'visible', timeout: 10000 });
    const scrollOpts = scrollListbox.locator('[role="option"], .p-select-option, .p-dropdown-item');
    await scrollOpts.first().waitFor({ state: 'visible', timeout: 5000 });

    // Capture first batch of visible options before scroll
    const beforeScroll = await scrollOpts.allInnerTexts();

    // Scroll down inside the dropdown listbox
    await scrollListbox.hover();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(400); // let virtual scroll re-render

    // Options visible after scroll should differ (new items scrolled into view)
    const afterScroll = await scrollOpts.allInnerTexts();
    expect(
      afterScroll,
      'Sub Industry dropdown should scroll — visible options after scroll should differ from before',
    ).not.toEqual(beforeScroll);

    // Close dropdown without selecting
    await page.keyboard.press('Escape');
    await scrollListbox.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_160 ─────────────────────────────────────────────────────────────────
  // Cross-reference: CORF Industry dropdown options should match CORF Industry tab records.
  test('[TC_160] CORF Industry dropdown options reflect CORF Industry tab data', async () => {
    // Collect CORF Industry descriptions from first tab
    const corfDescriptions = await mwiPage.getCorfIndustryTabDescriptions();
    expect(
      corfDescriptions.length,
      'CORF Industry tab should have records to cross-reference against',
    ).toBeGreaterThan(0);

    // Open Add popup and get CORF Industry dropdown options
    await mwiPage.clickAddButton();
    const dropdownOptions = await mwiPage.getDropdownOptions(mwiPage.getCorfIndustryDropdown());
    expect(dropdownOptions.length, 'CORF Industry dropdown should have options').toBeGreaterThan(0);

    // At least one CORF Industry description from the tab should appear in dropdown
    const overlap = corfDescriptions.some(desc =>
      dropdownOptions.some(opt => opt.toLowerCase().includes(desc.toLowerCase()) || desc.toLowerCase().includes(opt.toLowerCase())),
    );
    expect(
      overlap,
      `CORF Industry dropdown options [${dropdownOptions.slice(0, 3).join(', ')}...] should match CORF Industry tab records [${corfDescriptions.slice(0, 3).join(', ')}...]`,
    ).toBe(true);

    // Verify CORF Industry dropdown scrolling
    await mwiPage.getCorfIndustryDropdown().click();
    const corfScrollListbox = page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await corfScrollListbox.waitFor({ state: 'visible', timeout: 10000 });
    const corfScrollOpts = corfScrollListbox.locator('[role="option"], .p-select-option, .p-dropdown-item');
    await corfScrollOpts.first().waitFor({ state: 'visible', timeout: 5000 });

    const corfOptsBefore = await corfScrollOpts.allInnerTexts();
    await corfScrollListbox.hover();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(400);
    const corfOptsAfter = await corfScrollOpts.allInnerTexts();

    // If CORF Industry has fewer items and all fit in viewport, scroll may not change options
    // — assert scroll is at least possible (no error thrown) and options still present
    expect(
      corfOptsAfter.length,
      'CORF Industry dropdown options should still be present after scroll',
    ).toBeGreaterThan(0);
    // If more items than viewport, options should change — soft check
    if (corfOptsBefore.length > 5) {
      expect(
        corfOptsAfter,
        'CORF Industry dropdown should scroll — visible options should differ from before',
      ).not.toEqual(corfOptsBefore);
    }

    await page.keyboard.press('Escape');
    await corfScrollListbox.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});

    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_161 ─────────────────────────────────────────────────────────────────
  test('[TC_161] Industry field auto-populates when Sub Industry is selected', async () => {
    await mwiPage.clickAddButton();

    // Before selection: Industry field should be empty or show placeholder
    const beforeValue = await mwiPage.getIndustryInput().inputValue().catch(() => '');

    // Select first Sub Industry option
    await mwiPage.selectFirstDropdownOption(mwiPage.getSubIndustryDropdown());

    // After selection: Industry field should have a non-empty value
    const afterValue = await mwiPage.getIndustryInput().inputValue().catch(() => '');
    expect(
      afterValue.trim().length,
      `Industry field should auto-populate after Sub Industry selection. Got: "${afterValue}"`,
    ).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_162 ─────────────────────────────────────────────────────────────────
  // App Bug: Cancel button may keep popup open without clearing fields (same pattern as CORF Industry screen).
  // This test is EXPECTED TO FAIL if Cancel keeps form open with pre-filled values.
  test('[TC_162] Cancel closes popup without saving and form is empty on reopen', async () => {
    await mwiPage.clickAddButton();

    // Select first available Sub Industry (to verify Cancel clears it)
    await mwiPage.selectFirstDropdownOption(mwiPage.getSubIndustryDropdown());
    await mwiPage.clickCancel();

    // Check specifically for the dialog title "New Mapping" — not just any dialog/toast
    const stillOpen = await mwiPage.getDialog()
      .getByText(/new mapping/i)
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (stillOpen) {
      // Cancel kept dialog open (Reset behaviour) — verify Sub Industry is cleared
      const subIndustryLabel = await mwiPage.getSubIndustryDropdown()
        .locator('.p-select-label, .p-dropdown-label')
        .innerText()
        .catch(() => '');
      expect(
        subIndustryLabel.trim(),
        'Cancel/Reset should clear Sub Industry dropdown selection',
      ).toMatch(/select sub-industry/i);
    } else {
      // Cancel closed popup — verify no stale record, form empty on reopen
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await mwiPage.clickAddButton();
      const subIndustryLabel = await mwiPage.getSubIndustryDropdown()
        .locator('.p-select-label, .p-dropdown-label')
        .innerText()
        .catch(() => '');
      expect(
        subIndustryLabel.trim(),
        'Form should be empty on reopen after Cancel',
      ).toMatch(/select sub-industry/i);
      await page.keyboard.press('Escape');
    }
  });

  // ─── TC_163 ─────────────────────────────────────────────────────────────────
  // CRUD chain: TC_163 → TC_164 → TC_165 → TC_166 (all operate on same record via createdSubIndustry)
  // TC_167 is self-contained — runs after TC_166, creates own record, tests duplicate, cleans up
  test('[TC_163] Save with valid data closes popup and shows success', async () => {
    await mwiPage.clickAddButton();
    createdSubIndustry = await mwiPage.selectFirstDropdownOption(mwiPage.getSubIndustryDropdown());
    await mwiPage.selectDropdownOption(mwiPage.getCorfIndustryDropdown(), TEST_CORF_DESC);
    await mwiPage.clickSave();
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Popup should close after successful Save',
    ).toBeHidden({ timeout: 15000 });
    expect(createdSubIndustry.length, 'createdSubIndustry must be set for CRUD chain').toBeGreaterThan(0);
  });

  // ─── TC_164 ─────────────────────────────────────────────────────────────────
  test('[TC_164] newly added mapping is visible in table list', async () => {
    if (!createdSubIndustry) { test.skip(true, 'TC_163 did not set createdSubIndustry'); return; }
    await mwiPage.table.openColumnFilter('Sub Industry');
    await mwiPage.table.applyColumnFilter(createdSubIndustry);
    const rows = mwiPage.tabPanel.locator('table tbody tr').filter({ hasText: createdSubIndustry });
    expect(
      await rows.count(),
      `Record "${createdSubIndustry}" should be visible in list`,
    ).toBeGreaterThan(0);
    await expect(
      rows.filter({ hasText: TEST_CORF_DESC }),
      `Row should show CORF Industry "${TEST_CORF_DESC}"`,
    ).toHaveCount(1);
    await mwiPage.table.clearColumnFilter('Sub Industry');
  });

  // ─── TC_165 ─────────────────────────────────────────────────────────────────
  test('[TC_165] Edit mapping — updated CORF Industry reflected in table list', async () => {
    if (!createdSubIndustry) { test.skip(true, 'TC_163 did not set createdSubIndustry'); return; }
    await mwiPage.clickEditBySubIndustry(createdSubIndustry);

    const corfDropdown = mwiPage.getCorfIndustryDropdown();
    await corfDropdown.click();
    const listbox = page.locator('[role="listbox"], .p-select-overlay, .p-dropdown-panel').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const options = listbox.locator('[role="option"], .p-select-option, .p-dropdown-item');
    await options.first().waitFor({ state: 'visible', timeout: 5000 });
    const firstText = (await options.first().innerText()).trim();
    // Pick option different from TEST_CORF_DESC to ensure actual change
    let updatedCorf: string;
    if (firstText.toLowerCase() === TEST_CORF_DESC.toLowerCase()) {
      const second = options.nth(1);
      await second.waitFor({ state: 'visible', timeout: 3000 });
      updatedCorf = (await second.innerText()).trim();
      await second.click();
    } else {
      updatedCorf = firstText;
      await options.first().click();
    }
    await listbox.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    await mwiPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    await mwiPage.table.openColumnFilter('Sub Industry');
    await mwiPage.table.applyColumnFilter(createdSubIndustry);
    const updatedRow = mwiPage.tabPanel.locator('table tbody tr').filter({ hasText: createdSubIndustry });
    await expect(
      updatedRow.filter({ hasText: updatedCorf }),
      `Row "${createdSubIndustry}" should show updated CORF "${updatedCorf}"`,
    ).toBeVisible();
    await mwiPage.table.clearColumnFilter('Sub Industry');
  });

  // ─── TC_166 ─────────────────────────────────────────────────────────────────
  test('[TC_166] Delete mapping — row removed from table list', async () => {
    if (!createdSubIndustry) { test.skip(true, 'TC_163 did not set createdSubIndustry'); return; }
    const subToDelete = createdSubIndustry;
    await mwiPage.deleteRecordBySubIndustry(subToDelete);
    createdSubIndustry = ''; // mark deleted so afterAll skips double-delete

    await mwiPage.table.openColumnFilter('Sub Industry');
    await mwiPage.table.applyColumnFilter(subToDelete);
    await expect(
      mwiPage.tabPanel.locator('table tbody tr').filter({ hasText: subToDelete }),
      `Record "${subToDelete}" should be removed from table after delete`,
    ).toHaveCount(0);
    await mwiPage.table.clearColumnFilter('Sub Industry');
  });

  // ─── TC_167 ─────────────────────────────────────────────────────────────────
  // Self-contained duplicate test — creates own record, verifies duplicate blocked, cleans up.
  // Runs after TC_166 (delete) so createdSubIndustry is already freed — first Sub Industry re-available.
  test('[TC_167] Duplicate Sub Industry mapping not allowed', async () => {
    // Step 1: create a fresh record to test duplicate against
    await mwiPage.clickAddButton();
    const dupSubIndustry = await mwiPage.selectFirstDropdownOption(mwiPage.getSubIndustryDropdown());
    await mwiPage.selectDropdownOption(mwiPage.getCorfIndustryDropdown(), TEST_CORF_DESC);
    await mwiPage.clickSave();
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Initial record save should succeed',
    ).toBeHidden({ timeout: 15000 });

    // Step 2: try to add same Sub Industry again — must be blocked
    await mwiPage.clickAddButton();
    const availableOptions = await mwiPage.getDropdownOptions(mwiPage.getSubIndustryDropdown());
    const appearsInDropdown = availableOptions.some(
      o => o.toLowerCase() === dupSubIndustry.toLowerCase(),
    );

    if (!appearsInDropdown) {
      // UI-level prevention — already-mapped sub-industry removed from dropdown
      expect(
        appearsInDropdown,
        `"${dupSubIndustry}" should not appear in dropdown after being mapped`,
      ).toBe(false);
      await page.keyboard.press('Escape');
      await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    } else {
      // Backend-level prevention — save must be rejected
      await mwiPage.selectDropdownOption(mwiPage.getSubIndustryDropdown(), dupSubIndustry);
      await mwiPage.selectDropdownOption(mwiPage.getCorfIndustryDropdown(), TEST_CORF_DESC);
      await mwiPage.clickSave();
      await expect(
        page.locator('[role="dialog"], .p-dialog'),
        'Duplicate entry: dialog must stay open (save rejected)',
      ).toBeVisible({ timeout: 5000 });
      await mwiPage.clickCancel();
      await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    // Step 3: cleanup — delete the record created in step 1
    await mwiPage.deleteRecordBySubIndustry(dupSubIndustry);
    await mwiPage.table.clearColumnFilter('Sub Industry').catch(() => {});
  });
});

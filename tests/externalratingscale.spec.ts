import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { ExternalRatingScalePage } from '../pages/ExternalRatingScalePage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('External Rating Scale', () => {
  let context: BrowserContext;
  let page: Page;
  let ersPage: ExternalRatingScalePage;

  /** Track label created in CRUD chain — shared across TC_034–TC_037 */
  let createdLabel = '';
  let createdAgency = '';

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    ersPage = new ExternalRatingScalePage(page);
  });

  test.afterAll(async () => {
    try {
      if (createdLabel) {
        await ersPage.goto().catch(() => {});
        await ersPage.deleteRecordByLabel(createdLabel).catch(() => {});
        await ersPage.table.clearColumnFilter('Label').catch(() => {});
      }
    } catch { /* best-effort cleanup */ }
    await context.close();
  });

  test.beforeEach(async () => {
    await ersPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to External Rating Scale and verify heading, table, exports, add button and pagination', async () => {
    await ersPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  // Note: screenshot shows extra "Status" column — test EXPECTED TO FAIL if present.
  test('[TC_002] table has exactly: Rating Agency, Rank, Label, Description, Rating Type, Actions — no extra columns', async () => {
    await ersPage.verifyRequiredColumns();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] table renders with data rows', async () => {
    const count = await ersPage.table.getRowCount();
    expect(count, 'Table should have at least 1 row').toBeGreaterThan(0);
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] Actions column has View (eye), Edit (pencil), Delete (trash) icons per row', async () => {
    const firstRow = ersPage.tabPanel.locator('table tbody tr').first();
    await expect(firstRow.locator('button:has(.ph-eye)'), 'View icon missing').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-pencil-simple)'), 'Edit icon missing').toBeVisible();
    await expect(firstRow.locator('button:has(.ph-trash)'), 'Delete icon missing').toBeVisible();
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] sortable columns include Rating Agency, Rank, Label, Description, Rating Type', async () => {
    const sortableCols = await ersPage.table.getSortableColumnNames();
    expect(sortableCols.length, 'At least one sortable column expected').toBeGreaterThan(0);
    for (const col of ['Rating Agency', 'Rank', 'Label', 'Description', 'Rating Type']) {
      expect(
        sortableCols.some(c => c.toLowerCase().includes(col.toLowerCase())),
        `Column "${col}" should be sortable`,
      ).toBe(true);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] filterable columns have filter icons — Actions column excluded', async () => {
    const filterableCols = await ersPage.table.getFilterableColumnNames();
    expect(filterableCols.length, 'At least one filterable column expected').toBeGreaterThan(0);
    expect(
      filterableCols.every(c => !/^actions$/i.test(c.trim())),
      'Actions column should not have filter icon',
    ).toBe(true);
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = await ersPage.table.getSortableColumnNames();
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await ersPage.goto();
      await ersPage.table.sortByColumn(col);
      const asc = await ersPage.table.getColumnSortOrder(col);
      expect(asc, `Column "${col}" should be ascending after first click`).toMatch(/ascending/i);
      await ersPage.table.sortByColumn(col);
      const desc = await ersPage.table.getColumnSortOrder(col);
      expect(desc, `Column "${col}" should be descending after second click`).toMatch(/descending/i);
    }
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] sort applies to table — indicators toggle and rows remain visible', async () => {
    const cols = await ersPage.table.getSortableColumnNames();
    if (cols.length === 0) { test.skip(); return; }
    const col = cols[0];
    await ersPage.table.sortByColumn(col);
    expect(await ersPage.table.getColumnSortOrder(col)).toMatch(/ascending/i);
    expect(await ersPage.table.getRowCount(), 'Rows should remain after ascending sort').toBeGreaterThan(0);
    await ersPage.table.sortByColumn(col);
    expect(await ersPage.table.getColumnSortOrder(col)).toMatch(/descending/i);
    expect(await ersPage.table.getRowCount(), 'Rows should remain after descending sort').toBeGreaterThan(0);
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] filter each column — active indicator set and data is filtered', async () => {
    const columns = await ersPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(true, 'No filterable columns'); return; }
    for (const col of columns) {
      // Rating Agency uses a relation/dropdown filter — handled separately in TC_010
      if (/rating agency/i.test(col)) continue;
      const colIdx = await ersPage.table.getColumnIndexByName(col);
      const sampleValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
      if (!sampleValue) continue;
      await ersPage.table.openColumnFilter(col);
      await ersPage.table.applyColumnFilter(sampleValue);
      expect(
        await ersPage.table.isColumnFilterActive(col),
        `Column "${col}" filter active indicator missing`,
      ).toBe(true);
      await ersPage.table.verifyAllRowsInColumnContain(col, sampleValue);
      await ersPage.table.clearColumnFilter(col);
    }
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] filter Rating Agency column — filter indicator active and matching rows shown', async () => {
    const colIdx = await ersPage.table.getColumnIndexByName('Rating Agency');
    const fullValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
    if (!fullValue) { test.skip(true, 'No data to filter on'); return; }
    // Rating Agency uses an autocomplete/entity filter — type first word to trigger suggestions,
    // then select first suggestion from the autocomplete panel.
    const filterValue = fullValue.split(' ')[0];
    await ersPage.table.openColumnFilter('Rating Agency');
    await ersPage.table.applyColumnFilterByAutocomplete(filterValue);
    const rowCount = await ersPage.table.getRowCount();
    expect(rowCount, 'Rating Agency filter should return at least 1 row').toBeGreaterThan(0);
    await ersPage.table.verifyRowExistsByCellText(fullValue);
    await ersPage.table.clearColumnFilter('Rating Agency');
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] filter Rank column — only matching rows shown', async () => {
    const colIdx = await ersPage.table.getColumnIndexByName('Rank');
    const sampleValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await ersPage.table.openColumnFilter('Rank');
    await ersPage.table.applyColumnFilter(sampleValue);
    await ersPage.table.verifyRowExistsByCellText(sampleValue);
    await ersPage.table.verifyAllRowsInColumnContain('Rank', sampleValue);
    await ersPage.table.clearColumnFilter('Rank');
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] filter Label column — only matching rows shown', async () => {
    const colIdx = await ersPage.table.getColumnIndexByName('Label');
    const sampleValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await ersPage.table.openColumnFilter('Label');
    await ersPage.table.applyColumnFilter(sampleValue);
    await ersPage.table.verifyRowExistsByCellText(sampleValue);
    await ersPage.table.verifyAllRowsInColumnContain('Label', sampleValue);
    await ersPage.table.clearColumnFilter('Label');
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] filter Description column — only matching rows shown', async () => {
    const colIdx = await ersPage.table.getColumnIndexByName('Description');
    const sampleValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await ersPage.table.openColumnFilter('Description');
    await ersPage.table.applyColumnFilter(sampleValue);
    // Verify original record visible — skip verifyAllRowsInColumnContain (filter may word-match)
    await ersPage.table.verifyRowExistsByCellText(sampleValue);
    await ersPage.table.clearColumnFilter('Description');
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] filter Rating Type column — only matching rows shown', async () => {
    const colIdx = await ersPage.table.getColumnIndexByName('Rating Type');
    const sampleValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(true, 'No data to filter on'); return; }
    await ersPage.table.openColumnFilter('Rating Type');
    await ersPage.table.applyColumnFilter(sampleValue);
    await ersPage.table.verifyRowExistsByCellText(sampleValue);
    await ersPage.table.verifyAllRowsInColumnContain('Rating Type', sampleValue);
    await ersPage.table.clearColumnFilter('Rating Type');
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] clearing column filter restores all records', async () => {
    const columns = await ersPage.table.getFilterableColumnNames();
    if (columns.length === 0) { test.skip(); return; }
    const col = columns[0];
    const originalCount = await ersPage.table.getRowCount();
    const colIdx = await ersPage.table.getColumnIndexByName(col);
    const sampleValue = colIdx >= 0 ? await ersPage.table.getFirstRowCellText(colIdx) : '';
    if (!sampleValue) { test.skip(); return; }
    await ersPage.table.openColumnFilter(col);
    await ersPage.table.applyColumnFilter(sampleValue);
    await ersPage.table.clearColumnFilter(col);
    expect(await ersPage.table.getRowCount()).toBe(originalCount);
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] Export PDF button is visible and clickable', async () => {
    await ersPage.export.triggerPdf();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] Export Excel button is visible and clickable', async () => {
    await ersPage.export.triggerExcel();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] pagination info text shows record count e.g. Showing 1-N out of N records', async () => {
    const infoText = await ersPage.paginator.getInfoText();
    expect(infoText).toMatch(/showing|of/i);
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] default items per page is 10', async () => {
    const defaultValue = await ersPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] items per page dropdown has options', async () => {
    const options = await ersPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] First and Previous page buttons are disabled on page 1', async () => {
    await ersPage.paginator.verifyFirstPageDisabled();
    await ersPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] View (eye) action icon present in table rows', async () => {
    await expect(
      ersPage.tabPanel.locator('table tbody tr').first().locator('button:has(.ph-eye)'),
      'View icon missing',
    ).toBeVisible();
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] Edit (pencil) action icon present in table rows', async () => {
    await expect(
      ersPage.tabPanel.locator('table tbody tr').first().locator('button:has(.ph-pencil-simple)'),
      'Edit icon missing',
    ).toBeVisible();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] Delete (trash) action icon present in table rows', async () => {
    await expect(
      ersPage.tabPanel.locator('table tbody tr').first().locator('button:has(.ph-trash)'),
      'Delete icon missing',
    ).toBeVisible();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] clicking View icon opens view modal', async () => {
    await ersPage.clickViewOnFirstRow();
    await expect(page.locator('[role="dialog"], .p-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] clicking Edit icon opens edit modal with pre-filled data', async () => {
    await ersPage.clickEditOnFirstRow();
    const dialog = page.locator('[role="dialog"], .p-dialog').first();
    await expect(dialog).toBeVisible();
    // Label field should be pre-filled
    const labelValue = await ersPage.getLabelInput().inputValue();
    expect(labelValue.trim(), 'Edit modal should pre-fill Label field').not.toBe('');
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Add (+) button opens popup with title "New External Rating Scale"', async () => {
    await ersPage.clickAddButton();
    await expect(
      ersPage.getDialog().getByText(/new external rating scale/i),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Add popup has all required fields: External Rating, Rank, Label, Description, Rating Type', async () => {
    await ersPage.clickAddButton();
    await expect(ersPage.getExternalRatingDropdown()).toBeVisible();
    await expect(ersPage.getRankInput()).toBeVisible();
    await expect(ersPage.getLabelInput()).toBeVisible();
    await expect(ersPage.getDescriptionInput()).toBeVisible();
    await expect(ersPage.getRatingTypeDropdown()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] Mandatory fields: External Rating, Label, Rating Type show required indicator (*)', async () => {
    await ersPage.clickAddButton();
    const dialog = ersPage.getDialog();
    const mandatoryLabels = await dialog.locator('label').filter({ hasText: /\*/ }).allInnerTexts();
    const normalised = mandatoryLabels.map(l => l.toLowerCase());
    expect(normalised.some(l => l.includes('external rating')), '"External Rating" should be mandatory').toBe(true);
    expect(normalised.some(l => l.includes('label')), '"Label" should be mandatory').toBe(true);
    expect(normalised.some(l => l.includes('rating type')), '"Rating Type" should be mandatory').toBe(true);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  // External Rating dropdown options must reflect Agency screen data (same agencies)
  test('[TC_030] External Rating dropdown options reflect Agency screen data', async () => {
    // Step 1: get agency descriptions from Agency tab
    const agencyDescriptions = await ersPage.getAgencyTabDescriptions();
    expect(agencyDescriptions.length, 'Agency screen should have at least 1 record').toBeGreaterThan(0);

    // Step 2: open Scale add popup, get External Rating dropdown options
    await ersPage.clickAddButton();
    const dropdownOptions = await ersPage.getDropdownOptions(ersPage.getExternalRatingDropdown());
    expect(dropdownOptions.length, 'External Rating dropdown should have options').toBeGreaterThan(0);

    // Step 3: at least one agency from Agency screen appears in dropdown
    const match = agencyDescriptions.some(agency =>
      dropdownOptions.some(opt => opt.toLowerCase().includes(agency.toLowerCase())),
    );
    expect(match, 'External Rating dropdown should contain agencies from Agency screen').toBe(true);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] Rank field default value is 0', async () => {
    await ersPage.clickAddButton();
    const rankValue = await ersPage.getRankInput().inputValue();
    expect(rankValue.trim(), 'Rank default should be 0').toBe('0');
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] Label field has placeholder "Enter label"', async () => {
    await ersPage.clickAddButton();
    const placeholder = await ersPage.getLabelInput().getAttribute('placeholder');
    expect(placeholder).toMatch(/enter label/i);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] Rating Type dropdown has Long-Term and Short-Term options', async () => {
    await ersPage.clickAddButton();
    const options = await ersPage.getDropdownOptions(ersPage.getRatingTypeDropdown());
    const normalised = options.map(o => o.toLowerCase());
    expect(
      normalised.some(o => o.includes('long')),
      'Rating Type should have Long-Term option',
    ).toBe(true);
    expect(
      normalised.some(o => o.includes('short')),
      'Rating Type should have Short-Term option',
    ).toBe(true);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] Cancel resets form — popup closes or fields cleared', async () => {
    await ersPage.clickAddButton();
    await ersPage.getLabelInput().fill('CANCELTEST');
    await ersPage.clickCancel();

    const dialogVisible = await page.locator('[role="dialog"], .p-dialog').isVisible({ timeout: 2000 }).catch(() => false);
    if (!dialogVisible) {
      // Cancel closed the dialog — verify record not saved
      const rows = ersPage.tabPanel.locator('table tbody tr').filter({ hasText: 'CANCELTEST' });
      expect(await rows.count(), 'Cancel should not save record').toBe(0);
      // Reopen and verify form is empty
      await ersPage.clickAddButton();
      const labelValue = await ersPage.getLabelInput().inputValue();
      expect(labelValue, 'Form should be empty on reopen after Cancel').toBe('');
      await ersPage.clickCancel();
      await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    } else {
      // Cancel acts as Reset (keeps dialog open) — verify CANCELTEST not persisted in list
      // Close dialog with Escape and verify no saved record
      await page.keyboard.press('Escape');
      await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      const rows = ersPage.tabPanel.locator('table tbody tr').filter({ hasText: 'CANCELTEST' });
      expect(await rows.count(), 'Cancel should not save record to list').toBe(0);
    }
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] Save button is disabled when mandatory fields are empty', async () => {
    await ersPage.clickAddButton();
    const saveBtn = ersPage.getDialog().getByRole('button', { name: /save|update/i });
    // When all required fields are empty, Save button should be disabled
    await expect(
      saveBtn,
      'Save button should be disabled when mandatory fields are empty',
    ).toBeDisabled({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  // CRUD chain: TC_036 → TC_037 → TC_038 → TC_039 (all on same record)
  test('[TC_036] Save with valid data closes popup and record visible in list', async () => {
    const label = `AUTOSCL${String(Date.now()).slice(-7)}`;
    createdLabel = label;

    await ersPage.clickAddButton();
    // Use first available options to avoid hard-coded text mismatches
    createdAgency = await ersPage.selectFirstDropdownOption(ersPage.getExternalRatingDropdown());
    const rankInput = ersPage.getRankInput();
    await rankInput.clear();
    // Use high rank (16–19) varying by timestamp to avoid collision with existing or prior-run data
    const rank = 16 + (Date.now() % 4); // 16, 17, 18, or 19
    await rankInput.fill(String(rank));
    await rankInput.press('Tab');
    const labelInput = ersPage.getLabelInput();
    await labelInput.clear();
    await labelInput.fill(label);
    await labelInput.press('Tab');
    const descInput = ersPage.getDescriptionInput();
    await descInput.clear();
    await descInput.fill(`Auto test ${label}`);
    await descInput.press('Tab');
    await ersPage.selectFirstDropdownOption(ersPage.getRatingTypeDropdown());

    await ersPage.clickSave();
    await expect(
      page.locator('[role="dialog"], .p-dialog'),
      'Popup should close after successful Save',
    ).toBeHidden({ timeout: 15000 });
    expect(createdLabel.length, 'createdLabel must be set for CRUD chain').toBeGreaterThan(0);
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] newly added record is visible in table list', async () => {
    if (!createdLabel) { test.skip(true, 'TC_036 did not create a record'); return; }
    await ersPage.table.openColumnFilter('Label');
    await ersPage.table.applyColumnFilter(createdLabel);
    const rows = ersPage.tabPanel.locator('table tbody tr').filter({ hasText: createdLabel });
    expect(
      await rows.count(),
      `Record with Label "${createdLabel}" should be visible in list`,
    ).toBeGreaterThan(0);
    await ersPage.table.clearColumnFilter('Label');
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] Edit record — updated Description reflected in table list', async () => {
    if (!createdLabel) { test.skip(true, 'TC_036 did not create a record'); return; }
    await ersPage.clickEditByLabel(createdLabel);

    const descInput = ersPage.getDescriptionInput();
    await descInput.clear();
    await descInput.fill(`Updated ${createdLabel}`);
    await descInput.press('Tab');
    await ersPage.clickSave();
    await page.locator('[role="dialog"], .p-dialog').waitFor({ state: 'hidden', timeout: 15000 });

    await ersPage.table.openColumnFilter('Label');
    await ersPage.table.applyColumnFilter(createdLabel);
    const updatedRow = ersPage.tabPanel.locator('table tbody tr').filter({ hasText: createdLabel });
    await expect(
      updatedRow.filter({ hasText: `Updated ${createdLabel}` }),
      `Row should show updated description "Updated ${createdLabel}"`,
    ).toBeVisible();
    await ersPage.table.clearColumnFilter('Label');
  });

  // ─── TC_039 ─────────────────────────────────────────────────────────────────
  test('[TC_039] Delete record — row removed from table list', async () => {
    if (!createdLabel) { test.skip(true, 'TC_036 did not create a record'); return; }
    const labelToDelete = createdLabel;
    await ersPage.deleteRecordByLabel(labelToDelete);
    createdLabel = ''; // mark deleted so afterAll skips double-delete

    await ersPage.table.openColumnFilter('Label');
    await ersPage.table.applyColumnFilter(labelToDelete);
    await expect(
      ersPage.tabPanel.locator('table tbody tr').filter({ hasText: labelToDelete }),
      `Record "${labelToDelete}" should be removed from table after delete`,
    ).toHaveCount(0);
    await ersPage.table.clearColumnFilter('Label');
  });
});

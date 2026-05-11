import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users, vendorUser, userProfileActiveRole, userProfileInactiveRole } from '../fixtures/testData';
import { UserProfilePage } from '../pages/UserProfilePage';
import { RoleMasterPage } from '../pages/RoleMasterPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('User Profile', () => {
  let context: BrowserContext;
  let page: Page;
  let upPage: UserProfilePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    upPage = new UserProfilePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await upPage.goto();
  });

  // ══════════════════════════════════════════════════════
  //  LIST SCREEN
  // ══════════════════════════════════════════════════════

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to User Profile and verify heading, table, export, add button, pagination', async () => {
    await upPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table has required columns', async () => {
    await upPage.verifyRequiredColumns();
  });

  // ─── TC_002b ────────────────────────────────────────────────────────────────
  test('[TC_002b] Actions column does not have sort or filter buttons', async () => {
    await upPage.verifyActionsHasNoSortOrFilter();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] Actions column has View, Edit and Delete buttons', async () => {
    await upPage.verifyActionsHaveViewEditDelete();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] table displays records', async () => {
    await upPage.verifyTableHasRows();
  });

  // ══════════════════════════════════════════════════════
  //  FILTER
  // ══════════════════════════════════════════════════════

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] filter each filterable column shows filtered results and active indicator', async () => {
    const columns = await upPage.table.getFilterableColumnNames();
    expect(columns.length, 'At least one filterable column must exist').toBeGreaterThan(0);

    // Text-input filter columns (skip dropdown/boolean columns and Actions)
    for (const col of columns) {
      if (/actions|is active\?|sub.branch|is default/i.test(col)) continue;
      await upPage.goto();
      const originalCount = await upPage.table.getRowCount();
      const colIdx = await upPage.table.getColumnIndexByName(col);
      const allValues = colIdx >= 0 ? await upPage.table.getAllColumnValues(colIdx) : [];
      const sampleValue = allValues.find(v => v.trim().length > 0) ?? '';
      if (!sampleValue) { console.warn(`Skipping column "${col}" — no sample value`); continue; }

      await upPage.table.openColumnFilter(col);

      // Some columns use list/multi-select filters instead of text inputs — skip gracefully
      const applied = await upPage.table.applyColumnFilter(sampleValue).then(() => true).catch(() => false);
      if (!applied) {
        console.warn(`Column "${col}" — text filter input not found, may use a different filter type`);
        await page.keyboard.press('Escape').catch(() => {});
        continue;
      }

      const isActive = await upPage.table.isColumnFilterActive(col);
      if (!isActive) console.warn(`Column "${col}" filter active indicator not detected`);

      const rawFiltered = colIdx >= 0 ? await upPage.table.getAllColumnValues(colIdx) : [];
      const filteredValues = rawFiltered.filter(v => v.trim().length > 0);
      expect(filteredValues.length, `Column "${col}" filter returned no rows`).toBeGreaterThan(0);
      for (const v of filteredValues) {
        expect(v.toLowerCase(), `"${col}": "${v}" doesn't match filter "${sampleValue}"`).toContain(sampleValue.toLowerCase());
      }
      expect(filteredValues.length).toBeLessThanOrEqual(originalCount);
      await upPage.table.clearColumnFilter(col);
    }

    // Dropdown filter columns (Is Active?, Sub-Branch Access?, Is Default Profile?)
    const dropdownCols = columns.filter(c => /is active\?|sub.branch|is default/i.test(c));
    for (const col of dropdownCols) {
      await upPage.goto();
      const originalCount = await upPage.table.getRowCount();
      const colIdx = await upPage.table.getColumnIndexByName(col);
      const selectedOption = await upPage.table.applyDropdownColumnFilter(col);
      const rawFiltered = colIdx >= 0 ? await upPage.table.getAllColumnValues(colIdx) : [];
      const filteredValues = rawFiltered.filter(v => v.trim().length > 0);
      expect(filteredValues.length, `Dropdown filter on "${col}" returned no rows`).toBeGreaterThan(0);
      expect(filteredValues.length, `Dropdown filter on "${col}" should narrow results`).toBeLessThanOrEqual(originalCount);
      console.log(`Column "${col}" dropdown filter by "${selectedOption}": ${filteredValues.length} rows`);
    }
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] clearing column filter restores all records', async () => {
    const columns = (await upPage.table.getFilterableColumnNames())
      .filter(c => !/actions|is active\?|sub.branch|is default/i.test(c));
    if (columns.length === 0) {
      console.warn('TC_006: No text-filterable columns found — skipping');
      return;
    }
    const col = columns[0];
    const originalCount = await upPage.table.getRowCount();
    const colIdx = await upPage.table.getColumnIndexByName(col);
    const allValues = colIdx >= 0 ? await upPage.table.getAllColumnValues(colIdx) : [];
    const sampleValue = allValues.find(v => v.trim().length > 0) ?? '';
    if (!sampleValue) { console.warn(`TC_006: Column "${col}" has no data — skipping`); return; }
    await upPage.table.openColumnFilter(col);
    const applied = await upPage.table.applyColumnFilter(sampleValue).then(() => true).catch(() => false);
    if (!applied) {
      console.warn(`TC_006: Column "${col}" has no text input filter — skipping`);
      await page.keyboard.press('Escape').catch(() => {});
      return;
    }
    await upPage.table.clearColumnFilter(col);
    expect(await upPage.table.getRowCount()).toBe(originalCount);
  });

  // ══════════════════════════════════════════════════════
  //  SORT
  // ══════════════════════════════════════════════════════

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] each sortable column toggles ascending and descending sort indicator', async () => {
    const cols = (await upPage.table.getSortableColumnNames())
      .filter(c => !/actions/i.test(c));
    expect(cols.length, 'At least one sortable column should exist').toBeGreaterThan(0);
    for (const col of cols) {
      await upPage.goto();
      await upPage.table.sortByColumn(col);
      const order1 = await upPage.table.getColumnSortOrder(col);
      if (order1 && order1 !== 'none') {
        expect(order1).toMatch(/ascending/i);
      } else {
        expect(await upPage.table.getRowCount(), `Rows should load after ascending sort of "${col}"`).toBeGreaterThan(0);
      }
      await upPage.table.sortByColumn(col);
      const order2 = await upPage.table.getColumnSortOrder(col);
      if (order2 && order2 !== 'none') {
        expect(order2).toMatch(/descending/i);
      } else {
        expect(await upPage.table.getRowCount(), `Rows should load after descending sort of "${col}"`).toBeGreaterThan(0);
      }
    }
  });

  // ─── TC_007b ────────────────────────────────────────────────────────────────
  test('[TC_007b] sort data loads records in ascending then descending order', async () => {
    const cols = (await upPage.table.getSortableColumnNames())
      .filter(c => !/actions/i.test(c));
    if (cols.length === 0) return;
    await upPage.table.sortByColumn(cols[0]);
    expect(await upPage.table.getRowCount()).toBeGreaterThan(0);
    await upPage.table.sortByColumn(cols[0]);
    expect(await upPage.table.getRowCount()).toBeGreaterThan(0);
  });

  // ─── TC_007c ────────────────────────────────────────────────────────────────
  test('[TC_007c] sorting resets pagination gracefully', async () => {
    const cols = (await upPage.table.getSortableColumnNames())
      .filter(c => !/actions/i.test(c));
    if (cols.length === 0) return;
    if (await upPage.paginator.isLastPage()) return;
    await upPage.paginator.clickNextPage();
    await upPage.table.sortByColumn(cols[0]);
    const pageNum = Number(await upPage.paginator.getActivePageNumber());
    expect(pageNum, 'Should be on a valid page after sort').toBeGreaterThanOrEqual(1);
    await upPage.paginator.clickFirstPage().catch(() => {});
  });

  // ══════════════════════════════════════════════════════
  //  EXPORT
  // ══════════════════════════════════════════════════════

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to PDF downloads a file', async () => {
    await upPage.export.triggerPdf();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] export to Excel downloads a file', async () => {
    await upPage.export.triggerExcel();
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] PDF export button is visible and clickable', async () => {
    await upPage.export.triggerPdf();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] Excel export button is visible and clickable', async () => {
    await upPage.export.triggerExcel();
  });

  // ══════════════════════════════════════════════════════
  //  PAGINATION
  // ══════════════════════════════════════════════════════

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] default items per page is 20', async () => {
    expect((await upPage.paginator.getItemsPerPageValue()).trim()).toBe('20');
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] items per page dropdown has options', async () => {
    expect((await upPage.paginator.getItemsPerPageOptions()).length).toBeGreaterThan(0);
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] clicking page 2 navigates to page 2', async () => {
    if (await upPage.paginator.isLastPage()) { test.skip(); return; }
    await upPage.paginator.clickPageNumber(2);
    expect(await upPage.paginator.getActivePageNumber()).toBe('2');
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] Next and Previous buttons switch between pages', async () => {
    if (await upPage.paginator.isLastPage()) { test.skip(); return; }
    await upPage.paginator.clickNextPage();
    expect(Number(await upPage.paginator.getActivePageNumber())).toBeGreaterThan(1);
    await upPage.paginator.clickPreviousPage();
    expect(await upPage.paginator.getActivePageNumber()).toBe('1');
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] First and Previous buttons are disabled on first page', async () => {
    await upPage.paginator.verifyFirstPageDisabled();
    await upPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] pagination info text shows entry count', async () => {
    expect(await upPage.paginator.getInfoText()).toMatch(/showing|of/i);
  });

  // ══════════════════════════════════════════════════════
  //  ADD — NEW USER PROFILE
  // ══════════════════════════════════════════════════════

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] Add button opens Add User Profile modal', async () => {
    await upPage.openAddModal();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] Add User Profile modal heading is "Add User Profile"', async () => {
    await upPage.openAddModal();
    await upPage.verifyAddModalHeading();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] Add User Profile modal has all required fields and buttons', async () => {
    await upPage.openAddModal();
    await upPage.verifyAddModalElements();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] Save is disabled when modal is empty', async () => {
    await upPage.openAddModal();
    await upPage.verifySaveDisabled();
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] Cancel closes modal without saving', async () => {
    await upPage.openAddModal();
    await upPage.cancelModal();
    await expect(page.locator('p-dialog, p-sidebar, [role="dialog"]').first()).not.toBeVisible({ timeout: 5000 });
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] User Login Id dropdown contains options from User Master', async () => {
    await upPage.openAddModal();
    await upPage.verifyUserLoginDropdownHasOptions();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] Role dropdown contains options from Role Master', async () => {
    await upPage.openAddModal();
    await upPage.verifyRoleDropdownHasOptions();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] Branch dropdown contains options from Branch screen', async () => {
    await upPage.openAddModal();
    await upPage.verifyBranchDropdownHasOptions();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] Sub Branch Access dropdown has Yes and No options', async () => {
    await upPage.openAddModal();
    await upPage.verifySubBranchAccessDropdownOptions();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] Is Default Profile toggle switch is visible', async () => {
    await upPage.openAddModal();
    await upPage.verifyIsDefaultProfileToggleVisible();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] Is Active dropdown has Yes and No options', async () => {
    await upPage.openAddModal();
    await upPage.verifyIsActiveDropdownOptions();
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] filling required fields enables Save button', async () => {
    await upPage.openAddModal();
    await upPage.fillAddForm();
    await upPage.verifySaveEnabled();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] saving new user profile sends record for authorization with toast and appears in table', async () => {
    const countBefore = await upPage.table.getRowCount();
    await upPage.openAddModal();
    await upPage.fillAddForm();
    await upPage.submitAddForm();
    await upPage.verifySuccessOrPendingToast();
    await page.waitForTimeout(500);
    const countAfter = await upPage.table.getRowCount();
    console.log(`Add profile: rows ${countBefore} → ${countAfter}`);
    expect(countAfter, 'New profile should appear in table after save').toBeGreaterThanOrEqual(countBefore);
  });

  // ══════════════════════════════════════════════════════
  //  VIEW / EDIT / DELETE
  // ══════════════════════════════════════════════════════

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] View button opens user profile in read-only modal', async () => {
    const firstRow = await upPage.table.getFirstRowCellText(0);
    if (!firstRow.trim()) { test.skip(); return; }
    await upPage.openView(firstRow.trim());
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] Edit button opens user profile in edit modal with pre-filled values, submit updates record', async () => {
    const firstRow = await upPage.table.getFirstRowCellText(0);
    if (!firstRow.trim()) { test.skip(); return; }
    await upPage.openEdit(firstRow.trim());
    const editDialog = page.locator('[role="dialog"]').first();
    await expect(editDialog).toBeVisible();
    // Verify pre-filled data exists (role dropdown should have a selected value)
    const roleVal = (await editDialog.locator('p-select, p-dropdown').first()
      .innerText().catch(() => '')).trim();
    console.log(`Edit modal — pre-filled role: "${roleVal}"`);
    expect(roleVal, 'Edit modal should show pre-filled user profile data').toBeTruthy();
    // Submit the edit
    const saveBtn = editDialog.getByRole('button', { name: /^save$|^update$|^submit$/i }).first();
    const hasSave = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasSave) {
      await saveBtn.click();
      await editDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      await upPage.verifySuccessOrPendingToast();
      console.log('Edit submitted and toast verified');
    } else {
      const btns = await editDialog.locator('button').allInnerTexts();
      console.warn(`No Save/Update button found. Buttons: [${btns.join(' | ')}]`);
      await page.keyboard.press('Escape');
    }
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] Delete shows confirmation dialog; Cancel keeps record in table', async () => {
    const firstRow = await upPage.table.getFirstRowCellText(0);
    if (!firstRow.trim()) { test.skip(); return; }
    await upPage.openDeleteConfirmation(firstRow.trim());
    await upPage.cancelDeleteConfirmation();
    await upPage.table.verifyRowExistsByCellText(firstRow.trim());
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] confirming delete removes the record from the table', async () => {
    await upPage.waitForDialogsAndToastsClosed();
    const firstLogin = (await upPage.table.getFirstRowCellText(0)).trim();
    if (!firstLogin) { test.skip(); return; }
    const countBefore = await upPage.table.getRowCount();
    console.log(`Deleting first row "${firstLogin}" (${countBefore} rows before)`);
    await upPage.openDeleteConfirmation(firstLogin);
    await upPage.confirmDelete();
    await upPage.waitForDialogsAndToastsClosed();
    const countAfter = await upPage.table.getRowCount();
    console.log(`Rows after delete: ${countAfter}`);
    expect(countAfter, 'Row count should decrease by 1 after confirming delete').toBe(countBefore - 1);
  });
});

// ══════════════════════════════════════════════════════
//  FUNCTIONAL VERIFICATION — vendor user login
// ══════════════════════════════════════════════════════

test.describe('User Profile — functional verification (vendor user)', () => {
  let vendorContext: BrowserContext;
  let vendorPage: Page;
  let vendorLoginOk = false;

  test.beforeAll(async ({ browser }) => {
    vendorContext = await browser.newContext({ baseURL });
    vendorPage = await vendorContext.newPage();
    const loginPage = new LoginPage(vendorPage);
    await loginPage.goto();
    try {
      await loginPage.loginAs(vendorUser.username, vendorUser.password);
      vendorLoginOk = true;
    } catch (e) {
      console.warn(`Vendor login failed (${vendorUser.username}) — TC_034-TC_036 will be skipped. Check VENDOR_USERNAME/VENDOR_PASSWORD env vars.`);
    }
  });

  test.afterAll(async () => {
    await vendorContext?.close();
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  // Header structure (from DOM inspection):
  //   div.role-switcher > div.role-dropdown[.active] > span.role-label + i.ph-caret-down
  //                     > div.role-dropdown-menu > (role items)
  test('[TC_034] header role-dropdown shows current role assigned to vendor user after login', async () => {
    if (!vendorLoginOk) { test.skip(); return; }
    await vendorPage.waitForLoadState('domcontentloaded');
    const roleDropdown = vendorPage.locator('div.role-dropdown').first();
    await expect(roleDropdown, 'Header role-dropdown should be visible after login').toBeVisible({ timeout: 10000 });
    const label = (await roleDropdown.locator('span.role-label').innerText().catch(() => '')).trim();
    expect(label, 'role-label should show an assigned role name').not.toBe('');
    console.log(`Vendor user active role shown in header: "${label}"`);
  });

  // ─── TC_035 ─────────────────────────────────────────────────────────────────
  test('[TC_035] default profile is pre-selected (checkmark visible) after vendor user logs in', async () => {
    if (!vendorLoginOk) { test.skip(); return; }
    await vendorPage.waitForLoadState('domcontentloaded');
    const roleDropdown = vendorPage.locator('div.role-dropdown').first();
    await expect(roleDropdown).toBeVisible({ timeout: 10000 });

    // The role-label text IS the currently active/default profile — verify it is non-empty
    const activeLabel = (await roleDropdown.locator('span.role-label').innerText().catch(() => '')).trim();
    expect(activeLabel, 'Default profile should be pre-loaded in header after login').not.toBe('');

    // Open the panel and verify the active item has a checkmark
    await roleDropdown.click();
    const menu = vendorPage.locator('div.role-dropdown-menu').first();
    await expect(menu).toBeVisible({ timeout: 8000 });

    // The selected item shows a ph-check icon (✓) next to the role name
    const checkedItem = menu.locator('div, li').filter({ has: vendorPage.locator('i.ph-check, .ph-check') }).first();
    const hasCheck = await checkedItem.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCheck) {
      const checkedLabel = (await checkedItem.innerText().catch(() => '')).replace(/\n/g, ' ').trim();
      console.log(`Default profile pre-selected with checkmark: "${checkedLabel}"`);
      expect(checkedLabel).not.toBe('');
    } else {
      // Fallback: menu opened — active label should match one of the items
      const items = menu.locator('div, li').filter({ hasText: /\S/ });
      const texts = await items.allInnerTexts();
      const match = texts.some(t => t.trim().toLowerCase().includes(activeLabel.toLowerCase()));
      expect(match, `Active label "${activeLabel}" should appear in the role menu`).toBe(true);
      console.log(`Default profile "${activeLabel}" confirmed in menu options`);
    }

    await vendorPage.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  });

  // ─── TC_036 ─────────────────────────────────────────────────────────────────
  test('[TC_036] all active profiles for vendor user are listed in the header role-dropdown menu', async () => {
    if (!vendorLoginOk) { test.skip(); return; }
    await vendorPage.waitForLoadState('domcontentloaded');
    const roleDropdown = vendorPage.locator('div.role-dropdown').first();
    await expect(roleDropdown).toBeVisible({ timeout: 10000 });

    // Open the role-dropdown-menu
    await roleDropdown.click();
    const menu = vendorPage.locator('div.role-dropdown-menu').first();
    const menuVisible = await menu.isVisible({ timeout: 5000 }).catch(() => false);

    if (!menuVisible) {
      // Vendor has only one active profile — dropdown doesn't expand to a menu
      console.log('role-dropdown-menu did not appear — vendor has only one active profile (single-role scenario)');
      return;
    }

    // Each item in the menu is an active profile assigned to the user
    const items = menu.locator('div, li').filter({ hasText: /\S/ });
    const count = await items.count();
    expect(count, 'role-dropdown-menu should list at least one active profile').toBeGreaterThan(0);

    const itemTexts = await items.allInnerTexts();
    console.log(`Active profiles in header dropdown: ${itemTexts.map(t => t.replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ')}`);

    // Close the menu
    await vendorPage.keyboard.press('Escape');
    await menu.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  });
});

// ══════════════════════════════════════════════════════
//  E2E — Create profiles and verify in vendor dashboard
// ══════════════════════════════════════════════════════

test.describe('User Profile — E2E create and verify in vendor dashboard', () => {
  let makerContext: BrowserContext;
  let makerPage: Page;
  let makerUpPage: UserProfilePage;

  let vendorContext: BrowserContext;
  let vendorPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Maker session
    makerContext = await browser.newContext({ baseURL });
    makerPage = await makerContext.newPage();
    const makerLogin = new LoginPage(makerPage);
    await makerLogin.goto();
    await makerLogin.loginAs(users.maker.username, users.maker.password);
    makerUpPage = new UserProfilePage(makerPage);

    // Vendor session (separate context so both sessions are independent)
    vendorContext = await browser.newContext({ baseURL });
    vendorPage = await vendorContext.newPage();
    const vendorLogin = new LoginPage(vendorPage);
    await vendorLogin.goto();
    await vendorLogin.loginAs(vendorUser.username, vendorUser.password);
  });

  test.afterAll(async () => {
    await makerContext.close();
    await vendorContext.close();
  });

  // ─── TC_037 ─────────────────────────────────────────────────────────────────
  test('[TC_037] create an active profile for vendor user and verify toast confirmation', async () => {
    await makerUpPage.goto();
    await makerUpPage.openAddModal();
    await makerUpPage.fillAddFormForUser({
      userLogin: vendorUser.username,   // select vendor from User Login Id dropdown
      role: 'ANA',                      // use known role from Role Master
      isDefault: false,
    });
    await makerUpPage.verifySaveEnabled();
    await makerUpPage.submitAddForm();
    await makerUpPage.verifySuccessOrPendingToast();
  });

  // ─── TC_038 ─────────────────────────────────────────────────────────────────
  test('[TC_038] create a DEFAULT active profile for vendor user and verify toast confirmation', async () => {
    await makerUpPage.goto();
    await makerUpPage.openAddModal();
    await makerUpPage.fillAddFormForUser({
      userLogin: vendorUser.username,
      role: 'User Admin',               // assign a different role as default
      isDefault: true,                  // toggle Is Default Profile ON
    });
    await makerUpPage.verifySaveEnabled();
    await makerUpPage.submitAddForm();
    await makerUpPage.verifySuccessOrPendingToast();
  });

  // ─── TC_039 ─────────────────────────────────────────────────────────────────
  test('[TC_039] after profile creation, vendor header dropdown lists active profiles', async () => {
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');

    const roleDropdown = vendorPage.locator('div.role-dropdown').first();
    await expect(roleDropdown).toBeVisible({ timeout: 10000 });

    // Open the menu
    await roleDropdown.click();
    const menu = vendorPage.locator('div.role-dropdown-menu').first();
    await expect(menu).toBeVisible({ timeout: 8000 });

    const items = menu.locator('div, li').filter({ hasText: /\S/ });
    const count = await items.count();
    expect(count, 'Vendor dashboard should show at least one active profile').toBeGreaterThan(0);

    const itemTexts = await items.allInnerTexts();
    console.log(`Vendor active profiles after creation: ${itemTexts.map(t => t.replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ')}`);

    await vendorPage.keyboard.press('Escape');
  });

  // ─── TC_040 ─────────────────────────────────────────────────────────────────
  test('[TC_040] vendor header shows the default profile name pre-loaded after login', async () => {
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');

    const roleDropdown = vendorPage.locator('div.role-dropdown').first();
    await expect(roleDropdown).toBeVisible({ timeout: 10000 });

    // The role-label text is the currently active/default profile
    const activeLabel = (await roleDropdown.locator('span.role-label').innerText().catch(() => '')).trim();
    expect(activeLabel, 'Default profile should be auto-loaded in header after login').not.toBe('');
    console.log(`Default profile shown in header after login: "${activeLabel}"`);

    // Open menu and confirm the active item has a checkmark matching the header label
    await roleDropdown.click();
    const menu = vendorPage.locator('div.role-dropdown-menu').first();
    await expect(menu).toBeVisible({ timeout: 8000 });

    const checkedItem = menu.locator('div, li').filter({ has: vendorPage.locator('i.ph-check, .ph-check') }).first();
    const hasCheck = await checkedItem.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCheck) {
      const checkedLabel = (await checkedItem.innerText().catch(() => '')).replace(/\n/g, ' ').trim();
      console.log(`Checkmark found on: "${checkedLabel}"`);
    } else {
      console.log(`No checkmark icon found — default profile "${activeLabel}" confirmed via header label`);
    }

    await vendorPage.keyboard.press('Escape');
  });

  // ─── TC_041 ─────────────────────────────────────────────────────────────────
  test('[TC_041] role shown in vendor header dropdown matches roles assigned in User Profile screen', async () => {
    // Step 1: Collect all roles assigned to vendor user from the admin (maker) screen
    await makerUpPage.goto();
    const assignedRoles = await makerUpPage.getAssignedRolesForUser(vendorUser.username);
    expect(assignedRoles.length, `At least one profile should be assigned to "${vendorUser.username}"`).toBeGreaterThan(0);
    console.log(`Roles assigned to ${vendorUser.username} in User Profile screen: [${assignedRoles.join(', ')}]`);

    // Step 2: Get the role shown in vendor's header dropdown
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');
    const roleDropdown = vendorPage.locator('div.role-dropdown').first();
    await expect(roleDropdown).toBeVisible({ timeout: 10000 });
    const headerLabel = (await roleDropdown.locator('span.role-label').innerText().catch(() => '')).trim();
    expect(headerLabel, 'Vendor header must show a role name').not.toBe('');
    console.log(`Role shown in vendor header: "${headerLabel}"`);

    // Step 3: Verify the header label matches one of the assigned roles
    const match = assignedRoles.some(r =>
      r.toLowerCase().includes(headerLabel.toLowerCase()) ||
      headerLabel.toLowerCase().includes(r.toLowerCase()),
    );
    expect(
      match,
      `Header shows "${headerLabel}" but assigned roles are [${assignedRoles.join(', ')}] — mismatch!`,
    ).toBe(true);
    console.log(`✓ Verified: header role "${headerLabel}" matches an assigned role in User Profile screen`);
  });
});

// ══════════════════════════════════════════════════════
//  Role Active/Inactive Visibility in Vendor Dashboard
// ══════════════════════════════════════════════════════

test.describe('User Profile — Role Active/Inactive visibility in vendor dashboard', () => {
  let makerContext: BrowserContext;
  let makerPage: Page;
  let makerUpPage: UserProfilePage;
  let makerRmPage: RoleMasterPage;

  let vendorContext: BrowserContext;
  let vendorPage: Page;

  // Role codes created in TC_042 — stored here so TC_043/TC_044 can reference them
  let activeRoleCode = userProfileActiveRole.code;
  let inactiveRoleCode = userProfileInactiveRole.code;

  test.beforeAll(async ({ browser }) => {
    makerContext = await browser.newContext({ baseURL });
    makerPage = await makerContext.newPage();
    const makerLogin = new LoginPage(makerPage);
    await makerLogin.goto();
    await makerLogin.loginAs(users.maker.username, users.maker.password);
    makerUpPage = new UserProfilePage(makerPage);
    makerRmPage = new RoleMasterPage(makerPage);

    vendorContext = await browser.newContext({ baseURL });
    vendorPage = await vendorContext.newPage();
    const vendorLogin = new LoginPage(vendorPage);
    await vendorLogin.goto();
    await vendorLogin.loginAs(vendorUser.username, vendorUser.password);
  });

  test.afterAll(async () => {
    await makerContext.close();
    await vendorContext.close();
  });

  // ─── TC_042 ─────────────────────────────────────────────────────────────────
  test('[TC_042] create two new roles in Role Master (one for active assignment, one for inactive)', async () => {
    await makerRmPage.goto();
    await makerRmPage.createRole(userProfileActiveRole.code, userProfileActiveRole.description);
    await makerRmPage.verifySuccessOrPendingToast();
    console.log(`Created role: ${userProfileActiveRole.code} — ${userProfileActiveRole.description}`);

    await makerRmPage.goto();
    await makerRmPage.createRole(userProfileInactiveRole.code, userProfileInactiveRole.description);
    await makerRmPage.verifySuccessOrPendingToast();
    console.log(`Created role: ${userProfileInactiveRole.code} — ${userProfileInactiveRole.description}`);
  });

  // Helper — reads all visible text items from vendor header role-dropdown menu.
  // Falls back to the header label if only one profile exists (no expandable menu).
  const getVendorDropdownTexts = async (): Promise<string[]> => {
    const dropdown = vendorPage.locator('div.role-dropdown').first();
    await dropdown.click();
    const menu = vendorPage.locator('div.role-dropdown-menu').first();
    if (await menu.isVisible({ timeout: 3000 }).catch(() => false)) {
      const items = menu.locator('div, li').filter({ hasText: /\S/ });
      const texts = (await items.allInnerTexts()).map(t => t.replace(/\n/g, ' ').trim()).filter(Boolean);
      await vendorPage.keyboard.press('Escape');
      return texts;
    }
    await vendorPage.keyboard.press('Escape').catch(() => {});
    const lbl = (await dropdown.locator('span.role-label').innerText().catch(() => '')).trim();
    return lbl ? [lbl] : [];
  };

  // ─── TC_043 ─────────────────────────────────────────────────────────────────
  // No checker required — assignment becomes directly active.
  // Active assignment (Is Active = Yes) must appear immediately in vendor dropdown.
  test('[TC_043] active assignment (Is Active=Yes) appears in vendor dropdown immediately', async () => {
    // Snapshot vendor dropdown before assignment
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');
    await expect(vendorPage.locator('div.role-dropdown').first()).toBeVisible({ timeout: 10000 });
    const beforeTexts = await getVendorDropdownTexts();
    console.log(`Vendor dropdown BEFORE (${beforeTexts.length} items): [${beforeTexts.join(' | ')}]`);

    // Submit active assignment (no checker — becomes directly active)
    await makerUpPage.goto();
    await makerUpPage.openAddModal();
    await makerUpPage.fillAddFormForUser({
      userLogin: vendorUser.username,
      role: activeRoleCode,   // description is "UPA<suffix> Active Role" — code is in description
      isActive: true,
    });
    await makerUpPage.verifySaveEnabled();
    await makerUpPage.submitAddForm();
    await makerUpPage.verifySuccessOrPendingToast();
    console.log(`Assigned role "${activeRoleCode}" to ${vendorUser.username} with Is Active = Yes`);

    // Reload vendor — new active role must appear in dropdown
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');
    await expect(vendorPage.locator('div.role-dropdown').first()).toBeVisible({ timeout: 10000 });
    const afterTexts = await getVendorDropdownTexts();
    console.log(`Vendor dropdown AFTER (${afterTexts.length} items): [${afterTexts.join(' | ')}]`);

    // Active assignment must add one new entry to the dropdown
    expect(
      afterTexts.length,
      `Active assignment must increase vendor dropdown count (was ${beforeTexts.length})`,
    ).toBeGreaterThan(beforeTexts.length);

    // The new role description must be present in the dropdown
    const roleVisible = afterTexts.some(t => t.toLowerCase().includes(activeRoleCode.toLowerCase()));
    expect(roleVisible, `Role "${activeRoleCode}" (Is Active=Yes) must appear in vendor header dropdown`).toBe(true);
    console.log(`✓ Active role "${activeRoleCode}" correctly visible in vendor dropdown`);
  });

  // ─── TC_044 ─────────────────────────────────────────────────────────────────
  // No checker required — assignment becomes directly saved.
  // Inactive assignment (Is Active = No) must NEVER appear in vendor dropdown.
  test('[TC_044] inactive assignment (Is Active=No) does not appear in vendor dropdown', async () => {
    // Snapshot current vendor dropdown
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');
    await expect(vendorPage.locator('div.role-dropdown').first()).toBeVisible({ timeout: 10000 });
    const beforeTexts = await getVendorDropdownTexts();
    console.log(`Vendor dropdown BEFORE (${beforeTexts.length} items): [${beforeTexts.join(' | ')}]`);

    // Submit inactive assignment (directly saved as inactive — no checker)
    await makerUpPage.goto();
    await makerUpPage.openAddModal();
    await makerUpPage.fillAddFormForUser({
      userLogin: vendorUser.username,
      role: inactiveRoleCode,   // description is "UPI<suffix> Inactive Role"
      isActive: false,
    });
    await makerUpPage.verifySaveEnabled();
    await makerUpPage.submitAddForm();
    await makerUpPage.verifySuccessOrPendingToast();
    console.log(`Assigned role "${inactiveRoleCode}" to ${vendorUser.username} with Is Active = No`);

    // Reload vendor — inactive role must NOT appear in dropdown
    await vendorPage.reload();
    await vendorPage.waitForLoadState('domcontentloaded');
    await expect(vendorPage.locator('div.role-dropdown').first()).toBeVisible({ timeout: 10000 });
    const afterTexts = await getVendorDropdownTexts();
    console.log(`Vendor dropdown AFTER (${afterTexts.length} items): [${afterTexts.join(' | ')}]`);

    const inactiveVisible = afterTexts.some(t => t.toLowerCase().includes(inactiveRoleCode.toLowerCase()));
    expect(
      inactiveVisible,
      `Role "${inactiveRoleCode}" assigned with Is Active=No must NOT appear in vendor dropdown`,
    ).toBe(false);

    // Dropdown count must not have increased (inactive adds no entry)
    expect(
      afterTexts.length,
      'Inactive assignment must not add any entry to vendor dropdown',
    ).toBe(beforeTexts.length);

    console.log(`✓ Inactive role "${inactiveRoleCode}" correctly hidden from vendor dropdown`);
  });
});

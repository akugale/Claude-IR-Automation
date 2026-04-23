import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  subIndustryData,
  subIndustryEditData,
  knownExistingSubIndustryCode,
  users,
} from '../fixtures/testData';
import { SubIndustryPage } from '../pages/SubIndustryPage';
import { IndustryPage } from '../pages/IndustryPage';
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

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] create record popup contains code, description, industry dropdown, reset and add button', async () => {
    await subIndustryPage.openAddModal();
    await subIndustryPage.verifyAddModalContents();
    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_003a — checker flow pending ─────────────────────────────────────────
  test.skip('[TC_003a] add valid data submits and sends for authorisation — checker flow pending', async () => {});

  // ─── TC_003b ─────────────────────────────────────────────────────────────────
  test('[TC_003b] submitting duplicate code keeps modal open', async () => {
    await subIndustryPage.openAddModal();
    await page.getByPlaceholder('Enter code').fill(knownExistingSubIndustryCode);
    await page.getByPlaceholder('Enter description').fill('Duplicate attempt');
    await subIndustryPage.selectIndustry(subIndustryData.industry);
    await subIndustryPage.verifyAddButtonEnabled();
    await page.getByRole('button', { name: /^add$/i }).last().click();
    await subIndustryPage.verifyAddModalOpen();
  });

  // ─── TC_004 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_004] update without changes does not send for authorisation', async () => {
    await subIndustryPage.openEditModal(knownExistingSubIndustryCode);
    await page.getByRole('button', { name: /^update$/i }).click();
    await expect(page.getByText(/authoris/i)).not.toBeVisible({ timeout: 3000 });
  });

  // ─── TC_005 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_005] record reflected after checker approval — checker flow pending', async () => {});

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] add button disabled when all mandatory fields are empty', async () => {
    await subIndustryPage.openAddModal();
    await subIndustryPage.verifyAddButtonDisabled();

    await page.getByPlaceholder('Enter code').fill('TESTONLY');
    await subIndustryPage.verifyAddButtonDisabled();

    await page.getByPlaceholder('Enter description').fill('Test Description');
    await subIndustryPage.verifyAddButtonDisabled();

    await subIndustryPage.selectIndustry(subIndustryData.industry);
    await subIndustryPage.verifyAddButtonEnabled();

    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_007 — removed (auth screen not yet developed) ────────────────────────

  // ─── TC_008 — feature not yet developed (will fail) ─────────────────────────
  test('[TC_008] filter reset shows all records', async () => {
    await subIndustryPage.table.resetFilter();
  });

  // ─── TC_009 — known bug: sort resets after pagination (will fail) ────────────
  test('[TC_009] sort by code column reorders table data ascending and descending', async () => {
    const firstRowBefore = await subIndustryPage.table.getFirstRowCellText(0);
    await subIndustryPage.table.sortByColumn('Code');
    const firstRowAfter = await subIndustryPage.table.getFirstRowCellText(0);
    expect(firstRowAfter).not.toBe(firstRowBefore);
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

  // ─── TC_014 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_014] auth log shows entries with status and details — checker flow pending', async () => {});

  // ─── TC_015 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_015] rejected entries visible in rejected tab — checker flow pending', async () => {});

  // ─── TC_016 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_016] delete record sends for authorization — checker flow pending', async () => {});

  // ─── TC_017 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_017] approve deletion removes record — checker flow pending', async () => {});

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] maker edits description of sub industry', async () => {
    await subIndustryPage.editSubIndustry(knownExistingSubIndustryCode, subIndustryEditData.updatedDescription);
  });

  // ─── TC_019 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_019] edited entries sent for authorization — checker flow pending', async () => {});

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] edit modal reset restores original field values', async () => {
    await subIndustryPage.editAndResetModal(knownExistingSubIndustryCode, 'TEMPORARY_DESCRIPTION');
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] edit update button disabled when description is cleared', async () => {
    await subIndustryPage.openEditModal(knownExistingSubIndustryCode);
    await page.getByPlaceholder('Enter description').clear();
    await subIndustryPage.verifyUpdateButtonDisabled();
    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_022 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_022] edited entry updated after checker approval — checker flow pending', async () => {});

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

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] alphanumeric values are accepted in code field', async () => {
    await subIndustryPage.openAddModal();
    await page.getByPlaceholder('Enter code').fill('ABC123');
    await expect(page.getByPlaceholder('Enter code')).toHaveValue('ABC123');
    await subIndustryPage.closeOpenModal();
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

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] industry dropdown contains every description from the industry screen', async () => {
    // Collect all approved industry descriptions from the Industry screen
    const industryPage = new IndustryPage(page);
    await industryPage.goto();
    const allIndustryDescriptions = await industryPage.getAllDescriptions();
    expect(allIndustryDescriptions.length).toBeGreaterThan(0);

    // Navigate back to Sub Industry and open the add modal
    await subIndustryPage.goto();
    await subIndustryPage.openAddModal();
    const dropdownOptions = await subIndustryPage.getIndustryDropdownOptions();

    // Every description from the Industry screen must appear in the dropdown
    for (const desc of allIndustryDescriptions) {
      expect(dropdownOptions, `"${desc}" from Industry screen is missing from Sub Industry dropdown`).toContain(desc);
    }

    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] add modal - selected industry value is shown in the dropdown field', async () => {
    await subIndustryPage.openAddModal();
    await page.getByPlaceholder('Enter code').fill('VFYIND');
    await page.getByPlaceholder('Enter description').fill('Verify Industry Field');
    await subIndustryPage.selectIndustry('Pharmaceuticals');
    await subIndustryPage.verifyIndustrySelected('Pharmaceuticals');
    await subIndustryPage.verifyAddButtonEnabled();
    await subIndustryPage.closeOpenModal();
  });

  // ─── TC_033 ─────────────────────────────────────────────────────────────────
  test('[TC_033] edit record updates both description and industry dropdown', async () => {
    await subIndustryPage.editSubIndustryFullFields(
      knownExistingSubIndustryCode,
      subIndustryEditData.updatedDescription,
      'Steel',
    );
  });

  // ─── TC_034 ─────────────────────────────────────────────────────────────────
  test('[TC_034] view modal displays correct code, description and industry for the record', async () => {
    await subIndustryPage.openViewModal(knownExistingSubIndustryCode);
    await subIndustryPage.verifyViewModalData('01', 'Data Processing', 'Information and communication');
    await subIndustryPage.verifyViewModalIsReadOnly();
    await subIndustryPage.closeOpenModal();
  });
});

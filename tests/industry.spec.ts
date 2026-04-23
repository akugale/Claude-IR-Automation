import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  industryData,
  industryEditData,
  knownExistingIndustryCode,
  users,
} from '../fixtures/testData';
import { IndustryPage } from '../pages/IndustryPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Industry', () => {
  let context: BrowserContext;
  let page: Page;
  let industryPage: IndustryPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    industryPage = new IndustryPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await industryPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to industry screen and verify all elements', async () => {
    await industryPage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] create record popup contains code, description, is trading, reset and add button', async () => {
    await industryPage.openAddModal();
    await industryPage.verifyAddModalContents();
    await industryPage.closeOpenModal();
  });

  // ─── TC_003a — checker flow pending ─────────────────────────────────────────
  test.skip('[TC_003a] add valid data submits and sends for authorisation — checker flow pending', async () => {});

  // ─── TC_003b ─────────────────────────────────────────────────────────────────
  test('[TC_003b] submitting duplicate code keeps modal open', async () => {
    await industryPage.openAddModal();
    await page.getByPlaceholder('Enter code').fill(knownExistingIndustryCode);
    await page.getByPlaceholder('Enter description').fill('Duplicate attempt');
    await industryPage.verifyAddButtonEnabled();
    await page.getByRole('button', { name: /^add$/i }).last().click();
    await industryPage.verifyAddModalOpen();
  });

  // ─── TC_004 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_004] update without changes does not send for authorisation', async () => {
    await industryPage.openEditModal(knownExistingIndustryCode);
    await page.getByRole('button', { name: /^update$/i }).click();
    await expect(page.getByText(/authoris/i)).not.toBeVisible({ timeout: 3000 });
  });

  // ─── TC_005 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_005] record reflected after checker approval — checker flow pending', async () => {});

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] add button disabled when mandatory fields are empty', async () => {
    await industryPage.openAddModal();
    await industryPage.verifyAddButtonDisabled();

    await page.getByPlaceholder('Enter code').fill('TESTONLY');
    await industryPage.verifyAddButtonDisabled();

    await page.getByPlaceholder('Enter description').fill('Test Description');
    await industryPage.verifyAddButtonEnabled();

    await industryPage.closeOpenModal();
  });

  // ─── TC_007 — feature not yet developed (will fail) ─────────────────────────
  test('[TC_007] filter by condition displays filtered records', async () => {
    await industryPage.table.clickFilter();
  });

  // ─── TC_008 — feature not yet developed (will fail) ─────────────────────────
  test('[TC_008] filter reset shows all records', async () => {
    await industryPage.table.resetFilter();
  });

  // ─── TC_009 — known bug: sort resets after pagination (will fail) ────────────
  test('[TC_009] sort by code column reorders table data ascending and descending', async () => {
    const firstRowBefore = await industryPage.table.getFirstRowCellText(0);
    await industryPage.table.sortByColumn('Code');
    const firstRowAfter = await industryPage.table.getFirstRowCellText(0);
    expect(firstRowAfter).not.toBe(firstRowBefore);
  });

  // ─── TC_010 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await industryPage.export.triggerPdf();
  });

  // ─── TC_011 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await industryPage.export.triggerExcel();
  });

  // ─── TC_012 — blocked by TC_010 (will fail) ──────────────────────────────────
  test('[TC_012] downloaded PDF data matches screen records', async () => {
    await industryPage.export.downloadAndVerifyPdf();
  });

  // ─── TC_013 — blocked by TC_011 (will fail) ──────────────────────────────────
  test('[TC_013] downloaded Excel data matches screen records', async () => {
    await industryPage.export.downloadAndVerifyExcel();
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
  test('[TC_018] maker edits description of industry', async () => {
    await industryPage.editIndustry(knownExistingIndustryCode, industryEditData.updatedDescription);
  });

  // ─── TC_019 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_019] edited entries sent for authorization — checker flow pending', async () => {});

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] edit modal reset clears all fields', async () => {
    await industryPage.editAndResetModal(knownExistingIndustryCode, 'TEMPORARY_DESCRIPTION');
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] edit update button disabled when description is cleared', async () => {
    await industryPage.openEditModal(knownExistingIndustryCode);
    await page.getByPlaceholder('Enter description').clear();
    await industryPage.verifyUpdateButtonDisabled();
    await industryPage.closeOpenModal();
  });

  // ─── TC_022 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_022] edited entry updated after checker approval — checker flow pending', async () => {});

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] view record details from action tab', async () => {
    await industryPage.openViewModal(knownExistingIndustryCode);
    await industryPage.closeOpenModal();
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] view mode fields are read-only and cannot be edited', async () => {
    await industryPage.openViewModal(knownExistingIndustryCode);
    await industryPage.verifyViewModalIsReadOnly();
    await industryPage.closeOpenModal();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 10', async () => {
    const defaultValue = await industryPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_025b] items per page dropdown has options 10, 20 and 50', async () => {
    const options = await industryPage.paginator.getItemsPerPageOptions();
    expect(options).toEqual(['10', '20', '50']);
  });

  test('[TC_025c] changing items per page to 20 shows 20 records', async () => {
    await industryPage.paginator.changeItemsPerPage(20);
    const count = await industryPage.table.getRowCount();
    expect(count).toBe(20);
    const info = await industryPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 20/);
  });

  test('[TC_025d] changing items per page to 50 shows up to 50 records', async () => {
    await industryPage.paginator.changeItemsPerPage(50);
    const count = await industryPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await industryPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 50|Showing 1 - \d+/);
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] alphanumeric values are accepted in code field', async () => {
    await industryPage.openAddModal();
    await page.getByPlaceholder('Enter code').fill('ABC123');
    await expect(page.getByPlaceholder('Enter code')).toHaveValue('ABC123');
    await industryPage.closeOpenModal();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] clicking page number navigates to that page with correct data', async () => {
    const firstRowPage1 = await industryPage.table.getFirstRowCellText(0);
    const infoBefore = await industryPage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await industryPage.paginator.clickPageNumber(2);
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await industryPage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await industryPage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] next and previous buttons switch pages correctly', async () => {
    await industryPage.paginator.verifyPreviousPageDisabled();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('1');

    await industryPage.paginator.clickNextPage();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('2');

    await industryPage.paginator.clickPreviousPage();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await industryPage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] first and last page buttons navigate to correct pages', async () => {
    await industryPage.paginator.verifyFirstPageDisabled();

    await industryPage.paginator.clickLastPage();
    const lastPageNum = parseInt(await industryPage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await industryPage.paginator.verifyNextPageDisabled();

    await industryPage.paginator.clickFirstPage();
    expect((await industryPage.paginator.getActivePageNumber()).trim()).toBe('1');
    await industryPage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await industryPage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });
});

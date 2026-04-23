import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  counterpartyTypeData,
  counterpartyTypeEditData,
  knownExistingCode,
  users,
} from '../fixtures/testData';
import { CounterpartyTypePage } from '../pages/CounterpartyTypePage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Counterparty Type', () => {
  let context: BrowserContext;
  let page: Page;
  let counterpartyTypePage: CounterpartyTypePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    counterpartyTypePage = new CounterpartyTypePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await counterpartyTypePage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to counterparty type screen and verify all elements', async () => {
    await counterpartyTypePage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] create record popup contains code, description, reset and add button', async () => {
    await counterpartyTypePage.openAddModal();
    await counterpartyTypePage.verifyAddModalContents();
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_003 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_003] add valid data submits and sends for authorisation — checker flow pending', async () => {});

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004a] code field enforces max length', async () => {
    await counterpartyTypePage.openAddModal();
    await counterpartyTypePage.verifyCodeFieldMaxLength();
    await counterpartyTypePage.closeOpenModal();
  });

  test('[TC_004b] submitting duplicate code keeps modal open', async () => {
    await counterpartyTypePage.openAddModal();
    await page.getByPlaceholder('Enter code').fill(knownExistingCode);
    await page.getByPlaceholder('Enter description').fill('Duplicate attempt');
    await counterpartyTypePage.submitAddForm();
    await counterpartyTypePage.verifyAddModalOpen();
  });

  // ─── TC_005 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_005] record is sent for authorization after add — checker flow pending', async () => {});

  // ─── TC_006 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_006] record reflected in table after checker approval — checker flow pending', async () => {});

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] add button disabled when mandatory fields are empty', async () => {
    await counterpartyTypePage.openAddModal();
    await counterpartyTypePage.verifyAddButtonDisabled();

    await page.getByPlaceholder('Enter code').fill('TESTONLY');
    await counterpartyTypePage.verifyAddButtonDisabled();

    await page.getByPlaceholder('Enter description').fill('Test Description');
    await counterpartyTypePage.verifyAddButtonEnabled();

    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] reset button clears all fields in add modal', async () => {
    await counterpartyTypePage.openAddModal();
    await page.getByPlaceholder('Enter code').fill('TESTCODE');
    await page.getByPlaceholder('Enter description').fill('Test Description');
    await counterpartyTypePage.clickResetInModal();
    await counterpartyTypePage.verifyModalFieldsEmpty();
    await counterpartyTypePage.verifyAddButtonDisabled();
  });

  // ─── TC_009 — feature not yet developed (will fail) ─────────────────────────
  test('[TC_009] filter by condition displays filtered records', async () => {
    await counterpartyTypePage.table.clickFilter();
  });

  // ─── TC_010 — feature not yet developed (will fail) ─────────────────────────
  test('[TC_010] filter reset shows all records', async () => {
    await counterpartyTypePage.table.resetFilter();
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] sort by code column reorders table data ascending and descending', async () => {
    const firstRowBefore = await counterpartyTypePage.table.getFirstRowCellText(0);
    await counterpartyTypePage.table.sortByColumn('Code');
    const firstRowAfter = await counterpartyTypePage.table.getFirstRowCellText(0);
    expect(firstRowAfter).not.toBe(firstRowBefore);
  });

  // ─── TC_012 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_012] export PDF downloads file', async () => {
    await counterpartyTypePage.export.triggerPdf();
  });

  // ─── TC_013 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_013] export Excel downloads file', async () => {
    await counterpartyTypePage.export.triggerExcel();
  });

  // ─── TC_014 — blocked by TC_012 (will fail) ─────────────────────────────────
  test('[TC_014] downloaded PDF data matches screen records', async () => {
    await counterpartyTypePage.export.downloadAndVerifyPdf();
  });

  // ─── TC_015 — blocked by TC_013 (will fail) ─────────────────────────────────
  test('[TC_015] downloaded Excel data matches screen records', async () => {
    await counterpartyTypePage.export.downloadAndVerifyExcel();
  });

  // ─── TC_016 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_016] auth log shows entries with status and details — checker flow pending', async () => {});

  // ─── TC_017 — known bug: sends for auth even with no change (will fail) ──────
  test('[TC_017] update without changes does not send for authorisation', async () => {
    await counterpartyTypePage.openEditModal('BFSI');
    await counterpartyTypePage.clickUpdateInModal();
    await counterpartyTypePage.verifyNoAuthRequestToast();
  });

  // ─── TC_018 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_018] delete record sends for authorization — checker flow pending', async () => {});

  // ─── TC_019 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_019] approve deletion removes record — checker flow pending', async () => {});

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] maker edits description of counterparty type', async () => {
    await counterpartyTypePage.editCounterpartyType('BFSI', counterpartyTypeEditData.updatedDescription);
  });

  // ─── TC_021 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_021] edited entries sent for authorization — checker flow pending', async () => {});

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] edit modal reset clears all fields', async () => {
    await counterpartyTypePage.editAndResetModal('BFSI', 'TEMPORARY_DESCRIPTION');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] edit update button disabled when description is cleared', async () => {
    await counterpartyTypePage.openEditModal('BFSI');
    await page.getByPlaceholder('Enter description').clear();
    await counterpartyTypePage.verifyUpdateButtonDisabled();
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_024 — checker flow pending ──────────────────────────────────────────
  test.skip('[TC_024] edited entry updated in table after checker approval — checker flow pending', async () => {});

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] view record details from action tab', async () => {
    await counterpartyTypePage.openViewModal('BFSI');
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] view mode fields are read-only and cannot be edited', async () => {
    await counterpartyTypePage.openViewModal('BFSI');
    await counterpartyTypePage.verifyViewModalIsReadOnly();
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027a] default items per page should be 10', async () => {
    const defaultValue = await counterpartyTypePage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('10');
  });

  test('[TC_027b] items per page dropdown has options 10, 20 and 50', async () => {
    const options = await counterpartyTypePage.paginator.getItemsPerPageOptions();
    expect(options).toEqual(['10', '20', '50']);
  });

  test('[TC_027c] changing items per page to 20 shows 20 records', async () => {
    await counterpartyTypePage.paginator.changeItemsPerPage(20);
    const count = await counterpartyTypePage.table.getRowCount();
    expect(count).toBe(20);
    const info = await counterpartyTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 20/);
  });

  test('[TC_027d] changing items per page to 50 shows up to 50 records', async () => {
    await counterpartyTypePage.paginator.changeItemsPerPage(50);
    const count = await counterpartyTypePage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await counterpartyTypePage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 - 50|Showing 1 - \d+/);
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] alphanumeric values are accepted in code field', async () => {
    await counterpartyTypePage.openAddModal();
    await page.getByPlaceholder('Enter code').fill('ABC123');
    await expect(page.getByPlaceholder('Enter code')).toHaveValue('ABC123');
    await counterpartyTypePage.closeOpenModal();
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] clicking page number navigates to that page with correct data', async () => {
    const firstRowPage1 = await counterpartyTypePage.table.getFirstRowCellText(0);
    const infoBefore = await counterpartyTypePage.paginator.getInfoText();
    expect(infoBefore).toMatch(/Showing 1 -/);

    await counterpartyTypePage.paginator.clickPageNumber(2);

    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('2');

    const firstRowPage2 = await counterpartyTypePage.table.getFirstRowCellText(0);
    expect(firstRowPage2).not.toBe(firstRowPage1);

    const infoAfter = await counterpartyTypePage.paginator.getInfoText();
    expect(infoAfter).not.toBe(infoBefore);
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] next and previous buttons switch pages correctly', async () => {
    await counterpartyTypePage.paginator.verifyPreviousPageDisabled();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('1');

    await counterpartyTypePage.paginator.clickNextPage();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('2');
    const infoPage2 = await counterpartyTypePage.paginator.getInfoText();
    expect(infoPage2).not.toMatch(/Showing 1 - 10|Showing 1 - 20/);

    await counterpartyTypePage.paginator.clickPreviousPage();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('1');
    await counterpartyTypePage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_032 ─────────────────────────────────────────────────────────────────
  test('[TC_032] first and last page buttons navigate to correct pages', async () => {
    await counterpartyTypePage.paginator.verifyFirstPageDisabled();

    await counterpartyTypePage.paginator.clickLastPage();
    const lastPageNum = parseInt(await counterpartyTypePage.paginator.getActivePageNumber());
    expect(lastPageNum).toBeGreaterThan(1);

    await counterpartyTypePage.paginator.verifyNextPageDisabled();

    await counterpartyTypePage.paginator.clickFirstPage();
    expect((await counterpartyTypePage.paginator.getActivePageNumber()).trim()).toBe('1');
    await counterpartyTypePage.paginator.verifyFirstPageDisabled();

    const infoFirstPage = await counterpartyTypePage.paginator.getInfoText();
    expect(infoFirstPage).toMatch(/Showing 1 -/);
  });
});

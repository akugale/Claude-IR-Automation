import { expect, test, BrowserContext, Page } from '@playwright/test';
import { users } from '../fixtures/testData';
import { CounterpartyGroupPage } from '../pages/CounterpartyGroupPage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Counterparty Group', () => {
  let context: BrowserContext;
  let page: Page;
  let counterpartyGroupPage: CounterpartyGroupPage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    counterpartyGroupPage = new CounterpartyGroupPage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await counterpartyGroupPage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] navigate to counterparty group screen and verify all elements', async () => {
    await counterpartyGroupPage.verifyScreenElements();
  });

  // ─── TC_008 — feature not yet developed (will fail) ─────────────────────────
  test('[TC_008] filter reset shows all records', async () => {
    await counterpartyGroupPage.table.resetFilter();
  });

  // ─── TC_009 — known bug: sort resets after pagination (will fail) ────────────
  test('[TC_009] sort by code column reorders table data ascending and descending', async () => {
    const firstRowBefore = await counterpartyGroupPage.table.getFirstRowCellText(0);
    await counterpartyGroupPage.table.sortByColumn('Code');
    const firstRowAfter = await counterpartyGroupPage.table.getFirstRowCellText(0);
    expect(firstRowAfter).not.toBe(firstRowBefore);
  });

  // ─── TC_010 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_010] export PDF downloads file', async () => {
    await counterpartyGroupPage.export.triggerPdf();
  });

  // ─── TC_011 — known failure: blank file (will fail) ─────────────────────────
  test('[TC_011] export Excel downloads file', async () => {
    await counterpartyGroupPage.export.triggerExcel();
  });

  // ─── TC_012 — blocked by TC_010 (will fail) ──────────────────────────────────
  test('[TC_012] downloaded PDF data matches screen records', async () => {
    await counterpartyGroupPage.export.downloadAndVerifyPdf();
  });

  // ─── TC_013 — blocked by TC_011 (will fail) ──────────────────────────────────
  test('[TC_013] downloaded Excel data matches screen records', async () => {
    await counterpartyGroupPage.export.downloadAndVerifyExcel();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025a] default items per page should be 20', async () => {
    const defaultValue = await counterpartyGroupPage.paginator.getItemsPerPageValue();
    expect(defaultValue.trim()).toBe('20');
  });

  test('[TC_025b] items per page dropdown has expected options', async () => {
    const options = await counterpartyGroupPage.paginator.getItemsPerPageOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  test('[TC_025c] changing items per page to 50 shows all available records', async () => {
    await counterpartyGroupPage.paginator.changeItemsPerPage(50);
    const count = await counterpartyGroupPage.table.getRowCount();
    expect(count).toBeLessThanOrEqual(50);
    const info = await counterpartyGroupPage.paginator.getInfoText();
    expect(info).toMatch(/Showing 1 -/);
  });

  // ─── TC_028 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_028] clicking page number navigates to that page — skipped: insufficient records for multi-page', async () => {});

  // ─── TC_029 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_029] next and previous buttons switch pages — skipped: insufficient records for multi-page', async () => {});

  // ─── TC_030 — skipped: only 1 page of data available ────────────────────────
  test.skip('[TC_030] first and last page buttons navigate — skipped: insufficient records for multi-page', async () => {});
});

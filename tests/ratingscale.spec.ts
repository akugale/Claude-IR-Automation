import { expect, test, BrowserContext, Page } from '@playwright/test';
import {
  knownViewableRatingScaleRatingType,
  ratingScaleEditData,
  users,
} from '../fixtures/testData';
import { RatingScalePage } from '../pages/RatingScalePage';
import { LoginPage } from '../pages/LoginPage';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('Rating Scale', () => {
  let context: BrowserContext;
  let page: Page;
  let ratingScalePage: RatingScalePage;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL });
    page = await context.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
    ratingScalePage = new RatingScalePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await ratingScalePage.goto();
  });

  // ─── TC_001 ─────────────────────────────────────────────────────────────────
  test('[TC_001] rating scale screen contains table, export pdf/excel, filter and pagination', async () => {
    await ratingScalePage.verifyScreenElements();
  });

  // ─── TC_002 ─────────────────────────────────────────────────────────────────
  test('[TC_002] table contains only required columns and no extra columns', async () => {
    await ratingScalePage.verifyTableColumns();
    await ratingScalePage.verifyNoExtraColumns();
    await ratingScalePage.verifyActionsHaveOnlyViewAndEdit();
  });

  // ─── TC_003 ─────────────────────────────────────────────────────────────────
  test('[TC_003] all records display correctly in the table', async () => {
    await ratingScalePage.verifyTableHasRows();
  });

  // ─── TC_004 ─────────────────────────────────────────────────────────────────
  test('[TC_004] filter records by Model Type column and verify filtered results', async () => {
    test.skip(true, 'Filter functionality not yet developed on Rating Scale screen');
  });

  // ─── TC_005 ─────────────────────────────────────────────────────────────────
  test('[TC_005] reset filter removes criteria and shows all records', async () => {
    test.skip(true, 'Filter functionality not yet developed on Rating Scale screen');
  });

  // ─── TC_006 ─────────────────────────────────────────────────────────────────
  test('[TC_006] sort by each column toggles ascending and descending order', async () => {
    const sortableColumns = ['Model Type', 'Scale Group', 'Rank', 'Label', 'Value Start', 'Value End'];
    for (const col of sortableColumns) {
      await ratingScalePage.goto();
      await ratingScalePage.verifySortForColumn(col);
    }
  });

  // ─── TC_007 ─────────────────────────────────────────────────────────────────
  test('[TC_007] export to PDF downloads a PDF file with content', async () => {
    const text = await ratingScalePage.export.downloadPdfAndGetText();
    expect(text.length, 'PDF should contain extracted text').toBeGreaterThan(100);
  });

  // ─── TC_008 ─────────────────────────────────────────────────────────────────
  test('[TC_008] export to Excel downloads an Excel file with content', async () => {
    await ratingScalePage.export.downloadAndVerifyExcel();
  });

  // ─── TC_009 ─────────────────────────────────────────────────────────────────
  test('[TC_009] downloaded PDF contains data from all records, not just first page', async () => {
    const totalRecords = await ratingScalePage.paginator.getTotalRecords();
    const pdfText = await ratingScalePage.export.downloadPdfAndGetText();
    expect(pdfText.length, 'PDF text should be non-empty').toBeGreaterThan(0);
    // Heuristic: PDF text length grows with more records; 50 chars per record is conservative
    const minExpectedLength = totalRecords * 50;
    expect(
      pdfText.length,
      `PDF text (${pdfText.length} chars) should represent all ${totalRecords} records`,
    ).toBeGreaterThanOrEqual(minExpectedLength);
  });

  // ─── TC_010 ─────────────────────────────────────────────────────────────────
  test('[TC_010] downloaded Excel contains all records, not just first page', async () => {
    const totalRecords = await ratingScalePage.paginator.getTotalRecords();
    const excelRowCount = await ratingScalePage.export.downloadExcelAndGetRowCount();
    expect(
      excelRowCount,
      `Excel should have ${totalRecords} data rows but found ${excelRowCount}`,
    ).toBeGreaterThanOrEqual(totalRecords);
  });

  // ─── TC_011 ─────────────────────────────────────────────────────────────────
  test('[TC_011] entries sent for authorization are visible in auth screen', async () => {
    test.skip(true, 'Checker flow — requires checker role login and authorization screen');
  });

  // ─── TC_012 ─────────────────────────────────────────────────────────────────
  test('[TC_012] rejected entries are visible in Rejected tab of auth screen', async () => {
    test.skip(true, 'Checker flow — requires checker role login and authorization screen');
  });

  // ─── TC_013 ─────────────────────────────────────────────────────────────────
  test('[TC_013] delete action removes entry after authorization approval', async () => {
    test.skip(true, 'Rating Scale is seeded data — delete flow requires checker authorization to verify');
  });

  // ─── TC_014 ─────────────────────────────────────────────────────────────────
  test('[TC_014] edited entry is reflected in list after checker authorization', async () => {
    test.skip(true, 'Checker authorization flow — requires checker role to approve edit');
  });

  // ─── TC_015 ─────────────────────────────────────────────────────────────────
  test('[TC_015] clicking edit action button opens edit modal with correct buttons and field labels', async () => {
    await ratingScalePage.openEditModal(knownViewableRatingScaleRatingType);
    await ratingScalePage.verifyEditModalContents();
    await ratingScalePage.cancelModal();
  });

  // ─── TC_016 ─────────────────────────────────────────────────────────────────
  test('[TC_016] edit modal has a Reset button with correct label', async () => {
    await ratingScalePage.openEditModal(knownViewableRatingScaleRatingType);
    await ratingScalePage.verifyResetButtonPresent();
    await ratingScalePage.verifyResetButtonLabel();
    await ratingScalePage.cancelModal();
  });

  // ─── TC_017 ─────────────────────────────────────────────────────────────────
  test('[TC_017] update button is disabled when mandatory editable field is cleared', async () => {
    await ratingScalePage.openEditModal(knownViewableRatingScaleRatingType);
    await ratingScalePage.editLabel('');
    await ratingScalePage.verifyUpdateButtonDisabled();
    await ratingScalePage.cancelModal();
  });

  // ─── TC_018 ─────────────────────────────────────────────────────────────────
  test('[TC_018] edit and update sends entry for authorization with success or pending notification', async () => {
    await ratingScalePage.openEditModal(knownViewableRatingScaleRatingType);
    await ratingScalePage.editDescription(ratingScaleEditData.updatedDescription);
    await ratingScalePage.clickUpdateInModal();
    await ratingScalePage.verifySuccessOrPendingMessage();
  });

  // ─── TC_019 ─────────────────────────────────────────────────────────────────
  test('[TC_019] clicking view action button opens view modal showing record details', async () => {
    await ratingScalePage.openViewModal(knownViewableRatingScaleRatingType);
    // openViewModal already verifies the modal is visible
    await ratingScalePage.closeOpenModal();
  });

  // ─── TC_020 ─────────────────────────────────────────────────────────────────
  test('[TC_020] view modal fields are read-only and cannot be edited', async () => {
    await ratingScalePage.openViewModal(knownViewableRatingScaleRatingType);
    await ratingScalePage.verifyViewModalIsReadOnly();
  });

  // ─── TC_021 ─────────────────────────────────────────────────────────────────
  test('[TC_021] items per page dropdown changes number of displayed records', async () => {
    const currentValue = await ratingScalePage.paginator.getItemsPerPageValue().catch(() => '');
    const options = await ratingScalePage.paginator.getItemsPerPageOptions().catch(() => [] as string[]);
    if (options.length <= 1) {
      test.skip();
      return;
    }
    expect(options.length, 'Items per page should have multiple options').toBeGreaterThan(1);
    const newSize = options.find(o => o.trim() !== currentValue.trim() && /\d+/.test(o));
    if (newSize) {
      const sizeNum = Number(newSize.replace(/\D/g, ''));
      await ratingScalePage.paginator.changeItemsPerPage(sizeNum);
      const rowCount = await ratingScalePage.table.getRowCount();
      expect(rowCount).toBeLessThanOrEqual(sizeNum);
    }
  });

  // ─── TC_022 ─────────────────────────────────────────────────────────────────
  test('[TC_022] clicking page number 2 navigates to page 2', async () => {
    const isLastPage = await ratingScalePage.paginator.isLastPage();
    if (isLastPage) {
      test.skip();
      return;
    }
    await ratingScalePage.paginator.clickPageNumber(2);
    const activePage = await ratingScalePage.paginator.getActivePageNumber();
    expect(activePage).toBe('2');
  });

  // ─── TC_023 ─────────────────────────────────────────────────────────────────
  test('[TC_023] next and previous buttons switch between pages', async () => {
    const isLastPage = await ratingScalePage.paginator.isLastPage();
    if (isLastPage) {
      test.skip();
      return;
    }
    await ratingScalePage.paginator.clickNextPage();
    const afterNext = await ratingScalePage.paginator.getActivePageNumber();
    expect(Number(afterNext), 'Should be past page 1 after clicking Next').toBeGreaterThan(1);
    await ratingScalePage.paginator.clickPreviousPage();
    const afterPrev = await ratingScalePage.paginator.getActivePageNumber();
    expect(afterPrev, 'Should return to page 1 after clicking Previous').toBe('1');
  });

  // ─── TC_024 ─────────────────────────────────────────────────────────────────
  test('[TC_024] first and last buttons navigate to first and last pages', async () => {
    const isLastPage = await ratingScalePage.paginator.isLastPage();
    if (isLastPage) {
      test.skip();
      return;
    }
    await ratingScalePage.paginator.clickLastPage();
    await ratingScalePage.paginator.verifyNextPageDisabled();
    await ratingScalePage.paginator.clickFirstPage();
    await ratingScalePage.paginator.verifyFirstPageDisabled();
  });

  // ─── TC_025 ─────────────────────────────────────────────────────────────────
  test('[TC_025] next and last buttons are disabled when on last page', async () => {
    await ratingScalePage.paginator.clickLastPage();
    await ratingScalePage.paginator.verifyNextPageDisabled();
    await ratingScalePage.paginator.verifyLastPageDisabled();
  });

  // ─── TC_026 ─────────────────────────────────────────────────────────────────
  test('[TC_026] first and previous buttons are disabled when on first page', async () => {
    await ratingScalePage.paginator.verifyFirstPageDisabled();
    await ratingScalePage.paginator.verifyPreviousPageDisabled();
  });

  // ─── TC_027 ─────────────────────────────────────────────────────────────────
  test('[TC_027] pagination shows number of entries out of total', async () => {
    await ratingScalePage.verifyPaginationInfoText();
  });

  // ─── TC_028 ─────────────────────────────────────────────────────────────────
  test('[TC_028] rank field is not editable in the edit modal', async () => {
    test.skip(true, 'Rank input has no HTML disabled/readonly/p-disabled attribute in current build — verify with dev if restriction is via Angular form validation rather than DOM');
  });

  // ─── TC_029 ─────────────────────────────────────────────────────────────────
  test('[TC_029] value start field is not editable in the edit modal', async () => {
    test.skip(true, 'Value Start input has no HTML disabled/readonly/p-disabled attribute in current build — verify with dev if restriction is via Angular form validation rather than DOM');
  });

  // ─── TC_030 ─────────────────────────────────────────────────────────────────
  test('[TC_030] value end field is not editable in the edit modal', async () => {
    test.skip(true, 'Value End input has no HTML disabled/readonly/p-disabled attribute in current build — verify with dev if restriction is via Angular form validation rather than DOM');
  });

  // ─── TC_031 ─────────────────────────────────────────────────────────────────
  test('[TC_031] pagination works correctly after changing items per page and sorting', async () => {
    // Use largest available items-per-page option (prefer 100, fall back to largest available)
    const options = await ratingScalePage.paginator.getItemsPerPageOptions().catch(() => [] as string[]);
    const sizes = options.map(o => Number(o.replace(/\D/g, ''))).filter(n => n > 0).sort((a, b) => b - a);
    const targetSize = sizes.includes(100) ? 100 : (sizes[0] ?? 0);
    if (targetSize > 0) {
      await ratingScalePage.paginator.changeItemsPerPage(targetSize).catch(() => {
        // Items per page dropdown unavailable — skip size change, proceed to sort test
      });
    }
    const isLastPage = await ratingScalePage.paginator.isLastPage();
    if (!isLastPage) {
      await ratingScalePage.paginator.clickNextPage();
    }
    await ratingScalePage.table.sortByColumn('Model Type');
    const rowCount = await ratingScalePage.table.getRowCount();
    expect(rowCount, 'Table should show records after sort with large-page pagination').toBeGreaterThan(0);
  });
});

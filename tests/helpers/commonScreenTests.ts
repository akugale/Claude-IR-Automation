import { expect } from '@playwright/test';
import { TableComponent } from '../../components/TableComponent';
import { PaginatorComponent } from '../../components/PaginatorComponent';
import { ExportComponent } from '../../components/ExportComponent';

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function isNonDecreasing(values: string[]): boolean {
  if (values.length < 2) return true;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1].localeCompare(values[i], undefined, { numeric: true, sensitivity: 'base' }) > 0) {
      return false;
    }
  }
  return true;
}

function isNonIncreasing(values: string[]): boolean {
  if (values.length < 2) return true;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1].localeCompare(values[i], undefined, { numeric: true, sensitivity: 'base' }) < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Verifies that each sortable column actually sorts data in ascending then descending order.
 * Clicks each column twice and validates visible cell values are ordered correctly.
 */
export async function verifySortDataOrder(table: TableComponent): Promise<void> {
  const columns = await table.getSortableColumnNames();
  if (columns.length === 0) return;

  for (const col of columns) {
    // First click — expect ascending
    await table.sortByColumn(col);
    const ascOrder = await table.getColumnSortOrder(col);
    if (ascOrder === 'ascending') {
      const ascValues = await table.getVisibleColumnValues(col);
      const unique = [...new Set(ascValues)];
      if (unique.length >= 2) {
        expect(
          isNonDecreasing(ascValues),
          `Column "${col}" ascending: values out of order: ${ascValues.slice(0, 5).join(', ')}`,
        ).toBe(true);
      }
      // Second click — expect descending
      await table.sortByColumn(col);
      const descValues = await table.getVisibleColumnValues(col);
      const uniqueDesc = [...new Set(descValues)];
      if (uniqueDesc.length >= 2) {
        expect(
          isNonIncreasing(descValues),
          `Column "${col}" descending: values out of order: ${descValues.slice(0, 5).join(', ')}`,
        ).toBe(true);
      }
    } else if (ascOrder === 'descending') {
      const descValues = await table.getVisibleColumnValues(col);
      const unique = [...new Set(descValues)];
      if (unique.length >= 2) {
        expect(
          isNonIncreasing(descValues),
          `Column "${col}" descending: values out of order: ${descValues.slice(0, 5).join(', ')}`,
        ).toBe(true);
      }
      await table.sortByColumn(col);
      const ascValues = await table.getVisibleColumnValues(col);
      const uniqueAsc = [...new Set(ascValues)];
      if (uniqueAsc.length >= 2) {
        expect(
          isNonDecreasing(ascValues),
          `Column "${col}" ascending: values out of order: ${ascValues.slice(0, 5).join(', ')}`,
        ).toBe(true);
      }
    }
  }
}

/**
 * Navigates to page 2, sorts by first sortable column, and verifies the page does NOT
 * jump back to page 1. Skips gracefully if screen has only one page.
 */
export async function verifySortPaginationCompatibility(
  table: TableComponent,
  paginator: PaginatorComponent,
): Promise<void> {
  const onLastPage = await paginator.isLastPage();
  if (onLastPage) return; // single-page dataset — nothing to test

  await paginator.clickNextPage();
  const pageBefore = (await paginator.getActivePageNumber()).trim();

  const columns = await table.getSortableColumnNames();
  if (columns.length === 0) {
    await paginator.clickFirstPage();
    return;
  }

  await table.sortByColumn(columns[0]);
  const pageAfter = (await paginator.getActivePageNumber()).trim();
  expect(pageAfter, `Sort navigated away from page ${pageBefore} to page ${pageAfter}`).toBe(pageBefore);

  await paginator.clickFirstPage();
}

// ─── Export helpers ───────────────────────────────────────────────────────────

/**
 * Downloads the PDF export and verifies the extracted text length is proportional
 * to the total record count reported by the paginator (i.e. all records exported).
 */
export async function verifyExportPdfAllRecords(
  exportComp: ExportComponent,
  paginator: PaginatorComponent,
): Promise<void> {
  const totalRecords = await paginator.getTotalRecords();
  const pdfText = await exportComp.downloadPdfAndGetText();
  expect(pdfText.length, 'PDF text should be non-empty').toBeGreaterThan(0);
  const minLength = Math.max(totalRecords * 20, 50);
  expect(
    pdfText.length,
    `PDF text (${pdfText.length} chars) too short for ${totalRecords} records (min ${minLength})`,
  ).toBeGreaterThanOrEqual(minLength);
}

/**
 * Downloads the Excel export and verifies the data row count matches the total
 * record count reported by the paginator (i.e. all records exported).
 */
export async function verifyExportExcelAllRecords(
  exportComp: ExportComponent,
  paginator: PaginatorComponent,
): Promise<void> {
  const totalRecords = await paginator.getTotalRecords();
  const rowCount = await exportComp.downloadExcelAndGetRowCount();
  expect(
    rowCount,
    `Excel has ${rowCount} data rows but expected ≥ ${totalRecords}`,
  ).toBeGreaterThanOrEqual(totalRecords);
}

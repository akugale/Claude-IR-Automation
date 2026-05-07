import { expect } from '@playwright/test';
import { ExportComponent } from '../../components/ExportComponent';
import { PaginatorComponent } from '../../components/PaginatorComponent';
import { TableComponent } from '../../components/TableComponent';

function isNonDecreasing(values: string[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (
      values[i - 1].localeCompare(values[i], undefined, { numeric: true, sensitivity: 'base' }) > 0
    )
      return false;
  }
  return true;
}

function isNonIncreasing(values: string[]): boolean {
  for (let i = 1; i < values.length; i++) {
    if (
      values[i - 1].localeCompare(values[i], undefined, { numeric: true, sensitivity: 'base' }) < 0
    )
      return false;
  }
  return true;
}

export async function verifySortDataOrder(table: TableComponent): Promise<void> {
  const columns = await table.getSortableColumnNames();
  if (columns.length === 0) return;
  const col = columns[0];

  await table.sortByColumn(col);
  const ascending = await table.getVisibleColumnValues(col);
  if (ascending.length > 1) {
    expect(
      isNonDecreasing(ascending),
      `Column "${col}" ascending sort failed: [${ascending.slice(0, 5).join(', ')}...]`,
    ).toBe(true);
  }

  await table.sortByColumn(col);
  const descending = await table.getVisibleColumnValues(col);
  if (descending.length > 1) {
    expect(
      isNonIncreasing(descending),
      `Column "${col}" descending sort failed: [${descending.slice(0, 5).join(', ')}...]`,
    ).toBe(true);
  }
}

export async function verifySortPaginationCompatibility(
  table: TableComponent,
  paginator: PaginatorComponent,
): Promise<void> {
  const onLastPage = await paginator.isLastPage();
  if (onLastPage) return;

  await paginator.clickNextPage();
  const pageBefore = (await paginator.getActivePageNumber()).trim();

  const columns = await table.getSortableColumnNames();
  if (columns.length === 0) {
    await paginator.clickFirstPage();
    return;
  }

  await table.sortByColumn(columns[0]);
  const pageAfter = (await paginator.getActivePageNumber()).trim();
  expect(pageAfter, `Sort navigated away from page ${pageBefore} to ${pageAfter}`).toBe(pageBefore);
  await paginator.clickFirstPage();
}

export async function verifyExportPdfAllRecords(
  exportComp: ExportComponent,
  paginator: PaginatorComponent,
): Promise<void> {
  const totalRecords = await paginator.getTotalRecords();
  const text = await exportComp.downloadPdfAndGetText();
  expect(
    text.length,
    `PDF text too short (${text.length} chars) to contain ${totalRecords} records`,
  ).toBeGreaterThanOrEqual(Math.max(totalRecords * 20, 50));
}

export async function verifyExportExcelAllRecords(
  exportComp: ExportComponent,
  paginator: PaginatorComponent,
): Promise<void> {
  const totalRecords = await paginator.getTotalRecords();
  const rowCount = await exportComp.downloadExcelAndGetRowCount();
  expect(
    rowCount,
    `Excel has ${rowCount} data rows but expected at least ${totalRecords}`,
  ).toBeGreaterThanOrEqual(totalRecords);
}

import { expect, Page } from '@playwright/test';

export class ExportComponent {
  constructor(private readonly page: Page) {}

  async triggerPdf(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page.locator('button.export-pdf').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  }

  async triggerExcel(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page.locator('button.export-excel').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  }

  async downloadAndVerifyPdf(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page.locator('button.export-pdf').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import('fs');
    const stats = await fs.promises.stat(path!);
    expect(stats.size).toBeGreaterThan(1024);
  }

  async downloadAndVerifyExcel(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page.locator('button.export-excel').click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import('fs');
    const stats = await fs.promises.stat(path!);
    expect(stats.size).toBeGreaterThan(1024);
  }

  // Returns the number of data rows in the first sheet of the downloaded Excel file
  async downloadExcelAndGetRowCount(): Promise<number> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page.locator('button.export-excel').click();
    const download = await downloadPromise;
    const filePath = await download.path();
    expect(filePath, 'Excel download path should exist').toBeTruthy();
    const XLSXModule = await import('xlsx');
    // Handle both ESM default export and CommonJS direct export
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const XLSX = (XLSXModule as any).default ?? XLSXModule;
    const workbook = XLSX.readFile(filePath!);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    // Subtract 1 for the header row
    return Math.max(0, rows.filter(r => (r as unknown[]).some(c => c !== null && c !== undefined && c !== '')).length - 1);
  }

  // Returns extracted text from the downloaded PDF file
  async downloadPdfAndGetText(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 15000 });
    await this.page.locator('button.export-pdf').click();
    const download = await downloadPromise;
    const filePath = await download.path();
    expect(filePath, 'PDF download path should exist').toBeTruthy();
    // pdf-parse v2: pass file:// URL so pdfjs-dist can load it directly
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const fileUrl = `file://${filePath!.replace(/\\/g, '/')}`;
    const parser = new PDFParse({ url: fileUrl });
    const result = await parser.getText();
    return (result.text ?? result.pages?.map((p: { text: string }) => p.text).join('\n') ?? '') as string;
  }
}

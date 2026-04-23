import { expect, Page } from '@playwright/test';

export class ExportComponent {
  constructor(private readonly page: Page) {}

  async triggerPdf(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator('button.export-pdf').click();
    await expect(this.page.getByText('PDF export initiated')).toBeVisible();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  }

  async triggerExcel(): Promise<void> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.locator('button.export-excel').click();
    await expect(this.page.getByText('Excel export initiated')).toBeVisible();
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
}

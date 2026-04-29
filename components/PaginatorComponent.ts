import { expect, Page } from '@playwright/test';

export class PaginatorComponent {
  constructor(private readonly page: Page) {}

  // ─── Items per page ──────────────────────────────────────────────────────────

  async getItemsPerPageValue(): Promise<string> {
    return this.page.locator('p-select.p-paginator-rpp-dropdown .p-select-label').innerText();
  }

  async getItemsPerPageOptions(): Promise<string[]> {
    await this.page.locator('p-select.p-paginator-rpp-dropdown .p-select-dropdown').click();
    const options = this.page.locator('[role="listbox"] [role="option"]');
    await options.first().waitFor();
    const values = await options.allInnerTexts();
    await this.page.keyboard.press('Escape');
    return values.map(v => v.trim());
  }

  async changeItemsPerPage(size: number): Promise<void> {
    await this.page.locator('p-select.p-paginator-rpp-dropdown .p-select-dropdown').click();
    await this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^${size}$`) })
      .click();
  }

  // ─── Page info ───────────────────────────────────────────────────────────────

  async getInfoText(): Promise<string> {
    return this.page.locator('.p-paginator-current').innerText();
  }

  async getTotalRecords(): Promise<number> {
    const text = await this.getInfoText();
    const match = text.match(/of\s+([\d,]+)/i);
    if (!match) return 0;
    return parseInt(match[1].replace(/,/g, ''), 10);
  }

  async getActivePageNumber(): Promise<string> {
    return this.page.locator('.p-paginator-page-selected').innerText();
  }

  // ─── Page navigation ─────────────────────────────────────────────────────────

  async clickPageNumber(pageNum: number): Promise<void> {
    const btn = this.page.locator(`button[aria-label="${pageNum}"].p-paginator-page`);
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }

  async clickFirstPage(): Promise<void> {
    await this.page.locator('button[aria-label="First Page"]').click();
  }

  async clickLastPage(): Promise<void> {
    await this.page.locator('button[aria-label="Last Page"]').click();
  }

  async clickNextPage(): Promise<void> {
    await this.page.locator('button[aria-label="Next Page"]').click();
  }

  async clickPreviousPage(): Promise<void> {
    await this.page.locator('button[aria-label="Previous Page"]').click();
  }

  async isLastPage(): Promise<boolean> {
    const cls = await this.page.locator('button[aria-label="Next Page"]').getAttribute('class') ?? '';
    return cls.includes('p-disabled');
  }

  // ─── Disabled state assertions ───────────────────────────────────────────────

  async verifyFirstPageDisabled(): Promise<void> {
    await expect(this.page.locator('button[aria-label="First Page"]')).toHaveClass(/p-disabled/);
  }

  async verifyLastPageDisabled(): Promise<void> {
    await expect(this.page.locator('button[aria-label="Last Page"]')).toHaveClass(/p-disabled/);
  }

  async verifyPreviousPageDisabled(): Promise<void> {
    await expect(this.page.locator('button[aria-label="Previous Page"]')).toHaveClass(/p-disabled/);
  }

  async verifyNextPageDisabled(): Promise<void> {
    await expect(this.page.locator('button[aria-label="Next Page"]')).toHaveClass(/p-disabled/);
  }
}

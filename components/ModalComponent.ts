import { expect, Locator, Page } from '@playwright/test';

export class ModalComponent {
  private readonly modal: Locator;

  constructor(private readonly page: Page, modalSelector: string) {
    this.modal = this.page.locator(`${modalSelector}:visible`).first();
  }

  async waitForOpen(): Promise<void> {
    await expect(this.modal).toBeVisible();
  }

  async fillInputByLabel(label: string, value: string): Promise<void> {
    const input = this.modal.getByLabel(label, { exact: false });
    await input.waitFor({ state: 'visible' });
    await input.fill(value);
  }

  async submit(submitButtonName = 'Submit'): Promise<void> {
    const submitButton = this.modal.getByRole('button', { name: submitButtonName });
    await submitButton.waitFor({ state: 'visible' });
    await submitButton.click();
    await expect(this.modal).toBeHidden();
  }

  async close(closeButtonName = 'Close'): Promise<void> {
    const closeButton = this.modal.getByRole('button', { name: closeButtonName });
    await closeButton.waitFor({ state: 'visible' });
    await closeButton.click();
    await expect(this.modal).toBeHidden();
  }
}

import { expect, Page } from '@playwright/test';

export class LoginPage {
  private readonly usernameInput;
  private readonly passwordInput;
  private readonly signInButton;

  constructor(private readonly page: Page) {
    this.usernameInput = this.page.getByLabel(/login|username/i, { exact: false });
    this.passwordInput = this.page.getByRole('textbox', { name: /password/i });
    this.signInButton = this.page.getByRole('button', { name: /^login$|sign in/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('login');
    await expect(this.usernameInput).toBeVisible();
  }

  async loginAs(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await expect(this.signInButton).toBeEnabled();
    await this.signInButton.click();
    await expect(this.page).not.toHaveURL(/login/i);
  }
}

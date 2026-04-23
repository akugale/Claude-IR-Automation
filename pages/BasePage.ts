import { Page } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { users } from '../fixtures/testData';

export class BasePage {
  constructor(protected readonly page: Page) {}

  protected async ensureLoggedIn(): Promise<void> {
    const url = this.page.url();
    if (url.includes('login') || url === 'about:blank' || url === '') {
      const loginPage = new LoginPage(this.page);
      await loginPage.goto();
      await loginPage.loginAs(users.maker.username, users.maker.password);
    }
  }
}

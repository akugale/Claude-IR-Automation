import { test } from '@playwright/test';
import { users } from '../fixtures/testData';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login', () => {
  test('maker user can sign in successfully', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);
  });
});

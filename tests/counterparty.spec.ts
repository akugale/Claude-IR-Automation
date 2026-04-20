import { test } from '@playwright/test';
import { counterpartyTypeData, users } from '../fixtures/testData';
import { CounterpartyTypePage } from '../pages/CounterpartyTypePage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Counterparty Type CRUD', () => {
  test('maker clicks plus icon, adds code and description in popup', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const counterpartyTypePage = new CounterpartyTypePage(page);

    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);

    await counterpartyTypePage.goto();
    await counterpartyTypePage.addCounterpartyType(
      counterpartyTypeData.code,
      counterpartyTypeData.description
    );

    await counterpartyTypePage.verifyRecordExists(
      counterpartyTypeData.code,
      counterpartyTypeData.description
    );
  });
});
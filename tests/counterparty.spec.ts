import { test } from '@playwright/test';
import {
  counterpartyTypeData,
  counterpartyTypeDeleteData,
  counterpartyTypeEditData,
  users,
} from '../fixtures/testData';
import { CounterpartyTypePage } from '../pages/CounterpartyTypePage';
import { LoginPage } from '../pages/LoginPage';

test.describe('Counterparty Type CRUD', () => {
  test('maker adds a new counterparty type', async ({ page }) => {
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

  test('maker edits description of a counterparty type', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const counterpartyTypePage = new CounterpartyTypePage(page);

    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);

    await counterpartyTypePage.goto();
    await counterpartyTypePage.addCounterpartyType(
      counterpartyTypeEditData.code,
      counterpartyTypeEditData.description
    );

    await counterpartyTypePage.editCounterpartyType(
      counterpartyTypeEditData.code,
      counterpartyTypeEditData.updatedDescription
    );

    await counterpartyTypePage.verifyRecordExists(
      counterpartyTypeEditData.code,
      counterpartyTypeEditData.updatedDescription
    );
  });

  test('maker deletes a counterparty type', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const counterpartyTypePage = new CounterpartyTypePage(page);

    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);

    await counterpartyTypePage.goto();
    await counterpartyTypePage.addCounterpartyType(
      counterpartyTypeDeleteData.code,
      counterpartyTypeDeleteData.description
    );

    await counterpartyTypePage.deleteCounterpartyType(counterpartyTypeDeleteData.code);

    await counterpartyTypePage.verifyRecordNotExists(counterpartyTypeDeleteData.code);
  });

  test('maker views a counterparty type in read-only mode', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const counterpartyTypePage = new CounterpartyTypePage(page);

    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);

    await counterpartyTypePage.goto();
    await counterpartyTypePage.openViewModal('BFSI');
    await counterpartyTypePage.verifyViewModalIsReadOnly();
    await counterpartyTypePage.closeOpenModal();
  });

  test('add button is disabled when required fields are empty', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const counterpartyTypePage = new CounterpartyTypePage(page);

    await loginPage.goto();
    await loginPage.loginAs(users.maker.username, users.maker.password);

    await counterpartyTypePage.goto();
    await counterpartyTypePage.openAddModal();

    // both empty → disabled
    await counterpartyTypePage.verifyAddButtonDisabled();

    // only code filled → still disabled
    await page.getByPlaceholder('Enter code').fill('TESTONLY');
    await counterpartyTypePage.verifyAddButtonDisabled();

    // both filled → enabled
    await page.getByPlaceholder('Enter description').fill('Test Description');
    await counterpartyTypePage.verifyAddButtonEnabled();

    await counterpartyTypePage.closeOpenModal();
  });
});

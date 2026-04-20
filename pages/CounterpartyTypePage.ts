import { expect, Locator, Page } from '@playwright/test';
import { TableComponent } from '../components/TableComponent';

export class CounterpartyTypePage {
  private readonly newCounterpartyModal;
  private readonly codeInput;
  private readonly descriptionInput;
  private readonly addInModalButton;
  private readonly table;
  private readonly mainNavigation;

  constructor(private readonly page: Page) {
    this.newCounterpartyModal = this.page.locator('div:has-text("New Counterparty Type")').filter({ has: this.page.getByPlaceholder('Enter code') }).first();
    this.codeInput = this.page.getByPlaceholder('Enter code').first();
    this.descriptionInput = this.page.getByPlaceholder('Enter description').first();
    this.addInModalButton = this.page.getByRole('button', { name: /^add$/i }).last();
    this.table = new TableComponent(
      this.page,
      'table',
      'input[placeholder*="Search"], input[type="search"]'
    );
    this.mainNavigation = this.page.getByRole('navigation', { name: /main navigation/i });
  }

  async goto(): Promise<void> {
    await this.clickNavNode('Reference Data');
    await this.clickNavNode('Counterparty Setup');
    await this.clickNavNode('Counterparty Type');
    await expect(this.page.getByRole('heading', { name: /counterparty type/i })).toBeVisible();
    await this.getAddIconButton();
  }

  async addCounterpartyType(code: string, description: string): Promise<void> {
    const addIconButton = await this.getAddIconButton();
    await addIconButton.click();
    await expect(this.newCounterpartyModal).toBeVisible();
    await this.codeInput.fill(code);
    await this.descriptionInput.fill(description);
    await this.addInModalButton.click();
    await expect(this.newCounterpartyModal).toBeHidden();
  }

  async verifyRecordExists(code: string, description: string): Promise<void> {
    await this.table.search(code);
    await this.table.verifyRowExistsByValues([code, description]);
  }

  private async clickNavNode(label: string): Promise<void> {
    const byButton = this.mainNavigation.getByRole('button', { name: new RegExp(label, 'i') }).first();
    if (await byButton.isVisible().catch(() => false)) {
      await byButton.click();
      return;
    }

    const byMenuItem = this.mainNavigation.getByRole('menuitem', { name: new RegExp(label, 'i') }).first();
    if (await byMenuItem.isVisible().catch(() => false)) {
      await byMenuItem.click();
      return;
    }

    const byLink = this.mainNavigation.getByRole('link', { name: new RegExp(label, 'i') }).first();
    if (await byLink.isVisible().catch(() => false)) {
      await byLink.click();
      return;
    }

    await this.mainNavigation.getByText(new RegExp(label, 'i')).first().click();
  }

  private async getAddIconButton(): Promise<Locator> {
    const headingActionButtons = this.page
      .getByRole('heading', { name: /counterparty type/i })
      .locator('..')
      .getByRole('button');

    const headingAddIcon = headingActionButtons.last();
    if (await headingAddIcon.isVisible().catch(() => false) && await headingAddIcon.isEnabled().catch(() => false)) {
      return headingAddIcon;
    }

    const namedPlus = this.page.getByRole('button', { name: /^\+$/ }).first();
    if (await namedPlus.isVisible().catch(() => false) && await namedPlus.isEnabled().catch(() => false)) {
      return namedPlus;
    }

    const namedAdd = this.page.getByRole('button', { name: /add/i }).first();
    await expect(namedAdd).toBeVisible();
    await expect(namedAdd).toBeEnabled();
    return namedAdd;
  }
}

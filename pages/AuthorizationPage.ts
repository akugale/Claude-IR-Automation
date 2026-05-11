import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

// ─── Authorization Screen URL ─────────────────────────────────────────────────
// TODO(checker): update this route when the Authorization screen is deployed.
// Expected URL pattern based on app convention (e.g. './admin/authorization').
export const AUTH_SCREEN_ROUTE = './admin/authorization'; // ← update when known

// ─── Tab labels ───────────────────────────────────────────────────────────────
// TODO(checker): verify these match actual tab text in the Authorization screen.
export const AUTH_TAB_PENDING  = 'Pending';
export const AUTH_TAB_APPROVED = 'Approved';
export const AUTH_TAB_REJECTED = 'Rejected';

/**
 * AuthorizationPage — Checker-side POM for the Authorization screen.
 *
 * Flow:
 *   Maker submits any Add / Edit / Delete action
 *   → record enters "Pending Authorization" state
 *   → checker navigates here and Accepts or Rejects
 *   → on Accept  : record removed from this screen + change reflected in respective maker screen
 *   → on Reject  : record removed from this screen + respective screen unchanged
 *
 * All methods are TODO stubs until the screen is built.
 * Once the screen exists:
 *   1. Update AUTH_SCREEN_ROUTE with the real URL.
 *   2. Inspect DOM and implement each method below.
 *   3. Set CHECKER_ENABLED=true in env / CI.
 */
export class AuthorizationPage extends BasePage {

  constructor(private readonly page: Page) {
    super(page);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    await this.page.goto('./');
    await this.page.goto(AUTH_SCREEN_ROUTE);
    await this.page.waitForLoadState('domcontentloaded');
    // TODO(checker): wait for the pending-requests table to appear
    // await this.page.locator('table').waitFor({ state: 'visible', timeout: 15000 });
  }

  // ─── Tab navigation ───────────────────────────────────────────────────────────

  async goToPendingTab(): Promise<void> {
    // TODO(checker): click the "Pending" tab
    // await this.page.getByRole('tab', { name: new RegExp(AUTH_TAB_PENDING, 'i') }).click();
    throw new Error('TODO(checker): implement goToPendingTab()');
  }

  async goToApprovedTab(): Promise<void> {
    // TODO(checker): click the "Approved" tab
    // await this.page.getByRole('tab', { name: new RegExp(AUTH_TAB_APPROVED, 'i') }).click();
    throw new Error('TODO(checker): implement goToApprovedTab()');
  }

  async goToRejectedTab(): Promise<void> {
    // TODO(checker): click the "Rejected" tab
    // await this.page.getByRole('tab', { name: new RegExp(AUTH_TAB_REJECTED, 'i') }).click();
    throw new Error('TODO(checker): implement goToRejectedTab()');
  }

  // ─── Pending record assertions ────────────────────────────────────────────────

  /**
   * Asserts that a pending record with the given identifier is visible
   * in the authorization screen (Pending tab).
   * @param identifier  code / name / description — any unique text on the row
   */
  async verifyRecordVisible(identifier: string): Promise<void> {
    // TODO(checker): locate the row by identifier and assert visible
    // const row = this.page.locator('table tbody tr').filter({ hasText: identifier }).first();
    // await expect(row).toBeVisible({ timeout: 10000 });
    throw new Error(`TODO(checker): implement verifyRecordVisible("${identifier}")`);
  }

  /**
   * Asserts that a record is NO LONGER visible in the authorization screen
   * (used after Accept or Reject to confirm it was removed).
   */
  async verifyRecordNotVisible(identifier: string): Promise<void> {
    // TODO(checker): assert the row is gone
    // const rows = this.page.locator('table tbody tr').filter({ hasText: identifier });
    // await expect(rows).toHaveCount(0);
    throw new Error(`TODO(checker): implement verifyRecordNotVisible("${identifier}")`);
  }

  /**
   * Verifies the pending record shows the correct action type
   * (e.g. "Add", "Edit", "Delete") and any other details.
   */
  async verifyRecordDetails(identifier: string, expectedAction: 'Add' | 'Edit' | 'Delete'): Promise<void> {
    // TODO(checker): check the Action column value on the row
    // const row = this.page.locator('table tbody tr').filter({ hasText: identifier }).first();
    // await expect(row.locator('td').filter({ hasText: new RegExp(expectedAction, 'i') })).toBeVisible();
    throw new Error(`TODO(checker): implement verifyRecordDetails("${identifier}", "${expectedAction}")`);
  }

  // ─── Accept ───────────────────────────────────────────────────────────────────

  /**
   * Accepts (approves) the first pending record in the list.
   */
  async approveFirstPending(): Promise<void> {
    // TODO(checker): click the Accept / Approve button on the first pending row
    // const firstRow = this.page.locator('table tbody tr').first();
    // await firstRow.getByRole('button', { name: /accept|approve/i }).click();
    // await this.page.locator('p-toast .p-toast-message').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    throw new Error('TODO(checker): implement approveFirstPending()');
  }

  /**
   * Accepts (approves) the pending record matching the given identifier.
   */
  async approveRecord(identifier: string): Promise<void> {
    // TODO(checker): find row by identifier, click Accept / Approve
    // const row = this.page.locator('table tbody tr').filter({ hasText: identifier }).first();
    // await row.getByRole('button', { name: /accept|approve/i }).click();
    // await this.page.locator('p-toast .p-toast-message').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    throw new Error(`TODO(checker): implement approveRecord("${identifier}")`);
  }

  // ─── Reject ───────────────────────────────────────────────────────────────────

  /**
   * Rejects the first pending record in the list.
   */
  async rejectFirstPending(): Promise<void> {
    // TODO(checker): click the Reject button on the first pending row
    // May require a rejection reason input — handle if modal appears
    // const firstRow = this.page.locator('table tbody tr').first();
    // await firstRow.getByRole('button', { name: /reject/i }).click();
    // Handle rejection reason modal if present:
    // const reasonModal = this.page.locator('[role="dialog"]').filter({ hasText: /reason/i });
    // if (await reasonModal.isVisible({ timeout: 2000 }).catch(() => false)) {
    //   await reasonModal.locator('textarea, input[type="text"]').first().fill('Rejected in automation test');
    //   await reasonModal.getByRole('button', { name: /confirm|submit|ok/i }).click();
    // }
    throw new Error('TODO(checker): implement rejectFirstPending()');
  }

  /**
   * Rejects the pending record matching the given identifier.
   */
  async rejectRecord(identifier: string): Promise<void> {
    // TODO(checker): find row by identifier, click Reject
    throw new Error(`TODO(checker): implement rejectRecord("${identifier}")`);
  }

  // ─── Toast assertions ─────────────────────────────────────────────────────────

  async verifyApprovalToast(): Promise<void> {
    // TODO(checker): assert success toast after approval
    // const toast = this.page.locator('p-toast .p-toast-message').first();
    // await expect(toast).toBeVisible({ timeout: 8000 });
    // await expect(toast).toContainText(/approved|success/i);
    throw new Error('TODO(checker): implement verifyApprovalToast()');
  }

  async verifyRejectionToast(): Promise<void> {
    // TODO(checker): assert toast after rejection
    throw new Error('TODO(checker): implement verifyRejectionToast()');
  }
}

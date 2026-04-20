import { Locator, expect } from '@playwright/test';

export async function waitForUiReady(spinner: Locator): Promise<void> {
  await expect(spinner).toBeHidden({ timeout: 15000 });
}

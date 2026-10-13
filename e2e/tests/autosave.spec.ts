import { expect, test, type Page, type Route } from '@playwright/test';
import {
  createDocApi,
  editorBody,
  expectSaved,
  focusEnd,
  openDoc,
  saveStatus,
  signIn,
  typeAndSave,
  uniqueTitle,
} from '../helpers';

// D4 (autosave + status), D8 (conflict guard), D9 (unsaved-change protection), offline retry.
const isPatch = (route: Route) => route.request().method() === 'PATCH';

/** The conflict UI: an alertdialog (or alert banner) with the conflict message. */
const conflictUi = (page: Page) =>
  page
    .getByRole('alertdialog')
    .or(page.getByRole('alert'))
    .filter({ hasText: 'This document changed elsewhere.' });

/** Holds every content PATCH until `release()` is called. */
async function holdSaves(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/api/documents/*', async (route) => {
    if (!isPatch(route)) return route.fallback();
    await gate;
    await route.fallback();
  });
  return release;
}

test.describe('autosave', () => {
  let docId: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page, 'alice');
    docId = await createDocApi(page, uniqueTitle('Autosave'));
    await openDoc(page, docId);
    await expectSaved(page);
  });

  test('status goes Unsaved changes → Saving… → Saved', async ({ page }) => {
    const release = await holdSaves(page);
    await focusEnd(page);
    await page.keyboard.type('Status check');
    await expect(saveStatus(page)).toHaveText('Unsaved changes');
    await expect(saveStatus(page)).toHaveText('Saving…', { timeout: 5_000 });
    release();
    await expectSaved(page);
    await page.reload();
    await expect(editorBody(page)).toHaveText('Status check');
  });

  test('save is debounced ~1s after typing stops and sends baseVersion', async ({ page }) => {
    let typedAt = 0;
    const patch = page.waitForRequest((r) => r.method() === 'PATCH' && r.url().includes(`/api/documents/${docId}`));
    await focusEnd(page);
    await page.keyboard.type('Debounced');
    typedAt = Date.now();
    const req = await patch;
    expect(Date.now() - typedAt).toBeGreaterThanOrEqual(700);
    const body = req.postDataJSON() as { baseVersion: number; content: { type: string } };
    expect(body.baseVersion).toBe(1);
    expect(body.content.type).toBe('doc');
    await expectSaved(page);
  });

  test('blurring the editor flushes the pending save', async ({ page }) => {
    await focusEnd(page);
    await page.keyboard.type('Flush on blur');
    const patch = page.waitForRequest((r) => r.method() === 'PATCH', { timeout: 900 });
    await page.getByRole('textbox', { name: 'Document title' }).focus();
    await patch;
    await expectSaved(page);
  });

  test('conflict: stale tab shows "This document changed elsewhere." → Reload latest shows the other edit', async ({ page, context }) => {
    const pageB = await context.newPage();
    await openDoc(pageB, docId);

    await typeAndSave(page, 'Edit from tab A.');

    await focusEnd(pageB);
    await pageB.keyboard.type('Edit from tab B.');
    const banner = conflictUi(pageB);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(saveStatus(pageB)).toHaveText('Conflict');
    await expect(banner.getByRole('button', { name: 'Overwrite' })).toBeVisible();

    await banner.getByRole('button', { name: 'Reload latest' }).click();
    await expect(banner).toBeHidden();
    await expect(editorBody(pageB)).toHaveText('Edit from tab A.');
    await expectSaved(pageB);

    // Tab B keeps working after resolving.
    await typeAndSave(pageB, ' Then B again.');
    await page.reload();
    await expect(editorBody(page)).toHaveText('Edit from tab A. Then B again.');
    await pageB.close();
  });

  test('conflict: Overwrite keeps tab B\'s text after reload', async ({ page, context }) => {
    const pageB = await context.newPage();
    await openDoc(pageB, docId);

    await typeAndSave(page, 'Edit from tab A.');

    await focusEnd(pageB);
    await pageB.keyboard.type('Edit from tab B.');
    const banner = conflictUi(pageB);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await banner.getByRole('button', { name: 'Overwrite' }).click();
    await expect(banner).toBeHidden();
    await expectSaved(pageB);

    await pageB.reload();
    await expect(editorBody(pageB)).toHaveText('Edit from tab B.');
    await page.reload();
    await expect(editorBody(page)).toHaveText('Edit from tab B.');
    await pageB.close();
  });

  test('offline: "Not saved — Retry", edits kept, saved after reconnect + Retry', async ({ page, context }) => {
    await context.setOffline(true);
    await focusEnd(page);
    await page.keyboard.type('Written offline.');
    await expect(saveStatus(page)).toHaveText(/Not saved\s*—\s*Retry/, { timeout: 10_000 });
    await expect(editorBody(page)).toHaveText('Written offline.');

    await context.setOffline(false);
    // Auto-retry may win the race; otherwise press Retry.
    await saveStatus(page)
      .getByRole('button', { name: 'Retry' })
      .click({ timeout: 2_000 })
      .catch(() => undefined);
    await expectSaved(page);
    await page.reload();
    await expect(editorBody(page)).toHaveText('Written offline.');
  });

  test('offline: after retries run out a modal offers Retry, which saves once back online', async ({ page, context }) => {
    test.setTimeout(90_000);
    await context.setOffline(true);
    await focusEnd(page);
    await page.keyboard.type('Long outage.');
    // Retries back off 1s, 3s, 10s before giving up.
    const modal = page.getByRole('alertdialog').filter({ has: page.getByRole('button', { name: 'Retry' }) });
    await expect(modal).toBeVisible({ timeout: 30_000 });
    await expect(saveStatus(page)).toHaveText(/Not saved/);

    await context.setOffline(false);
    await modal.getByRole('button', { name: 'Retry' }).click();
    await expectSaved(page);
    await page.reload();
    await expect(editorBody(page)).toHaveText('Long outage.');
  });

  test('beforeunload: closing the tab with unsaved changes asks for confirmation', async ({ page }) => {
    const release = await holdSaves(page);
    await focusEnd(page);
    await page.keyboard.type('Pending edit');
    await expect(saveStatus(page)).not.toHaveText('Saved');

    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.type());
      await d.dismiss();
    });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => dialogs).toContain('beforeunload');
    expect(page.isClosed()).toBe(false);
    release();
    await expectSaved(page);
  });

  test('no beforeunload prompt once everything is saved', async ({ page }) => {
    await typeAndSave(page, 'All saved.');
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.type());
      await d.accept();
    });
    await page.close({ runBeforeUnload: true });
    await expect.poll(() => page.isClosed()).toBe(true);
    expect(dialogs).not.toContain('beforeunload');
  });

  test('"Back to documents" with unsaved changes asks "Leave without saving?"', async ({ page }) => {
    const release = await holdSaves(page);
    await focusEnd(page);
    await page.keyboard.type('Not yet saved');
    await page.getByRole('link', { name: 'Back to documents' }).click();

    const modal = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/docs/${docId}`));
    await expect(editorBody(page)).toHaveText('Not yet saved');

    release();
    await expectSaved(page);
    await page.getByRole('link', { name: 'Back to documents' }).click();
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });

  test('rapid edits are all persisted (no lost typing across saves)', async ({ page }) => {
    await focusEnd(page);
    for (const word of ['one ', 'two ', 'three ', 'four']) {
      await page.keyboard.type(word);
      await page.waitForTimeout(400);
    }
    await expectSaved(page);
    await page.reload();
    await expect(editorBody(page)).toHaveText('one two three four');
  });
});

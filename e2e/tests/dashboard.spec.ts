import { expect, test } from '@playwright/test';
import {
  alertDialog,
  createDocApi,
  deleteFromDashboard,
  EDITOR_LOAD_MS,
  docRow,
  NOT_FOUND_TEXT,
  openDoc,
  pageFor,
  section,
  shareApi,
  signIn,
  typeAndSave,
  uniqueTitle,
  USERS,
} from '../helpers';

// D6 (lists), D7 (delete), S5 (badges) and seeded-state checks.
test.describe('dashboard', () => {
  test('Alice: seeded docs are in My documents with Owner badges', async ({ page }) => {
    await signIn(page, 'alice');
    for (const title of ['Q4 Planning Notes', 'Private Draft']) {
      const row = docRow(page, 'My documents', title);
      await expect(row).toBeVisible();
      await expect(row.getByText('Owner', { exact: true })).toBeVisible();
      await expect(row.getByText(/^Edited /)).toBeVisible();
      await expect(row.getByRole('button', { name: `Delete ${title}` })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: "Bob's Ideas", exact: true })).toHaveCount(0);
  });

  test('Bob: owns "Bob\'s Ideas" and has "Q4 Planning Notes" shared by Alice', async ({ page }) => {
    await signIn(page, 'bob');
    await expect(docRow(page, 'My documents', "Bob's Ideas").getByText('Owner', { exact: true })).toBeVisible();
    const shared = docRow(page, 'Shared with me', 'Q4 Planning Notes');
    await expect(shared.getByText('Shared by Alice')).toBeVisible();
    await expect(shared.getByRole('button', { name: /^Delete / })).toHaveCount(0);
    await expect(docRow(page, 'My documents', 'Q4 Planning Notes')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Private Draft', exact: true })).toHaveCount(0);
  });

  test('Carol: empty states for both sections', async ({ page }) => {
    await signIn(page, 'carol');
    await expect(section(page, 'Shared with me').getByText('Nothing shared with you yet')).toBeVisible();
    await expect(section(page, 'My documents').getByText('No documents yet — create one or import a file')).toBeVisible();
  });

  test('My documents is sorted by last edited', async ({ page }) => {
    await signIn(page, 'alice');
    const older = uniqueTitle('Older');
    const newer = uniqueTitle('Newer');
    const olderId = await createDocApi(page, older);
    await createDocApi(page, newer);
    await page.reload();
    const links = section(page, 'My documents').getByRole('link');
    await expect(links.nth(0)).toHaveAccessibleName(newer);
    await expect(links.nth(1)).toHaveAccessibleName(older);

    await openDoc(page, olderId);
    await typeAndSave(page, 'Bump to top.');
    await page.getByRole('link', { name: 'Back to documents' }).click();
    await expect(section(page, 'My documents').getByRole('link').first()).toHaveAccessibleName(older);
  });

  test('clicking a row opens the editor; Back to documents returns', async ({ page }) => {
    await signIn(page, 'alice');
    await page.getByRole('link', { name: 'Private Draft', exact: true }).click();
    await expect(page).toHaveURL(/\/docs\/[0-9a-f-]{36}/);
    await expect(page.getByRole('textbox', { name: 'Document body' })).toBeVisible({ timeout: EDITOR_LOAD_MS });
    await expect(page.getByRole('textbox', { name: 'Document title' })).toHaveValue('Private Draft');
    await page.getByRole('link', { name: 'Back to documents' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('delete: confirm dialog → Document deleted → row gone, URL Not found', async ({ page }) => {
    await signIn(page, 'alice');
    const title = uniqueTitle('Delete me');
    const id = await createDocApi(page, title);
    await page.reload();
    await deleteFromDashboard(page, title);
    await expect(docRow(page, 'My documents', title)).toHaveCount(0);
    await page.reload();
    await expect(docRow(page, 'My documents', title)).toHaveCount(0);
    await page.goto(`/docs/${id}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  });

  test('delete: Cancel keeps the doc', async ({ page }) => {
    await signIn(page, 'alice');
    const title = uniqueTitle('Keep me');
    await createDocApi(page, title);
    await page.reload();
    await docRow(page, 'My documents', title).getByRole('button', { name: `Delete ${title}` }).click();
    const confirm = alertDialog(page, 'Delete document?');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toBeHidden();
    await page.reload();
    await expect(docRow(page, 'My documents', title)).toBeVisible();
  });

  test('a shared doc that the owner deletes disappears from the grantee\'s list', async ({ page, browser }) => {
    await signIn(page, 'alice');
    const title = uniqueTitle('Shared then deleted');
    const id = await createDocApi(page, title);
    await shareApi(page, id, USERS.bob.email);

    const bob = await pageFor(browser, 'bob');
    await expect(docRow(bob.page, 'Shared with me', title)).toBeVisible();

    await page.reload();
    await deleteFromDashboard(page, title);

    await bob.page.reload();
    await expect(bob.page.getByRole('heading', { name: /^Shared with me/ })).toBeVisible();
    await expect(bob.page.getByLabel(/^Loading (My documents|Shared with me)/)).toHaveCount(0);
    await expect(docRow(bob.page, 'Shared with me', title)).toHaveCount(0);
    await bob.page.goto(`/docs/${id}`);
    await expect(bob.page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    await bob.context.close();
  });
});

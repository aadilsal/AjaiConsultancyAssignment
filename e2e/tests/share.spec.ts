import { expect, test } from '@playwright/test';
import {
  apiHeaders,
  createDocApi,
  dismissModal,
  docRow,
  editorBody,
  expectSaved,
  NOT_FOUND_TEXT,
  openDoc,
  openShareDialog,
  pageFor,
  renameDoc,
  saveStatus,
  section,
  shareApi,
  shareDialog,
  shareViaDialog,
  shareWith,
  signIn,
  titleBox,
  toolbar,
  typeAndSave,
  uniqueTitle,
  USERS,
} from '../helpers';

// Flows 3 (Share), 4 (Receive), 6 (Revoke) + S1–S3, S5, S6.
test.describe('share', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'alice');
  });

  test('Flow 3: owner shares with bob@ajaia.test and Bob appears in the access list', async ({ page }) => {
    const id = await createDocApi(page, uniqueTitle('Launch plan'));
    await openDoc(page, id);
    const dialog = await openShareDialog(page);
    await expect(dialog.getByText(USERS.alice.email)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Remove Bob' })).toHaveCount(0);

    await shareWith(page, 'bob');
    await expect(dialog.getByText(USERS.bob.email)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Remove Bob' })).toBeVisible();
    await expect(dialog.getByRole('listitem').filter({ hasText: USERS.bob.email })).toContainText('Editor');
    await expect(dialog.getByRole('textbox', { name: 'Email' })).toHaveValue('');

    // Survives closing and reopening the dialog (loaded from the server).
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    const reopened = await openShareDialog(page);
    await expect(reopened.getByRole('button', { name: 'Remove Bob' })).toBeVisible();
  });

  test('share validation: unknown email, own email and duplicate share show inline errors', async ({ page }) => {
    const id = await createDocApi(page, uniqueTitle('Validation'));
    await shareApi(page, id, USERS.bob.email);
    await openDoc(page, id);
    const dialog = await openShareDialog(page);
    const error = dialog.getByRole('alert');

    await shareViaDialog(page, 'nobody@ajaia.test');
    await expect(error).toHaveText('No user with that email');

    await shareViaDialog(page, USERS.alice.email);
    await expect(error).toHaveText('You already own this document');

    await shareViaDialog(page, USERS.bob.email);
    await expect(error).toHaveText(/^Already shared with Bob/);

    // Typing a valid address clears the error.
    await dialog.getByRole('textbox', { name: 'Email' }).fill(USERS.carol.email);
    await expect(error).toHaveCount(0);

    // Malformed email: live client-side error, Share stays disabled.
    await shareViaDialog(page, 'not-an-email');
    await expect(error).toHaveText('Enter a valid email address');
    await expect(dialog.getByRole('button', { name: 'Share', exact: true })).toBeDisabled();
  });

  test('Share button is visible to the owner only', async ({ page, browser }) => {
    const title = uniqueTitle('Owner only');
    const id = await createDocApi(page, title);
    await shareApi(page, id, USERS.bob.email);
    await openDoc(page, id);
    await expect(page.getByRole('banner').getByRole('button', { name: 'Share', exact: true })).toBeVisible();

    const bob = await pageFor(browser, 'bob');
    await openDoc(bob.page, id);
    await expect(bob.page.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
    await bob.context.close();
  });

  test('Flow 4: Bob sees the doc under Shared with me, edits it, and Alice sees the change', async ({ page, browser }) => {
    const title = uniqueTitle('Launch plan');
    const id = await createDocApi(page, title);
    await openDoc(page, id);
    await typeAndSave(page, 'Alice wrote this.');
    await openShareDialog(page);
    await shareWith(page, 'bob');

    const bob = await pageFor(browser, 'bob');
    const row = docRow(bob.page, 'Shared with me', title);
    await expect(row).toBeVisible();
    await expect(row.getByText('Shared by Alice')).toBeVisible();
    await expect(row.getByRole('button', { name: `Delete ${title}` })).toHaveCount(0);
    await expect(docRow(bob.page, 'My documents', title)).toHaveCount(0);

    await row.getByRole('link', { name: title, exact: true }).click();
    await expect(editorBody(bob.page)).toContainText('Alice wrote this.');
    await expect(bob.page.getByRole('banner').getByText('Shared by Alice')).toBeVisible();
    await expect(toolbar(bob.page)).toBeVisible();
    await typeAndSave(bob.page, ' Bob added this.');
    await bob.context.close();

    await page.goto('/');
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(editorBody(page)).toContainText('Alice wrote this. Bob added this.');
  });

  test('editor (Bob) can rename a shared doc', async ({ page, browser }) => {
    const id = await createDocApi(page, uniqueTitle('Bob renames'));
    await shareApi(page, id, USERS.bob.email);
    const newTitle = uniqueTitle('Renamed by Bob');

    const bob = await pageFor(browser, 'bob');
    await openDoc(bob.page, id);
    await renameDoc(bob.page, newTitle);
    await bob.context.close();

    await openDoc(page, id);
    await expect(titleBox(page)).toHaveValue(newTitle);
  });

  test('Flow 6: Alice removes Bob → doc leaves his list and the URL shows Not found', async ({ page, browser }) => {
    const title = uniqueTitle('Revoke');
    const id = await createDocApi(page, title);
    await shareApi(page, id, USERS.bob.email);

    const bob = await pageFor(browser, 'bob');
    await expect(docRow(bob.page, 'Shared with me', title)).toBeVisible();

    await openDoc(page, id);
    const dialog = await openShareDialog(page);
    await dialog.getByRole('button', { name: 'Remove Bob' }).click();
    await dismissModal(page, 'Removed Bob');
    await expect(dialog.getByRole('button', { name: 'Remove Bob' })).toHaveCount(0);
    await expect(dialog.getByText(USERS.bob.email)).toHaveCount(0);

    await bob.page.reload();
    await expect(section(bob.page, 'Shared with me')).toBeVisible();
    await expect(bob.page.getByRole('heading', { name: /^Shared with me/ })).toBeVisible();
    await expect(docRow(bob.page, 'Shared with me', title)).toHaveCount(0);

    await bob.page.goto(`/docs/${id}`);
    await expect(bob.page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    expect((await bob.page.request.get(`/api/documents/${id}`)).status()).toBe(404);
    await bob.context.close();
  });

  test('viewer role: "View only" badge, no toolbar, read-only editor and title, API PATCH 403', async ({ page, browser }) => {
    const title = uniqueTitle('Viewer');
    const id = await createDocApi(page, title);
    await openDoc(page, id);
    await typeAndSave(page, 'Read me only.');
    await openShareDialog(page);
    await shareWith(page, 'bob', 'Viewer');
    await expect(shareDialog(page).getByRole('listitem').filter({ hasText: USERS.bob.email })).toContainText('Viewer');

    const bob = await pageFor(browser, 'bob');
    const row = docRow(bob.page, 'Shared with me', title);
    await expect(row.getByText('Shared by Alice')).toBeVisible();
    await expect(row.getByText('View only')).toBeVisible();

    await openDoc(bob.page, id);
    await expect(bob.page.getByRole('banner').getByText('View only')).toBeVisible();
    await expect(toolbar(bob.page)).toHaveCount(0);
    await expect(saveStatus(bob.page)).toHaveCount(0);
    const body = editorBody(bob.page);
    await expect(body).toHaveAttribute('contenteditable', 'false');
    await expect(titleBox(bob.page)).not.toBeEditable();

    await body.click();
    await bob.page.keyboard.type('viewer typing');
    await expect(body).toHaveText('Read me only.');

    const patch = await bob.page.request.patch(`/api/documents/${id}`, {
      headers: apiHeaders,
      data: { title: 'hijack' },
    });
    expect(patch.status()).toBe(403);
    await bob.context.close();
  });

  test('changing a viewer to editor by re-sharing is rejected as a duplicate', async ({ page }) => {
    const id = await createDocApi(page, uniqueTitle('Dup viewer'));
    await shareApi(page, id, USERS.bob.email, 'viewer');
    await openDoc(page, id);
    const dialog = await openShareDialog(page);
    await shareViaDialog(page, USERS.bob.email, 'Editor');
    await expect(dialog.getByRole('alert')).toHaveText(/^Already shared with Bob/);
  });

  test('seeded doc: Bob has "Q4 Planning Notes" shared by Alice and can open it', async ({ page }) => {
    await signIn(page, 'bob');
    const row = docRow(page, 'Shared with me', 'Q4 Planning Notes');
    await expect(row.getByText('Shared by Alice')).toBeVisible();
    await row.getByRole('link', { name: 'Q4 Planning Notes', exact: true }).click();
    await expect(editorBody(page)).toBeVisible();
    await expect(page.getByRole('banner').getByText('Shared by Alice')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share', exact: true })).toHaveCount(0);
    await expectSaved(page);
  });
});

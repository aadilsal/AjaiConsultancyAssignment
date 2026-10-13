import { expect, test } from '@playwright/test';
import {
  createDoc,
  createDocApi,
  dismissModalIfShown,
  docRow,
  editorBody,
  expectSaved,
  openDoc,
  renameDoc,
  saveStatus,
  section,
  signIn,
  titleBox,
  tool,
  typeAndSave,
  uniqueTitle,
} from '../helpers';

// Flow 1 (Write) + D1–D3, D5, D6: create, rename, format, autosave, reopen.
test.describe('write', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'alice');
  });

  test('Flow 1: new doc → rename → H2, bullets, bold → Saved → reload is identical', async ({ page }) => {
    const title = uniqueTitle('Launch plan');
    await page.getByRole('button', { name: 'New document' }).click();
    await page.waitForURL(/\/docs\/[0-9a-f-]{36}/);
    await expect(titleBox(page)).toHaveValue('Untitled document');
    await expect(page.getByRole('banner').getByText('Owner', { exact: true })).toBeVisible();

    await renameDoc(page, title);

    await editorBody(page).click();
    await tool(page, 'Heading 2').click();
    await expect(tool(page, 'Heading 2')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.type('Goals');
    await page.keyboard.press('Enter');
    await expect(tool(page, 'Heading 2')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.type('Ship the ');
    await tool(page, 'Bold').click();
    await page.keyboard.type('launch checklist');
    await tool(page, 'Bold').click();
    await page.keyboard.type(' this week.');
    await page.keyboard.press('Enter');
    await tool(page, 'Bullet list').click();
    await expect(tool(page, 'Bullet list')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.type('First item');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second item');

    await expect(saveStatus(page)).toHaveText(/Unsaved changes|Saving…/);
    await expectSaved(page);

    await page.reload();
    await expect(titleBox(page)).toHaveValue(title);
    const body = editorBody(page);
    await expect(body.locator('h2')).toHaveText('Goals');
    await expect(body.locator('strong')).toHaveText('launch checklist');
    await expect(body.locator('p').filter({ hasText: 'Ship the' })).toHaveText('Ship the launch checklist this week.');
    await expect(body.locator('ul > li')).toHaveText(['First item', 'Second item']);
    await expectSaved(page);

    // Dashboard: newest edit is first in "My documents" with an Owner badge.
    await page.getByRole('link', { name: 'Back to documents' }).click();
    await page.waitForURL((u) => u.pathname === '/');
    const firstRow = section(page, 'My documents').getByRole('listitem').first();
    await expect(firstRow.getByRole('link', { name: title, exact: true })).toBeVisible();
    await expect(docRow(page, 'My documents', title).getByText('Owner', { exact: true })).toBeVisible();
  });

  test('toolbar buttons reflect the current selection (aria-pressed)', async ({ page }) => {
    await createDoc(page);
    await editorBody(page).click();
    await page.keyboard.type('plain ');
    await page.keyboard.press('ControlOrMeta+B');
    await page.keyboard.type('bold');
    await page.keyboard.press('ControlOrMeta+B');
    await expect(tool(page, 'Bold')).toHaveAttribute('aria-pressed', 'false');

    // Caret inside the bold word → Bold is active.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(tool(page, 'Bold')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'Italic')).toHaveAttribute('aria-pressed', 'false');

    // Keyboard-select the plain word → Bold inactive.
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    await expect(tool(page, 'Bold')).toHaveAttribute('aria-pressed', 'false');

    // Bold the selection from the toolbar, then the button turns on.
    await tool(page, 'Bold').click();
    await expect(tool(page, 'Bold')).toHaveAttribute('aria-pressed', 'true');
    await expect(editorBody(page).locator('strong').first()).toHaveText('pl');

    // Heading / list state follows the block under the caret.
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await tool(page, 'Heading 1').click();
    await page.keyboard.type('Title');
    await expect(tool(page, 'Heading 1')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool(page, 'Heading 3')).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('ArrowUp');
    await expect(tool(page, 'Heading 1')).toHaveAttribute('aria-pressed', 'false');
  });

  test('keyboard shortcuts Ctrl+B / Ctrl+I / Ctrl+U apply marks that survive reload', async ({ page }) => {
    await createDoc(page, uniqueTitle('Shortcuts'));
    await editorBody(page).click();
    await page.keyboard.press('ControlOrMeta+B');
    await page.keyboard.type('boldtext');
    await page.keyboard.press('ControlOrMeta+B');
    await page.keyboard.type(' ');
    await page.keyboard.press('ControlOrMeta+I');
    await page.keyboard.type('italictext');
    await page.keyboard.press('ControlOrMeta+I');
    await page.keyboard.type(' ');
    await page.keyboard.press('ControlOrMeta+U');
    await page.keyboard.type('underlinetext');
    await page.keyboard.press('ControlOrMeta+U');
    await expectSaved(page);

    await page.reload();
    const body = editorBody(page);
    await expect(body.locator('strong')).toHaveText('boldtext');
    await expect(body.locator('em')).toHaveText('italictext');
    await expect(body.locator('u')).toHaveText('underlinetext');
  });

  test('H1, H3 and numbered list from the toolbar persist', async ({ page }) => {
    await createDoc(page, uniqueTitle('Blocks'));
    await editorBody(page).click();
    await tool(page, 'Heading 1').click();
    await page.keyboard.type('Big heading');
    await page.keyboard.press('Enter');
    await tool(page, 'Heading 3').click();
    await page.keyboard.type('Small heading');
    await page.keyboard.press('Enter');
    await tool(page, 'Numbered list').click();
    await expect(tool(page, 'Numbered list')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.type('Step one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Step two');
    await expectSaved(page);

    await page.reload();
    const body = editorBody(page);
    await expect(body.locator('h1')).toHaveText('Big heading');
    await expect(body.locator('h3')).toHaveText('Small heading');
    await expect(body.locator('ol > li')).toHaveText(['Step one', 'Step two']);
  });

  test('Undo and Redo buttons revert and re-apply an edit', async ({ page }) => {
    await createDoc(page);
    await expect(tool(page, 'Undo')).toBeDisabled();
    await expect(tool(page, 'Redo')).toBeDisabled();

    await typeAndSave(page, 'Keep this.');
    await page.keyboard.type(' Remove me.');
    await expect(editorBody(page)).toContainText('Remove me.');

    await tool(page, 'Undo').click();
    await expect(editorBody(page)).not.toContainText('Remove me.');
    await expect(editorBody(page)).toContainText('Keep this.');
    await expect(tool(page, 'Redo')).toBeEnabled();

    await tool(page, 'Redo').click();
    await expect(editorBody(page)).toContainText('Keep this. Remove me.');

    // Keyboard undo too.
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(editorBody(page)).not.toContainText('Remove me.');
    await expectSaved(page);
    await page.reload();
    await expect(editorBody(page)).toHaveText('Keep this.');
  });

  test('rename persists after reload and appears on the dashboard', async ({ page }) => {
    const title = uniqueTitle('Renamed');
    const id = await createDocApi(page, uniqueTitle('Before rename'));
    await openDoc(page, id);
    await renameDoc(page, title);
    await page.reload();
    await expect(titleBox(page)).toHaveValue(title);
    await page.goto('/');
    await expect(docRow(page, 'My documents', title)).toBeVisible();
  });

  test('empty title is rejected and reverts to the previous title', async ({ page }) => {
    const title = uniqueTitle('Keep title');
    const id = await createDocApi(page, title);
    await openDoc(page, id);
    const box = titleBox(page);
    await box.click();
    await box.fill('   ');
    await box.press('Enter');
    await expect(box).toHaveValue(title);
    // The rejection message may be inline, a toast or a modal.
    await expect(page.getByText("Title can't be empty")).toBeVisible();
    await dismissModalIfShown(page, /Title can.t be empty/, 'OK', 1_000);
    await page.reload();
    await expect(titleBox(page)).toHaveValue(title);
  });

  test('Escape while renaming cancels the edit', async ({ page }) => {
    const title = uniqueTitle('Escape');
    const id = await createDocApi(page, title);
    await openDoc(page, id);
    const box = titleBox(page);
    await box.click();
    await box.fill('Should not stick');
    await box.press('Escape');
    await expect(box).toHaveValue(title);
    await page.reload();
    await expect(titleBox(page)).toHaveValue(title);
  });

  test('title is capped at 200 characters', async ({ page }) => {
    const id = await createDocApi(page, uniqueTitle('Long'));
    await openDoc(page, id);
    const box = titleBox(page);
    await box.click();
    await box.fill('');
    await page.keyboard.type('x'.repeat(205));
    await expect(box).toHaveValue('x'.repeat(200));
  });

  test('content typed in an existing doc is still there after re-login', async ({ page }) => {
    const id = await createDocApi(page, uniqueTitle('Relogin'));
    await openDoc(page, id);
    await typeAndSave(page, 'Survives a new session.');
    await signIn(page, 'alice');
    await openDoc(page, id);
    await expect(editorBody(page)).toHaveText('Survives a new session.');
  });
});

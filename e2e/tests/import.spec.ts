import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  apiHeaders,
  docRow,
  editorBody,
  expectSaved,
  fixture,
  importAndOpen,
  importDialog,
  importFile,
  saveStatus,
  signIn,
  titleBox,
  typeAndSave,
} from '../helpers';

// Flow 2 (Import) + F1–F3: .md/.docx/.txt become editable docs; bad files are rejected with specific messages.
test.describe('import', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'alice');
  });

  /** Counts multipart uploads so client-side rejections can be proven to never hit the server. */
  function trackUploads(page: Page) {
    const seen: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/documents/import')) seen.push(r.url());
    });
    return seen;
  }

  test('dialog states the supported types and size limit', async ({ page }) => {
    await page.getByRole('button', { name: 'Import file' }).click();
    const dialog = importDialog(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Supported: .txt, .md, .docx — max 5 MB')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Flow 2: notes.md opens as a new doc "notes" with headings, list, bold and italic', async ({ page }) => {
    await importAndOpen(page, 'notes.md', 'notes');
    await expect(titleBox(page)).toHaveValue('notes');
    const body = editorBody(page);
    await expect(body.locator('h1')).toHaveText('Notes Heading One');
    await expect(body.locator('h2')).toHaveText('Notes Heading Two');
    await expect(body.locator('ul > li')).toHaveText(['First bullet', 'Second bullet', 'Third bullet']);
    await expect(body.locator('strong')).toHaveText('md bold text');
    await expect(body.locator('em')).toHaveText('md italic text');
    await expect(page.getByRole('banner').getByText('Owner', { exact: true })).toBeVisible();
  });

  test('imported doc is editable, autosaves and keeps the edit after reload', async ({ page }) => {
    await importAndOpen(page, 'notes.md', 'notes');
    await expectSaved(page);
    await typeAndSave(page, ' Edited after import.');
    await page.reload();
    await expect(editorBody(page)).toContainText('Edited after import.');
    await expect(editorBody(page).locator('h1')).toHaveText('Notes Heading One');
  });

  test('imported doc is listed under My documents with an Owner badge', async ({ page }) => {
    const id = await importAndOpen(page, 'notes.txt', 'notes');
    await page.goto('/');
    const link = page.locator(`a[href="/docs/${id}"]`);
    await expect(link).toBeVisible();
    await expect(docRow(page, 'My documents', 'notes').first().getByText('Owner', { exact: true })).toBeVisible();
  });

  test('notes.docx keeps headings, list, bold, italic and underline', async ({ page }) => {
    await importAndOpen(page, 'notes.docx', 'notes');
    await expect(titleBox(page)).toHaveValue('notes');
    const body = editorBody(page);
    await expect(body.locator('h1')).toHaveText('Docx Heading One');
    await expect(body.locator('h2')).toHaveText('Docx Heading Two');
    await expect(body.locator('ul > li')).toHaveText(['Docx bullet one', 'Docx bullet two']);
    await expect(body.locator('strong')).toHaveText('docx bold');
    await expect(body.locator('em')).toHaveText('docx italic');
    await expect(body.locator('u')).toHaveText('docx underline');
  });

  test('notes.txt becomes plain paragraphs', async ({ page }) => {
    await importAndOpen(page, 'notes.txt', 'notes');
    const paras = editorBody(page).locator('p');
    await expect(paras.filter({ hasText: 'First plain line of the text file.' })).toHaveCount(1);
    await expect(paras.filter({ hasText: 'Second paragraph of the text file.' })).toHaveCount(1);
    await expect(editorBody(page).locator('h1, h2, h3, ul, ol')).toHaveCount(0);
  });

  test('bad.pdf is rejected client-side with a specific message and never uploaded', async ({ page }) => {
    const uploads = trackUploads(page);
    const dialog = await importFile(page, 'bad.pdf');
    await expect(dialog.getByRole('alert')).toHaveText('Only .txt, .md and .docx files are supported');
    await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    expect(uploads).toHaveLength(0);
  });

  test('empty.md is rejected client-side', async ({ page }) => {
    const uploads = trackUploads(page);
    const dialog = await importFile(page, 'empty.md');
    await expect(dialog.getByRole('alert')).toHaveText(/empty/i);
    await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
    expect(uploads).toHaveLength(0);
  });

  test('a file over 5 MB is rejected client-side', async ({ page }) => {
    await page.getByRole('button', { name: 'Import file' }).click();
    const dialog = importDialog(page);
    await dialog.getByLabel('Choose file').setInputFiles({
      name: 'big.md',
      mimeType: 'text/markdown',
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 'a'),
    });
    await expect(dialog.getByRole('alert')).toHaveText('File is larger than 5 MB');
    await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeDisabled();
  });

  test('picking a valid file after an invalid one clears the error', async ({ page }) => {
    const dialog = await importFile(page, 'bad.pdf');
    await expect(dialog.getByRole('alert')).toBeVisible();
    await dialog.getByLabel('Choose file').setInputFiles(fixture('notes.md'));
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Import', exact: true })).toBeEnabled();
  });

  test('a corrupt .docx is rejected by the server with an inline "couldn\'t read" error', async ({ page }) => {
    await page.getByRole('button', { name: 'Import file' }).click();
    const dialog = importDialog(page);
    await dialog.getByLabel('Choose file').setInputFiles({
      name: 'broken.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('this is not a zip archive'),
    });
    await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText("couldn't read this file");
    await expect(page).not.toHaveURL(/\/docs\//);
  });

  test('server also rejects unsupported and empty uploads (not just the UI)', async ({ page }) => {
    const pdf = await page.request.post('/api/documents/import', {
      headers: apiHeaders,
      multipart: { file: { name: 'bad.pdf', mimeType: 'application/pdf', buffer: readFileSync(fixture('bad.pdf')) } },
    });
    expect(pdf.status()).toBe(400);
    expect((await pdf.json()).error.code).toBe('UNSUPPORTED_TYPE');

    const empty = await page.request.post('/api/documents/import', {
      headers: apiHeaders,
      multipart: { file: { name: 'empty.md', mimeType: 'text/markdown', buffer: Buffer.alloc(0) } },
    });
    expect(empty.status()).toBe(400);
    expect((await empty.json()).error.code).toBe('EMPTY_FILE');
  });

  test('saving status settles to Saved right after an import', async ({ page }) => {
    await importAndOpen(page, 'notes.docx', 'notes');
    await expect(saveStatus(page)).toHaveText('Saved');
  });
});

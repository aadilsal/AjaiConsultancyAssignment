import { expect, test, type Page } from '@playwright/test';
import {
  apiHeaders,
  createDocApi,
  editorBody,
  expectSaved,
  openDoc,
  signIn,
  tool,
  toolbar,
  uniqueTitle,
} from '../helpers';

// Extended toolbar (D3): every formatting control produces the right HTML and survives reload.

/** Block tools are inline on wide screens and inside "More formatting" on narrow ones. */
async function blockTool(page: Page, name: string) {
  const inline = tool(page, name);
  if (await inline.isVisible()) return inline.click();
  await toolbar(page).getByRole('button', { name: 'More formatting' }).click();
  await page.getByRole('menuitemcheckbox', { name }).or(page.getByRole('menuitem', { name })).click();
}

/** Alignment items are a Radix ToggleGroup (radio or pressed buttons depending on version). */
const alignItem = (page: Page, name: string) =>
  toolbar(page).getByRole('radio', { name }).or(toolbar(page).getByRole('button', { name, exact: true }));

async function reloadSaved(page: Page) {
  await expectSaved(page);
  await page.reload();
  await expect(editorBody(page)).toBeVisible();
}

test.describe('toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'alice');
    await openDoc(page, await createDocApi(page, uniqueTitle('Toolbar')));
    await editorBody(page).click();
  });

  test('Strikethrough, Highlight and Inline code toggle on/off and persist', async ({ page }) => {
    for (const [name, text] of [
      ['Strikethrough', 'struck'],
      ['Highlight', 'marked'],
      ['Inline code', 'codey'],
    ] as const) {
      await tool(page, name).click();
      await expect(tool(page, name)).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.type(text);
      await tool(page, name).click();
      await expect(tool(page, name)).toHaveAttribute('aria-pressed', 'false');
      await page.keyboard.type(' ');
    }
    await reloadSaved(page);
    const body = editorBody(page);
    await expect(body.locator('s')).toHaveText('struck');
    await expect(body.locator('mark')).toHaveText('marked');
    await expect(body.locator('code')).toHaveText('codey');
  });

  test('Link: select text → URL → Apply creates a[href]; bare domains get https://', async ({ page }) => {
    await page.keyboard.type('Docs');
    await page.keyboard.press('Shift+Home');
    await tool(page, 'Link').click();
    const url = page.getByRole('textbox', { name: 'URL' });
    await expect(url).toBeVisible();
    await url.fill('example.com');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(url).toBeHidden();
    await expect(editorBody(page).locator('a')).toHaveAttribute('href', 'https://example.com');

    await reloadSaved(page);
    const link = editorBody(page).locator('a');
    await expect(link).toHaveText('Docs');
    await expect(link).toHaveAttribute('href', 'https://example.com');

    // Caret inside the link → Link button active; Remove link unlinks.
    await link.click();
    await expect(tool(page, 'Link')).toHaveAttribute('aria-pressed', 'true');
    await tool(page, 'Link').click();
    await page.getByRole('button', { name: 'Remove link' }).click();
    await expect(editorBody(page).locator('a')).toHaveCount(0);
    await expect(editorBody(page)).toHaveText('Docs');
  });

  test('Link: javascript: URLs are rejected by the link dialog', async ({ page }) => {
    await page.keyboard.type('Click');
    await page.keyboard.press('Shift+Home');
    await tool(page, 'Link').click();
    const url = page.getByRole('textbox', { name: 'URL' });
    await url.fill('javascript:alert(1)');
    await expect(page.getByRole('alert').filter({ hasText: /valid web address/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
    await url.press('Enter');
    await expect(editorBody(page).locator('a')).toHaveCount(0);
  });

  test('Link: the API never stores a javascript: href', async ({ page }) => {
    const id = /\/docs\/([0-9a-f-]{36})/.exec(page.url())![1];
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
        },
      ],
    };
    const res = await page.request.patch(`/api/documents/${id}`, { headers: apiHeaders, data: { content, baseVersion: 1 } });
    if (res.ok()) {
      const doc = await (await page.request.get(`/api/documents/${id}`)).json();
      expect(JSON.stringify(doc.content)).not.toContain('javascript:');
    } else {
      expect(res.status()).toBe(400);
    }
  });

  test('alignment: center, right and justify set text-align and persist', async ({ page }) => {
    for (const [name, value] of [
      ['Align center', 'center'],
      ['Align right', 'right'],
      ['Justify', 'justify'],
    ] as const) {
      await page.keyboard.type(`${value} line`);
      await alignItem(page, name).click();
      await page.keyboard.press('Enter');
      await alignItem(page, 'Align left').click();
    }
    await reloadSaved(page);
    const body = editorBody(page);
    for (const value of ['center', 'right', 'justify']) {
      await expect(body.locator('p').filter({ hasText: `${value} line` })).toHaveCSS('text-align', value);
    }
  });

  test('Checklist creates a task list whose checked state persists', async ({ page }) => {
    await blockTool(page, 'Checklist');
    await page.keyboard.type('Task one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Task two');
    const list = editorBody(page).locator('ul[data-type="taskList"]');
    await expect(list.locator('li')).toHaveCount(2);
    await list.locator('li').first().getByRole('checkbox').check();
    await reloadSaved(page);
    const items = editorBody(page).locator('ul[data-type="taskList"] > li');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toHaveAttribute('data-checked', 'true');
    await expect(items.nth(1)).toHaveAttribute('data-checked', 'false');
  });

  test('Blockquote, Code block and Horizontal rule persist', async ({ page }) => {
    await page.keyboard.type('Intro');
    await blockTool(page, 'Horizontal rule');
    await blockTool(page, 'Code block');
    await page.keyboard.type('const x = 1;');
    // Triple Enter leaves a code block.
    for (let i = 0; i < 3; i++) await page.keyboard.press('Enter');
    await blockTool(page, 'Blockquote');
    await page.keyboard.type('Quoted');
    await reloadSaved(page);
    const body = editorBody(page);
    await expect(body.locator('blockquote')).toContainText('Quoted');
    await expect(body.locator('hr')).toHaveCount(1);
    await expect(body.locator('pre')).toContainText('const x = 1;');
  });

  test('Text style dropdown switches between headings and normal text', async ({ page }) => {
    await page.keyboard.type('Styled');
    const trigger = toolbar(page).getByRole('button', { name: 'Text style' });
    await expect(trigger).toHaveText('Normal text');
    await trigger.click();
    await page.getByRole('menuitemradio', { name: 'Heading 2' }).click();
    await expect(editorBody(page).locator('h2')).toHaveText('Styled');
    await expect(trigger).toHaveText('Heading 2');
    await expect(tool(page, 'Heading 2')).toHaveAttribute('aria-pressed', 'true');

    await trigger.click();
    await page.getByRole('menuitemradio', { name: 'Heading 3' }).click();
    await reloadSaved(page);
    await expect(editorBody(page).locator('h3')).toHaveText('Styled');

    await editorBody(page).locator('h3').click();
    await trigger.click();
    await page.getByRole('menuitemradio', { name: 'Normal text' }).click();
    await expect(editorBody(page).locator('h1, h2, h3')).toHaveCount(0);
    await expect(editorBody(page).locator('p')).toHaveText('Styled');
  });

  test('Clear formatting removes marks and block styles', async ({ page }) => {
    await tool(page, 'Heading 1').click();
    await tool(page, 'Bold').click();
    await page.keyboard.type('Loud');
    await page.keyboard.press('ControlOrMeta+A');
    await blockTool(page, 'Clear formatting');
    await expect(editorBody(page).locator('strong, h1')).toHaveCount(0);
    await reloadSaved(page);
    await expect(editorBody(page).locator('p')).toHaveText('Loud');
    await expect(editorBody(page).locator('strong, h1')).toHaveCount(0);
  });

  test('every formatting control has an accessible name', async ({ page }) => {
    const bar = toolbar(page);
    for (const name of [
      'Undo', 'Redo', 'Text style', 'Heading 1', 'Heading 2', 'Heading 3', 'Bold', 'Italic', 'Underline',
      'Strikethrough', 'Highlight', 'Inline code', 'Link', 'Bullet list', 'Numbered list',
    ]) {
      await expect(bar.getByRole('button', { name, exact: true }), name).toBeVisible();
    }
    for (const name of ['Align left', 'Align center', 'Align right', 'Justify']) {
      await expect(alignItem(page, name), name).toBeVisible();
    }
  });
});

import { expect, test, type Page } from '@playwright/test';
import {
  apiHeaders,
  createDocApi,
  NOT_FOUND_TEXT,
  pageFor,
  RANDOM_UUID,
  shareApi,
  signIn,
  uniqueTitle,
  USERS,
} from '../helpers';

// Flow 5 (Deny) + S4: strangers get 404 everywhere; grantees get 403 on owner-only actions.
async function ownedId(page: Page, title: string): Promise<string> {
  const res = await page.request.get('/api/documents');
  const body = (await res.json()) as { owned: { id: string; title: string }[] };
  const doc = body.owned.find((d) => d.title === title);
  if (!doc) throw new Error(`seeded doc "${title}" not found`);
  return doc.id;
}

test.describe('deny', () => {
  let aliceDoc: string;
  let bobId: string;

  test.beforeEach(async ({ page }) => {
    await signIn(page, 'alice');
    aliceDoc = await createDocApi(page, uniqueTitle('Secret'));
    await shareApi(page, aliceDoc, USERS.bob.email);
    const shares = await page.request.get(`/api/documents/${aliceDoc}/shares`);
    const list = (await shares.json()) as { shares: { userId: string; email: string }[] };
    bobId = list.shares.find((s) => s.email === USERS.bob.email)!.userId;
  });

  test('Flow 5: Carol pasting Alice\'s doc URL sees Not found', async ({ page }) => {
    const url = `/docs/${aliceDoc}`;
    await signIn(page, 'carol');
    await page.goto(url);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Document body' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to documents' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Carol cannot open seeded private docs either', async ({ page }) => {
    const privateDraft = await ownedId(page, 'Private Draft');
    const q4 = await ownedId(page, 'Q4 Planning Notes');
    await signIn(page, 'carol');
    for (const id of [privateDraft, q4]) {
      await page.goto(`/docs/${id}`);
      await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
    }
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Private Draft', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Q4 Planning Notes', exact: true })).toHaveCount(0);
  });

  test('stranger API calls all return 404 (indistinguishable from a missing doc)', async ({ page }) => {
    await signIn(page, 'carol');
    const r = page.request;
    const base = `/api/documents/${aliceDoc}`;
    const calls = {
      'GET doc': await r.get(base),
      'PATCH title': await r.patch(base, { headers: apiHeaders, data: { title: 'pwned' } }),
      'PATCH content': await r.patch(base, {
        headers: apiHeaders,
        data: { content: { type: 'doc', content: [{ type: 'paragraph' }] }, baseVersion: 1 },
      }),
      'DELETE doc': await r.delete(base, { headers: apiHeaders }),
      'GET shares': await r.get(`${base}/shares`),
      'POST share': await r.post(`${base}/shares`, { headers: apiHeaders, data: { email: USERS.carol.email } }),
      'DELETE share': await r.delete(`${base}/shares/${bobId}`, { headers: apiHeaders }),
    };
    for (const [name, res] of Object.entries(calls)) {
      expect(res.status(), name).toBe(404);
      expect((await res.json()).error.code, name).toBe('NOT_FOUND');
    }

    const missing = await r.get(`/api/documents/${RANDOM_UUID}`);
    expect(missing.status()).toBe(404);
    // Same code + message as a forbidden doc (requestId differs per request).
    const strip = ({ error: { code, message } }: { error: { code: string; message: string } }) => ({ code, message });
    expect(strip(await missing.json())).toEqual(strip(await calls['GET doc'].json()));
    expect((await r.get('/api/documents/not-a-uuid')).status()).toBe(404);
  });

  test('the doc is untouched after Carol\'s attempts', async ({ page, browser }) => {
    const carol = await pageFor(browser, 'carol');
    await carol.page.request.patch(`/api/documents/${aliceDoc}`, { headers: apiHeaders, data: { title: 'pwned' } });
    await carol.page.request.delete(`/api/documents/${aliceDoc}`, { headers: apiHeaders });
    await carol.context.close();
    const res = await page.request.get(`/api/documents/${aliceDoc}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).title).not.toBe('pwned');
  });

  test('editor (Bob) gets 403 on owner-only actions: delete, share, list/remove shares', async ({ page }) => {
    await signIn(page, 'bob');
    const r = page.request;
    const base = `/api/documents/${aliceDoc}`;
    expect((await r.get(base)).status()).toBe(200);

    const del = await r.delete(base, { headers: apiHeaders });
    expect(del.status()).toBe(403);
    expect((await del.json()).error.code).toBe('FORBIDDEN');
    expect((await r.post(`${base}/shares`, { headers: apiHeaders, data: { email: USERS.carol.email } })).status()).toBe(403);
    expect((await r.get(`${base}/shares`)).status()).toBe(403);
    expect((await r.delete(`${base}/shares/${bobId}`, { headers: apiHeaders })).status()).toBe(403);

    // Editor may still edit the title.
    expect((await r.patch(base, { headers: apiHeaders, data: { title: uniqueTitle('Bob edit') } })).status()).toBe(200);
  });

  test('Bob\'s blocked actions leave the doc and Carol\'s access unchanged', async ({ page, browser }) => {
    const bob = await pageFor(browser, 'bob');
    await bob.page.request.post(`/api/documents/${aliceDoc}/shares`, {
      headers: apiHeaders,
      data: { email: USERS.carol.email },
    });
    await bob.context.close();
    const carol = await pageFor(browser, 'carol');
    expect((await carol.page.request.get(`/api/documents/${aliceDoc}`)).status()).toBe(404);
    await expect(carol.page.locator(`a[href="/docs/${aliceDoc}"]`)).toHaveCount(0);
    await carol.context.close();
    expect((await page.request.get(`/api/documents/${aliceDoc}`)).status()).toBe(200);
  });

  test('state-changing request from a foreign Origin is refused (CSRF guard)', async ({ page }) => {
    const res = await page.request.patch(`/api/documents/${aliceDoc}`, {
      headers: { Origin: 'http://evil.example' },
      data: { title: 'csrf' },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe('BAD_ORIGIN');
  });

  test('stale baseVersion is rejected with 409', async ({ page }) => {
    const base = `/api/documents/${aliceDoc}`;
    const content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'v2' }] }] };
    const ok = await page.request.patch(base, { headers: apiHeaders, data: { content, baseVersion: 1 } });
    expect(ok.status()).toBe(200);
    const stale = await page.request.patch(base, { headers: apiHeaders, data: { content, baseVersion: 1 } });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).error.code).toBe('VERSION_CONFLICT');
  });
});

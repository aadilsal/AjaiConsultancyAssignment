import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { VIDEO_DIR } from './demo.config';

// One continuous take (under 4 min) covering the six PRD flows, with on-screen captions instead of narration.
const SAMPLE_DOCX = path.resolve(__dirname, '../../samples/product-brief.docx');
const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

// Caption bar + visible cursor, re-created on every page load (videos have no narration).
const OVERLAY = `(() => {
  const css = '#demo-cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;max-width:min(92vw,1100px);padding:14px 22px;border-radius:12px;background:rgba(20,22,26,.92);color:#fff;font:600 20px/1.35 Inter,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:none;text-align:center}'
    + '#demo-cap small{display:block;font-weight:500;font-size:15px;opacity:.75;margin-bottom:4px;letter-spacing:.02em}'
    + '#demo-card{position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#15171A;color:#E8E6E1;font:400 22px/1.5 Inter,system-ui,sans-serif;text-align:center;padding:40px}'
    + '#demo-card h1{font-size:48px;margin:0;font-weight:700}#demo-card p{margin:0;max-width:900px;opacity:.85}'
    + '#demo-dot{position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:rgba(46,94,78,.55);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.4);z-index:2147483647;pointer-events:none;transition:transform .12s}'
    + '#demo-dot.down{transform:scale(1.8);background:rgba(180,83,42,.6)}';
  const mount = () => {
    if (!document.body || document.getElementById('demo-style')) return;
    const s = document.createElement('style'); s.id = 'demo-style'; s.textContent = css; document.head.appendChild(s);
    const dot = document.createElement('div'); dot.id = 'demo-dot'; document.body.appendChild(dot);
    addEventListener('mousemove', e => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => dot.classList.add('down'), true);
    addEventListener('mouseup', () => dot.classList.remove('down'), true);
    const cap = sessionStorage.getItem('demo-cap');
    if (cap) window.__demoCaption(JSON.parse(cap));
  };
  window.__demoCaption = (c) => {
    sessionStorage.setItem('demo-cap', JSON.stringify(c));
    let el = document.getElementById('demo-cap');
    if (!c) { el && el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'demo-cap'; document.body.appendChild(el); }
    el.innerHTML = (c.step ? '<small>' + c.step + '</small>' : '') + c.text;
  };
  window.__demoCard = (html) => {
    let el = document.getElementById('demo-card');
    if (!html) { el && el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'demo-card'; document.body.appendChild(el); }
    el.innerHTML = html;
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', mount) : mount();
})();`;

async function caption(page: Page, step: string, text: string, readMs = 2500) {
  await page.evaluate((c) => (window as unknown as { __demoCaption: (x: unknown) => void }).__demoCaption(c), { step, text });
  await pause(page, readMs);
}

async function card(page: Page, html: string, ms: number) {
  await page.evaluate((h) => (window as unknown as { __demoCard: (x: string) => void }).__demoCard(h), html);
  await pause(page, ms);
  await page.evaluate(() => (window as unknown as { __demoCard: (x: string) => void }).__demoCard(''));
}

async function go(page: Page, url: string) {
  try { await page.goto(url); } catch { await page.waitForTimeout(1500); await page.goto(url).catch(() => {}); }
}

async function loginAs(page: Page, who: 'Alice' | 'Bob' | 'Carol') {
  await go(page, '/login');
  await page.getByRole('button', { name: `Log in as ${who}` }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible();
}

async function logout(page: Page) {
  if (page.url().includes("/docs/")) await go(page, "/");
  const direct = page.getByRole('button', { name: 'Log out' });
  if (!(await direct.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /account|user menu|open menu/i }).first().click();
  }
  await page.getByRole('button', { name: 'Log out' }).or(page.getByRole('menuitem', { name: 'Log out' })).first().click();
  await page.waitForURL(/\/(login|welcome)/);
}

async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveText(/Saved/, { timeout: 15_000 });
}

async function dismissModal(page: Page, button = 'OK') {
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: button }).click({ timeout: 4000 }).catch(() => {});
}

test('Ajaia Docs walkthrough', async ({ page }) => {
  await page.addInitScript(OVERLAY);
  const title = `Launch plan ${new Date().toISOString().slice(11, 16)}`;
  const body = page.getByRole('textbox', { name: 'Document body' });
  const F = (n: number, name: string) => `Flow ${n} of 6 · ${name}`;

  // Intro card.
  await go(page, '/welcome');
  await card(page, '<h1>Ajaia Docs</h1><p>A focused document editor: rich text with autosave, .docx/.md/.txt import, and owner-controlled sharing.</p><p style="opacity:.6;font-size:18px">Demo accounts — Alice (owner) · Bob (collaborator) · Carol (outsider) · password demo1234</p>', 5000);

  // Landing page and one-click demo login.
  await caption(page, 'Landing page', 'Public page with seeded demo accounts — no sign-up needed', 2500);
  await page.mouse.wheel(0, 1200);
  await pause(page, 2500);
  await caption(page, 'Landing page', 'Each demo card logs straight in. We start as Alice, the owner.', 2000);
  await page.getByRole('button', { name: 'Log in as Alice' }).or(page.getByRole('link', { name: 'Log in as Alice' })).first().click();
  await expect(page.getByRole('heading', { name: 'My documents' })).toBeVisible();
  await caption(page, 'Dashboard · Alice', 'Two lists: “My documents” (owned) and “Shared with me”, sorted by last edited', 3500);

  // Flow 1 — write.
  await caption(page, F(1, 'Write'), 'Alice creates a new document', 1500);
  await page.getByRole('button', { name: 'New document' }).click();
  await page.waitForURL(/\/docs\//);
  await caption(page, F(1, 'Write'), 'Rename it inline — click the title, type, press Enter', 1200);
  await page.getByRole('button', { name: 'Document title' }).or(page.getByRole('textbox', { name: 'Document title' })).first().click();
  const titleBox = page.getByRole('textbox', { name: 'Document title' });
  await titleBox.fill(title);
  await titleBox.press('Enter');
  await caption(page, F(1, 'Write'), 'Format with the toolbar: a Heading 2, a bullet list and bold text', 800);
  await body.click();
  await body.pressSequentially('Goals for the beta launch', { delay: 30 });
  await page.getByRole('button', { name: 'Heading 2' }).click();
  await body.press('End');
  await body.press('Enter');
  await page.getByRole('button', { name: 'Bullet list' }).click();
  await body.pressSequentially('Ship autosave with conflict detection', { delay: 25 });
  await body.press('Enter');
  await body.pressSequentially('Import .docx, .md and .txt', { delay: 25 });
  await body.press('Enter');
  await body.pressSequentially('Share with a named teammate', { delay: 25 });
  await body.press('Shift+Home');
  await page.getByRole('button', { name: 'Bold' }).click();
  await body.press('End');
  await caption(page, F(1, 'Write'), 'No Save button — it autosaves 1 s after typing stops (see the status chip)', 500);
  await waitSaved(page);
  await pause(page, 2000);
  await caption(page, F(1, 'Write'), 'Refresh the page — title and formatting come back exactly', 1200);
  await page.reload();
  await expect(body.locator('h2')).toHaveText('Goals for the beta launch');
  await expect(body.locator('strong')).toHaveText('Share with a named teammate');
  await pause(page, 2500);
  const docUrl = page.url();

  // Flow 2 — import.
  await page.getByRole('link', { name: 'Back to documents' }).click();
  await caption(page, F(2, 'Import'), 'Import an existing Word file as a new document', 1200);
  await page.getByRole('button', { name: 'Import file' }).click();
  await caption(page, F(2, 'Import'), 'Supported: .txt, .md, .docx up to 5 MB — limits are stated in the dialog', 2200);
  await page.getByLabel('Choose file').setInputFiles(SAMPLE_DOCX);
  await pause(page, 800);
  await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
  const openBtn = page.getByRole('alertdialog').getByRole('button', { name: 'Open document' });
  try { await openBtn.click({ timeout: 15000 }); } catch { await go(page, "/"); await page.getByRole("link", { name: /product-brief/ }).first().click(); }
  await page.waitForURL(/\/docs\//);
  await expect(body.locator('h1')).toBeVisible();
  await caption(page, F(2, 'Import'), 'product-brief.docx → headings, bullet + numbered lists, bold, italic and underline preserved', 2500);
  await page.mouse.wheel(0, 500);
  await pause(page, 2500);

  // Flow 3 — share.
  await go(page, docUrl);
  await caption(page, F(3, 'Share'), 'Only the owner sees the Share button. Alice shares the doc with Bob by email', 1500);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Share document' });
  await share.getByRole('textbox', { name: 'Email' }).pressSequentially('bob@ajaia.test', { delay: 35 });
  await share.getByRole('button', { name: 'Share', exact: true }).click();
  await dismissModal(page);
  await expect(share.getByText('bob@ajaia.test')).toBeVisible();
  await caption(page, F(3, 'Share'), 'Bob now appears in the access list as an Editor', 2500);
  await page.keyboard.press('Escape');

  // Flow 4 — receive.
  await caption(page, F(4, 'Receive'), 'Switch users: log out and log in as Bob', 1200);
  await logout(page);
  await loginAs(page, 'Bob');
  await caption(page, F(4, 'Receive'), 'Bob sees it under “Shared with me”, badged “Shared by Alice”', 3500);
  await page.getByRole('link', { name: title }).click();
  await caption(page, F(4, 'Receive'), 'Bob can edit — but has no Share or Delete. He adds a line; it autosaves', 800);
  await body.click();
  await page.keyboard.press('Control+End');
  await body.press('Enter');
  await body.pressSequentially('Bob: I will test the import path today.', { delay: 25 });
  await waitSaved(page);
  await pause(page, 1500);
  await logout(page);
  await loginAs(page, 'Alice');
  await go(page, docUrl);
  await expect(body).toContainText('Bob: I will test the import path today.');
  await caption(page, F(4, 'Receive'), 'Back as Alice: Bob’s change is there when she reopens the doc', 3000);

  // Flow 5 — deny.
  await caption(page, F(5, 'Deny'), 'Carol was never given access. She pastes the same document URL…', 1500);
  await logout(page);
  await loginAs(page, 'Carol');
  await go(page, docUrl);
  await expect(page.getByText("This document doesn't exist or you don't have access.")).toBeVisible();
  await caption(page, F(5, 'Deny'), '…and gets “Not found” — 404, not 403, so document IDs can’t be probed', 3500);
  await go(page, docUrl.replace('/docs/', '/api/documents/'));
  await caption(page, F(5, 'Deny'), 'Calling the API directly gives the same 404 — access is enforced on the server', 3500);

  // Flow 6 — revoke.
  await go(page, '/');
  await caption(page, F(6, 'Revoke'), 'Alice removes Bob’s access', 1000);
  await logout(page);
  await loginAs(page, 'Alice');
  await go(page, docUrl);
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await page.getByRole('button', { name: /Remove Bob/ }).click();
  await dismissModal(page);
  await pause(page, 1500);
  await page.keyboard.press('Escape');
  await logout(page);
  await loginAs(page, 'Bob');
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);
  await caption(page, F(6, 'Revoke'), 'Bob’s next visit: the document is gone from his list', 3000);
  await go(page, docUrl);
  await caption(page, F(6, 'Revoke'), 'and its URL now returns Not found for him too', 2500);

  // Extras.
  await go(page, '/');
  const toggle = page.getByRole('button', { name: /^Theme/ });
  if (await toggle.isVisible().catch(() => false)) {
    await caption(page, 'Extras', 'Light / dark theme (follows the system by default)', 600);
    await toggle.click();
    await pause(page, 1200);
    await toggle.click();
    await pause(page, 1800);
  }
  await go(page, '/api/docs');
  await caption(page, 'Extras', 'Every endpoint is documented in OpenAPI / Swagger at /api/docs', 3500);

  // Closing card.
  await card(page, '<h1>What you just saw</h1><p>1 Write &amp; autosave · 2 Import .docx · 3 Share by email · 4 Collaborator edits · 5 Outsider gets 404 · 6 Revoke access</p><p style="opacity:.6;font-size:18px">Live: https://docs.51-170-90-86.sslip.io · Code: github.com/aadilsal/AjaiConsultancyAssignment</p>', 5000);
});

test.afterAll(async () => {
  // Keep a stable file name next to Playwright's raw output.
  const raw = path.join(VIDEO_DIR, 'raw');
  const found = fs.existsSync(raw) ? fs.readdirSync(raw, { recursive: true }).map(String).find((f) => f.endsWith('.webm')) : undefined;
  if (found) fs.copyFileSync(path.join(raw, found), path.join(VIDEO_DIR, 'ajaia-docs-walkthrough.webm'));
});

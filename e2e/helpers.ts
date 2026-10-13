import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

export type UserKey = 'alice' | 'bob' | 'carol';

export const PASSWORD = 'demo1234';
// `name` is the seeded full name; `first` is what the quick-login buttons use.
export const USERS: Record<UserKey, { name: string; first: string; email: string }> = {
  alice: { name: 'Alice Johnson', first: 'Alice', email: 'alice@ajaia.test' },
  bob: { name: 'Bob Smith', first: 'Bob', email: 'bob@ajaia.test' },
  carol: { name: 'Carol Diaz', first: 'Carol', email: 'carol@ajaia.test' },
};

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const ORIGIN = new URL(BASE_URL).origin;
export const NOT_FOUND_TEXT = "This document doesn't exist or you don't have access.";
export const RANDOM_UUID = '00000000-0000-4000-8000-000000000000';
// `next dev` may compile the editor route on first hit.
export const EDITOR_LOAD_MS = 60_000;
export const fixture = (name: string) => join(__dirname, 'fixtures', name);

let counter = 0;
/** Unique title so tests never depend on each other or on a fresh DB. */
export function uniqueTitle(prefix: string): string {
  counter += 1;
  return `${prefix} ${Date.now().toString(36)}${counter}`;
}

// ---------- sessions (login is rate-limited to 5/min/IP, so sessions are cached) ----------

const AUTH_DIR = join(__dirname, '.auth');
const memory = new Map<UserKey, Cookie[]>();
type Cookie = Parameters<BrowserContext['addCookies']>[0][number];

function cacheFile(user: UserKey) {
  return join(AUTH_DIR, `${new URL(BASE_URL).host.replace(/[^a-z0-9]/gi, '_')}-${user}.json`);
}

function readCache(user: UserKey): Cookie[] | null {
  if (memory.has(user)) return memory.get(user)!;
  try {
    return JSON.parse(readFileSync(cacheFile(user), 'utf8')) as Cookie[];
  } catch {
    return null;
  }
}

async function writeCache(user: UserKey, context: BrowserContext) {
  const cookies = (await context.cookies()).filter((c) => c.name === 'ajaia_session');
  if (!cookies.length) return;
  memory.set(user, cookies);
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(cacheFile(user), JSON.stringify(cookies));
}

async function sessionIsFor(page: Page, user: UserKey): Promise<boolean> {
  const res = await page.request.get('/api/auth/me');
  if (!res.ok()) return false;
  const body = (await res.json()) as { user?: { email?: string } };
  return body.user?.email === USERS[user].email;
}

/** POST /api/auth/login, waiting out the 5/min limiter if needed. */
async function apiLogin(page: Page, user: UserKey) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await page.request.post('/api/auth/login', {
      data: { email: USERS[user].email, password: PASSWORD },
      headers: { Origin: ORIGIN },
    });
    if (res.ok()) return;
    if (res.status() !== 429) throw new Error(`login ${user} failed: ${res.status()} ${await res.text()}`);
    await page.waitForTimeout(61_000);
  }
  throw new Error(`login ${user} still rate-limited`);
}

/** Fast sign-in: reuse a cached session cookie, else log in via the API. Lands on the dashboard. */
export async function signIn(page: Page, user: UserKey) {
  const context = page.context();
  await context.clearCookies();
  const cached = readCache(user);
  if (cached) {
    await context.addCookies(cached);
    if (!(await sessionIsFor(page, user))) {
      await context.clearCookies();
      memory.delete(user);
    }
  }
  if (!(await context.cookies()).length) {
    await apiLogin(page, user);
    await writeCache(user, context);
  }
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expectDashboard(page, user);
}

/** New browser context signed in as `user` (for multi-user flows). Caller closes the context. */
export async function pageFor(browser: Browser, user: UserKey): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await signIn(page, user);
  return { context, page };
}

/** UI quick-login: clicks "Log in as X" on /login (waits out the rate limiter if hit). */
export async function loginAs(page: Page, user: UserKey) {
  const { first } = USERS[user];
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: `Log in as ${first}` }).click();
    const limited = page.getByRole('alert').filter({ hasText: /too many requests/i });
    const outcome = await Promise.race([
      page.waitForURL((u) => u.pathname === '/', { timeout: 15_000 }).then(() => 'ok' as const),
      limited.waitFor({ timeout: 15_000 }).then(() => 'limited' as const),
    ]);
    if (outcome === 'ok') {
      await expectDashboard(page, user);
      await writeCache(user, page.context());
      return;
    }
    await page.waitForTimeout(61_000);
  }
  throw new Error(`quick-login as ${user} kept hitting the rate limit`);
}

/** UI manual login with email + password. Returns once the request settles (caller asserts). */
export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL(/\/login/);
}

export async function expectDashboard(page: Page, user?: UserKey) {
  await expect(page.getByRole('heading', { name: /^My documents/ })).toBeVisible();
  await expect(page.getByLabel(/^Loading (My documents|Shared with me)/)).toHaveCount(0);
  if (user) await expect(page.getByRole('banner').getByText(USERS[user].name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
}

// ---------- dashboard ----------

export const section = (page: Page, name: 'My documents' | 'Shared with me') =>
  page.getByRole('region', { name: new RegExp(`^${name}`) });

/** The list row (li) for a doc title within a dashboard section. */
export function docRow(page: Page, sectionName: 'My documents' | 'Shared with me', title: string): Locator {
  return section(page, sectionName)
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: title, exact: true }) });
}

/** Clicks "New document", renames to `title`, returns the doc id. */
export async function createDoc(page: Page, title?: string): Promise<string> {
  if (!/\/$/.test(new URL(page.url()).pathname)) await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'New document' }).click();
  await page.waitForURL(/\/docs\/[0-9a-f-]{36}/);
  await expect(editorBody(page)).toBeVisible({ timeout: EDITOR_LOAD_MS });
  if (title) await renameDoc(page, title);
  return docIdFromUrl(page);
}

/** Creates a doc via the API (faster setup for tests not about creation). */
export async function createDocApi(page: Page, title: string): Promise<string> {
  const res = await page.request.post('/api/documents', { data: { title }, headers: { Origin: ORIGIN } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

/** Shares via the API as the current page's user. */
export async function shareApi(page: Page, docId: string, email: string, role: 'editor' | 'viewer' = 'editor') {
  const res = await page.request.post(`/api/documents/${docId}/shares`, {
    data: { email, role },
    headers: { Origin: ORIGIN },
  });
  expect(res.status(), await res.text()).toBe(201);
}

export function docIdFromUrl(page: Page): string {
  const m = /\/docs\/([0-9a-f-]{36})/.exec(page.url());
  if (!m) throw new Error(`not on a doc page: ${page.url()}`);
  return m[1];
}

// ---------- editor ----------

export const editorBody = (page: Page) => page.getByRole('textbox', { name: 'Document body' });
export const titleBox = (page: Page) => page.getByRole('textbox', { name: 'Document title' });
export const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Formatting' });
export const tool = (page: Page, name: string) => toolbar(page).getByRole('button', { name, exact: true });
export const saveStatus = (page: Page) => page.getByTestId('save-status');

export async function openDoc(page: Page, id: string) {
  await page.goto(`/docs/${id}`, { waitUntil: 'domcontentloaded' });
  await expect(editorBody(page)).toBeVisible({ timeout: EDITOR_LOAD_MS });
}

export async function renameDoc(page: Page, title: string) {
  const box = titleBox(page);
  await box.click();
  await box.fill(title);
  const saved = page.waitForResponse((r) => r.url().includes('/api/documents/') && r.request().method() === 'PATCH');
  await box.press('Enter');
  expect((await saved).ok()).toBeTruthy();
  await expect(box).toHaveValue(title);
}

/** Focuses the editor body and moves the caret to the end of the document. */
export async function focusEnd(page: Page) {
  await editorBody(page).click();
  await page.keyboard.press('ControlOrMeta+End');
}

export async function expectSaved(page: Page) {
  await expect(saveStatus(page)).toHaveText('Saved', { timeout: 15_000 });
}

/** Types text into the editor and waits for autosave to settle. */
export async function typeAndSave(page: Page, text: string) {
  await focusEnd(page);
  await page.keyboard.type(text);
  await expect(saveStatus(page)).not.toHaveText('Saved');
  await expectSaved(page);
}

export async function selectAllInEditor(page: Page) {
  await editorBody(page).click();
  await page.keyboard.press('ControlOrMeta+A');
}

// ---------- dialogs ----------

export const shareDialog = (page: Page) => page.getByRole('dialog', { name: 'Share document' });
export const importDialog = (page: Page) => page.getByRole('dialog', { name: 'Import file' });

export async function openShareDialog(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Share', exact: true }).click();
  const dialog = shareDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Loading…')).toHaveCount(0);
  return dialog;
}

export async function shareViaDialog(page: Page, email: string, role: 'Editor' | 'Viewer' = 'Editor') {
  const dialog = shareDialog(page);
  await dialog.getByRole('textbox', { name: 'Email' }).fill(email);
  await dialog.getByRole('combobox', { name: 'Role' }).selectOption({ label: role });
  // Client-side zod validation keeps Share disabled for invalid input (error shows on blur).
  const submit = dialog.getByRole('button', { name: 'Share', exact: true });
  const enabled = await expect(submit)
    .toBeEnabled({ timeout: 2_000 })
    .then(() => true)
    .catch(() => false);
  if (enabled) await submit.click();
}

/** Shares and dismisses the "Shared with {name}" success modal. */
export async function shareWith(page: Page, user: UserKey, role: 'Editor' | 'Viewer' = 'Editor') {
  await shareViaDialog(page, USERS[user].email, role);
  await dismissModal(page, `Shared with ${USERS[user].name}`);
}

export async function importFile(page: Page, file: string) {
  await page.getByRole('button', { name: 'Import file' }).click();
  const dialog = importDialog(page);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Choose file').setInputFiles(fixture(file));
  return dialog;
}

/** Imports a fixture and ends on the new doc's editor; asserts the "Imported {title}" modal if shown. */
export async function importAndOpen(page: Page, file: string, expectedTitle: string): Promise<string> {
  const dialog = await importFile(page, file);
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  const success = alertDialog(page, `Imported ${expectedTitle}`);
  const outcome = await Promise.race([
    success.waitFor({ timeout: 20_000 }).then(() => 'modal' as const),
    page.waitForURL(/\/docs\/[0-9a-f-]{36}/, { timeout: 20_000 }).then(() => 'navigated' as const),
  ]);
  if (outcome === 'modal' || (await success.isVisible())) {
    const open = success.getByRole('button', { name: 'Open document' });
    if (await open.isVisible()) await open.click();
    else await success.getByRole('button', { name: 'OK' }).click();
    await expect(success).toBeHidden();
  }
  await page.waitForURL(/\/docs\/[0-9a-f-]{36}/);
  await expect(editorBody(page)).toBeVisible({ timeout: EDITOR_LOAD_MS });
  return docIdFromUrl(page);
}

// ---------- modals (Radix AlertDialog, role=alertdialog) ----------

export const alertDialog = (page: Page, name: string | RegExp) => page.getByRole('alertdialog', { name });

/** Asserts a success/info modal appears and dismisses it (success modals may also auto-close after 2.5s). */
export async function dismissModal(page: Page, name: string | RegExp, button = 'OK') {
  const modal = alertDialog(page, name);
  await expect(modal).toBeVisible();
  await modal
    .getByRole('button', { name: button, exact: true })
    .click({ timeout: 2_000 })
    .catch(() => undefined);
  await expect(modal).toBeHidden();
}

/** Dismisses the modal only if it appears within `timeout` (for optional confirmations). */
export async function dismissModalIfShown(page: Page, name: string | RegExp, button = 'OK', timeout = 3_000) {
  const modal = alertDialog(page, name);
  try {
    await modal.waitFor({ timeout });
  } catch {
    return false;
  }
  await modal.getByRole('button', { name: button, exact: true }).click();
  await expect(modal).toBeHidden();
  return true;
}

/** Owner deletes a doc from the dashboard: row button → confirm → success modal. */
export async function deleteFromDashboard(page: Page, title: string) {
  await docRow(page, 'My documents', title).getByRole('button', { name: `Delete ${title}` }).click();
  const confirm = alertDialog(page, 'Delete document?');
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText(title);
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await dismissModalIfShown(page, 'Document deleted', 'OK', 10_000);
}

// ---------- raw API (for deny-path checks) ----------

export const apiHeaders = { Origin: ORIGIN };

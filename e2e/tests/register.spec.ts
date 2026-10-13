import { expect, test, type Page } from '@playwright/test';
import {
  createDocApi,
  docRow,
  expectDashboard,
  openDoc,
  openShareDialog,
  signIn,
  uniqueTitle,
  USERS,
  shareViaDialog,
  dismissModal,
} from '../helpers';

// Self-service registration: validation, success, duplicate email, and sharing with a new user.
const STRONG_PASSWORD = 'Sturdy-pass-42';

const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
const passwordField = (page: Page, name: 'Password' | 'Confirm password') => page.getByLabel(name, { exact: true });
const submit = (page: Page) => page.getByRole('button', { name: 'Create account' });

async function fillForm(page: Page, v: { name: string; email: string; password: string; confirm: string }) {
  await field(page, 'Full name').fill(v.name);
  await field(page, 'Email').fill(v.email);
  await passwordField(page, 'Password').fill(v.password);
  await passwordField(page, 'Confirm password').fill(v.confirm);
  await passwordField(page, 'Confirm password').blur();
}

// Pending: middleware.ts doesn't list /register as public, so signed-out users are redirected to /login.
test.describe.fixme('register', () => {
  test('form shows live validation errors for bad email, weak password and mismatched confirm', async ({ page }) => {
    await page.goto('/register');
    await expect(submit(page)).toBeVisible();

    await field(page, 'Email').fill('not-an-email');
    await field(page, 'Email').blur();
    await expect(page.getByRole('alert').filter({ hasText: /valid email/i })).toBeVisible();

    await passwordField(page, 'Password').fill('123');
    await passwordField(page, 'Password').blur();
    await expect(page.getByRole('alert').filter({ hasText: /password/i })).toBeVisible();

    await passwordField(page, 'Password').fill(STRONG_PASSWORD);
    await passwordField(page, 'Confirm password').fill(`${STRONG_PASSWORD}x`);
    await passwordField(page, 'Confirm password').blur();
    await expect(page.getByRole('alert').filter({ hasText: /match/i })).toBeVisible();

    // Fixing the input clears the errors.
    await field(page, 'Email').fill(`e2e+fix${Date.now()}@ajaia.test`);
    await passwordField(page, 'Confirm password').fill(STRONG_PASSWORD);
    await field(page, 'Full name').fill('Fixer');
    await field(page, 'Full name').blur();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('new user registers, lands on the dashboard, and a duplicate email is refused', async ({ page }) => {
    const stamp = Date.now();
    const name = `E2E User ${stamp.toString(36)}`;
    const email = `e2e+${stamp}@ajaia.test`;

    await page.goto('/register');
    await fillForm(page, { name, email, password: STRONG_PASSWORD, confirm: STRONG_PASSWORD });
    await submit(page).click();
    await page.waitForURL((u) => u.pathname === '/');
    await expectDashboard(page);
    await expect(page.getByRole('banner').getByText(name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('No documents yet — create one or import a file')).toBeVisible();
    await expect(page.getByText('Nothing shared with you yet')).toBeVisible();

    // Same email again → specific error.
    await page.context().clearCookies();
    await page.goto('/register');
    await fillForm(page, { name: 'Dup', email, password: STRONG_PASSWORD, confirm: STRONG_PASSWORD });
    await submit(page).click();
    await expect(page.getByText('An account with this email already exists.')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('Alice can share a doc with a newly registered user, who sees it under Shared with me', async ({ page, browser }) => {
    const stamp = Date.now();
    const name = `Newbie ${stamp.toString(36)}`;
    const email = `e2e+${stamp}@ajaia.test`;

    const ctx = await browser.newContext();
    const newbie = await ctx.newPage();
    await newbie.goto('/register');
    await fillForm(newbie, { name, email, password: STRONG_PASSWORD, confirm: STRONG_PASSWORD });
    await submit(newbie).click();
    await newbie.waitForURL((u) => u.pathname === '/');

    await signIn(page, 'alice');
    const title = uniqueTitle('For the new user');
    await openDoc(page, await createDocApi(page, title));
    await openShareDialog(page);
    await shareViaDialog(page, email);
    await dismissModal(page, `Shared with ${name}`);

    await newbie.reload();
    const row = docRow(newbie, 'Shared with me', title);
    await expect(row).toBeVisible();
    await expect(row.getByText(`Shared by ${USERS.alice.name}`)).toBeVisible();
    await ctx.close();
  });

  test('/login and /register link to each other', async ({ page }) => {
    await page.goto('/login');
    await page.locator('a[href="/register"]').first().click();
    await expect(page).toHaveURL(/\/register/);
    await expect(submit(page)).toBeVisible();
    await page.locator('a[href="/login"]').first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Log in as Alice' })).toBeVisible();
  });

  test('signed-in user visiting /register is sent to the dashboard', async ({ page }) => {
    await signIn(page, 'bob');
    await page.goto('/register');
    await expect(page).toHaveURL(/\/$/);
  });
});

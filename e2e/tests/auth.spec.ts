import { expect, test } from '@playwright/test';
import { apiHeaders, expectDashboard, loginAs, logout, PASSWORD, RANDOM_UUID, signIn, submitLogin, USERS } from '../helpers';

// Accounts (A1–A3): login, logout, user switch, route protection.
test.describe('auth', () => {
  test('quick-login buttons are shown for all three demo users', async ({ page }) => {
    await page.goto('/login');
    for (const u of Object.values(USERS)) {
      await expect(page.getByRole('button', { name: `Log in as ${u.name}` })).toBeVisible();
      await expect(page.getByText(u.email, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(PASSWORD, { exact: true })).toBeVisible();
  });

  for (const user of ['alice', 'bob', 'carol'] as const) {
    test(`quick-login as ${USERS[user].name} lands on the dashboard with the name shown`, async ({ page }) => {
      await loginAs(page, user);
      await expect(page).toHaveURL(/\/$/);
      await expectDashboard(page, user);
      await expect(page.getByRole('heading', { name: /^Shared with me/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    });
  }

  test('manual email + password login works', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeDisabled();
    await submitLogin(page, USERS.bob.email, PASSWORD);
    await page.waitForURL((u) => u.pathname === '/');
    await expectDashboard(page, 'bob');
  });

  test('wrong password shows a generic inline error and stays on /login', async ({ page }) => {
    await page.goto('/login');
    await submitLogin(page, USERS.alice.email, 'wrong-password');
    await expect(page.getByRole('alert').filter({ hasText: /Incorrect email or password|Too many requests/ })).toBeVisible();
    const alert = page.getByRole('alert').filter({ hasText: 'Incorrect email or password' });
    // A 429 here means the limiter (5/min) was hit by earlier tests; wait and retry once.
    if (!(await alert.isVisible())) {
      await page.waitForTimeout(61_000);
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
    }
    await expect(alert).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
  });

  test('unknown email gets the same message as a wrong password', async ({ page }) => {
    const res = await page.request.post('/api/auth/login', {
      data: { email: 'nobody@ajaia.test', password: PASSWORD },
      headers: apiHeaders,
    });
    if (res.status() === 429) test.skip(true, 'login rate limit hit; covered by API tests');
    expect(res.status()).toBe(401);
    expect((await res.json()).error.message).toBe('Incorrect email or password');
  });

  test('unauthenticated visit to / redirects to the /welcome landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('unauthenticated visit to /login shows the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Log in as Alice' })).toBeVisible();
  });

  test('unauthenticated visit to a doc URL redirects to /login', async ({ page }) => {
    await page.goto(`/docs/${RANDOM_UUID}`);
    await expect(page).toHaveURL(/\/login\?next=%2Fdocs%2F/);
  });

  test('unauthenticated API calls return 401', async ({ page }) => {
    expect((await page.request.get('/api/documents')).status()).toBe(401);
    expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  });

  test('logout returns to /login and / is protected again', async ({ page }) => {
    await signIn(page, 'alice');
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome$/);
    expect((await page.request.get('/api/documents')).status()).toBe(401);
  });

  test('signed-in user visiting /login is sent to the dashboard', async ({ page }) => {
    await signIn(page, 'alice');
    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);
  });

  test('switching users (Alice → Bob) shows Bob and his documents', async ({ page }) => {
    await signIn(page, 'alice');
    await expect(page.getByRole('link', { name: 'Private Draft', exact: true })).toBeVisible();
    await logout(page);
    await signIn(page, 'bob');
    await expectDashboard(page, 'bob');
    await expect(page.getByRole('banner').getByText('Alice', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: "Bob's Ideas", exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Private Draft', exact: true })).toHaveCount(0);
  });
});

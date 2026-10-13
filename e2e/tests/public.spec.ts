import { expect, test, type Page } from '@playwright/test';
import { signIn, USERS } from '../helpers';

// Public pages: /welcome landing, /terms, /privacy and the custom 404 (no session needed).
const PUBLIC_PAGES = ['/welcome', '/terms', '/privacy'] as const;
// Radix Accordion triggers carry both aria-expanded and aria-controls.
const faqTriggers = (page: Page) => page.getByRole('main').locator('button[aria-expanded][aria-controls]');

async function metaDescription(page: Page) {
  return page.locator('meta[name="description"]').getAttribute('content');
}

/** Elements with visible text that are stuck fully transparent (e.g. a reveal animation that never ran). */
async function stuckHiddenText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const stuck: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *'))) {
      if (el.closest('[aria-hidden="true"], [hidden]')) continue;
      const text = el.innerText?.trim();
      if (!text || el.children.length > 0) continue;
      let node: HTMLElement | null = el;
      while (node) {
        const s = getComputedStyle(node);
        if (s.display === 'none' || s.visibility === 'hidden') break;
        if (Number(s.opacity) === 0) {
          stuck.push(text.slice(0, 60));
          break;
        }
        node = node.parentElement;
      }
    }
    return stuck;
  });
}

test.describe('public pages', () => {
  test('each public page loads with a unique <title> and a meta description', async ({ page }) => {
    const titles = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const title = await page.title();
      expect(title, path).not.toBe('');
      titles.add(title);
      expect((await metaDescription(page))?.length ?? 0, `${path} meta description`).toBeGreaterThan(10);
    }
    expect(titles.size).toBe(PUBLIC_PAGES.length);
  });

  test('landing CTA "Try the live demo" reaches /login', async ({ page }) => {
    await page.goto('/welcome');
    const cta = page
      .getByRole('link', { name: 'Try the live demo' })
      .or(page.getByRole('button', { name: 'Try the live demo' }))
      .first();
    await cta.click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Log in as Alice' })).toBeVisible();
  });

  test('landing "Log in as Alice" signs in directly and lands on the dashboard', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Log in as Alice' }).first().click();
    await page.waitForURL((u) => u.pathname === '/');
    await expect(page.getByRole('heading', { name: /^My documents/ })).toBeVisible();
  });

  test('landing nav shows "Open app" when signed in', async ({ page }) => {
    await signIn(page, 'alice');
    await page.goto('/welcome');
    const openApp = page.getByRole('link', { name: 'Open app' }).first();
    await expect(openApp).toBeVisible();
    await openApp.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('landing shows the three demo accounts', async ({ page }) => {
    await page.goto('/welcome');
    for (const u of Object.values(USERS)) {
      await expect(page.getByText(u.email).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test('FAQ items expand and collapse (aria-expanded)', async ({ page }) => {
    await page.goto('/welcome');
    const trigger = faqTriggers(page).first();
    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panelId = await trigger.getAttribute('aria-controls');
    if (panelId) await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    if (panelId) await expect(page.locator(`[id="${panelId}"]`)).toBeHidden();
  });

  test('FAQ is keyboard operable', async ({ page }) => {
    await page.goto('/welcome');
    const trigger = faqTriggers(page).nth(1);
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('unknown route without a session redirects to /login', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/login\?next=%2Fthis-route-does-not-exist/);
  });

  test('unknown route (signed in) shows the custom 404 with its two actions', async ({ page }) => {
    await signIn(page, 'carol');
    const res = await page.goto('/this-route-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Page not found')).toBeVisible();
    const action = (name: string) =>
      page.getByRole('link', { name }).or(page.getByRole('button', { name })).first();
    await expect(action('Go to documents')).toBeVisible();
    await expect(action('Back to home')).toBeVisible();
    await action('Back to home').click();
    await expect(page).toHaveURL(/\/(welcome)?$/);
  });

  test('every <img> on public pages has an alt attribute', async ({ page }) => {
    for (const path of [...PUBLIC_PAGES, '/login']) {
      await page.goto(path);
      const missing = await page.locator('img:not([alt])').count();
      expect(missing, `${path}: <img> without alt`).toBe(0);
    }
  });

  test('legal pages link back to the landing page', async ({ page }) => {
    for (const path of ['/terms', '/privacy']) {
      await page.goto(path);
      await expect(page.locator('a[href="/welcome"], a[href="/"]').first()).toBeVisible();
    }
  });

  test('landing links to /terms and /privacy', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.locator('a[href="/terms"]').first()).toBeAttached();
    await expect(page.locator('a[href="/privacy"]').first()).toBeAttached();
  });

  test('with reduced motion all content still renders (no stuck reveal animations)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Scroll through so scroll-triggered reveals get their chance to run.
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
      });
      await page.waitForTimeout(500);
      expect(await stuckHiddenText(page), path).toEqual([]);
    }
  });
});

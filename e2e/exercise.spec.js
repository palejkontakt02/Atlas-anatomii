import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 600_000 });
// Kontener testowy nie ma GPU: renderowanie programowe ~0,5 kl./s, więc długie oczekiwania.
const slow = { timeout: 180_000 };

const errorsOf = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
};
const ready = (page) => expect(page.getByTestId('ex-status')).toHaveAttribute('data-ready', 'true', slow);
const seek = (page, v) => page.getByTestId('ex-seek').evaluate((el, x) => { el.value = String(x); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);

test('exercise: phases, angles, muscles now, cards with estimate and source', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await page.getByTestId('tab-exercise').click();
  await ready(page);
  await expect(page.getByTestId('ex-play')).toBeVisible(slow);
  await seek(page, 300);
  await expect(page.getByTestId('ex-phase')).toContainText('Zejście', slow);
  await seek(page, 700);
  await expect(page.getByTestId('ex-phase')).toContainText('Wstawanie', slow);
  await seek(page, 540);
  await expect(page.getByTestId('ex-angles')).toContainText('Kolano 120°', slow);
  const first = page.getByTestId('ex-now-item').first();
  await expect(first).toContainText('obszerny', slow);
  await expect(first).toContainText('%', slow);
  await page.getByTestId('ex-now-item').filter({ hasText: 'piszczelowy przedni' }).click();
  await expect(page.getByTestId('ex-card')).toBeVisible(slow);
  await expect(page.getByTestId('ex-card-mvic')).toContainText('szacunek', slow);
  await expect(page.getByTestId('ex-card-mvic')).not.toContainText('%');
  await first.click();
  await expect(page.getByTestId('ex-card-mvic')).toContainText('%', slow);
  await expect(page.getByTestId('ex-card-source').locator('a[href*="doi.org"]')).toHaveCount(1, slow);
  await page.getByTestId('ex-colormode').getByRole('button', { name: /rol/i }).click();
  await page.screenshot({ path: 'test-results/exercise.png' });
  expect(errors).toEqual([]);
});

test('exercise: pause holds the pose, tabs switch without reloading', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/#cwiczenia');
  await ready(page);
  await expect(page.getByTestId('ex-play')).toHaveAttribute('aria-pressed', 'true', slow);
  await page.getByTestId('ex-play').click();
  await expect(page.getByTestId('ex-play')).toHaveAttribute('aria-pressed', 'false', slow);
  const t1 = await page.evaluate(() => window.__atlas.exercise.cameraState().t);
  await page.waitForTimeout(500);
  const t2 = await page.evaluate(() => window.__atlas.exercise.cameraState().t);
  expect(t2).toBe(t1);
  for (let i = 0; i < 2; i++) {
    await page.getByTestId('tab-atlas').click();
    await expect(page.locator('#scene')).toBeVisible(slow);
    await page.getByTestId('tab-exercise').click();
    await expect(page.getByTestId('ex-play')).toBeVisible(slow);
  }
  expect(await page.evaluate(() => window.__atlas.exerciseLoads)).toBe(1);
  expect(errors).toEqual([]);
});

test('exercise on a phone: no horizontal scroll, play button not covered', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/#cwiczenia');
  await ready(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const covered = await page.evaluate(() => {
    const r = document.querySelector('[data-testid="ex-play"]').getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('[data-testid="ex-play"]') !== null;
  });
  expect(covered).toBe(true);
  await page.screenshot({ path: 'test-results/exercise-phone.png' });
  await ctx.close();
});

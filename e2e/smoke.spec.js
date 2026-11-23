import { test, expect } from '@playwright/test';

const errorsOf = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
};

test('desktop: layers, search, names, isolate', async ({ page }) => {
  const errors = errorsOf(page);
  await page.goto('/');
  await expect(page.getByTestId('footer')).toContainText('Z-Anatomy');
  await expect(page.getByTestId('footer')).toContainText('CC BY-SA 4.0');
  await expect(page.getByTestId('layer-bones')).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  await expect(page.getByTestId('layer-bones').locator('input')).toBeChecked();

  await page.getByTestId('search-input').fill('clavicula');
  await page.getByTestId('search-result').first().click();
  await expect(page.getByTestId('info-panel')).toBeVisible();
  await expect(page.getByTestId('info-la')).toContainText('Clavicula');
  await expect(page.getByTestId('info-en')).toContainText('Clavicle');

  await page.getByTestId('lang-la').click();
  await expect(page.getByTestId('info-main')).toContainText('Clavicula');
  await page.getByTestId('lang-pl').click();

  await page.getByTestId('btn-isolate').click();
  await page.getByTestId('btn-show-all').click();

  await page.getByTestId('layer-muscles').locator('input').check();
  await expect(page.getByTestId('layer-muscles')).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });

  // wynik z niewczytanej warstwy: wyszukiwanie mięśnia po łacinie wczytuje i zaznacza
  await page.getByTestId('search-input').fill('gluteus medius');
  await page.getByTestId('search-input').press('Enter');
  await expect(page.getByTestId('info-en')).toContainText('Gluteus medius');
  // mięsień leży z tyłu: kamera ma patrzeć od tyłu (oś +Z = przód ciała)
  const cam = await page.evaluate(() => window.__atlas.viewer.cameraState());
  expect(cam.position[2]).toBeLessThan(cam.target[2]);
  await page.screenshot({ path: 'test-results/desktop.png' });
  expect(errors).toEqual([]);
});

test('canvas tap selects a bone and drag does not', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('layer-bones')).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  const box = await page.locator('canvas').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.5; // miednica / kręgosłup na środku kadru
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('info-panel')).toBeHidden();
  await page.mouse.click(cx + 80, cy);
  await page.mouse.click(cx, cy);
  await expect(page.getByTestId('info-panel')).toBeVisible();
});

test('phone: bottom sheet and no horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByTestId('layer-bones')).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  await page.getByTestId('search-input').fill('clavicle');
  await page.getByTestId('search-result').first().click();
  const panel = page.getByTestId('info-panel');
  await expect(panel).toBeVisible();
  // panel wysuwa się animacją; czekamy, aż dojedzie do dolnej krawędzi
  await expect.poll(async () => { const b = await panel.boundingBox(); return Math.abs(b.y + b.height - 844); }, { timeout: 5000 }).toBeLessThan(4);
  // przyciski panelu nie mogą być przykryte stopką
  const covered = await page.evaluate(() => {
    const r = document.getElementById('btn-show-all').getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el && (el.id || el.outerHTML.slice(0, 100));
  });
  expect(covered).toBe('btn-show-all');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/phone.png' });
  await ctx.close();
});

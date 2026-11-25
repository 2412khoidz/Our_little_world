import { expect, test } from '@playwright/test';

test.describe('Production PWA runtime (vite preview + dist/)', () => {
  test('service worker installs, caches app shell, survives reload offline', async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);

    const workboxErrors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (/workbox|add-to-cache-list-conflicting|Precaching did not/i.test(text)) {
        workboxErrors.push(text);
      }
    });

    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) throw new Error('No serviceWorker');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      if (!reg.active && !reg.installing && !reg.waiting) throw new Error('SW not active');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });

    const cacheKeys = await page.evaluate(async () => {
      const keys = await caches.keys();
      const sizes: Record<string, number> = {};
      for (const key of keys) {
        const cache = await caches.open(key);
        const reqs = await cache.keys();
        sizes[key] = reqs.length;
      }
      return { keys, sizes };
    });
    expect(cacheKeys.keys.length).toBeGreaterThan(0);
    const totalEntries = Object.values(cacheKeys.sizes).reduce((a, b) => a + b, 0);
    expect(totalEntries).toBeGreaterThan(3);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    expect(workboxErrors).toEqual([]);
  });
});
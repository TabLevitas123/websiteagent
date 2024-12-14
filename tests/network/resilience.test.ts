import { test, expect } from '@playwright/test';
import { setupMockServer } from '../utils/mockServer';
import { NetworkConditions } from '../utils/networkConditions';

test.describe('Network Resilience', () => {
  let mockServer: any;

  test.beforeAll(async () => {
    mockServer = await setupMockServer();
  });

  test.afterAll(async () => {
    await mockServer.close();
  });

  test.describe('Connection Issues', () => {
    test('should handle slow connections', async ({ page }) => {
      // Simulate 3G connection
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/');

      // Verify loading states
      await expect(page.locator('[data-testid=loading-skeleton]')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();

      // Verify critical content loaded
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should handle connection drops', async ({ page }) => {
      await page.goto('/marketplace');

      // Simulate connection drop
      await page.setOffline(true);
      await page.click('[data-testid=load-more]');

      // Verify error handling
      await expect(page.locator('[data-testid=network-error]')).toBeVisible();
      await expect(page.locator('[data-testid=retry-button]')).toBeVisible();

      // Test recovery
      await page.setOffline(false);
      await page.click('[data-testid=retry-button]');
      await expect(page.locator('[data-testid=network-error]')).not.toBeVisible();
    });

    test('should handle intermittent connections', async ({ page }) => {
      await page.goto('/analytics');

      // Simulate intermittent connection
      let isOnline = true;
      await page.route('**/*', async (route) => {
        if (!isOnline) {
          await route.abort('failed');
          return;
        }
        await route.continue();
        isOnline = !isOnline;
      });

      // Test auto-retry mechanism
      await page.click('[data-testid=refresh-data]');
      await expect(page.locator('[data-testid=retry-indicator]')).toBeVisible();
      await expect(page.locator('[data-testid=data-updated]')).toBeVisible();
    });
  });

  test.describe('Data Consistency', () => {
    test('should handle partial data loads', async ({ page }) => {
      // Mock partial data response
      await page.route('**/api/agents', (route) => {
        route.fulfill({
          status: 206,
          body: JSON.stringify({ agents: [], partial: true }),
        });
      });

      await page.goto('/marketplace');
      await expect(page.locator('[data-testid=partial-data-warning]')).toBeVisible();
    });

    test('should handle out-of-order responses', async ({ page }) => {
      const responses: any[] = [];
      await page.route('**/api/metrics', async (route) => {
        const delay = Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        responses.push(route.request().url());
        await route.continue();
      });

      await page.goto('/analytics');
      await page.click('[data-testid=refresh-data]');
      await page.click('[data-testid=refresh-data]');

      // Verify only most recent data is displayed
      const displayedTimestamp = await page.locator('[data-testid=data-timestamp]').textContent();
      expect(Date.parse(displayedTimestamp!)).toBeGreaterThan(0);
    });
  });

  test.describe('Cache Management', () => {
    test('should handle stale cache', async ({ page }) => {
      // Mock stale cache response
      await page.route('**/api/agents', (route) => {
        route.fulfill({
          status: 200,
          headers: {
            'Cache-Control': 'max-age=0',
            'ETag': '"123"',
          },
          body: JSON.stringify({ agents: [] }),
        });
      });

      await page.goto('/marketplace');
      await page.reload();

      // Verify fresh data fetch
      await expect(page.locator('[data-testid=data-refreshed]')).toBeVisible();
    });

    test('should handle offline cache', async ({ page }) => {
      await page.goto('/marketplace');

      // Enable service worker
      await page.evaluate(() => {
        navigator.serviceWorker.register('/sw.js');
      });

      // Go offline and reload
      await page.setOffline(true);
      await page.reload();

      // Verify cached content
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('[data-testid=offline-indicator]')).toBeVisible();
    });
  });

  test.describe('Error Recovery', () => {
    test('should handle API timeouts', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/agents', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 31000)); // Longer than timeout
        await route.continue();
      });

      await page.goto('/marketplace');
      await expect(page.locator('[data-testid=timeout-error]')).toBeVisible();
    });

    test('should handle rate limiting', async ({ page }) => {
      // Mock rate limit response
      await page.route('**/api/agents', (route) => {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Too Many Requests' }),
        });
      });

      await page.goto('/marketplace');
      await expect(page.locator('[data-testid=rate-limit-warning]')).toBeVisible();
    });

    test('should handle server errors', async ({ page }) => {
      // Mock server error
      await page.route('**/api/agents', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/marketplace');
      await expect(page.locator('[data-testid=error-boundary]')).toBeVisible();
      await expect(page.locator('[data-testid=retry-button]')).toBeVisible();
    });
  });

  test.describe('Performance Degradation', () => {
    test('should handle slow API responses', async ({ page }) => {
      // Simulate increasing latency
      let latency = 100;
      await page.route('**/api/**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, latency));
        latency += 100;
        await route.continue();
      });

      await page.goto('/analytics');
      await expect(page.locator('[data-testid=performance-warning]')).toBeVisible();
    });

    test('should handle memory constraints', async ({ page }) => {
      // Simulate large data sets
      await page.route('**/api/metrics', (route) => {
        const largeData = Array(10000).fill({ timestamp: Date.now(), value: Math.random() });
        route.fulfill({
          status: 200,
          body: JSON.stringify({ metrics: largeData }),
        });
      });

      await page.goto('/analytics');
      await expect(page.locator('[data-testid=data-truncated-warning]')).toBeVisible();
    });
  });
});

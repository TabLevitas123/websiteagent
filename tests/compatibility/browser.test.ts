import { test, expect } from '@playwright/test';

const BROWSERS = [
  { name: 'Chromium', channel: 'chrome' },
  { name: 'Firefox', channel: 'firefox' },
  { name: 'WebKit', channel: 'webkit' },
];

const VIEWPORT_SIZES = [
  { width: 1920, height: 1080, name: 'Desktop' },
  { width: 1024, height: 768, name: 'Tablet Landscape' },
  { width: 768, height: 1024, name: 'Tablet Portrait' },
  { width: 375, height: 667, name: 'Mobile' },
];

test.describe('Browser Compatibility', () => {
  for (const browser of BROWSERS) {
    test.describe(`${browser.name}`, () => {
      test.use({ channel: browser.channel });

      for (const viewport of VIEWPORT_SIZES) {
        test.describe(`${viewport.name}`, () => {
          test.use({
            viewport: { width: viewport.width, height: viewport.height },
          });

          test('should render home page correctly', async ({ page }) => {
            await page.goto('/');
            await expect(page).toHaveScreenshot(`home-${browser.name}-${viewport.name}.png`);
            
            // Check critical elements
            await expect(page.locator('nav')).toBeVisible();
            await expect(page.locator('main')).toBeVisible();
            await expect(page.locator('footer')).toBeVisible();
          });

          test('should handle wallet connection', async ({ page }) => {
            await page.goto('/');
            
            // Mock web3 provider
            await page.evaluate(() => {
              window.ethereum = {
                request: () => Promise.resolve('0x123'),
                on: () => {},
                removeListener: () => {},
              };
            });

            await page.click('[data-testid=connect-wallet-btn]');
            await expect(page.locator('[data-testid=user-address]')).toBeVisible();
          });

          test('should render marketplace correctly', async ({ page }) => {
            await page.goto('/marketplace');
            await expect(page).toHaveScreenshot(`marketplace-${browser.name}-${viewport.name}.png`);

            // Test grid layout
            const grid = page.locator('[data-testid=agent-grid]');
            await expect(grid).toBeVisible();

            // Test responsive filters
            if (viewport.width <= 768) {
              await expect(page.locator('[data-testid=filters-toggle]')).toBeVisible();
              await page.click('[data-testid=filters-toggle]');
            }
            await expect(page.locator('[data-testid=filters]')).toBeVisible();
          });

          test('should handle forms correctly', async ({ page }) => {
            await page.goto('/profile');
            
            // Test form inputs
            await page.fill('[data-testid=name-input]', 'Test User');
            await page.selectOption('[data-testid=category-select]', 'AI');
            await page.check('[data-testid=terms-checkbox]');
            
            // Test form submission
            await page.click('[type=submit]');
            await expect(page.locator('[data-testid=success-message]')).toBeVisible();
          });

          test('should render charts correctly', async ({ page }) => {
            await page.goto('/analytics');
            
            // Test chart rendering
            await expect(page.locator('[data-testid=revenue-chart]')).toBeVisible();
            await expect(page.locator('[data-testid=users-chart]')).toBeVisible();
            
            // Test chart interactivity
            await page.hover('[data-testid=chart-tooltip-trigger]');
            await expect(page.locator('[data-testid=chart-tooltip]')).toBeVisible();
          });

          test('should handle animations', async ({ page }) => {
            await page.goto('/marketplace');
            
            // Test modal animation
            await page.click('[data-testid=agent-card]');
            await expect(page.locator('[data-testid=modal]')).toBeVisible();
            
            // Test transition
            await page.click('[data-testid=close-modal]');
            await expect(page.locator('[data-testid=modal]')).not.toBeVisible();
          });

          test('should handle file operations', async ({ page }) => {
            await page.goto('/profile');
            
            // Test file upload
            const fileInput = page.locator('[data-testid=file-input]');
            await fileInput.setInputFiles({
              name: 'test.jpg',
              mimeType: 'image/jpeg',
              buffer: Buffer.from('test'),
            });
            
            await expect(page.locator('[data-testid=file-preview]')).toBeVisible();
          });

          test('should handle keyboard navigation', async ({ page }) => {
            await page.goto('/marketplace');
            
            // Test tab navigation
            await page.keyboard.press('Tab');
            await expect(page.locator('[data-testid=skip-link]')).toBeFocused();
            
            await page.keyboard.press('Tab');
            await expect(page.locator('nav a').first()).toBeFocused();
          });

          test('should handle touch interactions', async ({ page }) => {
            await page.goto('/marketplace');
            
            // Test touch scroll
            await page.touchscreen.tap(100, 100);
            await page.mouse.wheel(0, 100);
            
            // Test touch gestures
            if (viewport.width <= 768) {
              await page.gesture('swipe', { x: 100, y: 100 }, { x: 200, y: 100 });
              await expect(page.locator('[data-testid=mobile-menu]')).toBeVisible();
            }
          });

          test('should handle offline mode', async ({ page }) => {
            await page.goto('/');
            
            // Test offline functionality
            await page.setOffline(true);
            await page.reload();
            
            await expect(page.locator('[data-testid=offline-message]')).toBeVisible();
            
            // Test reconnection
            await page.setOffline(false);
            await page.reload();
            await expect(page.locator('[data-testid=offline-message]')).not.toBeVisible();
          });
        });
      }
    });
  }
});

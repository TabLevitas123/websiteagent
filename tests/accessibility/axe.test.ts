import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport size
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  const runA11yTests = async (page: any) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  };

  test('Home Page Accessibility', async ({ page }) => {
    await page.goto('/');
    await runA11yTests(page);

    // Test navigation
    await page.keyboard.press('Tab');
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement.toLowerCase()).toBe('a');
  });

  test('Marketplace Accessibility', async ({ page }) => {
    await page.goto('/marketplace');
    await runA11yTests(page);

    // Test search functionality
    const searchInput = page.locator('[data-testid=search-input]');
    await expect(searchInput).toHaveAttribute('aria-label', 'Search agents');

    // Test filters
    const categoryFilter = page.locator('[data-testid=category-filter]');
    await expect(categoryFilter).toHaveAttribute('aria-label', 'Filter by category');

    // Test agent cards
    const agentCards = page.locator('[data-testid=agent-card]');
    await expect(agentCards.first()).toHaveAttribute('role', 'article');
  });

  test('Analytics Dashboard Accessibility', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid=wallet-input]', '0x123');
    await page.click('[data-testid=connect-btn]');
    
    await page.goto('/analytics');
    await runA11yTests(page);

    // Test chart accessibility
    const charts = page.locator('[data-testid=chart]');
    await expect(charts.first()).toHaveAttribute('role', 'img');
    await expect(charts.first()).toHaveAttribute('aria-label');

    // Test controls
    const timeframeSelector = page.locator('[data-testid=timeframe-selector]');
    await expect(timeframeSelector).toHaveAttribute('aria-label', 'Select time frame');
  });

  test('Profile Page Accessibility', async ({ page }) => {
    await page.goto('/profile');
    await runA11yTests(page);

    // Test form inputs
    const inputs = page.locator('input, select, textarea');
    for (const input of await inputs.all()) {
      await expect(input).toHaveAttribute('aria-label');
    }

    // Test tabs
    const tabs = page.locator('[role=tab]');
    await expect(tabs.first()).toHaveAttribute('aria-selected');
  });

  test('Modal Accessibility', async ({ page }) => {
    await page.goto('/marketplace');
    await page.click('[data-testid=agent-card]');

    // Test modal
    const modal = page.locator('[role=dialog]');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');

    // Test focus trap
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement.toLowerCase()).not.toBe('body');
  });

  test('Form Validation Accessibility', async ({ page }) => {
    await page.goto('/profile');
    await page.click('[data-testid=edit-profile-btn]');

    // Submit empty form
    await page.click('[type=submit]');

    // Test error messages
    const errorMessages = page.locator('[role=alert]');
    await expect(errorMessages.first()).toBeVisible();
    await expect(errorMessages.first()).toHaveAttribute('aria-live', 'polite');
  });

  test('Color Contrast', async ({ page }) => {
    await page.goto('/');
    
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({
        rules: {
          'color-contrast': { enabled: true }
        }
      })
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Keyboard Navigation', async ({ page }) => {
    await page.goto('/marketplace');

    // Test skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid=skip-link]');
    await expect(skipLink).toBeFocused();

    // Test main navigation
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      const element = await page.evaluate(() => document.activeElement?.tagName);
      expect(element.toLowerCase()).not.toBe('body');
    }
  });

  test('Screen Reader Compatibility', async ({ page }) => {
    await page.goto('/marketplace');

    // Test landmarks
    const main = page.locator('main');
    await expect(main).toHaveAttribute('role', 'main');

    const nav = page.locator('nav');
    await expect(nav).toHaveAttribute('aria-label');

    // Test headings hierarchy
    const headings = await page.evaluate(() => {
      const levels: number[] = [];
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
        levels.push(parseInt(h.tagName[1]));
      });
      return levels;
    });

    expect(headings[0]).toBe(1); // Should start with h1
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i] - headings[i-1]).toBeLessThanOrEqual(1); // No skipping levels
    }
  });

  test('Dynamic Content Updates', async ({ page }) => {
    await page.goto('/analytics');

    // Test loading states
    const loadingSpinner = page.locator('[data-testid=loading-spinner]');
    await expect(loadingSpinner).toHaveAttribute('role', 'status');
    await expect(loadingSpinner).toHaveAttribute('aria-live', 'polite');

    // Test data updates
    await page.selectOption('[data-testid=timeframe-selector]', '7d');
    const updatedContent = page.locator('[data-testid=metrics]');
    await expect(updatedContent).toHaveAttribute('aria-live', 'polite');
  });

  test('Error Handling', async ({ page }) => {
    // Test 404 page
    await page.goto('/nonexistent');
    const errorHeading = page.locator('h1');
    await expect(errorHeading).toHaveAttribute('role', 'alert');

    // Test form errors
    await page.goto('/profile');
    await page.click('[data-testid=edit-profile-btn]');
    await page.click('[type=submit]');

    const errorSummary = page.locator('[data-testid=error-summary]');
    await expect(errorSummary).toHaveAttribute('role', 'alert');
    await expect(errorSummary).toHaveAttribute('aria-live', 'assertive');
  });
});

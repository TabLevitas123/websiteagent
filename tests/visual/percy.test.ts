import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport size for consistent snapshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Home Page', async ({ page }) => {
    await page.goto('/');
    await percySnapshot(page, 'Home Page');

    // Test responsive layouts
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await percySnapshot(page, 'Home Page - Mobile');

    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await percySnapshot(page, 'Home Page - Tablet');
  });

  test('Marketplace', async ({ page }) => {
    await page.goto('/marketplace');

    // Default view
    await percySnapshot(page, 'Marketplace - Default');

    // With filters applied
    await page.fill('[data-testid=search-input]', 'test');
    await page.selectOption('[data-testid=category-filter]', 'AI');
    await percySnapshot(page, 'Marketplace - Filtered');

    // Grid vs List view
    await page.click('[data-testid=view-toggle]');
    await percySnapshot(page, 'Marketplace - List View');

    // Mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await percySnapshot(page, 'Marketplace - Mobile');
  });

  test('Analytics Dashboard', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid=wallet-input]', '0x123');
    await page.click('[data-testid=connect-btn]');
    
    await page.goto('/analytics');

    // Default view
    await percySnapshot(page, 'Analytics Dashboard - Default');

    // Different time ranges
    await page.selectOption('[data-testid=timeframe-selector]', '7d');
    await percySnapshot(page, 'Analytics Dashboard - Weekly View');

    await page.selectOption('[data-testid=timeframe-selector]', '30d');
    await percySnapshot(page, 'Analytics Dashboard - Monthly View');

    // Different chart types
    await page.click('[data-testid=chart-type-bar]');
    await percySnapshot(page, 'Analytics Dashboard - Bar Charts');

    await page.click('[data-testid=chart-type-line]');
    await percySnapshot(page, 'Analytics Dashboard - Line Charts');
  });

  test('Profile Page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid=wallet-input]', '0x123');
    await page.click('[data-testid=connect-btn]');
    
    await page.goto('/profile');

    // Default view
    await percySnapshot(page, 'Profile Page - Default');

    // Edit mode
    await page.click('[data-testid=edit-profile-btn]');
    await percySnapshot(page, 'Profile Page - Edit Mode');

    // With owned agents
    await page.click('[data-testid=owned-agents-tab]');
    await percySnapshot(page, 'Profile Page - Owned Agents');
  });

  test('Agent Details', async ({ page }) => {
    await page.goto('/marketplace');
    await page.click('[data-testid=agent-card]');

    // Default view
    await percySnapshot(page, 'Agent Details - Default');

    // With expanded sections
    await page.click('[data-testid=metrics-section]');
    await percySnapshot(page, 'Agent Details - Metrics Expanded');

    await page.click('[data-testid=reviews-section]');
    await percySnapshot(page, 'Agent Details - Reviews Expanded');
  });

  test('Error States', async ({ page }) => {
    // 404 page
    await page.goto('/nonexistent');
    await percySnapshot(page, '404 Page');

    // Network error
    await page.route('**/api/**', route => route.abort());
    await page.goto('/marketplace');
    await percySnapshot(page, 'Network Error State');

    // Empty states
    await page.goto('/marketplace?category=nonexistent');
    await percySnapshot(page, 'Empty Search Results');

    await page.goto('/profile');
    await page.click('[data-testid=owned-agents-tab]');
    await percySnapshot(page, 'Empty Owned Agents');
  });

  test('Interactive Elements', async ({ page }) => {
    await page.goto('/marketplace');

    // Hover states
    await page.hover('[data-testid=agent-card]');
    await percySnapshot(page, 'Agent Card - Hover');

    await page.hover('[data-testid=buy-now-btn]');
    await percySnapshot(page, 'Buy Button - Hover');

    // Active states
    await page.click('[data-testid=category-filter]');
    await percySnapshot(page, 'Category Filter - Active');

    // Loading states
    await page.route('**/api/agents', route => {
      return new Promise(resolve => setTimeout(() => route.continue(), 2000));
    });
    await page.goto('/marketplace');
    await percySnapshot(page, 'Loading State');
  });

  test('Dark Mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });

    // Test main pages in dark mode
    await page.goto('/');
    await percySnapshot(page, 'Home Page - Dark Mode');

    await page.goto('/marketplace');
    await percySnapshot(page, 'Marketplace - Dark Mode');

    await page.goto('/analytics');
    await percySnapshot(page, 'Analytics - Dark Mode');
  });

  test('Animations and Transitions', async ({ page }) => {
    await page.goto('/marketplace');

    // Modal transitions
    await page.click('[data-testid=agent-card]');
    await percySnapshot(page, 'Modal Opening Animation');

    // Filter animations
    await page.click('[data-testid=filters-toggle]');
    await percySnapshot(page, 'Filters Animation');

    // Chart animations
    await page.goto('/analytics');
    await page.selectOption('[data-testid=timeframe-selector]', '7d');
    await percySnapshot(page, 'Chart Animation');
  });
});

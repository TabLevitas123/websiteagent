import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { WCAG_RULES } from '../utils/a11yUtils';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page);
  });

  test.describe('Core Pages', () => {
    test('should meet WCAG standards on home page', async ({ page }) => {
      await page.goto('/');
      
      // Run full accessibility audit
      const violations = await getViolations(page, WCAG_RULES.LEVEL_AA);
      expect(violations).toHaveLength(0);

      // Check specific criteria
      await checkA11y(page, '#main-content', {
        rules: {
          'color-contrast': { enabled: true },
          'heading-order': { enabled: true },
          'landmark-one-main': { enabled: true },
        },
      });
    });

    test('should meet WCAG standards on marketplace', async ({ page }) => {
      await page.goto('/marketplace');

      // Test dynamic content loading
      await page.click('[data-testid=load-more]');
      await page.waitForLoadState('networkidle');

      // Verify accessibility after content update
      const violations = await getViolations(page);
      expect(violations).toHaveLength(0);
    });

    test('should maintain accessibility during modal interactions', async ({ page }) => {
      await page.goto('/marketplace');

      // Test modal accessibility
      await page.click('[data-testid=agent-card]');
      await page.waitForSelector('[data-testid=modal]');

      // Check modal specific rules
      await checkA11y(page, '[data-testid=modal]', {
        rules: {
          'aria-dialog': { enabled: true },
          'focus-trap': { enabled: true },
          'modal-focus': { enabled: true },
        },
      });
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have accessible forms', async ({ page }) => {
      await page.goto('/profile');

      // Check form-specific criteria
      await checkA11y(page, 'form', {
        rules: {
          'label': { enabled: true },
          'form-field-multiple-labels': { enabled: true },
          'select-name': { enabled: true },
          'autocomplete-valid': { enabled: true },
        },
      });

      // Test form validation messages
      await page.click('[type=submit]');
      const violations = await getViolations(page, WCAG_RULES.FORM_VALIDATION);
      expect(violations).toHaveLength(0);
    });

    test('should handle error states accessibly', async ({ page }) => {
      await page.goto('/profile');

      // Trigger form errors
      await page.click('[type=submit]');

      // Check error messaging
      await checkA11y(page, '[role=alert]', {
        rules: {
          'aria-valid-attr': { enabled: true },
          'aria-required-children': { enabled: true },
        },
      });
    });
  });

  test.describe('Interactive Elements', () => {
    test('should have accessible buttons and controls', async ({ page }) => {
      await page.goto('/marketplace');

      // Check interactive elements
      await checkA11y(page, 'button, [role=button]', {
        rules: {
          'button-name': { enabled: true },
          'click-events-have-key-events': { enabled: true },
        },
      });
    });

    test('should handle focus management', async ({ page }) => {
      await page.goto('/marketplace');

      // Test focus handling
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBe('A');

      // Test skip links
      await page.keyboard.press('Enter');
      const mainFocused = await page.evaluate(() => document.activeElement?.getAttribute('id'));
      expect(mainFocused).toBe('main-content');
    });
  });

  test.describe('Dynamic Content', () => {
    test('should maintain accessibility during live updates', async ({ page }) => {
      await page.goto('/analytics');

      // Test live region updates
      await page.click('[data-testid=refresh-data]');
      
      await checkA11y(page, '[aria-live]', {
        rules: {
          'aria-live-region-text': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
        },
      });
    });

    test('should handle loading states accessibly', async ({ page }) => {
      await page.goto('/marketplace');

      // Test loading indicators
      await page.click('[data-testid=load-more]');
      
      await checkA11y(page, '[role=progressbar]', {
        rules: {
          'aria-valid-attr': { enabled: true },
          'aria-hidden-focus': { enabled: true },
        },
      });
    });
  });

  test.describe('Media Accessibility', () => {
    test('should have accessible images and icons', async ({ page }) => {
      await page.goto('/marketplace');

      // Check image accessibility
      await checkA11y(page, 'img, [role=img]', {
        rules: {
          'image-alt': { enabled: true },
          'presentation-role-conflict': { enabled: true },
        },
      });
    });

    test('should handle video content accessibly', async ({ page }) => {
      await page.goto('/learn');

      // Check video player accessibility
      await checkA11y(page, '[data-testid=video-player]', {
        rules: {
          'video-caption': { enabled: true },
          'video-description': { enabled: true },
        },
      });
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet contrast requirements', async ({ page }) => {
      await page.goto('/');

      // Test contrast ratios
      const violations = await getViolations(page, WCAG_RULES.CONTRAST);
      expect(violations).toHaveLength(0);
    });

    test('should not rely solely on color', async ({ page }) => {
      await page.goto('/analytics');

      // Check non-color indicators
      await checkA11y(page, '[data-testid=status-indicator]', {
        rules: {
          'color-contrast': { enabled: true },
          'link-in-text-block': { enabled: true },
        },
      });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/marketplace');

      // Test keyboard navigation flow
      const tabOrder = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const element = await page.evaluate(() => {
          const active = document.activeElement;
          return active ? {
            tagName: active.tagName,
            role: active.getAttribute('role'),
            text: active.textContent,
          } : null;
        });
        tabOrder.push(element);
      }

      // Verify logical tab order
      expect(tabOrder).toEqual(expect.arrayContaining([
        expect.objectContaining({ tagName: 'A' }),
        expect.objectContaining({ role: 'button' }),
      ]));
    });

    test('should handle keyboard shortcuts', async ({ page }) => {
      await page.goto('/marketplace');

      // Test keyboard shortcuts
      await page.keyboard.press('Control+F');
      await expect(page.locator('[data-testid=search-modal]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid=search-modal]')).not.toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.goto('/');

      // Check landmark structure
      await checkA11y(page, '[role=banner], [role=main], [role=navigation]', {
        rules: {
          'landmark-unique': { enabled: true },
          'region': { enabled: true },
        },
      });
    });

    test('should provide meaningful announcements', async ({ page }) => {
      await page.goto('/marketplace');

      // Test screen reader announcements
      await page.click('[data-testid=filter-button]');
      
      await checkA11y(page, '[aria-live=polite]', {
        rules: {
          'aria-live-region-text': { enabled: true },
          'aria-hidden-body': { enabled: true },
        },
      });
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility across viewports', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('/marketplace');

        const violations = await getViolations(page);
        expect(violations).toHaveLength(0);
      }
    });

    test('should handle touch interactions accessibly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/marketplace');

      // Test touch targets
      await checkA11y(page, 'button, a, [role=button]', {
        rules: {
          'target-size': { enabled: true },
        },
      });
    });
  });
});

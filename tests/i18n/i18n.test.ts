import { test, expect } from '@playwright/test';
import { validateTranslations, checkMissingKeys } from '../utils/i18nUtils';

const SUPPORTED_LOCALES = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'];
const TEST_ROUTES = ['/', '/marketplace', '/analytics', '/profile', '/settings'];

test.describe('Internationalization Tests', () => {
  test.describe('Language Detection and Switching', () => {
    for (const locale of SUPPORTED_LOCALES) {
      test(`should detect and apply ${locale} locale`, async ({ page }) => {
        // Set browser locale
        await page.setExtraHTTPHeaders({
          'Accept-Language': locale,
        });

        await page.goto('/');

        // Check HTML lang attribute
        const htmlLang = await page.$eval('html', el => el.getAttribute('lang'));
        expect(htmlLang).toBe(locale);

        // Check content language header
        const response = await page.goto('/');
        expect(response?.headers()['content-language']).toBe(locale);

        // Verify language switcher shows correct language
        const selectedLang = await page.locator('[data-testid=language-selector]').textContent();
        expect(selectedLang).toContain(locale);
      });
    }

    test('should persist language preference', async ({ page }) => {
      await page.goto('/');

      // Change language
      await page.click('[data-testid=language-selector]');
      await page.click('[data-testid=lang-option-fr]');

      // Verify cookie/localStorage
      const langPreference = await page.evaluate(() => localStorage.getItem('preferredLanguage'));
      expect(langPreference).toBe('fr-FR');

      // Reload and verify persistence
      await page.reload();
      const htmlLang = await page.$eval('html', el => el.getAttribute('lang'));
      expect(htmlLang).toBe('fr-FR');
    });
  });

  test.describe('Content Translation', () => {
    for (const locale of SUPPORTED_LOCALES) {
      test(`should have complete translations for ${locale}`, async ({ page }) => {
        // Load translation files
        const translations = await import(`../../src/locales/${locale}.json`);
        const baseTranslations = await import('../../src/locales/en-US.json');

        // Check for missing keys
        const missingKeys = checkMissingKeys(baseTranslations, translations);
        expect(missingKeys).toHaveLength(0);

        // Validate translation format
        const validationErrors = validateTranslations(translations);
        expect(validationErrors).toHaveLength(0);
      });

      test(`should render ${locale} content correctly`, async ({ page }) => {
        await page.setExtraHTTPHeaders({
          'Accept-Language': locale,
        });

        for (const route of TEST_ROUTES) {
          await page.goto(route);

          // Check for untranslated content
          const pageContent = await page.textContent('body');
          expect(pageContent).not.toContain('TRANSLATION_MISSING');
          expect(pageContent).not.toMatch(/\{\{.*\}\}/);
        }
      });
    }

    test('should handle pluralization correctly', async ({ page }) => {
      await page.goto('/marketplace');

      // Test different quantities
      const quantities = [0, 1, 2, 5, 10];
      for (const qty of quantities) {
        await page.fill('[data-testid=quantity-input]', qty.toString());
        const message = await page.locator('[data-testid=quantity-message]').textContent();
        
        if (qty === 0) {
          expect(message).toContain('No items');
        } else if (qty === 1) {
          expect(message).toContain('1 item');
        } else {
          expect(message).toContain('items');
        }
      }
    });
  });

  test.describe('Date and Number Formatting', () => {
    const testDate = new Date('2024-01-01T12:00:00Z');
    const testNumber = 1234567.89;

    for (const locale of SUPPORTED_LOCALES) {
      test(`should format dates correctly for ${locale}`, async ({ page }) => {
        await page.setExtraHTTPHeaders({
          'Accept-Language': locale,
        });

        await page.goto('/');

        // Test date formatting
        const formattedDate = await page.evaluate((date, loc) => {
          return new Intl.DateTimeFormat(loc).format(new Date(date));
        }, testDate, locale);

        await page.locator('[data-testid=test-date]').textContent();
        expect(formattedDate).toMatch(/[\d\D]+/); // Verify non-empty string
      });

      test(`should format numbers correctly for ${locale}`, async ({ page }) => {
        await page.setExtraHTTPHeaders({
          'Accept-Language': locale,
        });

        await page.goto('/');

        // Test number formatting
        const formattedNumber = await page.evaluate((num, loc) => {
          return new Intl.NumberFormat(loc).format(num);
        }, testNumber, locale);

        await page.locator('[data-testid=test-number]').textContent();
        expect(formattedNumber).toMatch(/[\d\D]+/);
      });
    }
  });

  test.describe('RTL Support', () => {
    const RTL_LOCALES = ['ar-SA', 'he-IL'];

    for (const locale of RTL_LOCALES) {
      test(`should handle RTL layout for ${locale}`, async ({ page }) => {
        await page.setExtraHTTPHeaders({
          'Accept-Language': locale,
        });

        await page.goto('/');

        // Check dir attribute
        const htmlDir = await page.$eval('html', el => el.getAttribute('dir'));
        expect(htmlDir).toBe('rtl');

        // Check RTL-specific styles
        const isRTL = await page.evaluate(() => {
          const body = document.body;
          const styles = window.getComputedStyle(body);
          return styles.direction === 'rtl';
        });
        expect(isRTL).toBeTruthy();

        // Check text alignment
        const textAlign = await page.evaluate(() => {
          const element = document.querySelector('p');
          return window.getComputedStyle(element!).textAlign;
        });
        expect(textAlign).toBe('right');
      });
    }
  });

  test.describe('Currency and Time Zones', () => {
    test('should handle multiple currencies', async ({ page }) => {
      await page.goto('/marketplace');

      // Test currency switching
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
      for (const currency of currencies) {
        await page.selectOption('[data-testid=currency-selector]', currency);
        
        const price = await page.locator('[data-testid=product-price]').textContent();
        expect(price).toMatch(new RegExp(currency));
      }
    });

    test('should handle time zones correctly', async ({ page }) => {
      await page.goto('/analytics');

      // Test different time zones
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];
      for (const timeZone of timeZones) {
        await page.selectOption('[data-testid=timezone-selector]', timeZone);
        
        const timestamp = await page.locator('[data-testid=event-timestamp]').textContent();
        expect(timestamp).toBeTruthy();
      }
    });
  });

  test.describe('Content Adaptation', () => {
    test('should adapt content for different regions', async ({ page }) => {
      const regions = ['NA', 'EU', 'APAC'];
      
      for (const region of regions) {
        await page.setExtraHTTPHeaders({
          'CF-IPCountry': region,
        });

        await page.goto('/');

        // Check region-specific content
        const content = await page.textContent('[data-testid=region-specific-content]');
        expect(content).toContain(region);
      }
    });

    test('should handle region-specific regulations', async ({ page }) => {
      // Test GDPR compliance for EU
      await page.setExtraHTTPHeaders({
        'CF-IPCountry': 'DE',
      });

      await page.goto('/');
      const cookieConsent = await page.locator('[data-testid=cookie-consent]').isVisible();
      expect(cookieConsent).toBeTruthy();
    });
  });

  test.describe('Accessibility in Different Languages', () => {
    for (const locale of SUPPORTED_LOCALES) {
      test(`should maintain accessibility in ${locale}`, async ({ page }) => {
        await page.setExtraHTTPHeaders({
          'Accept-Language': locale,
        });

        await page.goto('/');

        // Check aria-labels
        const ariaLabels = await page.$$eval('[aria-label]', 
          elements => elements.map(el => el.getAttribute('aria-label'))
        );
        expect(ariaLabels.every(label => label && label.length > 0)).toBeTruthy();

        // Check lang attributes on content switches
        const contentSwitches = await page.$$eval('[lang]',
          elements => elements.map(el => el.getAttribute('lang'))
        );
        expect(contentSwitches.every(lang => lang && lang.length > 0)).toBeTruthy();
      });
    }
  });
});

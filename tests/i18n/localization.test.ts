import { test, expect } from '@playwright/test';
import { setupI18n, validateTranslations } from '../utils/i18nUtils';

test.describe('Internationalization Tests', () => {
  test.describe('Content Localization', () => {
    test('should display content in different languages', async ({ page }) => {
      const languages = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

      for (const lang of languages) {
        await page.goto('/', {
          headers: {
            'Accept-Language': lang,
          },
        });

        // Verify language detection
        const html = await page.$eval('html', el => el.lang);
        expect(html).toBe(lang);

        // Check content translation
        const content = await page.textContent('[data-testid=main-content]');
        const validation = await validateTranslations(content, lang);
        expect(validation.missingKeys).toHaveLength(0);
      }
    });

    test('should handle language switching', async ({ page }) => {
      await page.goto('/');

      // Test language switcher
      await page.click('[data-testid=language-selector]');
      await page.click('[data-testid=lang-es]');

      // Verify URL and content update
      expect(page.url()).toContain('/es/');
      const content = await page.textContent('[data-testid=main-content]');
      expect(content).toContain('Mercado');
    });
  });

  test.describe('Date and Time Formatting', () => {
    test('should format dates according to locale', async ({ page }) => {
      const locales = [
        { code: 'en-US', format: 'MM/DD/YYYY' },
        { code: 'en-GB', format: 'DD/MM/YYYY' },
        { code: 'de-DE', format: 'DD.MM.YYYY' },
      ];

      for (const locale of locales) {
        await page.goto('/marketplace', {
          headers: {
            'Accept-Language': locale.code,
          },
        });

        const dateText = await page.textContent('[data-testid=listing-date]');
        expect(dateText).toMatch(new RegExp(locale.format.replace(/[MDY]/g, '\\d')));
      }
    });

    test('should handle time zones correctly', async ({ page }) => {
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo'];

      for (const tz of timeZones) {
        await page.goto('/analytics', {
          headers: {
            'Accept-Language': 'en-US',
          },
        });

        await page.evaluate((timezone) => {
          // @ts-ignore
          window.Intl = new Proxy(window.Intl, {
            get: (target, prop) => {
              if (prop === 'DateTimeFormat') {
                return function(...args: any[]) {
                  args[1] = { ...args[1], timeZone: timezone };
                  return new target.DateTimeFormat(...args);
                };
              }
              return target[prop as keyof typeof target];
            },
          });
        }, tz);

        const timeText = await page.textContent('[data-testid=event-time]');
        expect(timeText).toMatch(/\d{1,2}:\d{2}/);
      }
    });
  });

  test.describe('Number Formatting', () => {
    test('should format numbers according to locale', async ({ page }) => {
      const locales = [
        { code: 'en-US', decimal: '.', thousands: ',' },
        { code: 'de-DE', decimal: ',', thousands: '.' },
        { code: 'fr-FR', decimal: ',', thousands: ' ' },
      ];

      for (const locale of locales) {
        await page.goto('/marketplace', {
          headers: {
            'Accept-Language': locale.code,
          },
        });

        const priceText = await page.textContent('[data-testid=agent-price]');
        expect(priceText).toMatch(new RegExp(`\\d[${locale.thousands}]\\d{3}[${locale.decimal}]\\d{2}`));
      }
    });

    test('should handle currency formatting', async ({ page }) => {
      const currencies = [
        { locale: 'en-US', currency: 'USD', symbol: '$' },
        { locale: 'en-GB', currency: 'GBP', symbol: '£' },
        { locale: 'de-DE', currency: 'EUR', symbol: '€' },
        { locale: 'ja-JP', currency: 'JPY', symbol: '¥' },
      ];

      for (const { locale, currency, symbol } of currencies) {
        await page.goto('/marketplace', {
          headers: {
            'Accept-Language': locale,
          },
        });

        await page.evaluate((curr) => {
          localStorage.setItem('currency', curr);
        }, currency);

        await page.reload();

        const priceText = await page.textContent('[data-testid=agent-price]');
        expect(priceText).toContain(symbol);
      }
    });
  });

  test.describe('RTL Support', () => {
    test('should handle RTL languages correctly', async ({ page }) => {
      const rtlLanguages = ['ar', 'he', 'fa'];

      for (const lang of rtlLanguages) {
        await page.goto('/', {
          headers: {
            'Accept-Language': lang,
          },
        });

        // Verify RTL direction
        const dir = await page.$eval('html', el => el.dir);
        expect(dir).toBe('rtl');

        // Check layout adjustments
        const nav = await page.$eval('nav', el => window.getComputedStyle(el).direction);
        expect(nav).toBe('rtl');
      }
    });

    test('should maintain RTL layout in dynamic content', async ({ page }) => {
      await page.goto('/', {
        headers: {
          'Accept-Language': 'ar',
        },
      });

      // Test dynamic content loading
      await page.click('[data-testid=load-more]');
      
      const newContent = await page.$eval('[data-testid=dynamic-content]', 
        el => window.getComputedStyle(el).direction
      );
      expect(newContent).toBe('rtl');
    });
  });

  test.describe('Input Handling', () => {
    test('should handle input methods for different languages', async ({ page }) => {
      const inputs = [
        { lang: 'ja', text: 'こんにちは' },
        { lang: 'zh', text: '你好' },
        { lang: 'ko', text: '안녕하세요' },
      ];

      for (const { lang, text } of inputs) {
        await page.goto('/profile', {
          headers: {
            'Accept-Language': lang,
          },
        });

        await page.fill('[data-testid=name-input]', text);
        const value = await page.inputValue('[data-testid=name-input]');
        expect(value).toBe(text);
      }
    });

    test('should validate input according to locale rules', async ({ page }) => {
      const locales = [
        { code: 'en-US', phone: '(555) 123-4567' },
        { code: 'fr-FR', phone: '01 23 45 67 89' },
        { code: 'de-DE', phone: '030 12345678' },
      ];

      for (const { code, phone } of locales) {
        await page.goto('/profile', {
          headers: {
            'Accept-Language': code,
          },
        });

        await page.fill('[data-testid=phone-input]', phone);
        await page.click('[type=submit]');

        // Should not show validation error
        const error = await page.isVisible('[data-testid=phone-error]');
        expect(error).toBeFalsy();
      }
    });
  });

  test.describe('Content Adaptation', () => {
    test('should adapt content for cultural differences', async ({ page }) => {
      const cultures = [
        { locale: 'en-US', currency: 'USD', dateFormat: 'MM/DD/YYYY' },
        { locale: 'ja-JP', currency: 'JPY', dateFormat: 'YYYY年MM月DD日' },
        { locale: 'de-DE', currency: 'EUR', dateFormat: 'DD.MM.YYYY' },
      ];

      for (const culture of cultures) {
        await page.goto('/marketplace', {
          headers: {
            'Accept-Language': culture.locale,
          },
        });

        // Check culturally adapted content
        const content = await page.textContent('[data-testid=cultural-content]');
        const validation = await validateTranslations(content, culture.locale);
        expect(validation.culturallyAdapted).toBeTruthy();
      }
    });

    test('should handle locale-specific formatting', async ({ page }) => {
      const locales = [
        { code: 'en-US', address: '123 Main St, Apt 4B' },
        { code: 'ja-JP', address: '〒100-0001 東京都千代田区1-1' },
        { code: 'de-DE', address: 'Hauptstraße 123, 12345 Berlin' },
      ];

      for (const { code, address } of locales) {
        await page.goto('/profile', {
          headers: {
            'Accept-Language': code,
          },
        });

        await page.fill('[data-testid=address-input]', address);
        await page.click('[type=submit]');

        // Should validate according to locale rules
        const error = await page.isVisible('[data-testid=address-error]');
        expect(error).toBeFalsy();
      }
    });
  });
});

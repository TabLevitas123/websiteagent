import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { checkSitemap } from '../utils/seoUtils';

test.describe('SEO Tests', () => {
  test.describe('Meta Tags', () => {
    test('should have proper meta tags on all pages', async ({ page }) => {
      const routes = ['/', '/marketplace', '/analytics', '/profile'];

      for (const route of routes) {
        await page.goto(route);

        // Title and Description
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(60);

        const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));
        expect(description?.length).toBeGreaterThan(0);
        expect(description?.length).toBeLessThanOrEqual(160);

        // Open Graph Tags
        const ogTitle = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content'));
        const ogDescription = await page.$eval('meta[property="og:description"]', el => el.getAttribute('content'));
        const ogImage = await page.$eval('meta[property="og:image"]', el => el.getAttribute('content'));

        expect(ogTitle).toBeTruthy();
        expect(ogDescription).toBeTruthy();
        expect(ogImage).toBeTruthy();

        // Twitter Cards
        const twitterCard = await page.$eval('meta[name="twitter:card"]', el => el.getAttribute('content'));
        const twitterTitle = await page.$eval('meta[name="twitter:title"]', el => el.getAttribute('content'));
        const twitterDescription = await page.$eval('meta[name="twitter:description"]', el => el.getAttribute('content'));

        expect(twitterCard).toBeTruthy();
        expect(twitterTitle).toBeTruthy();
        expect(twitterDescription).toBeTruthy();
      }
    });

    test('should have canonical URLs', async ({ page }) => {
      await page.goto('/marketplace');
      const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href'));
      expect(canonical).toMatch(/^https?:\/\//);
    });
  });

  test.describe('Structured Data', () => {
    test('should have valid JSON-LD', async ({ page }) => {
      await page.goto('/marketplace');

      const jsonLd = await page.$eval('script[type="application/ld+json"]', el => el.textContent);
      expect(jsonLd).toBeTruthy();

      const parsedJsonLd = JSON.parse(jsonLd!);
      expect(parsedJsonLd['@context']).toBe('https://schema.org');
      expect(parsedJsonLd['@type']).toBeTruthy();
    });

    test('should have proper breadcrumbs markup', async ({ page }) => {
      await page.goto('/marketplace/categories/ai');

      const breadcrumbsJsonLd = await page.$eval('script[type="application/ld+json"]', el => {
        const json = JSON.parse(el.textContent!);
        return json.find((item: any) => item['@type'] === 'BreadcrumbList');
      });

      expect(breadcrumbsJsonLd).toBeTruthy();
      expect(breadcrumbsJsonLd.itemListElement.length).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility for SEO', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');

      const h1Count = await page.$$eval('h1', elements => elements.length);
      expect(h1Count).toBe(1);

      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
        elements.map(el => ({
          level: parseInt(el.tagName.substring(1)),
          text: el.textContent,
        }))
      );

      let previousLevel = 0;
      for (const heading of headings) {
        expect(heading.level - previousLevel).toBeLessThanOrEqual(1);
        previousLevel = heading.level;
      }
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto('/marketplace');

      const images = await page.$$eval('img', elements =>
        elements.map(el => ({
          src: el.getAttribute('src'),
          alt: el.getAttribute('alt'),
        }))
      );

      for (const image of images) {
        expect(image.alt).toBeTruthy();
      }
    });
  });

  test.describe('Mobile SEO', () => {
    test('should be mobile-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Viewport meta tag
      const viewport = await page.$eval('meta[name="viewport"]', el => el.getAttribute('content'));
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');

      // Touch targets
      const clickableElements = await page.$$eval('a, button', elements =>
        elements.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
          };
        })
      );

      for (const element of clickableElements) {
        expect(element.width >= 48 || element.height >= 48).toBeTruthy();
      }
    });
  });

  test.describe('Performance for SEO', () => {
    test('should have optimized images', async ({ page }) => {
      await page.goto('/marketplace');

      const images = await page.$$eval('img', elements =>
        elements.map(el => ({
          src: el.getAttribute('src'),
          width: el.getAttribute('width'),
          height: el.getAttribute('height'),
          loading: el.getAttribute('loading'),
        }))
      );

      for (const image of images) {
        expect(image.width).toBeTruthy();
        expect(image.height).toBeTruthy();
        expect(image.loading === 'lazy' || image.loading === null).toBeTruthy();
      }
    });

    test('should implement proper caching', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();

      expect(headers?.['cache-control']).toBeTruthy();
      expect(headers?.['etag'] || headers?.['last-modified']).toBeTruthy();
    });
  });

  test.describe('URL Structure', () => {
    test('should have SEO-friendly URLs', async ({ page }) => {
      const urls = [
        '/marketplace/categories/ai-agents',
        '/marketplace/agent/smart-assistant',
        '/blog/how-to-use-ai-agents',
      ];

      for (const url of urls) {
        await page.goto(url);
        expect(page.url()).not.toContain('?id=');
        expect(page.url()).toMatch(/^[a-z0-9-\/]+$/);
      }
    });

    test('should handle trailing slashes consistently', async ({ page }) => {
      await page.goto('/marketplace/');
      const normalizedUrl = page.url();
      expect(normalizedUrl.endsWith('/')).toBe(false);
    });
  });

  test.describe('Sitemap and Robots', () => {
    test('should have valid sitemap.xml', async ({ request }) => {
      const response = await request.get('/sitemap.xml');
      expect(response.ok()).toBeTruthy();

      const sitemapContent = await response.text();
      const { urls, errors } = await checkSitemap(sitemapContent);

      expect(errors.length).toBe(0);
      expect(urls.length).toBeGreaterThan(0);
    });

    test('should have valid robots.txt', async ({ request }) => {
      const response = await request.get('/robots.txt');
      expect(response.ok()).toBeTruthy();

      const robotsTxt = await response.text();
      expect(robotsTxt).toContain('Sitemap:');
      expect(robotsTxt).toContain('User-agent:');
    });
  });

  test.describe('Internationalization SEO', () => {
    test('should have proper language tags', async ({ page }) => {
      await page.goto('/');

      const htmlLang = await page.$eval('html', el => el.getAttribute('lang'));
      expect(htmlLang).toBeTruthy();

      const alternateLinks = await page.$$eval('link[rel="alternate"]', elements =>
        elements.map(el => ({
          hreflang: el.getAttribute('hreflang'),
          href: el.getAttribute('href'),
        }))
      );

      for (const link of alternateLinks) {
        expect(link.hreflang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
        expect(link.href).toBeTruthy();
      }
    });
  });
});

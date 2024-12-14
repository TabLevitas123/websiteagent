import { test, expect } from '@playwright/test';
import { performance } from 'perf_hooks';
import { collectMetrics, analyzeMetrics } from '../utils/performanceUtils';

test.describe('Performance Profiling', () => {
  test.describe('Frontend Performance', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      // Enable performance metrics collection
      await page.coverage.startJSCoverage();
      await page.coverage.startCSSCoverage();

      await page.goto('/');

      // Collect Web Vitals
      const webVitals = await page.evaluate(() => ({
        LCP: performance.getEntriesByType('largest-contentful-paint')[0],
        FID: performance.getEntriesByType('first-input')[0],
        CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0),
      }));

      // Verify thresholds
      expect(webVitals.LCP.startTime).toBeLessThan(2500); // Good LCP < 2.5s
      expect(webVitals.FID?.duration || 0).toBeLessThan(100); // Good FID < 100ms
      expect(webVitals.CLS).toBeLessThan(0.1); // Good CLS < 0.1

      // Collect coverage
      const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage(),
      ]);

      // Analyze unused code
      const unusedJS = jsCoverage.reduce((sum, entry) => sum + entry.text.length - entry.ranges.reduce((s, r) => s + (r.end - r.start), 0), 0);
      const unusedCSS = cssCoverage.reduce((sum, entry) => sum + entry.text.length - entry.ranges.reduce((s, r) => s + (r.end - r.start), 0), 0);

      expect(unusedJS / (jsCoverage.reduce((sum, entry) => sum + entry.text.length, 0))).toBeLessThan(0.3); // Max 30% unused JS
      expect(unusedCSS / (cssCoverage.reduce((sum, entry) => sum + entry.text.length, 0))).toBeLessThan(0.3); // Max 30% unused CSS
    });

    test('should optimize render performance', async ({ page }) => {
      await page.goto('/marketplace');

      // Collect paint metrics
      const paintMetrics = await page.evaluate(() => 
        performance.getEntriesByType('paint').reduce((acc, entry) => ({
          ...acc,
          [entry.name]: entry.startTime,
        }), {})
      );

      expect(paintMetrics['first-paint']).toBeLessThan(1000);
      expect(paintMetrics['first-contentful-paint']).toBeLessThan(1500);

      // Check long tasks
      const longTasks = await page.evaluate(() =>
        performance.getEntriesByType('longtask').length
      );

      expect(longTasks).toBeLessThan(5); // Max 5 long tasks during page load
    });

    test('should handle animations efficiently', async ({ page }) => {
      await page.goto('/marketplace');

      // Measure frame rate during animation
      const fps = await page.evaluate(() => {
        let frames = 0;
        const start = performance.now();
        
        return new Promise(resolve => {
          const animate = () => {
            frames++;
            if (performance.now() - start < 1000) {
              requestAnimationFrame(animate);
            } else {
              resolve(frames);
            }
          };
          requestAnimationFrame(animate);
        });
      });

      expect(fps).toBeGreaterThan(30); // Minimum 30 FPS
    });
  });

  test.describe('Backend Performance', () => {
    test('should optimize database queries', async ({ request }) => {
      const start = performance.now();
      const response = await request.get('/api/agents');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Max 500ms for query
      expect(response.ok()).toBeTruthy();

      // Check query metrics from response headers
      const queryCount = parseInt(response.headers()['x-query-count'] || '0');
      const queryTime = parseInt(response.headers()['x-query-time'] || '0');

      expect(queryCount).toBeLessThan(10); // Max 10 queries per request
      expect(queryTime).toBeLessThan(200); // Max 200ms total query time
    });

    test('should handle concurrent requests efficiently', async ({ request }) => {
      const concurrentRequests = 50;
      const start = performance.now();

      const responses = await Promise.all(
        Array(concurrentRequests).fill(null).map(() =>
          request.get('/api/agents')
        )
      );

      const duration = performance.now() - start;
      const avgResponseTime = duration / concurrentRequests;

      expect(avgResponseTime).toBeLessThan(1000); // Max 1s average response time
      expect(responses.every(r => r.ok())).toBeTruthy();
    });

    test('should optimize memory usage', async ({ request }) => {
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy load
      await Promise.all(
        Array(100).fill(null).map(() =>
          request.get('/api/metrics')
        )
      );

      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      expect(memoryIncrease).toBeLessThan(50); // Max 50MB increase
    });
  });

  test.describe('Resource Loading', () => {
    test('should optimize asset loading', async ({ page }) => {
      await page.goto('/');

      // Collect resource timing data
      const resources = await page.evaluate(() =>
        performance.getEntriesByType('resource').map(entry => ({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize,
          type: entry.initiatorType,
        }))
      );

      // Analyze resource loading
      const totalSize = resources.reduce((sum, r) => sum + (r.size || 0), 0);
      const maxDuration = Math.max(...resources.map(r => r.duration));

      expect(totalSize / 1024 / 1024).toBeLessThan(2); // Max 2MB total resources
      expect(maxDuration).toBeLessThan(1000); // Max 1s for any resource
    });

    test('should implement effective caching', async ({ page }) => {
      // First visit
      await page.goto('/');
      const initialLoadMetrics = await collectMetrics(page);

      // Second visit
      await page.reload();
      const cachedLoadMetrics = await collectMetrics(page);

      expect(cachedLoadMetrics.domContentLoaded).toBeLessThan(initialLoadMetrics.domContentLoaded * 0.7);
    });
  });

  test.describe('Memory Management', () => {
    test('should prevent memory leaks', async ({ page }) => {
      await page.goto('/marketplace');

      const initialHeapSize = await page.evaluate(() => 
        performance.memory?.usedJSHeapSize
      );

      // Simulate user interactions
      for (let i = 0; i < 20; i++) {
        await page.click('[data-testid=load-more]');
        await page.waitForTimeout(100);
      }

      const finalHeapSize = await page.evaluate(() =>
        performance.memory?.usedJSHeapSize
      );

      const heapGrowth = (finalHeapSize - initialHeapSize) / initialHeapSize;
      expect(heapGrowth).toBeLessThan(0.5); // Max 50% heap growth
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.goto('/analytics');

      // Load large dataset
      await page.click('[data-testid=load-large-dataset]');

      const metrics = await page.evaluate(() => ({
        fps: performance.now() / performance.getEntriesByType('frame').length,
        memory: performance.memory?.usedJSHeapSize,
      }));

      expect(metrics.fps).toBeGreaterThan(30);
      expect(metrics.memory).toBeLessThan(100 * 1024 * 1024); // Max 100MB heap
    });
  });

  test.describe('Network Optimization', () => {
    test('should implement effective compression', async ({ request }) => {
      const response = await request.get('/', {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      expect(response.headers()['content-encoding']).toBeTruthy();
      expect(parseInt(response.headers()['content-length'] || '0')).toBeLessThan(50 * 1024); // Max 50KB compressed
    });

    test('should optimize API payload size', async ({ request }) => {
      const response = await request.get('/api/agents');
      const data = await response.json();
      const size = new TextEncoder().encode(JSON.stringify(data)).length;

      expect(size).toBeLessThan(100 * 1024); // Max 100KB response
    });
  });
});

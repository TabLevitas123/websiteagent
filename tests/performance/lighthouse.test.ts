import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';
import { startFlow } from 'lighthouse/lighthouse-core/fraggle-rock/api.js';
import { expect } from 'chai';

describe('Lighthouse Performance Tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  const BASE_URL = 'http://localhost:3000';

  before(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
  });

  after(async () => {
    await browser.close();
  });

  const performAudit = async (url: string, options = {}) => {
    const { lhr } = await lighthouse(url, {
      port: (new URL(browser.wsEndpoint())).port,
      output: 'json',
      logLevel: 'error',
      ...options,
    });
    return lhr;
  };

  describe('Page Load Performance', () => {
    it('should meet performance budget for home page', async () => {
      const result = await performAudit(`${BASE_URL}/`);
      
      expect(result.categories.performance.score).to.be.above(0.9);
      expect(result.audits['first-contentful-paint'].score).to.be.above(0.9);
      expect(result.audits['speed-index'].score).to.be.above(0.9);
      expect(result.audits['largest-contentful-paint'].score).to.be.above(0.9);
      expect(result.audits['interactive'].score).to.be.above(0.9);
      expect(result.audits['total-blocking-time'].score).to.be.above(0.9);
    });

    it('should meet performance budget for marketplace', async () => {
      const result = await performAudit(`${BASE_URL}/marketplace`);
      
      expect(result.categories.performance.score).to.be.above(0.85);
      expect(result.audits['server-response-time'].score).to.be.above(0.9);
      expect(result.audits['render-blocking-resources'].score).to.be.above(0.8);
    });

    it('should meet performance budget for analytics dashboard', async () => {
      const result = await performAudit(`${BASE_URL}/analytics`);
      
      expect(result.categories.performance.score).to.be.above(0.85);
      expect(result.audits['total-byte-weight'].score).to.be.above(0.8);
      expect(result.audits['mainthread-work-breakdown'].score).to.be.above(0.8);
    });
  });

  describe('User Flow Performance', () => {
    it('should maintain performance during agent purchase flow', async () => {
      const flow = await startFlow(page, {
        name: 'Agent Purchase Flow',
      });

      // Navigate to marketplace
      await flow.navigate(`${BASE_URL}/marketplace`, {
        stepName: 'Navigate to Marketplace',
      });

      // Search for agent
      await page.type('[data-testid=search-input]', 'test agent');
      await flow.snapshot({
        stepName: 'Search Results',
      });

      // View agent details
      await page.click('[data-testid=agent-card]');
      await flow.snapshot({
        stepName: 'Agent Details',
      });

      // Complete purchase
      await page.click('[data-testid=buy-now-btn]');
      await flow.snapshot({
        stepName: 'Purchase Completion',
      });

      const flowResult = await flow.createReport();
      
      expect(flowResult.steps[0].lhr.categories.performance.score).to.be.above(0.85);
      expect(flowResult.steps[1].lhr.categories.performance.score).to.be.above(0.85);
      expect(flowResult.steps[2].lhr.categories.performance.score).to.be.above(0.85);
      expect(flowResult.steps[3].lhr.categories.performance.score).to.be.above(0.85);
    });
  });

  describe('Resource Optimization', () => {
    it('should optimize images', async () => {
      const result = await performAudit(`${BASE_URL}/marketplace`);
      
      expect(result.audits['modern-image-formats'].score).to.be.above(0.9);
      expect(result.audits['uses-optimized-images'].score).to.be.above(0.9);
      expect(result.audits['uses-responsive-images'].score).to.be.above(0.9);
    });

    it('should optimize JavaScript bundles', async () => {
      const result = await performAudit(`${BASE_URL}/`);
      
      expect(result.audits['unminified-javascript'].score).to.be.above(0.9);
      expect(result.audits['unused-javascript'].score).to.be.above(0.8);
      expect(result.audits['efficient-animated-content'].score).to.be.above(0.9);
    });

    it('should implement proper caching', async () => {
      const result = await performAudit(`${BASE_URL}/`);
      
      expect(result.audits['uses-long-cache-ttl'].score).to.be.above(0.9);
      expect(result.audits['uses-http2'].score).to.be.above(0.9);
    });
  });

  describe('Mobile Performance', () => {
    it('should maintain performance on mobile devices', async () => {
      const mobileConfig = {
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      };

      const result = await performAudit(`${BASE_URL}/`, mobileConfig);
      
      expect(result.categories.performance.score).to.be.above(0.8);
      expect(result.audits['first-contentful-paint'].score).to.be.above(0.8);
      expect(result.audits['speed-index'].score).to.be.above(0.8);
    });
  });

  describe('Progressive Web App', () => {
    it('should meet PWA criteria', async () => {
      const result = await performAudit(`${BASE_URL}/`);
      
      expect(result.categories.pwa.score).to.be.above(0.9);
      expect(result.audits['installable-manifest'].score).to.be.above(0.9);
      expect(result.audits['service-worker'].score).to.be.above(0.9);
      expect(result.audits['works-offline'].score).to.be.above(0.9);
    });
  });
});

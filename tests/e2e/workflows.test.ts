import { test, expect } from '@playwright/test';
import { mockWeb3Provider, mockPayment } from '../utils/testUtils';
import { generateTestData } from '../utils/dataUtils';

test.describe('End-to-End Workflows', () => {
  test.describe('User Journey', () => {
    test('complete user onboarding flow', async ({ page }) => {
      await page.goto('/');

      // Connect wallet
      await mockWeb3Provider(page);
      await page.click('[data-testid=connect-wallet-btn]');
      await page.waitForSelector('[data-testid=wallet-connected]');

      // Complete profile
      await page.click('[data-testid=complete-profile-btn]');
      await page.fill('[data-testid=name-input]', 'Test User');
      await page.fill('[data-testid=email-input]', 'test@example.com');
      await page.selectOption('[data-testid=category-select]', 'developer');
      await page.click('[data-testid=save-profile-btn]');

      // Verify welcome email
      const emails = await page.evaluate(() => window.testEmails);
      expect(emails[0].subject).toContain('Welcome');

      // Check dashboard access
      await page.goto('/dashboard');
      expect(page.url()).toContain('/dashboard');
    });

    test('marketplace purchase workflow', async ({ page }) => {
      await page.goto('/marketplace');

      // Browse and filter
      await page.click('[data-testid=category-ai]');
      await page.selectOption('[data-testid=sort-select]', 'price-asc');
      await page.fill('[data-testid=search-input]', 'test agent');
      await page.click('[data-testid=search-button]');

      // Select agent
      await page.click('[data-testid=agent-card]');
      await page.waitForSelector('[data-testid=agent-details]');

      // Purchase process
      await mockPayment(page);
      await page.click('[data-testid=buy-button]');
      await page.waitForSelector('[data-testid=payment-success]');

      // Verify purchase
      await page.goto('/profile/purchases');
      const purchases = await page.$$('[data-testid=purchase-item]');
      expect(purchases.length).toBeGreaterThan(0);
    });
  });

  test.describe('Agent Management', () => {
    test('agent creation and deployment workflow', async ({ page }) => {
      await page.goto('/dashboard');

      // Create agent
      await page.click('[data-testid=create-agent-btn]');
      await page.fill('[data-testid=agent-name]', 'Test Agent');
      await page.fill('[data-testid=agent-description]', 'Test Description');
      await page.setInputFiles('[data-testid=agent-image]', 'test.jpg');
      await page.fill('[data-testid=agent-price]', '10');
      await page.click('[data-testid=save-agent-btn]');

      // Configure agent
      await page.click('[data-testid=configure-btn]');
      await page.fill('[data-testid=api-endpoint]', 'https://api.test.com');
      await page.fill('[data-testid=api-key]', 'test-key');
      await page.click('[data-testid=test-connection-btn]');
      await page.waitForSelector('[data-testid=connection-success]');
      await page.click('[data-testid=save-config-btn]');

      // Deploy agent
      await page.click('[data-testid=deploy-btn]');
      await page.waitForSelector('[data-testid=deployment-success]');

      // Verify deployment
      const status = await page.textContent('[data-testid=agent-status]');
      expect(status).toBe('Active');
    });

    test('agent monitoring and maintenance workflow', async ({ page }) => {
      await page.goto('/dashboard/agents');

      // Monitor performance
      await page.click('[data-testid=agent-stats]');
      const metrics = await page.$$('[data-testid=metric-value]');
      expect(metrics.length).toBeGreaterThan(0);

      // Update agent
      await page.click('[data-testid=edit-agent-btn]');
      await page.fill('[data-testid=agent-description]', 'Updated Description');
      await page.click('[data-testid=save-changes-btn]');

      // Verify update
      await page.reload();
      const description = await page.textContent('[data-testid=agent-description]');
      expect(description).toBe('Updated Description');
    });
  });

  test.describe('Analytics and Reporting', () => {
    test('complete analytics workflow', async ({ page }) => {
      await page.goto('/analytics');

      // Generate test data
      await generateTestData();

      // View different time periods
      const periods = ['day', 'week', 'month', 'year'];
      for (const period of periods) {
        await page.click(`[data-testid=period-${period}]`);
        await page.waitForSelector('[data-testid=chart-loaded]');
        
        const data = await page.$$('[data-testid=data-point]');
        expect(data.length).toBeGreaterThan(0);
      }

      // Export reports
      await page.click('[data-testid=export-btn]');
      const download = await page.waitForEvent('download');
      const filename = download.suggestedFilename();
      expect(filename).toContain('analytics');
    });

    test('revenue tracking workflow', async ({ page }) => {
      await page.goto('/analytics/revenue');

      // Filter by date
      await page.fill('[data-testid=date-from]', '2024-01-01');
      await page.fill('[data-testid=date-to]', '2024-12-31');
      await page.click('[data-testid=apply-filter]');

      // Check metrics
      const revenue = await page.textContent('[data-testid=total-revenue]');
      expect(parseFloat(revenue!)).toBeGreaterThan(0);

      // Generate report
      await page.click('[data-testid=generate-report]');
      await page.waitForSelector('[data-testid=report-ready]');
    });
  });

  test.describe('Integration Workflows', () => {
    test('API integration workflow', async ({ page }) => {
      await page.goto('/settings/integrations');

      // Generate API key
      await page.click('[data-testid=generate-key-btn]');
      const apiKey = await page.textContent('[data-testid=api-key]');
      expect(apiKey).toBeTruthy();

      // Test API endpoints
      const endpoints = ['/agents', '/metrics', '/users'];
      for (const endpoint of endpoints) {
        const response = await page.request.get(`/api${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        expect(response.ok()).toBeTruthy();
      }
    });

    test('webhook configuration workflow', async ({ page }) => {
      await page.goto('/settings/webhooks');

      // Configure webhook
      await page.click('[data-testid=add-webhook-btn]');
      await page.fill('[data-testid=webhook-url]', 'https://test.com/webhook');
      await page.selectOption('[data-testid=event-type]', 'agent.created');
      await page.click('[data-testid=save-webhook-btn]');

      // Test webhook
      await page.click('[data-testid=test-webhook-btn]');
      await page.waitForSelector('[data-testid=webhook-success]');
    });
  });

  test.describe('Error Recovery Workflows', () => {
    test('payment failure recovery', async ({ page }) => {
      await page.goto('/marketplace');

      // Initiate purchase with failing payment
      await page.click('[data-testid=agent-card]');
      await mockPayment(page, { shouldFail: true });
      await page.click('[data-testid=buy-button]');
      await page.waitForSelector('[data-testid=payment-error]');

      // Retry with successful payment
      await mockPayment(page, { shouldFail: false });
      await page.click('[data-testid=retry-payment-btn]');
      await page.waitForSelector('[data-testid=payment-success]');
    });

    test('deployment failure recovery', async ({ page }) => {
      await page.goto('/dashboard/agents');

      // Trigger failed deployment
      await page.click('[data-testid=deploy-btn]');
      await page.waitForSelector('[data-testid=deployment-error]');

      // View logs
      await page.click('[data-testid=view-logs-btn]');
      const logs = await page.textContent('[data-testid=error-logs]');
      expect(logs).toBeTruthy();

      // Fix and redeploy
      await page.click('[data-testid=fix-config-btn]');
      await page.fill('[data-testid=api-endpoint]', 'https://fixed-api.test.com');
      await page.click('[data-testid=redeploy-btn]');
      await page.waitForSelector('[data-testid=deployment-success]');
    });
  });
});

import { test, expect } from '@playwright/test';
import { mockServices, setupTestDatabase } from '../utils/testUtils';
import { TestAgents, TestMetrics } from '../utils/testData';

test.describe('Service Integration Tests', () => {
  test.describe('Database Integration', () => {
    test('should handle database transactions correctly', async ({ request }) => {
      const db = await setupTestDatabase();

      // Test atomic transactions
      const response = await request.post('/api/agents/batch', {
        data: {
          agents: [
            { name: 'Agent 1', status: 'active' },
            { name: 'Agent 2', status: 'invalid' }, // Should cause rollback
          ],
        },
      });

      expect(response.status()).toBe(400);

      // Verify rollback
      const agents = await db.query('SELECT * FROM agents');
      expect(agents.rows.length).toBe(0);
    });

    test('should handle database connection pool', async ({ request }) => {
      // Simulate high concurrency
      const connections = 50;
      const queries = Array(connections).fill(null).map(() =>
        request.get('/api/agents')
      );

      const responses = await Promise.all(queries);
      expect(responses.every(r => r.ok())).toBeTruthy();

      // Check connection pool metrics
      const metrics = await request.get('/api/metrics/db');
      const pool = await metrics.json();
      expect(pool.active).toBeLessThan(connections);
      expect(pool.waiting).toBe(0);
    });

    test('should handle database migrations', async ({ request }) => {
      const db = await setupTestDatabase();

      // Run migrations
      await db.migrate.latest();

      // Verify schema
      const tables = await db.raw('SELECT table_name FROM information_schema.tables');
      expect(tables.rows).toContainEqual({ table_name: 'agents' });
      expect(tables.rows).toContainEqual({ table_name: 'metrics' });

      // Test backwards compatibility
      await db.migrate.rollback();
      const response = await request.get('/api/agents');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Cache Integration', () => {
    test('should integrate with Redis cache', async ({ request }) => {
      const redis = await mockServices.redis();

      // Test cache hit
      await redis.set('agents:list', JSON.stringify(TestAgents));
      const response1 = await request.get('/api/agents');
      expect(response1.headers()['x-cache']).toBe('HIT');

      // Test cache invalidation
      await request.post('/api/agents', {
        data: { name: 'New Agent' },
      });
      const cacheKey = await redis.get('agents:list');
      expect(cacheKey).toBeNull();

      // Test cache miss
      const response2 = await request.get('/api/agents');
      expect(response2.headers()['x-cache']).toBe('MISS');
    });

    test('should handle cache failures gracefully', async ({ request }) => {
      const redis = await mockServices.redis();

      // Simulate Redis failure
      await redis.disconnect();

      // System should continue working
      const response = await request.get('/api/agents');
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['x-cache']).toBe('BYPASS');
    });
  });

  test.describe('Message Queue Integration', () => {
    test('should process background jobs', async ({ request }) => {
      const queue = await mockServices.queue();

      // Create job
      await request.post('/api/agents/import', {
        data: { agents: TestAgents },
      });

      // Verify job queued
      const jobs = await queue.getJobs(['import']);
      expect(jobs.length).toBe(1);

      // Process job
      await queue.process();

      // Verify results
      const response = await request.get('/api/agents');
      const agents = await response.json();
      expect(agents.length).toBe(TestAgents.length);
    });

    test('should handle failed jobs', async ({ request }) => {
      const queue = await mockServices.queue();

      // Create failing job
      await request.post('/api/agents/import', {
        data: { agents: [{ name: null }] },
      });

      // Process job
      await queue.process();

      // Verify retry
      const failed = await queue.getFailed();
      expect(failed.length).toBe(1);
      expect(failed[0].attemptsMade).toBeGreaterThan(0);
    });
  });

  test.describe('External API Integration', () => {
    test('should integrate with payment provider', async ({ request }) => {
      const stripe = await mockServices.stripe();

      // Create payment intent
      const response = await request.post('/api/payments', {
        data: {
          amount: 1000,
          currency: 'usd',
        },
      });
      expect(response.ok()).toBeTruthy();

      // Verify Stripe calls
      expect(stripe.paymentIntents.create).toHaveBeenCalled();

      // Test webhook
      const webhookResponse = await request.post('/api/webhooks/stripe', {
        data: {
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_123' } },
        },
      });
      expect(webhookResponse.ok()).toBeTruthy();
    });

    test('should handle API timeouts', async ({ request }) => {
      const stripe = await mockServices.stripe({
        simulateTimeout: true,
      });

      const response = await request.post('/api/payments', {
        data: {
          amount: 1000,
          currency: 'usd',
        },
      });

      expect(response.status()).toBe(503);
      expect(await response.json()).toHaveProperty('error');
    });
  });

  test.describe('Metrics Integration', () => {
    test('should collect and aggregate metrics', async ({ request }) => {
      const prometheus = await mockServices.prometheus();

      // Generate test metrics
      for (const metric of TestMetrics) {
        await request.post('/api/metrics', {
          data: metric,
        });
      }

      // Query metrics
      const response = await request.get('/metrics');
      const metrics = await response.text();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('response_time_seconds');
    });

    test('should handle custom metrics', async ({ request }) => {
      const prometheus = await mockServices.prometheus();

      // Record custom metric
      await request.post('/api/metrics/custom', {
        data: {
          name: 'agent_execution_time',
          value: 123,
          labels: { agent_id: '123' },
        },
      });

      // Query custom metrics
      const response = await request.get('/metrics');
      const metrics = await response.text();

      expect(metrics).toContain('agent_execution_time');
      expect(metrics).toContain('agent_id="123"');
    });
  });

  test.describe('Search Integration', () => {
    test('should integrate with Elasticsearch', async ({ request }) => {
      const elastic = await mockServices.elasticsearch();

      // Index test data
      await request.post('/api/agents/index', {
        data: { agents: TestAgents },
      });

      // Verify indexing
      const indexed = await elastic.search({
        index: 'agents',
        body: { query: { match_all: {} } },
      });
      expect(indexed.hits.total.value).toBe(TestAgents.length);

      // Test search
      const response = await request.get('/api/agents/search', {
        params: { q: 'test' },
      });
      expect(response.ok()).toBeTruthy();
    });

    test('should handle search errors', async ({ request }) => {
      const elastic = await mockServices.elasticsearch({
        simulateError: true,
      });

      // System should fallback to database search
      const response = await request.get('/api/agents/search', {
        params: { q: 'test' },
      });
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['x-search-fallback']).toBe('true');
    });
  });

  test.describe('File Storage Integration', () => {
    test('should integrate with S3', async ({ request }) => {
      const s3 = await mockServices.s3();

      // Upload file
      const response = await request.post('/api/files', {
        data: {
          name: 'test.jpg',
          content: Buffer.from('test'),
        },
      });
      expect(response.ok()).toBeTruthy();

      // Verify S3 upload
      expect(s3.upload).toHaveBeenCalled();

      // Test download
      const downloadResponse = await request.get('/api/files/test.jpg');
      expect(downloadResponse.ok()).toBeTruthy();
    });

    test('should handle large files', async ({ request }) => {
      const s3 = await mockServices.s3();

      // Create large file
      const largeFile = Buffer.alloc(100 * 1024 * 1024); // 100MB

      // Upload with multipart
      const response = await request.post('/api/files', {
        data: {
          name: 'large.file',
          content: largeFile,
        },
      });
      expect(response.ok()).toBeTruthy();

      // Verify multipart upload
      expect(s3.createMultipartUpload).toHaveBeenCalled();
    });
  });
});

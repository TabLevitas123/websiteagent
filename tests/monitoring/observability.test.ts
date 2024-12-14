import { test, expect } from '@playwright/test';
import { setupMonitoring, collectTraces } from '../utils/monitoringUtils';

test.describe('Monitoring and Observability', () => {
  test.describe('Distributed Tracing', () => {
    test('should trace request lifecycle', async ({ request }) => {
      const tracer = await setupMonitoring();

      // Make request with tracing
      const response = await request.get('/api/agents', {
        headers: {
          'x-trace-id': 'test-trace-1',
        },
      });

      // Collect traces
      const traces = await collectTraces('test-trace-1');
      
      // Verify trace completeness
      expect(traces.spans.length).toBeGreaterThan(0);
      expect(traces.spans).toContainEqual(expect.objectContaining({
        name: 'http_request',
        attributes: expect.objectContaining({
          'http.method': 'GET',
          'http.route': '/api/agents',
        }),
      }));

      // Verify trace propagation
      expect(traces.spans).toContainEqual(expect.objectContaining({
        name: 'database_query',
        parentId: expect.any(String),
      }));
    });

    test('should trace error scenarios', async ({ request }) => {
      const tracer = await setupMonitoring();

      // Trigger error scenario
      const response = await request.get('/api/invalid', {
        headers: {
          'x-trace-id': 'test-trace-2',
        },
      });

      // Collect error traces
      const traces = await collectTraces('test-trace-2');

      // Verify error tracking
      expect(traces.spans).toContainEqual(expect.objectContaining({
        name: 'error',
        attributes: expect.objectContaining({
          'error.type': '404',
        }),
      }));
    });
  });

  test.describe('Metrics Collection', () => {
    test('should collect system metrics', async ({ request }) => {
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 5000));

      const response = await request.get('/metrics');
      const metrics = await response.text();

      // Verify system metrics
      expect(metrics).toContain('process_cpu_seconds_total');
      expect(metrics).toContain('process_resident_memory_bytes');
      expect(metrics).toContain('process_heap_bytes');
    });

    test('should track custom business metrics', async ({ request }) => {
      // Generate some business activity
      await request.post('/api/agents', {
        data: { name: 'Test Agent' },
      });

      const response = await request.get('/metrics');
      const metrics = await response.text();

      // Verify business metrics
      expect(metrics).toContain('agents_created_total');
      expect(metrics).toContain('agent_execution_duration_seconds');
    });
  });

  test.describe('Log Analysis', () => {
    test('should maintain structured logging', async ({ request }) => {
      // Trigger loggable action
      const response = await request.post('/api/agents/execute', {
        data: { id: 'test-agent' },
      });

      // Fetch recent logs
      const logs = await request.get('/api/logs').then(r => r.json());

      // Verify log structure
      expect(logs[0]).toMatchObject({
        timestamp: expect.any(String),
        level: expect.stringMatching(/info|error|warn/),
        message: expect.any(String),
        metadata: expect.any(Object),
      });
    });

    test('should correlate logs with traces', async ({ request }) => {
      const traceId = 'test-trace-3';

      // Execute traced action
      await request.post('/api/agents/execute', {
        data: { id: 'test-agent' },
        headers: {
          'x-trace-id': traceId,
        },
      });

      // Fetch correlated logs
      const logs = await request.get(`/api/logs?traceId=${traceId}`).then(r => r.json());

      // Verify correlation
      expect(logs.every(log => log.metadata.traceId === traceId)).toBeTruthy();
    });
  });

  test.describe('Health Checks', () => {
    test('should implement comprehensive health checks', async ({ request }) => {
      const response = await request.get('/health');
      const health = await response.json();

      // Verify health check components
      expect(health).toMatchObject({
        status: 'healthy',
        components: {
          database: { status: 'up' },
          cache: { status: 'up' },
          messageQueue: { status: 'up' },
          storage: { status: 'up' },
        },
        metrics: {
          uptime: expect.any(Number),
          responseTime: expect.any(Number),
          errorRate: expect.any(Number),
        },
      });
    });

    test('should detect degraded states', async ({ request }) => {
      // Simulate cache failure
      await request.post('/api/test/fault-injection', {
        data: { component: 'cache', status: 'down' },
      });

      const response = await request.get('/health');
      const health = await response.json();

      // Verify degraded state detection
      expect(health).toMatchObject({
        status: 'degraded',
        components: {
          cache: { 
            status: 'down',
            error: expect.any(String),
          },
        },
      });
    });
  });

  test.describe('Alerting', () => {
    test('should trigger alerts on thresholds', async ({ request }) => {
      // Generate high error rate
      await Promise.all(
        Array(10).fill(null).map(() =>
          request.get('/api/invalid')
        )
      );

      // Check alerts
      const alerts = await request.get('/api/alerts').then(r => r.json());

      // Verify alert generation
      expect(alerts).toContainEqual(expect.objectContaining({
        type: 'ErrorRateHigh',
        severity: 'critical',
        threshold: expect.any(Number),
        current: expect.any(Number),
      }));
    });

    test('should track alert resolution', async ({ request }) => {
      // Trigger and resolve alert
      await request.post('/api/test/fault-injection', {
        data: { component: 'database', status: 'down' },
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      await request.post('/api/test/fault-injection', {
        data: { component: 'database', status: 'up' },
      });

      // Check alert history
      const history = await request.get('/api/alerts/history').then(r => r.json());

      // Verify alert lifecycle
      const alert = history[0];
      expect(alert).toMatchObject({
        type: 'DatabaseConnectivity',
        triggered: expect.any(String),
        resolved: expect.any(String),
        duration: expect.any(Number),
      });
    });
  });

  test.describe('Resource Monitoring', () => {
    test('should monitor resource utilization', async ({ request }) => {
      // Generate load
      await Promise.all(
        Array(50).fill(null).map(() =>
          request.get('/api/agents')
        )
      );

      const metrics = await request.get('/metrics/resources').then(r => r.json());

      // Verify resource metrics
      expect(metrics).toMatchObject({
        cpu: {
          usage: expect.any(Number),
          cores: expect.any(Number),
        },
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          heap: expect.any(Number),
        },
        disk: {
          used: expect.any(Number),
          total: expect.any(Number),
        },
        network: {
          rx: expect.any(Number),
          tx: expect.any(Number),
        },
      });
    });

    test('should track resource trends', async ({ request }) => {
      const start = new Date(Date.now() - 3600000); // 1 hour ago
      const end = new Date();

      const trends = await request.get('/metrics/trends', {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }).then(r => r.json());

      // Verify trend data
      expect(trends).toMatchObject({
        cpu: expect.arrayContaining([{
          timestamp: expect.any(String),
          value: expect.any(Number),
        }]),
        memory: expect.arrayContaining([{
          timestamp: expect.any(String),
          value: expect.any(Number),
        }]),
      });
    });
  });
});

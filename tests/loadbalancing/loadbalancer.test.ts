import { test, expect } from '@playwright/test';
import { createCluster, monitorNodes } from '../utils/clusterUtils';
import * as k6 from 'k6';
import { check, sleep } from 'k6/http';

test.describe('Load Balancer Tests', () => {
  test.describe('Health Checks', () => {
    test('should detect unhealthy nodes', async ({ request }) => {
      const nodes = await monitorNodes();
      
      for (const node of nodes) {
        const health = await request.get(`${node.url}/health`);
        expect(health.ok()).toBeTruthy();
        
        const metrics = await health.json();
        expect(metrics.status).toBe('healthy');
        expect(metrics.uptime).toBeGreaterThan(0);
        expect(metrics.memory).toBeLessThan(80); // Memory usage < 80%
        expect(metrics.cpu).toBeLessThan(80); // CPU usage < 80%
      }
    });

    test('should handle node failure gracefully', async ({ request }) => {
      const cluster = await createCluster(3); // Create 3-node cluster
      
      // Simulate node failure
      await cluster.killNode(1);
      
      // Verify traffic redistribution
      const responses = await Promise.all(
        Array(50).fill(null).map(() => request.get('/api/agents'))
      );
      
      expect(responses.every(r => r.ok())).toBeTruthy();
      
      // Check load distribution
      const distributions = await cluster.getLoadDistribution();
      const variance = Math.max(...distributions) - Math.min(...distributions);
      expect(variance).toBeLessThan(20); // Max 20% variance in load
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session affinity', async ({ request }) => {
      const sessionId = 'test-session-123';
      
      // Send multiple requests with same session
      const responses = await Promise.all(
        Array(10).fill(null).map(() =>
          request.get('/api/user', {
            headers: { 'Cookie': `sessionId=${sessionId}` }
          })
        )
      );
      
      // Verify all requests went to same node
      const serverIds = responses.map(r => r.headers()['x-server-id']);
      expect(new Set(serverIds).size).toBe(1);
    });

    test('should handle session redistribution', async ({ request }) => {
      const cluster = await createCluster(3);
      
      // Create active sessions
      const sessions = await Promise.all(
        Array(100).fill(null).map(() =>
          request.post('/api/auth/login', {
            data: { username: 'test', password: 'test' }
          })
        )
      );
      
      // Simulate node failure
      await cluster.killNode(1);
      
      // Verify sessions are still accessible
      const sessionChecks = await Promise.all(
        sessions.map(s =>
          request.get('/api/user', {
            headers: { 'Authorization': s.headers()['authorization'] }
          })
        )
      );
      
      expect(sessionChecks.every(r => r.ok())).toBeTruthy();
    });
  });

  test.describe('Load Distribution', () => {
    test('should distribute load evenly', async ({ request }) => {
      const cluster = await createCluster(4);
      
      // Generate load
      const requests = 1000;
      const responses = await Promise.all(
        Array(requests).fill(null).map(() =>
          request.get('/api/agents')
        )
      );
      
      // Analyze distribution
      const distribution = await cluster.getLoadDistribution();
      const expectedLoad = requests / 4;
      
      distribution.forEach(load => {
        expect(Math.abs(load - expectedLoad)).toBeLessThan(expectedLoad * 0.2);
      });
    });

    test('should handle traffic spikes', async ({ request }) => {
      const cluster = await createCluster(3);
      
      // Monitor initial metrics
      const initialMetrics = await cluster.getNodeMetrics();
      
      // Generate traffic spike
      const spikeResponses = await Promise.all(
        Array(500).fill(null).map(() =>
          request.get('/api/agents')
        )
      );
      
      // Check response quality during spike
      expect(spikeResponses.every(r => r.ok())).toBeTruthy();
      
      // Verify auto-scaling if configured
      const postSpikeNodes = await cluster.getActiveNodes();
      expect(postSpikeNodes.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Failover Scenarios', () => {
    test('should handle primary node failure', async ({ request }) => {
      const cluster = await createCluster(3);
      
      // Identify primary node
      const primary = await cluster.getPrimaryNode();
      
      // Force primary failure
      await cluster.killNode(primary.id);
      
      // Verify new primary election
      const newPrimary = await cluster.getPrimaryNode();
      expect(newPrimary.id).not.toBe(primary.id);
      
      // Check system functionality
      const response = await request.post('/api/agents', {
        data: { name: 'test-agent' }
      });
      expect(response.ok()).toBeTruthy();
    });

    test('should maintain data consistency during failover', async ({ request }) => {
      const cluster = await createCluster(3);
      
      // Create test data
      const createResponse = await request.post('/api/agents', {
        data: { name: 'consistency-test-agent' }
      });
      const agentId = createResponse.json().id;
      
      // Force node failure
      await cluster.killNode(1);
      
      // Verify data accessibility
      const getResponse = await request.get(`/api/agents/${agentId}`);
      expect(getResponse.ok()).toBeTruthy();
      expect(getResponse.json().name).toBe('consistency-test-agent');
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle concurrent node joins and failures', async ({ request }) => {
      const cluster = await createCluster(5);
      
      // Simulate concurrent events
      await Promise.all([
        cluster.addNode(),
        cluster.killNode(2),
        cluster.addNode(),
        cluster.killNode(3)
      ]);

      // Verify cluster stability
      const health = await request.get('/api/cluster/health');
      expect(health.ok()).toBeTruthy();
      
      const stats = await health.json();
      expect(stats.activeNodes).toBe(4);
      expect(stats.rebalancing).toBe(false);
    });

    test('should maintain performance during rebalancing', async ({ request }) => {
      const cluster = await createCluster(3);
      const baselineLatency = await cluster.measureLatency();
      
      // Trigger rebalancing
      await cluster.addNode();
      
      // Measure latency during rebalancing
      const rebalancingLatency = await cluster.measureLatency();
      expect(rebalancingLatency).toBeLessThan(baselineLatency * 1.5); // Max 50% slowdown
    });
  });

  test.describe('Security Integration', () => {
    test('should maintain session persistence during DDoS mitigation', async ({ request }) => {
      const cluster = await createCluster(3);
      const sessionId = 'test-session-456';
      
      // Start DDoS simulation
      await cluster.simulateDDoS();
      
      // Verify session stickiness
      const responses = await Promise.all(
        Array(20).fill(null).map(() =>
          request.get('/api/protected', {
            headers: { 'Cookie': `sessionId=${sessionId}` }
          })
        )
      );
      
      const nodeIds = responses.map(r => r.headers()['x-served-by']);
      expect(new Set(nodeIds).size).toBe(1); // All requests served by same node
    });
  });

  test.describe('Complex Failures', () => {
    test('should handle network partition scenarios', async ({ request }) => {
      const cluster = await createCluster(4);
      
      // Simulate network partition
      await cluster.createPartition([[0, 1], [2, 3]]);
      
      // Verify both partitions are functional
      const partition1 = await request.get(`${cluster.getNodeUrl(0)}/health`);
      const partition2 = await request.get(`${cluster.getNodeUrl(2)}/health`);
      
      expect(partition1.ok()).toBeTruthy();
      expect(partition2.ok()).toBeTruthy();
      
      // Heal partition
      await cluster.healPartition();
      
      // Verify cluster convergence
      const health = await request.get('/api/cluster/health');
      expect(health.ok()).toBeTruthy();
      expect(health.json().status).toBe('healthy');
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain response times under sustained load', async ({ request }) => {
      const cluster = await createCluster(3);
      const baselineLatency = await cluster.measureLatency();
      
      // Generate sustained load
      const loadGenerator = await cluster.startLoadGenerator({
        rps: 1000,
        duration: '30s'
      });
      
      // Sample latencies during load
      const samples = await cluster.sampleLatencies(10);
      const avgLatency = samples.reduce((a, b) => a + b, 0) / samples.length;
      
      expect(avgLatency).toBeLessThan(baselineLatency * 2); // Max 100% slowdown under load
      
      // Verify error rates
      const stats = await loadGenerator.getStats();
      expect(stats.errorRate).toBeLessThan(0.001); // Max 0.1% errors
    });
  });

  test.describe('Advanced Load Distribution', () => {
    test('should respect node weights and capacity', async ({ request }) => {
      const cluster = await createCluster(3, {
        weights: [2, 1, 1] // First node has double capacity
      });
      
      // Generate balanced load
      const responses = await Promise.all(
        Array(400).fill(null).map(() => request.get('/api/agents'))
      );
      
      const distribution = await cluster.getLoadDistribution();
      expect(distribution[0]).toBeGreaterThan(distribution[1] * 1.8); // ~2x load on first node
      expect(Math.abs(distribution[1] - distribution[2])).toBeLessThan(5); // Similar load on other nodes
    });

    test('should adapt to node performance metrics', async ({ request }) => {
      const cluster = await createCluster(3);
      
      // Simulate CPU pressure on one node
      await cluster.simulateLoad({
        nodeId: 0,
        cpu: 80,
        memory: 70
      });
      
      // Generate traffic and check distribution
      const responses = await Promise.all(
        Array(100).fill(null).map(() => request.get('/api/agents'))
      );
      
      const distribution = await cluster.getLoadDistribution();
      expect(distribution[0]).toBeLessThan(distribution[1] * 0.7); // Reduced load on stressed node
    });
  });

  test.describe('Session Management Integration', () => {
    test('should handle session migration during node shutdown', async ({ request }) => {
      const cluster = await createCluster(3);
      const sessionId = 'migrate-test-session';
      
      // Create session on specific node
      await request.post('/api/session', {
        headers: { 'Cookie': `sessionId=${sessionId}` },
        data: { key: 'testData', value: 'important' }
      });
      
      // Get serving node
      const initialResponse = await request.get('/api/session', {
        headers: { 'Cookie': `sessionId=${sessionId}` }
      });
      const initialNode = initialResponse.headers()['x-served-by'];
      
      // Initiate graceful shutdown
      await cluster.shutdownNode(initialNode, { graceful: true });
      
      // Verify session data preserved
      const finalResponse = await request.get('/api/session', {
        headers: { 'Cookie': `sessionId=${sessionId}` }
      });
      expect(finalResponse.status()).toBe(200);
      expect(finalResponse.json().key).toBe('testData');
      expect(finalResponse.json().value).toBe('important');
    });

    test('should maintain sticky routing during rolling updates', async ({ request }) => {
      const cluster = await createCluster(4);
      const sessions = Array(5).fill(null).map((_, i) => `update-test-session-${i}`);
      
      // Create multiple sessions
      await Promise.all(sessions.map(sessionId =>
        request.post('/api/session', {
          headers: { 'Cookie': `sessionId=${sessionId}` },
          data: { value: sessionId }
        })
      ));
      
      // Perform rolling update
      for (let i = 0; i < 4; i++) {
        await cluster.updateNode(i, { version: '2.0.0' });
        // Verify all sessions still accessible
        const responses = await Promise.all(sessions.map(sessionId =>
          request.get('/api/session', {
            headers: { 'Cookie': `sessionId=${sessionId}` }
          })
        ));
        expect(responses.every(r => r.ok())).toBeTruthy();
        expect(responses.every(r => r.json().value === r.headers()['cookie'].split('=')[1])).toBeTruthy();
      }
    });
  });

  test.describe('Geographic Distribution', () => {
    test('should route to nearest available node', async ({ request }) => {
      const cluster = await createCluster(3, {
        regions: ['us-east', 'us-west', 'eu-west']
      });
      
      // Test routing from different regions
      const regions = ['us-east', 'us-west', 'eu-west'];
      const responses = await Promise.all(regions.map(region =>
        request.get('/api/agents', {
          headers: { 'X-Client-Region': region }
        })
      ));
      
      // Verify each request routed to nearest node
      responses.forEach((response, i) => {
        expect(response.headers()['x-served-by-region']).toBe(regions[i]);
      });
      
      // Verify fallback when nearest node is down
      await cluster.killNode(0); // Kill us-east node
      const eastResponse = await request.get('/api/agents', {
        headers: { 'X-Client-Region': 'us-east' }
      });
      expect(eastResponse.headers()['x-served-by-region']).toBe('us-west'); // Should route to next nearest
    });
  });

  test.describe('Monitoring and Metrics', () => {
    test('should collect and aggregate node metrics', async ({ request }) => {
      const cluster = await createCluster(3);
      
      // Generate some load
      await Promise.all(Array(100).fill(null).map(() => 
        request.get('/api/agents')
      ));
      
      // Get metrics from each node
      const metrics = await Promise.all(
        Array(3).fill(null).map((_, i) => 
          request.get(`${cluster.getNodeUrl(i)}/metrics`)
        )
      );
      
      // Verify metric format and content
      metrics.forEach(response => {
        const data = response.json();
        expect(data).toMatchObject({
          requests: expect.any(Number),
          latency: expect.any(Object),
          errors: expect.any(Number),
          cpu: expect.any(Number),
          memory: expect.any(Number),
          connections: expect.any(Number)
        });
        
        // Verify reasonable values
        expect(data.cpu).toBeLessThan(100);
        expect(data.memory).toBeLessThan(100);
        expect(data.latency.p99).toBeLessThan(1000); // Less than 1s
      });
      
      // Verify cluster-wide metrics
      const aggregateMetrics = await request.get('/api/cluster/metrics');
      const data = aggregateMetrics.json();
      expect(data.totalRequests).toBeGreaterThanOrEqual(100);
      expect(data.averageLatency).toBeLessThan(500);
    });

    test('should track and alert on SLO violations', async ({ request }) => {
      const cluster = await createCluster(3);
      const alerts = [];
      
      // Subscribe to alerts
      cluster.onAlert(alert => alerts.push(alert));
      
      // Simulate load causing SLO violations
      await cluster.simulateLoad({
        nodeId: 0,
        latency: 2000, // 2s latency
        errorRate: 0.1 // 10% errors
      });
      
      // Generate traffic
      await Promise.all(Array(50).fill(null).map(() =>
        request.get('/api/agents')
      ));
      
      // Verify alerts
      expect(alerts.some(a => a.type === 'latency_slo_violation')).toBeTruthy();
      expect(alerts.some(a => a.type === 'error_rate_violation')).toBeTruthy();
      
      // Verify alert details
      const latencyAlert = alerts.find(a => a.type === 'latency_slo_violation');
      expect(latencyAlert).toMatchObject({
        nodeId: 0,
        threshold: expect.any(Number),
        actual: expect.any(Number),
        timestamp: expect.any(String)
      });
    });
  });

  test.describe('Advanced Recovery Scenarios', () => {
    test('should recover from split-brain with quorum', async ({ request }) => {
      const cluster = await createCluster(5);
      
      // Create network partition with 3-2 split
      await cluster.createPartition([[0, 1, 2], [3, 4]]);
      
      // Verify majority partition remains active
      const majorityResponse = await request.get(`${cluster.getNodeUrl(0)}/health`);
      expect(majorityResponse.ok()).toBeTruthy();
      expect(majorityResponse.json().role).toBe('primary');
      
      // Verify minority partition steps down
      const minorityResponse = await request.get(`${cluster.getNodeUrl(3)}/health`);
      expect(minorityResponse.json().role).toBe('secondary');
      
      // Heal partition and verify convergence
      await cluster.healPartition();
      
      // Verify all nodes agree on primary
      const nodes = await Promise.all(
        Array(5).fill(null).map((_, i) =>
          request.get(`${cluster.getNodeUrl(i)}/status`)
        )
      );
      
      const primaryIds = nodes.map(r => r.json().primaryId);
      expect(new Set(primaryIds).size).toBe(1);
    });

    test('should handle cascading failures gracefully', async ({ request }) => {
      const cluster = await createCluster(5);
      
      // Setup monitoring
      const events = [];
      cluster.onStateChange(event => events.push(event));
      
      // Trigger cascading failures
      await cluster.simulateLoad({ nodeId: 0, cpu: 100 });
      await cluster.simulateLoad({ nodeId: 1, memory: 95 });
      await cluster.killNode(2);
      
      // Verify cluster response
      const healthCheck = await request.get('/api/cluster/health');
      expect(healthCheck.ok()).toBeTruthy();
      
      // Verify recovery actions
      expect(events).toContainEqual(expect.objectContaining({
        type: 'node_overloaded',
        nodeId: 0
      }));
      expect(events).toContainEqual(expect.objectContaining({
        type: 'traffic_redistributed'
      }));
      
      // Verify remaining nodes handle load
      const distribution = await cluster.getLoadDistribution();
      expect(Math.max(...distribution) - Math.min(...distribution))
        .toBeLessThan(20); // Max 20% variance
    });

    test('should maintain data consistency during recovery', async ({ request }) => {
      const cluster = await createCluster(3);
      const testData = new Array(100).fill(null)
        .map((_, i) => ({ id: `test-${i}`, value: `value-${i}` }));
      
      // Write test data
      await Promise.all(testData.map(item =>
        request.post('/api/data', { data: item })
      ));
      
      // Force node failure during write
      await cluster.killNode(0);
      
      // Additional writes during recovery
      const newData = new Array(50).fill(null)
        .map((_, i) => ({ id: `new-${i}`, value: `new-value-${i}` }));
      
      await Promise.all(newData.map(item =>
        request.post('/api/data', { data: item })
      ));
      
      // Verify all data after recovery
      const allData = await request.get('/api/data/all');
      const items = allData.json();
      
      // Verify original data
      testData.forEach(item => {
        const found = items.find(i => i.id === item.id);
        expect(found).toBeDefined();
        expect(found.value).toBe(item.value);
      });
      
      // Verify new data
      newData.forEach(item => {
        const found = items.find(i => i.id === item.id);
        expect(found).toBeDefined();
        expect(found.value).toBe(item.value);
      });
    });
  });
});

// K6 Load Testing Scenarios
export const loadBalancerStressTest = () => {
  const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

  const options = {
    scenarios: {
      constant_load: {
        executor: 'constant-vus',
        vus: 50,
        duration: '5m',
      },
      stress_test: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '2m', target: 100 },
          { duration: '5m', target: 100 },
          { duration: '2m', target: 200 },
          { duration: '5m', target: 200 },
          { duration: '2m', target: 0 },
        ],
      },
      spike_test: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '10s', target: 500 },
          { duration: '1m', target: 500 },
          { duration: '10s', target: 0 },
        ],
      },
    },
    thresholds: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
    },
  };

  return {
    setup() {
      // Setup test data if needed
    },

    default() {
      const responses = http.batch([
        ['GET', `${BASE_URL}/api/agents`],
        ['GET', `${BASE_URL}/api/metrics`],
        ['GET', `${BASE_URL}/api/marketplace`],
      ]);

      check(responses[0], {
        'agents status is 200': (r) => r.status === 200,
        'agents response time OK': (r) => r.timings.duration < 500,
      });

      sleep(1);
    },

    teardown() {
      // Cleanup test data if needed
    },
  };
};

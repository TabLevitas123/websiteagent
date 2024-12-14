import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { CONFIG } from './config';

export let options = {
  thresholds: CONFIG.THRESHOLDS,
  scenarios: {
    metrics_load: CONFIG.SCENARIOS.load,
  },
};

const BASE_URL = CONFIG.BASE_URL;

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, {
    address: '0x123',
    signature: 'test-signature',
  });
  
  return { token: loginRes.json('token') };
}

export default function(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  group('Platform Metrics', () => {
    // Get platform metrics
    const platformResponse = http.get(`${BASE_URL}/metrics/platform`, { headers });
    check(platformResponse, {
      'platform metrics status is 200': (r) => r.status === 200,
      'platform metrics are valid': (r) => {
        const metrics = r.json();
        return metrics.totalAgents >= 0 &&
               metrics.totalUsers >= 0 &&
               metrics.totalTransactions >= 0;
      },
    });
    sleep(1);

    // Get platform metrics with time range
    const rangeResponse = http.get(
      `${BASE_URL}/metrics/platform?start=2024-01-01&end=2024-12-31`,
      { headers }
    );
    check(rangeResponse, {
      'platform metrics with range status is 200': (r) => r.status === 200,
      'platform metrics with range are valid': (r) => {
        const metrics = r.json();
        return metrics.timeSeries && 
               metrics.timeSeries.length > 0;
      },
    });
    sleep(1);
  });

  group('Agent Metrics', () => {
    // Get agent metrics
    const agentResponse = http.get(`${BASE_URL}/metrics/agent`, { headers });
    check(agentResponse, {
      'agent metrics status is 200': (r) => r.status === 200,
      'agent metrics are valid': (r) => {
        const metrics = r.json();
        return metrics.topPerformers &&
               metrics.categoryDistribution;
      },
    });
    sleep(1);

    // Get specific agent metrics
    const agentId = '1';
    const specificResponse = http.get(
      `${BASE_URL}/metrics/agent/${agentId}`,
      { headers }
    );
    check(specificResponse, {
      'specific agent metrics status is 200': (r) => r.status === 200,
      'specific agent metrics are valid': (r) => {
        const metrics = r.json();
        return metrics.executions >= 0 &&
               metrics.revenue >= 0;
      },
    });
    sleep(1);
  });

  group('Marketplace Metrics', () => {
    // Get marketplace metrics
    const marketResponse = http.get(`${BASE_URL}/metrics/marketplace`, { headers });
    check(marketResponse, {
      'marketplace metrics status is 200': (r) => r.status === 200,
      'marketplace metrics are valid': (r) => {
        const metrics = r.json();
        return metrics.tradingVolume >= 0 &&
               metrics.topSellers.length >= 0;
      },
    });
    sleep(1);

    // Get marketplace trends
    const trendsResponse = http.get(
      `${BASE_URL}/metrics/marketplace/trends`,
      { headers }
    );
    check(trendsResponse, {
      'marketplace trends status is 200': (r) => r.status === 200,
      'marketplace trends are valid': (r) => {
        const trends = r.json();
        return trends.userGrowth !== undefined &&
               trends.revenueGrowth !== undefined;
      },
    });
    sleep(1);
  });
}

export function teardown(data) {
  // Cleanup test data
  http.del(`${BASE_URL}/test/cleanup`, null, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });
}

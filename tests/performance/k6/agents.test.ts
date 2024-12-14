import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from './config';

export let options = {
  thresholds: CONFIG.THRESHOLDS,
  scenarios: {
    agents_load: CONFIG.SCENARIOS.load,
  },
};

const BASE_URL = CONFIG.BASE_URL;

export function setup() {
  // Create test user and get token
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

  group('Agent Endpoints', () => {
    // List agents
    const listResponse = http.get(`${BASE_URL}/agents`, { headers });
    check(listResponse, {
      'list agents status is 200': (r) => r.status === 200,
      'list agents has items': (r) => r.json('agents').length > 0,
    });
    sleep(1);

    // Search agents
    const searchResponse = http.get(`${BASE_URL}/agents/search?q=test`, { headers });
    check(searchResponse, {
      'search agents status is 200': (r) => r.status === 200,
      'search results are valid': (r) => r.json('agents').length >= 0,
    });
    sleep(1);

    // Get agent details
    const agentId = listResponse.json('agents')[0].id;
    const detailsResponse = http.get(`${BASE_URL}/agents/${agentId}`, { headers });
    check(detailsResponse, {
      'get agent details status is 200': (r) => r.status === 200,
      'agent details are valid': (r) => r.json('id') === agentId,
    });
    sleep(1);

    // Create agent
    const createResponse = http.post(`${BASE_URL}/agents`, JSON.stringify({
      name: 'Test Agent',
      description: 'Test Description',
      price: 100,
      category: 'TEST',
    }), { headers });
    check(createResponse, {
      'create agent status is 201': (r) => r.status === 201,
      'created agent has id': (r) => r.json('id') !== undefined,
    });
    sleep(1);

    // Update agent
    const updateResponse = http.put(`${BASE_URL}/agents/${agentId}`, JSON.stringify({
      name: 'Updated Test Agent',
    }), { headers });
    check(updateResponse, {
      'update agent status is 200': (r) => r.status === 200,
      'agent was updated': (r) => r.json('name') === 'Updated Test Agent',
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

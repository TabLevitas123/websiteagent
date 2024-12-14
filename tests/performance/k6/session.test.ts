import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { CONFIG } from './config';

export let options = {
  thresholds: CONFIG.THRESHOLDS,
  scenarios: {
    session_load: CONFIG.SCENARIOS.load,
  },
};

const BASE_URL = CONFIG.BASE_URL;

export default function() {
  group('Authentication Flow', () => {
    // Get nonce
    const nonceResponse = http.get(`${BASE_URL}/auth/nonce?address=0x123`);
    check(nonceResponse, {
      'get nonce status is 200': (r) => r.status === 200,
      'nonce is valid': (r) => r.json('nonce') !== undefined,
    });
    sleep(1);

    // Login
    const loginResponse = http.post(`${BASE_URL}/auth/login`, {
      address: '0x123',
      signature: 'test-signature',
    });
    check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => r.json('token') !== undefined,
    });
    const token = loginResponse.json('token');
    sleep(1);

    // Verify token
    const verifyResponse = http.get(`${BASE_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    check(verifyResponse, {
      'verify token status is 200': (r) => r.status === 200,
      'token is valid': (r) => r.json('valid') === true,
    });
    sleep(1);

    // Refresh token
    const refreshResponse = http.post(`${BASE_URL}/auth/refresh`, null, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    check(refreshResponse, {
      'refresh token status is 200': (r) => r.status === 200,
      'new token is returned': (r) => r.json('token') !== undefined,
    });
    sleep(1);

    // Logout
    const logoutResponse = http.post(`${BASE_URL}/auth/logout`, null, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    check(logoutResponse, {
      'logout status is 200': (r) => r.status === 200,
    });
    sleep(1);
  });

  group('Session Management', () => {
    // Create session
    const createResponse = http.post(`${BASE_URL}/sessions`, {
      userId: '1',
      deviceInfo: {
        userAgent: 'k6-test',
        platform: 'test',
      },
    });
    check(createResponse, {
      'create session status is 201': (r) => r.status === 201,
      'session id is returned': (r) => r.json('sessionId') !== undefined,
    });
    const sessionId = createResponse.json('sessionId');
    sleep(1);

    // Get session
    const getResponse = http.get(`${BASE_URL}/sessions/${sessionId}`);
    check(getResponse, {
      'get session status is 200': (r) => r.status === 200,
      'session data is valid': (r) => r.json('id') === sessionId,
    });
    sleep(1);

    // Update session
    const updateResponse = http.put(`${BASE_URL}/sessions/${sessionId}`, {
      lastActivity: new Date().toISOString(),
    });
    check(updateResponse, {
      'update session status is 200': (r) => r.status === 200,
    });
    sleep(1);

    // List sessions
    const listResponse = http.get(`${BASE_URL}/sessions?userId=1`);
    check(listResponse, {
      'list sessions status is 200': (r) => r.status === 200,
      'sessions list is valid': (r) => Array.isArray(r.json('sessions')),
    });
    sleep(1);

    // Delete session
    const deleteResponse = http.del(`${BASE_URL}/sessions/${sessionId}`);
    check(deleteResponse, {
      'delete session status is 204': (r) => r.status === 204,
    });
    sleep(1);
  });

  group('Session Validation', () => {
    // Invalid token
    const invalidResponse = http.get(`${BASE_URL}/auth/verify`, {
      headers: { 'Authorization': 'Bearer invalid-token' },
    });
    check(invalidResponse, {
      'invalid token returns 401': (r) => r.status === 401,
    });
    sleep(1);

    // Expired token
    const expiredToken = 'expired.test.token';
    const expiredResponse = http.get(`${BASE_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` },
    });
    check(expiredResponse, {
      'expired token returns 401': (r) => r.status === 401,
    });
    sleep(1);

    // Missing token
    const missingResponse = http.get(`${BASE_URL}/auth/verify`);
    check(missingResponse, {
      'missing token returns 401': (r) => r.status === 401,
    });
    sleep(1);
  });
}

export function teardown() {
  // Cleanup test sessions
  http.del(`${BASE_URL}/test/cleanup-sessions`);
}

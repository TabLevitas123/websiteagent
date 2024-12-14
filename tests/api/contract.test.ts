import { test, expect } from '@playwright/test';
import { validateSchema, compareVersions } from '../utils/contractUtils';

test.describe('API Contract Tests', () => {
  test.describe('Schema Validation', () => {
    test('should validate response schemas', async ({ request }) => {
      // Test all API endpoints
      const endpoints = [
        { path: '/api/agents', method: 'GET' },
        { path: '/api/agents', method: 'POST' },
        { path: '/api/metrics', method: 'GET' },
        { path: '/api/config', method: 'GET' },
      ];

      for (const endpoint of endpoints) {
        const response = await request[endpoint.method.toLowerCase()](endpoint.path);
        const data = await response.json();

        // Validate against OpenAPI schema
        const validation = await validateSchema(endpoint.path, endpoint.method, data);
        expect(validation.valid).toBeTruthy();
        expect(validation.errors).toHaveLength(0);
      }
    });

    test('should validate request schemas', async ({ request }) => {
      const testCases = [
        {
          path: '/api/agents',
          method: 'POST',
          data: { name: 'Test Agent', type: 'AI' },
        },
        {
          path: '/api/metrics',
          method: 'POST',
          data: { name: 'test_metric', value: 42 },
        },
      ];

      for (const testCase of testCases) {
        const validation = await validateSchema(
          testCase.path,
          testCase.method,
          testCase.data,
          'request'
        );
        expect(validation.valid).toBeTruthy();
      }
    });
  });

  test.describe('Version Compatibility', () => {
    test('should maintain backward compatibility', async ({ request }) => {
      const versions = ['v1', 'v2'];

      for (const version of versions) {
        const response = await request.get('/api/agents', {
          headers: {
            'Accept-Version': version,
          },
        });

        // Verify version support
        expect(response.headers()['api-version']).toBe(version);
        expect(response.ok()).toBeTruthy();
      }
    });

    test('should handle version migrations', async ({ request }) => {
      // Compare responses across versions
      const v1Response = await request.get('/api/agents', {
        headers: { 'Accept-Version': 'v1' },
      });
      const v2Response = await request.get('/api/agents', {
        headers: { 'Accept-Version': 'v2' },
      });

      const comparison = await compareVersions(
        await v1Response.json(),
        await v2Response.json()
      );

      // Verify data transformation
      expect(comparison).toMatchObject({
        compatible: true,
        changes: expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/^(added|modified|removed)$/),
            path: expect.any(String),
          }),
        ]),
      });
    });
  });

  test.describe('Error Contracts', () => {
    test('should return consistent error responses', async ({ request }) => {
      const errorCases = [
        {
          path: '/api/agents/invalid',
          expectedStatus: 404,
          expectedError: 'NotFound',
        },
        {
          path: '/api/agents',
          method: 'POST',
          data: { invalid: true },
          expectedStatus: 400,
          expectedError: 'ValidationError',
        },
      ];

      for (const errorCase of errorCases) {
        const response = await request[errorCase.method?.toLowerCase() || 'get'](
          errorCase.path,
          errorCase.data ? { data: errorCase.data } : undefined
        );

        expect(response.status()).toBe(errorCase.expectedStatus);
        const error = await response.json();
        expect(error).toMatchObject({
          error: errorCase.expectedError,
          message: expect.any(String),
          details: expect.any(Object),
        });
      }
    });

    test('should handle rate limiting errors', async ({ request }) => {
      // Trigger rate limit
      const responses = await Promise.all(
        Array(100).fill(null).map(() => request.get('/api/agents'))
      );

      const limitedResponse = responses.find(r => r.status() === 429);
      expect(limitedResponse).toBeTruthy();

      const error = await limitedResponse?.json();
      expect(error).toMatchObject({
        error: 'RateLimitExceeded',
        retryAfter: expect.any(Number),
      });
    });
  });

  test.describe('Security Contracts', () => {
    test('should enforce authentication contracts', async ({ request }) => {
      const protectedEndpoints = [
        { path: '/api/admin', method: 'GET' },
        { path: '/api/config', method: 'PUT' },
      ];

      for (const endpoint of protectedEndpoints) {
        // Test without auth
        const noAuthResponse = await request[endpoint.method.toLowerCase()](endpoint.path);
        expect(noAuthResponse.status()).toBe(401);

        // Test with invalid auth
        const invalidAuthResponse = await request[endpoint.method.toLowerCase()](
          endpoint.path,
          {
            headers: {
              'Authorization': 'Bearer invalid-token',
            },
          }
        );
        expect(invalidAuthResponse.status()).toBe(401);

        // Test with valid auth
        const validAuthResponse = await request[endpoint.method.toLowerCase()](
          endpoint.path,
          {
            headers: {
              'Authorization': 'Bearer valid-token',
            },
          }
        );
        expect(validAuthResponse.ok()).toBeTruthy();
      }
    });

    test('should enforce CORS contracts', async ({ request }) => {
      const response = await request.get('/api/agents', {
        headers: {
          'Origin': 'https://test.com',
        },
      });

      expect(response.headers()['access-control-allow-origin']).toBeTruthy();
      expect(response.headers()['access-control-allow-methods']).toBeTruthy();
      expect(response.headers()['access-control-allow-headers']).toBeTruthy();
    });
  });

  test.describe('Performance Contracts', () => {
    test('should meet response time SLA', async ({ request }) => {
      const endpoints = [
        { path: '/api/agents', sla: 500 },
        { path: '/api/metrics', sla: 1000 },
      ];

      for (const endpoint of endpoints) {
        const start = Date.now();
        const response = await request.get(endpoint.path);
        const duration = Date.now() - start;

        expect(response.ok()).toBeTruthy();
        expect(duration).toBeLessThan(endpoint.sla);
      }
    });

    test('should handle payload size limits', async ({ request }) => {
      const largePayload = {
        data: Array(1000).fill('test').join(''),
      };

      const response = await request.post('/api/agents', {
        data: largePayload,
      });

      expect(response.status()).toBe(413);
      const error = await response.json();
      expect(error).toMatchObject({
        error: 'PayloadTooLarge',
        limit: expect.any(Number),
      });
    });
  });

  test.describe('Documentation Sync', () => {
    test('should sync with OpenAPI spec', async ({ request }) => {
      const spec = await request.get('/api/docs/openapi.json').then(r => r.json());
      
      // Verify all endpoints are documented
      const endpoints = await request.get('/api/endpoints').then(r => r.json());
      
      for (const endpoint of endpoints) {
        const path = spec.paths[endpoint.path];
        expect(path).toBeTruthy();
        expect(path[endpoint.method.toLowerCase()]).toBeTruthy();
      }
    });

    test('should validate examples in documentation', async ({ request }) => {
      const spec = await request.get('/api/docs/openapi.json').then(r => r.json());

      // Test all documented examples
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, definition] of Object.entries(methods)) {
          if (definition.examples) {
            for (const example of definition.examples) {
              const response = await request[method](path, {
                data: example.request,
              });

              expect(response.ok()).toBeTruthy();
              const data = await response.json();
              expect(data).toMatchObject(example.response);
            }
          }
        }
      }
    });
  });
});

import request from 'supertest';
import { app } from '../../backend/src/app';
import { JSDOM } from 'jsdom';
import { createTestToken } from '../utils/authUtils';

describe('Security Tests', () => {
  let testToken: string;

  beforeAll(async () => {
    testToken = await createTestToken();
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        '/api/agents',
        '/api/metrics',
        '/api/profile',
      ];

      for (const route of protectedRoutes) {
        const response = await request(app).get(route);
        expect(response.status).toBe(401);
      }
    });

    it('should validate JWT tokens', async () => {
      // Invalid token
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(response.status).toBe(401);

      // Expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMo';
      const expiredResponse = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(expiredResponse.status).toBe(401);

      // Valid token
      const validResponse = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${testToken}`);
      expect(validResponse.status).toBe(200);
    });

    it('should implement rate limiting', async () => {
      const requests = Array(100).fill(null).map(() => 
        request(app).get('/api/agents')
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(r => r.status === 429);
      expect(tooManyRequests).toBeTruthy();
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should sanitize user input', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Test Agent',
        description: 'javascript:alert("xss")',
        price: '100; DROP TABLE agents;',
      };

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${testToken}`)
        .send(maliciousInput);

      expect(response.status).toBe(400);
    });

    it('should validate request parameters', async () => {
      const invalidInputs = [
        { price: -100 },
        { name: 'a'.repeat(256) },
        { category: 'INVALID_CATEGORY' },
      ];

      for (const input of invalidInputs) {
        const response = await request(app)
          .post('/api/agents')
          .set('Authorization', `Bearer ${testToken}`)
          .send(input);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF token in forms', async () => {
      const response = await request(app).get('/');
      const dom = new JSDOM(response.text);
      const csrfToken = dom.window.document.querySelector('meta[name="csrf-token"]');
      expect(csrfToken).toBeTruthy();
    });

    it('should reject requests without CSRF token', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Test Agent' });

      expect(response.status).toBe(403);
    });
  });

  describe('Headers & Security Policies', () => {
    it('should set secure headers', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    });

    it('should implement Content Security Policy', async () => {
      const response = await request(app).get('/');
      const csp = response.headers['content-security-policy'];

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('test'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload',
        });

      expect(response.status).toBe(400);
    });

    it('should limit file size', async () => {
      const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', largeFile, 'large.jpg');

      expect(response.status).toBe(400);
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions', async () => {
      // Create multiple sessions
      const sessions = await Promise.all(
        Array(3).fill(null).map(() => 
          request(app)
            .post('/api/auth/login')
            .send({ address: '0x123', signature: 'test' })
        )
      );

      // Verify session limits
      const tokens = sessions.map(s => s.body.token);
      const responses = await Promise.all(
        tokens.map(token =>
          request(app)
            .get('/api/agents')
            .set('Authorization', `Bearer ${token}`)
        )
      );

      // Only the most recent sessions should be valid
      const validSessions = responses.filter(r => r.status === 200);
      expect(validSessions.length).toBeLessThanOrEqual(2);
    });

    it('should implement session timeout', async () => {
      // Create session with short timeout
      const response = await request(app)
        .post('/api/auth/login')
        .send({ address: '0x123', signature: 'test' });

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to use expired session
      const verifyResponse = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${response.body.token}`);

      expect(verifyResponse.status).toBe(401);
    });
  });

  describe('API Security', () => {
    it('should prevent parameter pollution', async () => {
      const response = await request(app)
        .get('/api/agents')
        .query({ sort: ['asc', 'desc'] })
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${testToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json"');

      expect(response.status).toBe(400);
    });

    it('should prevent NoSQL injection', async () => {
      const maliciousQuery = {
        $where: 'function() { while(1) { return false; } }',
      };

      const response = await request(app)
        .get('/api/agents')
        .query(maliciousQuery)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
    });
  });
});

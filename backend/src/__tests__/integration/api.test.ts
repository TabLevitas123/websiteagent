import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';
import { mockAgentData } from '../utils/testUtils';
import { createTestToken } from '../utils/authUtils';

const prisma = new PrismaClient();

describe('API Integration Tests', () => {
  let testToken: string;
  let testAgentId: string;

  beforeAll(async () => {
    // Create test user and get token
    testToken = await createTestToken();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should accept valid authentication token', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('should reject invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('Agent API', () => {
    it('should create a new agent', async () => {
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${testToken}`)
        .send(mockAgentData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      testAgentId = response.body.id;
    });

    it('should get agent by id', async () => {
      const response = await request(app)
        .get(`/api/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testAgentId);
    });

    it('should update agent', async () => {
      const update = { name: 'Updated Agent' };
      const response = await request(app)
        .put(`/api/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(update)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Updated Agent');
    });

    it('should delete agent', async () => {
      await request(app)
        .delete(`/api/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);
    });
  });

  describe('Metrics API', () => {
    it('should get platform metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/platform')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAgents');
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalTransactions');
    });

    it('should get agent metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/agent')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('topPerformers');
      expect(response.body).toHaveProperty('categoryDistribution');
    });

    it('should get marketplace metrics', async () => {
      const response = await request(app)
        .get('/api/metrics/marketplace')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tradingVolume');
      expect(response.body).toHaveProperty('topSellers');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests quickly
      const requests = Array(31).fill(null).map(() => 
        request(app)
          .get('/api/agents')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(r => r.status === 429);

      expect(tooManyRequests).toBeTruthy();
    });

    it('should have different limits for authenticated users', async () => {
      // Make requests up to authenticated user limit
      const requests = Array(61).fill(null).map(() => 
        request(app)
          .get('/api/agents')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(r => r.status === 429);

      expect(tooManyRequests).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const invalidData = { ...mockAgentData, price: -1 };
      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${testToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('validation');
    });

    it('should handle not found errors', async () => {
      const response = await request(app)
        .get('/api/agents/nonexistent')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    it('should handle server errors', async () => {
      // Force a server error by passing invalid ID format
      const response = await request(app)
        .get('/api/agents/invalid-id-format')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });
  });

  describe('Search and Filtering', () => {
    it('should search agents', async () => {
      const response = await request(app)
        .get('/api/agents/search')
        .query({ q: 'test' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/agents/search')
        .query({ category: 'TEST' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      response.body.forEach((agent: any) => {
        expect(agent.category).toBe('TEST');
      });
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/agents/search')
        .query({ minPrice: '10', maxPrice: '100' })
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      response.body.forEach((agent: any) => {
        expect(agent.price).toBeGreaterThanOrEqual(10);
        expect(agent.price).toBeLessThanOrEqual(100);
      });
    });
  });
});

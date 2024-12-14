import { Request, Response } from 'express';
import { agentRoutes } from '../../routes/agents';
import { AgentService } from '../../services/agent';
import { createMockRequest, createMockResponse, mockNext, mockAgentData } from '../utils/testUtils';

// Mock AgentService
jest.mock('../../services/agent');

describe('Agent Routes', () => {
  let mockAgentService: jest.Mocked<AgentService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockAgentService = {
      createAgent: jest.fn(),
      getAgent: jest.fn(),
      updateAgent: jest.fn(),
      deleteAgent: jest.fn(),
      listAgents: jest.fn(),
      searchAgents: jest.fn(),
      validateAgent: jest.fn(),
      executeAgent: jest.fn(),
    } as any;

    req = createMockRequest();
    res = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a new agent successfully', async () => {
      mockAgentService.createAgent.mockResolvedValue(mockAgentData);
      req.body = {
        name: 'Test Agent',
        description: 'Test Description',
        price: 1.0,
        category: 'TEST'
      };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.createAgent).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockAgentData);
    });

    it('should handle validation errors', async () => {
      mockAgentService.createAgent.mockRejectedValue(new Error('Validation failed'));
      req.body = { name: 'Test Agent' }; // Missing required fields

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Validation failed'
      });
    });
  });

  describe('GET /:id', () => {
    it('should get an agent successfully', async () => {
      mockAgentService.getAgent.mockResolvedValue(mockAgentData);
      req.params = { id: '1' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.getAgent).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(mockAgentData);
    });

    it('should handle agent not found', async () => {
      mockAgentService.getAgent.mockResolvedValue(null);
      req.params = { id: 'unknown' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Agent not found'
      });
    });
  });

  describe('PUT /:id', () => {
    it('should update an agent successfully', async () => {
      mockAgentService.updateAgent.mockResolvedValue(mockAgentData);
      req.params = { id: '1' };
      req.body = { name: 'Updated Agent' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.updateAgent).toHaveBeenCalledWith('1', req.body);
      expect(res.json).toHaveBeenCalledWith(mockAgentData);
    });

    it('should handle update authorization', async () => {
      mockAgentService.updateAgent.mockRejectedValue(new Error('Unauthorized'));
      req.params = { id: '1' };
      req.body = { name: 'Updated Agent' };
      req.user = { address: 'wrong-owner' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Unauthorized'
      });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete an agent successfully', async () => {
      mockAgentService.deleteAgent.mockResolvedValue(true);
      req.params = { id: '1' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.deleteAgent).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should handle deletion authorization', async () => {
      mockAgentService.deleteAgent.mockRejectedValue(new Error('Unauthorized'));
      req.params = { id: '1' };
      req.user = { address: 'wrong-owner' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Unauthorized'
      });
    });
  });

  describe('GET /search', () => {
    it('should search agents successfully', async () => {
      const agents = [mockAgentData];
      mockAgentService.searchAgents.mockResolvedValue(agents);
      req.query = { 
        query: 'test',
        category: 'TEST',
        minPrice: '0',
        maxPrice: '10'
      };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.searchAgents).toHaveBeenCalledWith(req.query);
      expect(res.json).toHaveBeenCalledWith(agents);
    });

    it('should handle empty search results', async () => {
      mockAgentService.searchAgents.mockResolvedValue([]);
      req.query = { query: 'nonexistent' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('POST /:id/execute', () => {
    it('should execute an agent successfully', async () => {
      const executionResult = { success: true, output: 'Test output' };
      mockAgentService.executeAgent.mockResolvedValue(executionResult);
      req.params = { id: '1' };
      req.body = { input: 'Test input' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.executeAgent).toHaveBeenCalledWith('1', req.body.input);
      expect(res.json).toHaveBeenCalledWith(executionResult);
    });

    it('should handle execution errors', async () => {
      mockAgentService.executeAgent.mockRejectedValue(new Error('Execution failed'));
      req.params = { id: '1' };
      req.body = { input: 'Test input' };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Execution failed'
      });
    });
  });

  describe('POST /validate', () => {
    it('should validate agent data successfully', async () => {
      mockAgentService.validateAgent.mockResolvedValue({ valid: true });
      req.body = mockAgentData;

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(mockAgentService.validateAgent).toHaveBeenCalledWith(req.body);
      expect(res.json).toHaveBeenCalledWith({ valid: true });
    });

    it('should handle validation failures', async () => {
      mockAgentService.validateAgent.mockResolvedValue({ 
        valid: false,
        errors: ['Invalid price']
      });
      req.body = { ...mockAgentData, price: -1 };

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        valid: false,
        errors: ['Invalid price']
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      // Simulate rate limit middleware
      const rateLimitError = new Error('Too Many Requests');
      rateLimitError.status = 429;
      mockNext.mockImplementation(() => {
        throw rateLimitError;
      });

      const router = agentRoutes(mockAgentService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      });
    });
  });
});

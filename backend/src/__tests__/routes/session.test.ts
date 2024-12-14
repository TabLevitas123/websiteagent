import { Request, Response } from 'express';
import { sessionRoutes } from '../../routes/session';
import { SessionManager } from '../../services/session';
import { createMockRequest, createMockResponse, mockNext, mockAuthToken, createMockUser } from '../utils/testUtils';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock SessionManager
jest.mock('../../services/session');

describe('Session Routes', () => {
  let mockSessionManager: jest.Mocked<SessionManager>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
      validateSession: jest.fn(),
    } as any;

    req = createMockRequest();
    res = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a new session successfully', async () => {
      const mockSession = { id: '1', userId: '1', token: mockAuthToken };
      mockSessionManager.createSession.mockResolvedValue(mockSession);

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(mockSessionManager.createSession).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSession);
    });

    it('should handle session creation errors', async () => {
      mockSessionManager.createSession.mockRejectedValue(new Error('Session creation failed'));

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Session creation failed'
      });
    });
  });

  describe('GET /:id', () => {
    it('should retrieve a session successfully', async () => {
      const mockSession = { id: '1', userId: '1', token: mockAuthToken };
      mockSessionManager.getSession.mockResolvedValue(mockSession);
      req.params = { id: '1' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(mockSessionManager.getSession).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(mockSession);
    });

    it('should handle session not found', async () => {
      mockSessionManager.getSession.mockResolvedValue(null);
      req.params = { id: '1' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Session not found'
      });
    });
  });

  describe('PUT /:id', () => {
    it('should update a session successfully', async () => {
      const mockSession = { id: '1', userId: '1', token: mockAuthToken };
      mockSessionManager.updateSession.mockResolvedValue(mockSession);
      req.params = { id: '1' };
      req.body = { token: 'newToken' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(mockSessionManager.updateSession).toHaveBeenCalledWith('1', { token: 'newToken' });
      expect(res.json).toHaveBeenCalledWith(mockSession);
    });

    it('should handle session update errors', async () => {
      mockSessionManager.updateSession.mockRejectedValue(new Error('Update failed'));
      req.params = { id: '1' };
      req.body = { token: 'newToken' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Update failed'
      });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a session successfully', async () => {
      mockSessionManager.deleteSession.mockResolvedValue(true);
      req.params = { id: '1' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(mockSessionManager.deleteSession).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should handle session deletion errors', async () => {
      mockSessionManager.deleteSession.mockRejectedValue(new Error('Deletion failed'));
      req.params = { id: '1' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Deletion failed'
      });
    });
  });

  describe('POST /validate', () => {
    it('should validate a session successfully', async () => {
      mockSessionManager.validateSession.mockResolvedValue(true);
      req.body = { token: mockAuthToken };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(mockSessionManager.validateSession).toHaveBeenCalledWith(mockAuthToken);
      expect(res.json).toHaveBeenCalledWith({ valid: true });
    });

    it('should handle invalid sessions', async () => {
      mockSessionManager.validateSession.mockResolvedValue(false);
      req.body = { token: 'invalidToken' };

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid session'
      });
    });
  });

  describe('Authentication Middleware', () => {
    it('should allow authenticated requests', async () => {
      const mockUser = createMockUser();
      req = createMockRequest({ user: mockUser });

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as AuthenticatedRequest, res as Response);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block unauthenticated requests', async () => {
      req = createMockRequest({ user: undefined });

      const router = sessionRoutes(mockSessionManager);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    });
  });
});

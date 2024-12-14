import { Router } from 'express';
import { SessionManager } from '../services/session-manager';
import { authenticate, authorize } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import logger from '../utils/logger';
import express from 'express';
import { createRateLimiter, rateLimitMonitor } from '../middleware/rateLimit';

export function sessionRoutes(sessionManager: SessionManager) {
  const router = Router();

  // Apply rate limiting middleware
  router.use(rateLimitMonitor);
  router.use(createRateLimiter('default'));

  // Create a new session
  router.post('/', authenticate, async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { data } = req.body;
      
      const session = await sessionManager.createSession(authReq.user!.id, data);
      res.status(201).json(session);
    } catch (error) {
      logger.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // Get session by ID
  router.get('/:sessionId', authenticate, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const authReq = req as AuthenticatedRequest;
      if (session.userId !== authReq.user!.id && !authReq.user!.roles.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to session' });
      }

      res.json(session);
    } catch (error) {
      logger.error('Error getting session:', error);
      res.status(500).json({ error: 'Failed to retrieve session' });
    }
  });

  // Update session data
  router.patch('/:sessionId', authenticate, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { data } = req.body;

      const session = await sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const authReq = req as AuthenticatedRequest;
      if (session.userId !== authReq.user!.id && !authReq.user!.roles.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to session' });
      }

      const updatedSession = await sessionManager.updateSession(sessionId, data);
      res.json(updatedSession);
    } catch (error) {
      logger.error('Error updating session:', error);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  // Delete session
  router.delete('/:sessionId', authenticate, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await sessionManager.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const authReq = req as AuthenticatedRequest;
      if (session.userId !== authReq.user!.id && !authReq.user!.roles.includes('admin')) {
        return res.status(403).json({ error: 'Unauthorized access to session' });
      }

      await sessionManager.destroySession(sessionId);
      res.json({ message: 'Session destroyed successfully' });
    } catch (error) {
      logger.error('Error destroying session:', error);
      res.status(500).json({ error: 'Failed to destroy session' });
    }
  });

  // Get all sessions for a user (admin only)
  router.get('/user/:userId', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await sessionManager.getUserSessions(userId);
      res.json(sessions);
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      res.status(500).json({ error: 'Failed to retrieve user sessions' });
    }
  });

  // Delete all sessions for a user (admin only)
  router.delete('/user/:userId', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      await sessionManager.destroyUserSessions(userId);
      res.json({ message: 'User sessions destroyed successfully' });
    } catch (error) {
      logger.error('Error destroying user sessions:', error);
      res.status(500).json({ error: 'Failed to destroy user sessions' });
    }
  });

  return router;
}

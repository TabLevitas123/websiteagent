import { Router } from 'express';
import { TokenManager } from '../services/auth/token-manager';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

export function authRoutes(tokenManager: TokenManager) {
  const router = Router();

  router.post('/login', async (req, res) => {
    try {
      const { userId, password } = req.body;

      // Note: In a real application, you would validate credentials against a database
      // This is just a placeholder for demonstration
      if (!userId || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      const payload = {
        userId,
        roles: ['user'], // In a real app, roles would come from the database
      };

      const token = await tokenManager.createToken(payload);
      res.json({ token });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  router.post('/refresh', authenticate(tokenManager), async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const newToken = await tokenManager.refreshToken(token);
      if (!newToken) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({ token: newToken });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  router.post('/logout', authenticate(tokenManager), (req, res) => {
    // In a real application, you might want to blacklist the token
    // For now, we just return success as the client will remove the token
    res.json({ message: 'Logged out successfully' });
  });

  return router;
}

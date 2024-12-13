import { Request, Response, NextFunction } from 'express';
import { TokenManager, TokenPayload } from '../services/auth/token-manager';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: string[];
  };
}

export function authenticate(tokenManager: TokenManager) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = await tokenManager.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      (req as AuthenticatedRequest).user = {
        id: decoded.userId,
        roles: decoded.roles
      };

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const hasRole = authReq.user.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

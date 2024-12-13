import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  algorithm: string;
}

export interface TokenPayload {
  userId: string;
  roles: string[];
  [key: string]: any;
}

export class TokenManager {
  private config: Required<JWTConfig>;

  constructor(config: JWTConfig) {
    this.config = {
      secret: config.secret,
      expiresIn: config.expiresIn || '1h',
      algorithm: config.algorithm || 'HS256'
    };
  }

  async createToken(payload: TokenPayload): Promise<string> {
    try {
      return jwt.sign(payload, this.config.secret, {
        expiresIn: this.config.expiresIn,
        algorithm: this.config.algorithm as jwt.Algorithm
      });
    } catch (error) {
      logger.error('Error creating token:', error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      return jwt.verify(token, this.config.secret) as TokenPayload;
    } catch (error) {
      logger.error('Error verifying token:', error);
      return null;
    }
  }

  async decodeToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.decode(token);
      return decoded as TokenPayload;
    } catch (error) {
      logger.error('Error decoding token:', error);
      return null;
    }
  }

  async refreshToken(token: string): Promise<string | null> {
    try {
      const payload = await this.verifyToken(token);
      if (!payload) {
        return null;
      }

      // Create a new token with a fresh expiration
      return this.createToken(payload);
    } catch (error) {
      logger.error('Error refreshing token:', error);
      return null;
    }
  }
}

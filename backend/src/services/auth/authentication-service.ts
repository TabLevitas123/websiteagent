import logger from '../../utils/logger';
import { AuthConfig, AuthResponse, UserCredentials } from '../../types';
import { validatePassword, generateSalt, hashPassword } from '../../utils/crypto';
import { TokenManager } from './token-manager';
import { SessionManager } from './session-manager';
import { SecurityAuditLogger } from '../security-audit-logger';
import { ApiService } from '../api.service';

export class AuthenticationService extends ApiService {
  private tokenManager: TokenManager;
  private sessionManager: SessionManager;
  private auditLogger: SecurityAuditLogger;
  private failedAttempts: Map<string, { count: number; lastAttempt: Date }>;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(config: AuthConfig) {
    super({
      baseURL: config.apiUrl,
      timeout: config.timeout,
      retries: 3,
      retryDelay: 1000
    });

    this.tokenManager = new TokenManager(config.jwt);
    this.sessionManager = new SessionManager(config.session);
    this.auditLogger = new SecurityAuditLogger(config.audit);
    this.failedAttempts = new Map();
  }

  async login(credentials: UserCredentials): Promise<AuthResponse> {
    try {
      await this.checkFailedAttempts(credentials);

      const response = await this.post<{ user: any; hash: string }>('/auth/verify', {
        username: credentials.username
      });

      const { user, hash } = response.data;
      const isValid = await validatePassword(credentials.password, hash);

      if (!isValid) {
        await this.handleFailedAttempt(credentials);
        throw new Error('Invalid credentials');
      }

      await this.resetFailedAttempts(credentials);

      const [accessToken, refreshToken] = await Promise.all([
        this.tokenManager.generateAccessToken(user.id, user.roles),
        this.tokenManager.generateRefreshToken(user.id)
      ]);

      const session = await this.sessionManager.createSession(user.id, {
        userId: user.id,
        ip: credentials.ip,
        userAgent: credentials.userAgent
      });

      await this.auditLogger.logEvent({
        type: 'auth.login',
        level: 'info',
        userId: user.id,
        sessionId: session.id,
        message: 'User logged in successfully'
      });

      return {
        token: accessToken,
        refreshToken,
        expiresIn: 3600,
        session
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  async register(credentials: UserCredentials): Promise<AuthResponse> {
    try {
      const salt = await generateSalt();
      const hash = await hashPassword(credentials.password);

      const response = await this.post<{ user: any }>('/auth/register', {
        username: credentials.username,
        hash
      });

      const { user } = response.data;

      const [accessToken, refreshToken] = await Promise.all([
        this.tokenManager.generateAccessToken(user.id, ['user']),
        this.tokenManager.generateRefreshToken(user.id)
      ]);

      const session = await this.sessionManager.createSession(user.id, {
        userId: user.id,
        ip: credentials.ip,
        userAgent: credentials.userAgent
      });

      await this.auditLogger.logEvent({
        type: 'auth.register',
        level: 'info',
        userId: user.id,
        sessionId: session.id,
        message: 'New user registered'
      });

      return {
        token: accessToken,
        refreshToken,
        expiresIn: 3600,
        session
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const userId = await this.tokenManager.verifyRefreshToken(refreshToken);
      
      const response = await this.get<{ user: any }>(`/users/${userId}`);
      const { user } = response.data;

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.tokenManager.generateAccessToken(user.id, user.roles),
        this.tokenManager.generateRefreshToken(user.id)
      ]);

      await this.tokenManager.revokeRefreshToken(refreshToken);

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  async logout(sessionId: string): Promise<void> {
    try {
      const session = await this.sessionManager.getSession(sessionId);
      
      if (session) {
        await Promise.all([
          this.sessionManager.endSession(sessionId),
          this.auditLogger.logEvent({
            type: 'auth.logout',
            level: 'info',
            userId: session.metadata.userId,
            sessionId,
            message: 'User logged out'
          })
        ]);
      }
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  private async checkFailedAttempts(credentials: UserCredentials): Promise<void> {
    const attempts = this.failedAttempts.get(credentials.username);
    
    if (!attempts) {
      return;
    }

    if (attempts.count >= this.MAX_FAILED_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
      
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION) {
        const remainingLockout = Math.ceil((this.LOCKOUT_DURATION - timeSinceLastAttempt) / 1000 / 60);
        throw new Error(`Account is locked. Try again in ${remainingLockout} minutes`);
      } else {
        this.failedAttempts.delete(credentials.username);
      }
    }
  }

  private async handleFailedAttempt(credentials: UserCredentials): Promise<void> {
    const attempts = this.failedAttempts.get(credentials.username) || { count: 0, lastAttempt: new Date() };
    
    attempts.count++;
    attempts.lastAttempt = new Date();
    
    this.failedAttempts.set(credentials.username, attempts);

    await this.auditLogger.logEvent({
      type: 'auth.login.failed',
      level: attempts.count >= this.MAX_FAILED_ATTEMPTS ? 'critical' : 'warning',
      message: `Failed login attempt for user ${credentials.username}`,
      metadata: {
        ip: credentials.ip,
        attemptCount: attempts.count
      }
    });
  }

  private async resetFailedAttempts(credentials: UserCredentials): Promise<void> {
    this.failedAttempts.delete(credentials.username);
  }
}
import { logger } from '@/utils/logger';
import { TokenManager } from './token-manager';
import { SessionManager } from './session-manager';
import { SecurityAuditLogger } from './security-audit-logger';
import {
  AuthConfig,
  UserCredentials,
  AuthResponse,
  UserRole,
  MFAConfig,
  AuthEvent,
} from '@/types';
import { validatePassword, generateSalt, hashPassword } from '@/utils/crypto';
import { ApiService } from './api.service';

export class AuthenticationService extends ApiService {
  private tokenManager: TokenManager;
  private sessionManager: SessionManager;
  private auditLogger: SecurityAuditLogger;
  private mfaConfig: MFAConfig;
  private rateLimiter: RateLimiter;

  constructor(config: AuthConfig) {
    super({
      baseURL: config.apiUrl,
      timeout: config.timeout || 30000,
    });

    this.tokenManager = new TokenManager(config.jwt);
    this.sessionManager = new SessionManager(config.session);
    this.auditLogger = new SecurityAuditLogger(config.audit);
    this.mfaConfig = config.mfa || { enabled: false };
    this.rateLimiter = new RateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // limit each IP to 5 failed attempts per windowMs
    });

    logger.info('AuthenticationService initialized', {
      mfaEnabled: this.mfaConfig.enabled,
    });
  }

  /**
   * Authenticate user credentials
   */
  public async authenticate(credentials: UserCredentials): Promise<AuthResponse> {
    try {
      // Check rate limiting
      if (!await this.rateLimiter.checkLimit(credentials.ip)) {
        throw new Error('Too many login attempts. Please try again later.');
      }

      // Validate input
      this.validateCredentials(credentials);

      // Log authentication attempt
      await this.auditLogger.logEvent({
        type: 'AUTH_ATTEMPT',
        userId: credentials.email,
        timestamp: new Date().toISOString(),
        metadata: {
          ip: credentials.ip,
          userAgent: credentials.userAgent,
        },
      });

      // Authenticate against API
      const response = await this.post<AuthResponse>('/auth/login', credentials);

      // Validate password
      const isValid = await validatePassword(
        credentials.password,
        response.user.passwordHash,
        response.user.salt
      );

      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      // Check if MFA is required
      if (this.mfaConfig.enabled && response.user.mfaEnabled) {
        return {
          ...response,
          requiresMFA: true,
          mfaToken: await this.tokenManager.createMFAToken(response.user.id),
        };
      }

      // Create session
      const session = await this.sessionManager.createSession({
        userId: response.user.id,
        ip: credentials.ip,
        userAgent: credentials.userAgent,
      });

      // Generate tokens
      const tokens = await this.tokenManager.generateTokens(
        response.user.id,
        response.user.roles
      );

      // Log successful authentication
      await this.auditLogger.logEvent({
        type: 'AUTH_SUCCESS',
        userId: response.user.id,
        timestamp: new Date().toISOString(),
        metadata: {
          sessionId: session.id,
          ip: credentials.ip,
        },
      });

      return {
        user: response.user,
        session: session,
        tokens: tokens,
        requiresMFA: false,
      };
    } catch (error) {
      // Log authentication failure
      await this.auditLogger.logEvent({
        type: 'AUTH_FAILURE',
        userId: credentials.email,
        timestamp: new Date().toISOString(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: credentials.ip,
        },
      });

      logger.error('Authentication failed', {
        error,
        email: credentials.email,
      });

      throw error;
    }
  }

  /**
   * Verify MFA token
   */
  public async verifyMFA(
    mfaToken: string,
    code: string
  ): Promise<AuthResponse> {
    try {
      // Verify MFA token
      const payload = await this.tokenManager.verifyMFAToken(mfaToken);

      // Verify MFA code
      const response = await this.post<AuthResponse>('/auth/mfa/verify', {
        userId: payload.userId,
        code,
      });

      // Create session
      const session = await this.sessionManager.createSession({
        userId: payload.userId,
        ip: payload.ip,
        userAgent: payload.userAgent,
      });

      // Generate tokens
      const tokens = await this.tokenManager.generateTokens(
        payload.userId,
        response.user.roles
      );

      // Log MFA verification
      await this.auditLogger.logEvent({
        type: 'MFA_SUCCESS',
        userId: payload.userId,
        timestamp: new Date().toISOString(),
        metadata: {
          sessionId: session.id,
          ip: payload.ip,
        },
      });

      return {
        user: response.user,
        session: session,
        tokens: tokens,
        requiresMFA: false,
      };
    } catch (error) {
      // Log MFA failure
      await this.auditLogger.logEvent({
        type: 'MFA_FAILURE',
        userId: 'unknown',
        timestamp: new Date().toISOString(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      logger.error('MFA verification failed', { error });
      throw error;
    }
  }

  /**
   * Register new user
   */
  public async register(credentials: UserCredentials): Promise<AuthResponse> {
    try {
      // Validate input
      this.validateCredentials(credentials);

      // Generate password hash
      const salt = await generateSalt();
      const passwordHash = await hashPassword(credentials.password, salt);

      // Create user
      const response = await this.post<AuthResponse>('/auth/register', {
        ...credentials,
        passwordHash,
        salt,
      });

      // Create session
      const session = await this.sessionManager.createSession({
        userId: response.user.id,
        ip: credentials.ip,
        userAgent: credentials.userAgent,
      });

      // Generate tokens
      const tokens = await this.tokenManager.generateTokens(
        response.user.id,
        response.user.roles
      );

      // Log registration
      await this.auditLogger.logEvent({
        type: 'USER_REGISTERED',
        userId: response.user.id,
        timestamp: new Date().toISOString(),
        metadata: {
          ip: credentials.ip,
          email: credentials.email,
        },
      });

      return {
        user: response.user,
        session: session,
        tokens: tokens,
        requiresMFA: false,
      };
    } catch (error) {
      logger.error('Registration failed', {
        error,
        email: credentials.email,
      });
      throw error;
    }
  }

  /**
   * Validate user credentials
   */
  private validateCredentials(credentials: UserCredentials): void {
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    if (!this.isValidEmail(credentials.email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isValidPassword(credentials.password)) {
      throw new Error('Password must be at least 8 characters');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): boolean {
    const passwordRegex = /^[A-Za-z\d]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Get user roles
   */
  public async getUserRoles(userId: string): Promise<UserRole[]> {
    try {
      const response = await this.get<{ roles: UserRole[] }>(
        `/users/${userId}/roles`
      );
      return response.roles;
    } catch (error) {
      logger.error('Failed to get user roles', { error, userId });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      return await this.tokenManager.refreshTokens(refreshToken);
    } catch (error) {
      logger.error('Token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Logout user
   */
  public async logout(sessionId: string): Promise<void> {
    try {
      await this.sessionManager.endSession(sessionId);
      await this.auditLogger.logEvent({
        type: 'USER_LOGOUT',
        userId: 'session:' + sessionId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Logout failed', { error, sessionId });
      throw error;
    }
  }
}
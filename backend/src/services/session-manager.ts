import { logger } from '@/utils/logger';
import {
  SessionConfig,
  Session,
  SessionMetadata,
  SessionStatus
} from '@/types';
import { generateSecureKey } from '@/utils/crypto';

export class SessionManager {
  private config: SessionConfig;
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: SessionConfig) {
    this.config = {
      maxConcurrentSessions: config.maxConcurrentSessions || 5,
      sessionTimeout: config.sessionTimeout || 3600000, // 1 hour
      inactivityTimeout: config.inactivityTimeout || 900000, // 15 minutes
      ...config,
    };

    this.startCleanupInterval();
    logger.info('SessionManager initialized');
  }

  /**
   * Create new session
   */
  public async createSession(metadata: SessionMetadata): Promise<Session> {
    try {
      // Check concurrent session limit
      await this.enforceSessionLimit(metadata.userId);

      const sessionId = generateSecureKey();
      const session: Session = {
        id: sessionId,
        userId: metadata.userId,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.sessionTimeout).toISOString(),
        metadata: {
          ip: metadata.ip,
          userAgent: metadata.userAgent,
          location: metadata.location,
          device: metadata.device,
        },
      };

      // Store session
      this.sessions.set(sessionId, session);

      // Add to user sessions
      if (!this.userSessions.has(metadata.userId)) {
        this.userSessions.set(metadata.userId, new Set());
      }
      this.userSessions.get(metadata.userId)?.add(sessionId);

      logger.info('Session created', {
        sessionId,
        userId: metadata.userId,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create session', { error, metadata });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  public async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      await this.endSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity
   */
  public async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    session.lastActivityAt = new Date().toISOString();
    this.sessions.set(sessionId, session);
  }

  /**
   * End session
   */
  public async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.status = 'ended';
      this.sessions.delete(sessionId);
      this.userSessions.get(session.userId)?.delete(sessionId);

      logger.info('Session ended', { sessionId });
    }
  }

  /**
   * Get all sessions for user
   */
  public async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * End all sessions for user
   */
  public async endUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    
    for (const sessionId of sessionIds) {
      await this.endSession(sessionId);
    }

    this.userSessions.delete(userId);
    logger.info('All user sessions ended', { userId });
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: Session): boolean {
    // Check absolute timeout
    if (new Date(session.expiresAt) <= new Date()) {
      return true;
    }

    // Check inactivity timeout
    const lastActivity = new Date(session.lastActivityAt);
    if (Date.now() - lastActivity.getTime() > this.config.inactivityTimeout) {
      return true;
    }

    return false;
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    if (sessions.length >= this.config.maxConcurrentSessions) {
      // End oldest session
      const oldestSession = sessions.reduce((a, b) => 
        new Date(a.createdAt) < new Date(b.createdAt) ? a : b
      );
      
      await this.endSession(oldestSession.id);
      logger.info('Oldest session ended due to limit', {
        userId,
        sessionId: oldestSession.id,
      });
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    for (const [sessionId, session] of this.sessions) {
      if (this.isSessionExpired(session)) {
        this.endSession(sessionId);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
      logger.debug('Session cleanup completed');
    }, 60000); // Run every minute
  }

  /**
   * Get session status
   */
  public async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return 'invalid';
    }

    if (this.isSessionExpired(session)) {
      return 'expired';
    }

    return session.status;
  }

  /**
   * Get active session count
   */
  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session metrics
   */
  public getSessionMetrics(): {
    totalSessions: number;
    activeUsers: number;
    averageSessionDuration: number;
  } {
    const activeSessions = Array.from(this.sessions.values());
    const uniqueUsers = new Set(activeSessions.map(s => s.userId));
    
    const durations = activeSessions.map(session => {
      const start = new Date(session.createdAt);
      const end = new Date(session.lastActivityAt);
      return end.getTime() - start.getTime();
    });

    const averageDuration = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalSessions: this.sessions.size,
      activeUsers: uniqueUsers.size,
      averageSessionDuration: averageDuration,
    };
  }
}
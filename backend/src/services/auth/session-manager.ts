import { SessionConfig, SessionInfo, SessionMetadata, SessionStatus } from '../../types';
import { generateSecureId } from '../../utils/crypto';
import logger from '../../utils/logger';

export class SessionManager {
  private sessions: Map<string, SessionInfo>;
  private userSessions: Map<string, Set<string>>;
  private config: SessionConfig;

  constructor(config: SessionConfig) {
    this.sessions = new Map();
    this.userSessions = new Map();
    this.config = config;
  }

  async createSession(userId: string, metadata: SessionMetadata): Promise<SessionInfo> {
    await this.enforceSessionLimit(userId);

    const sessionId = await generateSecureId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionTimeout * 1000);

    const session: SessionInfo = {
      id: sessionId,
      status: 'active',
      createdAt: now,
      lastActivity: now,
      expiresAt,
      metadata: {
        ...metadata,
        userId
      }
    };

    this.sessions.set(sessionId, session);
    
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)?.add(sessionId);

    return session;
  }

  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    if (this.isSessionExpired(session)) {
      await this.endSession(sessionId);
      return null;
    }

    return session;
  }

  async updateSession(sessionId: string): Promise<SessionInfo | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + this.config.sessionTimeout * 1000);
    
    this.sessions.set(sessionId, session);
    return session;
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.status = 'ended';
      const userId = session.metadata.userId;
      this.userSessions.get(userId)?.delete(sessionId);
      this.sessions.delete(sessionId);
    }
  }

  async endAllUserSessions(userId: string): Promise<void> {
    const userSessionIds = this.userSessions.get(userId);
    
    if (userSessionIds) {
      for (const sessionId of userSessionIds) {
        await this.endSession(sessionId);
      }
      this.userSessions.delete(userId);
    }
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessionIds = this.userSessions.get(userId);
    
    if (!userSessionIds) {
      return;
    }

    if (userSessionIds.size >= this.config.maxConcurrentSessions) {
      // End the oldest session
      const oldestSession = Array.from(userSessionIds)
        .map(id => this.sessions.get(id))
        .filter((session): session is SessionInfo => session !== undefined)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

      if (oldestSession) {
        await this.endSession(oldestSession.id);
      }
    }
  }

  private isSessionExpired(session: SessionInfo): boolean {
    const now = new Date();
    return session.expiresAt < now || 
           (now.getTime() - session.lastActivity.getTime()) > this.config.inactivityTimeout * 1000;
  }

  async cleanupExpiredSessions(): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        await this.endSession(sessionId);
      }
    }
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const userSessionIds = this.userSessions.get(userId);
    
    if (!userSessionIds) {
      return [];
    }

    const sessions: SessionInfo[] = [];
    for (const sessionId of userSessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }
}

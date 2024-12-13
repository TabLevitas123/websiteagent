import { config } from '../config';
import logger from '../utils/logger';

export interface Session {
  id: string;
  userId: string;
  data: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

export class SessionManager {
  private sessions: Map<string, Session>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.sessions = new Map();
    this.startCleanupInterval();
  }

  async createSession(userId: string, data: Record<string, any> = {}): Promise<Session> {
    const session: Session = {
      id: this.generateSessionId(),
      userId,
      data,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + config.session.maxAge)
    };

    this.sessions.set(session.id, session);
    logger.debug(`Created session ${session.id} for user ${userId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    if (this.isExpired(session)) {
      await this.destroySession(sessionId);
      return null;
    }

    session.lastAccessedAt = new Date();
    return session;
  }

  async updateSession(sessionId: string, data: Partial<Record<string, any>>): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    session.data = { ...session.data, ...data };
    session.lastAccessedAt = new Date();
    this.sessions.set(sessionId, session);

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      logger.debug(`Destroyed session ${sessionId}`);
    }
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessions: Session[] = [];
    
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !this.isExpired(session)) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  async destroyUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      await this.destroySession(session.id);
    }

    logger.debug(`Destroyed all sessions for user ${userId}`);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      config.session.cleanupInterval
    );
  }

  private async cleanup(): Promise<void> {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (this.isExpired(session)) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      await this.destroySession(sessionId);
    }

    if (expiredSessions.length > 0) {
      logger.debug(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  private isExpired(session: Session): boolean {
    return session.expiresAt <= new Date();
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
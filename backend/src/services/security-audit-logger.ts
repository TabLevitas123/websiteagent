import { logger } from '@/utils/logger';
import {
  AuditConfig,
  AuditEvent,
  AuditLevel,
  AuditFilter,
  SecurityEvent,
  AuditMetrics
} from '@/types';
import { createHash } from 'crypto';

export class SecurityAuditLogger {
  private config: AuditConfig;
  private events: AuditEvent[] = [];
  private alertCallbacks: ((event: AuditEvent) => void)[] = [];
  private retentionDays: number;

  constructor(config: AuditConfig) {
    this.config = {
      logLevel: config.logLevel || 'info',
      retentionPeriod: config.retentionPeriod || 365, // days
      maxEvents: config.maxEvents || 1000000,
      alertThresholds: config.alertThresholds || {
        failedLogins: 5,
        suspiciousActivities: 3,
        criticalEvents: 1,
      },
      ...config,
    };

    this.retentionDays = this.config.retentionPeriod;
    this.startCleanupInterval();

    logger.info('SecurityAuditLogger initialized', {
      logLevel: this.config.logLevel,
      retentionDays: this.retentionDays,
    });
  }

  /**
   * Log security event
   */
  public async logEvent(event: SecurityEvent): Promise<void> {
    try {
      const auditEvent: AuditEvent = {
        id: this.generateEventId(),
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
        level: this.determineEventLevel(event),
        metadata: {
          ...event.metadata,
          sourceIp: event.metadata?.ip,
          userAgent: event.metadata?.userAgent,
        },
        hash: '',
      };

      // Generate event hash for integrity verification
      auditEvent.hash = this.generateEventHash(auditEvent);

      // Store event
      this.events.push(auditEvent);

      // Check alert thresholds
      this.checkAlertThresholds(auditEvent);

      // Log to system logger
      logger.info('Security event logged', {
        eventId: auditEvent.id,
        type: auditEvent.type,
        level: auditEvent.level,
      });

      // Enforce event limit
      if (this.events.length > this.config.maxEvents) {
        this.events = this.events.slice(-this.config.maxEvents);
      }
    } catch (error) {
      logger.error('Failed to log security event', { error, event });
      throw error;
    }
  }

  /**
   * Get audit events with filtering
   */
  public async getEvents(filter?: AuditFilter): Promise<AuditEvent[]> {
    try {
      let filteredEvents = [...this.events];

      if (filter) {
        if (filter.startDate) {
          filteredEvents = filteredEvents.filter(event =>
            new Date(event.timestamp) >= new Date(filter.startDate!)
          );
        }

        if (filter.endDate) {
          filteredEvents = filteredEvents.filter(event =>
            new Date(event.timestamp) <= new Date(filter.endDate!)
          );
        }

        if (filter.level) {
          filteredEvents = filteredEvents.filter(event =>
            event.level === filter.level
          );
        }

        if (filter.type) {
          filteredEvents = filteredEvents.filter(event =>
            event.type === filter.type
          );
        }

        if (filter.userId) {
          filteredEvents = filteredEvents.filter(event =>
            event.userId === filter.userId
          );
        }
      }

      return filteredEvents;
    } catch (error) {
      logger.error('Failed to get audit events', { error, filter });
      throw error;
    }
  }

  /**
   * Register alert callback
   */
  public onAlert(callback: (event: AuditEvent) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate event hash for integrity verification
   */
  private generateEventHash(event: AuditEvent): string {
    const { hash, ...eventWithoutHash } = event;
    return createHash('sha256')
      .update(JSON.stringify(eventWithoutHash))
      .digest('hex');
  }

  /**
   * Determine event severity level
   */
  private determineEventLevel(event: SecurityEvent): AuditLevel {
    const criticalEvents = [
      'AUTH_BREACH_ATTEMPT',
      'PRIVILEGE_ESCALATION',
      'SUSPICIOUS_ACTIVITY',
      'DATA_BREACH',
    ];

    const warningEvents = [
      'AUTH_FAILURE',
      'INVALID_TOKEN',
      'SESSION_HIJACK_ATTEMPT',
      'RATE_LIMIT_EXCEEDED',
    ];

    if (criticalEvents.includes(event.type)) {
      return 'critical';
    }

    if (warningEvents.includes(event.type)) {
      return 'warning';
    }

    return 'info';
  }

  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(event: AuditEvent): void {
    const recentEvents = this.getRecentEvents(event.userId, 300000); // 5 minutes

    // Check failed login attempts
    if (event.type === 'AUTH_FAILURE') {
      const failedLogins = recentEvents.filter(e => e.type === 'AUTH_FAILURE');
      if (failedLogins.length >= this.config.alertThresholds.failedLogins) {
        this.triggerAlert({
          ...event,
          type: 'EXCESSIVE_AUTH_FAILURES',
          level: 'critical',
          metadata: {
            ...event.metadata,
            failedAttempts: failedLogins.length,
          },
        });
      }
    }

    // Check suspicious activities
    if (event.level === 'warning') {
      const suspiciousEvents = recentEvents.filter(e => e.level === 'warning');
      if (suspiciousEvents.length >= this.config.alertThresholds.suspiciousActivities) {
        this.triggerAlert({
          ...event,
          type: 'SUSPICIOUS_ACTIVITY_DETECTED',
          level: 'critical',
          metadata: {
            ...event.metadata,
            eventCount: suspiciousEvents.length,
          },
        });
      }
    }

    // Always alert on critical events
    if (event.level === 'critical') {
      this.triggerAlert(event);
    }
  }

  /**
   * Get recent events for user
   */
  private getRecentEvents(userId: string, timeWindow: number): AuditEvent[] {
    const cutoff = Date.now() - timeWindow;
    return this.events.filter(event =>
      event.userId === userId &&
      new Date(event.timestamp).getTime() > cutoff
    );
  }

  /**
   * Trigger alert callbacks
   */
  private triggerAlert(event: AuditEvent): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Alert callback failed', { error, event });
      }
    });
  }

  /**
   * Clean up old events
   */
  private cleanupEvents(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    this.events = this.events.filter(event =>
      new Date(event.timestamp) > cutoff
    );

    logger.debug('Audit event cleanup completed', {
      remainingEvents: this.events.length,
    });
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupEvents();
    }, 86400000); // Run daily
  }

  /**
   * Verify event integrity
   */
  public verifyEventIntegrity(event: AuditEvent): boolean {
    const originalHash = event.hash;
    const { hash, ...eventWithoutHash } = event;
    const calculatedHash = this.generateEventHash({ ...eventWithoutHash, hash: '' });
    return originalHash === calculatedHash;
  }

  /**
   * Get audit metrics
   */
  public getMetrics(): AuditMetrics {
    const now = Date.now();
    const last24h = now - 86400000;
    const last7d = now - 604800000;

    const events24h = this.events.filter(e => 
      new Date(e.timestamp).getTime() > last24h
    );
    const events7d = this.events.filter(e => 
      new Date(e.timestamp).getTime() > last7d
    );

    return {
      totalEvents: this.events.length,
      events24h: events24h.length,
      events7d: events7d.length,
      criticalEvents24h: events24h.filter(e => e.level === 'critical').length,
      warningEvents24h: events24h.filter(e => e.level === 'warning').length,
      topEventTypes: this.getTopEventTypes(),
      activeUsers: this.getActiveUsers(),
      integrityStatus: this.verifyAllEvents(),
    };
  }

  /**
   * Get top event types
   */
  private getTopEventTypes(): Record<string, number> {
    const typeCounts: Record<string, number> = {};
    this.events.forEach(event => {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });
    return typeCounts;
  }

  /**
   * Get active users
   */
  private getActiveUsers(): number {
    const uniqueUsers = new Set(
      this.events
        .filter(e => new Date(e.timestamp).getTime() > Date.now() - 86400000)
        .map(e => e.userId)
    );
    return uniqueUsers.size;
  }

  /**
   * Verify all events integrity
   */
  private verifyAllEvents(): boolean {
    return this.events.every(event => this.verifyEventIntegrity(event));
  }
}

export default SecurityAuditLogger;
import logger from '../utils/logger';
import { AuditConfig, AuditEvent, AuditLevel, AuditMetrics } from '../types';
import { hashData } from '../utils/crypto';

export class SecurityAuditLogger {
  private events: AuditEvent[] = [];
  private config: AuditConfig;

  constructor(config: AuditConfig) {
    this.config = {
      logLevel: config.logLevel,
      retentionPeriod: config.retentionPeriod,
      maxEvents: config.maxEvents,
      alertThresholds: {
        warning: config.alertThresholds.warning,
        critical: config.alertThresholds.critical
      }
    };

    this.startPeriodicCleanup();
  }

  async logEvent(event: Partial<AuditEvent>): Promise<void> {
    const now = new Date();
    const fullEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: now,
      level: event.level || 'info',
      type: event.type || 'unknown',
      userId: event.userId,
      sessionId: event.sessionId,
      message: event.message || '',
      metadata: event.metadata,
      hash: this.generateEventHash({
        ...event,
        timestamp: now
      })
    };

    this.events.push(fullEvent);
    this.enforceEventLimit();
    await this.checkThresholds(fullEvent);

    logger.log(fullEvent.level, fullEvent.message, {
      eventId: fullEvent.id,
      type: fullEvent.type,
      userId: fullEvent.userId,
      metadata: fullEvent.metadata
    });
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventHash(event: Partial<AuditEvent>): string {
    const data = JSON.stringify({
      timestamp: event.timestamp,
      type: event.type,
      userId: event.userId,
      sessionId: event.sessionId,
      message: event.message,
      metadata: event.metadata
    });

    return hashData(data);
  }

  private enforceEventLimit(): void {
    if (this.events.length > this.config.maxEvents) {
      const excess = this.events.length - this.config.maxEvents;
      this.events.splice(0, excess);
    }
  }

  private async checkThresholds(event: AuditEvent): Promise<void> {
    const recentEvents = this.getRecentEvents();
    const metrics = this.calculateMetrics(recentEvents);

    if (event.level === 'critical' || metrics.criticalEvents >= this.config.alertThresholds.critical) {
      await this.handleCriticalAlert(event, metrics);
    } else if (event.level === 'warning' || metrics.warningEvents >= this.config.alertThresholds.warning) {
      await this.handleWarningAlert(event, metrics);
    }
  }

  private getRecentEvents(duration: number = 3600000): AuditEvent[] {
    const cutoff = new Date(Date.now() - duration);
    return this.events.filter(event => event.timestamp >= cutoff);
  }

  private calculateMetrics(events: AuditEvent[]): AuditMetrics {
    const metrics: AuditMetrics = {
      totalEvents: events.length,
      criticalEvents: 0,
      warningEvents: 0,
      events24h: {
        total: 0,
        critical: 0,
        warning: 0
      }
    };

    const last24h = new Date(Date.now() - 24 * 3600000);

    for (const event of events) {
      if (event.level === 'critical') {
        metrics.criticalEvents++;
      } else if (event.level === 'warning') {
        metrics.warningEvents++;
      }

      if (event.timestamp >= last24h) {
        metrics.events24h.total++;
        if (event.level === 'critical') {
          metrics.events24h.critical++;
        } else if (event.level === 'warning') {
          metrics.events24h.warning++;
        }
      }
    }

    return metrics;
  }

  private async handleCriticalAlert(event: AuditEvent, metrics: AuditMetrics): Promise<void> {
    logger.error('Critical security alert', {
      event,
      metrics,
      threshold: this.config.alertThresholds.critical
    });

    // Here you would typically:
    // 1. Send notifications to security team
    // 2. Trigger incident response procedures
    // 3. Update security dashboards
    // 4. Log to external security monitoring systems
  }

  private async handleWarningAlert(event: AuditEvent, metrics: AuditMetrics): Promise<void> {
    logger.warn('Security warning alert', {
      event,
      metrics,
      threshold: this.config.alertThresholds.warning
    });

    // Here you would typically:
    // 1. Update security dashboards
    // 2. Log to monitoring systems
    // 3. Send notifications if pattern detected
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.config.retentionPeriod * 1000);
      this.events = this.events.filter(event => event.timestamp >= cutoff);
    }, 3600000); // Run cleanup every hour
  }

  async getMetrics(): Promise<AuditMetrics> {
    return this.calculateMetrics(this.events);
  }

  async verifyEventIntegrity(event: AuditEvent): Promise<boolean> {
    const computedHash = this.generateEventHash(event);
    return computedHash === event.hash;
  }

  async searchEvents(options: {
    startDate?: Date;
    endDate?: Date;
    level?: AuditLevel;
    userId?: string;
    type?: string;
  }): Promise<AuditEvent[]> {
    return this.events.filter(event => {
      if (options.startDate && event.timestamp < options.startDate) return false;
      if (options.endDate && event.timestamp > options.endDate) return false;
      if (options.level && event.level !== options.level) return false;
      if (options.userId && event.userId !== options.userId) return false;
      if (options.type && event.type !== options.type) return false;
      return true;
    });
  }
}

export default SecurityAuditLogger;
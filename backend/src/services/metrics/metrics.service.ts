import { Metric, MetricType } from '../../models/metric';
import { config } from '../../config';
import logger from '../../utils/logger';

interface MetricQuery {
  type?: MetricType;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export class MetricsService {
  private metrics: Map<string, Metric>;

  constructor() {
    this.metrics = new Map();
    this.startCleanupInterval();
  }

  async addMetric(metric: Metric): Promise<void> {
    try {
      this.validateMetric(metric);
      this.metrics.set(metric.id, metric);
      logger.debug(`Added metric ${metric.id} of type ${metric.type}`);
    } catch (error) {
      logger.error('Error adding metric:', error);
      throw error;
    }
  }

  async getMetric(id: string): Promise<Metric | null> {
    const metric = this.metrics.get(id);
    return metric || null;
  }

  async getMetricsByType(type: string): Promise<Metric[]> {
    try {
      return Array.from(this.metrics.values())
        .filter(metric => metric.type === type)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      logger.error('Error getting metrics by type:', error);
      throw error;
    }
  }

  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    try {
      let filteredMetrics = Array.from(this.metrics.values());

      if (query.type) {
        filteredMetrics = filteredMetrics.filter(m => m.type === query.type);
      }

      if (query.startTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= query.startTime!);
      }

      if (query.endTime) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp <= query.endTime!);
      }

      // Sort by timestamp
      filteredMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Apply pagination
      if (query.offset !== undefined && query.limit !== undefined) {
        filteredMetrics = filteredMetrics.slice(query.offset, query.offset + query.limit);
      }

      return filteredMetrics;
    } catch (error) {
      logger.error('Error querying metrics:', error);
      throw error;
    }
  }

  async deleteMetricsByType(type: string, startTime: Date, endTime: Date): Promise<void> {
    try {
      const metricsToDelete: string[] = [];

      for (const [id, metric] of this.metrics) {
        if (
          metric.type === type &&
          metric.timestamp >= startTime &&
          metric.timestamp <= endTime
        ) {
          metricsToDelete.push(id);
        }
      }

      metricsToDelete.forEach(id => this.metrics.delete(id));
      logger.debug(`Deleted ${metricsToDelete.length} metrics of type ${type}`);
    } catch (error) {
      logger.error('Error deleting metrics:', error);
      throw error;
    }
  }

  async deleteMetric(id: string): Promise<boolean> {
    try {
      const deleted = this.metrics.delete(id);
      if (deleted) {
        logger.debug(`Deleted metric ${id}`);
      }
      return deleted;
    } catch (error) {
      logger.error('Error deleting metric:', error);
      throw error;
    }
  }

  private validateMetric(metric: Metric): void {
    if (!metric.id) {
      throw new Error('Metric must have an ID');
    }

    if (!metric.type) {
      throw new Error('Metric must have a type');
    }

    if (typeof metric.value !== 'number') {
      throw new Error('Metric value must be a number');
    }

    if (!(metric.timestamp instanceof Date)) {
      throw new Error('Metric timestamp must be a valid Date object');
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Run cleanup every hour
  }

  private cleanupOldMetrics(): void {
    try {
      const retentionDate = new Date(Date.now() - config.metrics.retentionPeriod);
      const metricsToDelete: string[] = [];

      for (const [id, metric] of this.metrics) {
        if (metric.timestamp < retentionDate) {
          metricsToDelete.push(id);
        }
      }

      metricsToDelete.forEach(id => this.metrics.delete(id));

      if (metricsToDelete.length > 0) {
        logger.debug(`Cleaned up ${metricsToDelete.length} old metrics`);
      }
    } catch (error) {
      logger.error('Error during metrics cleanup:', error);
    }
  }

  dispose(): void {
    // Clean up any resources if needed
  }
}

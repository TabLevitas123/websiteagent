import { Metric, MetricType, MetricsServiceConfig } from '../../types';
import { MetricModel } from '../../models/metric';
import { logger } from '../../utils/logger';

export class MetricsService {
  private metrics: Map<string, MetricModel>;
  private config: MetricsServiceConfig;

  constructor(config: MetricsServiceConfig) {
    this.metrics = new Map();
    this.config = config;
  }

  async addMetric(data: Partial<Metric>): Promise<MetricModel> {
    try {
      MetricModel.validate(data);
      const metric = new MetricModel(data);
      this.metrics.set(metric.id, metric);
      logger.info(`Added new metric: ${metric.id}`);
      return metric;
    } catch (error) {
      logger.error(`Error adding metric: ${error.message}`);
      throw error;
    }
  }

  async getMetric(id: string): Promise<MetricModel | undefined> {
    return this.metrics.get(id);
  }

  async getMetricsByType(type: MetricType): Promise<MetricModel[]> {
    return Array.from(this.metrics.values()).filter(metric => metric.type === type);
  }

  async getMetricsInTimeRange(startTime: Date, endTime: Date): Promise<MetricModel[]> {
    return Array.from(this.metrics.values()).filter(metric => 
      metric.timestamp >= startTime && metric.timestamp <= endTime
    );
  }

  async updateMetric(id: string, data: Partial<Metric>): Promise<MetricModel | undefined> {
    const existingMetric = this.metrics.get(id);
    if (!existingMetric) {
      return undefined;
    }

    try {
      MetricModel.validate({ ...existingMetric, ...data });
      const updatedMetric = new MetricModel({ ...existingMetric, ...data });
      this.metrics.set(id, updatedMetric);
      logger.info(`Updated metric: ${id}`);
      return updatedMetric;
    } catch (error) {
      logger.error(`Error updating metric: ${error.message}`);
      throw error;
    }
  }

  async deleteMetric(id: string): Promise<boolean> {
    const deleted = this.metrics.delete(id);
    if (deleted) {
      logger.info(`Deleted metric: ${id}`);
    }
    return deleted;
  }

  async cleanupOldMetrics(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    const oldMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.timestamp < cutoffTime);

    oldMetrics.forEach(metric => {
      this.metrics.delete(metric.id);
      logger.info(`Cleaned up old metric: ${metric.id}`);
    });
  }
}

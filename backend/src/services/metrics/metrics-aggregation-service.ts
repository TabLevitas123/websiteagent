import { IMetric } from '@/models/metric';
import { logger } from '@/utils/logger';
import { EventEmitter } from 'events';
import { MetricsService } from './metrics.service';

interface AggregateResult {
  type: string;
  interval: {
    start: number;
    end: number;
  };
  metrics: {
    count: number;
    min: number;
    max: number;
    avg: number;
    sum: number;
    variance: number;
    stdDev: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  metadata?: Record<string, any>;
}

interface AggregateOptions {
  interval?: number; // milliseconds
  functions?: Array<keyof AggregateResult['metrics']>;
  groupBy?: string[];
}

export class MetricsAggregationService extends EventEmitter {
  private readonly metricsService: MetricsService;

  constructor(metricsService: MetricsService) {
    super();
    this.metricsService = metricsService;
  }

  /**
   * Get aggregated metrics
   */
  public async getAggregates(
    start: number,
    end: number,
    types?: string[],
    options: AggregateOptions = {}
  ): Promise<AggregateResult[]> {
    try {
      const metrics = await this.metricsService.getMetrics(start, end, types);

      // Group metrics by type and interval if specified
      const grouped = this.groupMetrics(metrics, options);

      // Calculate aggregates for each group
      const results = await Promise.all(
        Object.entries(grouped).map(async ([key, groupMetrics]) => {
          const [type, ...groupValues] = key.split(':');
          const aggregates = await this.calculateAggregates(groupMetrics, options.functions);

          return {
            type,
            interval: {
              start: Math.min(...groupMetrics.map(m => m.timestamp)),
              end: Math.max(...groupMetrics.map(m => m.timestamp))
            },
            metrics: aggregates,
            metadata: options.groupBy ? 
              Object.fromEntries(
                options.groupBy.map((field, i) => [field, groupValues[i]])
              ) : 
              undefined
          };
        })
      );

      logger.info('Metrics aggregated', {
        start,
        end,
        types,
        groupCount: results.length
      });

      return results;

    } catch (error) {
      logger.error('Failed to aggregate metrics', { error });
      throw error;
    }
  }

  /**
   * Group metrics by type and custom fields
   */
  private groupMetrics(
    metrics: IMetric[],
    options: AggregateOptions
  ): Record<string, IMetric[]> {
    const grouped: Record<string, IMetric[]> = {};

    for (const metric of metrics) {
      let key = metric.type;

      // Add groupBy values to key if specified
      if (options.groupBy?.length) {
        const groupValues = options.groupBy.map(field => 
          metric.metadata?.[field] ?? 'unknown'
        );
        key += ':' + groupValues.join(':');
      }

      // Group by interval if specified
      if (options.interval) {
        const intervalStart = Math.floor(metric.timestamp / options.interval) * options.interval;
        key += `:${intervalStart}`;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(metric);
    }

    return grouped;
  }

  /**
   * Calculate aggregates for a set of metrics
   */
  private async calculateAggregates(
    metrics: IMetric[],
    functions?: Array<keyof AggregateResult['metrics']>
  ): Promise<AggregateResult['metrics']> {
    const values = metrics.map(m => m.value);
    const count = values.length;

    // Basic statistics
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;

    // Calculate variance and standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const sorted = [...values].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * count) - 1;
      return sorted[index];
    };

    const p50 = getPercentile(50);
    const p90 = getPercentile(90);
    const p95 = getPercentile(95);
    const p99 = getPercentile(99);

    // Return only requested functions if specified
    const allMetrics = {
      count,
      min,
      max,
      avg,
      sum,
      variance,
      stdDev,
      p50,
      p90,
      p95,
      p99
    };

    if (functions?.length) {
      return Object.fromEntries(
        Object.entries(allMetrics).filter(([key]) => 
          functions.includes(key as keyof AggregateResult['metrics'])
        )
      ) as AggregateResult['metrics'];
    }

    return allMetrics;
  }

  /**
   * Get time series data with aggregates
   */
  public async getTimeSeries(
    start: number,
    end: number,
    interval: number,
    types?: string[],
    functions?: Array<keyof AggregateResult['metrics']>
  ): Promise<AggregateResult[]> {
    return this.getAggregates(start, end, types, {
      interval,
      functions
    });
  }

  /**
   * Get metric anomalies based on standard deviation
   */
  public async getAnomalies(
    start: number,
    end: number,
    types?: string[],
    stdDevThreshold = 2
  ): Promise<IMetric[]> {
    try {
      const metrics = await this.metricsService.getMetrics(start, end, types);
      const aggregatesByType = new Map<string, AggregateResult['metrics']>();

      // Calculate aggregates for each type
      for (const type of new Set(metrics.map(m => m.type))) {
        const typeMetrics = metrics.filter(m => m.type === type);
        const aggregates = await this.calculateAggregates(typeMetrics);
        aggregatesByType.set(type, aggregates);
      }

      // Find anomalies
      const anomalies = metrics.filter(metric => {
        const aggregates = aggregatesByType.get(metric.type);
        if (!aggregates) return false;

        const deviations = Math.abs(metric.value - aggregates.avg) / aggregates.stdDev;
        return deviations > stdDevThreshold;
      });

      logger.info('Anomalies detected', {
        start,
        end,
        types,
        anomalyCount: anomalies.length,
        totalCount: metrics.length
      });

      return anomalies;

    } catch (error) {
      logger.error('Failed to detect anomalies', { error });
      throw error;
    }
  }

  /**
   * Get metric anomalies based on standard deviation
   */
  public async getAnomalies(
    start: number,
    end: number,
    types?: string[],
    stdDevThreshold = 2
  ): Promise<IMetric[]> {
    try {
      const metrics = await this.metricsService.getMetrics(start, end, types);
      const aggregatesByType = new Map<string, AggregateResult['metrics']>();

      // Calculate aggregates for each type
      for (const type of new Set(metrics.map(m => m.type))) {
        const typeMetrics = metrics.filter(m => m.type === type);
        const aggregates = await this.calculateAggregates(typeMetrics);
        aggregatesByType.set(type, aggregates);
      }

      // Find anomalies
      const anomalies = metrics.filter(metric => {
        const aggregates = aggregatesByType.get(metric.type);
        if (!aggregates) return false;

        const deviations = Math.abs(metric.value - aggregates.avg) / aggregates.stdDev;
        return deviations > stdDevThreshold;
      });

      logger.info('Anomalies detected', {
        start,
        end,
        types,
        anomalyCount: anomalies.length,
        totalCount: metrics.length
      });

      return anomalies;

    } catch (error) {
      logger.error('Failed to detect anomalies', { error });
      throw error;
    }
  }
}

export default MetricsAggregationService;
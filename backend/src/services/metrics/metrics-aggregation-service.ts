import { Metric } from '../../models/metric';
import logger from '@/utils/logger';
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

export interface AggregatedMetrics {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  stdDev: number;
  p95: number;
  p99: number;
}

export class MetricsAggregationService extends MetricsService {
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
    metrics: Metric[],
    options: AggregateOptions
  ): Record<string, Metric[]> {
    const grouped: Record<string, Metric[]> = {};

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
    metrics: Metric[],
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
  ): Promise<Metric[]> {
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

  async aggregateMetrics(metrics: Metric[]): Promise<AggregatedMetrics> {
    if (!metrics || metrics.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        p95: 0,
        p99: 0
      };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = values[0];
    const max = values[count - 1];

    // Calculate standard deviation
    const squaredDiffs = values.map(value => Math.pow(value - average, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Calculate percentiles
    const p95Index = Math.ceil(count * 0.95) - 1;
    const p99Index = Math.ceil(count * 0.99) - 1;

    return {
      count,
      sum,
      average,
      min,
      max,
      stdDev,
      p95: values[p95Index],
      p99: values[p99Index]
    };
  }

  async getAggregatedMetricsByType(type: string, startTime: Date, endTime: Date): Promise<AggregatedMetrics> {
    const metrics = await this.metricsService.getMetricsInTimeRange(startTime, endTime);
    const filteredMetrics = metrics.filter(metric => metric.type === type);
    return this.aggregateMetrics(filteredMetrics);
  }

  async getAggregatedMetricsByTimeWindow(
    type: string,
    startTime: Date,
    endTime: Date,
    windowSize: number
  ): Promise<Map<string, AggregatedMetrics>> {
    const metrics = await this.metricsService.getMetricsInTimeRange(startTime, endTime);
    const filteredMetrics = metrics.filter(metric => metric.type === type);
    
    const windows = new Map<string, Metric[]>();
    
    filteredMetrics.forEach(metric => {
      const windowStart = new Date(
        Math.floor(metric.timestamp.getTime() / windowSize) * windowSize
      );
      const key = windowStart.toISOString();
      
      if (!windows.has(key)) {
        windows.set(key, []);
      }
      windows.get(key)!.push(metric);
    });

    const result = new Map<string, AggregatedMetrics>();
    for (const [key, windowMetrics] of windows) {
      result.set(key, await this.aggregateMetrics(windowMetrics));
    }

    return result;
  }
}

export default MetricsAggregationService;
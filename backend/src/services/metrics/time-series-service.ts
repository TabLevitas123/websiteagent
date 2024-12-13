import { logger } from '@/utils/logger';
import { MetricsAggregationService } from './metrics-aggregation.service';

interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

interface TimeSeriesQuery {
  startTime: number;
  endTime: number;
  interval?: number;
  aggregation?: 'sum' | 'avg' | 'min' | 'max';
}

export class TimeSeriesService {
  private readonly aggregationService: MetricsAggregationService;

  constructor(aggregationService: MetricsAggregationService) {
    this.aggregationService = aggregationService;
    logger.info('TimeSeriesService initialized');
  }

  /**
   * Ingest time series data point
   */
  public async ingestData(
    seriesId: string,
    dataPoint: TimeSeriesDataPoint
  ): Promise<void> {
    try {
      // Store data point using existing metrics service
      await this.aggregationService.getAggregates(
        dataPoint.timestamp,
        dataPoint.timestamp,
        [seriesId]
      );

      logger.debug('Time series data ingested', {
        seriesId,
        timestamp: dataPoint.timestamp
      });
    } catch (error) {
      logger.error('Failed to ingest time series data', { error });
      throw error;
    }
  }

  /**
   * Query time series data
   */
  public async queryData(
    seriesId: string,
    query: TimeSeriesQuery
  ): Promise<TimeSeriesDataPoint[]> {
    try {
      const results = await this.aggregationService.getTimeSeries(
        query.startTime,
        query.endTime,
        query.interval || 60000, // Default 1 minute intervals
        [seriesId]
      );

      return results.map(result => ({
        timestamp: result.interval.start,
        value: result.metrics.avg,
        metadata: result.metadata
      }));
    } catch (error) {
      logger.error('Failed to query time series data', { error });
      throw error;
    }
  }
}

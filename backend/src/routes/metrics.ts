import { Router } from 'express';
import { MetricsService } from '../services/metrics/metrics.service';
import { MetricsAggregationService } from '../services/metrics/metrics-aggregation-service';
import { TimeSeriesService } from '../services/metrics/time-series-service';
import { authenticate, authorize } from '../middleware/auth';
import { MetricModel } from '../models/metric';
import logger from '../utils/logger';
import express from 'express';
import { createRateLimiter, rateLimitMonitor } from '../middleware/rateLimit';

export function metricsRoutes(
  metricsService: MetricsService,
  metricsAggregationService: MetricsAggregationService,
  timeSeriesService: TimeSeriesService
) {
  const router = express.Router();

  // Apply rate limiting middleware
  router.use(rateLimitMonitor);

  // Different rate limits for different endpoints
  router.use('/type', createRateLimiter('authenticated'));
  router.use('/aggregate', createRateLimiter('authenticated'));
  router.use('/analysis', createRateLimiter('authenticated'));
  router.use('/', createRateLimiter('authenticated'));

  // Add new metric
  router.post('/', authenticate, async (req, res) => {
    try {
      const metricData = req.body;
      const metric = new MetricModel(metricData);
      await metricsService.addMetric(metric);
      res.status(201).json(metric);
    } catch (error) {
      logger.error('Error adding metric:', error);
      res.status(400).json({ error: 'Invalid metric data' });
    }
  });

  // Get metrics by type
  router.get('/type/:type', authenticate, async (req, res) => {
    try {
      const { type } = req.params;
      const metrics = await metricsService.getMetricsByType(type);
      res.json(metrics);
    } catch (error) {
      logger.error('Error getting metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  });

  // Get aggregated metrics
  router.get('/aggregate/:type', authenticate, async (req, res) => {
    try {
      const { type } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Missing time range parameters' });
      }

      const aggregated = await metricsAggregationService.getAggregatedMetricsByType(
        type,
        new Date(startTime as string),
        new Date(endTime as string)
      );

      res.json(aggregated);
    } catch (error) {
      logger.error('Error aggregating metrics:', error);
      res.status(500).json({ error: 'Failed to aggregate metrics' });
    }
  });

  // Get time series analysis
  router.get('/analysis/:type', authenticate, async (req, res) => {
    try {
      const { type } = req.params;
      const { startTime, endTime, steps } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Missing time range parameters' });
      }

      const metrics = await metricsService.getMetricsByType(type);
      const filteredMetrics = metrics.filter(
        m => m.timestamp >= new Date(startTime as string) && 
             m.timestamp <= new Date(endTime as string)
      );

      const trend = await timeSeriesService.analyzeTrend(filteredMetrics);
      const seasonality = await timeSeriesService.detectSeasonality(filteredMetrics);
      const outliers = await timeSeriesService.detectOutliers(filteredMetrics);
      const forecast = await timeSeriesService.forecast(
        filteredMetrics,
        steps ? parseInt(steps as string, 10) : 5
      );

      res.json({
        trend,
        seasonality,
        outliers,
        forecast
      });
    } catch (error) {
      logger.error('Error analyzing metrics:', error);
      res.status(500).json({ error: 'Failed to analyze metrics' });
    }
  });

  // Delete metrics (admin only)
  router.delete('/:type', authenticate, authorize(['admin']), async (req, res) => {
    try {
      const { type } = req.params;
      const { startTime, endTime } = req.query;

      if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Missing time range parameters' });
      }

      await metricsService.deleteMetricsByType(
        type,
        new Date(startTime as string),
        new Date(endTime as string)
      );

      res.json({ message: 'Metrics deleted successfully' });
    } catch (error) {
      logger.error('Error deleting metrics:', error);
      res.status(500).json({ error: 'Failed to delete metrics' });
    }
  });

  return router;
}

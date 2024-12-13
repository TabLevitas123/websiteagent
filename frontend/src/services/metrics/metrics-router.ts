import { Router } from 'express';
import { z } from 'zod';
import { MetricsService } from '@/services/metrics';
import { CacheService } from '@/services/cache';
import { logger } from '@/utils/logger';
import { validateBody } from '@/middleware/validation';
import { RateLimiter } from '@/utils/rateLimiter';

const router = Router();
const metricsService = new MetricsService();
const cacheService = new CacheService();

// Rate limiters for different endpoints
const getMetricsLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

const submitMetricsLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 200
});

// Validation schemas
const TimeRangeSchema = z.object({
  start: z.number().int().positive(),
  end: z.number().int().positive(),
  types: z.array(z.string()).optional()
});

const MetricDataSchema = z.object({
  type: z.string(),
  value: z.number(),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.any()).optional()
});

const SubmitMetricsSchema = z.object({
  metrics: z.array(MetricDataSchema)
});

// Get metrics for time range
router.get('/', getMetricsLimiter.check(), async (req, res) => {
  try {
    const { start, end, types } = TimeRangeSchema.parse(req.query);
    
    // Try to get from cache first
    const cacheKey = `metrics:${start}:${end}:${types?.join(',')}`;
    const cachedMetrics = await cacheService.get(cacheKey);
    
    if (cachedMetrics) {
      return res.json(JSON.parse(cachedMetrics));
    }

    // Get metrics from service
    const metrics = await metricsService.getMetrics(start, end, types);
    
    // Cache results
    await cacheService.set(cacheKey, JSON.stringify(metrics), 300); // 5 minutes
    
    res.json(metrics);

    // Log metrics retrieval
    logger.info('Metrics retrieved', {
      start,
      end,
      types,
      count: metrics.length
    });

  } catch (error) {
    logger.error('Failed to get metrics', { error });
    res.status(400).json({
      error: 'Invalid request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Submit new metrics
router.post('/', submitMetricsLimiter.check(), validateBody(SubmitMetricsSchema), async (req, res) => {
  try {
    const { metrics } = req.body;

    // Validate timestamp range
    const now = Date.now();
    const validMetrics = metrics.filter(metric => 
      metric.timestamp <= now && 
      metric.timestamp >= now - (24 * 60 * 60 * 1000) // Last 24 hours
    );

    if (validMetrics.length !== metrics.length) {
      logger.warn('Some metrics had invalid timestamps', {
        total: metrics.length,
        valid: validMetrics.length
      });
    }

    // Store metrics
    await metricsService.storeMetrics(validMetrics);

    // Clear relevant caches
    await cacheService.deletePattern('metrics:*');

    res.status(201).json({
      message: 'Metrics stored successfully',
      stored: validMetrics.length
    });

    logger.info('Metrics stored', {
      count: validMetrics.length,
      types: [...new Set(validMetrics.map(m => m.type))]
    });

  } catch (error) {
    logger.error('Failed to store metrics', { error });
    res.status(500).json({
      error: 'Failed to store metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get metric aggregates
router.get('/aggregates', getMetricsLimiter.check(), async (req, res) => {
  try {
    const { start, end, types } = TimeRangeSchema.parse(req.query);
    
    const cacheKey = `metrics:aggregates:${start}:${end}:${types?.join(',')}`;
    const cachedAggregates = await cacheService.get(cacheKey);
    
    if (cachedAggregates) {
      return res.json(JSON.parse(cachedAggregates));
    }

    const aggregates = await metricsService.getAggregates(start, end, types);
    
    await cacheService.set(cacheKey, JSON.stringify(aggregates), 300);
    
    res.json(aggregates);

    logger.info('Metric aggregates retrieved', {
      start,
      end,
      types
    });

  } catch (error) {
    logger.error('Failed to get metric aggregates', { error });
    res.status(400).json({
      error: 'Invalid request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Clear metrics
router.delete('/', async (req, res) => {
  try {
    const { start, end, types } = TimeRangeSchema.parse(req.query);
    
    const deleted = await metricsService.clearMetrics(start, end, types);
    
    // Clear all metric caches
    await cacheService.deletePattern('metrics:*');
    
    res.json({
      message: 'Metrics cleared successfully',
      deleted
    });

    logger.info('Metrics cleared', {
      start,
      end,
      types,
      count: deleted
    });

  } catch (error) {
    logger.error('Failed to clear metrics', { error });
    res.status(400).json({
      error: 'Invalid request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get metric types
router.get('/types', async (req, res) => {
  try {
    const types = await metricsService.getMetricTypes();
    res.json(types);
  } catch (error) {
    logger.error('Failed to get metric types', { error });
    res.status(500).json({
      error: 'Failed to get metric types'
    });
  }
});

export { router as metricsRouter };
import { Request, Response } from 'express';
import { metricsRoutes } from '../../routes/metrics';
import { MetricsService } from '../../services/metrics';
import { TimeSeriesService } from '../../services/timeSeries';
import { createMockRequest, createMockResponse, mockNext, mockMetricsData } from '../utils/testUtils';

// Mock services
jest.mock('../../services/metrics');
jest.mock('../../services/timeSeries');

describe('Metrics Routes', () => {
  let mockMetricsService: jest.Mocked<MetricsService>;
  let mockTimeSeriesService: jest.Mocked<TimeSeriesService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    mockMetricsService = {
      createMetric: jest.fn(),
      getMetrics: jest.fn(),
      getMetricsByType: jest.fn(),
      getMetricsByAgent: jest.fn(),
      aggregateMetrics: jest.fn(),
      analyzeMetrics: jest.fn(),
    } as any;

    mockTimeSeriesService = {
      getTimeSeries: jest.fn(),
      aggregateTimeSeries: jest.fn(),
    } as any;

    req = createMockRequest();
    res = createMockResponse();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a new metric successfully', async () => {
      mockMetricsService.createMetric.mockResolvedValue(mockMetricsData);
      req.body = {
        agentId: '1',
        type: 'EXECUTION',
        value: 1
      };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(mockMetricsService.createMetric).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockMetricsData);
    });

    it('should handle metric creation errors', async () => {
      mockMetricsService.createMetric.mockRejectedValue(new Error('Creation failed'));
      req.body = {
        agentId: '1',
        type: 'EXECUTION',
        value: 1
      };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Creation failed'
      });
    });
  });

  describe('GET /type/:type', () => {
    it('should get metrics by type successfully', async () => {
      const metrics = [mockMetricsData];
      mockMetricsService.getMetricsByType.mockResolvedValue(metrics);
      req.params = { type: 'EXECUTION' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(mockMetricsService.getMetricsByType).toHaveBeenCalledWith('EXECUTION');
      expect(res.json).toHaveBeenCalledWith(metrics);
    });

    it('should handle empty results', async () => {
      mockMetricsService.getMetricsByType.mockResolvedValue([]);
      req.params = { type: 'UNKNOWN' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'No metrics found for type: UNKNOWN'
      });
    });
  });

  describe('GET /agent/:agentId', () => {
    it('should get metrics by agent successfully', async () => {
      const metrics = [mockMetricsData];
      mockMetricsService.getMetricsByAgent.mockResolvedValue(metrics);
      req.params = { agentId: '1' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(mockMetricsService.getMetricsByAgent).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(metrics);
    });

    it('should handle agent not found', async () => {
      mockMetricsService.getMetricsByAgent.mockResolvedValue([]);
      req.params = { agentId: 'unknown' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'No metrics found for agent: unknown'
      });
    });
  });

  describe('GET /aggregate', () => {
    it('should aggregate metrics successfully', async () => {
      const aggregation = { total: 100, average: 10 };
      mockMetricsService.aggregateMetrics.mockResolvedValue(aggregation);
      req.query = { type: 'EXECUTION', timeframe: '24h' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(mockMetricsService.aggregateMetrics).toHaveBeenCalledWith('EXECUTION', '24h');
      expect(res.json).toHaveBeenCalledWith(aggregation);
    });

    it('should handle aggregation errors', async () => {
      mockMetricsService.aggregateMetrics.mockRejectedValue(new Error('Aggregation failed'));
      req.query = { type: 'EXECUTION', timeframe: 'invalid' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Aggregation failed'
      });
    });
  });

  describe('GET /analysis', () => {
    it('should analyze metrics successfully', async () => {
      const analysis = { trend: 'increasing', confidence: 0.95 };
      mockMetricsService.analyzeMetrics.mockResolvedValue(analysis);
      req.query = { type: 'EXECUTION', timeframe: '7d' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(mockMetricsService.analyzeMetrics).toHaveBeenCalledWith('EXECUTION', '7d');
      expect(res.json).toHaveBeenCalledWith(analysis);
    });

    it('should handle analysis errors', async () => {
      mockMetricsService.analyzeMetrics.mockRejectedValue(new Error('Analysis failed'));
      req.query = { type: 'UNKNOWN' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Analysis failed'
      });
    });
  });

  describe('GET /timeseries', () => {
    it('should get time series data successfully', async () => {
      const timeseriesData = [{ timestamp: new Date(), value: 1 }];
      mockTimeSeriesService.getTimeSeries.mockResolvedValue(timeseriesData);
      req.query = { metric: 'EXECUTION', interval: '1h' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(mockTimeSeriesService.getTimeSeries).toHaveBeenCalledWith('EXECUTION', '1h');
      expect(res.json).toHaveBeenCalledWith(timeseriesData);
    });

    it('should handle time series errors', async () => {
      mockTimeSeriesService.getTimeSeries.mockRejectedValue(new Error('Time series failed'));
      req.query = { metric: 'UNKNOWN' };

      const router = metricsRoutes(mockMetricsService, mockTimeSeriesService);
      await router.handle(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Time series failed'
      });
    });
  });
});

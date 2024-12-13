import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetric {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

interface MetricThreshold {
  warning: number;
  critical: number;
}

interface MetricConfig {
  name: string;
  unit: string;
  thresholds?: MetricThreshold;
  aggregation?: 'avg' | 'sum' | 'max' | 'min';
  retention?: number; // in milliseconds
}

interface UsePerformanceMetricsProps {
  metrics: MetricConfig[];
  interval?: number;
  maxDataPoints?: number;
  onThresholdExceeded?: (metric: string, value: number, threshold: MetricThreshold) => void;
  customMetrics?: Record<string, () => number>;
}

interface MetricStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  trend: 'up' | 'down' | 'stable';
  status: 'normal' | 'warning' | 'critical';
}

export const usePerformanceMetrics = ({
  metrics,
  interval = 5000,
  maxDataPoints = 1000,
  onThresholdExceeded
}: UsePerformanceMetricsProps) => {
  // State for storing metric data
  const [metricData, setMetricData] = useState<Record<string, PerformanceMetric[]>>({});
  const [metricStats, setMetricStats] = useState<Record<string, MetricStats>>({});
  const [isCollecting, setIsCollecting] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // References
  const collectionTimerRef = useRef<NodeJS.Timeout>();
  const metricsMap = useRef<Map<string, MetricConfig>>(new Map());

  // Initialize metrics map
  useEffect(() => {
    metrics.forEach(metric => {
      metricsMap.current.set(metric.name, metric);
      if (!metricData[metric.name]) {
        setMetricData(prev => ({ ...prev, [metric.name]: [] }));
      }
    });
  }, [metrics]);

  // Calculate metric statistics
  const calculateStats = useCallback((
    data: PerformanceMetric[],
    config: MetricConfig
  ): MetricStats => {
    if (data.length === 0) {
      return {
        current: 0,
        min: 0,
        max: 0,
        avg: 0,
        trend: 'stable',
        status: 'normal'
      };
    }

    const values = data.map(m => m.value);
    const current = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate trend
    const trendPeriod = Math.min(10, values.length);
    const recentValues = values.slice(-trendPeriod);
    const trendSlope = (recentValues[recentValues.length - 1] - recentValues[0]) / trendPeriod;
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(trendSlope) < 0.1 ? 'stable' :
      trendSlope > 0 ? 'up' : 'down';

    // Determine status
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (config.thresholds) {
      if (current >= config.thresholds.critical) {
        status = 'critical';
      } else if (current >= config.thresholds.warning) {
        status = 'warning';
      }

      // Trigger threshold callback
      if (status !== 'normal' && onThresholdExceeded) {
        onThresholdExceeded(config.name, current, config.thresholds);
      }
    }

    return { current, min, max, avg, trend, status };
  }, [onThresholdExceeded]);

  // Collect metrics
  const collectMetrics = useCallback(() => {
    try {
      // Get performance metrics with mobile device awareness
      const memoryUsage = performance.memory?.usedJSHeapSize || 0;
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resourceTiming = performance.getEntriesByType('resource');

      // Adjust collection frequency based on device capabilities
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const collectionInterval = isMobile ? interval * 2 : interval; // Reduce frequency on mobile

      // Adjust collection based on network conditions
      const connection = (navigator as any).connection;
      const isSlowNetwork = connection?.effectiveType === '2g' || connection?.effectiveType === '3g';
      if (isSlowNetwork) {
        collectionInterval *= 1.5; // Further reduce frequency on slow networks
      }

      metricsMap.current.forEach((config, name) => {
        let value = 0;

        // Collect different types of metrics
        switch (name) {
          case 'memory':
            value = memoryUsage / (1024 * 1024); // Convert to MB
            break;
          case 'loadTime':
            value = navigationTiming?.loadEventEnd || 0;
            break;
          case 'resourceCount':
            value = resourceTiming.length;
            break;
          case 'fps':
            // requestAnimationFrame-based FPS calculation
            value = calculateFPS();
            break;
          case 'diskUsage':
            // Get disk usage from navigator.storage if available
            if (navigator.storage && navigator.storage.estimate) {
              const estimate = await navigator.storage.estimate();
              value = (estimate.usage || 0) / (1024 * 1024); // Convert to MB
            }
            break;
          case 'networkBandwidth':
            // Estimate bandwidth from resource timing
            const recentResources = resourceTiming.slice(-5);
            if (recentResources.length > 0) {
              const totalBytes = recentResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
              const totalTime = recentResources.reduce((max, entry) => Math.max(max, entry.responseEnd), 0);
              value = totalBytes / (totalTime / 1000); // bytes per second
            }
            break;
          default:
            // Custom metric collection
            value = Math.random() * 100; // Replace with actual metric collection
        }

        const newMetric: PerformanceMetric = {
          timestamp: Date.now(),
          value,
          metadata: {
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        };

        setMetricData(prev => {
          const metrics = [...(prev[name] || []), newMetric];
          // Apply retention policy
          if (config.retention) {
            const cutoff = Date.now() - config.retention;
            return {
              ...prev,
              [name]: metrics.filter(m => m.timestamp >= cutoff)
            };
          }
          // Apply max data points limit
          return {
            ...prev,
            [name]: metrics.slice(-maxDataPoints)
          };
        });

        // Update stats
        setMetricStats(prev => ({
          ...prev,
          [name]: calculateStats(
            [...(metricData[name] || []), newMetric],
            config
          )
        }));
      });

      // Clear old performance entries
      performance.clearResourceTimings();
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to collect metrics'));
      logger.error('Performance metrics collection failed:', err);
    }
  }, [maxDataPoints, calculateStats, metricData]);

  // Start/stop collection
  // WebSocket connection for real-time updates
  const { socket } = useWebSocket();

  useEffect(() => {
    if (isCollecting) {
      collectMetrics();
      collectionTimerRef.current = setInterval(collectMetrics, interval);

      // Subscribe to real-time metric updates
      if (socket) {
        socket.subscribe('metrics-updates', (data) => {
          setMetricData(prev => ({
            ...prev,
            ...data
          }));
        });
      }
    }

    return () => {
      if (collectionTimerRef.current) {
        clearInterval(collectionTimerRef.current);
      }
      if (socket) {
        socket.unsubscribe('metrics-updates');
      }
    };
  }, [isCollecting, interval, collectMetrics, socket]);

  // Calculate FPS
  const calculateFPS = (): number => {
    let fps = 0;
    let lastTime = performance.now();
    let frames = 0;

    const countFrame = () => {
      const currentTime = performance.now();
      frames++;

      if (currentTime > lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(countFrame);
    };

    requestAnimationFrame(countFrame);
    return fps;
  };

  // Add support for custom performance metrics
  const collectCustomMetrics = useCallback(() => {
    if (!customMetrics) return {};
    
    const metrics: Record<string, number> = {};
    for (const [name, collector] of Object.entries(customMetrics)) {
      try {
        metrics[name] = collector();
      } catch (error) {
        logger.error(`Failed to collect custom metric ${name}:`, error);
      }
    }
    return metrics;
  }, [customMetrics]);

  return {
    metrics: metricData,
    stats: metricStats,
    isCollecting,
    error,
    startCollection: () => setIsCollecting(true),
    stopCollection: () => setIsCollecting(false),
    clearMetrics: () => {
      setMetricData({});
      setMetricStats({});
    },
    getMetricConfig: (name: string) => metricsMap.current.get(name)
  };
};

export default usePerformanceMetrics;
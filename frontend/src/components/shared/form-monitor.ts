import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from '@/hooks/useForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Gauge,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Memory,
  Timer,
} from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  validationLatency: number;
  memoryUsage: number;
  domOperations: number;
  eventHandlerTime: number;
  frameRate: number;
}

interface PerformanceThresholds {
  renderTime: number;
  validationLatency: number;
  memoryUsage: number;
  frameRate: number;
}

const FormMonitor: React.FC = () => {
  const { state } = useForm();
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    validationLatency: 0,
    memoryUsage: 0,
    domOperations: 0,
    eventHandlerTime: 0,
    frameRate: 60,
  });

  const performanceThresholds: PerformanceThresholds = {
    renderTime: 16, // 60fps target
    validationLatency: 100,
    memoryUsage: 50, // MB
    frameRate: 30,
  };

  useEffect(() => {
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let frameTimes: number[] = [];

    const measurePerformance = () => {
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      
      // Track frame rate
      frameTimes.push(frameDuration);
      if (frameTimes.length > 60) frameTimes.shift();
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      metricsRef.current.frameRate = 1000 / avgFrameTime;

      // Measure render time
      const renderStart = performance.now();
      requestAnimationFrame(() => {
        metricsRef.current.renderTime = performance.now() - renderStart;
      });

      // Measure memory usage if available
      if (performance.memory) {
        metricsRef.current.memoryUsage = 
          Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      }

      lastFrameTime = now;
      frameCount++;
      requestAnimationFrame(measurePerformance);
    };

    requestAnimationFrame(measurePerformance);

    // Cleanup
    return () => {
      frameTimes = [];
      frameCount = 0;
    };
  }, []);

  const getPerformanceStatus = (metric: keyof PerformanceMetrics): 'optimal' | 'warning' | 'critical' => {
    const value = metricsRef.current[metric];
    const threshold = performanceThresholds[metric as keyof PerformanceThresholds];
    
    if (!threshold) return 'optimal';
    
    if (value > threshold * 1.5) return 'critical';
    if (value > threshold) return 'warning';
    return 'optimal';
  };

  const getStatusColor = (status: 'optimal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'optimal':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const metrics = [
    {
      label: 'Frame Rate',
      value: `${Math.round(metricsRef.current.frameRate)} fps`,
      icon: <Timer className="w-4 h-4" />,
      metric: 'frameRate' as const,
    },
    {
      label: 'Render Time',
      value: `${Math.round(metricsRef.current.renderTime)} ms`,
      icon: <Gauge className="w-4 h-4" />,
      metric: 'renderTime' as const,
    },
    {
      label: 'Memory Usage',
      value: `${Math.round(metricsRef.current.memoryUsage)} MB`,
      icon: <Memory className="w-4 h-4" />,
      metric: 'memoryUsage' as const,
    },
    {
      label: 'Event Latency',
      value: `${Math.round(metricsRef.current.eventHandlerTime)} ms`,
      icon: <RefreshCw className="w-4 h-4" />,
      metric: 'eventHandlerTime' as const,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const status = getPerformanceStatus(metric.metric);
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg bg-secondary"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={getStatusColor(status)}>
                    {metric.icon}
                  </span>
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
              </motion.div>
            );
          })}
        </div>

        {Object.entries(metricsRef.current).some(
          ([key, value]) => getPerformanceStatus(key as keyof PerformanceMetrics) === 'critical'
        ) && (
          <Alert className="mt-4 bg-red-500/10 border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <AlertDescription className="text-red-500">
              Performance issues detected. Consider optimizing form rendering and validation.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FormMonitor;
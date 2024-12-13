import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePerformanceMetrics } from '@/hooks/use-performance-metrics';
import { Activity, Cpu, Memory, Network } from 'lucide-react';

interface DiagnosticsDashboardProps {
  theme?: Partial<ThemeConfig>;
  layout?: 'grid' | 'list';
}

const DiagnosticsDashboard: React.FC<DiagnosticsDashboardProps> = ({
  theme = defaultTheme,
  layout = 'grid'
}) => {
  const { metrics, stats } = usePerformanceMetrics({
    metrics: [
      { name: 'memory', unit: 'MB', thresholds: { warning: 80, critical: 90 } },
      { name: 'cpu', unit: '%', thresholds: { warning: 70, critical: 85 } },
      { name: 'fps', unit: 'fps', thresholds: { warning: 30, critical: 20 } },
      { name: 'latency', unit: 'ms', thresholds: { warning: 100, critical: 200 } }
    ],
    interval: 1000
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">System Diagnostics</h2>
      <div className={layout === 'grid' ? 
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8" : 
        "space-y-4"}>
        <MetricCard
          title="Memory Usage"
          value={stats.memory?.current || 0}
          unit="MB"
          icon={<Memory />}
          status={stats.memory?.status}
        />
        <MetricCard
          title="CPU Load"
          value={stats.cpu?.current || 0}
          unit="%"
          icon={<Cpu />}
          status={stats.cpu?.status}
        />
        <MetricCard
          title="FPS"
          value={stats.fps?.current || 0}
          unit="fps"
          icon={<Activity />}
          status={stats.fps?.status}
        />
        <MetricCard
          title="Network Latency"
          value={stats.latency?.current || 0}
          unit="ms"
          icon={<Network />}
          status={stats.latency?.status}
        />
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricsVisualization
          metricName="cpu"
          title="CPU Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="memory"
          title="Memory Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="diskUsage"
          title="Disk Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="networkBandwidth"
          title="Network Bandwidth"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="diskUsage"
          title="Disk Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="networkBandwidth"
          title="Network Bandwidth"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="cpu"
          title="CPU Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="memory"
          title="Memory Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="diskUsage"
          title="Disk Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="networkBandwidth"
          title="Network Bandwidth"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="cpu"
          title="CPU Usage Over Time"
          timeRange={5}
        />
        <MetricsVisualization
          metricName="memory"
          title="Memory Usage Over Time"
          timeRange={5}
        />
      </div>
    </div>
  );
};

import MetricsVisualization from './metrics-visualization';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  status?: 'normal' | 'warning' | 'critical';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon,
  status = 'normal'
}) => {
  const statusColors = {
    normal: theme.colors.status?.normal || 'text-green-500',
    warning: theme.colors.status?.warning || 'text-yellow-500',
    critical: theme.colors.status?.critical || 'text-red-500'
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={statusColors[status]}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value} {unit}
        </div>
      </CardContent>
    </Card>
  );
};

export default DiagnosticsDashboard;

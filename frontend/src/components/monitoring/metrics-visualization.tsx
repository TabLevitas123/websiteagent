import React from 'react';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePerformanceMetrics } from '@/hooks/use-performance-metrics';

interface MetricsVisualizationProps {
  metricName: string;
  title: string;
  timeRange?: number; // in minutes
}

const MetricsVisualization: React.FC<MetricsVisualizationProps> = ({
  metricName,
  title,
  timeRange = 5
}) => {
  const { metrics } = usePerformanceMetrics({
    metrics: [{ name: metricName }],
    interval: 1000,
    maxDataPoints: timeRange * 60
  });

  const data = {
    labels: metrics[metricName]?.map(m => 
      new Date(m.timestamp).toLocaleTimeString()
    ) || [],
    datasets: [{
      label: title,
      data: metrics[metricName]?.map(m => m.value) || [],
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    plugins: {
      tooltip: {
        enabled: true,
        intersect: false,
        mode: 'nearest'
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <Line data={data} options={options} />
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricsVisualization;

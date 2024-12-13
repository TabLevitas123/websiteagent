import React, { useEffect, useCallback } from 'react';
import { useForm } from '@/hooks/useForm';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Users, Activity, TrendingUp } from 'lucide-react';

interface AnalyticsEvent {
  type: string;
  fieldName?: string;
  value?: any;
  timestamp: number;
}

interface AnalyticsData {
  events: AnalyticsEvent[];
  metrics: {
    averageCompletionTime: number;
    conversionRate: number;
    errorRate: number;
    interactionRate: number;
  };
  timeSeriesData: Array<{
    timestamp: number;
    interactions: number;
    errors: number;
  }>;
}

const FormAnalytics: React.FC = () => {
  const { state } = useForm();
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData>({
    events: [],
    metrics: {
      averageCompletionTime: 0,
      conversionRate: 0,
      errorRate: 0,
      interactionRate: 0,
    },
    timeSeriesData: [],
  });

  const trackEvent = useCallback((event: AnalyticsEvent) => {
    setAnalyticsData(prev => ({
      ...prev,
      events: [...prev.events, event],
    }));
  }, []);

  useEffect(() => {
    // Track field interactions
    Object.entries(state.fields).forEach(([fieldName, field]) => {
      if (field.touched) {
        trackEvent({
          type: 'field_interaction',
          fieldName,
          value: field.value,
          timestamp: Date.now(),
        });
      }
    });

    // Update metrics
    const totalFields = Object.keys(state.fields).length;
    const touchedFields = Object.values(state.fields).filter(f => f.touched).length;
    const errorFields = Object.values(state.fields).filter(f => f.error).length;

    setAnalyticsData(prev => ({
      ...prev,
      metrics: {
        averageCompletionTime: calculateAverageCompletionTime(prev.events),
        conversionRate: (state.submitCount / Math.max(touchedFields, 1)) * 100,
        errorRate: (errorFields / Math.max(totalFields, 1)) * 100,
        interactionRate: (touchedFields / Math.max(totalFields, 1)) * 100,
      },
      timeSeriesData: generateTimeSeriesData(prev.events),
    }));
  }, [state, trackEvent]);

  const calculateAverageCompletionTime = (events: AnalyticsEvent[]): number => {
    if (events.length < 2) return 0;
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    return (lastEvent.timestamp - firstEvent.timestamp) / 1000; // in seconds
  };

  const generateTimeSeriesData = (events: AnalyticsEvent[]) => {
    const timeWindows = 10; // Number of time windows to display
    const now = Date.now();
    const windowSize = 30 * 1000; // 30 seconds per window

    return Array.from({ length: timeWindows }, (_, i) => {
      const windowStart = now - (timeWindows - i) * windowSize;
      const windowEnd = windowStart + windowSize;

      const windowEvents = events.filter(
        event => event.timestamp >= windowStart && event.timestamp < windowEnd
      );

      return {
        timestamp: windowStart,
        interactions: windowEvents.filter(e => e.type === 'field_interaction').length,
        errors: windowEvents.filter(e => e.type === 'validation_error').length,
      };
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Form Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Avg. Completion Time',
              value: `${Math.round(analyticsData.metrics.averageCompletionTime)}s`,
              icon: <Clock className="w-4 h-4 text-blue-500" />,
            },
            {
              label: 'Conversion Rate',
              value: `${Math.round(analyticsData.metrics.conversionRate)}%`,
              icon: <Users className="w-4 h-4 text-green-500" />,
            },
            {
              label: 'Error Rate',
              value: `${Math.round(analyticsData.metrics.errorRate)}%`,
              icon: <Activity className="w-4 h-4 text-red-500" />,
            },
            {
              label: 'Interaction Rate',
              value: `${Math.round(analyticsData.metrics.interactionRate)}%`,
              icon: <TrendingUp className="w-4 h-4 text-yellow-500" />,
            },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                {metric.icon}
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="h-[300px] mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analyticsData.timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
              />
              <Line
                type="monotone"
                dataKey="interactions"
                stroke="#3b82f6"
                name="Interactions"
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="#ef4444"
                name="Errors"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormAnalytics;
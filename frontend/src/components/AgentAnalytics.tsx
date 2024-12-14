import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AgentAnalyticsProps {
  agentAddress: string;
  onClose: () => void;
}

interface AnalyticsData {
  total: number;
  lastInteraction: string;
  daily: Record<string, number>;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
}

interface ChartData {
  name: string;
  interactions: number;
}

const AgentAnalytics: React.FC<AgentAnalyticsProps> = ({
  agentAddress,
  onClose,
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [agentAddress]);

  useEffect(() => {
    if (analytics) {
      updateChartData();
    }
  }, [analytics, period]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/analytics/${agentAddress}?period=all`);
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const updateChartData = () => {
    if (!analytics) return;

    let data: Record<string, number>;
    switch (period) {
      case 'day':
        data = analytics.daily;
        break;
      case 'week':
        data = analytics.weekly;
        break;
      case 'month':
        data = analytics.monthly;
        break;
      default:
        data = {};
    }

    const sortedData = Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        name: formatDate(date, period),
        interactions: value,
      }));

    setChartData(sortedData);
  };

  const formatDate = (date: string, periodType: string) => {
    const d = new Date(date);
    switch (periodType) {
      case 'day':
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        return `Week ${getWeekNumber(d)}`;
      case 'month':
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date;
    }
  };

  const getWeekNumber = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return weekNo;
  };

  if (isLoading) {
    return (
      <div className="agent-analytics">
        <div className="loading-spinner">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="agent-analytics">
      <div className="analytics-header">
        <h3>Agent Analytics</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="analytics-content">
        {error ? (
          <p className="error-message">{error}</p>
        ) : (
          <>
            <div className="analytics-summary">
              <div className="summary-card">
                <h4>Total Interactions</h4>
                <p className="stat">{analytics?.total || 0}</p>
              </div>
              <div className="summary-card">
                <h4>Last Interaction</h4>
                <p className="stat">
                  {analytics?.lastInteraction
                    ? new Date(analytics.lastInteraction).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>

            <div className="chart-controls">
              <div className="period-selector">
                <button
                  className={period === 'day' ? 'active' : ''}
                  onClick={() => setPeriod('day')}
                >
                  Daily
                </button>
                <button
                  className={period === 'week' ? 'active' : ''}
                  onClick={() => setPeriod('week')}
                >
                  Weekly
                </button>
                <button
                  className={period === 'month' ? 'active' : ''}
                  onClick={() => setPeriod('month')}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="analytics-chart">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#ffffff' }}
                  />
                  <YAxis
                    tick={{ fill: '#ffffff' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="interactions"
                    stroke="#64ffda"
                    strokeWidth={2}
                    dot={{ fill: '#64ffda' }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AgentAnalytics;

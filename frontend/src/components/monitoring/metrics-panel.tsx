import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  AlertTriangle,
  Shield,
  Activity,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const MetricsPanel = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [data, setData] = useState({
    alertTrends: [],
    threatDistribution: [],
    userActivity: []
  });

  useEffect(() => {
    // Simulated data - would come from API in production
    setData({
      alertTrends: [
        { time: '00:00', alerts: 12 },
        { time: '04:00', alerts: 8 },
        { time: '08:00', alerts: 15 },
        { time: '12:00', alerts: 22 },
        { time: '16:00', alerts: 18 },
        { time: '20:00', alerts: 10 }
      ],
      threatDistribution: [
        { name: 'Critical', value: 15 },
        { name: 'High', value: 25 },
        { name: 'Medium', value: 35 },
        { name: 'Low', value: 25 }
      ],
      userActivity: [
        { time: '00:00', active: 150 },
        { time: '04:00', active: 100 },
        { time: '08:00', active: 250 },
        { time: '12:00', active: 300 },
        { time: '16:00', active: 280 },
        { time: '20:00', active: 200 }
      ]
    });
  }, [timeRange]);

  const metrics = [
    {
      title: 'Total Alerts',
      value: '157',
      change: '+12%',
      status: 'warning',
      icon: <AlertTriangle className="w-4 h-4" />
    },
    {
      title: 'Resolved Issues',
      value: '89%',
      change: '+5%',
      status: 'success',
      icon: <CheckCircle2 className="w-4 h-4" />
    },
    {
      title: 'Active Users',
      value: '1,234',
      change: '+8%',
      status: 'info',
      icon: <Users className="w-4 h-4" />
    },
    {
      title: 'Avg Response Time',
      value: '1.2s',
      change: '-15%',
      status: 'success',
      icon: <Clock className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-${metric.status}-500/10`}>
                    {metric.icon}
                  </div>
                  <span className={`text-${metric.status}-500 text-sm font-medium`}>
                    {metric.change}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-1">{metric.value}</h3>
                <p className="text-gray-500 text-sm">{metric.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Alert Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.alertTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="alerts"
                    stroke="#0088FE"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Threat Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Threat Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.threatDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.threatDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="#00C49F"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MetricsPanel;
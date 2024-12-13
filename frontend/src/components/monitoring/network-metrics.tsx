import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Network,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  Clock,
  Signal,
  Wifi
} from 'lucide-react';

interface NetworkMetric {
  timestamp: number;
  value: number;
}

interface NetworkMetrics {
  throughput: {
    in: NetworkMetric[];
    out: NetworkMetric[];
  };
  latency: NetworkMetric[];
  errors: NetworkMetric[];
  connections: {
    total: number;
    active: number;
    idle: number;
  };
  protocols: {
    [key: string]: number;
  };
}

interface Props {
  metrics: {
    network: NetworkMetrics;
  };
}

const NetworkMetrics: React.FC<Props> = ({ metrics }) => {
  const networkMetrics = metrics?.network;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}/s`;
  };

  const formatLatency = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  const getThroughputData = () => {
    if (!networkMetrics?.throughput) return [];
    
    const length = networkMetrics.throughput.in.length;
    return Array.from({ length }, (_, i) => ({
      time: new Date(networkMetrics.throughput.in[i].timestamp).toISOString(),
      in: networkMetrics.throughput.in[i].value,
      out: networkMetrics.throughput.out[i].value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(networkMetrics?.protocols || {})}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="[0]" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{payload[0].payload[0]}</p>
                            <p className="text-sm">
                              Count: {payload[0].payload[1]}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="[1]" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Error Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={networkMetrics?.errors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">
                              {new Date(payload[0].payload.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm text-red-500">
                              Errors: {payload[0].value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkMetrics; className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-green-500" />
                <span className="font-medium">Inbound Traffic</span>
              </div>
              <Badge variant="secondary">
                {formatBytes(networkMetrics?.throughput?.in.slice(-1)[0]?.value || 0)}
              </Badge>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={networkMetrics?.throughput?.in.slice(-20)}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Outbound Traffic</span>
              </div>
              <Badge variant="secondary">
                {formatBytes(networkMetrics?.throughput?.out.slice(-1)[0]?.value || 0)}
              </Badge>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={networkMetrics?.throughput?.out.slice(-20)}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Network Latency</span>
              </div>
              <Badge variant="secondary">
                {formatLatency(networkMetrics?.latency?.slice(-1)[0]?.value || 0)}
              </Badge>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={networkMetrics?.latency?.slice(-20)}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#EAB308"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Throughput Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Network Throughput
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getThroughputData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(time) => new Date(time).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-medium">
                            {new Date(payload[0].payload.time).toLocaleTimeString()}
                          </p>
                          <p className="text-sm text-green-500">
                            In: {formatBytes(payload[0].value)}
                          </p>
                          <p className="text-sm text-blue-500">
                            Out: {formatBytes(payload[1].value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="in"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Inbound"
                />
                <Line
                  type="monotone"
                  dataKey="out"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  name="Outbound"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Connection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Signal className="w-5 h-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Total Connections</span>
                <span className="font-medium">{networkMetrics?.connections?.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Active Connections</span>
                <Badge variant="success">
                  {networkMetrics?.connections?.active || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Idle Connections</span>
                <Badge variant="secondary">
                  {networkMetrics?.connections?.idle || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Protocol Distribution
            </CardTitle>
          </CardHeader>
          <CardContent
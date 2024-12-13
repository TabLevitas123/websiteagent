import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Cpu,
  HardDrive,
  Memory,
  Activity
} from 'lucide-react';

interface ResourceMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
    processes: number;
  };
  memory: {
    used: number;
    total: number;
    cached: number;
    buffers: number;
  };
  disk: {
    used: number;
    total: number;
    read: number;
    write: number;
  };
}

interface Props {
  metrics: ResourceMetrics;
}

const ResourceUsage: React.FC<Props> = ({ metrics }) => {
  // Generate time-series data for charts
  const getTimeSeriesData = (data: number[], label: string) => {
    return data.map((value, index) => ({
      time: new Date(Date.now() - (data.length - index) * 1000).toISOString(),
      [label]: value
    }));
  };

  const cpuData = getTimeSeriesData(metrics?.cpu?.history || [], 'usage');
  const memoryData = getTimeSeriesData(metrics?.memory?.history || [], 'used');
  const diskData = getTimeSeriesData(metrics?.disk?.history || [], 'used');

  return (
    <div className="space-y-6">
      {/* CPU Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            CPU Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Disk Usage</span>
                <span className="font-medium">
                  {Math.round(metrics?.disk?.used / 1024)} GB of {Math.round(metrics?.disk?.total / 1024)} GB
                </span>
              </div>
              <Progress 
                value={(metrics?.disk?.used / metrics?.disk?.total) * 100 || 0} 
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Read Speed</p>
                  <p className="font-medium">{metrics?.disk?.read} MB/s</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Write Speed</p>
                  <p className="font-medium">{metrics?.disk?.write} MB/s</p>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diskData}>
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
                            <p className="font-medium">{new Date(payload[0].payload.time).toLocaleTimeString()}</p>
                            <p className="text-sm">Used: {Math.round(payload[0].value / 1024)} GB</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="used"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium">Load Average</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">1 min</span>
                <span className="font-medium">{metrics?.loadAvg?.[0] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">5 min</span>
                <span className="font-medium">{metrics?.loadAvg?.[1] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">15 min</span>
                <span className="font-medium">{metrics?.loadAvg?.[2] || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Process Stats</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total</span>
                <span className="font-medium">{metrics?.processes?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Running</span>
                <span className="font-medium">{metrics?.processes?.running || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Blocked</span>
                <span className="font-medium">{metrics?.processes?.blocked || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium">System Uptime</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Days</span>
                <span className="font-medium">{Math.floor(metrics?.uptime / (24 * 3600)) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Hours</span>
                <span className="font-medium">{Math.floor((metrics?.uptime % (24 * 3600)) / 3600) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Minutes</span>
                <span className="font-medium">{Math.floor((metrics?.uptime % 3600) / 60) || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResourceUsage;y-4">
              <div className="flex items-center justify-between">
                <span>Overall Usage</span>
                <span className="font-medium">{metrics?.cpu?.usage}%</span>
              </div>
              <Progress value={metrics?.cpu?.usage || 0} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cores</p>
                  <p className="font-medium">{metrics?.cpu?.cores}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Temperature</p>
                  <p className="font-medium">{metrics?.cpu?.temperature}°C</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Processes</p>
                  <p className="font-medium">{metrics?.cpu?.processes}</p>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuData}>
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
                            <p className="font-medium">{new Date(payload[0].payload.time).toLocaleTimeString()}</p>
                            <p className="text-sm">Usage: {payload[0].value}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="usage"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Memory className="w-5 h-5" />
            Memory Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Used Memory</span>
                <span className="font-medium">
                  {Math.round(metrics?.memory?.used / 1024)} GB of {Math.round(metrics?.memory?.total / 1024)} GB
                </span>
              </div>
              <Progress 
                value={(metrics?.memory?.used / metrics?.memory?.total) * 100 || 0}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Cached</p>
                  <p className="font-medium">
                    {Math.round(metrics?.memory?.cached / 1024)} GB
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Buffers</p>
                  <p className="font-medium">
                    {Math.round(metrics?.memory?.buffers / 1024)} GB
                  </p>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memoryData}>
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
                            <p className="font-medium">{new Date(payload[0].payload.time).toLocaleTimeString()}</p>
                            <p className="text-sm">Used: {Math.round(payload[0].value / 1024)} GB</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="used"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disk Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Disk Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-
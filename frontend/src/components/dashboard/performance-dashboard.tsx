import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResourceUsage from './ResourceUsage';
import NetworkMetrics from './NetworkMetrics';
import SystemHealth from './SystemHealth';
import { 
  Activity,
  Cpu,
  Network,
  AlertTriangle,
  Gauge,
  RefreshCw,
  Database,
  Zap 
} from 'lucide-react';

const PerformanceDashboard = () => {
  const { isConnected, latency } = useWebSocket();
  const { metrics, isLoading, error } = usePerformanceMetrics();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      label: 'System Overview',
      icon: <Activity className="w-4 h-4" />,
      component: <SystemHealth metrics={metrics} />
    },
    {
      id: 'resources',
      label: 'Resource Usage',
      icon: <Cpu className="w-4 h-4" />,
      component: <ResourceUsage metrics={metrics} />
    },
    {
      id: 'network',
      label: 'Network Metrics',
      icon: <Network className="w-4 h-4" />,
      component: <NetworkMetrics metrics={metrics} />
    }
  ];

  const getSystemStatus = () => {
    if (!isConnected) return 'disconnected';
    if (error) return 'error';
    if (latency > 200) return 'degraded';
    return 'healthy';
  };

  const statusConfig = {
    healthy: { color: 'text-green-500', bg: 'bg-green-500/10' },
    degraded: { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { color: 'text-red-500', bg: 'bg-red-500/10' },
    disconnected: { color: 'text-gray-500', bg: 'bg-gray-500/10' }
  };

  const status = getSystemStatus();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            <p className="text-gray-500">Real-time system monitoring and metrics</p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${statusConfig[status].bg}`}>
            <span className={`font-medium ${statusConfig[status].color}`}>
              System Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <QuickStatCard
            title="CPU Usage"
            value={`${metrics?.cpu?.usage || 0}%`}
            icon={<Cpu className="w-5 h-5 text-blue-500" />}
            trend={metrics?.cpu?.trend}
          />
          <QuickStatCard
            title="Memory Usage"
            value={`${metrics?.memory?.used || 0} MB`}
            icon={<Database className="w-5 h-5 text-purple-500" />}
            trend={metrics?.memory?.trend}
          />
          <QuickStatCard
            title="Network Latency"
            value={`${latency || 0}ms`}
            icon={<Network className="w-5 h-5 text-green-500" />}
            trend={latency > 200 ? 'up' : 'down'}
          />
          <QuickStatCard
            title="Error Rate"
            value={`${metrics?.errors?.rate || 0}%`}
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            trend={metrics?.errors?.trend}
          />
        </div>

        {/* Main Content */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2"
              >
                {tab.icon}
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-6"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {tab.component}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
};

const QuickStatCard = ({ title, value, icon, trend }) => {
  const getTrendColor = (trend) => {
    if (trend === 'up') return 'text-red-500';
    if (trend === 'down') return 'text-green-500';
    return 'text-gray-500';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          {icon}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: trend === 'up' ? 45 : trend === 'down' ? -45 : 0 }}
            className={`transition-colors ${getTrendColor(trend)}`}
          >
            <RefreshCw className="w-4 h-4" />
          </motion.div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboard;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTheme } from '@/hooks/useTheme';
import MetricsPanel from './MetricsPanel';
import AlertsList from './AlertsList';
import EventFilters from './EventFilters';
import ThreatIndicators from './ThreatIndicators';
import ActivityMonitor from './ActivityMonitor';
import {
  Shield,
  Bell,
  Activity,
  AlertTriangle,
  BarChart2,
  Clock,
} from 'lucide-react';

const SecurityDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <Shield className="w-4 h-4" />,
      component: <MetricsPanel />
    },
    {
      id: 'alerts',
      label: 'Active Alerts',
      icon: <Bell className="w-4 h-4" />,
      component: <AlertsList />
    },
    {
      id: 'activity',
      label: 'Activity Log',
      icon: <Activity className="w-4 h-4" />,
      component: <ActivityMonitor />
    },
    {
      id: 'threats',
      label: 'Threat Analysis',
      icon: <AlertTriangle className="w-4 h-4" />,
      component: <ThreatIndicators />
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Security Dashboard</h1>
            <p className="text-gray-500">
              Real-time security monitoring and alerts
            </p>
          </div>
          <EventFilters />
        </div>

        {/* Dashboard Tabs */}
        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-4 gap-4">
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
              className="space-y-6 mt-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {tab.component}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system health and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'System Uptime',
                  value: '99.99%',
                  icon: <BarChart2 className="w-4 h-4 text-green-500" />
                },
                {
                  label: 'Active Sessions',
                  value: '1,234',
                  icon: <Activity className="w-4 h-4 text-blue-500" />
                },
                {
                  label: 'Alert Response Time',
                  value: '1.2s',
                  icon: <Clock className="w-4 h-4 text-yellow-500" />
                }
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center gap-4 p-4 rounded-lg bg-secondary"
                >
                  {metric.icon}
                  <div>
                    <p className="text-sm text-gray-500">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SecurityDashboard;
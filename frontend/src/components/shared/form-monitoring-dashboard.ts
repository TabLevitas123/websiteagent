import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart2,
  AlertTriangle,
  Gauge,
  Activity,
  Download,
  RefreshCw,
} from 'lucide-react';

import FormDiagnostics from './FormDiagnostics';
import FormAnalytics from './FormAnalytics';
import FormMonitor from './FormMonitor';
import ErrorTracker from './ErrorTracker';

const FormMonitoringDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('diagnostics');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      diagnostics: {/* Get diagnostics data */},
      analytics: {/* Get analytics data */},
      performance: {/* Get performance data */},
      errors: {/* Get error logs */}
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-monitoring-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      icon: <Activity className="w-4 h-4" />,
      component: <FormDiagnostics />
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart2 className="w-4 h-4" />,
      component: <FormAnalytics />
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <Gauge className="w-4 h-4" />,
      component: <FormMonitor />
    },
    {
      id: 'errors',
      label: 'Errors',
      icon: <AlertTriangle className="w-4 h-4" />,
      component: <ErrorTracker />
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Form Monitoring Dashboard</CardTitle>
            <CardDescription>
              Monitor form performance, analytics, and error tracking
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 gap-4">
            {tabs.map(tab => (
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

          <motion.div
            layout
            className="mt-6"
          >
            {tabs.map(tab => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab.component}
                </motion.div>
              </TabsContent>
            ))}
          </motion.div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FormMonitoringDashboard;
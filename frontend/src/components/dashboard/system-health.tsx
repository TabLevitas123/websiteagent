import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Activity,
  AlertTriangle,
  Shield,
  Check,
  X,
  Clock,
  ArrowUp,
  ArrowDown,
  Zap
} from 'lucide-react';

interface SystemMetrics {
  health: {
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    checks: {
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value: number;
      threshold: number;
      timestamp: number;
    }[];
    incidents: {
      id: string;
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
      timestamp: number;
      resolved: boolean;
    }[];
    performance: {
      timestamp: number;
      score: number;
    }[];
  };
}

interface Props {
  metrics: SystemMetrics;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

const SystemHealth: React.FC<Props> = ({ metrics }) => {
  const healthMetrics = metrics?.health;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-500 bg-green-500/10';
      case 'degraded':
      case 'warn':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'critical':
      case 'fail':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'degraded':
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
      case 'fail':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getHealthScore = () => {
    if (!healthMetrics) return [];
    return [
      { name: 'Healthy', value: healthMetrics.checks?.filter(c => c.status === 'pass').length || 0 },
      { name: 'Warning', value: healthMetrics.checks?.filter(c => c.status === 'warn').length || 0 },
      { name: 'Critical', value: healthMetrics.checks?.filter(c => c.status === 'fail').length || 0 }
    ];
  };

  return (
    <div className="space-y-6">
      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              System Health Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-4">
                <div>
                  <Badge
                    className={`${getStatusColor(healthMetrics?.status)} text-lg px-4 py-2`}
                  >
                    {healthMetrics?.status?.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-4xl font-bold">
                  {healthMetrics?.score}/100
                </div>
                <div className="text-sm text-gray-500">
                  Overall Health Score
                </div>
              </div>
              <div className="w-32 h-32">
                <PieChart>
                  <Pie
                    data={getHealthScore()}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {getHealthScore().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={healthMetrics?.performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">
                              {new Date(payload[0].payload.timestamp).toLocaleTimeString()}
                            </p>
                            <p className="text-sm">
                              Score: {payload[0].value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            Health Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthMetrics?.checks?.map((check, index) => (
              <motion.div
                key={check.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <div className="font-medium">{check.name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(check.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{check.value}</div>
                    <div className="text-sm text-gray-500">
                      Threshold: {check.threshold}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthMetrics?.incidents?.filter(i => !i.resolved).map((incident, index) => (
              <Alert
                key={incident.id}
                variant={
                  incident.severity === 'high' ? 'destructive' :
                  incident.severity === 'medium' ? 'warning' : 'default'
                }
              >
                <div className="flex items-start gap-3">
                  {incident.severity === 'high' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">
                      {incident.type}
                    </div>
                    <AlertDescription>
                      {incident.message}
                    </AlertDescription>
                    <div className="text-sm mt-1 text-gray-500">
                      {new Date(incident.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
            {(!healthMetrics?.incidents || healthMetrics.incidents.filter(i => !i.resolved).length === 0) && (
              <div className="text-center text-gray-500 py-4">
                No active incidents
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealth;
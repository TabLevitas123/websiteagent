                <YAxis />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="p-2 bg-background border rounded-lg shadow-lg">
                          <div className="font-medium">
                            {new Date(payload[0].payload.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Value: {payload[0].value}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Display Range Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {['5m', '15m', '1h'].map((range) => (
                <Button
                  key={range}
                  variant={displayRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDisplayRange(range as '5m' | '15m' | '1h')}
                >
                  {range}
                </Button>
              ))}
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Last Updated: {lastSynced ? new Date(lastSynced).toLocaleTimeString() : 'Never'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Update Rate: {refreshInterval}ms
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-secondary/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Connection Quality</div>
                  <Badge
                    variant={latency < 100 ? 'default' : latency < 300 ? 'warning' : 'destructive'}
                  >
                    {latency < 100 ? 'Excellent' : latency < 300 ? 'Fair' : 'Poor'}
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {latency}ms
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Data Points</div>
                  <Badge variant="secondary">
                    {timeseriesData.length}
                  </Badge>
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {(timeseriesData.length / (refreshInterval / 1000)).toFixed(1)}/s
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Status</div>
                  <Badge
                    variant={isLoading ? 'warning' : error ? 'destructive' : 'success'}
                  >
                    {isLoading ? 'Syncing' : error ? 'Error' : 'Active'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm">
                  {error ? error.message : 'System operational'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeMonitor;import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from './WebSocketContext';
import { useDataSync } from './useDataSync';
import { useAPI } from './APIProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Activity,
  AlertTriangle,
  Check,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Zap
} from 'lucide-react';

interface MonitorProps {
  title?: string;
  dataType: string;
  refreshInterval?: number;
  showControls?: boolean;
}

const RealTimeMonitor: React.FC<MonitorProps> = ({
  title = 'Real-time Monitor',
  dataType,
  refreshInterval = 5000,
  showControls = true
}) => {
  // Contexts and Hooks
  const { isConnected: wsConnected, latency } = useWebSocket();
  const { isConnected: apiConnected, error: apiError } = useAPI();
  const { data, isLoading, error, sync, retrySync, lastSynced } = useDataSync(dataType);

  // Local State
  const [isPaused, setIsPaused] = useState(false);
  const [timeseriesData, setTimeseriesData] = useState<any[]>([]);
  const [displayRange, setDisplayRange] = useState<'5m' | '15m' | '1h'>('5m');

  // Handle real-time data updates
  useEffect(() => {
    if (data && !isPaused) {
      const timestamp = Date.now();
      setTimeseriesData(prev => {
        const newData = [...prev, { timestamp, value: data }];
        
        // Trim data based on display range
        const ranges = {
          '5m': 5 * 60 * 1000,
          '15m': 15 * 60 * 1000,
          '1h': 60 * 60 * 1000
        };
        
        const cutoff = timestamp - ranges[displayRange];
        return newData.filter(d => d.timestamp > cutoff);
      });
    }
  }, [data, isPaused, displayRange]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {title}
          </CardTitle>
          {showControls && (
            <div className="flex items-center gap-2">
              <Badge
                variant={wsConnected ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                {wsConnected ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    Disconnected
                  </>
                )}
              </Badge>
              <Badge
                variant="secondary"
                className="flex items-center gap-1"
              >
                <Clock className="w-4 h-4" />
                {latency}ms
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={retrySync}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Connection Status */}
          <AnimatePresence>
            {(!wsConnected || !apiConnected || error || apiError) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert
                  variant={error || apiError ? 'destructive' : 'default'}
                  className="mb-4"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {error?.message || apiError?.message || 'Connection lost'}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Data Visualization */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeseriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  domain={['auto', 'auto']}
                  tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                />
                
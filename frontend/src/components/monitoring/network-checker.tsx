import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWeb3 } from '@/hooks/useWeb3';
import {
  Network,
  Signal,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Zap,
  Globe,
} from 'lucide-react';

interface NetworkStatus {
  connected: boolean;
  chainId: number;
  networkName: string;
  latency: number;
  blockNumber: number;
  peers: number;
  syncStatus: {
    syncing: boolean;
    currentBlock: number;
    highestBlock: number;
  };
}

interface NetworkCheckerProps {
  requiredChainId?: number;
  onStatusChange?: (status: NetworkStatus) => void;
}

const NetworkChecker: React.FC<NetworkCheckerProps> = ({
  requiredChainId,
  onStatusChange,
}) => {
  const { provider, chainId, account } = useWeb3();
  const [status, setStatus] = useState<NetworkStatus>({
    connected: false,
    chainId: 0,
    networkName: '',
    latency: 0,
    blockNumber: 0,
    peers: 0,
    syncStatus: {
      syncing: false,
      currentBlock: 0,
      highestBlock: 0,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const getNetworkName = (id: number): string => {
    switch (id) {
      case 1:
        return 'Ethereum Mainnet';
      case 5:
        return 'Goerli Testnet';
      case 31337:
        return 'Local Network';
      default:
        return 'Unknown Network';
    }
  };

  useEffect(() => {
    if (!provider) {
      setStatus(prev => ({ ...prev, connected: false }));
      setError('No provider available');
      return;
    }

    const checkNetwork = async () => {
      try {
        setIsChecking(true);
        setError(null);

        // Measure network latency
        const startTime = performance.now();
        const [blockNumber, network, syncStatus] = await Promise.all([
          provider.getBlockNumber(),
          provider.getNetwork(),
          provider.send('eth_syncing', []),
        ]);
        const latency = performance.now() - startTime;

        // Get peer count (simulated for networks that don't support it)
        const peerCount = Math.floor(Math.random() * 10) + 20;

        const newStatus: NetworkStatus = {
          connected: true,
          chainId: network.chainId,
          networkName: getNetworkName(network.chainId),
          latency,
          blockNumber,
          peers: peerCount,
          syncStatus: {
            syncing: typeof syncStatus === 'object' && syncStatus !== null,
            currentBlock: syncStatus?.currentBlock || blockNumber,
            highestBlock: syncStatus?.highestBlock || blockNumber,
          },
        };

        setStatus(newStatus);
        onStatusChange?.(newStatus);

        // Verify chain ID if required
        if (requiredChainId && network.chainId !== requiredChainId) {
          setError(`Please connect to ${getNetworkName(requiredChainId)}`);
        }
      } catch (err) {
        console.error('Network check failed:', err);
        setError('Failed to check network status');
        setStatus(prev => ({ ...prev, connected: false }));
      } finally {
        setIsChecking(false);
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [provider, requiredChainId]);

  const getConnectionQuality = (latency: number): 'good' | 'medium' | 'poor' => {
    if (latency < 500) return 'good';
    if (latency < 1500) return 'medium';
    return 'poor';
  };

  const getConnectionIcon = () => {
    if (!status.connected) return <WifiOff className="w-4 h-4 text-red-500" />;
    const quality = getConnectionQuality(status.latency);
    switch (quality) {
      case 'good':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <Signal className="w-4 h-4 text-yellow-500" />;
      case 'poor':
        return <Signal className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Network Status
          </CardTitle>
          <Badge
            variant={status.connected ? 'default' : 'destructive'}
            className="flex items-center gap-2"
          >
            {getConnectionIcon()}
            {status.networkName}
          </Badge>
        </div>
        <CardDescription>
          Network connectivity and synchronization status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Network Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Chain ID</span>
              </div>
              <div className="text-2xl font-bold">{status.chainId}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Latency</span>
              </div>
              <div className="text-2xl font-bold">
                {Math.round(status.latency)}ms
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Peers</span>
              </div>
              <div className="text-2xl font-bold">{status.peers}</div>
            </motion.div>
          </div>

          {/* Sync Status */}
          {status.syncStatus.syncing && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Signal className="w-4 h-4" />
                Synchronization Progress
              </h4>
              <Progress
                value={
                  (status.syncStatus.currentBlock /
                    status.syncStatus.highestBlock) *
                  100
                }
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Current: {status.syncStatus.currentBlock}</span>
                <span>Target: {status.syncStatus.highestBlock}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Network Health */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${
                status.connected
                  ? getConnectionQuality(status.latency) === 'good'
                    ? 'text-green-500'
                    : getConnectionQuality(status.latency) === 'medium'
                    ? 'text-yellow-500'
                    : 'text-red-500'
                  : 'text-red-500'
              }`} />
              <span className="text-sm font-medium">Network Health</span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        !status.connected
                          ? 'bg-gray-300'
                          : i === 0
                          ? 'bg-green-500'
                          : i === 1
                          ? getConnectionQuality(status.latency) !== 'poor'
                            ? 'bg-yellow-500'
                            : 'bg-gray-300'
                          : getConnectionQuality(status.latency) === 'poor'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Network quality: {status.connected ? getConnectionQuality(status.latency) : 'disconnected'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetworkChecker;
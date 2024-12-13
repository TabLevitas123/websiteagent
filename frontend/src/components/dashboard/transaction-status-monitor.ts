import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
  ArrowUpRight,
  FileText,
  Hash,
} from 'lucide-react';

interface TransactionStatusProps {
  hash?: string;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  networkExplorerUrl?: string;
  estimatedTime?: number;
  error?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  gasUsed?: string;
  timestamp?: number;
}

const TransactionStatusMonitor: React.FC<TransactionStatusProps> = ({
  hash,
  status,
  networkExplorerUrl,
  estimatedTime,
  error,
  confirmations = 0,
  requiredConfirmations = 12,
  gasUsed,
  timestamp,
}) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(estimatedTime || 0);

  useEffect(() => {
    if (status === 'pending' || status === 'processing') {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / (estimatedTime || 30));
          return newProgress > 100 ? 100 : newProgress;
        });
      }, 1000);

      const timeInterval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);

      return () => {
        clearInterval(progressInterval);
        clearInterval(timeInterval);
      };
    }
  }, [status, estimatedTime]);

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-500" />,
          label: 'Transaction Pending',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
          label: 'Processing Transaction',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      case 'confirmed':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
          label: 'Transaction Confirmed',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          label: 'Transaction Failed',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      default:
        return {
          icon: <AlertTriangle className="w-5 h-5 text-gray-500" />,
          label: 'Unknown Status',
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Transaction Status
          </CardTitle>
          {hash && networkExplorerUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`${networkExplorerUrl}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  View on Explorer
                  <ExternalLink className="w-4 h-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>
                Open in block explorer
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status Badge */}
          <div className={`p-4 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
            <div className="flex items-center gap-2">
              {statusConfig.icon}
              <span className={`font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            {(status === 'pending' || status === 'processing') && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Estimated time: {timeLeft}s</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            {hash && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Hash className="w-4 h-4" />
                  <span>Transaction Hash</span>
                </div>
                <span className="font-mono">{`${hash.slice(0, 6)}...${hash.slice(-4)}`}</span>
              </div>
            )}

            {timestamp && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>Timestamp</span>
                </div>
                <span>{new Date(timestamp).toLocaleString()}</span>
              </div>
            )}

            {gasUsed && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Gas Used</span>
                </div>
                <span>{gasUsed}</span>
              </div>
            )}

            {confirmations > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileText className="w-4 h-4" />
                  <span>Confirmations</span>
                </div>
                <Badge variant="secondary">
                  {confirmations}/{requiredConfirmations}
                </Badge>
              </div>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && status === 'failed' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg bg-red-500/10 border border-red-500/20 p-4"
              >
                <div className="flex items-start gap-2 text-red-500">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-medium">Transaction Failed</span>
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionStatusMonitor;
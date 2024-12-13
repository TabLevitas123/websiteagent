import React from 'react';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle,
  ExternalLink
} from 'lucide-react';

interface TransactionStatusProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'pending' | 'success' | 'error';
  txHash?: string;
  error?: string;
  networkExplorerUrl?: string;
}

const TransactionStatus = ({
  isOpen,
  onClose,
  status,
  txHash,
  error,
  networkExplorerUrl
}: TransactionStatusProps) => {
  if (!isOpen) return null;

  const statusConfig = {
    pending: {
      title: 'Transaction Pending',
      icon: <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />,
      message: 'Your transaction is being processed...'
    },
    success: {
      title: 'Transaction Successful',
      icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
      message: 'Your transaction has been confirmed!'
    },
    error: {
      title: 'Transaction Failed',
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      message: error || 'An error occurred while processing your transaction.'
    }
  };

  const current = statusConfig[status];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background w-full max-w-md m-4 p-6 rounded-lg shadow-xl"
      >
        <Alert>
          <AlertTitle className="text-lg font-semibold mb-4 text-center">
            {current.title}
          </AlertTitle>
          <AlertDescription>
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {current.icon}
              </motion.div>
              
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center text-muted-foreground"
              >
                {current.message}
              </motion.p>

              {txHash && networkExplorerUrl && (
                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  href={`${networkExplorerUrl}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  View on Explorer
                  <ExternalLink className="w-4 h-4 ml-1" />
                </motion.a>
              )}

              <Button 
                onClick={onClose}
                variant={status === 'error' ? 'destructive' : 'default'}
                className="w-full mt-4"
              >
                {status === 'error' ? 'Try Again' : 'Close'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </div>
  );
};

export default TransactionStatus;
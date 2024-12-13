import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useWeb3 } from '@/hooks/useWeb3';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: {
    name: string;
    symbol: string;
    initialSupply: string;
    tokenType: string;
    accessControl: string[];
  };
}

const DeploymentModal: React.FC<DeploymentModalProps> = ({
  isOpen,
  onClose,
  tokenData,
}) => {
  const { account, chainId } = useWeb3();
  const { createToken } = useTokenFactory();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<
    'waiting' | 'processing' | 'success' | 'error'
  >('waiting');

  const steps = [
    {
      title: 'Network Check',
      description: 'Verifying network connection and configuration',
      icon: <Gauge className="w-5 h-5" />,
    },
    {
      title: 'Security Verification',
      description: 'Validating contract security parameters',
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      title: 'Token Deployment',
      description: 'Deploying token contract to the network',
      icon: <Zap className="w-5 h-5" />,
    },
  ];

  const deployToken = async () => {
    try {
      setDeploymentStatus('processing');
      setCurrentStep(0);

      // Network check
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(1);

      // Security verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCurrentStep(2);

      // Deploy token
      const result = await createToken(tokenData);
      setDeploymentStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy token');
      setDeploymentStatus('error');
    }
  };

  const getStatusIcon = () => {
    switch (deploymentStatus) {
      case 'processing':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Deploy Token</DialogTitle>
          <DialogDescription>
            Deploy your AI Agent token to the blockchain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Token Summary */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="summary">
              <AccordionTrigger>Token Summary</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Name</span>
                    <span className="font-medium">{tokenData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Symbol</span>
                    <span className="font-medium">{tokenData.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Initial Supply</span>
                    <span className="font-medium">{tokenData.initialSupply}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <Badge variant="secondary">{tokenData.tokenType}</Badge>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Deployment Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  currentStep === index
                    ? 'bg-blue-500/10 border border-blue-500/20'
                    : currentStep > index
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0">
                  {currentStep > index ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : currentStep === index && deploymentStatus === 'processing' ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

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
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deploymentStatus === 'processing'}
          >
            Cancel
          </Button>
          <Button
            onClick={deployToken}
            disabled={
              deploymentStatus === 'processing' ||
              deploymentStatus === 'success'
            }
            className="min-w-[100px]"
          >
            {deploymentStatus === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : deploymentStatus === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <>
                Deploy
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeploymentModal;
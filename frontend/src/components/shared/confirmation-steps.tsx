import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Network,
  Shield,
  Zap,
  File,
  Wallet,
  ArrowRight,
} from 'lucide-react';

interface ConfirmationStep {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  icon: React.ReactNode;
  details?: {
    label: string;
    value: string;
  }[];
}

interface ConfirmationStepsProps {
  steps: ConfirmationStep[];
  currentStep: number;
  error?: string;
}

const ConfirmationSteps: React.FC<ConfirmationStepsProps> = ({
  steps,
  currentStep,
  error,
}) => {
  const getStepIcon = (step: ConfirmationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return step.icon;
    }
  };

  const getStepColor = (step: ConfirmationStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5" />
          Deployment Progress
        </CardTitle>
        <CardDescription>
          Token deployment confirmation steps
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={
                (steps.filter(step => step.status === 'completed').length /
                  steps.length) *
                100
              }
              className="h-2"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>
                {steps.filter(step => step.status === 'completed').length} of{' '}
                {steps.length} steps completed
              </span>
              <span>
                {Math.round(
                  (steps.filter(step => step.status === 'completed').length /
                    steps.length) *
                    100
                )}
                %
              </span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={`relative flex items-start gap-4 p-4 rounded-lg border ${
                    step.status === 'processing'
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : step.status === 'completed'
                      ? 'bg-green-500/10 border-green-500/20'
                      : step.status === 'error'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background flex items-center justify-center">
                    {getStepIcon(step)}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{step.title}</h4>
                      <Badge
                        variant={
                          step.status === 'completed'
                            ? 'success'
                            : step.status === 'processing'
                            ? 'default'
                            : step.status === 'error'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {step.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {step.description}
                    </p>

                    {/* Step Details */}
                    <AnimatePresence>
                      {step.status === 'completed' && step.details && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 space-y-2"
                        >
                          {step.details.map((detail, detailIndex) => (
                            <div
                              key={detail.label}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-500">{detail.label}</span>
                              <span className="font-medium">{detail.value}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700 transform translate-x-3" />
                  )}
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
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <div className="flex items-start gap-2 text-red-500">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-medium">Deployment Error</span>
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

export default ConfirmationSteps;
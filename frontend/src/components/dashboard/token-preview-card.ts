import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from '@/hooks/useForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Coins,
  Zap,
  Shield,
  Lock,
  Users,
  Settings,
  Info,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const TokenPreviewCard: React.FC = () => {
  const { state } = useForm();
  const formValues = state.fields;

  const getTokenTypeIcon = () => {
    switch (formValues.tokenType?.value) {
      case 'standard':
        return <Coins className="w-5 h-5 text-blue-500" />;
      case 'mintable':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'burnable':
        return <Lock className="w-5 h-5 text-red-500" />;
      case 'pausable':
        return <Shield className="w-5 h-5 text-purple-500" />;
      default:
        return <Coins className="w-5 h-5 text-gray-500" />;
    }
  };

  const features = [
    {
      label: 'Type',
      value: formValues.tokenType?.value || 'Standard',
      icon: getTokenTypeIcon(),
    },
    {
      label: 'Initial Supply',
      value: formValues.initialSupply?.value
        ? Number(formValues.initialSupply.value).toLocaleString()
        : '0',
      icon: <Coins className="w-4 h-4 text-emerald-500" />,
    },
    {
      label: 'Max Supply',
      value: formValues.maxSupply?.value
        ? Number(formValues.maxSupply.value).toLocaleString()
        : 'Unlimited',
      icon: <Lock className="w-4 h-4 text-orange-500" />,
    },
    {
      label: 'Decimals',
      value: formValues.decimals?.value || '18',
      icon: <Settings className="w-4 h-4 text-blue-500" />,
    },
  ];

  const accessControls = formValues.accessControl?.value || [];
  const hasTransferDelay = formValues.transferDelay?.value?.enabled;

  return (
    <Card className="w-full bg-black border border-emerald-500/20">
      <CardContent className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Token Identity */}
          <div className="flex items-center justify-between">
            <div>
              <motion.h3
                layout
                className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-purple-400 bg-clip-text text-transparent"
              >
                {formValues.name?.value || 'Token Name'}
              </motion.h3>
              <motion.p layout className="text-lg text-emerald-300/60">
                {formValues.symbol?.value || 'SYMBOL'}
              </motion.p>
            </div>
            <motion.div
              className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {getTokenTypeIcon()}
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <motion.div
                key={feature.label}
                layout
                className="p-3 rounded-lg bg-gradient-to-br from-emerald-900/20 to-purple-900/20 border border-emerald-500/10"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-2">
                  {feature.icon}
                  <div>
                    <p className="text-sm text-emerald-300/60">{feature.label}</p>
                    <p className="font-medium text-white">{feature.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Access Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <h4 className="font-medium">Access Controls</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                {accessControls.length > 0 ? (
                  accessControls.map((role) => (
                    <motion.div
                      key={role}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                      >
                        {role.replace('_ROLE', '')}
                      </Badge>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Badge variant="secondary" className="text-gray-500">
                      No special roles
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Security Features */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <h4 className="font-medium">Security Features</h4>
            </div>
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${hasTransferDelay ? 'text-emerald-500' : 'text-gray-500'}`} />
                    <span>Transfer Delay</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {hasTransferDelay
                    ? `${formValues.transferDelay?.value?.delay}h delay between transfers`
                    : 'No transfer delay'}
                </TooltipContent>
              </Tooltip>

              {formValues.tokenType?.value === 'pausable' && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 text-purple-500">
                      <Shield className="w-4 h-4" />
                      <span>Pausable</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Transfers can be paused in emergencies
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Verification Status */}
          <motion.div
            className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
            initial={false}
            animate={{
              backgroundColor: state.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: state.isValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            }}
          >
            <div className="flex items-center gap-2">
              {state.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Info className="w-4 h-4 text-red-500" />
              )}
              <span className={state.isValid ? 'text-emerald-500' : 'text-red-500'}>
                {state.isValid ? 'Ready to Deploy' : 'Configuration Incomplete'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default TokenPreviewCard;
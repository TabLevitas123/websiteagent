import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { 
  Coins,
  BarChart2,
  Users,
  Shield,
  Zap,
  Circle
} from 'lucide-react';

interface TokenPreviewProps {
  name: string;
  symbol: string;
  initialSupply: string;
  imageUrl?: string;
}

const TokenPreview = ({ 
  name, 
  symbol, 
  initialSupply,
  imageUrl 
}: TokenPreviewProps) => {
  const previewFeatures = [
    {
      icon: <Coins className="w-5 h-5" />,
      label: 'Token Standard',
      value: 'ERC20'
    },
    {
      icon: <Shield className="w-5 h-5" />,
      label: 'Security',
      value: 'OpenZeppelin'
    },
    {
      icon: <BarChart2 className="w-5 h-5" />,
      label: 'Initial Supply',
      value: initialSupply ? `${Number(initialSupply).toLocaleString()} ${symbol}` : '-'
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Access Control',
      value: 'Role-Based'
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Features',
      value: 'Mintable, Burnable'
    }
  ];

  return (
    <Card className="w-full bg-black border border-emerald-500/20 p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-purple-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_40%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative space-y-8"
      >
        {/* Token Image */}
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden"
          >
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={`${name} token`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-emerald-500/50">
                <Circle className="w-12 h-12 mb-2" />
                <span className="text-xs">Token Image</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Token Identity */}
        <div className="text-center space-y-2">
          <motion.h3 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-purple-400 bg-clip-text text-transparent"
          >
            {name || 'Token Name'}
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-emerald-300/60"
          >
            {symbol || 'SYMBOL'}
          </motion.p>
        </div>

        {/* Token Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {previewFeatures.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-br from-emerald-900/20 to-purple-900/20 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors"
            >
              <div className="text-emerald-400">
                {feature.icon}
              </div>
              <div>
                <p className="text-sm text-emerald-300/60">
                  {feature.label}
                </p>
                <p className="font-medium text-white">
                  {feature.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Token Description */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center text-sm text-emerald-300/60"
        >
          <p>
            This token implements the ERC20 standard with additional features for 
            AI agent management and secure role-based access control.
          </p>
        </motion.div>
      </motion.div>
    </Card>
  );
};

export default TokenPreview;
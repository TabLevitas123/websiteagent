import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWeb3 } from '@/hooks/useWeb3';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import {
  Gauge,
  Zap,
  Clock,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
} from 'lucide-react';

interface GasEstimatorProps {
  tokenData: {
    name: string;
    symbol: string;
    initialSupply: string;
    tokenType: string;
    accessControl: string[];
  };
  onEstimateComplete?: (estimate: {
    gasLimit: string;
    gasPrice: string;
    estimatedCost: string;
    estimatedTime: string;
  }) => void;
}

const GasEstimator: React.FC<GasEstimatorProps> = ({
  tokenData,
  onEstimateComplete,
}) => {
  const { provider } = useWeb3();
  const { getTokenFactoryContract } = useTokenFactory();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gasPrice, setGasPrice] = useState<string>('0');
  const [gasLimit, setGasLimit] = useState<string>('0');
  const [priceMultiplier, setPriceMultiplier] = useState(1);
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchGasEstimate = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get contract instance
        const contract = getTokenFactoryContract();

        // Estimate gas
        const estimatedGas = await contract.estimateGas.createToken(
          tokenData.name,
          tokenData.symbol,
          ethers.utils.parseUnits(tokenData.initialSupply, 18)
        );

        // Get current gas price
        const currentGasPrice = await provider.getGasPrice();

        setGasLimit(estimatedGas.toString());
        setGasPrice(currentGasPrice.toString());

        // Fetch ETH price
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        setEthPrice(data.ethereum.usd);

        // Notify parent component
        if (onEstimateComplete) {
          onEstimateComplete({
            gasLimit: estimatedGas.toString(),
            gasPrice: currentGasPrice.toString(),
            estimatedCost: calculateCost(estimatedGas, currentGasPrice),
            estimatedTime: calculateEstimatedTime(priceMultiplier),
          });
        }
      } catch (err) {
        console.error('Gas estimation failed:', err);
        setError('Failed to estimate gas costs');
      } finally {
        setIsLoading(false);
      }
    };

    if (provider) {
      fetchGasEstimate();
    }
  }, [provider, tokenData]);

  const calculateCost = (gas: ethers.BigNumber, price: string): string => {
    try {
      const gasCost = ethers.BigNumber.from(gas)
        .mul(ethers.BigNumber.from(price))
        .mul(ethers.BigNumber.from(Math.floor(priceMultiplier * 100)))
        .div(100);
      
      return ethers.utils.formatEther(gasCost);
    } catch (err) {
      console.error('Error calculating cost:', err);
      return '0';
    }
  };

  const calculateEstimatedTime = (multiplier: number): string => {
    if (multiplier <= 1) return '15-30 seconds';
    if (multiplier <= 1.5) return '30-60 seconds';
    return '1-2 minutes';
  };

  const getCostInUSD = (ethCost: string): string => {
    if (!ethPrice) return 'N/A';
    return (parseFloat(ethCost) * ethPrice).toFixed(2);
  };

  const getSpeedLabel = (multiplier: number): string => {
    if (multiplier <= 1) return 'Standard';
    if (multiplier <= 1.5) return 'Fast';
    return 'Rapid';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Gas Estimation
        </CardTitle>
        <CardDescription>
          Estimated deployment costs and confirmation time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Gas Speed Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Transaction Speed</h4>
              <Badge variant="secondary">
                {getSpeedLabel(priceMultiplier)}
              </Badge>
            </div>
            <Slider
              value={[priceMultiplier * 100]}
              onValueChange={([value]) => setPriceMultiplier(value / 100)}
              min={100}
              max={200}
              step={25}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>Standard</span>
              <span>Fast</span>
              <span>Rapid</span>
            </div>
          </div>

          {/* Estimation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Estimated Gas</span>
              </div>
              <div className="text-2xl font-bold">
                {parseInt(gasLimit).toLocaleString()} units
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-lg bg-secondary"
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Estimated Time</span>
              </div>
              <div className="text-2xl font-bold">
                {calculateEstimatedTime(priceMultiplier)}
              </div>
            </motion.div>
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cost Breakdown
            </h4>
            <div className="p-4 rounded-lg bg-secondary space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Base Gas Price</span>
                <span>{ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Priority Fee</span>
                <span>
                  +{((priceMultiplier - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center font-medium">
                <span>Total Estimated Cost</span>
                <div className="text-right">
                  <div>{calculateCost(gasLimit, gasPrice)} ETH</div>
                  <div className="text-sm text-gray-500">
                    ≈ ${getCostInUSD(calculateCost(gasLimit, gasPrice))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Message */}
          <div className="flex items-start gap-2 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-500">
              Gas prices fluctuate based on network activity. Actual costs may vary.
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="text-sm text-red-500">{error}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GasEstimator;
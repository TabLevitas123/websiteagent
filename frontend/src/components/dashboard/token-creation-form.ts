import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FormProvider, useForm } from '@/hooks/useForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TokenNameField,
  TokenSymbolField,
  InitialSupplyField,
  TokenTypeField,
  AccessControlField,
  MaxSupplyField,
  TokenDecimalsField,
  TransferDelayField,
} from './TokenFormFields';
import FormMonitoringDashboard from './FormMonitoringDashboard';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import {
  Loader2,
  AlertTriangle,
  ChevronRight,
  Save,
  RotateCcw
} from 'lucide-react';

interface FormData {
  name: string;
  symbol: string;
  initialSupply: number;
  tokenType: string;
  accessControl: string[];
  maxSupply: number;
  decimals: number;
  transferDelay: {
    enabled: boolean;
    delay: number;
  };
}

const TokenCreationForm: React.FC = () => {
  const [showMonitoring, setShowMonitoring] = useState(false);
  const { createToken, isCreating, error } = useTokenFactory();
  const form = useForm<FormData>({
    initialValues: {
      name: '',
      symbol: '',
      initialSupply: 0,
      tokenType: 'standard',
      accessControl: [],
      maxSupply: 0,
      decimals: 18,
      transferDelay: {
        enabled: false,
        delay: 0
      }
    },
    onSubmit: async (values) => {
      try {
        await createToken(values);
      } catch (err) {
        console.error('Token creation failed:', err);
      }
    }
  });

  const handleReset = () => {
    form.resetForm();
  };

  return (
    <FormProvider form={form}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create AI Agent Token</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMonitoring(!showMonitoring)}
              >
                {showMonitoring ? 'Hide' : 'Show'} Monitoring
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TokenNameField
                  name="name"
                  label="Token Name"
                  required
                />
                <TokenSymbolField
                  name="symbol"
                  label="Token Symbol"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InitialSupplyField
                  name="initialSupply"
                  label="Initial Supply"
                  required
                />
                <MaxSupplyField
                  name="maxSupply"
                  label="Maximum Supply"
                />
              </div>

              <TokenTypeField
                name="tokenType"
                label="Token Type"
                required
              />

              <TokenDecimalsField
                name="decimals"
                label="Token Decimals"
              />

              <AccessControlField
                name="accessControl"
                label="Access Control"
              />

              <TransferDelayField
                name="transferDelay"
                label="Transfer Delay"
                description="Enable delay between transfers for enhanced security"
              />

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between items-center pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isCreating}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Form
                </Button>

                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.handleSubmit()}
                    disabled={isCreating}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isCreating || !form.isValid}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Token...
                      </>
                    ) : (
                      <>
                        Create Token
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {showMonitoring && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <FormMonitoringDashboard />
          </motion.div>
        )}
      </div>
    </FormProvider>
  );
};

export default TokenCreationForm;
import React, { useState } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Coins, 
  AlertCircle, 
  Loader2, 
  CheckCircle2 
} from 'lucide-react';

const TokenCreationForm = () => {
  const { account, chainId } = useWeb3();
  const { createToken, isCreating, error } = useTokenFactory();

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    initialSupply: '',
  });

  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name) {
      errors.name = 'Token name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Token name must be at least 3 characters';
    }

    if (!formData.symbol) {
      errors.symbol = 'Token symbol is required';
    } else if (formData.symbol.length > 11) {
      errors.symbol = 'Token symbol must be 11 characters or less';
    }

    if (!formData.initialSupply) {
      errors.initialSupply = 'Initial supply is required';
    } else if (isNaN(formData.initialSupply) || parseFloat(formData.initialSupply) <= 0) {
      errors.initialSupply = 'Initial supply must be a positive number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await createToken(
        formData.name,
        formData.symbol,
        formData.initialSupply
      );
    } catch (err) {
      console.error('Token creation failed:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!account) {
    return (
      <Alert className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Required</AlertTitle>
        <AlertDescription>
          Please connect your wallet to create a token
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-6 h-6" />
          Create AI Agent Token
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Token Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., AI Agent Token"
              className={validationErrors.name ? 'border-red-500' : ''}
            />
            {validationErrors.name && (
              <p className="text-sm text-red-500">{validationErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Token Symbol</Label>
            <Input
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              placeholder="e.g., AIT"
              className={validationErrors.symbol ? 'border-red-500' : ''}
            />
            {validationErrors.symbol && (
              <p className="text-sm text-red-500">{validationErrors.symbol}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply">Initial Supply</Label>
            <Input
              id="initialSupply"
              name="initialSupply"
              value={formData.initialSupply}
              onChange={handleChange}
              type="number"
              min="0"
              step="1"
              placeholder="e.g., 1000000"
              className={validationErrors.initialSupply ? 'border-red-500' : ''}
            />
            {validationErrors.initialSupply && (
              <p className="text-sm text-red-500">{validationErrors.initialSupply}</p>
            )}
          </div>

          {error && (
            <Alert className="bg-red-500/10 text-red-500 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Token...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Create Token
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TokenCreationForm;
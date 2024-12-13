import React, { useState } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Info } from 'lucide-react';
import { 
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTokenFactory } from '../hooks/useTokenFactory';
import { useWeb3 } from '../hooks/useWeb3';

const TokenCreationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    initialSupply: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { createToken } = useTokenFactory();
  const { account, chainId } = useWeb3();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.name || !formData.symbol || !formData.initialSupply) {
      setError('All fields are required');
      return false;
    }

    if (formData.symbol.length > 11) {
      setError('Symbol must be 11 characters or less');
      return false;
    }

    if (isNaN(formData.initialSupply) || parseFloat(formData.initialSupply) <= 0) {
      setError('Initial supply must be a positive number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const tx = await createToken(
        formData.name,
        formData.symbol,
        ethers.parseEther(formData.initialSupply),
        { value: ethers.parseEther('0.006') }
      );
      
      await tx.wait();
      setSuccess(true);
      setFormData({
        name: '',
        symbol: '',
        initialSupply: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to create token');
    } finally {
      setIsProcessing(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      className="max-w-lg mx-auto p-4"
    >
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Create AI Agent Token</CardTitle>
          <CardDescription className="text-gray-400">
            Launch your own AI-powered token with a fixed creation fee of 0.006 ETH
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Token Name</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="AI Agent General Intelligence"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Token Symbol</label>
              <Input
                type="text"
                name="symbol"
// src/hooks/useTokenFactory.ts
import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from './useWeb3';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { useToast } from '@/components/ui/use-toast';

interface TokenFactoryState {
  isCreating: boolean;
  error: string | null;
  lastCreatedToken: string | null;
}

const TOKEN_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;

export const useTokenFactory = () => {
  const { provider, signer, account } = useWeb3();
  const { toast } = useToast();
  const [state, setState] = useState<TokenFactoryState>({
    isCreating: false,
    error: null,
    lastCreatedToken: null
  });

  const getTokenFactoryContract = () => {
    if (!signer || !TOKEN_FACTORY_ADDRESS) {
      throw new Error('Web3 not initialized');
    }

    return new ethers.Contract(
      TOKEN_FACTORY_ADDRESS,
      TokenFactoryABI,
      signer
    );
  };

  const createToken = async (
    name: string,
    symbol: string,
    initialSupply: string
  ) => {
    try {
      setState(prev => ({
        ...prev,
        isCreating: true,
        error: null
      }));

      const contract = getTokenFactoryContract();
      const supply = ethers.utils.parseUnits(initialSupply, 18);
      
      // Get the creation fee from the contract
      const creationFee = await contract.CREATION_FEE();

      // Create the token with the required fee
      const tx = await contract.createToken(
        name,
        symbol,
        supply,
        { value: creationFee }
      );

      // Show pending transaction toast
      toast({
        title: 'Transaction Pending',
        description: 'Your token is being created...',
        duration: 5000
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Find the TokenCreated event
      const event = receipt.events?.find(
        (e: any) => e.event === 'TokenCreated'
      );

      if (event) {
        const [owner, tokenAddress, tokenName, tokenSymbol, tokenId] = event.args;

        setState(prev => ({
          ...prev,
          lastCreatedToken: tokenAddress
        }));

        // Show success toast
        toast({
          title: 'Token Created Successfully',
          description: `Your token has been created at ${tokenAddress}`,
          duration: 8000
        });

        // Store token information in local storage
        const tokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
        tokens.push({
          address: tokenAddress,
          name: tokenName,
          symbol: tokenSymbol,
          id: tokenId.toString(),
          createdAt: new Date().toISOString(),
          owner
        });
        localStorage.setItem('createdTokens', JSON.stringify(tokens));

      } else {
        throw new Error('Token creation event not found in transaction receipt');
      }

    } catch (error: any) {
      console.error('Token creation failed:', error);
      
      let errorMessage = 'Failed to create token';
      
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for token creation fee';
      }

      setState(prev => ({
        ...prev,
        error: errorMessage
      }));

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      });

    } finally {
      setState(prev => ({
        ...prev,
        isCreating: false
      }));
    }
  };

  const getTokensByOwner = async (owner: string) => {
    try {
      const contract = getTokenFactoryContract();
      const tokens = await contract.getTokensByOwner(owner);
      return tokens;
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      throw error;
    }
  };

  return {
    ...state,
    createToken,
    getTokensByOwner
  };
};

export default useTokenFactory;
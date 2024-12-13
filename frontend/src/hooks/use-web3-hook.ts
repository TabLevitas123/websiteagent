// src/hooks/useWeb3.ts
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

interface Web3State {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
  chainId: number | null;
  error: Error | null;
  isConnecting: boolean;
}

export const useWeb3 = () => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    error: null,
    isConnecting: false
  });

  const web3Modal = new Web3Modal({
    network: 'mainnet',
    cacheProvider: true,
    providerOptions: {
      // Add provider options here
    }
  });

  const connect = async () => {
    try {
      setWeb3State(prev => ({ ...prev, isConnecting: true, error: null }));

      const instance = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(instance);
      const signer = provider.getSigner();
      const account = await signer.getAddress();
      const { chainId } = await provider.getNetwork();

      setWeb3State({
        provider,
        signer,
        account,
        chainId,
        error: null,
        isConnecting: false
      });

      // Subscribe to accounts change
      instance.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWeb3State(prev => ({
            ...prev,
            account: accounts[0]
          }));
        } else {
          disconnect();
        }
      });

      // Subscribe to chainId change
      instance.on('chainChanged', (chainId: number) => {
        setWeb3State(prev => ({
          ...prev,
          chainId: parseInt(chainId.toString())
        }));
      });

      // Subscribe to provider disconnection
      instance.on('disconnect', () => {
        disconnect();
      });

    } catch (error) {
      console.error('Failed to connect to Web3:', error);
      setWeb3State(prev => ({
        ...prev,
        error: error as Error,
        isConnecting: false
      }));
    }
  };

  const disconnect = async () => {
    try {
      await web3Modal.clearCachedProvider();
      setWeb3State({
        provider: null,
        signer: null,
        account: null,
        chainId: null,
        error: null,
        isConnecting: false
      });
    } catch (error) {
      console.error('Failed to disconnect from Web3:', error);
      setWeb3State(prev => ({
        ...prev,
        error: error as Error
      }));
    }
  };

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      connect();
    }
  }, []);

  return {
    ...web3State,
    connect,
    disconnect
  };
};

export default useWeb3;
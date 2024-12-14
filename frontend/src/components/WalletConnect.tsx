import React, { useState } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

interface WalletConnectProps {
  onConnect: (address: string) => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      setConnecting(true);
      setError(null);

      const web3Modal = new Web3Modal({
        cacheProvider: true,
        providerOptions: {}
      });

      const instance = await web3Modal.connect();
      const provider = new ethers.BrowserProvider(instance);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      onConnect(address);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="wallet-connect">
      <button
        onClick={connectWallet}
        disabled={connecting}
        className="connect-button"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default WalletConnect;

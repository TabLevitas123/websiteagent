import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface SolanaWalletConnectProps {
  onConnect: (publicKey: string) => void;
}

const SolanaWalletConnect: React.FC<SolanaWalletConnectProps> = ({ onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Phantom wallet is available
    if ('solana' in window) {
      const solana = (window as any).solana;
      if (solana?.isPhantom) {
        // Auto-connect if previously authorized
        solana.connect({ onlyIfTrusted: true })
          .then((response: { publicKey: PublicKey }) => {
            if (response.publicKey) {
              onConnect(response.publicKey.toString());
            }
          })
          .catch((error: Error) => {
            console.error('Auto-connect error:', error);
          });
      }
    }
  }, [onConnect]);

  const connectWallet = async () => {
    try {
      setConnecting(true);
      setError(null);

      if (!('solana' in window)) {
        throw new Error('Phantom wallet not found! Please install Phantom wallet.');
      }

      const solana = (window as any).solana;
      const response = await solana.connect();
      onConnect(response.publicKey.toString());
    } catch (err) {
      console.error('Error connecting Solana wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="wallet-connect solana">
      <button
        onClick={connectWallet}
        disabled={connecting}
        className="connect-button solana"
      >
        {connecting ? 'Connecting...' : 'Connect Solana Wallet'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default SolanaWalletConnect;

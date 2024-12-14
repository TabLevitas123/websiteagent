import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Token } from '@solana/spl-token';

interface AgentTransferProps {
  agentAddress: string;
  onTransferComplete: () => void;
  onClose: () => void;
}

const AgentTransfer: React.FC<AgentTransferProps> = ({
  agentAddress,
  onTransferComplete,
  onClose,
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAddress = (address: string) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipientAddress(e.target.value);
    setError(null);
  };

  const checkTransferEligibility = async () => {
    try {
      const response = await fetch(`/api/agents/transfer-eligibility/${agentAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentOwner: publicKey?.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check transfer eligibility');
      }

      const data = await response.json();
      return data.isEligible;
    } catch (err) {
      console.error('Error checking transfer eligibility:', err);
      return false;
    }
  };

  const handleTransfer = async () => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    if (!validateAddress(recipientAddress)) {
      setError('Invalid recipient address');
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);

      // Check eligibility
      const isEligible = await checkTransferEligibility();
      if (!isEligible) {
        throw new Error('Agent is not eligible for transfer');
      }

      // Create transfer transaction
      const agentPublicKey = new PublicKey(agentAddress);
      const recipientPublicKey = new PublicKey(recipientAddress);

      const token = new Token(
        connection,
        agentPublicKey,
        Token.PROGRAM_ID,
        publicKey
      );

      const fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(
        publicKey
      );

      const toTokenAccount = await token.getOrCreateAssociatedAccountInfo(
        recipientPublicKey
      );

      const transaction = new Transaction().add(
        Token.createTransferInstruction(
          Token.PROGRAM_ID,
          fromTokenAccount.address,
          toTokenAccount.address,
          publicKey,
          [],
          1
        )
      );

      // Sign and send transaction
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash()
      ).blockhash;
      transaction.feePayer = publicKey;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      // Update backend
      const response = await fetch(`/api/agents/transfer/${agentAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentOwner: publicKey.toBase58(),
          newOwner: recipientAddress,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent metadata');
      }

      onTransferComplete();
    } catch (err) {
      console.error('Error transferring agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer agent');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="agent-transfer">
      <div className="transfer-header">
        <h3>Transfer Agent</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="transfer-content">
        <div className="input-group">
          <label htmlFor="recipient">Recipient Address</label>
          <input
            id="recipient"
            type="text"
            value={recipientAddress}
            onChange={handleAddressChange}
            placeholder="Enter Solana wallet address"
            disabled={isTransferring}
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="transfer-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isTransferring}
          >
            Cancel
          </button>
          <button
            className="transfer-button"
            onClick={handleTransfer}
            disabled={!recipientAddress || isTransferring}
          >
            {isTransferring ? 'Transferring...' : 'Transfer Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentTransfer;

import React, { useState, useEffect } from 'react';

interface TransactionStatusProps {
  ethTxHash?: string;
  solanaSignature?: string;
  onComplete?: () => void;
}

interface TransactionState {
  ethStatus: 'pending' | 'confirmed' | 'failed';
  solanaStatus: 'pending' | 'confirmed' | 'failed';
  currentStep: number;
  error?: string;
}

const TransactionStatus: React.FC<TransactionStatusProps> = ({
  ethTxHash,
  solanaSignature,
  onComplete
}) => {
  const [state, setState] = useState<TransactionState>({
    ethStatus: 'pending',
    solanaStatus: 'pending',
    currentStep: 1
  });

  useEffect(() => {
    if (ethTxHash) {
      checkEthTransaction();
    }
  }, [ethTxHash]);

  useEffect(() => {
    if (solanaSignature) {
      checkSolanaTransaction();
    }
  }, [solanaSignature]);

  const checkEthTransaction = async () => {
    try {
      const response = await fetch(`/api/agents/verify-payment/${ethTxHash}`);
      if (!response.ok) {
        throw new Error('Failed to verify ETH payment');
      }
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        ethStatus: data.verified ? 'confirmed' : 'pending',
        currentStep: data.verified ? 2 : 1
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        ethStatus: 'failed',
        error: error instanceof Error ? error.message : 'Failed to verify ETH payment'
      }));
    }
  };

  const checkSolanaTransaction = async () => {
    try {
      const response = await fetch(`/api/agents/verify-deployment/${solanaSignature}`);
      if (!response.ok) {
        throw new Error('Failed to verify Solana deployment');
      }
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        solanaStatus: data.verified ? 'confirmed' : 'pending',
        currentStep: data.verified ? 3 : 2
      }));

      if (data.verified && onComplete) {
        onComplete();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        solanaStatus: 'failed',
        error: error instanceof Error ? error.message : 'Failed to verify Solana deployment'
      }));
    }
  };

  const getStepStatus = (step: number) => {
    if (step < state.currentStep) return 'completed';
    if (step === state.currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="transaction-status">
      <h3>Creating Your Agent</h3>
      
      <div className="status-steps">
        <div className={`status-step ${getStepStatus(1)}`}>
          <div className="step-number">1</div>
          <div className="step-content">
            <h4>Payment Processing</h4>
            <p className="step-description">Verifying ETH payment</p>
            {state.ethStatus === 'pending' && (
              <div className="loading-spinner">Processing...</div>
            )}
            {state.ethStatus === 'confirmed' && (
              <p className="success">Payment confirmed!</p>
            )}
            {state.ethStatus === 'failed' && (
              <p className="error">Payment failed</p>
            )}
          </div>
        </div>

        <div className={`status-step ${getStepStatus(2)}`}>
          <div className="step-number">2</div>
          <div className="step-content">
            <h4>Agent Deployment</h4>
            <p className="step-description">Creating agent on Solana</p>
            {state.solanaStatus === 'pending' && state.currentStep >= 2 && (
              <div className="loading-spinner">Deploying...</div>
            )}
            {state.solanaStatus === 'confirmed' && (
              <p className="success">Agent deployed!</p>
            )}
            {state.solanaStatus === 'failed' && (
              <p className="error">Deployment failed</p>
            )}
          </div>
        </div>

        <div className={`status-step ${getStepStatus(3)}`}>
          <div className="step-number">3</div>
          <div className="step-content">
            <h4>Completion</h4>
            <p className="step-description">Finalizing your agent</p>
            {state.currentStep === 3 && state.solanaStatus === 'confirmed' && (
              <p className="success">Agent creation complete!</p>
            )}
          </div>
        </div>
      </div>

      {state.error && (
        <div className="error-message">
          {state.error}
        </div>
      )}
    </div>
  );
};

export default TransactionStatus;

import React, { useState } from 'react';
import './App.css';
import './styles/Dashboard.css';
import './styles/TransactionStatus.css';
import WalletConnect from './components/WalletConnect';
import SolanaWalletConnect from './components/SolanaWalletConnect';
import AgentForm from './components/AgentForm';
import AgentDashboard from './components/AgentDashboard';
import TransactionStatus from './components/TransactionStatus';
import { AgentService, AgentData } from './services/agentService';

function App() {
  const [ethWalletAddress, setEthWalletAddress] = useState<string | null>(null);
  const [solanaWalletAddress, setSolanaWalletAddress] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [currentTx, setCurrentTx] = useState<{
    ethTxHash?: string;
    solanaSignature?: string;
  } | null>(null);

  const agentService = new AgentService();

  const handleEthWalletConnect = (address: string) => {
    setEthWalletAddress(address);
  };

  const handleSolanaWalletConnect = (address: string) => {
    setSolanaWalletAddress(address);
  };

  const handleAgentSubmit = async (agentData: AgentData) => {
    if (!ethWalletAddress || !solanaWalletAddress) {
      setError('Please connect both ETH and Solana wallets');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);
      setCurrentTx(null);

      const result = await agentService.createAgent(
        agentData,
        ethWalletAddress,
        solanaWalletAddress
      );

      setCurrentTx({
        ethTxHash: result.paymentTx,
        solanaSignature: result.deploymentTx
      });

      setSuccess(`Agent creation initiated! Tracking status...`);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const handleTxComplete = () => {
    setCurrentTx(null);
    setShowDashboard(true);
  };

  const isWalletsConnected = ethWalletAddress && solanaWalletAddress;

  return (
    <div className="App">
      <header className="App-header">
        <h1>Agent Launchpad</h1>
        <p>Launch your Solana Agent instantly for 0.006 ETH</p>
        <div className="wallet-connections">
          <div className="wallet-group">
            <h3>ETH Wallet (for payment)</h3>
            {ethWalletAddress ? (
              <p className="wallet-status">Connected: {ethWalletAddress.slice(0, 6)}...{ethWalletAddress.slice(-4)}</p>
            ) : (
              <WalletConnect onConnect={handleEthWalletConnect} />
            )}
          </div>
          <div className="wallet-group">
            <h3>Solana Wallet (for agent)</h3>
            {solanaWalletAddress ? (
              <p className="wallet-status">Connected: {solanaWalletAddress.slice(0, 6)}...{solanaWalletAddress.slice(-4)}</p>
            ) : (
              <SolanaWalletConnect onConnect={handleSolanaWalletConnect} />
            )}
          </div>
        </div>
        {isWalletsConnected && (
          <button 
            className="dashboard-button"
            onClick={() => setShowDashboard(!showDashboard)}
          >
            {showDashboard ? 'Create New Agent' : 'View My Agents'}
          </button>
        )}
      </header>
      <main className="App-main">
        {showDashboard ? (
          <AgentDashboard 
            creatorAddress={solanaWalletAddress}
            onClose={() => setShowDashboard(false)}
          />
        ) : (
          <div className="launch-container">
            <h2>Create Your Agent</h2>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
            <div className="agent-form">
              <AgentForm 
                walletAddress={isWalletsConnected ? solanaWalletAddress : null}
                onSubmit={handleAgentSubmit}
                disabled={creating}
              />
            </div>
            {currentTx && (
              <TransactionStatus
                ethTxHash={currentTx.ethTxHash}
                solanaSignature={currentTx.solanaSignature}
                onComplete={handleTxComplete}
              />
            )}
            <div className="pricing-info">
              <h3>Fixed Price</h3>
              <p className="price">0.006 ETH</p>
              <p className="price-note">One-time payment for agent creation</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

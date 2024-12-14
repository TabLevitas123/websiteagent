import React, { useState, useEffect } from 'react';
import { AgentService } from '../services/agentService';

interface AgentDashboardProps {
  creatorAddress: string | null;
  onClose: () => void;
}

interface AgentMetadata {
  agentAddress: string;
  name: string;
  symbol: string;
  paymentTx: string;
  creator: string;
  createdAt: string;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ creatorAddress, onClose }) => {
  const [agents, setAgents] = useState<AgentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agentService = new AgentService();

  useEffect(() => {
    if (creatorAddress) {
      loadAgents();
    }
  }, [creatorAddress]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/agents/creator/${creatorAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      console.error('Error loading agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAgentClick = async (agentAddress: string) => {
    try {
      setSelectedAgent(agentAddress);
      const agentInfo = await agentService.getAgentInfo(agentAddress);
      // TODO: Show agent details in a modal or expanded view
      console.log('Agent info:', agentInfo);
    } catch (err) {
      console.error('Error fetching agent details:', err);
    }
  };

  if (!creatorAddress) {
    return (
      <div className="agent-dashboard">
        <p>Please connect your wallet to view your agents</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="agent-dashboard">
        <div className="loading-spinner">Loading your agents...</div>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <div className="dashboard-header">
        <h2>Your Agents</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {agents.length === 0 ? (
        <div className="no-agents">
          <p>You haven't created any agents yet.</p>
          <button className="create-button" onClick={onClose}>Create Your First Agent</button>
        </div>
      ) : (
        <div className="agents-list">
          {agents.map((agent) => (
            <div 
              key={agent.agentAddress}
              className={`agent-card ${selectedAgent === agent.agentAddress ? 'selected' : ''}`}
              onClick={() => handleAgentClick(agent.agentAddress)}
            >
              <div className="agent-info">
                <h3>{agent.name} ({agent.symbol})</h3>
                <p className="agent-address">
                  Address: {agent.agentAddress.slice(0, 8)}...{agent.agentAddress.slice(-6)}
                </p>
                <p className="creation-date">Created: {formatDate(agent.createdAt)}</p>
              </div>
              <div className="agent-actions">
                <button className="action-button view">View Details</button>
                <a 
                  href={`https://solscan.io/token/${agent.agentAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button explorer"
                >
                  View on Explorer
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;

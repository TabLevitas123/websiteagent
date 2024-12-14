import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import '../styles/AgentRecommendations.css';

interface AgentRecommendationsProps {
  onSelect: (agentAddress: string) => void;
}

interface RecommendedAgent {
  agentAddress: string;
  name: string;
  description: string;
  imageUrl: string;
  verificationStatus: string;
  listingPrice: number;
  category: string;
  analytics: {
    totalInteractions: number;
  };
  _count: {
    followers: number;
    interactions: number;
  };
}

const AgentRecommendations: React.FC<AgentRecommendationsProps> = ({
  onSelect,
}) => {
  const { publicKey } = useWallet();
  const [recommendations, setRecommendations] = useState<RecommendedAgent[]>([]);
  const [trending, setTrending] = useState<RecommendedAgent[]>([]);
  const [similar, setSimilar] = useState<RecommendedAgent[]>([]);
  const [activeTab, setActiveTab] = useState<'personal' | 'trending' | 'similar'>('personal');
  const [timeframe, setTimeframe] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey) {
      loadRecommendations();
    }
  }, [publicKey]);

  useEffect(() => {
    loadTrendingAgents();
  }, [timeframe]);

  const loadRecommendations = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${publicKey.toBase58()}/recommendations`);
      if (!response.ok) {
        throw new Error('Failed to load recommendations');
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const loadTrendingAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/trending?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to load trending agents');
      }

      const data = await response.json();
      setTrending(data);
    } catch (err) {
      console.error('Error loading trending agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending agents');
    } finally {
      setLoading(false);
    }
  };

  const loadSimilarAgents = async (agentAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentAddress}/similar`);
      if (!response.ok) {
        throw new Error('Failed to load similar agents');
      }

      const data = await response.json();
      setSimilar(data);
    } catch (err) {
      console.error('Error loading similar agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load similar agents');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  const renderAgentCard = (agent: RecommendedAgent) => (
    <div
      key={agent.agentAddress}
      className="agent-card"
      onClick={() => onSelect(agent.agentAddress)}
    >
      <div className="agent-image">
        <img src={agent.imageUrl || '/default-agent.png'} alt={agent.name} />
        <div className={`status-badge ${agent.verificationStatus.toLowerCase()}`}>
          {agent.verificationStatus}
        </div>
      </div>

      <div className="agent-details">
        <h4>{agent.name}</h4>
        <p className="category">{agent.category}</p>
        <p className="description">{agent.description}</p>

        <div className="agent-stats">
          <span className="stat">
            {agent._count.followers} followers
          </span>
          <span className="stat">
            {agent._count.interactions} interactions
          </span>
          <span className="price">
            {agent.listingPrice} SOL
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="agent-recommendations">
      <div className="recommendations-header">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            For You
          </button>
          <button
            className={`tab-button ${activeTab === 'trending' ? 'active' : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </button>
          <button
            className={`tab-button ${activeTab === 'similar' ? 'active' : ''}`}
            onClick={() => setActiveTab('similar')}
          >
            Similar
          </button>
        </div>

        {activeTab === 'trending' && (
          <div className="timeframe-selector">
            <button
              className={`timeframe-button ${timeframe === '1h' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('1h')}
            >
              1H
            </button>
            <button
              className={`timeframe-button ${timeframe === '24h' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('24h')}
            >
              24H
            </button>
            <button
              className={`timeframe-button ${timeframe === '7d' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('7d')}
            >
              7D
            </button>
            <button
              className={`timeframe-button ${timeframe === '30d' ? 'active' : ''}`}
              onClick={() => handleTimeframeChange('30d')}
            >
              30D
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="recommendations-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <div className="agent-grid">
            {activeTab === 'personal' && (
              publicKey ? (
                recommendations.length > 0 ? (
                  recommendations.map(renderAgentCard)
                ) : (
                  <div className="no-data">
                    No personalized recommendations available yet.
                    Interact with more agents to get better recommendations!
                  </div>
                )
              ) : (
                <div className="no-data">
                  Connect your wallet to get personalized recommendations
                </div>
              )
            )}

            {activeTab === 'trending' && (
              trending.length > 0 ? (
                trending.map(renderAgentCard)
              ) : (
                <div className="no-data">
                  No trending agents found for the selected timeframe
                </div>
              )
            )}

            {activeTab === 'similar' && (
              similar.length > 0 ? (
                similar.map(renderAgentCard)
              ) : (
                <div className="no-data">
                  Select an agent to see similar recommendations
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentRecommendations;

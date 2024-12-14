import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import '../styles/AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  agentAddress?: string;
}

const COLORS = ['#64ffda', '#00bfa5', '#00e676', '#1de9b6', '#00b8d4'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  agentAddress,
}) => {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState<'platform' | 'agent' | 'marketplace' | 'user'>('platform');
  const [timeframe, setTimeframe] = useState('24h');
  const [platformMetrics, setPlatformMetrics] = useState<any>(null);
  const [agentMetrics, setAgentMetrics] = useState<any>(null);
  const [marketplaceMetrics, setMarketplaceMetrics] = useState<any>(null);
  const [userMetrics, setUserMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'platform') {
      loadPlatformMetrics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'agent' && agentAddress) {
      loadAgentMetrics();
    }
  }, [activeTab, agentAddress, timeframe]);

  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplaceMetrics();
    }
  }, [activeTab, timeframe]);

  useEffect(() => {
    if (activeTab === 'user' && publicKey) {
      loadUserMetrics();
    }
  }, [activeTab, publicKey, timeframe]);

  const loadPlatformMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/analytics/platform');
      if (!response.ok) {
        throw new Error('Failed to load platform metrics');
      }

      const data = await response.json();
      setPlatformMetrics(data);
    } catch (err) {
      console.error('Error loading platform metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load platform metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadAgentMetrics = async () => {
    if (!agentAddress) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/agent/${agentAddress}?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to load agent metrics');
      }

      const data = await response.json();
      setAgentMetrics(data);
    } catch (err) {
      console.error('Error loading agent metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agent metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadMarketplaceMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/marketplace?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to load marketplace metrics');
      }

      const data = await response.json();
      setMarketplaceMetrics(data);
    } catch (err) {
      console.error('Error loading marketplace metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marketplace metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMetrics = async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/user/${publicKey.toBase58()}?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to load user metrics');
      }

      const data = await response.json();
      setUserMetrics(data);
    } catch (err) {
      console.error('Error loading user metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user metrics');
    } finally {
      setLoading(false);
    }
  };

  const renderPlatformMetrics = () => (
    <div className="metrics-grid">
      <div className="metric-card">
        <h4>Total Agents</h4>
        <div className="metric-value">{platformMetrics?.totalAgents}</div>
      </div>
      <div className="metric-card">
        <h4>Total Users</h4>
        <div className="metric-value">{platformMetrics?.totalUsers}</div>
      </div>
      <div className="metric-card">
        <h4>Active Agents (24h)</h4>
        <div className="metric-value">{platformMetrics?.activeAgents}</div>
      </div>
      <div className="metric-card">
        <h4>Total Volume</h4>
        <div className="metric-value">{platformMetrics?.totalVolume} SOL</div>
      </div>
      <div className="metric-card">
        <h4>Total Functions</h4>
        <div className="metric-value">{platformMetrics?.totalFunctions}</div>
      </div>
      <div className="metric-card">
        <h4>Total Executions</h4>
        <div className="metric-value">{platformMetrics?.totalExecutions}</div>
      </div>
    </div>
  );

  const renderAgentMetrics = () => (
    <>
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Interactions</h4>
          <div className="metric-value">{agentMetrics?.metrics.interactions}</div>
        </div>
        <div className="metric-card">
          <h4>Executions</h4>
          <div className="metric-value">{agentMetrics?.metrics.executions}</div>
        </div>
        <div className="metric-card">
          <h4>Revenue</h4>
          <div className="metric-value">{agentMetrics?.metrics.revenue} SOL</div>
        </div>
        <div className="metric-card">
          <h4>Followers</h4>
          <div className="metric-value">{agentMetrics?.metrics.followers}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h4>Interaction Trends</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={agentMetrics?.trends.interactions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="_count" stroke="#64ffda" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>Popular Functions</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agentMetrics?.functions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="functionId" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="_count" fill="#64ffda" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );

  const renderMarketplaceMetrics = () => (
    <>
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Trading Volume</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={marketplaceMetrics?.volume.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="_sum.amount" stroke="#64ffda" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>Category Distribution</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={marketplaceMetrics?.categories}
                dataKey="_count._all"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {marketplaceMetrics?.categories.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="top-sellers">
        <h4>Top Sellers</h4>
        <div className="sellers-list">
          {marketplaceMetrics?.topSellers.map((seller: any, index: number) => (
            <div key={seller.agentAddress} className="seller-item">
              <span className="seller-rank">#{index + 1}</span>
              <span className="seller-address">{seller.agentAddress}</span>
              <span className="seller-volume">{seller._sum.amount} SOL</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderUserMetrics = () => (
    <>
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Created Agents</h4>
          <div className="metric-value">{userMetrics?.createdAgents}</div>
        </div>
        <div className="metric-card">
          <h4>Purchases</h4>
          <div className="metric-value">{userMetrics?.purchases}</div>
        </div>
        <div className="metric-card">
          <h4>Total Spent</h4>
          <div className="metric-value">{userMetrics?.totalSpent} SOL</div>
        </div>
        <div className="metric-card">
          <h4>Interactions</h4>
          <div className="metric-value">{userMetrics?.interactions}</div>
        </div>
      </div>

      <div className="favorite-categories">
        <h4>Favorite Categories</h4>
        <div className="categories-list">
          {userMetrics?.favoriteCategories.map((category: any) => (
            <div key={category.agentAddress} className="category-item">
              <span className="category-name">{category.agentAddress}</span>
              <span className="category-count">{category._count._all} interactions</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'platform' ? 'active' : ''}`}
            onClick={() => setActiveTab('platform')}
          >
            Platform
          </button>
          {agentAddress && (
            <button
              className={`tab-button ${activeTab === 'agent' ? 'active' : ''}`}
              onClick={() => setActiveTab('agent')}
            >
              Agent
            </button>
          )}
          <button
            className={`tab-button ${activeTab === 'marketplace' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketplace')}
          >
            Marketplace
          </button>
          {publicKey && (
            <button
              className={`tab-button ${activeTab === 'user' ? 'active' : ''}`}
              onClick={() => setActiveTab('user')}
            >
              User
            </button>
          )}
        </div>

        {activeTab !== 'platform' && (
          <div className="timeframe-selector">
            <button
              className={`timeframe-button ${timeframe === '1h' ? 'active' : ''}`}
              onClick={() => setTimeframe('1h')}
            >
              1H
            </button>
            <button
              className={`timeframe-button ${timeframe === '24h' ? 'active' : ''}`}
              onClick={() => setTimeframe('24h')}
            >
              24H
            </button>
            <button
              className={`timeframe-button ${timeframe === '7d' ? 'active' : ''}`}
              onClick={() => setTimeframe('7d')}
            >
              7D
            </button>
            <button
              className={`timeframe-button ${timeframe === '30d' ? 'active' : ''}`}
              onClick={() => setTimeframe('30d')}
            >
              30D
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            {activeTab === 'platform' && platformMetrics && renderPlatformMetrics()}
            {activeTab === 'agent' && agentMetrics && renderAgentMetrics()}
            {activeTab === 'marketplace' && marketplaceMetrics && renderMarketplaceMetrics()}
            {activeTab === 'user' && userMetrics && renderUserMetrics()}
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

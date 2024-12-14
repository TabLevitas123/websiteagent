import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import '../styles/AgentSearch.css';

interface AgentSearchProps {
  onSelect: (agentAddress: string) => void;
  onClose: () => void;
}

interface SearchResult {
  agentAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  verificationStatus: string;
  listingPrice: number;
  analytics: {
    totalInteractions: number;
  };
  _count: {
    followers: number;
    comments: number;
  };
}

const AgentSearch: React.FC<AgentSearchProps> = ({
  onSelect,
  onClose,
}) => {
  const { publicKey } = useWallet();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    verificationStatus: '',
    minPrice: '',
    maxPrice: '',
    minInteractions: '',
    functionCategory: '',
    tags: [] as string[],
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadTrendingSearches();
  }, []);

  useEffect(() => {
    if (query) {
      // Clear previous timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      // Set new timeout for search
      searchTimeout.current = setTimeout(() => {
        performSearch();
        loadSuggestions();
      }, 300);
    } else {
      setResults([]);
      setSuggestions([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, filters, sortBy, sortOrder]);

  const performSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        q: query,
        ...filters,
        sortBy,
        order: sortOrder,
      });

      const response = await fetch(`/api/agents/search?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to perform search');
      }

      const data = await response.json();
      setResults(data.results);

      // Record search query
      if (query.trim()) {
        await fetch(`/api/agents/search/record?q=${encodeURIComponent(query)}`);
      }
    } catch (err) {
      console.error('Error performing search:', err);
      setError(err instanceof Error ? err.message : 'Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/agents/search/suggestions?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to load suggestions');
      }

      const data = await response.json();
      setSuggestions(data.map((item: any) => item.name));
    } catch (err) {
      console.error('Error loading suggestions:', err);
    }
  };

  const loadTrendingSearches = async () => {
    try {
      const response = await fetch('/api/agents/search/trending');
      if (!response.ok) {
        throw new Error('Failed to load trending searches');
      }

      const data = await response.json();
      setTrending(data.map((item: any) => item.query));
    } catch (err) {
      console.error('Error loading trending searches:', err);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="agent-search">
      <div className="search-header">
        <h3>Search Agents</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="search-content">
        <div className="search-bar">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents..."
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-item"
                  onClick={() => setQuery(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="search-filters">
          <div className="filter-group">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="UTILITY">Utility</option>
              <option value="GAMING">Gaming</option>
              <option value="SOCIAL">Social</option>
              <option value="DEFI">DeFi</option>
            </select>

            <select
              value={filters.verificationStatus}
              onChange={(e) => handleFilterChange('verificationStatus', e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
          </div>

          <div className="filter-group">
            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange('minPrice', e.target.value)}
            />
            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
            />
          </div>

          <div className="sort-controls">
            <button
              className={`sort-button ${sortBy === 'relevance' ? 'active' : ''}`}
              onClick={() => handleSort('relevance')}
            >
              Relevance
            </button>
            <button
              className={`sort-button ${sortBy === 'price' ? 'active' : ''}`}
              onClick={() => handleSort('price')}
            >
              Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              className={`sort-button ${sortBy === 'interactions' ? 'active' : ''}`}
              onClick={() => handleSort('interactions')}
            >
              Popularity {sortBy === 'interactions' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!query && trending.length > 0 && (
          <div className="trending-searches">
            <h4>Trending Searches</h4>
            <div className="trending-tags">
              {trending.map((term, index) => (
                <button
                  key={index}
                  className="trending-tag"
                  onClick={() => setQuery(term)}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="search-results">
          {loading ? (
            <div className="loading-spinner">Searching...</div>
          ) : results.length === 0 ? (
            <div className="no-results">
              {query ? 'No agents found matching your criteria' : 'Start typing to search agents'}
            </div>
          ) : (
            results.map(result => (
              <div
                key={result.agentAddress}
                className="result-card"
                onClick={() => onSelect(result.agentAddress)}
              >
                <div className="result-image">
                  <img src={result.imageUrl || '/default-agent.png'} alt={result.name} />
                  <div className={`status-badge ${result.verificationStatus.toLowerCase()}`}>
                    {result.verificationStatus}
                  </div>
                </div>

                <div className="result-details">
                  <h4>{result.name}</h4>
                  <p className="symbol">{result.symbol}</p>
                  <p className="description">{result.description}</p>

                  <div className="result-stats">
                    <span className="stat">
                      {result._count.followers} followers
                    </span>
                    <span className="stat">
                      {result.analytics.totalInteractions} interactions
                    </span>
                    <span className="price">
                      {result.listingPrice} SOL
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentSearch;

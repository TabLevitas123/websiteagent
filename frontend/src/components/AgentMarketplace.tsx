import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import '../styles/AgentMarketplace.css';

interface AgentListing {
  agentAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  listingPrice: number;
  creator: string;
  verificationStatus: string;
  analytics: {
    totalInteractions: number;
  };
}

interface MarketplaceProps {
  onPurchase: (agentAddress: string) => void;
  onClose: () => void;
}

const AgentMarketplace: React.FC<MarketplaceProps> = ({
  onPurchase,
  onClose,
}) => {
  const { publicKey, signTransaction } = useWallet();
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    verificationStatus: '',
    search: '',
  });
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchListings();
  }, [page, filters, sortBy, sortOrder]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy,
        order: sortOrder,
        ...filters,
      });

      const response = await fetch(`/api/agents/marketplace/listings?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }

      const data = await response.json();
      setListings(data.listings);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (listing: AgentListing) => {
    if (!publicKey || !signTransaction) {
      setError('Please connect your wallet');
      return;
    }

    try {
      // TODO: Implement purchase transaction
      // 1. Create and sign the purchase transaction
      // 2. Send the transaction to the blockchain
      // 3. Call the purchase API endpoint
      // 4. Update the UI

      onPurchase(listing.agentAddress);
    } catch (err) {
      console.error('Error purchasing agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to purchase agent');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  if (loading && page === 1) {
    return (
      <div className="agent-marketplace">
        <div className="loading-spinner">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="agent-marketplace">
      <div className="marketplace-header">
        <h2>Agent Marketplace</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="marketplace-filters">
        <div className="search-bar">
          <input
            type="text"
            name="search"
            placeholder="Search agents..."
            value={filters.search}
            onChange={handleFilterChange}
          />
        </div>

        <div className="filter-controls">
          <div className="price-filters">
            <input
              type="number"
              name="minPrice"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={handleFilterChange}
            />
            <input
              type="number"
              name="maxPrice"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={handleFilterChange}
            />
          </div>

          <select
            name="verificationStatus"
            value={filters.verificationStatus}
            onChange={handleFilterChange}
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>

          <div className="sort-controls">
            <button
              className={`sort-button ${sortBy === 'price' ? 'active' : ''}`}
              onClick={() => handleSort('price')}
            >
              Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              className={`sort-button ${sortBy === 'popularity' ? 'active' : ''}`}
              onClick={() => handleSort('popularity')}
            >
              Popularity {sortBy === 'popularity' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="listings-grid">
        {listings.map(listing => (
          <div key={listing.agentAddress} className="listing-card">
            <div className="listing-image">
              <img src={listing.imageUrl || '/default-agent.png'} alt={listing.name} />
              <div className={`status-badge ${listing.verificationStatus.toLowerCase()}`}>
                {listing.verificationStatus}
              </div>
            </div>

            <div className="listing-details">
              <h3>{listing.name}</h3>
              <p className="symbol">{listing.symbol}</p>
              <p className="description">{listing.description}</p>

              <div className="listing-stats">
                <span className="interactions">
                  {listing.analytics.totalInteractions} interactions
                </span>
                <span className="price">
                  {listing.listingPrice} SOL
                </span>
              </div>

              <button
                className="purchase-button"
                onClick={() => handlePurchase(listing)}
                disabled={!publicKey || listing.creator === publicKey.toBase58()}
              >
                {!publicKey
                  ? 'Connect Wallet'
                  : listing.creator === publicKey.toBase58()
                    ? 'Your Agent'
                    : 'Purchase'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {listings.length === 0 && !loading && (
        <div className="no-results">
          No agents found matching your criteria
        </div>
      )}

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AgentMarketplace;

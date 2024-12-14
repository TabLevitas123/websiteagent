import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface AgentVerificationProps {
  agentAddress: string;
  onVerificationComplete: () => void;
  onClose: () => void;
}

interface VerificationHistory {
  id: number;
  status: string;
  reason: string | null;
  verifiedBy: string;
  timestamp: string;
}

const AgentVerification: React.FC<AgentVerificationProps> = ({
  agentAddress,
  onVerificationComplete,
  onClose,
}) => {
  const { publicKey } = useWallet();
  const [verificationStatus, setVerificationStatus] = useState<string>('UNVERIFIED');
  const [history, setHistory] = useState<VerificationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  useEffect(() => {
    loadVerificationHistory();
  }, [agentAddress]);

  const loadVerificationHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agents/verify-history/${agentAddress}`);
      if (!response.ok) {
        throw new Error('Failed to load verification history');
      }
      const data = await response.json();
      setHistory(data);
      
      // Get current status from the most recent history entry
      if (data.length > 0) {
        setVerificationStatus(data[0].status);
      }
    } catch (err) {
      console.error('Error loading verification history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verification history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/verify-request/${agentAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestedBy: publicKey.toBase58(),
          details,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request verification');
      }

      await loadVerificationHistory();
      onVerificationComplete();
    } catch (err) {
      console.error('Error requesting verification:', err);
      setError(err instanceof Error ? err.message : 'Failed to request verification');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return '#00e676';
      case 'PENDING':
        return '#ffd700';
      case 'REJECTED':
        return '#ff1744';
      default:
        return '#ffffff';
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

  return (
    <div className="agent-verification">
      <div className="verification-header">
        <h3>Agent Verification</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="verification-content">
        <div className="current-status">
          <h4>Current Status</h4>
          <div 
            className="status-badge"
            style={{ backgroundColor: getStatusColor(verificationStatus) }}
          >
            {verificationStatus}
          </div>
        </div>

        {verificationStatus === 'UNVERIFIED' && (
          <div className="request-form">
            <h4>Request Verification</h4>
            <div className="input-group">
              <label htmlFor="details">Additional Details</label>
              <textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any additional information to support your verification request"
                disabled={isLoading}
              />
            </div>

            <button
              className="request-button"
              onClick={handleRequestVerification}
              disabled={isLoading || !details.trim()}
            >
              {isLoading ? 'Requesting...' : 'Request Verification'}
            </button>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="verification-history">
          <h4>Verification History</h4>
          {history.length === 0 ? (
            <p className="no-history">No verification history available</p>
          ) : (
            <div className="history-list">
              {history.map((entry) => (
                <div key={entry.id} className="history-entry">
                  <div className="entry-header">
                    <div 
                      className="status-badge small"
                      style={{ backgroundColor: getStatusColor(entry.status) }}
                    >
                      {entry.status}
                    </div>
                    <span className="timestamp">{formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.reason && (
                    <p className="reason">{entry.reason}</p>
                  )}
                  <p className="verified-by">
                    By: {entry.verifiedBy.slice(0, 8)}...{entry.verifiedBy.slice(-6)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentVerification;

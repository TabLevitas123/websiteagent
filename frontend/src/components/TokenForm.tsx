import React, { useState } from 'react';

interface TokenFormProps {
  walletAddress: string | null;
  onSubmit: (tokenData: TokenData) => void;
}

interface TokenData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

const TokenForm: React.FC<TokenFormProps> = ({ walletAddress, onSubmit }) => {
  const [formData, setFormData] = useState<TokenData>({
    name: '',
    symbol: '',
    decimals: 9,
    totalSupply: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!walletAddress) {
    return <p>Please connect your wallets to create an agent</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="token-creation-form">
      <div className="form-group">
        <label htmlFor="name">Agent Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g., My Agent"
        />
      </div>

      <div className="form-group">
        <label htmlFor="symbol">Agent Symbol</label>
        <input
          type="text"
          id="symbol"
          name="symbol"
          value={formData.symbol}
          onChange={handleChange}
          required
          placeholder="e.g., AGNT"
          maxLength={5}
        />
      </div>

      <div className="form-group">
        <label htmlFor="decimals">Decimals</label>
        <input
          type="number"
          id="decimals"
          name="decimals"
          value={formData.decimals}
          onChange={handleChange}
          required
          min="0"
          max="18"
        />
      </div>

      <div className="form-group">
        <label htmlFor="totalSupply">Total Supply</label>
        <input
          type="text"
          id="totalSupply"
          name="totalSupply"
          value={formData.totalSupply}
          onChange={handleChange}
          required
          placeholder="e.g., 1000000"
        />
      </div>

      <button type="submit" className="submit-button">
        Create Agent (0.006 ETH)
      </button>
    </form>
  );
};

export default TokenForm;

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface AgentMetadataEditorProps {
  agentAddress: string;
  initialMetadata: {
    name: string;
    symbol: string;
    description?: string;
    imageUrl?: string;
    externalUrl?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
  onSave: () => void;
  onClose: () => void;
}

const AgentMetadataEditor: React.FC<AgentMetadataEditorProps> = ({
  agentAddress,
  initialMetadata,
  onSave,
  onClose,
}) => {
  const { publicKey } = useWallet();
  const [metadata, setMetadata] = useState(initialMetadata);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateMetadata = async () => {
    try {
      const response = await fetch('/api/agents/metadata-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const data = await response.json();
      if (!data.isValid) {
        setValidationErrors(data.errors);
        return false;
      }

      setValidationErrors({});
      return true;
    } catch (err) {
      console.error('Error validating metadata:', err);
      return false;
    }
  };

  const handleInputChange = (
    field: string,
    value: string | Array<{ trait_type: string; value: string | number }>
  ) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
    setValidationErrors({});
  };

  const handleAttributeChange = (index: number, field: 'trait_type' | 'value', value: string) => {
    const newAttributes = [...(metadata.attributes || [])];
    if (!newAttributes[index]) {
      newAttributes[index] = { trait_type: '', value: '' };
    }
    newAttributes[index][field] = value;
    handleInputChange('attributes', newAttributes);
  };

  const addAttribute = () => {
    const newAttributes = [...(metadata.attributes || []), { trait_type: '', value: '' }];
    handleInputChange('attributes', newAttributes);
  };

  const removeAttribute = (index: number) => {
    const newAttributes = metadata.attributes?.filter((_, i) => i !== index) || [];
    handleInputChange('attributes', newAttributes);
  };

  const handleSubmit = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    const isValid = await validateMetadata();
    if (!isValid) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/agents/metadata/${agentAddress}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metadata,
          updatedBy: publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update metadata');
      }

      onSave();
    } catch (err) {
      console.error('Error updating metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to update metadata');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="metadata-editor">
      <div className="editor-header">
        <h3>Edit Agent Metadata</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="editor-content">
        <div className="input-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={metadata.name}
            onChange={e => handleInputChange('name', e.target.value)}
            placeholder="Agent name"
            maxLength={32}
            disabled={isSaving}
          />
          {validationErrors.name && (
            <p className="validation-error">{validationErrors.name}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="symbol">Symbol</label>
          <input
            id="symbol"
            type="text"
            value={metadata.symbol}
            onChange={e => handleInputChange('symbol', e.target.value)}
            placeholder="Agent symbol"
            maxLength={10}
            disabled={isSaving}
          />
          {validationErrors.symbol && (
            <p className="validation-error">{validationErrors.symbol}</p>
          )}
        </div>

        <div className="input-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={metadata.description || ''}
            onChange={e => handleInputChange('description', e.target.value)}
            placeholder="Agent description"
            maxLength={1000}
            disabled={isSaving}
          />
        </div>

        <div className="input-group">
          <label htmlFor="imageUrl">Image URL</label>
          <input
            id="imageUrl"
            type="url"
            value={metadata.imageUrl || ''}
            onChange={e => handleInputChange('imageUrl', e.target.value)}
            placeholder="https://..."
            disabled={isSaving}
          />
        </div>

        <div className="input-group">
          <label htmlFor="externalUrl">External URL</label>
          <input
            id="externalUrl"
            type="url"
            value={metadata.externalUrl || ''}
            onChange={e => handleInputChange('externalUrl', e.target.value)}
            placeholder="https://..."
            disabled={isSaving}
          />
        </div>

        <div className="attributes-section">
          <label>Attributes</label>
          {metadata.attributes?.map((attr, index) => (
            <div key={index} className="attribute-row">
              <input
                type="text"
                value={attr.trait_type}
                onChange={e => handleAttributeChange(index, 'trait_type', e.target.value)}
                placeholder="Trait type"
                disabled={isSaving}
              />
              <input
                type="text"
                value={attr.value}
                onChange={e => handleAttributeChange(index, 'value', e.target.value)}
                placeholder="Value"
                disabled={isSaving}
              />
              <button
                className="remove-attribute"
                onClick={() => removeAttribute(index)}
                disabled={isSaving}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="add-attribute"
            onClick={addAttribute}
            disabled={isSaving}
          >
            Add Attribute
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="editor-actions">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentMetadataEditor;

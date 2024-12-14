import React, { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDropzone } from 'react-dropzone';
import '../styles/AgentBatchOperations.css';

interface AgentBatchOperationsProps {
  onClose: () => void;
}

interface BatchAgent {
  name: string;
  symbol: string;
  description: string;
  category: string;
  listingPrice: number;
  tags: string[];
  functions?: {
    name: string;
    description: string;
    category: string;
    inputs: {
      name: string;
      type: string;
      description: string;
    }[];
  }[];
}

const AgentBatchOperations: React.FC<AgentBatchOperationsProps> = ({
  onClose,
}) => {
  const { publicKey } = useWallet();
  const [agents, setAgents] = useState<BatchAgent[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result as string);
          validateAndSetAgents(jsonData);
        } catch (err) {
          setError('Invalid JSON file format');
        }
      };
      reader.readAsText(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  const validateAndSetAgents = (data: any) => {
    const errors: string[] = [];
    let validAgents: BatchAgent[] = [];

    if (!Array.isArray(data)) {
      setError('JSON file must contain an array of agents');
      return;
    }

    data.forEach((agent: any, index: number) => {
      if (!agent.name) errors.push(`Agent ${index + 1}: Missing name`);
      if (!agent.symbol) errors.push(`Agent ${index + 1}: Missing symbol`);
      if (!agent.description) errors.push(`Agent ${index + 1}: Missing description`);
      if (!agent.category) errors.push(`Agent ${index + 1}: Missing category`);
      if (typeof agent.listingPrice !== 'number') errors.push(`Agent ${index + 1}: Invalid listing price`);
      if (!Array.isArray(agent.tags)) errors.push(`Agent ${index + 1}: Tags must be an array`);

      if (agent.functions) {
        if (!Array.isArray(agent.functions)) {
          errors.push(`Agent ${index + 1}: Functions must be an array`);
        } else {
          agent.functions.forEach((func: any, funcIndex: number) => {
            if (!func.name) errors.push(`Agent ${index + 1}, Function ${funcIndex + 1}: Missing name`);
            if (!func.description) errors.push(`Agent ${index + 1}, Function ${funcIndex + 1}: Missing description`);
            if (!func.category) errors.push(`Agent ${index + 1}, Function ${funcIndex + 1}: Missing category`);
            if (!Array.isArray(func.inputs)) errors.push(`Agent ${index + 1}, Function ${funcIndex + 1}: Inputs must be an array`);
          });
        }
      }
    });

    if (errors.length === 0) {
      validAgents = data;
    }

    setValidationErrors(errors);
    setAgents(validAgents);
  };

  const handleCreateBatch = async () => {
    if (!publicKey) {
      setError('Please connect your wallet');
      return;
    }

    if (validationErrors.length > 0) {
      setError('Please fix validation errors before proceeding');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    try {
      const totalAgents = agents.length;
      let successCount = 0;

      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        
        try {
          const response = await fetch('/api/agents/batch/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...agent,
              creatorAddress: publicKey.toBase58(),
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create agent: ${agent.name}`);
          }

          successCount++;
        } catch (err) {
          console.error(`Error creating agent ${agent.name}:`, err);
        }

        setProgress(((i + 1) / totalAgents) * 100);
      }

      setSuccess(`Successfully created ${successCount} out of ${totalAgents} agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [{
      name: "Example Agent",
      symbol: "EXAG",
      description: "An example agent description",
      category: "UTILITY",
      listingPrice: 1.0,
      tags: ["example", "template"],
      functions: [{
        name: "exampleFunction",
        description: "An example function description",
        category: "GENERAL",
        inputs: [{
          name: "input1",
          type: "string",
          description: "Example input description"
        }]
      }]
    }];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="agent-batch-operations">
      <div className="batch-header">
        <h3>Batch Create Agents</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="batch-content">
        <div className="template-section">
          <h4>Getting Started</h4>
          <p>
            Download our template JSON file to see the required format for batch agent creation.
            Modify the template with your agent details and upload it below.
          </p>
          <button
            className="template-button"
            onClick={handleDownloadTemplate}
          >
            Download Template
          </button>
        </div>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? 'active' : ''}`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the JSON file here...</p>
          ) : (
            <p>Drag and drop a JSON file here, or click to select a file</p>
          )}
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            <h4>Validation Errors</h4>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {agents.length > 0 && (
          <div className="agents-preview">
            <h4>Agents to Create ({agents.length})</h4>
            <div className="agents-list">
              {agents.map((agent, index) => (
                <div key={index} className="agent-preview">
                  <h5>{agent.name}</h5>
                  <p className="symbol">{agent.symbol}</p>
                  <p className="description">{agent.description}</p>
                  <div className="agent-meta">
                    <span className="category">{agent.category}</span>
                    <span className="price">{agent.listingPrice} SOL</span>
                  </div>
                  <div className="tags">
                    {agent.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="tag">{tag}</span>
                    ))}
                  </div>
                  {agent.functions && (
                    <div className="functions-count">
                      {agent.functions.length} function(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {loading ? (
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        ) : (
          agents.length > 0 && (
            <button
              className="create-button"
              onClick={handleCreateBatch}
              disabled={!publicKey || validationErrors.length > 0}
            >
              Create {agents.length} Agent{agents.length !== 1 ? 's' : ''}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default AgentBatchOperations;

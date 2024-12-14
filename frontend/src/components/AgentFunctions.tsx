import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import '../styles/AgentFunctions.css';

interface AgentFunctionsProps {
  agentAddress: string;
  onClose: () => void;
}

interface AgentFunction {
  id: string;
  functionName: string;
  description: string;
  category: string;
  version: string;
  inputSchema: any;
  outputSchema: any;
  createdAt: string;
}

interface ExecutionHistory {
  id: string;
  status: string;
  inputs: any;
  outputs: any;
  executedAt: string;
  caller: {
    name: string;
    imageUrl: string;
    verificationStatus: string;
  };
}

const AgentFunctions: React.FC<AgentFunctionsProps> = ({
  agentAddress,
  onClose,
}) => {
  const { publicKey } = useWallet();
  const [functions, setFunctions] = useState<AgentFunction[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<AgentFunction | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);
  const [functionInputs, setFunctionInputs] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'functions' | 'history'>('functions');

  useEffect(() => {
    loadFunctions();
  }, [agentAddress]);

  useEffect(() => {
    if (selectedFunction) {
      loadExecutionHistory(selectedFunction.id);
    }
  }, [selectedFunction]);

  const loadFunctions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentAddress}/functions`);
      if (!response.ok) {
        throw new Error('Failed to load functions');
      }

      const data = await response.json();
      setFunctions(data);

      if (data.length > 0) {
        setSelectedFunction(data[0]);
      }
    } catch (err) {
      console.error('Error loading functions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load functions');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionHistory = async (functionId: string) => {
    try {
      const response = await fetch(`/api/agents/execution-history/${functionId}`);
      if (!response.ok) {
        throw new Error('Failed to load execution history');
      }

      const data = await response.json();
      setExecutionHistory(data);
    } catch (err) {
      console.error('Error loading execution history:', err);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFunctionInputs(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const executeFunction = async () => {
    if (!publicKey || !selectedFunction) {
      return;
    }

    try {
      setExecuting(true);
      setError(null);

      const response = await fetch(`/api/agents/execute-function/${selectedFunction.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: functionInputs,
          callerAddress: publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute function');
      }

      const result = await response.json();
      
      // Add execution to history
      setExecutionHistory(prev => [{
        id: Date.now().toString(),
        status: result.status,
        inputs: functionInputs,
        outputs: result.output,
        executedAt: new Date().toISOString(),
        caller: {
          name: 'You',
          imageUrl: '',
          verificationStatus: '',
        },
      }, ...prev]);

      // Clear inputs
      setFunctionInputs({});
    } catch (err) {
      console.error('Error executing function:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute function');
    } finally {
      setExecuting(false);
    }
  };

  const renderInputForm = () => {
    if (!selectedFunction) return null;

    const schema = selectedFunction.inputSchema;
    return Object.entries(schema.properties || {}).map(([key, prop]: [string, any]) => (
      <div key={key} className="input-group">
        <label>{key}</label>
        {prop.type === 'string' && (
          <input
            type="text"
            value={functionInputs[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value)}
            placeholder={prop.description}
          />
        )}
        {prop.type === 'number' && (
          <input
            type="number"
            value={functionInputs[key] || ''}
            onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
            placeholder={prop.description}
          />
        )}
        {prop.type === 'boolean' && (
          <select
            value={functionInputs[key] || ''}
            onChange={(e) => handleInputChange(key, e.target.value === 'true')}
          >
            <option value="">Select...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="agent-functions">
        <div className="loading-spinner">Loading functions...</div>
      </div>
    );
  }

  return (
    <div className="agent-functions">
      <div className="functions-header">
        <h3>Agent Functions</h3>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="functions-content">
        <div className="function-list">
          {functions.map(func => (
            <button
              key={func.id}
              className={`function-item ${selectedFunction?.id === func.id ? 'active' : ''}`}
              onClick={() => setSelectedFunction(func)}
            >
              <span className="function-name">{func.functionName}</span>
              <span className="function-version">{func.version}</span>
            </button>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}

        {selectedFunction && (
          <div className="function-details">
            <div className="tabs">
              <button
                className={`tab-button ${activeTab === 'functions' ? 'active' : ''}`}
                onClick={() => setActiveTab('functions')}
              >
                Function
              </button>
              <button
                className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>

            {activeTab === 'functions' ? (
              <>
                <div className="function-info">
                  <h4>{selectedFunction.functionName}</h4>
                  <p className="description">{selectedFunction.description}</p>
                  <div className="metadata">
                    <span className="category">{selectedFunction.category}</span>
                    <span className="version">v{selectedFunction.version}</span>
                  </div>
                </div>

                <div className="function-form">
                  <h4>Inputs</h4>
                  {renderInputForm()}
                  
                  <button
                    className="execute-button"
                    onClick={executeFunction}
                    disabled={!publicKey || executing}
                  >
                    {executing ? 'Executing...' : 'Execute Function'}
                  </button>
                </div>
              </>
            ) : (
              <div className="execution-history">
                {executionHistory.length === 0 ? (
                  <p className="no-data">No execution history</p>
                ) : (
                  executionHistory.map(execution => (
                    <div key={execution.id} className="execution-item">
                      <div className="execution-header">
                        <span className={`status ${execution.status.toLowerCase()}`}>
                          {execution.status}
                        </span>
                        <span className="timestamp">
                          {new Date(execution.executedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="execution-details">
                        <div className="execution-inputs">
                          <h5>Inputs</h5>
                          <pre>{JSON.stringify(execution.inputs, null, 2)}</pre>
                        </div>
                        <div className="execution-outputs">
                          <h5>Outputs</h5>
                          <pre>{JSON.stringify(execution.outputs, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentFunctions;

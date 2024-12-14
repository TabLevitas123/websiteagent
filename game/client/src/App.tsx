import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ethers } from 'ethers';
import './App.css';

interface GameMessage {
  type?: string;
  description?: string;
  exits?: string[];
  npcs?: string[];
  items?: string[];
  tokenId?: string;
  message?: string;
  players?: Array<{ tokenId: string }>;
}

function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [input, setInput] = useState('');
  const [tokenId, setTokenId] = useState('');
  const socketRef = useRef<Socket>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to game server
    socketRef.current = io('http://localhost:3000');

    socketRef.current.on('connect', () => {
      console.log('Connected to game server');
    });

    socketRef.current.on('gameState', (state: GameMessage) => {
      setConnected(true);
      addMessage({
        type: 'system',
        message: 'Connection established to the neural network...'
      });
      addMessage(state);
    });

    socketRef.current.on('message', (message: GameMessage) => {
      addMessage(message);
    });

    socketRef.current.on('error', (error: string) => {
      addMessage({
        type: 'error',
        message: `Error: ${error}`
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: GameMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const [command, ...args] = input.split(' ');
    socketRef.current?.emit('command', { command, args });
    setInput('');
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        // TODO: Get user's character token ID
        // For now, using a mock token ID
        const mockTokenId = '1';
        setTokenId(mockTokenId);

        // Sign message to prove ownership
        const message = `Login to Cyber Agents with token ${mockTokenId}`;
        const signature = await signer.signMessage(message);

        // Login to game server
        socketRef.current?.emit('login', {
          tokenId: mockTokenId,
          signature
        });
      } else {
        addMessage({
          type: 'error',
          message: 'Please install a Web3 wallet to play'
        });
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      addMessage({
        type: 'error',
        message: 'Failed to connect wallet'
      });
    }
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>CYBER AGENTS</h1>
        {!connected && (
          <button onClick={connectWallet} className="connect-button">
            Initialize Neural Link
          </button>
        )}
      </div>

      <div className="game-terminal">
        <div className="terminal-output">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.type || ''}`}>
              {msg.description && (
                <div className="location-description">{msg.description}</div>
              )}
              {msg.exits && (
                <div className="exits">
                  Detected pathways: {msg.exits.join(', ')}
                </div>
              )}
              {msg.npcs && (
                <div className="npcs">
                  Active entities: {msg.npcs.join(', ')}
                </div>
              )}
              {msg.items && (
                <div className="items">
                  Scannable objects: {msg.items.join(', ')}
                </div>
              )}
              {msg.message && <div>{msg.message}</div>}
              {msg.players && (
                <div className="scan-results">
                  Detected agents: {msg.players.map(p => p.tokenId).join(', ')}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleCommand} className="terminal-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            disabled={!connected}
          />
          <button type="submit" disabled={!connected}>
            Execute
          </button>
        </form>
      </div>

      <div className="game-help">
        <h3>Available Commands:</h3>
        <ul>
          <li>look - Scan current location</li>
          <li>move [location] - Transfer to new location</li>
          <li>say [message] - Broadcast message</li>
          <li>scan - Detect other agents</li>
        </ul>
      </div>
    </div>
  );
}

export default App;

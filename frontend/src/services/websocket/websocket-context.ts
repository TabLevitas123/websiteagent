import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  errors: Error[];
  connectionAttempts: number;
  latency: number;
}

interface WebSocketProviderProps {
  url: string;
  options?: {
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
    debug?: boolean;
  };
  children: React.ReactNode;
}

const defaultOptions = {
  reconnectAttempts: 5,
  reconnectInterval: 5000,
  heartbeatInterval: 30000,
  debug: false
};

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  url,
  options = defaultOptions,
  children
}) => {
  // Socket state
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [errors, setErrors] = useState<Error[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [latency, setLatency] = useState(0);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const pingTimeRef = useRef<number>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const { 
    reconnectAttempts,
    reconnectInterval,
    heartbeatInterval,
    debug
  } = { 
    ...defaultOptions, 
    ...options,
    // Adjust intervals for mobile devices
    ...((/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) && {
      reconnectInterval: (options.reconnectInterval || defaultOptions.reconnectInterval) * 1.5,
      heartbeatInterval: (options.heartbeatInterval || defaultOptions.heartbeatInterval) * 1.5,
      connectionTimeout: 10000 // Longer timeout for mobile devices
    })
  };

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      wsRef.current = new WebSocket(url);
      
      // Connection opened
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionAttempts(0);
        logger.info('WebSocket connected');
        if (debug) console.log('WebSocket connected');
      };

      // Message received
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle ping/pong for latency calculation
          if (message.type === 'pong') {
            if (pingTimeRef.current) {
              const latency = Date.now() - pingTimeRef.current;
              setLatency(latency);
            }
            return;
          }

          setLastMessage(message);
          if (debug) console.log('WebSocket message:', message);
          
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
          setErrors(prev => [...prev, error as Error]);
        }
      };

      // Connection closed
      wsRef.current.onclose = () => {
        setIsConnected(false);
        logger.warn('WebSocket closed');
        
        // Attempt reconnection
        if (connectionAttempts < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        } else {
          logger.error('Max reconnection attempts reached');
          setErrors(prev => [
            ...prev,
            new Error('Maximum reconnection attempts reached')
          ]);
        }
      };

      // Connection error
      wsRef.current.onerror = (error) => {
        logger.error('WebSocket error:', error);
        setErrors(prev => [...prev, error as Error]);
      };

    } catch (error) {
      logger.error('Failed to establish WebSocket connection:', error);
      setErrors(prev => [...prev, error as Error]);
    }
  }, [url, reconnectAttempts, reconnectInterval, debug, connectionAttempts]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    
    // Clear timeouts
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logger.error('WebSocket is not connected');
      return;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      if (debug) console.log('Sent message:', message);
    } catch (error) {
      logger.error('Failed to send message:', error);
      setErrors(prev => [...prev, error as Error]);
    }
  }, [debug]);

  // Setup heartbeat
  useEffect(() => {
    if (!isConnected) return;

    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        sendMessage({ type: 'ping' });
      }
    }, heartbeatInterval);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isConnected, sendMessage, heartbeatInterval]);

  // Cleanup on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Setup heartbeat
  useEffect(() => {
    if (!isConnected) return;

    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        sendMessage({ type: 'ping' });
      }
    }, heartbeatInterval);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isConnected, sendMessage, heartbeatInterval]);

  const value: WebSocketContextType = {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    errors,
    connectionAttempts,
    latency
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook for using WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketProvider;
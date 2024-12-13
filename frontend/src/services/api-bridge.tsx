import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';

// API Context Interface
interface APIContextType {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  metrics: any;
  alerts: any[];
  threats: any[];
  activities: any[];
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshData: () => Promise<void>;
}

// Create Context
const APIContext = createContext<APIContextType | undefined>(undefined);

// WebSocket Connection States
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export const APIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account } = useWeb3();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  
  // Data States
  const [metrics, setMetrics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket Connection
  const initializeWebSocket = () => {
    if (!account) return;

    try {
      const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL as string);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        setIsConnected(true);
        
        // Subscribe to data channels
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['metrics', 'alerts', 'threats', 'activities'],
          account
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionState('error');
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        setConnectionState('disconnected');
        setIsConnected(false);
        // Attempt to reconnect after delay
        setTimeout(initializeWebSocket, 5000);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      setError('Failed to establish connection');
    }
  };

  // Handle WebSocket Messages
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'metrics':
        setMetrics(data.payload);
        break;
      case 'alerts':
        setAlerts(data.payload);
        break;
      case 'threats':
        setThreats(data.payload);
        break;
      case 'activities':
        setActivities(data.payload);
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  };

  // Connect to API and WebSocket
  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Initialize API connection
      await fetchInitialData();
      
      // Initialize WebSocket
      initializeWebSocket();

    } catch (error) {
      console.error('Connection failed:', error);
      setError('Failed to connect to services');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from services
  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setMetrics(null);
    setAlerts([]);
    setThreats([]);
    setActivities([]);
  };

  // Fetch Initial Data
  const fetchInitialData = async () => {
    try {
      const [metricsData, alertsData, threatsData, activitiesData] = await Promise.all([
        fetch('/api/metrics').then(res => res.json()),
        fetch('/api/alerts').then(res => res.json()),
        fetch('/api/threats').then(res => res.json()),
        fetch('/api/activities').then(res => res.json())
      ]);

      setMetrics(metricsData);
      setAlerts(alertsData);
      setThreats(threatsData);
      setActivities(activitiesData);

    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      throw error;
    }
  };

  // Refresh Data
  const refreshData = async () => {
    try {
      setIsLoading(true);
      await fetchInitialData();
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect for connection management
  useEffect(() => {
    if (account) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [account]);

  // Context value
  const value: APIContextType = {
    isConnected,
    isLoading,
    error,
    metrics,
    alerts,
    threats,
    activities,
    connect,
    disconnect,
    refreshData
  };

  return (
    <APIContext.Provider value={value}>
      {children}
    </APIContext.Provider>
  );
};

// Custom hook for using API context
export const useAPI = () => {
  const context = useContext(APIContext);
  if (context === undefined) {
    throw new Error('useAPI must be used within an APIProvider');
  }
  return context;
};

export default APIProvider;
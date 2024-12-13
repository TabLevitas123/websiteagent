import { useState, useEffect, useCallback } from 'react';
import dataSyncService, { SyncEvent } from './dataSyncService';
import { logger } from '@/utils/logger';

interface DataSyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastSynced: number | null;
}

interface UseSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

export function useDataSync<T>(
  type: string,
  initialData: T | null = null,
  options: UseSyncOptions = {}
) {
  const {
    autoSync = true,
    syncInterval = 30000,
    onSyncComplete,
    onSyncError
  } = options;

  const [state, setState] = useState<DataSyncState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    lastSynced: null
  });

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    if (!isConnected) {
      setState(prev => ({
        ...prev,
        error: new Error('Connection lost'),
        isLoading: false
      }));
    }
  }, []);

  const handleRetrySync = useCallback(async () => {
    if (!state.data) return;
    await handleSync(state.data);
  }, [state.data, handleSync]);

  // Subscribe to sync service events
  useEffect(() => {
    dataSyncService.on('message', handleMessage);
    dataSyncService.on('connected', () => handleConnectionChange(true));
    dataSyncService.on('disconnected', () => handleConnectionChange(false));
    
    // Auto-sync interval
    let syncInterval: NodeJS.Timeout;
    if (autoSync && state.data) {
      syncInterval = setInterval(() => {
        handleRetrySync();
      }, syncInterval);
    }

    return () => {
      dataSyncService.off('message', handleMessage);
      dataSyncService.off('connected', () => handleConnectionChange(true));
      dataSyncService.off('disconnected', () => handleConnectionChange(false));
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [
    handleMessage,
    handleConnectionChange,
    handleRetrySync,
    autoSync,
    syncInterval,
    state.data
  ]);

  // Initialize sync service
  useEffect(() => {
    if (!dataSyncService.getConnectionStatus()) {
      dataSyncService.initialize({
        retryAttempts: 5,
        retryDelay: 5000,
        syncInterval
      });
    }
  }, [syncInterval]);

  // Expose sync methods and state
  return {
    ...state,
    sync: handleSync,
    retrySync: handleRetrySync,
    isConnected: dataSyncService.getConnectionStatus(),
    pendingSyncs: dataSyncService.getPendingSyncCount()
  };
}

const handleSync = useCallback(async (data: T) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await dataSyncService.sync(type, data);

      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        lastSynced: Date.now()
      }));

      onSyncComplete?.();
      logger.debug('Data sync completed:', { type, timestamp: Date.now() });

    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Sync failed');
      setState(prev => ({
        ...prev,
        error: syncError,
        isLoading: false
      }));

      onSyncError?.(syncError);
      logger.error('Data sync failed:', { type, error });
    }
  }, [type, onSyncComplete, onSyncError]);

  const handleMessage = useCallback((event: SyncEvent) => {
    if (event.type === type) {
      setState(prev => ({
        ...prev,
        data: event.data,
        lastSynced: event.timestamp,
        error: null
      }));
    }
  }, [type]);

  const handleConnectionChange = useCallback((isConnected: boolean) => {
    if (!isConnected) {
      setState(prev => ({
        ...prev,
        error: new Error('Connection lost'),
        isLoading: false
      }));
    }
  }, []);

  const handleRetrySync = useCallback(async () => {
    if (!state.data) return;
    await handleSync(state.data);
  }, [state.data, handleSync]);
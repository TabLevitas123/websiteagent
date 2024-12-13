import { EventEmitter } from 'events';
import { logger } from '@/utils/logger';

export interface SyncOptions {
  retryAttempts?: number;
  retryDelay?: number;
  syncInterval?: number;
}

export interface SyncEvent {
  type: string;
  data: any;
  timestamp: number;
}

class DataSyncService extends EventEmitter {
  private static instance: DataSyncService;
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private pendingSync: Set<string> = new Set();

  private options: Required<SyncOptions> = {
    retryAttempts: 5,
    retryDelay: 5000,
    syncInterval: 30000,
  };

  private constructor() {
    super();
    this.handleWebSocketMessage = this.handleWebSocketMessage.bind(this);
  }

  public static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  public initialize(options?: SyncOptions) {
    this.options = { ...this.options, ...options };
    this.connect();
    this.startSyncTimer();
  }

  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL as string);
      
      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.isConnected = true;
        this.retryCount = 0;
        this.processPendingSync();
        this.emit('connected');
      };

      this.ws.onmessage = this.handleWebSocketMessage;

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        logger.warn('WebSocket closed');
        this.isConnected = false;
        this.emit('disconnected');
        this.handleReconnection();
      };

    } catch (error) {
      logger.error('Failed to establish WebSocket connection:', error);
      this.emit('error', error);
      this.handleReconnection();
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.stopSyncTimer();
  }

  public async sync(type: string, data: any): Promise<void> {
    if (!this.isConnected) {
      this.pendingSync.add(JSON.stringify({ type, data }));
      return;
    }

    try {
      const event: SyncEvent = {
        type,
        data,
        timestamp: Date.now(),
      };

      this.ws?.send(JSON.stringify(event));
      this.emit('sync', event);
      logger.debug('Data synced:', { type, timestamp: event.timestamp });

    } catch (error) {
      logger.error('Sync failed:', error);
      this.emit('syncError', { type, error });
      this.pendingSync.add(JSON.stringify({ type, data }));
    }
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this.emit('message', message);
      logger.debug('Received WebSocket message:', message);

    } catch (error) {
      logger.error('Failed to process WebSocket message:', error);
      this.emit('error', error);
    }
  }

  private async processPendingSync(): Promise<void> {
    for (const item of this.pendingSync) {
      try {
        const { type, data } = JSON.parse(item);
        await this.sync(type, data);
        this.pendingSync.delete(item);
      } catch (error) {
        logger.error('Failed to process pending sync:', error);
      }
    }
  }

  private handleReconnection(): void {
    if (this.retryCount >= this.options.retryAttempts) {
      logger.error('Max reconnection attempts reached');
      this.emit('maxRetriesReached');
      return;
    }

    this.retryCount++;
    const delay = this.options.retryDelay * Math.pow(2, this.retryCount - 1);
    
    logger.info(`Attempting reconnection in ${delay}ms (attempt ${this.retryCount})`);
    setTimeout(() => this.connect(), delay);
  }

  private startSyncTimer(): void {
    if (this.syncTimer) return;
    
    this.syncTimer = setInterval(() => {
      this.emit('syncTick');
      this.processPendingSync();
    }, this.options.syncInterval);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getPendingSyncCount(): number {
    return this.pendingSync.size;
  }
}

export const dataSyncService = DataSyncService.getInstance();
export default dataSyncService;
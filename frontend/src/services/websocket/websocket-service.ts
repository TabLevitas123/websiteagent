import WebSocket from 'ws';
import { logger } from '@/utils/logger';
import { EventEmitter } from 'events';
import {
  WebSocketMessage,
  WebSocketConfig,
  ConnectionStatus,
  Subscription
} from '@/types';

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private status: ConnectionStatus = 'disconnected';

  constructor(config: WebSocketConfig) {
    super();
    
    // Adjust intervals for mobile devices
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      this.reconnectDelay = 1500; // 1.5x default
      if (config.pingInterval) {
        config.pingInterval = config.pingInterval * 1.5;
      }
    }
    
    this.config = config;
    this.setupEventHandlers();

    logger.info('WebSocketService initialized', {
      url: config.url,
      protocols: config.protocols,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    });
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        logger.debug('WebSocket already connected');
        return;
      }

      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupWebSocketHandlers();
      
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.once('open', () => {
          this.onConnect();
          resolve();
        });

        this.ws.once('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      logger.error('WebSocket connection failed', { error });
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.on('message', this.onMessage.bind(this));
    this.ws.on('close', this.onClose.bind(this));
    this.ws.on('error', this.onError.bind(this));
    this.ws.on('ping', this.onPing.bind(this));
    this.ws.on('pong', this.onPong.bind(this));
  }

  /**
   * Handle successful connection
   */
  private onConnect(): void {
    this.status = 'connected';
    this.reconnectAttempts = 0;
    this.startPingInterval();
    this.resubscribeAll();

    logger.info('WebSocket connected');
    this.emit('connect');
  }

  /**
   * Handle incoming messages
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      
      logger.debug('WebSocket message received', {
        type: message.type,
        id: message.id,
      });

      // Handle different message types
      switch (message.type) {
        case 'subscription':
          this.handleSubscriptionMessage(message);
          break;
        case 'response':
          this.handleResponseMessage(message);
          break;
        case 'error':
          this.handleErrorMessage(message);
          break;
        default:
          logger.warn('Unknown message type', { message });
      }

      this.emit('message', message);
    } catch (error) {
      logger.error('Failed to process WebSocket message', {
        error,
        data,
      });
    }
  }

  /**
   * Handle subscription messages
   */
  private handleSubscriptionMessage(message: WebSocketMessage): void {
    const subscription = this.subscriptions.get(message.id);
    if (subscription) {
      subscription.callback(message.data);
    }
  }

  /**
   * Handle response messages
   */
  private handleResponseMessage(message: WebSocketMessage): void {
    this.emit(`response:${message.id}`, message.data);
  }

  /**
   * Handle error messages
   */
  private handleErrorMessage(message: WebSocketMessage): void {
    logger.error('WebSocket error message', {
      id: message.id,
      error: message.data,
    });
    this.emit(`error:${message.id}`, message.data);
  }

  /**
   * Handle connection close
   */
  private onClose(): void {
    this.status = 'disconnected';
    this.stopPingInterval();
    
    logger.info('WebSocket disconnected');
    this.emit('disconnect');

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      logger.info('Attempting reconnection', {
        attempt: this.reconnectAttempts,
        delay,
      });

      setTimeout(() => {
        this.connect().catch((error) => {
          logger.error('Reconnection failed', { error });
        });
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
      this.emit('max_reconnects');
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.status = 'error';
    logger.error('WebSocket error', { error });
    this.emit('error', error);
  }

  /**
   * Subscribe to a topic
   */
  public subscribe(topic: string, callback: (data: any) => void): string {
    const id = Math.random().toString(36).substring(7);
    
    const subscription: Subscription = {
      id,
      topic,
      callback,
      timestamp: new Date().toISOString(),
    };

    this.subscriptions.set(id, subscription);

    // Send subscription message
    this.send({
      type: 'subscribe',
      id,
      data: { topic },
    });

    logger.debug('Subscription created', {
      id,
      topic,
    });

    return id;
  }

  /**
   * Unsubscribe from a topic
   */
  public unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      // Send unsubscribe message
      this.send({
        type: 'unsubscribe',
        id,
        data: { topic: subscription.topic },
      });

      this.subscriptions.delete(id);
      
      logger.debug('Unsubscribed', {
        id,
        topic: subscription.topic,
      });
    }
  }

  /**
   * Send a message
   */
  public send(message: WebSocketMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(message));
    
    logger.debug('Message sent', {
      type: message.type,
      id: message.id,
    });
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.config.pingInterval || 30000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Handle ping
   */
  private onPing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.pong();
    }
  }

  /**
   * Handle pong
   */
  private onPong(): void {
    // Update connection health metrics
    this.emit('pong');
  }

  /**
   * Resubscribe to all topics
   */
  private resubscribeAll(): void {
    for (const [id, subscription] of this.subscriptions) {
      this.send({
        type: 'subscribe',
        id,
        data: { topic: subscription.topic },
      });
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get all active subscriptions
   */
  public getSubscriptions(): Map<string, Subscription> {
    return this.subscriptions;
  }

  /**
   * Close the connection
   */
  public close(): void {
    this.stopPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
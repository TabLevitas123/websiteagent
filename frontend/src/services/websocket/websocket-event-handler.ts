import { WebSocket, Server } from 'ws';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';
import { authenticate } from '@/middleware/auth';
import { MetricsService } from '@/services/metrics';
import { z } from 'zod';

interface ClientInfo {
  id: string;
  subscriptions: Set<string>;
  lastActivity: number;
  metadata: {
    userId?: string;
    ip?: string;
    userAgent?: string;
  };
}

interface WSMessage {
  type: string;
  id?: string;
  channel?: string;
  data?: any;
}

const MessageSchema = z.object({
  type: z.string(),
  id: z.string().optional(),
  channel: z.string().optional(),
  data: z.any().optional()
});

export class WebSocketEventHandler extends EventEmitter {
  private wss: Server;
  private redis: Redis;
  private metricsService: MetricsService;
  private clients: Map<WebSocket, ClientInfo>;
  private heartbeatInterval: NodeJS.Timeout | null;

  constructor(server: Server, redis: Redis, metricsService: MetricsService) {
    super();
    this.wss = server;
    this.redis = redis;
    this.metricsService = metricsService;
    this.clients = new Map();
    this.heartbeatInterval = null;

    this.setupWebSocketServer();
    this.startHeartbeat();
    
    logger.info('WebSocketEventHandler initialized');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      try {
        // Authenticate connection
        const token = this.extractToken(req);
        const user = await authenticate(token);

        // Initialize client info
        const clientInfo: ClientInfo = {
          id: this.generateClientId(),
          subscriptions: new Set(),
          lastActivity: Date.now(),
          metadata: {
            userId: user.id,
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          }
        };

        this.clients.set(ws, clientInfo);

        // Setup message handling
        ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(ws, data);
        });

        // Setup connection close handling
        ws.on('close', () => {
          this.handleClientDisconnect(ws);
        });

        // Setup error handling
        ws.on('error', (error: Error) => {
          this.handleClientError(ws, error);
        });

        // Send welcome message
        this.sendToClient(ws, {
          type: 'connected',
          data: {
            clientId: clientInfo.id,
            timestamp: Date.now()
          }
        });

        logger.info('Client connected', {
          clientId: clientInfo.id,
          userId: user.id,
          ip: req.socket.remoteAddress
        });

      } catch (error) {
        logger.error('Connection authentication failed', { error });
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private async handleMessage(ws: WebSocket, data: WebSocket.Data): Promise<void> {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    try {
      const message = MessageSchema.parse(JSON.parse(data.toString()));
      clientInfo.lastActivity = Date.now();

      switch (message.type) {
        case 'subscribe':
          await this.handleSubscribe(ws, clientInfo, message);
          break;
        case 'unsubscribe':
          await this.handleUnsubscribe(ws, clientInfo, message);
          break;
        case 'ping':
          this.handlePing(ws);
          break;
        default:
          logger.warn('Unknown message type', {
            clientId: clientInfo.id,
            type: message.type
          });
      }

    } catch (error) {
      logger.error('Message handling failed', {
        error,
        clientId: clientInfo.id
      });

      this.sendToClient(ws, {
        type: 'error',
        data: {
          message: 'Invalid message format',
          original: data.toString()
        }
      });
    }
  }

  private async handleSubscribe(
    ws: WebSocket,
    clientInfo: ClientInfo,
    message: WSMessage
  ): Promise<void> {
    if (!message.channel) return;

    try {
      // Add to client subscriptions
      clientInfo.subscriptions.add(message.channel);

      // Subscribe to Redis channel
      await this.redis.subscribe(message.channel);

      this.sendToClient(ws, {
        type: 'subscribed',
        channel: message.channel,
        data: { timestamp: Date.now() }
      });

      logger.debug('Client subscribed to channel', {
        clientId: clientInfo.id,
        channel: message.channel
      });

    } catch (error) {
      logger.error('Subscription failed', {
        error,
        clientId: clientInfo.id,
        channel: message.channel
      });

      this.sendToClient(ws, {
        type: 'error',
        data: {
          message: 'Subscription failed',
          channel: message.channel
        }
      });
    }
  }

  private async handleUnsubscribe(
    ws: WebSocket,
    clientInfo: ClientInfo,
    message: WSMessage
  ): Promise<void> {
    if (!message.channel) return;

    try {
      // Remove from client subscriptions
      clientInfo.subscriptions.delete(message.channel);

      // Check if any other clients are still subscribed
      let hasOtherSubscribers = false;
      for (const [_, info] of this.clients) {
        if (info.subscriptions.has(message.channel)) {
          hasOtherSubscribers = true;
          break;
        }
      }

      // Unsubscribe from Redis if no other subscribers
      if (!hasOtherSubscribers) {
        await this.redis.unsubscribe(message.channel);
      }

      this.sendToClient(ws, {
        type: 'unsubscribed',
        channel: message.channel,
        data: { timestamp: Date.now() }
      });

      logger.debug('Client unsubscribed from channel', {
        clientId: clientInfo.id,
        channel: message.channel
      });

    } catch (error) {
      logger.error('Unsubscribe failed', {
        error,
        clientId: clientInfo.id,
        channel: message.channel
      });
    }
  }

  private handlePing(ws: WebSocket): void {
    this.sendToClient(ws, {
      type: 'pong',
      data: { timestamp: Date.now() }
    });
  }

  private handleClientDisconnect(ws: WebSocket): void {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    // Cleanup subscriptions
    clientInfo.subscriptions.forEach(async (channel) => {
      let hasOtherSubscribers = false;
      for (const [otherWs, info] of this.clients) {
        if (otherWs !== ws && info.subscriptions.has(channel)) {
          hasOtherSubscribers = true;
          break;
        }
      }

      if (!hasOtherSubscribers) {
        await this.redis.unsubscribe(channel);
      }
    });

    // Remove client
    this.clients.delete(ws);

    logger.info('Client disconnected', {
      clientId: clientInfo.id,
      subscriptionCount: clientInfo.subscriptions.size
    });
  }

  private handleClientError(ws: WebSocket, error: Error): void {
    const clientInfo = this.clients.get(ws);
    logger.error('Client error', {
      error,
      clientId: clientInfo?.id
    });

    // Close connection on error
    ws.close(1011, 'Internal error');
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send message to client', { error });
      }
    }
  }

  private broadcast(message: WSMessage, channel?: string): void {
    this.clients.forEach((clientInfo, ws) => {
      if (!channel || clientInfo.subscriptions.has(channel)) {
        this.sendToClient(ws, message);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.clients.forEach((clientInfo, ws) => {
        // Check for stale connections
        if (now - clientInfo.lastActivity > 30000) {
          logger.warn('Closing stale connection', {
            clientId: clientInfo.id,
            lastActivity: clientInfo.lastActivity
          });
          ws.close(1000, 'Connection stale');
          return;
        }

        // Send heartbeat
        this.sendToClient(ws, {
          type: 'heartbeat',
          data: { timestamp: now }
        });
      });
    }, 15000);
  }

  private generateClientId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private extractToken(req: any): string {
    const auth = req.headers['authorization'];
    if (!auth) throw new Error('No authorization header');
    return auth.replace('Bearer ', '');
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach((_, ws) => {
      ws.close(1000, 'Server shutting down');
    });

    // Clear clients and subscriptions
    this.clients.clear();

    // Close Redis connection
    await this.redis.quit();
  }

  public getStats(): {
    clientCount: number;
    subscriptionCount: number;
    channels: string[];
  } {
    const channels = new Set<string>();
    this.clients.forEach(client => {
      client.subscriptions.forEach(channel => channels.add(channel));
    });

    return {
      clientCount: this.clients.size,
      subscriptionCount: channels.size,
      channels: Array.from(channels)
    };
  }
}

export default WebSocketEventHandler;
import { Server } from 'ws';
import { Redis } from 'ioredis';
import { logger } from '@/utils/logger';
import { MetricsService } from '@/services/metrics';
import { WebSocketEventHandler } from './WebSocketEventHandler';
import { WebSocketMetricsPublisher } from './WebSocketMetricsPublisher';
import { RateLimiter } from '@/utils/rateLimiter';

interface WebSocketManagerConfig {
  port: number;
  path: string;
  maxClients?: number;
  heartbeatInterval?: number;
  rateLimits?: {
    messages: number;
    subscriptions: number;
    timeWindow: number;
  };
}

export class WebSocketManager {
  private server: Server;
  private eventHandler: WebSocketEventHandler;
  private metricsPublisher: WebSocketMetricsPublisher;
  private redis: Redis;
  private rateLimiter: RateLimiter;
  private config: Required<WebSocketManagerConfig>;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    config: WebSocketManagerConfig,
    metricsService: MetricsService
  ) {
    this.config = {
      maxClients: 1000,
      heartbeatInterval: 30000,
      rateLimits: {
        messages: 100,
        subscriptions: 50,
        timeWindow: 60000
      },
      ...config
    };

    // Initialize Redis
    this.redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      redis: this.redis,
      prefix: 'ws_ratelimit:',
      maxRequests: this.config.rateLimits.messages,
      windowMs: this.config.rateLimits.timeWindow
    });

    // Initialize WebSocket server
    this.server = new Server({
      port: this.config.port,
      path: this.config.path,
      clientTracking: true,
      maxPayload: 100 * 1024, // 100KB
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10
      }
    });

    // Initialize event handler
    this.eventHandler = new WebSocketEventHandler(
      this.server,
      this.redis,
      metricsService
    );

    // Initialize metrics publisher
    this.metricsPublisher = new WebSocketMetricsPublisher(
      this.eventHandler,
      metricsService,
      this.redis
    );

    this.setupServerHandlers();
    this.startMetricsCollection();

    logger.info('WebSocketManager initialized', {
      port: this.config.port,
      path: this.config.path
    });
  }

  private setupServerHandlers(): void {
    // Handle new connections
    this.server.on('connection', (ws, req) => {
      // Check connection limits
      if (this.server.clients.size > this.config.maxClients) {
        ws.close(1013, 'Maximum connections reached');
        logger.warn('Connection rejected - max clients reached');
        return;
      }

      // Check rate limits
      const clientIp = req.socket.remoteAddress;
      if (clientIp && !this.rateLimiter.checkLimit(clientIp)) {
        ws.close(1013, 'Rate limit exceeded');
        logger.warn('Connection rejected - rate limit exceeded', { clientIp });
        return;
      }

      logger.info('New WebSocket connection', {
        ip: clientIp,
        userAgent: req.headers['user-agent'],
        protocol: req.headers['sec-websocket-protocol']
      });
    });

    // Handle server errors
    this.server.on('error', (error) => {
      logger.error('WebSocket server error', { error });
      this.handleServerError(error);
    });

    // Monitor server health
    setInterval(() => {
      this.checkServerHealth();
    }, 60000); // Every minute
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      try {
        const stats = this.getStats();
        this.metricsPublisher.publishMetrics({
          type: 'websocket_stats',
          timestamp: Date.now(),
          data: stats
        });
      } catch (error) {
        logger.error('Failed to collect metrics', { error });
      }
    }, 5000); // Every 5 seconds
  }

  private checkServerHealth(): void {
    const stats = this.getStats();
    const memoryUsage = process.memoryUsage();

    logger.info('Server health check', {
      ...stats,
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      uptime: process.uptime()
    });

    // Check for memory leaks
    if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      logger.warn('High memory usage detected');
      this.handleHighMemoryUsage();
    }
  }

  private handleServerError(error: Error): void {
    // Implement server-level error recovery
    if (this.isRecoverableError(error)) {
      this.attemptErrorRecovery();
    } else {
      this.initiateGracefulShutdown();
    }
  }

  private handleHighMemoryUsage(): void {
    // Implement memory management strategies
    this.gc();
    this.pruneInactiveConnections();
  }

  private isRecoverableError(error: Error): boolean {
    // Define recoverable error types
    const recoverableErrors = [
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT',
      'ECONNREFUSED'
    ];
    return recoverableErrors.includes((error as any).code);
  }

  private async attemptErrorRecovery(): Promise<void> {
    try {
      // Close all connections gracefully
      this.server.clients.forEach(client => {
        client.close(1012, 'Server recovering');
      });

      // Reset internal state
      await this.redis.flushdb();
      this.rateLimiter.reset();

      // Restart server
      this.server.close(() => {
        this.server = new Server({
          port: this.config.port,
          path: this.config.path
        });
        this.setupServerHandlers();
      });

      logger.info('Server recovery successful');
    } catch (error) {
      logger.error('Server recovery failed', { error });
      this.initiateGracefulShutdown();
    }
  }

  private async initiateGracefulShutdown(): Promise<void> {
    logger.info('Initiating graceful shutdown');

    try {
      // Stop accepting new connections
      this.server.close();

      // Close existing connections
      this.server.clients.forEach(client => {
        client.close(1001, 'Server shutting down');
      });

      // Clear intervals
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Close Redis connections
      await this.redis.quit();

      // Cleanup resources
      await this.eventHandler.close();
      await this.metricsPublisher.close();

      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }

  public getStats() {
    const eventHandlerStats = this.eventHandler.getStats();
    const metricsStats = this.metricsPublisher.getStats();

    return {
      ...eventHandlerStats,
      ...metricsStats,
      timestamp: Date.now(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  private gc(): void {
    if (global.gc) {
      global.gc();
    }
  }

  private pruneInactiveConnections(): void {
    let prunedCount = 0;
    const now = Date.now();

    this.server.clients.forEach(client => {
      const clientInfo = this.eventHandler.getClientInfo(client);
      if (clientInfo && now - clientInfo.lastActivity > 300000) { // 5 minutes
        client.close(1000, 'Inactive connection');
        prunedCount++;
      }
    });

    if (prunedCount > 0) {
      logger.info('Pruned inactive connections', { count: prunedCount });
    }
  }

  public async close(): Promise<void> {
    await this.initiateGracefulShutdown();
  }
}

export default WebSocketManager;
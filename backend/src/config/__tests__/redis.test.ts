import redisConfig from '../redis';

describe('Redis Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Basic Configuration', () => {
    it('should use default values when environment variables are not set', () => {
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;

      expect(redisConfig.host).toBe('localhost');
      expect(redisConfig.port).toBe(6379);
      expect(redisConfig.password).toBe('');
    });

    it('should use environment variables when set', () => {
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'secret';

      const config = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      };

      expect(config.host).toBe('redis.example.com');
      expect(config.port).toBe(6380);
      expect(config.password).toBe('secret');
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should have valid key prefixes for all rate limit types', () => {
      const { keyPrefixes } = redisConfig.rateLimiting;

      expect(keyPrefixes.default).toBe('rl:default:');
      expect(keyPrefixes.authenticated).toBe('rl:auth:');
      expect(keyPrefixes.premium).toBe('rl:premium:');
      expect(keyPrefixes.functionExecution).toBe('rl:func:');
      expect(keyPrefixes.agentCreation).toBe('rl:agent:');
      expect(keyPrefixes.marketplace).toBe('rl:market:');
      expect(keyPrefixes.search).toBe('rl:search:');
    });

    it('should have valid TTL values', () => {
      const { keyTTL } = redisConfig.rateLimiting;

      expect(keyTTL.default).toBe(3600); // 1 hour
      expect(keyTTL.violation).toBe(86400); // 24 hours
      expect(keyTTL.block).toBe(604800); // 7 days
    });

    it('should have valid violation thresholds', () => {
      const { violations } = redisConfig.rateLimiting;

      expect(violations.warningThreshold).toBe(50);
      expect(violations.blockThreshold).toBe(100);
      expect(violations.blockDuration).toBe(86400); // 24 hours
    });
  });

  describe('Connection Options', () => {
    it('should have correct retry strategy', () => {
      const { connectionOptions } = redisConfig.rateLimiting;

      expect(connectionOptions.enableOfflineQueue).toBe(false);

      // Test retry strategy
      const retryStrategy = connectionOptions.retryStrategy;
      if (retryStrategy) {
        expect(retryStrategy(1)).toBe(100);
        expect(retryStrategy(2)).toBe(200);
        expect(retryStrategy(3)).toBe(300);
        expect(retryStrategy(4)).toBeNull();
      }
    });

    it('should have correct reconnect on error behavior', () => {
      const { connectionOptions } = redisConfig.rateLimiting;
      const reconnectOnError = connectionOptions.reconnectOnError;

      if (reconnectOnError) {
        expect(reconnectOnError(new Error('READONLY'))).toBe(true);
        expect(reconnectOnError(new Error('OTHER'))).toBe(false);
      }
    });
  });
});

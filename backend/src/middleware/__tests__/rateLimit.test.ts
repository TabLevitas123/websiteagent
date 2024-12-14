import { Request, Response } from 'express';
import { createRateLimiter, dynamicRateLimit, rateLimitMonitor } from '../rateLimit';
import { MockRedis } from '../__mocks__/redis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => new MockRedis());
});

describe('Rate Limiting Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      ip: '127.0.0.1',
      user: undefined,
      headers: {},
      path: '/test',
      method: 'GET',
      socket: {
        remoteAddress: '127.0.0.1'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
      getHeader: jest.fn(),
      on: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within rate limit', async () => {
      const rateLimiter = createRateLimiter('default');
      await rateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', async () => {
      const rateLimiter = createRateLimiter('default');
      
      // Simulate exceeding rate limit
      for (let i = 0; i < 31; i++) {
        await rateLimiter(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Requests'
        })
      );
    });

    it('should set correct rate limit headers', async () => {
      const rateLimiter = createRateLimiter('default');
      await rateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': expect.any(Number),
          'X-RateLimit-Remaining': expect.any(Number),
          'X-RateLimit-Reset': expect.any(String)
        })
      );
    });
  });

  describe('dynamicRateLimit', () => {
    it('should apply different limits for different user tiers', async () => {
      // Test unauthenticated user
      await dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Tier': 'default'
        })
      );

      // Test authenticated user
      mockRequest.user = { address: '0x123', isPremium: false };
      await dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Tier': 'authenticated'
        })
      );

      // Test premium user
      mockRequest.user = { address: '0x123', isPremium: true };
      await dynamicRateLimit(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Tier': 'premium'
        })
      );
    });
  });

  describe('rateLimitMonitor', () => {
    it('should log rate limit events', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      // Mock response.on to trigger 'finish' event immediately
      mockResponse.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          callback();
        }
      });

      await rateLimitMonitor(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate_limit',
          path: '/test',
          method: 'GET'
        })
      );
    });

    it('should track violations when status is 429', async () => {
      mockResponse.statusCode = 429;
      mockResponse.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          callback();
        }
      });

      const consoleSpy = jest.spyOn(console, 'warn');

      await rateLimitMonitor(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Simulate multiple violations
      for (let i = 0; i < 101; i++) {
        await rateLimitMonitor(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded violation threshold')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Mock Redis error
      jest.spyOn(RateLimiterRedis.prototype, 'consume').mockRejectedValue(
        new Error('Redis connection error')
      );

      const rateLimiter = createRateLimiter('default');
      await rateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error'
        })
      );
    });

    it('should handle invalid rate limiter type', async () => {
      const invalidRateLimiter = createRateLimiter('invalid' as any);
      await invalidRateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('IP Address Detection', () => {
    it('should correctly identify client IP from X-Forwarded-For', async () => {
      const forwardedIp = '192.168.1.1';
      mockRequest.headers['x-forwarded-for'] = forwardedIp;

      const rateLimiter = createRateLimiter('default');
      await rateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify the rate limit key contains the forwarded IP
      expect(mockResponse.set).toHaveBeenCalled();
      const calls = (mockResponse.set as jest.Mock).mock.calls;
      const keyContainsIp = calls.some(call => 
        JSON.stringify(call).includes(forwardedIp)
      );
      expect(keyContainsIp).toBeTruthy();
    });

    it('should fall back to socket address when X-Forwarded-For is not present', async () => {
      const socketIp = '127.0.0.1';
      mockRequest.socket.remoteAddress = socketIp;
      delete mockRequest.headers['x-forwarded-for'];

      const rateLimiter = createRateLimiter('default');
      await rateLimiter(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      // Verify the rate limit key contains the socket IP
      expect(mockResponse.set).toHaveBeenCalled();
      const calls = (mockResponse.set as jest.Mock).mock.calls;
      const keyContainsIp = calls.some(call => 
        JSON.stringify(call).includes(socketIp)
      );
      expect(keyContainsIp).toBeTruthy();
    });
  });
});

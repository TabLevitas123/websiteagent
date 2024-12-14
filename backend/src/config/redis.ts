export default {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  // Redis configuration for rate limiting
  rateLimiting: {
    // Default connection options
    connectionOptions: {
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 100, 3000); // Exponential backoff
      },
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true; // Reconnect for READONLY errors
        }
        return false;
      },
    },
    
    // Key prefixes for different rate limit types
    keyPrefixes: {
      default: 'rl:default:',
      authenticated: 'rl:auth:',
      premium: 'rl:premium:',
      functionExecution: 'rl:func:',
      agentCreation: 'rl:agent:',
      marketplace: 'rl:market:',
      search: 'rl:search:',
    },

    // TTL for rate limit keys (in seconds)
    keyTTL: {
      default: 3600, // 1 hour
      violation: 86400, // 24 hours
      block: 604800, // 7 days
    },

    // Violation thresholds
    violations: {
      warningThreshold: 50,
      blockThreshold: 100,
      blockDuration: 86400, // 24 hours
    },
  },
};

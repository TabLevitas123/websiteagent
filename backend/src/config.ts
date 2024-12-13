import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  env: string;
  jwt: {
    secret: string;
    expiresIn: string;
    algorithm: string;
  };
  session: {
    maxAge: number;
    cleanupInterval: number;
  };
  metrics: {
    retentionPeriod: number;
    aggregationInterval: number;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    algorithm: process.env.JWT_ALGORITHM || 'HS256'
  },
  session: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
    cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '3600000', 10) // 1 hour
  },
  metrics: {
    retentionPeriod: parseInt(process.env.METRICS_RETENTION_PERIOD || '2592000000', 10), // 30 days
    aggregationInterval: parseInt(process.env.METRICS_AGGREGATION_INTERVAL || '300000', 10) // 5 minutes
  }
};

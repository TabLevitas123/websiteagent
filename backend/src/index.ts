import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { TokenManager } from './services/auth/token-manager';
import { MetricsService } from './services/metrics/metrics.service';
import { MetricsAggregationService } from './services/metrics/metrics-aggregation-service';
import { TimeSeriesService } from './services/metrics/time-series-service';
import { SessionManager } from './services/session-manager';
import { authenticate } from './middleware/auth';
import logger from './utils/logger';
import mongoose from 'mongoose';

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:27017/enterprise-monitoring')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize services
const tokenManager = new TokenManager({
  secret: config.jwt.secret,
  expiresIn: config.jwt.expiresIn,
  algorithm: config.jwt.algorithm
});

const metricsService = new MetricsService();
const metricsAggregationService = new MetricsAggregationService(metricsService);
const timeSeriesService = new TimeSeriesService();
const sessionManager = new SessionManager();

// Authentication middleware
app.use('/api', authenticate(tokenManager));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Import and use route handlers
import { authRoutes } from './routes/auth';
import { metricsRoutes } from './routes/metrics';
import { sessionRoutes } from './routes/session';

app.use('/api/auth', authRoutes(tokenManager));
app.use('/api/metrics', metricsRoutes(metricsService, metricsAggregationService, timeSeriesService));
app.use('/api/session', sessionRoutes(sessionManager));

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const port = config.port || 3000;
app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
});

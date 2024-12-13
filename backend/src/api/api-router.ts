import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { logger } from '@/utils/logger';
import { authenticate } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { errorHandler } from '@/middleware/error';
import { metricsRouter } from './routes/metrics';
import { alertsRouter } from './routes/alerts';
import { threatsRouter } from './routes/threats';
import { activitiesRouter } from './routes/activities';
import { tokenRouter } from './routes/tokens';
import { Types } from 'mongoose';

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// API Router setup
const apiRouter = Router();

// Security middleware
apiRouter.use(helmet());
apiRouter.use(cors(corsOptions));
apiRouter.use(express.json({ limit: '10mb' }));
apiRouter.use(limiter);

// Request logging
apiRouter.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip
    });
  });

  next();
});

// ID parameter validation
apiRouter.param('id', (req, res, next, id) => {
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  next();
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected routes
apiRouter.use('/metrics', authenticate, validateRequest, metricsRouter);
apiRouter.use('/alerts', authenticate, validateRequest, alertsRouter);
apiRouter.use('/threats', authenticate, validateRequest, threatsRouter);
apiRouter.use('/activities', authenticate, validateRequest, activitiesRouter);
apiRouter.use('/tokens', authenticate, validateRequest, tokenRouter);

// Error handling
apiRouter.use(errorHandler);

// 404 handler
apiRouter.use((req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Route not found',
    path: req.url
  });
});

export default apiRouter;
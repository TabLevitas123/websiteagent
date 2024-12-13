import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import logger from '../utils/logger';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest, validateQueryParams } from '../middleware/validation';
import { errorHandler } from '../middleware/error';
import metricsRouter from './routes/metrics';
import alertsRouter from './routes/alerts';
import threatsRouter from './routes/threats';
import activitiesRouter from './routes/activities';
import tokensRouter from './routes/tokens';

const router = express.Router();

// Global middleware
router.use(cors());
router.use(helmet());
router.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
router.use(limiter);

// Routes
router.use('/metrics', authenticate, metricsRouter);
router.use('/alerts', authenticate, alertsRouter);
router.use('/threats', authenticate, authorize(['admin']), threatsRouter);
router.use('/activities', authenticate, activitiesRouter);
router.use('/tokens', authenticate, tokensRouter);

// Error handling
router.use(errorHandler);

export default router;
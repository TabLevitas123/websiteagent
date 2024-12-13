import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error occurred:', error);

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errors: error.errors
    });
  }

  // Handle mongoose validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values((error as any).errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid authentication token'
    });
  }

  // Handle rate limit errors
  if (error.message === 'Rate limit exceeded') {
    return res.status(429).json({
      message: 'Too many requests, please try again later'
    });
  }

  // Default error
  res.status(500).json({
    message: 'Internal server error'
  });
}

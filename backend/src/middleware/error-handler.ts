import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

interface ErrorResponse {
  status: 'error';
  message: string;
  details?: any;
  stack?: string;
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error response
  const response: ErrorResponse = {
    status: 'error',
    message: 'Internal Server Error'
  };

  // Handle known errors
  if (err instanceof AppError) {
    response.message = err.message;
    if (err.details) {
      response.details = err.details;
    }

    // Only include stack trace for non-operational errors in development
    if (!err.isOperational && process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle validation errors (e.g., from Express-validator)
  if (err.name === 'ValidationError') {
    response.message = 'Validation Error';
    response.details = err.message;
    return res.status(400).json(response);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    response.message = 'Invalid token';
    return res.status(401).json(response);
  }

  if (err.name === 'TokenExpiredError') {
    response.message = 'Token expired';
    return res.status(401).json(response);
  }

  // Include stack trace in development mode for unknown errors
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Send generic error response for unknown errors
  res.status(500).json(response);
}

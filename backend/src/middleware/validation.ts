import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types';
import { ValidationFailedError } from '../utils/errors';
import logger from '../utils/logger';

export function validateRequest(schema: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req.body, { abortEarly: false });
      next();
    } catch (error: any) {
      logger.error('Validation error:', error);
      
      const errors: ValidationError[] = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      next(new ValidationFailedError('Validation failed', errors));
    }
  };
}

export function validateQueryParams(schema: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req.query, { abortEarly: false });
      next();
    } catch (error: any) {
      logger.error('Query validation error:', error);
      
      const errors: ValidationError[] = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      next(new ValidationFailedError('Query validation failed', errors));
    }
  };
}

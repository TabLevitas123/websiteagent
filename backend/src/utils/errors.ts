import { ValidationError } from '../types';

export class ApiError extends Error {
  statusCode: number;
  errors?: ValidationError[];

  constructor(message: string, statusCode: number = 500, errors?: ValidationError[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed', errors?: ValidationError[]) {
    super(message, 401, errors);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions', errors?: ValidationError[]) {
    super(message, 403, errors);
    this.name = 'AuthorizationError';
  }
}

export class ValidationFailedError extends ApiError {
  constructor(message: string = 'Validation failed', errors?: ValidationError[]) {
    super(message, 400, errors);
    this.name = 'ValidationFailedError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found', errors?: ValidationError[]) {
    super(message, 404, errors);
    this.name = 'NotFoundError';
  }
}

export class RateLimitExceededError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', errors?: ValidationError[]) {
    super(message, 429, errors);
    this.name = 'RateLimitExceededError';
  }
}

import { ValidationError } from '../types';
import { TokenInfo } from '../types';

export function validateRequired(value: any, field: string): ValidationError | null {
  if (value === undefined || value === null || value === '') {
    return {
      field,
      message: `${field} is required`
    };
  }
  return null;
}

export function validateString(value: any, field: string, minLength = 0, maxLength = Infinity): ValidationError | null {
  if (typeof value !== 'string') {
    return {
      field,
      message: `${field} must be a string`
    };
  }
  
  if (value.length < minLength) {
    return {
      field,
      message: `${field} must be at least ${minLength} characters long`
    };
  }
  
  if (value.length > maxLength) {
    return {
      field,
      message: `${field} must be no more than ${maxLength} characters long`
    };
  }
  
  return null;
}

export function validateNumber(value: any, field: string, min = -Infinity, max = Infinity): ValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field,
      message: `${field} must be a number`
    };
  }
  
  if (value < min) {
    return {
      field,
      message: `${field} must be at least ${min}`
    };
  }
  
  if (value > max) {
    return {
      field,
      message: `${field} must be no more than ${max}`
    };
  }
  
  return null;
}

export function validateEmail(email: string): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      field: 'email',
      message: 'Invalid email format'
    };
  }
  return null;
}

export function validateTokenData(data: Partial<TokenInfo>): void {
  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.length === 0)) {
    throw new Error('Token name must be a non-empty string');
  }

  if (data.symbol !== undefined && (typeof data.symbol !== 'string' || data.symbol.length === 0)) {
    throw new Error('Token symbol must be a non-empty string');
  }

  if (data.decimals !== undefined && (typeof data.decimals !== 'number' || data.decimals < 0 || data.decimals > 18)) {
    throw new Error('Token decimals must be a number between 0 and 18');
  }

  if (data.totalSupply !== undefined) {
    try {
      const supply = BigInt(data.totalSupply);
      if (supply < BigInt(0)) {
        throw new Error('Total supply must be a non-negative number');
      }
    } catch {
      throw new Error('Total supply must be a valid number string');
    }
  }

  if (data.metadata !== undefined && (typeof data.metadata !== 'object' || data.metadata === null)) {
    throw new Error('Token metadata must be an object');
  }

  if (data.status !== undefined && !['active', 'inactive'].includes(data.status)) {
    throw new Error('Token status must be either "active" or "inactive"');
  }
}

// API Service Types
export interface ApiServiceConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Session Types
export interface SessionConfig {
  maxSessions?: number;
  sessionTimeout?: number;
  inactivityTimeout?: number;
  cleanupInterval?: number;
}

export interface SessionMetadata {
  deviceId: string;
  userAgent: string;
  ipAddress: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  metadata: SessionMetadata;
}

// Token Types
export interface TokenConfig {
  apiBaseUrl: string;
  rpcUrl: string;
  network: string;
  privateKey: string;
  contractAddress: string;
  contractAbi: any[];
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface TokenInfo {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  owner: string;
  metadata?: Record<string, any>;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface TokenMetrics {
  holders: number;
  transactions: number;
  volume24h: string;
  price: string;
}

// Audit Types
export type AuditLevel = 'info' | 'warning' | 'critical';

export interface AuditConfig {
  logLevel: AuditLevel;
  retentionPeriod: number;
  maxEvents: number;
  alertThresholds: {
    warning: number;
    critical: number;
  };
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  level: AuditLevel;
  type: string;
  userId?: string;
  sessionId?: string;
  message: string;
  metadata?: Record<string, any>;
  hash: string;
}

export interface AuditMetrics {
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  events24h: {
    total: number;
    critical: number;
    warning: number;
  };
}

// Metric Types
export type MetricType = 
  | 'cpu_usage'
  | 'memory_usage'
  | 'disk_usage'
  | 'network_traffic'
  | 'request_count'
  | 'error_rate'
  | 'response_time'
  | 'active_users'
  | 'transaction_volume';

export interface Metric {
  id: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MetricsServiceConfig {
  retentionPeriod: number;
  aggregationInterval: number;
  maxDataPoints: number;
}

// Validation Error
export interface ValidationError {
  field: string;
  message: string;
}

// User Credentials
export interface UserCredentials {
  username: string;
  password: string;
  ip?: string;
  userAgent?: string;
}

// Auth Response
export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  session?: Session;
}

// Auth Event
export interface AuthEvent {
  type: 'login' | 'logout' | 'mfa' | 'password_reset';
  userId: string;
  success: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Retry Config
export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff?: boolean;
}

// Security Event
export interface SecurityEvent extends AuditEvent {
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  ipAddress?: string;
}

// Token Creation Params
export interface TokenCreationParams {
  name: string;
  symbol: string;
  initialSupply: string;
  decimals: number;
  owner: string;
}

// Authenticated Request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles: UserRole[];
  };
}

// API Error
export interface ApiError extends Error {
  statusCode?: number;
  errors?: ValidationError[];
}

// User Role
export type UserRole = 'admin' | 'user' | 'guest';

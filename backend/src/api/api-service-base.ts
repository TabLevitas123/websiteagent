import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '@/utils/logger';
import { RetryConfig } from '@/types';

interface ApiServiceConfig {
  baseURL: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  headers?: Record<string, string>;
}

interface RequestMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  endpoint: string;
  method: string;
}

export class ApiService {
  private axios: AxiosInstance;
  private retryConfig: RetryConfig;
  private metrics: RequestMetrics[] = [];

  constructor(config: ApiServiceConfig) {
    this.retryConfig = config.retryConfig || {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
    };

    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        const metrics: RequestMetrics = {
          startTime: Date.now(),
          endpoint: config.url || '',
          method: config.method?.toUpperCase() || 'GET',
        };
        this.metrics.push(metrics);

        logger.debug('API Request', {
          url: config.url,
          method: config.method,
          headers: config.headers,
        });

        return config;
      },
      (error) => {
        logger.error('API Request Error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        this.updateMetrics(response);
        return response;
      },
      async (error) => {
        const config = error.config as AxiosRequestConfig & { _retry?: number };
        
        // Update metrics for failed requests
        this.updateMetrics(error.response, true);

        // Implement retry logic
        if (this.shouldRetry(error, config)) {
          config._retry = (config._retry || 0) + 1;
          const delay = this.calculateRetryDelay(config._retry);
          
          logger.warn('Retrying failed request', {
            attempt: config._retry,
            delay,
            url: config.url,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.axios(config);
        }

        logger.error('API Response Error', {
          error,
          url: config?.url,
          method: config?.method,
          status: error.response?.status,
        });

        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any, config: AxiosRequestConfig & { _retry?: number }): boolean {
    // Don't retry if we've hit the max retries
    if ((config._retry || 0) >= this.retryConfig.maxRetries) {
      return false;
    }

    // Only retry on network errors or 5xx responses
    return !error.response || (error.response.status >= 500 && error.response.status <= 599);
  }

  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.retryConfig.baseDelay;
    const maxDelay = this.retryConfig.maxDelay;
    
    // Exponential backoff with jitter
    const expDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    const jitter = Math.random() * 0.1 * expDelay;
    
    return Math.floor(expDelay + jitter);
  }

  private updateMetrics(response: AxiosResponse | undefined, isError = false): void {
    const currentMetrics = this.metrics[this.metrics.length - 1];
    if (currentMetrics) {
      currentMetrics.endTime = Date.now();
      currentMetrics.duration = currentMetrics.endTime - currentMetrics.startTime;
      currentMetrics.statusCode = response?.status;

      logger.debug('Request Metrics', {
        endpoint: currentMetrics.endpoint,
        method: currentMetrics.method,
        duration: currentMetrics.duration,
        status: currentMetrics.statusCode,
        isError,
      });
    }
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.get<T>(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.post<T>(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.put<T>(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.delete<T>(url, config);
    return response.data;
  }

  public getMetrics(): RequestMetrics[] {
    return this.metrics;
  }

  public clearMetrics(): void {
    this.metrics = [];
  }
}

export default ApiService;
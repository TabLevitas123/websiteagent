import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiServiceConfig } from '../types';
import logger from '../utils/logger';

export class ApiService {
  protected client: AxiosInstance;
  protected config: ApiServiceConfig;
  protected retryCount: number = 0;

  constructor(config: ApiServiceConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (!error.config) {
          return Promise.reject(error);
        }

        if (this.retryCount >= this.config.retries) {
          this.retryCount = 0;
          return Promise.reject(error);
        }

        if (error.response?.status === 429 || (error.response?.status >= 500 && error.response?.status <= 599)) {
          this.retryCount++;
          const delay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
          logger.warn(`Retrying request (attempt ${this.retryCount}/${this.config.retries}) after ${delay}ms`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client(error.config);
        }

        return Promise.reject(error);
      }
    );
  }

  protected async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  protected async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  protected async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  protected async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  protected async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }
}

<<<<<<< SEARCH
export class ApiService {
  private readonly config: ApiServiceConfig;

  constructor(config: ApiServiceConfig) {
    this.config = {
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
=======
export class ApiService {
  private readonly config: ApiServiceConfig;
  private readonly rateLimiter: Map<string, RateLimitInfo> = new Map();

  constructor(config: ApiServiceConfig) {
    this.config = {
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      rateLimit: config.rateLimit || { windowMs: 60000, max: 100 },
      ...config
    };
>>>>>>> REPLACE

<<<<<<< SEARCH
  protected async setupInterceptors(instance: AxiosInstance): Promise<void> {
    instance.interceptors.response.use(
      response => response,
      async error => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }
        throw error;
      }
    );
  }
=======
  protected async setupInterceptors(instance: AxiosInstance): Promise<void> {
    instance.interceptors.request.use(async config => {
      const ip = config.headers['x-forwarded-for'] || 'unknown';
      if (!await this.checkRateLimit(ip)) {
        throw new Error('Rate limit exceeded');
      }
      return config;
    });

    instance.interceptors.response.use(
      response => response,
      async error => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }
        throw error;
      }
    );
  }

  private async checkRateLimit(ip: string): Promise<boolean> {
    const now = Date.now();
    const info = this.rateLimiter.get(ip) || { count: 0, resetAt: now + this.config.rateLimit.windowMs };
    
    if (now > info.resetAt) {
      info.count = 0;
      info.resetAt = now + this.config.rateLimit.windowMs;
    }

    if (info.count >= this.config.rateLimit.max) {
      return false;
    }

    info.count++;
    this.rateLimiter.set(ip, info);
    return true;
  }
>>>>>>> REPLACE

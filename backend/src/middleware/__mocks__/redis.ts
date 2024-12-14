// Mock Redis client for testing
export class MockRedis {
  private store: Map<string, any>;

  constructor() {
    this.store = new Map();
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: any, mode?: string, duration?: number): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const value = (this.store.get(key) || 0) + 1;
    this.store.set(key, value);
    return value;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }
}

export default MockRedis;

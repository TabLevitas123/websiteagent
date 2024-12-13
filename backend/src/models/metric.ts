import { Metric, MetricType } from '../types';

const VALID_METRIC_TYPES = [
  'cpu_usage',
  'memory_usage',
  'disk_usage',
  'network_traffic',
  'request_count',
  'error_rate',
  'response_time',
  'active_users',
  'transaction_volume'
] as const;

export class MetricModel implements Metric {
  id: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;

  constructor(data: Partial<Metric>) {
    this.id = data.id || crypto.randomUUID();
    this.type = data.type || 'cpu_usage';
    this.value = data.value || 0;
    this.timestamp = data.timestamp || new Date();
    this.metadata = data.metadata;
  }

  static validate(data: Partial<Metric>): void {
    if (!data.type || !VALID_METRIC_TYPES.includes(data.type as MetricType)) {
      throw new Error('Invalid metric type');
    }

    if (typeof data.value !== 'number') {
      throw new Error('Metric value must be a number');
    }

    if (data.timestamp && !(data.timestamp instanceof Date)) {
      throw new Error('Timestamp must be a valid Date object');
    }

    if (data.metadata && (typeof data.metadata !== 'object' || data.metadata === null)) {
      throw new Error('Metadata must be an object');
    }
  }

  toJSON(): Metric {
    return {
      id: this.id,
      type: this.type,
      value: this.value,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }
}

export { Metric, MetricType };

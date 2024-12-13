import mongoose, { Document, Schema } from 'mongoose';
import { logger } from '@/utils/logger';

export interface IMetric extends Document {
  type: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
  tags?: string[];
  source?: string;
}

const MetricSchema = new Schema<IMetric>({
  type: {
    type: String,
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Number,
    required: true,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: {
    type: [String],
    index: true,
    default: []
  },
  source: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes
MetricSchema.index({ type: 1, timestamp: 1 });
MetricSchema.index({ timestamp: 1, source: 1 });
MetricSchema.index({ tags: 1, timestamp: 1 });

// Ensure indexes are created
MetricSchema.on('index', (err) => {
  if (err) {
    logger.error('Error building indexes:', err);
  } else {
    logger.info('Indexes built successfully');
  }
});

// Pre-save middleware
MetricSchema.pre('save', function(next) {
  // Set default timestamp if not provided
  if (!this.timestamp) {
    this.timestamp = Date.now();
  }

  // Validate timestamp range
  if (this.timestamp > Date.now() + 60000) { // Allow 1 minute future timestamps
    const err = new Error('Timestamp cannot be in the future');
    logger.warn('Invalid timestamp:', {
      type: this.type,
      timestamp: this.timestamp
    });
    return next(err);
  }

  // Validate value range if metadata specifies limits
  if (this.metadata?.limits) {
    const { min, max } = this.metadata.limits;
    if (typeof min === 'number' && this.value < min) {
      const err = new Error(`Value below minimum limit: ${min}`);
      logger.warn('Value below limit:', {
        type: this.type,
        value: this.value,
        min
      });
      return next(err);
    }
    if (typeof max === 'number' && this.value > max) {
      const err = new Error(`Value above maximum limit: ${max}`);
      logger.warn('Value above limit:', {
        type: this.type,
        value: this.value,
        max
      });
      return next(err);
    }
  }

  next();
});

// Post-save middleware
MetricSchema.post('save', function(doc) {
  logger.debug('Metric saved:', {
    type: doc.type,
    value: doc.value,
    timestamp: doc.timestamp
  });
});

// Static methods
MetricSchema.statics.findByTimeRange = function(
  start: number,
  end: number,
  type?: string
): Promise<IMetric[]> {
  const query: any = {
    timestamp: { $gte: start, $lte: end }
  };

  if (type) {
    query.type = type;
  }

  return this.find(query).sort({ timestamp: 1 });
};

MetricSchema.statics.findByTypes = function(
  types: string[],
  limit = 1000
): Promise<IMetric[]> {
  return this.find({
    type: { $in: types }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

MetricSchema.statics.getTypes = function(): Promise<string[]> {
  return this.distinct('type');
};

MetricSchema.statics.deleteOlderThan = function(
  timestamp: number
): Promise<number> {
  return this.deleteMany({
    timestamp: { $lt: timestamp }
  }).then(result => result.deletedCount);
};

// Instance methods
MetricSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj._id;
  delete obj.createdAt;
  delete obj.updatedAt;
  return obj;
};

// Create model
export const MetricModel = mongoose.model<IMetric>('Metric', MetricSchema);

// Add hooks for monitoring
MetricModel.watch().on('change', (change) => {
  logger.debug('Metric collection changed:', {
    operationType: change.operationType,
    documentKey: change.documentKey
  });
});

export default MetricModel;
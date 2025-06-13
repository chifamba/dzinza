import mongoose, { Document, Schema } from 'mongoose';

export interface ISearchLog extends Document {
  userId: string;
  sessionId: string;
  query: string;
  type: 'general' | 'person' | 'record' | 'document' | 'location';
  filters: Record<string, any>;
  resultsCount: number;
  timestamp: Date;
  clickedResults: string[];
  duration?: number;
  userAgent?: string;
  ipAddress?: string;
}

const SearchLogSchema = new Schema<ISearchLog>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['general', 'person', 'record', 'document', 'location'],
    required: true,
    index: true
  },
  filters: {
    type: Schema.Types.Mixed,
    default: {}
  },
  resultsCount: {
    type: Number,
    default: 0,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  clickedResults: [{
    type: String
  }],
  duration: {
    type: Number, // in milliseconds
    min: 0
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true
});

// Compound indexes for analytics queries
SearchLogSchema.index({ userId: 1, timestamp: -1 });
SearchLogSchema.index({ type: 1, timestamp: -1 });
SearchLogSchema.index({ timestamp: -1, resultsCount: 1 });

// TTL index to automatically delete old logs after 2 years
SearchLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

SearchLogSchema.methods.toJSON = function() {
  const searchLog = this.toObject();
  delete searchLog.ipAddress; // Remove sensitive data from JSON output
  return searchLog;
};

export const SearchLog = mongoose.model<ISearchLog>('SearchLog', SearchLogSchema);

export interface ISearchCache extends Document {
  queryHash: string;
  userId: string;
  query: string;
  results: any;
  timestamp: Date;
  expiresAt: Date;
}

const SearchCacheSchema = new Schema<ISearchCache>({
  queryHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true
  },
  results: {
    type: Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

SearchCacheSchema.index({ userId: 1, timestamp: -1 });

export const SearchCache = mongoose.model<ISearchCache>('SearchCache', SearchCacheSchema);

export interface ISearchSuggestion extends Document {
  query: string;
  userId: string;
  count: number;
  lastUsed: Date;
  category: string;
  relevanceScore: number;
}

const SearchSuggestionSchema = new Schema<ISearchSuggestion>({
  query: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 1,
    min: 1
  },
  lastUsed: {
    type: Date,
    default: Date.now,
    index: true
  },
  category: {
    type: String,
    enum: ['person', 'location', 'date', 'occupation', 'general'],
    default: 'general',
    index: true
  },
  relevanceScore: {
    type: Number,
    default: 1,
    min: 0,
    max: 10
  }
}, {
  timestamps: true
});

// Compound indexes for suggestion queries
SearchSuggestionSchema.index({ userId: 1, query: 1 }, { unique: true });
SearchSuggestionSchema.index({ userId: 1, count: -1, lastUsed: -1 });
SearchSuggestionSchema.index({ query: 'text' });

// Static method to increment suggestion count
SearchSuggestionSchema.statics.incrementSuggestion = function(userId: string, query: string, category?: string) {
  return this.findOneAndUpdate(
    { userId, query },
    {
      $inc: { count: 1 },
      $set: { 
        lastUsed: new Date(),
        category: category || 'general'
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

export const SearchSuggestion = mongoose.model<ISearchSuggestion>('SearchSuggestion', SearchSuggestionSchema);

export interface IPopularSearch extends Document {
  query: string;
  count: number;
  category: string;
  lastUpdated: Date;
  trendingScore: number;
}

const PopularSearchSchema = new Schema<IPopularSearch>({
  query: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  count: {
    type: Number,
    default: 1,
    min: 1,
    index: true
  },
  category: {
    type: String,
    enum: ['person', 'location', 'date', 'occupation', 'general'],
    default: 'general',
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  trendingScore: {
    type: Number,
    default: 1,
    min: 0,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for popular search queries
PopularSearchSchema.index({ count: -1, trendingScore: -1 });
PopularSearchSchema.index({ category: 1, count: -1 });
PopularSearchSchema.index({ lastUpdated: -1 });

// Static method to update popular search
PopularSearchSchema.statics.updatePopularSearch = function(query: string, category?: string) {
  const now = new Date();
  const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  
  return this.findOneAndUpdate(
    { query },
    {
      $inc: { count: 1 },
      $set: {
        lastUpdated: now,
        category: category || 'general',
        trendingScore: daysSinceEpoch // Simple trending score based on recency
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

export const PopularSearch = mongoose.model<IPopularSearch>('PopularSearch', PopularSearchSchema);

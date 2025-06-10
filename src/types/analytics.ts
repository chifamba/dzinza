// src/types/analytics.ts

export interface SummaryAnalyticsData {
  totalUsers: number;
  newUsersLast7Days: number;
  activeUsersLast24Hours?: number; // Optional, as it was added in example
  totalFamilyTrees: number;
  totalEvents: number;
  totalComments: number;
  totalMediaItems?: number; // Optional
  lastUpdatedAt: string; // ISO date string
}

export interface TrendDataPoint {
  date: string; // Typically in 'YYYY-MM-DD' format from backend for easy labeling
  count: number;
}

export type TrendPeriod = 'daily' | 'weekly' | 'monthly';
export type ContentTrendType = 'events' | 'comments' | 'persons' | 'trees';

export interface TrendsDataResponse {
  period: TrendPeriod;
  startDate: string; // ISO date string (or YYYY-MM-DD)
  endDate: string;   // ISO date string (or YYYY-MM-DD)
  dataPoints: TrendDataPoint[];
  contentType?: ContentTrendType; // Only for content trends
}

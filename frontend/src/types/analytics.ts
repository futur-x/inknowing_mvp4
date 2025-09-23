/**
 * Analytics Types and Interfaces
 */

export interface TimeRange {
  start_date: string;
  end_date: string;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface OverviewMetrics {
  total_users: number;
  active_users: number;
  new_users: number;
  total_books: number;
  total_dialogues: number;
  total_revenue: number;
  active_subscriptions: number;
  avg_session_duration: number;
  user_growth_rate: number;
  revenue_growth_rate: number;
  timestamp: string;
}

export interface UserGrowthData {
  date: string;
  new_users: number;
  active_users: number;
}

export interface RetentionRates {
  day_1: number;
  day_7: number;
  day_14: number;
  day_30: number;
}

export interface ActivityDistribution {
  level: string;
  count: number;
}

export interface UserSegment {
  segment: string;
  count: number;
  avg_dialogues: number;
}

export interface UserJourneyStage {
  stage: string;
  users: number;
  rate: number;
}

export interface UserAnalytics {
  user_growth: UserGrowthData[];
  retention_rates: RetentionRates;
  activity_distribution: ActivityDistribution[];
  user_segments: UserSegment[];
  behavior_patterns: any[];
  user_journey_funnel: UserJourneyStage[];
}

export interface PopularBook {
  id: number;
  title: string;
  author: string;
  dialogue_count: number;
  avg_rating: number;
}

export interface ContentQualityScore {
  book_id: number;
  title: string;
  score: number;
  sessions: number;
}

export interface DialogueTopic {
  topic: string;
  count: number;
}

export interface EngagementMetrics {
  total_dialogues: number;
  avg_messages_per_session: number;
  completion_rate: number;
  repeat_usage_rate: number;
}

export interface RecommendationEffectiveness {
  click_through_rate: number;
  conversion_rate: number;
  accuracy_score: number;
}

export interface ContentAnalytics {
  popular_books: PopularBook[];
  content_quality_scores: ContentQualityScore[];
  dialogue_topics: DialogueTopic[];
  keyword_cloud: any[];
  recommendation_effectiveness: RecommendationEffectiveness;
  engagement_metrics: EngagementMetrics;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  total: number;
}

export interface ConversionRates {
  overall: number;
  trial_to_paid: number;
  checkout_completion: number;
}

export interface RevenueForecast {
  date: string;
  projected_revenue: number;
  confidence_lower: number;
  confidence_upper: number;
}

export interface SubscriptionMetrics {
  active_subscriptions: number;
  new_subscriptions: number;
  churned_subscriptions: number;
  churn_rate: number;
  mrr: number;
}

export interface RevenueAnalytics {
  revenue_trends: RevenueTrend[];
  payment_methods: PaymentMethodData[];
  conversion_rates: ConversionRates;
  arpu: number;
  arppu: number;
  revenue_forecast: RevenueForecast[];
  subscription_metrics: SubscriptionMetrics;
}

export interface ResponseTimeDistribution {
  range: string;
  count: number;
}

export interface AccuracyMetrics {
  success_rate: number;
  relevance_score: number;
  coherence_score: number;
  factual_accuracy: number;
}

export interface TokenUsage {
  date: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface CostAnalysis {
  total_tokens: number;
  total_cost: number;
  avg_cost_per_request: number;
  cost_per_user: number;
}

export interface ModelPerformance {
  model: string;
  avg_response_time: number;
  request_count: number;
  success_rate: number;
}

export interface ErrorRates {
  overall_error_rate: number;
  timeout_rate: number;
  rate_limit_errors: number;
  api_errors: number;
}

export interface AIPerformanceAnalytics {
  response_time_distribution: ResponseTimeDistribution[];
  accuracy_metrics: AccuracyMetrics;
  token_usage: TokenUsage[];
  cost_analysis: CostAnalysis;
  model_performance: ModelPerformance[];
  error_rates: ErrorRates;
}

export interface CustomReportRequest {
  report_type: string;
  metrics: string[];
  filters: Record<string, any>;
  time_range: TimeRange;
  group_by?: string[];
  order_by?: string;
  limit?: number;
}

export interface ExportRequest {
  report_type: string;
  format: 'csv' | 'excel' | 'json';
  time_range: TimeRange;
  include_raw_data: boolean;
}

export type TimePeriod = 'day' | 'week' | 'month' | 'year';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}
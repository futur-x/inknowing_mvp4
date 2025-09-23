"""
Monitoring related schemas
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field

from backend.models.monitoring import AlertSeverity, AlertType, AlertStatus


# ==================== Real-time Metrics Schemas ====================
class RealTimeMetrics(BaseModel):
    """Real-time system metrics"""
    online_users: int = Field(..., description="Currently online users")
    active_dialogues: int = Field(..., description="Active dialogue sessions")
    api_health: Dict[str, Dict[str, Any]] = Field(..., description="API health status by service")
    system_load: Optional[float] = Field(None, description="System load percentage")
    memory_usage: Optional[float] = Field(None, description="Memory usage percentage")
    database_connections: Optional[int] = Field(None, description="Active database connections")


class TodayStats(BaseModel):
    """Today's statistics"""
    new_users: int = Field(..., description="New users today")
    total_dialogues: int = Field(..., description="Total dialogues today")
    new_books: int = Field(..., description="New books added today")
    api_cost: float = Field(..., description="API costs today")
    revenue: float = Field(..., description="Revenue today")
    upload_count: int = Field(0, description="Books uploaded today")
    error_count: int = Field(0, description="API errors today")


class TrendingData(BaseModel):
    """Trending data"""
    top_books: List[Dict[str, Any]] = Field(..., description="Most popular books")
    top_questions: List[Dict[str, Any]] = Field(..., description="Most asked questions")
    popular_categories: List[Dict[str, Any]] = Field(default_factory=list, description="Popular book categories")


class EnhancedDashboardStats(BaseModel):
    """Enhanced dashboard statistics following API specification"""
    real_time: RealTimeMetrics
    today: TodayStats
    trending: TrendingData


# ==================== Cost Statistics Schemas ====================
class CostBreakdown(BaseModel):
    """Cost breakdown item"""
    category: str = Field(..., description="Cost category (model, feature, user_tier)")
    cost: float = Field(..., description="Cost amount")
    percentage: float = Field(..., description="Percentage of total cost")
    count: int = Field(..., description="Number of requests/operations")


class CostTrend(BaseModel):
    """Cost trend data point"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    cost: float = Field(..., description="Cost for that date")


class CostProjection(BaseModel):
    """Cost projection data"""
    estimated_monthly: float = Field(..., description="Estimated monthly cost")
    budget_status: str = Field(..., description="Budget status: under_budget, on_track, over_budget")
    current_burn_rate: float = Field(0.0, description="Daily burn rate")
    days_until_budget_exceeded: Optional[int] = Field(None, description="Days until budget is exceeded")


class EnhancedCostStatistics(BaseModel):
    """Enhanced cost statistics following API specification"""
    period: str = Field(..., description="Time period")
    total_cost: float = Field(..., description="Total cost for period")
    breakdown: List[CostBreakdown] = Field(..., description="Cost breakdown")
    trend: List[CostTrend] = Field(..., description="Cost trend data")
    projection: CostProjection = Field(..., description="Cost projections")


# ==================== Dialogue Statistics Schemas ====================
class DialogueBreakdown(BaseModel):
    """Dialogue statistics breakdown"""
    category: str = Field(..., description="Breakdown category")
    count: int = Field(..., description="Number of dialogues")
    average_messages: int = Field(..., description="Average messages per dialogue")
    average_duration: int = Field(..., description="Average duration in seconds")
    satisfaction_score: Optional[float] = Field(None, description="Average satisfaction score")


class SatisfactionData(BaseModel):
    """User satisfaction data"""
    average_rating: float = Field(..., description="Average user rating")
    feedback_count: int = Field(..., description="Number of feedback entries")
    response_rate: float = Field(0.0, description="Feedback response rate percentage")


class EnhancedDialogueStatistics(BaseModel):
    """Enhanced dialogue statistics following API specification"""
    period: str = Field(..., description="Time period")
    total_dialogues: int = Field(..., description="Total dialogue sessions")
    unique_users: int = Field(..., description="Unique users with dialogues")
    breakdown: List[DialogueBreakdown] = Field(..., description="Dialogue breakdown")
    satisfaction: SatisfactionData = Field(..., description="User satisfaction metrics")


# ==================== System Alert Schemas ====================
class SystemAlertCreate(BaseModel):
    """Create system alert request"""
    severity: AlertSeverity = Field(..., description="Alert severity")
    type: AlertType = Field(..., description="Alert type")
    message: str = Field(..., min_length=1, max_length=500, description="Alert message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    source: Optional[str] = Field(None, max_length=100, description="Alert source")


class SystemAlertUpdate(BaseModel):
    """Update system alert request"""
    status: Optional[AlertStatus] = Field(None, description="New alert status")
    resolution_notes: Optional[str] = Field(None, max_length=1000, description="Resolution notes")


class SystemAlertResponse(BaseModel):
    """System alert response"""
    id: str = Field(..., description="Alert ID")
    severity: AlertSeverity = Field(..., description="Alert severity")
    type: AlertType = Field(..., description="Alert type")
    message: str = Field(..., description="Alert message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    status: AlertStatus = Field(..., description="Alert status")
    source: Optional[str] = Field(None, description="Alert source")
    created_at: datetime = Field(..., description="Creation timestamp")
    acknowledged_at: Optional[datetime] = Field(None, description="Acknowledgment timestamp")
    acknowledged_by: Optional[str] = Field(None, description="Acknowledged by admin")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolved_by: Optional[str] = Field(None, description="Resolved by admin")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")

    class Config:
        orm_mode = True


class AlertsListResponse(BaseModel):
    """Alerts list response"""
    alerts: List[SystemAlertResponse] = Field(..., description="List of alerts")
    pagination: Optional[Dict[str, Any]] = Field(None, description="Pagination information")


# ==================== API Health Monitoring Schemas ====================
class ServiceHealthStatus(BaseModel):
    """Individual service health status"""
    status: str = Field(..., description="Health status: healthy, degraded, down")
    latency: float = Field(..., description="Response latency in milliseconds")
    error_rate: float = Field(0.0, description="Error rate percentage")
    last_check: datetime = Field(..., description="Last health check timestamp")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional health details")


class SystemHealthResponse(BaseModel):
    """System health overview response"""
    overall_status: str = Field(..., description="Overall system health")
    services: Dict[str, ServiceHealthStatus] = Field(..., description="Individual service health")
    timestamp: datetime = Field(..., description="Health check timestamp")


# ==================== Metrics Collection Schemas ====================
class MetricPoint(BaseModel):
    """Single metric data point"""
    metric_name: str = Field(..., description="Metric name")
    value: float = Field(..., description="Metric value")
    timestamp: datetime = Field(..., description="Metric timestamp")
    tags: Optional[Dict[str, str]] = Field(None, description="Metric tags")


class MetricsCollectionRequest(BaseModel):
    """Request to collect multiple metrics"""
    metrics: List[MetricPoint] = Field(..., description="List of metrics to collect")
    source: Optional[str] = Field(None, description="Metrics source")


class MetricsQueryRequest(BaseModel):
    """Request to query metrics"""
    metric_names: List[str] = Field(..., description="Metric names to query")
    start_time: datetime = Field(..., description="Query start time")
    end_time: datetime = Field(..., description="Query end time")
    tags: Optional[Dict[str, str]] = Field(None, description="Filter by tags")
    aggregation: Optional[str] = Field("avg", description="Aggregation method: avg, sum, min, max")


class MetricsQueryResponse(BaseModel):
    """Metrics query response"""
    metric_name: str = Field(..., description="Metric name")
    data_points: List[Dict[str, Any]] = Field(..., description="Time-series data points")
    aggregation: str = Field(..., description="Applied aggregation method")
    total_points: int = Field(..., description="Total data points")
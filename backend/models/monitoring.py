"""
Monitoring related models
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from uuid import uuid4

from sqlmodel import Field, SQLModel, Column, JSON
from sqlalchemy.sql import func


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Alert types"""
    API_FAILURE = "api_failure"
    HIGH_COST = "high_cost"
    USER_ISSUE = "user_issue"
    SYSTEM_PERFORMANCE = "system_performance"
    QUOTA_EXCEEDED = "quota_exceeded"
    MODEL_FAILURE = "model_failure"
    DATABASE_ISSUE = "database_issue"


class AlertStatus(str, Enum):
    """Alert status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class SystemAlert(SQLModel, table=True):
    """System alert model for persistent storage"""
    __tablename__ = "system_alerts"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Alert UUID"
    )
    severity: AlertSeverity = Field(
        index=True,
        description="Alert severity level"
    )
    type: AlertType = Field(
        index=True,
        description="Alert type/category"
    )
    message: str = Field(
        max_length=500,
        description="Alert message"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional alert details"
    )
    status: AlertStatus = Field(
        default=AlertStatus.ACTIVE,
        index=True,
        description="Alert status"
    )
    source: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Alert source (e.g., module, service)"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="Alert creation time"
    )
    acknowledged_at: Optional[datetime] = Field(
        default=None,
        description="Alert acknowledgment time"
    )
    acknowledged_by: Optional[str] = Field(
        default=None,
        description="Admin who acknowledged the alert"
    )
    resolved_at: Optional[datetime] = Field(
        default=None,
        description="Alert resolution time"
    )
    resolved_by: Optional[str] = Field(
        default=None,
        description="Admin who resolved the alert"
    )
    resolution_notes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Resolution notes"
    )

    class Config:
        arbitrary_types_allowed = True


class SystemMetric(SQLModel, table=True):
    """System metrics for time-series monitoring data"""
    __tablename__ = "system_metrics"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Metric UUID"
    )
    metric_name: str = Field(
        index=True,
        max_length=100,
        description="Metric name (e.g., api_latency, active_users)"
    )
    metric_type: str = Field(
        max_length=50,
        description="Metric type (gauge, counter, histogram)"
    )
    value: float = Field(
        description="Metric value"
    )
    tags: Optional[Dict[str, str]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Metric tags/labels"
    )
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="Metric timestamp"
    )
    source: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Metric source"
    )

    class Config:
        arbitrary_types_allowed = True


class ApiHealthCheck(SQLModel, table=True):
    """API health check results"""
    __tablename__ = "api_health_checks"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Health check UUID"
    )
    service_name: str = Field(
        index=True,
        max_length=100,
        description="Service name"
    )
    endpoint: str = Field(
        max_length=255,
        description="Endpoint being checked"
    )
    status: str = Field(
        max_length=50,
        description="Health status (healthy, degraded, down)"
    )
    response_time: float = Field(
        description="Response time in milliseconds"
    )
    error_message: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Error message if unhealthy"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional health check details"
    )
    checked_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="Health check timestamp"
    )

    class Config:
        arbitrary_types_allowed = True
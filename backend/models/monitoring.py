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


class LogLevel(str, Enum):
    """Log severity levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SystemLog(SQLModel, table=True):
    """System logs for application events"""
    __tablename__ = "system_logs"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Log UUID"
    )
    level: LogLevel = Field(
        index=True,
        description="Log level"
    )
    message: str = Field(
        description="Log message"
    )
    source: str = Field(
        max_length=100,
        index=True,
        description="Log source module"
    )
    user_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Associated user ID if applicable"
    )
    request_id: Optional[str] = Field(
        default=None,
        index=True,
        description="Request ID for tracing"
    )
    log_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Additional log metadata"
    )
    stack_trace: Optional[str] = Field(
        default=None,
        description="Stack trace for errors"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="Log creation timestamp"
    )

    class Config:
        arbitrary_types_allowed = True


class AlertRule(SQLModel, table=True):
    """Alert rules configuration"""
    __tablename__ = "alert_rules"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Rule UUID"
    )
    name: str = Field(
        unique=True,
        max_length=100,
        description="Rule name"
    )
    description: str = Field(
        max_length=500,
        description="Rule description"
    )
    metric_name: str = Field(
        max_length=100,
        description="Metric to monitor"
    )
    condition: str = Field(
        max_length=50,
        description="Condition (greater_than, less_than, equals)"
    )
    threshold: float = Field(
        description="Threshold value"
    )
    duration: int = Field(
        default=60,
        description="Duration in seconds before triggering"
    )
    severity: AlertSeverity = Field(
        description="Alert severity when triggered"
    )
    enabled: bool = Field(
        default=True,
        index=True,
        description="Rule enabled status"
    )
    notification_channels: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Notification configuration"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Rule creation time"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Rule last update time"
    )

    class Config:
        arbitrary_types_allowed = True


class MonitoringAuditLog(SQLModel, table=True):
    """Audit log for tracking monitoring actions"""
    __tablename__ = "monitoring_audit_logs"

    id: str = Field(
        default_factory=lambda: str(uuid4()),
        primary_key=True,
        description="Audit log UUID"
    )
    admin_id: str = Field(
        index=True,
        description="Admin user ID"
    )
    action: str = Field(
        max_length=100,
        index=True,
        description="Action performed"
    )
    resource_type: str = Field(
        max_length=50,
        description="Resource type affected"
    )
    resource_id: Optional[str] = Field(
        default=None,
        description="Resource ID affected"
    )
    changes: Optional[Dict[str, Any]] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Changes made"
    )
    ip_address: Optional[str] = Field(
        default=None,
        max_length=45,
        description="Client IP address"
    )
    user_agent: Optional[str] = Field(
        default=None,
        max_length=500,
        description="User agent string"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="Action timestamp"
    )

    class Config:
        arbitrary_types_allowed = True
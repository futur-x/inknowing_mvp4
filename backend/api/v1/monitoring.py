"""
Monitoring API endpoints
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
import asyncio
import json

from backend.config.database import get_db

# 创建get_session别名以保持兼容性
get_session = get_db
from backend.core.auth import require_admin

# 创建别名以保持兼容性
get_current_admin_user = require_admin
from backend.models.admin import Admin
from backend.models.monitoring import (
    SystemMetric, ApiHealthCheck, SystemLog, LogLevel,
    SystemAlert, AlertSeverity, AlertStatus, AlertType,
    AlertRule, MonitoringAuditLog
)
from backend.services.monitoring_collector import MonitoringCollector, MetricsAggregator
from backend.services.logging_service import logging_service, log_streamer
from backend.services.alert_service import alert_service

router = APIRouter(prefix="/admin/monitoring", tags=["Admin - Monitoring"])


# Request/Response models
class HealthStatusResponse(BaseModel):
    """System health status response"""
    status: str = Field(description="Overall health status")
    timestamp: str = Field(description="Check timestamp")
    services: Dict[str, Dict[str, Any]] = Field(description="Service-specific health data")
    metrics: Dict[str, Any] = Field(description="Key health metrics")


class MetricsResponse(BaseModel):
    """Real-time metrics response"""
    timestamp: str = Field(description="Metrics timestamp")
    metrics: Dict[str, Any] = Field(description="Current metric values")
    qps: float = Field(description="Queries per second")
    active_connections: int = Field(description="Active WebSocket connections")


class LogEntry(BaseModel):
    """Log entry model"""
    id: str
    level: str
    message: str
    source: str
    user_id: Optional[str]
    request_id: Optional[str]
    metadata: Optional[Dict[str, Any]]
    created_at: str


class LogsResponse(BaseModel):
    """Logs response model"""
    logs: List[LogEntry]
    total: int
    page: int
    page_size: int


class AlertResponse(BaseModel):
    """Alert response model"""
    id: str
    severity: str
    type: str
    message: str
    status: str
    created_at: str
    acknowledged_at: Optional[str]
    resolved_at: Optional[str]
    details: Optional[Dict[str, Any]]


class AlertRuleRequest(BaseModel):
    """Alert rule creation request"""
    name: str = Field(max_length=100)
    description: str = Field(max_length=500)
    metric_name: str = Field(max_length=100)
    condition: str = Field(pattern="^(greater_than|less_than|equals)$")
    threshold: float
    duration: int = Field(default=60, ge=10, le=3600)
    severity: AlertSeverity
    notification_channels: Optional[Dict[str, Any]] = None


class DiagnosticsResponse(BaseModel):
    """System diagnostics response"""
    timestamp: str
    database: Dict[str, Any]
    redis: Optional[Dict[str, Any]]
    slow_queries: List[Dict[str, Any]]
    error_summary: Dict[str, Any]
    resource_usage: Dict[str, Any]


# Health monitoring endpoints
@router.get("/health", response_model=HealthStatusResponse)
async def get_system_health(
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get comprehensive system health status"""
    try:
        collector = MonitoringCollector()
        health_data = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {},
            "metrics": {}
        }

        # Check database health
        db_health = await collector.perform_health_check(session, "database", "postgresql://localhost")
        health_data["services"]["database"] = db_health

        # Check Redis health (if available)
        redis_health = await collector.perform_health_check(session, "redis", "redis://localhost")
        health_data["services"]["redis"] = redis_health

        # Get current system metrics
        current_metrics = await MetricsAggregator.get_current_metrics(session)

        # Extract key metrics for health status
        health_data["metrics"] = {
            "cpu_usage": current_metrics.get("system.cpu.usage", {}).get("value", 0),
            "memory_usage": current_metrics.get("system.memory.usage", {}).get("value", 0),
            "disk_usage": current_metrics.get("system.disk.usage", {}).get("value", 0),
            "database_responsive": current_metrics.get("database.responsive", {}).get("value", 1),
            "error_rate": current_metrics.get("api.error_rate", {}).get("value", 0)
        }

        # Determine overall health status
        if any(s["status"] == "down" for s in health_data["services"].values()):
            health_data["status"] = "critical"
        elif health_data["metrics"]["error_rate"] > 10:
            health_data["status"] = "degraded"
        elif health_data["metrics"]["cpu_usage"] > 80 or health_data["metrics"]["memory_usage"] > 80:
            health_data["status"] = "warning"

        return HealthStatusResponse(**health_data)

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=MetricsResponse)
async def get_real_time_metrics(
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get real-time performance metrics"""
    try:
        # Get current metrics
        current_metrics = await MetricsAggregator.get_current_metrics(session)

        # Calculate QPS
        qps = await MetricsAggregator.calculate_qps(session)

        return MetricsResponse(
            timestamp=datetime.utcnow().isoformat(),
            metrics=current_metrics,
            qps=qps,
            active_connections=0  # Will be updated when WebSocket is implemented
        )

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/history")
async def get_metrics_history(
    metric_name: str = Query(..., description="Metric name to retrieve"),
    hours: int = Query(24, ge=1, le=168, description="Hours of history"),
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get historical metrics data for charting"""
    try:
        history = await MetricsAggregator.get_metrics_history(session, metric_name, hours)
        return {
            "metric_name": metric_name,
            "data": history,
            "time_range": f"Last {hours} hours"
        }

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


# Logging endpoints
@router.get("/logs", response_model=LogsResponse)
async def get_system_logs(
    level: Optional[LogLevel] = Query(None, description="Filter by log level"),
    source: Optional[str] = Query(None, description="Filter by source module"),
    search: Optional[str] = Query(None, description="Search term"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=10, le=200, description="Items per page"),
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get system logs with filtering and pagination"""
    try:
        offset = (page - 1) * page_size

        if search:
            logs = await logging_service.search_logs(session, search, page_size)
        else:
            logs = await logging_service.get_logs(
                session, level, source, None, start_time, end_time, page_size, offset
            )

        # Get total count for pagination
        total = len(logs)  # Simplified, should query total from DB

        return LogsResponse(
            logs=[
                LogEntry(
                    id=log.id,
                    level=log.level.value,
                    message=log.message,
                    source=log.source,
                    user_id=log.user_id,
                    request_id=log.request_id,
                    metadata=log.metadata,
                    created_at=log.created_at.isoformat()
                )
                for log in logs
            ],
            total=total,
            page=page,
            page_size=page_size
        )

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/logs/stream")
async def stream_logs(
    websocket: WebSocket,
    session: AsyncSession = Depends(get_session)
):
    """WebSocket endpoint for real-time log streaming"""
    await websocket.accept()
    stream_id = f"ws_{id(websocket)}"

    try:
        log_streamer.start_stream(stream_id)

        while True:
            # Receive filter parameters from client
            data = await websocket.receive_text()
            params = json.loads(data)

            level = LogLevel(params.get("level")) if params.get("level") else None
            source = params.get("source")

            # Stream logs
            async for logs_batch in log_streamer.stream_logs(session, stream_id, level, source):
                await websocket.send_json({"logs": logs_batch})

    except WebSocketDisconnect:
        log_streamer.stop_stream(stream_id)
    except Exception as e:
        await websocket.close(code=1000)
        log_streamer.stop_stream(stream_id)


@router.get("/audit-logs")
async def get_audit_logs(
    admin_id: Optional[str] = Query(None, description="Filter by admin ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get audit logs for admin actions"""
    try:
        offset = (page - 1) * page_size
        logs = await logging_service.get_audit_logs(
            session, admin_id, action, resource_type, start_time, end_time, page_size, offset
        )

        return {
            "audit_logs": [
                {
                    "id": log.id,
                    "admin_id": log.admin_id,
                    "action": log.action,
                    "resource_type": log.resource_type,
                    "resource_id": log.resource_id,
                    "changes": log.changes,
                    "ip_address": log.ip_address,
                    "created_at": log.created_at.isoformat()
                }
                for log in logs
            ],
            "page": page,
            "page_size": page_size
        }

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logs/export")
async def export_logs(
    level: Optional[LogLevel] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    format: str = Query("json", pattern="^(json|csv)$"),
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Export logs for backup or analysis"""
    try:
        logs = await logging_service.get_logs(
            session, level, None, None, start_time, end_time, limit=10000
        )

        # Create audit log for export action
        await logging_service.create_audit_log(
            session,
            admin.id,
            "export_logs",
            "system_logs",
            metadata={
                "level": level.value if level else "all",
                "count": len(logs),
                "format": format
            }
        )
        await session.commit()

        if format == "csv":
            # Convert to CSV format (simplified)
            csv_data = "timestamp,level,source,message\n"
            for log in logs:
                csv_data += f"{log.created_at},{log.level},{log.source},{log.message}\n"
            return {"data": csv_data, "format": "csv"}
        else:
            return {
                "data": [
                    {
                        "timestamp": log.created_at.isoformat(),
                        "level": log.level.value,
                        "source": log.source,
                        "message": log.message,
                        "metadata": log.metadata
                    }
                    for log in logs
                ],
                "format": "json"
            }

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


# Alert management endpoints
@router.get("/alerts")
async def get_alerts(
    status: Optional[AlertStatus] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    start_time: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get system alerts with filtering"""
    try:
        offset = (page - 1) * page_size
        alerts = await alert_service.get_alerts(
            session, status, severity, None, start_time, page_size, offset
        )

        return {
            "alerts": [
                AlertResponse(
                    id=alert.id,
                    severity=alert.severity.value,
                    type=alert.type.value,
                    message=alert.message,
                    status=alert.status.value,
                    created_at=alert.created_at.isoformat(),
                    acknowledged_at=alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                    resolved_at=alert.resolved_at.isoformat() if alert.resolved_at else None,
                    details=alert.details
                )
                for alert in alerts
            ],
            "page": page,
            "page_size": page_size
        }

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/rules", status_code=201)
async def create_alert_rule(
    rule: AlertRuleRequest,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Create a new alert rule"""
    try:
        new_rule = await alert_service.create_alert_rule(
            session,
            rule.name,
            rule.description,
            rule.metric_name,
            rule.condition,
            rule.threshold,
            rule.severity,
            rule.duration,
            rule.notification_channels
        )

        # Create audit log
        await logging_service.create_audit_log(
            session,
            admin.id,
            "create_alert_rule",
            "alert_rule",
            new_rule.id,
            {"rule": rule.dict()}
        )
        await session.commit()

        return {
            "id": new_rule.id,
            "name": new_rule.name,
            "description": new_rule.description,
            "created_at": new_rule.created_at.isoformat()
        }

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Acknowledge an alert"""
    try:
        alert = await alert_service.acknowledge_alert(session, alert_id, admin.id)
        await session.commit()

        return {
            "id": alert.id,
            "status": alert.status.value,
            "acknowledged_at": alert.acknowledged_at.isoformat(),
            "acknowledged_by": alert.acknowledged_by
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution_notes: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Resolve an alert"""
    try:
        alert = await alert_service.resolve_alert(session, alert_id, admin.id, resolution_notes)
        await session.commit()

        return {
            "id": alert.id,
            "status": alert.status.value,
            "resolved_at": alert.resolved_at.isoformat(),
            "resolved_by": alert.resolved_by,
            "resolution_notes": alert.resolution_notes
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/statistics")
async def get_alert_statistics(
    hours: int = Query(24, ge=1, le=168),
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get alert statistics for dashboard"""
    try:
        stats = await alert_service.get_alert_statistics(session, hours)
        return stats

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))


# Diagnostics endpoint
@router.get("/diagnostics", response_model=DiagnosticsResponse)
async def get_system_diagnostics(
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(get_current_admin_user)
):
    """Get comprehensive system diagnostics information"""
    try:
        # Get error summary
        error_summary = await logging_service.get_error_summary(session, 24)

        # Get current resource usage
        current_metrics = await MetricsAggregator.get_current_metrics(session)
        resource_usage = {
            "cpu": current_metrics.get("system.cpu.usage", {}).get("value", 0),
            "memory": current_metrics.get("system.memory.usage", {}).get("value", 0),
            "disk": current_metrics.get("system.disk.usage", {}).get("value", 0)
        }

        # Database diagnostics
        database_diag = {
            "responsive": current_metrics.get("database.responsive", {}).get("value", 1) == 1,
            "recent_queries": current_metrics.get("database.queries.recent", {}).get("value", 0),
            "total_users": current_metrics.get("database.users.total", {}).get("value", 0)
        }

        # Redis diagnostics (if available)
        redis_diag = None
        if "redis.memory.used" in current_metrics:
            redis_diag = {
                "memory_used_mb": current_metrics.get("redis.memory.used", {}).get("value", 0),
                "connected_clients": current_metrics.get("redis.clients.connected", {}).get("value", 0),
                "total_commands": current_metrics.get("redis.commands.total", {}).get("value", 0)
            }

        return DiagnosticsResponse(
            timestamp=datetime.utcnow().isoformat(),
            database=database_diag,
            redis=redis_diag,
            slow_queries=[],  # Would be populated from actual slow query log
            error_summary=error_summary,
            resource_usage=resource_usage
        )

    except Exception as e:
        await logging_service.log_error(session, e, "monitoring_api", admin.id)
        raise HTTPException(status_code=500, detail=str(e))